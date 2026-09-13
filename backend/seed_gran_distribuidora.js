const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Buscando "La Gran Distribuidora"...');
  
  const distribuidora = await prisma.distribuidora.findUnique({
    where: { slug: 'gran-distribuidora' }
  });

  if (!distribuidora) {
    console.log('❌ No se encontró "La Gran Distribuidora" (slug: gran-distribuidora).');
    return;
  }

  console.log('✅ Distribuidora encontrada. Agregando 9 productos adicionales...');

  const nuevosProductos = [
    { nombre: 'Aceite de Girasol Premier 1000ml', precio: 12500, stock: 150, categoria: 'Aceites' },
    { nombre: 'Azúcar Incauca Blanca 1kg', precio: 4800, stock: 200, categoria: 'Endulzantes' },
    { nombre: 'Lenteja Extra Superior 500g', precio: 3500, stock: 100, categoria: 'Granos' },
    { nombre: 'Café Águila Roja 500g', precio: 13000, stock: 85, categoria: 'Bebidas Calientes' },
    { nombre: 'Pasta La Muñeca Espagueti 500g', precio: 3200, stock: 120, categoria: 'Pastas' },
    { nombre: 'Salsa de Tomate Fruco 400g', precio: 5500, stock: 90, categoria: 'Salsas' },
    { nombre: 'Atún Van Camp\'s en Aceite 160g', precio: 7200, stock: 300, categoria: 'Enlatados' },
    { nombre: 'Sal Refisal Alta Pureza 1kg', precio: 2200, stock: 150, categoria: 'Condimentos' },
    { nombre: 'Panela Redonda (Paquete x 4)', precio: 4500, stock: 110, categoria: 'Endulzantes' }
  ];

  let agregados = 0;
  for (const p of nuevosProductos) {
    const existe = await prisma.producto.findFirst({
      where: { nombre: p.nombre, distribuidoraId: distribuidora.id }
    });

    if (!existe) {
      await prisma.producto.create({
        data: { ...p, distribuidoraId: distribuidora.id }
      });
      agregados++;
    }
  }

  console.log(`🎉 Proceso completado. Se agregaron ${agregados} productos nuevos a La Gran Distribuidora.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
