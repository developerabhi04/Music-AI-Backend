import express from 'express';
import accountController from '../Controllers/AccountController.js';
import auth from '../Middleware/Auth.js';

const router = express.Router();

// Account Information
router.get('/credits', auth, accountController.getCredits);
router.get('/stats', auth, accountController.getAccountStats);
router.get('/usage-history', auth, accountController.getUsageHistory);
router.get('/export', auth, accountController.exportAccountData);

// Credit Management
router.post('/purchase-credits', auth, accountController.purchaseCredits);

// Subscription Management
router.post('/upgrade-pro', auth, accountController.upgradeToPro);
router.post('/cancel-subscription', auth, accountController.cancelSubscription);

export default router;
