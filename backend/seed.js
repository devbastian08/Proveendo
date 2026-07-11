const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando base de datos con estructura Multi-Tenant...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Usuario Distribuidor 1
  const distUser1 = await prisma.usuario.upsert({
    where: { correo: 'ventas@distribuidora.com' },
    update: {},
    create: {
      nombre: 'Carlos Distribuidor',
      correo: 'ventas@distribuidora.com',
      contrasena: hashedPassword,
      rol: 'distribuidor'
    }
  });

  // Distribuidora 1
  await prisma.distribuidora.upsert({
    where: { usuarioId: distUser1.id },
    update: {},
    create: {
      nombre: 'La Gran Distribuidora',
      slug: 'gran-distribuidora',
      telefono: '573001234567',
      usuarioId: distUser1.id
    }
  }).catch(async () => {
      // Ignorar si falla por existir
  });
  
  // Producto de Ejemplo
  const distribuidora1 = await prisma.distribuidora.findUnique({ where: { slug: 'gran-distribuidora' } });
  
  if (distribuidora1) {
    const p = await prisma.producto.findFirst({ where: { distribuidoraId: distribuidora1.id } });
    if (!p) {
      await prisma.producto.create({
        data: {
          nombre: 'Arroz Roa 5kg',
          precio: 21500,
          stock: 100,
          categoria: 'Granos',
          distribuidoraId: distribuidora1.id
        }
      });
    }
  }

  // Usuario Admin (Por compatibilidad)
  await prisma.usuario.upsert({
    where: { correo: 'admin@proveendo.com' },
    update: {},
    create: {
      nombre: 'Administrador Demo',
      correo: 'admin@proveendo.com',
      contrasena: hashedPassword,
      rol: 'administrador'
    }
  });

  // Usuario SuperAdmin (Dueño de ProvEEndo)
  await prisma.usuario.upsert({
    where: { correo: 'ceo@proveendo.com' },
    update: {},
    create: {
      nombre: 'CEO ProvEEndo',
      correo: 'ceo@proveendo.com',
      contrasena: hashedPassword,
      rol: 'superadmin'
    }
  });

  console.log('Usuarios de prueba creados exitosamente:');
  console.log('---');
  console.log('👑 PANEL SUPERADMIN (Tú):');
  console.log('👉 Correo: ceo@proveendo.com');
  console.log('👉 Contraseña: admin123');
  console.log('---');
  console.log('📝 PANEL DE DISTRIBUIDORA (Tus clientes):');
  console.log('👉 Correo: ventas@distribuidora.com');
  console.log('👉 Contraseña: admin123');
  console.log('---');
  console.log('🛒 ENLACE PÚBLICO DE LA TIENDA (Para el tendero):');
  console.log('👉 http://localhost:3000/tienda/gran-distribuidora');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
