import express from 'express';

const router = express.Router();

router.get('/', (req, res) => res.render('home'));
router.get('/signIn', (req, res) => res.render('signin'));
router.get('/signUp', (req, res) => res.render('signup'));
router.get('/profile', (req, res) => res.render('profile'));
router.get('/dashboard/user', (req, res) => res.render('dashboard-user'));
router.get('/dashboard/admin', (req, res) => res.render('dashboard-admin'));
router.get('/403', (req, res) => res.status(403).render('403'));

export default router;