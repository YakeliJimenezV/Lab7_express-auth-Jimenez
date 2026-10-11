import express from 'express';
import AuthController from '../controllers/AuthController.js';

const router = express.Router();

router.post('/signUp', AuthController.signUp);
router.post('/signIn', AuthController.signIn);

export default router;