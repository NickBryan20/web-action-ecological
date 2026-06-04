import { CookieOptions } from 'express';

const DEV_JWT_SECRET = 'supersecret_jwt_key_for_puce_app';
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'ecopuce_token';
export const AUTH_COOKIE_MAX_AGE = 8 * 60 * 60 * 1000;

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  return secret || DEV_JWT_SECRET;
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function getSameSite(): CookieOptions['sameSite'] {
  const configured = process.env.AUTH_COOKIE_SAMESITE?.toLowerCase();

  if (configured === 'strict' || configured === 'lax' || configured === 'none') {
    return configured;
  }

  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

export function getAuthCookieOptions(): CookieOptions {
  const sameSite = getSameSite();
  const secure = readBoolean(process.env.AUTH_COOKIE_SECURE, process.env.NODE_ENV === 'production');

  return {
    httpOnly: true,
    secure: sameSite === 'none' ? true : secure,
    sameSite,
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
  };
}
