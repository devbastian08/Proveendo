const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecreto123';
const ORDER_STATUSES = ['en_preparacion', 'preparado', 'en_ruta', 'entregado'];

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Rutas de Autenticación
app.post('/api/auth/register', async (req, res) => {
  const { nombre, correo, contrasena, rol } = req.body;
  if (!nombre || !correo || !contrasena || !rol) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  
  try {
    const hashed = await bcrypt.hash(contrasena, 10);
    const user = await prisma.usuario.create({
      data: { nombre, correo, contrasena: hashed, rol }
    });
    res.status(201).json({ id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol });
  } catch (error) {
    res.status(400).json({ error: 'Error al crear usuario (quizás el correo ya existe)' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { correo, contrasena } = req.body;
  
  try {
    const user = await prisma.usuario.findUnique({ where: { correo } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const match = await bcrypt.compare(contrasena, user.contrasena);
    if (!match) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: user.id, rol: user.rol }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol } });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'ProvEEndo API', db_connected: true });
});

// Rutas de negocio con Prisma
app.get('/api/productos', async (_req, res) => {
  const productos = await prisma.producto.findMany();
  res.json(productos);
});

app.post('/api/productos', authMiddleware, async (req, res) => {
  const { nombre, precio, stock, categoria, imagenUrl } = req.body;
  
  // Proteger la creación: solo administradores
  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo los administradores pueden crear productos' });
  }

  if (!nombre || typeof precio !== 'number' || typeof stock !== 'number') {
    return res.status(400).json({ error: 'nombre, precio y stock son obligatorios' });
  }

  const producto = await prisma.producto.create({
    data: { nombre, precio, stock, categoria: categoria || 'General', imagenUrl }
  });
  return res.status(201).json(producto);
});

app.patch('/api/productos/:id', authMiddleware, async (req, res) => {
  const productoId = Number(req.params.id);
  const { nombre, precio, stock, categoria, imagenUrl } = req.body;

  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo los administradores pueden editar productos' });
  }

  try {
    const dataToUpdate = {};
    if (nombre !== undefined) dataToUpdate.nombre = nombre;
    if (precio !== undefined) dataToUpdate.precio = precio;
    if (stock !== undefined) dataToUpdate.stock = stock;
    if (categoria !== undefined) dataToUpdate.categoria = categoria;
    if (imagenUrl !== undefined) dataToUpdate.imagenUrl = imagenUrl;

    const producto = await prisma.producto.update({
      where: { id: productoId },
      data: dataToUpdate
    });
    return res.json(producto);
  } catch (error) {
    return res.status(404).json({ error: 'Producto no encontrado o error al actualizar' });
  }
});

app.delete('/api/productos/:id', authMiddleware, async (req, res) => {
  const productoId = Number(req.params.id);

  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo los administradores pueden eliminar productos' });
  }

  try {
    await prisma.producto.delete({
      where: { id: productoId }
    });
    return res.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (error) {
    // Si el producto ya tiene detalles de pedidos asociados, prisma no dejará borrarlo a menos que haya cascade delete.
    // Manejamos el error amigablemente.
    return res.status(400).json({ error: 'No se puede eliminar el producto. Verifica que no esté en ningún pedido.' });
  }
});

app.get('/api/pedidos', authMiddleware, async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      include: { detalles: true, entrega: true },
      orderBy: { creadoEn: 'desc' }
    });
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

app.post('/api/pedidos', async (req, res) => {
  const { tenderoId, items } = req.body;

  if (!tenderoId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'tenderoId e items son obligatorios' });
  }

  try {
    let total = 0;
    const detalles = [];
    
    for (const item of items) {
      const producto = await prisma.producto.findUnique({ where: { id: item.productoId } });
      if (!producto) throw new Error(`Producto ${item.productoId} no encontrado`);
      
      const subtotal = item.cantidad * producto.precio;
      total += subtotal;
      detalles.push({
        productoId: producto.id,
        cantidad: item.cantidad,
        subtotal
      });
    }

    const pedido = await prisma.pedido.create({
      data: {
        tenderoId,
        estado: 'en_preparacion',
        total,
        detalles: { create: detalles },
        entrega: { create: { estado: 'en_preparacion' } }
      },
      include: { detalles: true, entrega: true }
    });

    return res.status(201).json(pedido);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.patch('/api/pedidos/:id/estado', authMiddleware, async (req, res) => {
  const pedidoId = Number(req.params.id);
  const { estado } = req.body;

  if (!ORDER_STATUSES.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Usa: ${ORDER_STATUSES.join(', ')}` });
  }

  try {
    const pedido = await prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado }
    });

    // Actualizar también la entrega asociada
    await prisma.entrega.update({
      where: { pedidoId },
      data: { estado }
    });

    return res.json(pedido);
  } catch (error) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }
});

app.get('/api/tendero/:id/catalogo', async (req, res) => {
  const tenderoId = Number(req.params.id);
  
  try {
    const tendero = await prisma.tendero.findUnique({ where: { id: tenderoId } });
    if (!tendero) return res.status(404).json({ error: 'Tendero no encontrado' });

    const productos = await prisma.producto.findMany();
    
    return res.json({
      tendero,
      productos,
      whatsapp_link: `https://wa.me/573001234567?text=Hola%20quiero%20hacer%20un%20pedido%20de%20la%20tienda%20${encodeURIComponent(tendero.nombre_tienda)}`
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener catálogo' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ProvEEndo backend running on http://localhost:${PORT}`);
});
