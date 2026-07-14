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
  
  console.log('Todos los pedidos han sido eliminados.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
