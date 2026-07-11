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
  const { nombre, correo, contrasena, rol, nombreTienda, telefono } = req.body;
  if (!nombre || !correo || !contrasena || !rol) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  
  if (rol === 'distribuidor' && (!nombreTienda || !telefono)) {
    return res.status(400).json({ error: 'Faltan datos de la distribuidora (nombreTienda, telefono)' });
  }
  
  try {
    const hashed = await bcrypt.hash(contrasena, 10);
    const user = await prisma.usuario.create({
      data: { nombre, correo, contrasena: hashed, rol }
    });

    if (rol === 'distribuidor') {
      const slug = nombreTienda.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      // Añadimos un sufijo si se requiere que sea único, pero por simplicidad usamos el slug.
      await prisma.distribuidora.create({
        data: {
          nombre: nombreTienda,
          slug: `${slug}-${user.id}`,
          telefono,
          usuarioId: user.id
        }
      });
    }

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

// Helper para obtener la distribuidora del usuario logueado
const getMyDistribuidora = async (userId) => {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    include: { distribuidora: true, distribuidoraTrabajo: true }
  });
  if (!user) return null;
  // Si es dueño (distribuidor/administrador)
  if (user.rol === 'distribuidor' || user.rol === 'administrador') {
    return user.distribuidora;
  }
  // Si es empleado (asesor/conductor)
  return user.distribuidoraTrabajo;
};

// Rutas de negocio (Administración)
app.get('/api/productos', authMiddleware, async (req, res) => {
  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'No tienes una distribuidora asignada' });

  const productos = await prisma.producto.findMany({
    where: { distribuidoraId: distribuidora.id }
  });
  res.json(productos);
});

app.post('/api/productos', authMiddleware, async (req, res) => {
  const { nombre, precio, stock, categoria, imagenUrl } = req.body;
  
  if (req.user.rol !== 'distribuidor' && req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo los distribuidores pueden crear productos' });
  }

  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  if (!nombre || typeof precio !== 'number' || typeof stock !== 'number') {
    return res.status(400).json({ error: 'nombre, precio y stock son obligatorios' });
  }

  const producto = await prisma.producto.create({
    data: { 
      nombre, 
      precio, 
      stock, 
      categoria: categoria || 'General', 
      imagenUrl,
      distribuidoraId: distribuidora.id
    }
  });
  return res.status(201).json(producto);
});

