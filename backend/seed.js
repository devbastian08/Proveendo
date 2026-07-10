const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando base de datos...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.usuario.upsert({
    where: { correo: 'admin@proveendo.com' },
    update: {},
    create: {
      nombre: 'Administrador Demo',
      correo: 'admin@proveendo.com',
      contrasena: hashedPassword,
      rol: 'administrador'
    }
  });

  const asesor = await prisma.usuario.upsert({
    where: { correo: 'asesor@proveendo.com' },
    update: {},
    create: {
      nombre: 'Asesor Demo',
      correo: 'asesor@proveendo.com',
      contrasena: hashedPassword,
      rol: 'asesor'
    }
  });

  console.log('Usuarios de prueba creados exitosamente:');
  console.log('- Admin: admin@proveendo.com | Pass: admin123');
  console.log('- Asesor: asesor@proveendo.com | Pass: admin123');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
