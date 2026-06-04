import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { AUTH_COOKIE_NAME, getAuthCookieOptions, getJwtSecret } from '../config/auth';

const JWT_SECRET = getJwtSecret();

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Correo y contrasena son requeridos' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    const payload: Record<string, unknown> = {
      message: 'Inicio de sesion exitoso',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        points: user.points_balance,
      },
    };

    if (process.env.AUTH_RETURN_TOKEN === 'true') {
      payload.token = token;
    }

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions()).json(payload);
  } catch (error) {
    res.status(500).json({ error: 'Error en el inicio de sesion' });
  }
};

export const logout = async (_req: Request, res: Response) => {
  res
    .clearCookie(AUTH_COOKIE_NAME, { ...getAuthCookieOptions(), maxAge: undefined })
    .json({ message: 'Sesion cerrada correctamente' });
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.id },
      select: {
        id: true,
        email: true,
        role: true,
        points_balance: true,
        first_name: true,
        last_name: true,
        cedula: true,
        carrera: true,
        nivel: true,
        profile_picture_url: true,
        description: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, cedula, carrera, nivel, profile_picture_url, description } = req.body ?? {};

    const updatedUser = await prisma.user.update({
      where: { id: (req as any).user.id },
      data: {
        first_name,
        last_name,
        cedula,
        carrera,
        nivel,
        profile_picture_url,
        description,
      },
      select: {
        id: true,
        email: true,
        role: true,
        points_balance: true,
        first_name: true,
        last_name: true,
        cedula: true,
        carrera: true,
        nivel: true,
        profile_picture_url: true,
        description: true,
      },
    });

    res.json({ message: 'Perfil actualizado correctamente', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
};
