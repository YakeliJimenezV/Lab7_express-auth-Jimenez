export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[#$%&*@]).{8,}$/;
export const PASSWORD_MESSAGE =
    'La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 dígito y 1 carácter especial (# $ % & * @)';

export function assertValidPassword(password) {
    if (!PASSWORD_REGEX.test(password)) {
        const err = new Error(PASSWORD_MESSAGE);
        err.status = 400;
        throw err;
    }
}

export function assertValidBirthdate(birthdate) {
    const d = new Date(birthdate);
    if (isNaN(d.getTime()) || d > new Date()) {
        const err = new Error('La fecha de nacimiento no es válida');
        err.status = 400;
        throw err;
    }
}

export function calculateAge(birthdate) {
    if (!birthdate) return null;
    const today = new Date();
    const b = new Date(birthdate);
    let age = today.getFullYear() - b.getUTCFullYear();
    const m = today.getMonth() - b.getUTCMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getUTCDate())) age--;
    return age;
}