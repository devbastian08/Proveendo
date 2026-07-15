const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Eliminar en orden por las llaves foráneas
  console.log('Borrando Entregas...');
  await prisma.entrega.deleteMany({});
  
  console.log('Borrando Detalles de Pedidos...');
  await prisma.detallePedido.deleteMany({});
  
  console.log('Borrando Pedidos...');
  await prisma.pedido.deleteMany({});
  
  console.log('Reiniciando el contador de pedidos (id) a 1...');
  try {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Pedido_id_seq" RESTART WITH 1;`);
  } catch (e) {
    console.log('No se pudo reiniciar la secuencia, puede que el nombre de la tabla varíe según la BD.');
  }
  
  console.log('Todos los pedidos han sido eliminados y el contador reiniciado.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
