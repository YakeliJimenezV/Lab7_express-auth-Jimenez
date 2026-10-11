import userRepository from '../repositories/UserRepository.js';
import authService from '../services/AuthService.js';

export default async function seedUsers() {
    if (process.env.SEED_ADMIN !== 'true') return;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) throw new Error('Falta la configuración privada del administrador');
    const existing = await userRepository.findByEmail(email);
    if (existing) return;

    await authService.signUp({
        email,
        password,
        name: 'Admin',
        lastName: 'Sistema',
        phoneNumber: '999999999',
        birthdate: '1990-01-01',
        address: 'Lima'
    }, ['admin']);
    console.log('Administrador inicial creado');
}
