const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { estado: 'en_ruta' },
      include: { entrega: true }
    });
    
    // Asumimos que queremos asignarlo al primer conductor que encontremos (o al conductor de id=5)
    const conductor = await prisma.usuario.findFirst({ where: { rol: 'conductor' } });
    if (!conductor) return console.log('No conductor found');

    for (let p of pedidos) {
      if (!p.entrega) {
        await prisma.entrega.create({
          data: {
            pedidoId: p.id,
            estado: 'en_ruta',
            conductorId: conductor.id
          }
        });
        console.log(`Creada entrega para pedido ${p.id}`);
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
fix();
