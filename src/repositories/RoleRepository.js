import Role from '../models/Role.js';

class RoleRepository {
    async ensureByName(name) {
        const now = new Date();
        return Role.findOneAndUpdate({ name }, { $setOnInsert: { name, createdAt: now, updatedAt: now } },
            { upsert: true, new: true, runValidators: true, timestamps: false }).exec();
    }
    async findByName(name) {
        return Role.findOne({ name }).exec();
    }
    async create(role) {
        return Role.create(role);
    }
    async getAll() {
        return Role.find().exec();
    }
}

export default new RoleRepository();
