import jwt from 'jsonwebtoken';
import { assertValidPassword } from '../utils/validators.js';

// Valida sin imprimir valores: los errores de configuración pueden ir a logs públicos.
export function validateEnv(env = process.env) {
    const production = env.NODE_ENV === 'production';
    const mongoUri = env.MONGO_URI || (!production ? env.MONGODB_URI : undefined);
    if (!mongoUri || !/^mongodb(?:\+srv)?:\/\/[^/]+\/[^/?#]+(?:\?|$)/.test(mongoUri) || /[<>]/.test(mongoUri)) {
        throw new Error('Configura MONGO_URI con una URI válida y el nombre de la base de datos');
    }
    if (!env.JWT_SECRET || (production && env.JWT_SECRET.length < 32)) {
        throw new Error('Configura JWT_SECRET; en producción requiere al menos 32 caracteres aleatorios');
    }
    const expiresIn = env.JWT_EXPIRES_IN || '1h';
    try {
        const payload = jwt.decode(jwt.sign({}, env.JWT_SECRET, { expiresIn }));
        if (payload.exp <= payload.iat) throw new Error();
    } catch {
        throw new Error('JWT_EXPIRES_IN debe ser una duración positiva, por ejemplo 1h');
    }
    const port = env.PORT === undefined ? 3000 : Number(env.PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT debe ser un entero entre 1 y 65535');
    }
    const rounds = Number(env.BCRYPT_SALT_ROUNDS ?? 10);
    if (!Number.isInteger(rounds) || rounds < 10 || rounds > 15) {
        throw new Error('BCRYPT_SALT_ROUNDS debe ser un entero entre 10 y 15');
    }
    if (env.SEED_ADMIN !== undefined && !['true', 'false'].includes(env.SEED_ADMIN)) {
        throw new Error('SEED_ADMIN debe ser true o false');
    }
    if (env.SEED_ADMIN === 'true') {
        if (!env.ADMIN_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.ADMIN_EMAIL) || !env.ADMIN_PASSWORD) {
            throw new Error('SEED_ADMIN=true requiere ADMIN_EMAIL y ADMIN_PASSWORD configurados privadamente');
        }
        try { assertValidPassword(env.ADMIN_PASSWORD); }
        catch { throw new Error('ADMIN_PASSWORD debe cumplir la política de contraseñas del laboratorio 07'); }
    }
    return { mongoUri, port, production };
}
