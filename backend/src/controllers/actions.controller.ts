import { Request, Response } from 'express';
import { prisma } from '../config/db';
import QRCode from 'qrcode';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { AuthRequest } from '../middlewares/auth.middleware';
import { v2 as cloudinary } from 'cloudinary';

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const evidenceDir = path.resolve(process.cwd(), 'uploads', 'evidence');
const useCloudinary = process.env.CLOUDINARY_UPLOAD_ENABLED === 'true';

function extensionFromMime(mimeType: string) {
  const knownTypes: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm'
  };

  return knownTypes[mimeType] || 'bin';
}

async function saveEvidenceLocally(item: string, req: Request) {
  if (item.startsWith('http')) return item;

  const match = item.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return item;

  const [, mimeType, base64Payload] = match;
  const extension = extensionFromMime(mimeType);
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
  const filePath = path.join(evidenceDir, fileName);

  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(filePath, Buffer.from(base64Payload, 'base64'));

  return `${req.protocol}://${req.get('host')}/uploads/evidence/${fileName}`;
}

export const scanQRCode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { qr_code_hash, action_id } = req.body ?? {};
    const qrHash = qr_code_hash || action_id;

    if (!userId || !qrHash) {
      return res.status(400).json({ error: 'Faltan parámetros' });
    }

    const action = await prisma.ecologicalAction.findUnique({
      where: { qr_code_hash: qrHash }
    });

    if (!action || !action.is_active) {
      // Si no es un código estático, buscar en los dinámicos
      const dynamicQr = await prisma.dynamicQR.findUnique({
        where: { qr_code_hash: qrHash }
      });

      if (!dynamicQr) {
        return res.status(404).json({ error: 'Código QR inválido' });
      }

      if (dynamicQr.is_used) {
        return res.status(400).json({ error: 'Este código QR ya fue utilizado' });
      }

      // Validar que solo el dueño o un Administrador pueda escanear este código
      const scannerRole = req.user?.role;
      if (scannerRole !== 'ADMIN' && userId !== dynamicQr.user_id) {
        return res.status(403).json({ error: 'Este código QR pertenece a otro estudiante' });
      }

      // Si es un QR dinámico válido
      await prisma.$transaction(async (tx) => {
        await tx.dynamicQR.update({
          where: { id: dynamicQr.id },
          data: { is_used: true }
        });

        // Dar los puntos SIEMPRE al dueño del QR (incluso si el admin lo escaneó)
        await tx.user.update({
          where: { id: dynamicQr.user_id },
          data: { points_balance: { increment: dynamicQr.points_value } }
        });
      });

      return res.json({ message: 'Escaneo exitoso (Código Dinámico)', points_earned: dynamicQr.points_value });
    }

    // Attempt to register scan and add points in a transaction
    await prisma.$transaction(async (tx) => {
      // Create scan record (will throw error if unique constraint fails due to duplicate scan)
      await tx.scanRecord.create({
        data: {
          user_id: userId,
          action_id: action.id
        }
      });

      // Update user points
      await tx.user.update({
        where: { id: userId },
        data: {
          points_balance: {
            increment: action.points_value
          }
        }
      });
    });

    res.json({ message: 'Escaneo exitoso', points_earned: action.points_value });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya has registrado esta acción' });
    }
    res.status(500).json({ error: 'Error interno al procesar el escaneo' });
  }
};

