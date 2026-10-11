import User from '../models/User.js';

class UserRepository {
    async create(userData) {
        const user = new User(userData);
        return user.save();
    }
    async findByEmail(email) {
        return User.findOne({ email }).populate('roles').exec();
    }
    async findById(id) {
        return User.findById(id).populate('roles').exec();
    }
    async updateById(id, data) {
        return User.findByIdAndUpdate(id, data, { new: true, runValidators: true })
            .populate('roles').exec();
    }
    async updatePassword(id, hashedPassword) {
        return User.findByIdAndUpdate(id, { password: hashedPassword }, { new: true }).exec();
    }
    async getAll() {
        return User.find().populate('roles').sort({ createdAt: -1 }).exec();
    }
}

export default new UserRepository();