import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/UserRepository.js';
import roleRepository from '../repositories/RoleRepository.js';
import { assertValidPassword, assertValidBirthdate } from '../utils/validators.js';
import { toUserDTO } from '../utils/userMapper.js';

class AuthService {
    async signUp(data, roles = ['user']) {
        const { email, password, birthdate } = data;

        const existing = await userRepository.findByEmail(email);
        if (existing) {
            const err = new Error('El email ya se encuentra en uso');
            err.status = 400;
            throw err;
        }

        assertValidPassword(password);
        assertValidBirthdate(birthdate);

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10);
        const hashed = await bcrypt.hash(password, saltRounds);

        const roleIds = [];
        for (const r of roles) {
            const roleDoc = await roleRepository.ensureByName(r);
            roleIds.push(roleDoc._id);
        }

        const user = await userRepository.create({ ...data, password: hashed, roles: roleIds });
        const saved = await userRepository.findById(user._id);
        return toUserDTO(saved);
    }

    async signIn({ email, password }) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            const err = new Error('Credenciales inválidas');
            err.status = 401;
            throw err;
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            const err = new Error('Credenciales inválidas');
            err.status = 401;
            throw err;
        }

        const token = jwt.sign(
            { sub: user._id, roles: user.roles.map(r => r.name) },
            process.env.JWT_SECRET,
            { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );
        return { token };
    }
}

export default new AuthService();