export const getScanHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const history = await prisma.scanRecord.findMany({
      where: { user_id: userId },
      include: {
        Action: {
          select: { name: true, points_value: true }
        }
      },
      orderBy: { scanned_at: 'desc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

export const generateSurveyQR = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { description } = req.body;

    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    if (!description) return res.status(400).json({ error: 'Falta la descripción del formulario' });

    // Generate unique hash
    const qrHash = 'DYN_' + crypto.randomBytes(8).toString('hex').toUpperCase();
    const points = 15; // Reward for filling the survey

    const dynamicQr = await prisma.dynamicQR.create({
      data: {
        qr_code_hash: qrHash,
        user_id: userId,
        points_value: points,
        description: description,
        is_used: false
      }
    });

    // Generate Base64 Image
    const qrBase64 = await QRCode.toDataURL(qrHash, {
      color: { dark: '#000000', light: '#FFFFFF' },
      width: 300
    });

    res.json({
      message: 'QR Generado exitosamente',
      qr_code_hash: qrHash,
      qr_code_base64: qrBase64,
      points_value: points
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar el QR dinámico' });
  }
};

// --- NUEVOS ENDPOINTS PARA FLUJO DE APROBACIÓN ---

export const listActions = async (req: AuthRequest, res: Response) => {
  try {
    const actions = await prisma.ecologicalAction.findMany({
      where: { is_active: true },
      select: { id: true, name: true, points_value: true, description: true }
    });
    res.json(actions);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar acciones' });
  }
};

export const requestAction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { action_id, evidence } = req.body ?? {};

    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    if (!action_id || !evidence || !Array.isArray(evidence) || evidence.length === 0) {
      return res.status(400).json({ error: 'Faltan parámetros o evidence no es un arreglo válido' });
    }

    // Store evidence locally by default. Cloudinary remains opt-in with CLOUDINARY_UPLOAD_ENABLED=true.
    const uploadedUrls: string[] = [];
    for (const item of evidence) {
      if (typeof item !== 'string') continue;
      try {
        if (useCloudinary && (item.startsWith('data:') || item.startsWith('http'))) {
          const uploadResult = await cloudinary.uploader.upload(item, {
            folder: 'ecopuce_evidence',
            resource_type: 'auto'
          });
          uploadedUrls.push(uploadResult.secure_url);
        } else {
          uploadedUrls.push(await saveEvidenceLocally(item, req));
        }
      } catch (uploadError) {
        console.warn('No se pudo guardar una evidencia; se conserva el valor original.', uploadError);
        uploadedUrls.push(item);
      }
    }

    const newRequest = await prisma.actionRequest.create({
      data: {
        user_id: userId,
        action_id,
        evidence: uploadedUrls.length > 0 ? uploadedUrls : evidence,
        status: 'PENDING'
      }
    });

    res.json({ message: 'Solicitud enviada correctamente', request: newRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar solicitud' });
  }
};

import { createCanvas, loadImage } from 'canvas';

export const getMyRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const requests = await prisma.actionRequest.findMany({
      where: { user_id: userId },
      include: {
        User: { select: { first_name: true, last_name: true } },
        Action: { select: { name: true, points_value: true } },
        DynamicQR: { select: { qr_code_hash: true, is_used: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    
    // Adjuntaremos la imagen base64 de los QRs aprobados con marca de agua
    const requestsWithQR = await Promise.all(requests.map(async (r) => {
      let qrBase64 = null;
      if (r.DynamicQR) {
        // Generar QR en crudo (Buffer)
        const qrBuffer = await QRCode.toBuffer(r.DynamicQR.qr_code_hash, { color: { dark: '#000000', light: '#FFFFFF' }, width: 300, margin: 2 });
        
        // Crear Canvas para la marca de agua
        const canvas = createCanvas(300, 340);
        const ctx = canvas.getContext('2d');
        
        // Fondo blanco
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 300, 340);
        
        // Dibujar QR
        const qrImage = await loadImage(qrBuffer);
        ctx.drawImage(qrImage, 0, 0, 300, 300);
        
        // Dibujar Texto (Marca de Agua)
        const userName = `${r.User?.first_name || ''} ${r.User?.last_name || ''}`.trim() || 'Estudiante PUCE';
        ctx.fillStyle = '#0f172a'; // slate-900
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`PROPIEDAD DE:`, 150, 310);
        
        ctx.fillStyle = '#059669'; // emerald-600
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(userName.toUpperCase(), 150, 330);
        
        qrBase64 = canvas.toDataURL();
      }
      return { ...r, qr_code_base64: qrBase64 };
    }));

    res.json(requestsWithQR);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

export const getAllRequests = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Permisos insuficientes' });

    const requests = await prisma.actionRequest.findMany({
      include: {
        User: { select: { first_name: true, last_name: true, email: true } },
        Action: { select: { name: true, points_value: true } },
        DynamicQR: { select: { qr_code_hash: true, is_used: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

export const approveRequest = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Permisos insuficientes' });

    const { request_id, status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'Estado inválido' });

    const actionRequest = await prisma.actionRequest.findUnique({
      where: { id: request_id },
      include: { Action: true }
    });

    if (!actionRequest || actionRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Solicitud inválida o ya procesada' });
    }

    if (status === 'REJECTED') {
      await prisma.actionRequest.update({
        where: { id: request_id },
        data: { status: 'REJECTED' }
      });
      return res.json({ message: 'Solicitud rechazada' });
    }

    // Aprobado: Generamos QR dinámico
    const qrHash = 'DYN_' + crypto.randomBytes(8).toString('hex').toUpperCase();
    
    await prisma.$transaction(async (tx) => {
      const dynamicQr = await tx.dynamicQR.create({
        data: {
          qr_code_hash: qrHash,
          user_id: actionRequest.user_id,
          points_value: actionRequest.Action.points_value,
          description: `Aprobado por Admin: ${actionRequest.Action.name}`,
          is_used: false
        }
      });

      await tx.actionRequest.update({
        where: { id: request_id },
        data: { 
          status: 'APPROVED',
          dynamic_qr_id: dynamicQr.id 
        }
      });
    });

    res.json({ message: 'Solicitud aprobada y QR generado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar solicitud' });
  }
};
