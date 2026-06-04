import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from './auth.middleware';

export const auditLog = (action_type: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Intercept response finish
    res.on('finish', async () => {
      try {
        const status = res.statusCode >= 200 && res.statusCode < 400 ? 'SUCCESS' : 'ERROR';
        await prisma.auditLog.create({
          data: {
            user_id: req.user?.id || null,
            action_type,
            ip_address: req.ip || req.socket.remoteAddress || 'unknown',
            details: {
              method: req.method,
              url: req.originalUrl,
              body: action_type !== 'LOGIN' ? req.body : undefined // don't log passwords
            },
            status
          }
        });
      } catch (error) {
        console.error('Error saving audit log', error);
      }
    });
    next();
  };
};
