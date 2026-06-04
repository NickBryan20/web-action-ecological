import { Router } from 'express';
import { scanQRCode, getScanHistory, generateSurveyQR, listActions, requestAction, getMyRequests, getAllRequests, approveRequest } from '../controllers/actions.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();

router.use(authenticateToken); // Protect all action routes

router.post('/scan', auditLog('SCAN'), scanQRCode);
router.get('/history', getScanHistory);
router.post('/survey', generateSurveyQR);

router.get('/list', listActions);
router.post('/request', requestAction);
router.get('/my-requests', getMyRequests);
router.get('/admin/requests', getAllRequests);
router.post('/admin/approve', approveRequest);

export default router;
