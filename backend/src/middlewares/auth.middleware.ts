import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME, getJwtSecret } from '../config/auth';

const JWT_SECRET = getJwtSecret();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

function getCookieToken(req: Request) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((part) => part.trim());
  const rawCookie = cookies.find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!rawCookie) return null;

  return decodeURIComponent(rawCookie.slice(AUTH_COOKIE_NAME.length + 1));
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = getBearerToken(req) || getCookieToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado, token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalido o expirado' });
    }

    req.user = user as { id: string; role: string };
    next();
  });
};

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    next();
  };
};
