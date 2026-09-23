const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando limpieza de pedidos...');
  await prisma.entrega.deleteMany();
  await prisma.detallePedido.deleteMany();
  await prisma.pedido.deleteMany();
  
  await prisma.distribuidora.updateMany({
    data: { contadorPedidos: 0 }
  });
  
  console.log('Todos los pedidos borrados exitosamente y contadores reiniciados.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