app.patch('/api/productos/:id', authMiddleware, async (req, res) => {
  const productoId = Number(req.params.id);
  const { nombre, precio, stock, categoria, imagenUrl } = req.body;

  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  try {
    const existing = await prisma.producto.findUnique({ where: { id: productoId } });
    if (!existing || existing.distribuidoraId !== distribuidora.id) {
      return res.status(404).json({ error: 'Producto no encontrado en tu inventario' });
    }

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
    return res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

app.delete('/api/productos/:id', authMiddleware, async (req, res) => {
  const productoId = Number(req.params.id);
  
  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  try {
    const existing = await prisma.producto.findUnique({ where: { id: productoId } });
    if (!existing || existing.distribuidoraId !== distribuidora.id) {
      return res.status(404).json({ error: 'Producto no encontrado en tu inventario' });
    }

    await prisma.producto.delete({ where: { id: productoId } });
    return res.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (error) {
    return res.status(400).json({ error: 'No se puede eliminar el producto. Verifica que no esté en ningún pedido.' });
  }
});

app.get('/api/pedidos', authMiddleware, async (req, res) => {
  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  try {
    const pedidos = await prisma.pedido.findMany({
      where: { distribuidoraId: distribuidora.id },
      include: { detalles: { include: { producto: true } }, entrega: true },
      orderBy: { fecha: 'desc' }
    });
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

app.patch('/api/pedidos/:id/estado', authMiddleware, async (req, res) => {
  const pedidoId = Number(req.params.id);
  const { estado } = req.body;

  if (!ORDER_STATUSES.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Usa: ${ORDER_STATUSES.join(', ')}` });
  }
  
  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  try {
    const existing = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!existing || existing.distribuidoraId !== distribuidora.id) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedido = await prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado }
    });

    if (existing.entrega) {
      await prisma.entrega.update({
        where: { pedidoId },
        data: { estado }
      });
    }

    return res.json(pedido);
  } catch (error) {
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Ajustes de Distribuidora
app.get('/api/distribuidora', authMiddleware, async (req, res) => {
  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });
  res.json(distribuidora);
});

app.patch('/api/distribuidora', authMiddleware, async (req, res) => {
  const { nombre, slug, telefono } = req.body;
  
  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  // Validar slug si se intenta cambiar
  let nuevoSlug = distribuidora.slug;
  if (slug && slug !== distribuidora.slug) {
    nuevoSlug = slug.toLowerCase().replace(/[^a-z0-9\-]+/g, '').replace(/(^-|-$)+/g, '');
    
    // Verificar que el nuevo slug no exista ya
    const existing = await prisma.distribuidora.findUnique({ where: { slug: nuevoSlug } });
    if (existing && existing.id !== distribuidora.id) {
      return res.status(400).json({ error: 'El enlace (slug) ya está en uso por otra tienda.' });
    }
  }

  try {
    const updated = await prisma.distribuidora.update({
      where: { id: distribuidora.id },
      data: {
        nombre: nombre || distribuidora.nombre,
        slug: nuevoSlug,
        telefono: telefono || distribuidora.telefono
      }
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar distribuidora' });
  }
});

// Gestión de Equipo (Asesores)
app.get('/api/equipo', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'distribuidor' && req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'No tienes permiso para ver el equipo' });
  }

  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  const equipo = await prisma.usuario.findMany({
    where: { distribuidoraTrabajoId: distribuidora.id },
    select: { id: true, nombre: true, correo: true, rol: true }
  });
  res.json(equipo);
});

app.post('/api/equipo', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'distribuidor' && req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'No tienes permiso para agregar equipo' });
  }

  const { nombre, correo, contrasena, rol } = req.body;
  if (!nombre || !correo || !contrasena || !rol) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  try {
    const hashed = await bcrypt.hash(contrasena, 10);
    const user = await prisma.usuario.create({
      data: {
        nombre,
        correo,
        contrasena: hashed,
        rol,
        distribuidoraTrabajoId: distribuidora.id
      },
      select: { id: true, nombre: true, correo: true, rol: true }
    });
    return res.status(201).json(user);
  } catch (error) {
    return res.status(400).json({ error: 'Error al crear usuario (¿correo duplicado?)' });
  }
});



// Panel de SuperAdmin (SaaS)
app.get('/api/superadmin/distribuidoras', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'superadmin') {
    return res.status(403).json({ error: 'Solo SuperAdmin tiene acceso' });
  }
  
  const distribuidoras = await prisma.distribuidora.findMany({
    include: { usuario: { select: { nombre: true, correo: true } } },
    orderBy: { id: 'desc' }
  });
  res.json(distribuidoras);
});

app.post('/api/superadmin/distribuidoras', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'superadmin') {
    return res.status(403).json({ error: 'Solo SuperAdmin tiene acceso' });
  }

  const { nombreDueno, correo, contrasena, nombreTienda, telefono } = req.body;
  if (!nombreDueno || !correo || !contrasena || !nombreTienda || !telefono) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const hashed = await bcrypt.hash(contrasena, 10);
    // Creamos al usuario con rol distribuidor
    const user = await prisma.usuario.create({
      data: { nombre: nombreDueno, correo, contrasena: hashed, rol: 'distribuidor' }
    });

    // Creamos la distribuidora
    let baseSlug = nombreTienda.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    let slug = baseSlug;
    
    // Si el slug existe, le añadimos el ID (para asegurar unicidad inicial)
    const slugExists = await prisma.distribuidora.findUnique({ where: { slug } });
    if (slugExists) slug = `${baseSlug}-${user.id}`;

    const distribuidora = await prisma.distribuidora.create({
      data: {
        nombre: nombreTienda,
        slug,
        telefono,
        usuarioId: user.id
      }
    });

    res.status(201).json({ user: { id: user.id, correo: user.correo }, distribuidora });
  } catch (error) {
    res.status(400).json({ error: 'Error al crear la tienda. Verifica si el correo ya existe.' });
  }
});

// Rutas Públicas (Página Tendero)
app.get('/api/tienda/:slug', async (req, res) => {
  const { slug } = req.params;
  
  try {
    const distribuidora = await prisma.distribuidora.findUnique({ 
      where: { slug },
      include: { productos: true } 
    });
    
    if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

    return res.json({
      distribuidora: {
        id: distribuidora.id,
        nombre: distribuidora.nombre,
        slug: distribuidora.slug,
        telefono: distribuidora.telefono
      },
      productos: distribuidora.productos
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener tienda' });
  }
});

app.post('/api/pedidos', async (req, res) => {
  const { distribuidoraId, items, nombreCliente, telefonoCliente, direccionEnvio } = req.body;

  if (!distribuidoraId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'distribuidoraId e items son obligatorios' });
  }
  
  if (!nombreCliente || !telefonoCliente || !direccionEnvio) {
    return res.status(400).json({ error: 'Datos del cliente son obligatorios para el envío' });
  }

  try {
    let total = 0;
    const detalles = [];
    
    for (const item of items) {
      const producto = await prisma.producto.findUnique({ where: { id: item.productoId } });
      if (!producto || producto.distribuidoraId !== distribuidoraId) {
        throw new Error(`Producto ${item.productoId} no es válido`);
      }
      
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
        distribuidoraId,
        estado: 'en_preparacion',
        total,
        nombreCliente,
        telefonoCliente,
        direccionEnvio,
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ProvEEndo backend running on http://localhost:${PORT}`);
});
