import { Router } from 'express';
import {
  login,
  listAuthConfigs,
  getAuthConfig,
  createAuthConfig,
  updateAuthConfig,
  deleteAuthConfig,
  refreshTokenViaBrowser,
} from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/refresh-token-via-browser', refreshTokenViaBrowser);
router.get('/configs', authMiddleware, listAuthConfigs);
router.get('/configs/:id', authMiddleware, getAuthConfig);
router.post('/configs', authMiddleware, createAuthConfig);
router.put('/configs/:id', authMiddleware, updateAuthConfig);
router.delete('/configs/:id', authMiddleware, deleteAuthConfig);

export default router;
