const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { estado: 'en_ruta' },
      include: { entrega: true }
    });
    
    console.log("Pedidos en ruta:", pedidos.length);
    for (let p of pedidos) {
      console.log(`Pedido ${p.id} - Entrega: ${p.entrega ? p.entrega.estado + ' (Cond: ' + p.entrega.conductorId + ')' : 'NO EXISTE'}`);
    }
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
