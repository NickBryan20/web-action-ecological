import { prisma } from './src/config/db';
import bcrypt from 'bcrypt';

function readSeedValue(name: string, fallback: string) {
  const value = process.env[name];

  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required when running seed in production`);
  }

  return value || fallback;
}

async function upsertUser(params: {
  email: string;
  password: string;
  role: 'ADMIN' | 'STUDENT' | 'TEACHER';
  first_name: string;
  last_name: string;
  cedula?: string;
  carrera?: string;
  points_balance?: number;
}) {
  const password_hash = await bcrypt.hash(params.password, 10);

  await prisma.user.upsert({
    where: { email: params.email },
    update: {
      password_hash,
      role: params.role,
      first_name: params.first_name,
      last_name: params.last_name,
      cedula: params.cedula,
      carrera: params.carrera,
      points_balance: params.points_balance,
    },
    create: {
      email: params.email,
      password_hash,
      role: params.role,
      first_name: params.first_name,
      last_name: params.last_name,
      cedula: params.cedula,
      carrera: params.carrera,
      points_balance: params.points_balance ?? 0,
    },
  });
}

async function main() {
  console.log('Seeding database...');

  await upsertUser({
    email: readSeedValue('SEED_ADMIN_EMAIL', 'admin.demo@puce.edu.ec'),
    password: readSeedValue('SEED_ADMIN_PASSWORD', 'admin-demo-123'),
    role: 'ADMIN',
    first_name: 'Administrador',
    last_name: 'PUCESI',
  });

  await upsertUser({
    email: readSeedValue('SEED_STUDENT_EMAIL', 'student.demo@puce.edu.ec'),
    password: readSeedValue('SEED_STUDENT_PASSWORD', 'student-demo-123'),
    role: 'STUDENT',
    first_name: 'Estudiante',
    last_name: 'Demo',
    cedula: '1000000000',
    carrera: 'Ingenieria en Sistemas',
    points_balance: 50,
  });

  await upsertUser({
    email: readSeedValue('SEED_TEACHER_EMAIL', 'teacher.demo@puce.edu.ec'),
    password: readSeedValue('SEED_TEACHER_PASSWORD', 'teacher-demo-123'),
    role: 'TEACHER',
    first_name: 'Docente',
    last_name: 'Validador',
  });

  const ecologicalActions = [
    { name: 'Reciclaje de Botella Plastica', description: 'Depositar una botella de plastico en el contenedor especial.', points_value: 10, qr_code_hash: 'QR_RECYCLE_PLASTIC_001' },
    { name: 'Llegar en Bicicleta', description: 'Asistir al campus utilizando bicicleta.', points_value: 20, qr_code_hash: 'QR_TRANSPORT_BIKE_001' },
    { name: 'Reciclaje de Papel', description: 'Deposita papel en los basureros azules.', points_value: 5, qr_code_hash: 'QR_RECYCLE_PAPER_001' },
    { name: 'Uso de Termo Reutilizable', description: 'Rellena tu termo en el dispensador en vez de comprar plastico.', points_value: 15, qr_code_hash: 'QR_REUSABLE_BOTTLE_001' },
    { name: 'Siembra de Arbol', description: 'Participa en la campana anual de reforestacion.', points_value: 50, qr_code_hash: 'QR_PLANT_TREE_001' },
    { name: 'Ahorro de Energia', description: 'Apaga las luces de un aula vacia.', points_value: 10, qr_code_hash: 'QR_SAVE_ENERGY_001' },
    { name: 'Reciclaje de Pilas', description: 'Deposita baterias viejas en los contenedores especiales.', points_value: 25, qr_code_hash: 'QR_RECYCLE_BATTERY_001' },
    { name: 'Charla Ambiental', description: 'Asiste a una conferencia sobre sostenibilidad.', points_value: 30, qr_code_hash: 'QR_ATTEND_TALK_001' },
    { name: 'Movilidad Compartida', description: 'Llega en carpool con al menos 3 companeros.', points_value: 20, qr_code_hash: 'QR_CARPOOL_001' },
    { name: 'No Imprimir', description: 'Entrega tu proyecto en formato 100% digital.', points_value: 15, qr_code_hash: 'QR_NO_PRINT_001' },
    { name: 'Reciclaje Electronico', description: 'Dona teclados, mouses o cables viejos.', points_value: 40, qr_code_hash: 'QR_RECYCLE_EWASTE_001' },
    { name: 'Limpieza de Campus', description: 'Participa 1 hora en la minga de limpieza.', points_value: 35, qr_code_hash: 'QR_CAMPUS_CLEANUP_001' },
  ];

  for (const action of ecologicalActions) {
    await prisma.ecologicalAction.upsert({
      where: { qr_code_hash: action.qr_code_hash },
      update: action,
      create: action,
    });
  }

  const rewards = [
    {
      name: 'Descuento 10% en Bar',
      description: 'Obten un 10% de descuento en tu proxima compra en el bar universitario.',
      points_cost: 50,
      stock: 100,
    },
    {
      name: 'Descuento 5% en Matricula',
      description: 'Descuento especial aplicable para la matricula del proximo semestre.',
      points_cost: 500,
      stock: 10,
    },
  ];

  for (const reward of rewards) {
    const matches = await prisma.reward.findMany({
      where: { name: reward.name },
      include: { _count: { select: { Redemptions: true } } },
      orderBy: { id: 'asc' },
    });

    const keep = matches.find((item) => item._count.Redemptions > 0) ?? matches[0];

    if (keep) {
      await prisma.reward.update({
        where: { id: keep.id },
        data: reward,
      });

      const duplicateIds = matches
        .filter((item) => item.id !== keep.id && item._count.Redemptions === 0)
        .map((item) => item.id);

      if (duplicateIds.length > 0) {
        await prisma.reward.deleteMany({ where: { id: { in: duplicateIds } } });
      }
    } else {
      await prisma.reward.create({ data: reward });
    }
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
