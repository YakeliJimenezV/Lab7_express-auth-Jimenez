import roleRepository from '../repositories/RoleRepository.js';

export default async function seedRoles() {
    for (const name of ['user', 'admin']) await roleRepository.ensureByName(name);
}
