import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || '50mb';
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.length === 0) {
      if (process.env.NODE_ENV === 'production') {
        const error = new Error('CORS_ORIGIN_REQUIRED');
        error.name = 'CorsError';
        return callback(error);
      }

      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error('ORIGIN_NOT_ALLOWED');
    error.name = 'CorsError';
    return callback(error);
  },
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.use('/api', (req, res, next) => {
  if (!unsafeMethods.has(req.method)) return next();

  const origin = req.headers.origin;
  if (!origin) return next();

  if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
    return next();
  }

  if (allowedOrigins.includes(origin)) {
    return next();
  }

  return res.status(403).json({ error: 'Origen no permitido' });
});

async function bootstrap() {
  try {
    const { apiLimiter } = await import('./middlewares/rateLimit.middleware');
    const authRoutes = (await import('./routes/auth.routes')).default;
    const actionsRoutes = (await import('./routes/actions.routes')).default;
    const rewardsRoutes = (await import('./routes/rewards.routes')).default;

    app.use('/api/', apiLimiter);
    app.use('/api/auth', authRoutes);
    app.use('/api/actions', actionsRoutes);
    app.use('/api/rewards', rewardsRoutes);

    app.use('/api', (_req, res) => {
      res.status(404).json({ error: 'Endpoint no encontrado' });
    });

    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err?.name === 'CorsError') {
        return res.status(403).json({ error: 'Origen no permitido' });
      }

      console.error(err?.stack || err);
      res.status(500).json({ error: 'Algo salio mal!' });
    });

    app.listen(PORT, () => {
      console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error fatal al iniciar el servidor:', err);
  }
}

bootstrap();
