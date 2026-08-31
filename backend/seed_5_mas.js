const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Creando 5 distribuidoras adicionales...');
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const distribuidoras = [
    {
      nombre: 'Dulces y Snacks La Confitería',
      slug: 'la-confiteria',
      correo: 'ventas@laconfiteria.com',
      descripcion: 'Distribución de dulces, galletas, pasabocas y confitería para tiendas.',
      telefono: '573200000003',
      productos: [
        { nombre: 'Papas Margarita Limón 110g', precio: 3500, stock: 150, categoria: 'Snacks' },
        { nombre: 'De Todito Natural 150g', precio: 4500, stock: 100, categoria: 'Snacks' },
        { nombre: 'Chocolatinas Jet (Caja x 24)', precio: 12000, stock: 80, categoria: 'Chocolates' },
        { nombre: 'Galletas Festival (Taco x 12)', precio: 8000, stock: 90, categoria: 'Galletas' },
        { nombre: 'Gomitas Trululu Cascos (Bolsa)', precio: 5000, stock: 120, categoria: 'Dulces' },
        { nombre: 'Bombombum Fresa (Display x 24)', precio: 9500, stock: 110, categoria: 'Dulces' },
        { nombre: 'Galletas Saltín Noel (Taco x 3)', precio: 6500, stock: 200, categoria: 'Galletas' },
        { nombre: 'Maní Moto Salado 150g', precio: 4000, stock: 130, categoria: 'Snacks' },
        { nombre: 'Barrilete (Display x 24)', precio: 8500, stock: 100, categoria: 'Dulces' },
        { nombre: 'Chocobreak (Display x 24)', precio: 11000, stock: 85, categoria: 'Chocolates' }
      ]
    },
    {
      nombre: 'Aseo y Hogar Brillante',
      slug: 'aseo-brillante',
      correo: 'ventas@aseobrillante.com',
      descripcion: 'Productos de aseo personal, detergentes y limpieza del hogar.',
      telefono: '573200000004',
      productos: [
        { nombre: 'Detergente Ariel Polvo 1kg', precio: 9500, stock: 200, categoria: 'Detergentes' },
        { nombre: 'Jabón Rey Paca x 2', precio: 4000, stock: 300, categoria: 'Jabones' },
        { nombre: 'Límpido Líquido 2000ml', precio: 5500, stock: 150, categoria: 'Limpieza' },
        { nombre: 'Papel Higiénico Familia (Paca x 12)', precio: 18000, stock: 120, categoria: 'Cuidado Personal' },
        { nombre: 'Crema Dental Colgate 100ml', precio: 4500, stock: 250, categoria: 'Cuidado Personal' },
        { nombre: 'Shampoo Savital 550ml', precio: 12000, stock: 90, categoria: 'Cuidado Personal' },
        { nombre: 'Desodorante Rexona Mujer 50ml', precio: 8500, stock: 110, categoria: 'Cuidado Personal' },
        { nombre: 'Suavizante Suavitel 1000ml', precio: 7500, stock: 140, categoria: 'Limpieza' },
        { nombre: 'Esponja Sabra (Paquete x 3)', precio: 3000, stock: 200, categoria: 'Limpieza' },
        { nombre: 'Jabón de Baño Protex (Caja x 3)', precio: 6500, stock: 180, categoria: 'Cuidado Personal' }
      ]
    },
    {
      nombre: 'Lácteos El Rancho',
      slug: 'lacteos-el-rancho',
      correo: 'ventas@elrancho.com',
      descripcion: 'Distribución mayorista de leche, quesos, yogures y derivados lácteos.',
      telefono: '573200000005',
      productos: [
        { nombre: 'Leche Alquería Entera 1L (Paca x 6)', precio: 22000, stock: 100, categoria: 'Leches' },
        { nombre: 'Leche Colanta Deslactosada 1L (Paca x 6)', precio: 24000, stock: 90, categoria: 'Leches' },
        { nombre: 'Queso Campesino Libra', precio: 9500, stock: 60, categoria: 'Quesos' },
        { nombre: 'Queso Doble Crema Bloque 1kg', precio: 21000, stock: 40, categoria: 'Quesos' },
        { nombre: 'Yogurt Alpina Fresa 1L', precio: 6500, stock: 80, categoria: 'Yogures' },
        { nombre: 'Avena Alpina Vaso 250g', precio: 2500, stock: 120, categoria: 'Yogures' },
        { nombre: 'Mantequilla Rama 250g', precio: 5000, stock: 150, categoria: 'Mantequillas' },
        { nombre: 'Crema de Leche Alquería 200g', precio: 4500, stock: 100, categoria: 'Cremas' },
        { nombre: 'Kumis Alpina 1L', precio: 7000, stock: 70, categoria: 'Yogures' },
        { nombre: 'Leche Condensada Nestlé 300g', precio: 6000, stock: 85, categoria: 'Cremas' }
      ]
    },
    {
      nombre: 'Salsamentaria El Buen Gusto',
      slug: 'salsamentaria-buen-gusto',
      correo: 'ventas@buengusto.com',
      descripcion: 'Cárnicos, embutidos y salsas para comidas rápidas y tiendas.',
      telefono: '573200000006',
      productos: [
        { nombre: 'Salchicha Manguera Zenú (Paquete x 20)', precio: 15000, stock: 80, categoria: 'Embutidos' },
        { nombre: 'Chorizo Santarrosano (Paquete x 10)', precio: 18000, stock: 60, categoria: 'Embutidos' },
        { nombre: 'Jamón Pietrán Sándwich 500g', precio: 14000, stock: 70, categoria: 'Embutidos' },
        { nombre: 'Mortadela Zenú 500g', precio: 9000, stock: 90, categoria: 'Embutidos' },
        { nombre: 'Salsa de Tomate Fruco 1000g', precio: 8500, stock: 150, categoria: 'Salsas' },
        { facility: 'Mayonesa Fruco 1000g', nombre: 'Mayonesa Fruco 1000g', precio: 9500, stock: 130, categoria: 'Salsas' },
        { nombre: 'Mostaza Fruco 500g', precio: 6000, stock: 100, categoria: 'Salsas' },
        { nombre: 'Salchichón Cervecero Zenú', precio: 12000, stock: 85, categoria: 'Embutidos' },
        { nombre: 'Queso Tajado Mozzarella 500g', precio: 13000, stock: 110, categoria: 'Lácteos' },
        { nombre: 'Pan Perro Bimbo (Paquete x 12)', precio: 6500, stock: 60, categoria: 'Panadería' }
      ]
    },
    {
      nombre: 'Distribuciones Farma Salud',
      slug: 'distri-farma',
      correo: 'ventas@distrifarma.com',
      descripcion: 'Medicamentos de venta libre (OTC) y artículos de farmacia para tiendas.',
      telefono: '573200000007',
      productos: [
        { nombre: 'Dolex Forte (Caja x 100)', precio: 45000, stock: 50, categoria: 'Medicamentos OTC' },
        { nombre: 'Aspirina Efervescente (Caja x 12)', precio: 12000, stock: 80, categoria: 'Medicamentos OTC' },
        { nombre: 'Alka-Seltzer (Caja x 60)', precio: 35000, stock: 60, categoria: 'Medicamentos OTC' },
        { nombre: 'Sal de Frutas Lua (Caja x 30)', precio: 18000, stock: 100, categoria: 'Medicamentos OTC' },
        { nombre: 'Gaviscon (Caja x 24)', precio: 22000, stock: 70, categoria: 'Medicamentos OTC' },
        { nombre: 'Toallas Nosotras Natural (Paquete x 10)', precio: 4500, stock: 200, categoria: 'Higiene Íntima' },
        { nombre: 'Protectores Nosotras (Caja x 50)', precio: 8000, stock: 150, categoria: 'Higiene Íntima' },
        { nombre: 'Pañales Pequeñín Etapa 3 (Paca x 30)', precio: 25000, stock: 80, categoria: 'Bebés' },
        { nombre: 'Crema No. 4 Original 60g', precio: 9500, stock: 120, categoria: 'Bebés' },
        { nombre: 'Condones Today (Caja x 3)', precio: 6000, stock: 300, categoria: 'Salud Sexual' }
      ]
    }
  ];

  for (const d of distribuidoras) {
    // 1. Crear Usuario Admin
    const user = await prisma.usuario.upsert({
      where: { correo: d.correo },
      update: {},
      create: {
        nombre: 'Admin ' + d.nombre,
        correo: d.correo,
        contrasena: hashedPassword,
        rol: 'distribuidor'
      }
    });

    // 2. Crear Distribuidora
    const dist = await prisma.distribuidora.upsert({
      where: { usuarioId: user.id },
      update: {},
      create: {
        nombre: d.nombre,
        slug: d.slug,
        descripcion: d.descripcion,
        telefono: d.telefono,
        usuarioId: user.id
      }
    });

    // 3. Crear Productos
    for (const p of d.productos) {
      const existe = await prisma.producto.findFirst({ where: { nombre: p.nombre, distribuidoraId: dist.id } });
      if (!existe) {
        await prisma.producto.create({
          data: {
            nombre: p.nombre,
            precio: p.precio,
            stock: p.stock,
            categoria: p.categoria,
            distribuidoraId: dist.id
          }
        });
      }
    }
    console.log(`✅ ${d.nombre} creada con éxito.`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
