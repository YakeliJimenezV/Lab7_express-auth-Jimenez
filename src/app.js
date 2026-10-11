import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import webRoutes from './routes/web.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.get('/health', (req, res) => {
    const ok = mongoose.connection.readyState === 1;
    res.set('Cache-Control', 'no-store').status(ok ? 200 : 503).json({ ok });
});
app.use('/', webRoutes);
app.use((req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
    }
    res.status(404).render('404');
});

app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'JSON no válido' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Solicitud demasiado grande' });
    }
    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json({ message: 'Revisa los campos enviados y sus tipos' });
    }
    if (err.code === 11000) {
        return res.status(400).json({ message: 'El email ya se encuentra en uso' });
    }
    const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error('Error interno al procesar una solicitud');
    res.status(status).json({ message: status === 500 ? 'Error interno del servidor' : err.message });
});

export default app;
