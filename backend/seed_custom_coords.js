const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const coordenadas = [
  { "latitud": 2.907410, "longitud": -75.270524 },
  { "latitud": 2.905100, "longitud": -75.273200 },
  { "latitud": 2.906200, "longitud": -75.275100 },
  { "latitud": 2.927000, "longitud": -75.285000 },
  { "latitud": 2.935000, "longitud": -75.280000 },
  { "latitud": 2.909731, "longitud": -75.279290 },
  { "latitud": 2.950745, "longitud": -75.288410 },
  { "latitud": 2.934050, "longitud": -75.248700 },
  { "latitud": 2.960000, "longitud": -75.290000 },
  { "latitud": 2.952120, "longitud": -75.286720 }
];

async function main() {
  const distribuidora = await prisma.distribuidora.findFirst();
  if (!distribuidora) {
    console.log('No hay distribuidora.');
    return;
  }

  let conductor = await prisma.usuario.findFirst({ where: { rol: 'conductor' } });
  if (!conductor) {
    console.log('No hay conductor.');
    return;
  }

  const producto = await prisma.producto.findFirst();
  if (!producto) {
    console.log('No hay productos.');
    return;
  }

  console.log(`Creando ${coordenadas.length} pedidos en ruta...`);

  for (let i = 0; i < coordenadas.length; i++) {
    const { latitud, longitud } = coordenadas[i];
    
    await prisma.pedido.create({
      data: {
        distribuidoraId: distribuidora.id,
        estado: 'en_ruta',
        total: producto.precio * 2,
        nombreCliente: `Cliente Prueba ${i + 1}`,
        direccionEnvio: `Dirección generada ${i + 1}`,
        telefonoCliente: '3000000000',
        latitud,
        longitud,
        detalles: {
          create: [
            {
              productoId: producto.id,
              cantidad: 2,
              subtotal: producto.precio * 2
            }
          ]
        },
        entrega: {
          create: {
            estado: 'en_ruta',
            conductorId: conductor.id
          }
        }
      }
    });
  }

  console.log('¡Pedidos con coordenadas exactas creados exitosamente!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
