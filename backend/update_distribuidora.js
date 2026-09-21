const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const distribuidora = await prisma.distribuidora.findFirst();
  if (distribuidora) {
    await prisma.distribuidora.update({
      where: { id: distribuidora.id },
      data: { latitud: 2.93550197461303, longitud: -75.25745245851243 }
    });
    console.log('Coordenadas de la distribuidora (Punto de Salida) actualizadas exitosamente.');
  } else {
    console.log('No se encontró ninguna distribuidora.');
  }
}

main().finally(() => prisma.$disconnect());
