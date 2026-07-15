const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const coordenadas = [
  { lat: 2.9273, lng: -75.2873 },
  { lat: 2.9250, lng: -75.2935 },
  { lat: 2.9345, lng: -75.2891 },
  { lat: 2.9431, lng: -75.2948 },
  { lat: 2.9458, lng: -75.2881 },
  { lat: 2.9152, lng: -75.2805 },
  { lat: 2.9261, lng: -75.2922 },
  { lat: 2.9318, lng: -75.2845 },
  { lat: 2.9325, lng: -75.2862 },
  { lat: 2.9515, lng: -75.2930 },
  { lat: 2.9378, lng: -75.2902 },
  { lat: 2.9298, lng: -75.2825 },
  { lat: 2.9265, lng: -75.2882 },
  { lat: 2.9388, lng: -75.2755 },
  { lat: 2.9545, lng: -75.2910 },
  { lat: 2.8945, lng: -75.2785 },
  { lat: 2.9480, lng: -75.2920 },
  { lat: 2.9310, lng: -75.2650 },
  { lat: 2.9285, lng: -75.2855 },
  { lat: 2.9050, lng: -75.2880 }
];

async function main() {
  // Obtener la primera distribuidora
  const distribuidora = await prisma.distribuidora.findFirst();
  if (!distribuidora) {
    console.log("No hay distribuidora");
    return;
  }

  // Obtener un producto
  const producto = await prisma.producto.findFirst({ where: { distribuidoraId: distribuidora.id } });
  if (!producto) {
    console.log("No hay productos");
    return;
  }

  // Obtener un conductor
  const conductor = await prisma.usuario.findFirst({ where: { rol: 'conductor', distribuidoraTrabajoId: distribuidora.id } });
  if (!conductor) {
    console.log("No hay conductor. Creando uno de prueba...");
    // Fallback if no conductor exists
    return;
  }

  console.log(`Inyectando 20 pedidos en ruta para el conductor ${conductor.nombre}...`);

  for (let i = 0; i < coordenadas.length; i++) {
    const coord = coordenadas[i];
    await prisma.pedido.create({
      data: {
        distribuidoraId: distribuidora.id,
        estado: 'en_ruta',
        total: producto.precio * 2,
        nombreCliente: `Cliente Prueba ${i + 1}`,
        telefonoCliente: '3000000000',
        direccionEnvio: `Dirección simulada ${i + 1}`,
        latitud: coord.lat,
        longitud: coord.lng,
        detalles: {
          create: [{ productoId: producto.id, cantidad: 2, subtotal: producto.precio * 2 }]
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
  
  console.log('¡20 pedidos inyectados con éxito!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
