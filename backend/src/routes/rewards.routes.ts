import { Router } from 'express';
import { getRewards, redeemReward, getRedemptionHistory, scanRewardTicket, getScannedTicketHistory } from '../controllers/rewards.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();

router.use(authenticateToken); // Protect all reward routes

router.get('/', getRewards);
router.post('/redeem', auditLog('REDEEM'), redeemReward);
router.get('/history', getRedemptionHistory);
router.post('/tickets/scan', auditLog('SCAN_REWARD_TICKET'), scanRewardTicket);
router.get('/tickets/scanned-history', getScannedTicketHistory);

export default router;
