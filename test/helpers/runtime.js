import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';

async function freePort() {
    const socket = net.createServer();
    socket.listen(0, '127.0.0.1');
    await once(socket, 'listening');
    const port = socket.address().port;
    await new Promise(resolve => socket.close(resolve));
    return port;
}

function launch(command, args, env = process.env) {
    const child = spawn(command, args, { env, stdio: 'ignore', windowsHide: true });
    child.on('error', err => { child.launchError = err.code; });
    return child;
}

async function stop(child) {
    if (!child || child.exitCode !== null || child.signalCode !== null || child.launchError) return;
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    const timeout = setTimeout(() => child.kill('SIGKILL'), 10000);
    timeout.unref();
    try { await exited; }
    finally { clearTimeout(timeout); }
}

export async function createRuntime() {
    let dbProcess, server, directory, client;
    const port = await freePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const jwtSecret = randomBytes(32).toString('hex');
    const adminEmail = 'admin@example.test';
    const adminPassword = randomBytes(24).toString('hex') + 'A#7';

    async function close() {
        await stop(server);
        if (client) await client.close();
        await stop(dbProcess);
        if (directory) {
            // Borrar únicamente el directorio temporal creado por esta ejecución.
            const target = await realpath(directory);
            const parent = await realpath(tmpdir());
            if (path.dirname(target) !== parent || !path.basename(target).startsWith('lab08-test-')) {
                throw new Error('El directorio de pruebas no está dentro de la ubicación temporal esperada');
            }
            await rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
        }
    }

    try {
        const useCI = process.env.CI === 'true' && process.env.CI_MONGO_PORT;
        const mongoPort = useCI ? Number(process.env.CI_MONGO_PORT) : await freePort();
        if (!Number.isInteger(mongoPort) || mongoPort < 1 || mongoPort > 65535) throw new Error('CI_MONGO_PORT inválido');
        const dbName = 'lab08_test_' + randomUUID().replaceAll('-', '');
        const mongoUri = `mongodb://127.0.0.1:${mongoPort}/${dbName}`;
        if (!useCI) {
            directory = await mkdtemp(path.join(tmpdir(), 'lab08-test-'));
            dbProcess = launch(process.env.MONGOD_BINARY || 'mongod', [
                '--dbpath', directory, '--port', String(mongoPort), '--bind_ip', '127.0.0.1', '--quiet'
            ]);
        }
        let connected = false;
        for (let i = 0; i < 100; i++) {
            if (dbProcess?.launchError || (dbProcess && dbProcess.exitCode !== null)) {
                throw new Error('No se pudo iniciar MongoDB de pruebas. Instala mongod o configura MONGOD_BINARY');
            }
            client = new mongoose.mongo.MongoClient(mongoUri, { serverSelectionTimeoutMS: 300 });
            try { await client.connect(); connected = true; break; }
            catch { await client.close(); await delay(100); }
        }
        if (!connected) throw new Error('MongoDB temporal no respondió');
        const db = client.db(dbName);
        const env = {
            ...process.env, NODE_ENV: 'production', MONGO_URI: mongoUri,
            MONGODB_URI: '', JWT_SECRET: jwtSecret, PORT: String(port),
            JWT_EXPIRES_IN: '1h', BCRYPT_SALT_ROUNDS: '10', SEED_ADMIN: 'true',
            ADMIN_EMAIL: adminEmail, ADMIN_PASSWORD: adminPassword
        };

        async function startServer() {
            server = launch(process.execPath, ['src/server.js'], env);
            for (let i = 0; i < 150; i++) {
                if (server.launchError || server.exitCode !== null) throw new Error('El servidor de pruebas no pudo iniciar');
                try {
                    const response = await fetch(baseUrl + '/health', { signal: AbortSignal.timeout(500) });
                    if (response.status === 200) return;
                } catch { /* El servidor todavía está arrancando. */ }
                await delay(100);
            }
            throw new Error('El servidor de pruebas no respondió');
        }
        await startServer();
        return {
            baseUrl, jwtSecret, adminEmail, adminPassword, db, close,
            async restart(overrides = {}) {
                await stop(server);
                Object.assign(env, overrides);
                await startServer();
            }
        };
    } catch (err) {
        await close();
        throw err;
    }
}
