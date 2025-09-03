import express from 'express';
import authController from '../Controllers/AuthController.js';
import auth from '../Middleware/Auth.js';

const router = express.Router();

// Authentication Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', auth, authController.logout);

// User Profile Routes
router.get('/me', auth, authController.getCurrentUser);
router.put('/profile', auth, authController.updateProfile);
router.put('/preferences', auth, authController.updatePreferences);

// Password Management
router.post('/change-password', auth, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Token Management
router.post('/refresh-token', auth, authController.refreshToken);

// Account Management
router.delete('/delete-account', auth, authController.deleteAccount);

export default router;
