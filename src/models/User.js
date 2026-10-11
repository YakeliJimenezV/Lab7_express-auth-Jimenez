import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    name: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    birthdate: { type: Date, required: true },
    url_profile: { type: String, trim: true },
    address: { type: String, trim: true }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);