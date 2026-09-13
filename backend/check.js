const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const entregas = await prisma.entrega.findMany({
      where: { estado: 'en_ruta' },
      include: {
        pedido: true
      }
    });
    
    console.log("Entregas en ruta: ", entregas.length);
    for (let e of entregas) {
      console.log(`Pedido ${e.pedidoId} - ConductorID: ${e.conductorId}`);
    }

    const conductores = await prisma.usuario.findMany({
      where: { rol: 'conductor' }
    });
    console.log("Conductores en la BD: ");
    for (let c of conductores) {
      console.log(`ID: ${c.id}, Correo: ${c.correo}`);
    }
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
