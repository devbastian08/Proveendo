const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Creando distribuidoras ficticias para la demostración...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // DISTRIBUIDORA 1: Abarrotes La Principal
  const userAbarrotes = await prisma.usuario.upsert({
    where: { correo: 'ventas@laprincipal.com' },
    update: {},
    create: {
      nombre: 'Admin La Principal',
      correo: 'ventas@laprincipal.com',
      contrasena: hashedPassword,
      rol: 'distribuidor'
    }
  });

  const distAbarrotes = await prisma.distribuidora.upsert({
    where: { usuarioId: userAbarrotes.id },
    update: {},
    create: {
      nombre: 'Abarrotes La Principal',
      slug: 'la-principal',
      descripcion: 'Venta al por mayor de abarrotes, víveres y productos de canasta familiar.',
      telefono: '573200000001',
      usuarioId: userAbarrotes.id
    }
  });

  const productosAbarrotes = [
    { nombre: 'Arroz Diana Premium 5kg', precio: 22000, stock: 50, categoria: 'Granos' },
    { nombre: 'Aceite Gourmet 3L', precio: 31000, stock: 40, categoria: 'Aceites' },
    { nombre: 'Azúcar Manuelita 1kg', precio: 4500, stock: 100, categoria: 'Endulzantes' },
    { nombre: 'Frijol Cargamanto 500g', precio: 6000, stock: 60, categoria: 'Granos' },
    { nombre: 'Lenteja Premium 500g', precio: 3800, stock: 80, categoria: 'Granos' },
    { nombre: 'Panela Cuadrada 500g', precio: 3200, stock: 120, categoria: 'Endulzantes' },
    { nombre: 'Sal Refinada Refisal 1kg', precio: 2100, stock: 150, categoria: 'Condimentos' },
    { nombre: 'Harina de Trigo Haz de Oros 1kg', precio: 4200, stock: 90, categoria: 'Harinas' },
    { nombre: 'Pasta Doria Espagueti 500g', precio: 3500, stock: 110, categoria: 'Pastas' },
    { nombre: 'Café Sello Rojo 500g', precio: 12500, stock: 75, categoria: 'Bebidas' },
  ];

  for (const p of productosAbarrotes) {
    const existe = await prisma.producto.findFirst({ where: { nombre: p.nombre, distribuidoraId: distAbarrotes.id } });
    if (!existe) {
      await prisma.producto.create({
        data: { ...p, distribuidoraId: distAbarrotes.id }
      });
    }
  }
  console.log('✅ Distribuidora "Abarrotes La Principal" creada con 10 productos.');

  // DISTRIBUIDORA 2: Licores y Bebidas El Oasis
  const userLicores = await prisma.usuario.upsert({
    where: { correo: 'ventas@eloasis.com' },
    update: {},
    create: {
      nombre: 'Admin El Oasis',
      correo: 'ventas@eloasis.com',
      contrasena: hashedPassword,
      rol: 'distribuidor'
    }
  });

  const distLicores = await prisma.distribuidora.upsert({
    where: { usuarioId: userLicores.id },
    update: {},
    create: {
      nombre: 'Bebidas El Oasis',
      slug: 'el-oasis',
      descripcion: 'Distribuidor mayorista de bebidas y licores para tiendas.',
      telefono: '573200000002',
      usuarioId: userLicores.id
    }
  });

  const productosLicores = [
    { nombre: 'Cerveza Águila Lata 330ml (Sixpack)', precio: 15000, stock: 100, categoria: 'Cervezas' },
    { nombre: 'Cerveza Poker Botella 330ml (Caja x 30)', precio: 65000, stock: 50, categoria: 'Cervezas' },
    { nombre: 'Aguardiente Doble Anís 750ml', precio: 35000, stock: 40, categoria: 'Licores' },
    { nombre: 'Ron Viejo de Caldas 750ml', precio: 42000, stock: 35, categoria: 'Licores' },
    { nombre: 'Gaseosa Coca-Cola 2L (Paca x 6)', precio: 28000, stock: 60, categoria: 'Gaseosas' },
    { nombre: 'Gaseosa Postobón Manzana 2.5L (Paca x 6)', precio: 26000, stock: 70, categoria: 'Gaseosas' },
    { nombre: 'Jugo Hit Mora 500ml (Paca x 12)', precio: 18000, stock: 80, categoria: 'Jugos' },
    { nombre: 'Agua Cristal 600ml (Paca x 24)', precio: 24000, stock: 120, categoria: 'Aguas' },
    { nombre: 'Gatorade Mandarina 500ml (Paca x 12)', precio: 22000, stock: 90, categoria: 'Bebidas' },
    { nombre: 'Cerveza Club Colombia Dorada (Sixpack)', precio: 18000, stock: 80, categoria: 'Cervezas' },
  ];

  for (const p of productosLicores) {
    const existe = await prisma.producto.findFirst({ where: { nombre: p.nombre, distribuidoraId: distLicores.id } });
    if (!existe) {
      await prisma.producto.create({
        data: { ...p, distribuidoraId: distLicores.id }
      });
    }
  }
  console.log('✅ Distribuidora "Bebidas El Oasis" creada con 10 productos.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
