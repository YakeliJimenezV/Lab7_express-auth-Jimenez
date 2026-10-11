import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { validateEnv } from '../src/config/env.js';

const valid = {
    NODE_ENV: 'production', MONGO_URI: 'mongodb://127.0.0.1:27017/lab08_config_test',
    JWT_SECRET: randomBytes(32).toString('hex'), PORT: '10000'
};

test('Producción acepta MONGO_URI y el puerto asignado por Render', () => {
    assert.equal(validateEnv(valid).port, 10000);
    assert.equal(validateEnv(valid).mongoUri, valid.MONGO_URI);
    assert.equal(validateEnv({ ...valid, MONGO_URI: 'mongodb+srv://db.example.com/lab08' }).production, true);
});
test('Configuración local anterior sigue funcionando', () => {
    assert.equal(validateEnv({ NODE_ENV: 'development', MONGODB_URI: valid.MONGO_URI,
        JWT_SECRET: valid.JWT_SECRET }).port, 3000);
});
test('MONGODB_URI heredada no sustituye MONGO_URI en producción', () => {
    assert.throws(() => validateEnv({ ...valid, MONGO_URI: undefined, MONGODB_URI: valid.MONGO_URI }), /MONGO_URI/);
});
for (const [name, overrides, message] of [
    ['URI sin configurar', { MONGO_URI: '' }, /MONGO_URI/],
    ['URI sin base de datos', { MONGO_URI: 'mongodb://127.0.0.1:27017/' }, /MONGO_URI/],
    ['URI de ejemplo', { MONGO_URI: 'mongodb+srv://<USER>:<PASSWORD>@cluster/db' }, /MONGO_URI/],
    ['secreto ausente', { JWT_SECRET: '' }, /JWT_SECRET/],
    ['secreto corto en producción', { JWT_SECRET: 'x' }, /JWT_SECRET/],
    ['puerto inválido', { PORT: 'abc' }, /PORT/],
    ['puerto vacío', { PORT: '' }, /PORT/],
    ['puerto fuera de rango', { PORT: '65536' }, /PORT/],
    ['costo bcrypt débil', { BCRYPT_SALT_ROUNDS: '4' }, /BCRYPT/],
    ['costo bcrypt inválido', { BCRYPT_SALT_ROUNDS: '10oops' }, /BCRYPT/],
    ['expiración inválida', { JWT_EXPIRES_IN: 'invalid' }, /JWT_EXPIRES_IN/],
    ['expiración negativa', { JWT_EXPIRES_IN: '-1h' }, /JWT_EXPIRES_IN/],
    ['seed ambiguo', { SEED_ADMIN: 'yes' }, /SEED_ADMIN/],
    ['seed sin credenciales', { SEED_ADMIN: 'true' }, /ADMIN/]
]) {
    test(`Configuración rechaza ${name}`, () => assert.throws(() => validateEnv({ ...valid, ...overrides }), message));
}
test('Administrador inicial exige credenciales explícitas y contraseña válida', () => {
    const env = { ...valid, SEED_ADMIN: 'true', ADMIN_EMAIL: 'admin@example.test',
        ADMIN_PASSWORD: randomBytes(24).toString('hex') + 'A#7' };
    assert.doesNotThrow(() => validateEnv(env));
    assert.throws(() => validateEnv({ ...env, ADMIN_PASSWORD: 'weak' }), /ADMIN_PASSWORD/);
});
