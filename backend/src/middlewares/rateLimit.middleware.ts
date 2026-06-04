import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';

function readPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const apiLimiter = rateLimit({
  windowMs: readPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: readPositiveInt(process.env.RATE_LIMIT_MAX, isProduction ? 300 : 1000),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta nuevamente mas tarde' },
});

export const loginLimiter = rateLimit({
  windowMs: readPositiveInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
  max: readPositiveInt(process.env.LOGIN_RATE_LIMIT_MAX, isProduction ? 10 : 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesion, intenta nuevamente en una hora' },
});
