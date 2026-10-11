import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { validateEnv } from './config/env.js';
import seedRoles from './utils/seedRoles.js';
import seedUsers from './utils/seedUsers.js';

let server;
let stopping = false;

async function shutdown() {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    try {
        if (server?.listening) await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
        await mongoose.disconnect();
        clearTimeout(timeout);
    } catch {
        console.error('No se pudo completar el cierre del servidor');
        process.exitCode = 1;
    }
}

async function start() {
    let config;
    try { config = validateEnv(); }
    catch (err) {
        console.error(err.message);
        process.exitCode = 1;
        return;
    }
    if (!process.env.MONGO_URI && process.env.MONGODB_URI) {
        console.warn('Configuración local heredada: renombra MONGODB_URI a MONGO_URI en .env');
    }
    try {
        await mongoose.connect(config.mongoUri, { autoIndex: true, serverSelectionTimeoutMS: 10000 });
        await seedRoles();
        await seedUsers();
        server = app.listen(config.port, '0.0.0.0', () => {
            console.log(`Servidor escuchando en el puerto ${config.port}`);
        });
        server.on('error', async () => {
            console.error('No se pudo iniciar el servidor HTTP; revisa PORT');
            process.exitCode = 1;
            await shutdown();
        });
    } catch {
        // No imprimir el error original: puede contener URI, credenciales o datos personales.
        console.error('No se pudo preparar MongoDB. Revisa MONGO_URI, acceso de red, índices y configuración de ADMIN');
        await mongoose.disconnect();
        process.exitCode = 1;
    }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
await start();
