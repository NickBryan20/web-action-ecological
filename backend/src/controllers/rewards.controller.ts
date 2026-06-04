import { Request, Response } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';

const rewardTicketInclude = {
  Reward: {
    select: { name: true, points_cost: true }
  },
  User: {
    select: {
      first_name: true,
      last_name: true,
      email: true,
      cedula: true,
      carrera: true,
      profile_picture_url: true
    }
  }
} as const;

const rewardTicketAuditInclude = {
  ...rewardTicketInclude,
  TicketValidator: {
    select: {
      first_name: true,
      last_name: true,
      email: true,
      role: true
    }
  }
} as const;

function createTicketQrHash() {
  return `TICKET_${crypto.randomUUID()}`;
}

async function appendTicketQr<T extends { ticket_qr_hash: string }>(redemption: T) {
  const ticketQrBase64 = await QRCode.toDataURL(redemption.ticket_qr_hash, {
    color: { dark: '#000000', light: '#FFFFFF' },
    width: 260,
    margin: 2
  });

  return { ...redemption, ticket_qr_base64: ticketQrBase64 };
}

export const getRewards = async (req: Request, res: Response) => {
  try {
    const rewards = await prisma.reward.findMany({
      where: { is_active: true }
    });
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener recompensas' });
  }
};

export const redeemReward = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { reward_id } = req.body ?? {};

    if (!userId || !reward_id) {
      return res.status(400).json({ error: 'Faltan parámetros' });
    }

    const reward = await prisma.reward.findUnique({ where: { id: reward_id } });

    if (!reward || !reward.is_active || reward.stock <= 0) {
      return res.status(400).json({ error: 'Recompensa no disponible o agotada' });
    }

    // Transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      
      if (!user || user.points_balance < reward.points_cost) {
        throw new Error('Puntos insuficientes');
      }

      // Deduct points
      await tx.user.update({
        where: { id: userId },
        data: { points_balance: { decrement: reward.points_cost } }
      });

      // Deduct stock
      await tx.reward.update({
        where: { id: reward_id },
        data: { stock: { decrement: 1 } }
      });

      // Record redemption. ticket_number is assigned by the global database sequence.
      return await tx.redemption.create({
        data: { user_id: userId, reward_id, ticket_qr_hash: createTicketQrHash() },
        include: rewardTicketInclude
      });
    });

    res.json({ message: 'Canje exitoso', redemption: await appendTicketQr(result) });
  } catch (error: any) {
    if (error.message === 'Puntos insuficientes') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error interno al procesar el canje' });
  }
};

export const getRedemptionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const history = await prisma.redemption.findMany({
      where: { user_id: userId },
      include: rewardTicketInclude,
      orderBy: { redeemed_at: 'desc' }
    });
    res.json(await Promise.all(history.map(appendTicketQr)));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

export const scanRewardTicket = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'TEACHER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo un docente o administrador puede validar tickets de descuento' });
    }

    const { ticket_qr_hash } = req.body ?? {};

    if (!ticket_qr_hash) {
      return res.status(400).json({ error: 'Falta el QR del ticket' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.redemption.findUnique({
        where: { ticket_qr_hash },
        include: rewardTicketInclude
      });

      if (!ticket) {
        throw new Error('TICKET_NOT_FOUND');
      }

      if (ticket.ticket_used_at) {
        throw new Error('TICKET_ALREADY_USED');
      }

      return await tx.redemption.update({
        where: { id: ticket.id },
        data: {
          ticket_used_at: new Date(),
          ticket_validated_by_id: req.user?.id
        },
        include: rewardTicketAuditInclude
      });
    });

    res.json({
      message: 'Ticket validado correctamente',
      redemption: await appendTicketQr(result)
    });
  } catch (error: any) {
    if (error.message === 'TICKET_NOT_FOUND') {
      return res.status(404).json({ error: 'Este QR no corresponde a un ticket de descuento' });
    }

    if (error.message === 'TICKET_ALREADY_USED') {
      return res.status(409).json({ error: 'Este ticket ya fue usado' });
    }

    res.status(500).json({ error: 'Error interno al validar el ticket' });
  }
};

export const getScannedTicketHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo un administrador puede revisar la auditoría de tickets' });
    }

    const history = await prisma.redemption.findMany({
      where: {
        ticket_used_at: { not: null }
      },
      include: rewardTicketAuditInclude,
      orderBy: { ticket_used_at: 'desc' },
      take: 100
    });

    res.json(await Promise.all(history.map(appendTicketQr)));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial de tickets escaneados' });
  }
};
