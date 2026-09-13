const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Buscando "La Gran Distribuidora"...');
  
  const distribuidora = await prisma.distribuidora.findUnique({
    where: { slug: 'gran-distribuidora' },
    include: { productos: true }
  });

  if (!distribuidora) {
    console.log('❌ No se encontró "La Gran Distribuidora".');
    return;
  }

  const productos = distribuidora.productos;
  if (productos.length < 5) {
    console.log('⚠️ Se requieren más productos para crear pedidos realistas.');
  }

  console.log('✅ Generando 5 pedidos de tenderos en Neiva...');

  const clientes = [
    {
      nombre: 'Tienda La Esquina (Don Pedro)',
      telefono: '3151234567',
      direccion: 'Calle 16 # 7-15, Barrio Quirinal, Neiva',
      lat: 2.9345,
      lng: -75.2890
    },
    {
      nombre: 'Supermercado El Primo',
      telefono: '3209876543',
      direccion: 'Carrera 2 # 35-40, Barrio Las Granjas, Neiva',
      lat: 2.9510,
      lng: -75.2830
    },
    {
      nombre: 'Minimercado Centro',
      telefono: '3114567890',
      direccion: 'Carrera 5 # 8-22, Centro, Neiva',
      lat: 2.9275,
      lng: -75.2882
    },
    {
      nombre: 'Tienda Cándido (Doña Martha)',
      telefono: '3187654321',
      direccion: 'Calle 50 # 1W-12, Barrio Cándido, Neiva',
      lat: 2.9600,
      lng: -75.2855
    },
    {
      nombre: 'Víveres San José',
      telefono: '3001122334',
      direccion: 'Carrera 15 # 14-30 Sur, Barrio San José, Neiva',
      lat: 2.9150,
      lng: -75.2800
    }
  ];

  for (let i = 0; i < clientes.length; i++) {
    const cliente = clientes[i];
    
    // Seleccionar entre 2 y 4 productos aleatorios
    const cantidadProductos = Math.floor(Math.random() * 3) + 2; 
    const productosSeleccionados = [];
    // Mezclar array de productos para aleatoriedad
    const shuffled = [...productos].sort(() => 0.5 - Math.random());
    
    let totalPedido = 0;
    const detalles = [];

    for (let j = 0; j < cantidadProductos; j++) {
      const p = shuffled[j];
      const cantidadPedida = Math.floor(Math.random() * 5) + 1; // de 1 a 5 unidades
      const subtotal = p.precio * cantidadPedida;
      totalPedido += subtotal;

      detalles.push({
        productoId: p.id,
        cantidad: cantidadPedida,
        subtotal: subtotal
      });
    }

    // Variar los estados para que el panel se vea dinámico en el video, 
    // pero dejando la mayoría en pendiente para que puedan moverlos.
    // 3 pendientes, 1 preparado, 1 en_ruta
    let estado = 'pendiente';
    if (i === 3) estado = 'preparado';
    if (i === 4) estado = 'en_ruta';

    // Fecha: Crear pedidos con fechas de hoy y ayer para más realismo
    const fecha = new Date();
    fecha.setHours(fecha.getHours() - (i * 2)); // Restar horas

    await prisma.pedido.create({
      data: {
        distribuidoraId: distribuidora.id,
        estado: estado,
        total: totalPedido,
        fecha: fecha,
        nombreCliente: cliente.nombre,
        telefonoCliente: cliente.telefono,
        direccionEnvio: cliente.direccion,
        latitud: cliente.lat,
        longitud: cliente.lng,
        detalles: {
          create: detalles
        }
      }
    });

    console.log(`✅ Pedido creado para ${cliente.nombre} (${estado}) - Total: $${totalPedido}`);
  }

  console.log('🎉 5 pedidos creados exitosamente con ubicaciones GPS reales de Neiva.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
