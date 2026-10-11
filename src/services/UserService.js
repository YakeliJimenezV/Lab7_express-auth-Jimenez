import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import userRepository from '../repositories/UserRepository.js';
import { assertValidPassword, assertValidBirthdate } from '../utils/validators.js';
import { toUserDTO } from '../utils/userMapper.js';

const notFound = () => {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    return err;
};

class UserService {
    async getAll() {
        const users = await userRepository.getAll();
        return users.map(toUserDTO);
    }

    async getById(id) {
        if (!mongoose.isValidObjectId(id)) throw notFound();
        const user = await userRepository.findById(id);
        if (!user) throw notFound();
        return toUserDTO(user);
    }

    async updateMe(id, body) {
        const allowed = ['name', 'lastName', 'phoneNumber', 'birthdate', 'url_profile', 'address'];
        const data = {};
        for (const key of allowed) {
            if (body[key] !== undefined) data[key] = body[key];
        }

        if (data.birthdate !== undefined) assertValidBirthdate(data.birthdate);

        if (body.password) {
            assertValidPassword(body.password);
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10);
            data.password = await bcrypt.hash(body.password, saltRounds);
        }

        const user = await userRepository.updateById(id, data);
        if (!user) throw notFound();
        return toUserDTO(user);
    }
}

export default new UserService();