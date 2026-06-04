import { Router } from 'express';
import { login, logout, getProfile, updateProfile } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';
import { loginLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

// router.post('/register', register); // Desactivado
router.post('/login', loginLimiter, auditLog('LOGIN'), login);
router.post('/logout', logout);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

export default router;
