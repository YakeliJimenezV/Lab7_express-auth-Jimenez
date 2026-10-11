import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';

function browser() {
    const stored = new Map();
    let redirected;
    const context = vm.createContext({
        sessionStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value),
            removeItem: key => stored.delete(key) },
        location: { replace: path => { redirected = path; } },
        atob: text => Buffer.from(text, 'base64').toString('binary'), setTimeout: () => 0
    });
    vm.runInContext(readFileSync('public/js/auth.js', 'utf8') + '\nglobalThis.auth = Auth;', context);
    return { auth: context.auth, redirected: () => redirected };
}

test('Navegador redirige a signIn sin sesión y con token vencido', () => {
    const page = browser();
    assert.equal(page.auth.guard(['user']), false);
    assert.equal(page.redirected(), '/signIn');
    page.auth.setToken(jwt.sign({ roles: ['user'] }, randomBytes(32), { expiresIn: -1 }));
    assert.equal(page.auth.guard(), false);
    assert.equal(page.auth.getToken(), undefined);
});
test('Navegador permite dashboard USER y redirige USER a 403 al abrir ADMIN', () => {
    const page = browser();
    page.auth.setToken(jwt.sign({ roles: ['user'] }, randomBytes(32), { expiresIn: '1h' }));
    assert.equal(page.auth.guard(['user', 'admin']), true);
    assert.equal(page.auth.homePath(), '/dashboard/user');
    assert.equal(page.auth.guard(['admin']), false);
    assert.equal(page.redirected(), '/403');
});
test('Navegador conserva dashboard ADMIN y cierre de sesión', () => {
    const page = browser();
    page.auth.setToken(jwt.sign({ roles: ['admin'] }, randomBytes(32), { expiresIn: '1h' }));
    assert.equal(page.auth.guard(['admin']), true);
    assert.equal(page.auth.homePath(), '/dashboard/admin');
    page.auth.logout();
    assert.equal(page.auth.getToken(), undefined);
    assert.equal(page.redirected(), '/signIn');
});
