import { calculateAge } from './validators.js';

export function toUserDTO(user) {
    return {
        id: user._id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        birthdate: user.birthdate,
        age: calculateAge(user.birthdate),
        url_profile: user.url_profile,
        address: user.address,
        roles: (user.roles || []).map(r => r.name),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}