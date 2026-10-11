import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createRuntime } from './helpers/runtime.js';

let runtime, token, adminToken, userId;
const password = randomBytes(24).toString('hex') + 'A#7';
const user = { email: 'user@example.test', password, name: 'Prueba', lastName: 'Laboratorio',
    phoneNumber: '999999999', birthdate: '2000-01-01', address: 'Lima' };

before(async () => { runtime = await createRuntime(); }, { timeout: 60000 });
after(async () => { if (runtime) await runtime.close(); });

async function request(route, { method = 'GET', body, bearer, raw } = {}) {
    const response = await fetch(runtime.baseUrl + route, {
        method, headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) },
        body: raw ?? (body === undefined ? undefined : JSON.stringify(body)), signal: AbortSignal.timeout(5000)
    });
    return { status: response.status, body: await response.json() };
}

test('Health confirma conexión MongoDB', async () => {
    assert.deepEqual(await request('/health'), { status: 200, body: { ok: true } });
});
test('Registro público crea USER aunque se solicite ADMIN y no expone el hash', async () => {
    const result = await request('/api/auth/signUp', { method: 'POST', body: { ...user, roles: ['admin'] } });
    assert.equal(result.status, 201);
    assert.deepEqual(result.body.roles, ['user']);
    assert.equal(result.body.email, user.email);
    assert.equal(result.body.password, undefined);
    userId = result.body.id;
    const saved = await runtime.db.collection('users').findOne({ email: user.email });
    assert.notEqual(saved.password, password);
    assert.equal(await bcrypt.compare(password, saved.password), true);
});
test('Registro rechaza email duplicado y campos ausentes', async () => {
    assert.equal((await request('/api/auth/signUp', { method: 'POST', body: user })).status, 400);
    assert.equal((await request('/api/auth/signUp', { method: 'POST', body: {} })).status, 400);
});
test('Registro conserva reglas de contraseña y fecha', async () => {
    for (const change of [{ password: 'weak' }, { birthdate: '2100-01-01' }, { birthdate: 'invalid' }]) {
        assert.equal((await request('/api/auth/signUp', { method: 'POST', body: {
            ...user, email: 'invalid@example.test', ...change
        } })).status, 400);
    }
});
test('Login valida credenciales y evita consultas con operadores del cliente', async () => {
    for (const body of [{ email: user.email, password: 'incorrect' },
        { email: 'missing@example.test', password }, {}]) {
        const result = await request('/api/auth/signIn', { method: 'POST', body });
        assert.equal(result.status, Object.keys(body).length ? 401 : 400);
    }
    assert.equal((await request('/api/auth/signIn', { method: 'POST',
        body: { email: { $ne: null }, password } })).status, 400);
});
test('Login USER emite un JWT firmado con expiración y roles', async () => {
    const result = await request('/api/auth/signIn', { method: 'POST', body: { email: user.email, password } });
    assert.equal(result.status, 200);
    token = result.body.token;
    const payload = jwt.verify(token, runtime.jwtSecret, { algorithms: ['HS256'] });
    assert.equal(payload.sub, userId);
    assert.deepEqual(payload.roles, ['user']);
    assert.equal(payload.exp - payload.iat, 3600);
});
test('Rutas protegidas rechazan ausencia, alteración y expiración de JWT', async () => {
    const expired = jwt.sign({ sub: userId, roles: ['user'] }, runtime.jwtSecret, { expiresIn: -1 });
    const forged = jwt.sign({ sub: userId, roles: ['admin'] }, randomBytes(32).toString('hex'));
    const wrongAlgorithm = jwt.sign({ sub: userId, roles: ['user'] }, runtime.jwtSecret, { algorithm: 'HS384' });
    const invalidRoles = jwt.sign({ sub: userId, roles: 'admin' }, runtime.jwtSecret);
    for (const bearer of [undefined, 'invalid', expired, forged, wrongAlgorithm, invalidRoles]) {
        assert.equal((await request('/api/users/me', { bearer })).status, 401);
    }
    for (const [route, method] of [['/api/users', 'GET'], ['/api/users/' + userId, 'GET'], ['/api/users/me', 'PUT']]) {
        assert.equal((await request(route, { method, body: method === 'PUT' ? {} : undefined })).status, 401);
    }
});
test('USER consulta su perfil y recibe 403 en rutas ADMIN', async () => {
    const result = await request('/api/users/me', { bearer: token });
    assert.equal(result.status, 200);
    assert.equal(result.body.id, userId);
    assert.equal(result.body.password, undefined);
    for (const route of ['/api/users', '/api/users/' + userId]) {
        assert.equal((await request(route, { bearer: token })).status, 403);
    }
});
test('Actualizar perfil conserva email y roles protegidos', async () => {
    const result = await request('/api/users/me', { method: 'PUT', bearer: token,
        body: { name: 'Actualizado', address: 'Arequipa', email: 'other@example.test', roles: ['admin'] } });
    assert.equal(result.status, 200);
    assert.equal(result.body.name, 'Actualizado');
    assert.equal(result.body.email, user.email);
    assert.deepEqual(result.body.roles, ['user']);
    assert.equal((await request('/api/users/me', { method: 'PUT', bearer: token,
        body: { birthdate: '2100-01-01' } })).status, 400);
});
test('ADMIN inicia sesión, lista usuarios y consulta por ID sin hashes', async () => {
    const login = await request('/api/auth/signIn', { method: 'POST',
        body: { email: runtime.adminEmail, password: runtime.adminPassword } });
    assert.equal(login.status, 200);
    adminToken = login.body.token;
    assert.deepEqual(jwt.verify(adminToken, runtime.jwtSecret).roles, ['admin']);
    const users = await request('/api/users', { bearer: adminToken });
    assert.equal(users.status, 200);
    assert.equal(users.body.length, 2);
    assert.ok(users.body.every(u => u.password === undefined));
    assert.equal((await request('/api/users/' + userId, { bearer: adminToken })).status, 200);
    assert.equal((await request('/api/users/not-an-id', { bearer: adminToken })).status, 404);
    assert.equal((await request('/api/users/000000000000000000000000', { bearer: adminToken })).status, 404);
});
test('Errores de JSON, tamaño y rutas mantienen respuestas controladas', async () => {
    assert.deepEqual(await request('/api/auth/signIn', { method: 'POST', raw: '{broken' }),
        { status: 400, body: { message: 'JSON no válido' } });
    assert.equal((await request('/api/auth/signIn', { method: 'POST', body: { data: 'x'.repeat(110000) } })).status, 413);
    assert.equal((await request('/api/unknown')).status, 404);
});
test('Páginas EJS, guards y archivos estáticos del laboratorio 07 siguen disponibles', async () => {
    for (const route of ['/', '/signIn', '/signUp', '/profile', '/dashboard/user', '/dashboard/admin',
        '/css/styles.css', '/js/auth.js', '/img/building.png']) {
        const response = await fetch(runtime.baseUrl + route);
        assert.equal(response.status, 200, route);
        const content = await response.text();
        if (['/profile', '/dashboard/user', '/dashboard/admin'].includes(route)) assert.match(content, /Auth.guard\(/);
    }
    assert.equal((await fetch(runtime.baseUrl + '/403')).status, 403);
    assert.equal((await fetch(runtime.baseUrl + '/unknown')).status, 404);
});
test('Reinicio conserva usuarios, contraseñas, IDs de roles y perfiles', async () => {
    const before = await runtime.db.collection('users').find().sort({ email: 1 }).toArray();
    const roleIds = (await runtime.db.collection('roles').find().sort({ name: 1 }).toArray()).map(r => String(r._id));
    await runtime.restart();
    const after = await runtime.db.collection('users').find().sort({ email: 1 }).toArray();
    assert.deepEqual(after, before);
    assert.deepEqual((await runtime.db.collection('roles').find().sort({ name: 1 }).toArray()).map(r => String(r._id)), roleIds);
    assert.equal((await request('/api/users/me', { bearer: token })).body.name, 'Actualizado');
    await runtime.restart({ SEED_ADMIN: 'false', ADMIN_EMAIL: '', ADMIN_PASSWORD: '' });
    assert.deepEqual(await runtime.db.collection('users').find().sort({ email: 1 }).toArray(), before);
});
test('Cambio de contraseña del propio perfil permite nuevo login', async () => {
    const updatedPassword = randomBytes(24).toString('hex') + 'A#7';
    assert.equal((await request('/api/users/me', { method: 'PUT', bearer: token,
        body: { password: updatedPassword } })).status, 200);
    assert.equal((await request('/api/auth/signIn', { method: 'POST',
        body: { email: user.email, password } })).status, 401);
    assert.equal((await request('/api/auth/signIn', { method: 'POST',
        body: { email: user.email, password: updatedPassword } })).status, 200);
});

test('Login sigue aceptando hashes bcrypt históricos 2a y 2b', async () => {
    // Vector público de node.bcrypt.js/test/promise.test.js; no es una credencial real.
    const fixture = '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG3vv1BD7WC';
    for (const hash of [fixture, fixture.replace('$2a$', '$2b$')]) {
        await runtime.db.collection('users').updateOne({ email: user.email }, { $set: { password: hash } });
        assert.equal((await request('/api/auth/signIn', { method: 'POST',
            body: { email: user.email, password: 'envy1362987212538' } })).status, 200);
    }
});
