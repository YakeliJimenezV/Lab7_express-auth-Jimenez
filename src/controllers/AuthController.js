import authService from '../services/AuthService.js';

class AuthController {
    async signUp(req, res, next) {
        try {
            const { email, password, name, lastName, phoneNumber, birthdate, url_profile, address } = req.body;
            if (!email || !password || !name || !lastName || !phoneNumber || !birthdate)
                return res.status(400).json({ message: 'Todos los campos obligatorios son requeridos' });
            if ([email, password, name, lastName, phoneNumber, birthdate].some(value => typeof value !== 'string'))
                return res.status(400).json({ message: 'Los campos obligatorios deben ser texto' });

            // El registro público SIEMPRE crea rol 'user'
            const user = await authService.signUp(
                { email, password, name, lastName, phoneNumber, birthdate, url_profile, address },
                ['user']
            );
            return res.status(201).json(user);
        } catch (err) {
            next(err);
        }
    }

    async signIn(req, res, next) {
        try {
            const { email, password } = req.body;
            if (!email || !password)
                return res.status(400).json({ message: 'El email y password son requeridos' });
            if (typeof email !== 'string' || typeof password !== 'string')
                return res.status(400).json({ message: 'El email y password deben ser texto' });

            const token = await authService.signIn({ email, password });
            return res.status(200).json(token);
        } catch (err) {
            next(err);
        }
    }
}

export default new AuthController();
