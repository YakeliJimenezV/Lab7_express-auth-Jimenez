import jwt from 'jsonwebtoken';

export default function authenticate(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer '))
            return res.status(401).json({ message: 'No autorizado' });

        const token = header.split(' ')[1];
        const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        if (typeof payload.sub !== 'string' || !Array.isArray(payload.roles) ||
            !payload.roles.every(role => ['user', 'admin'].includes(role))) {
            return res.status(401).json({ message: 'Token no válido o caducado' });
        }
        req.userId = payload.sub;
        req.userRoles = payload.roles || [];
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token no válido o caducado' });
    }
}
