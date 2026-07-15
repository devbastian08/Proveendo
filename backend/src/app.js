const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const rateLimit = require('express-rate-limit');

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecreto123';
const ORDER_STATUSES = ['pendiente', 'en_preparacion', 'preparado', 'en_ruta', 'entregado'];

// Middleware de autenticación
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: 'Usuario ya no existe' });
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

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: { error: 'Demasiados intentos de inicio de sesión. Por favor, intenta de nuevo en 15 minutos.' }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { correo, contrasena } = req.body;
  
  try {
    const user = await prisma.usuario.findUnique({ where: { correo } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const match = await bcrypt.compare(contrasena, user.contrasena);
    if (!match) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: user.id, rol: user.rol }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol, puedeAlistar: user.puedeAlistar } });
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

// Algoritmo Haversine para calcular distancia en KM entre dos coordenadas
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity; // Si no hay GPS, mandar al final
  const R = 6371; // Radio de la tierra en KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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

// Catálogo para el Asesor
app.get('/api/asesor/catalogo', authMiddleware, async (req, res) => {
  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'No tienes una distribuidora asignada' });

  const productos = await prisma.producto.findMany({
    where: { distribuidoraId: distribuidora.id, stock: { gt: 0 } } // Opcional: Solo con stock
  });
  
  res.json({
    distribuidora: {
      id: distribuidora.id,
      nombre: distribuidora.nombre
    },
    productos
  });
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
  const userDetails = await prisma.usuario.findUnique({ where: { id: req.user.id } });
  
  if (req.user.rol !== 'distribuidor' && req.user.rol !== 'administrador') {
    if (!(req.user.rol === 'asesor' && userDetails?.puedeAlistar)) {
      return res.status(403).json({ error: 'No tienes permiso para ver los pedidos de la bodega' });
    }
  }

  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  try {
    const pedidos = await prisma.pedido.findMany({
      where: { distribuidoraId: distribuidora.id },
      include: { 
        detalles: { include: { producto: true } }, 
        entrega: { include: { conductor: true } }
      },
      orderBy: { fecha: 'desc' }
    });
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

app.patch('/api/pedidos/:id/estado', authMiddleware, async (req, res) => {
  const pedidoId = Number(req.params.id);
  const { estado, motivoReactivacion } = req.body;

  if (!ORDER_STATUSES.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Usa: ${ORDER_STATUSES.join(', ')}` });
  }

  const userDetails = await prisma.usuario.findUnique({ where: { id: req.user.id } });
  
  if (req.user.rol !== 'distribuidor' && req.user.rol !== 'administrador') {
    if (!(req.user.rol === 'asesor' && userDetails?.puedeAlistar)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar los pedidos' });
    }
  }
  
  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  try {
    const existing = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!existing || existing.distribuidoraId !== distribuidora.id) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (req.user.rol === 'asesor') {
      if (estado === 'pendiente') {
        return res.status(403).json({ error: 'Solo el administrador puede reactivar pedidos' });
      }
      if (estado === 'entregado') {
        return res.status(403).json({ error: 'Solo el administrador o el conductor pueden marcar un pedido como entregado' });
      }
      if (existing.estado === 'entregado') {
        return res.status(403).json({ error: 'No puedes modificar un pedido que ya está entregado' });
      }
    }

    const dataToUpdate = { estado };
    if (estado === 'pendiente' && motivoReactivacion) {
      dataToUpdate.motivoReactivacion = motivoReactivacion;
    }

    const pedido = await prisma.pedido.update({
      where: { id: pedidoId },
      data: dataToUpdate
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

app.patch('/api/pedidos/:id/asignar', authMiddleware, async (req, res) => {
  const pedidoId = Number(req.params.id);
  const { conductorId } = req.body;
  
  const userDetails = await prisma.usuario.findUnique({ where: { id: req.user.id } });
  
  if (req.user.rol !== 'distribuidor' && req.user.rol !== 'administrador') {
    if (!(req.user.rol === 'asesor' && userDetails?.puedeAlistar)) {
      return res.status(403).json({ error: 'No tienes permiso para despachar pedidos' });
    }
  }

  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  try {
    const existing = await prisma.pedido.findUnique({ where: { id: pedidoId }, include: { entrega: true } });
    if (!existing || existing.distribuidoraId !== distribuidora.id) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (existing.estado !== 'preparado') {
      return res.status(400).json({ error: 'El pedido debe estar preparado antes de asignarlo' });
    }

    // Actualizamos el pedido a en_ruta y le asignamos el conductor a la entrega
    await prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado: 'en_ruta' }
    });

    if (existing.entrega) {
      await prisma.entrega.update({
        where: { pedidoId },
        data: { estado: 'en_ruta', conductorId }
      });
    }

    return res.json({ success: true, message: 'Conductor asignado y en ruta' });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno al asignar' });
  }
});

// Rutas de Conductor (Logística Fase 4)
app.get('/api/conductor/entregas', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'conductor') {
    return res.status(403).json({ error: 'Solo para conductores' });
  }

  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  try {
    let entregas = await prisma.entrega.findMany({
      where: { conductorId: req.user.id, estado: 'en_ruta' },
      include: { 
        pedido: {
          include: {
            detalles: { include: { producto: true } }
          }
        } 
      }
    });

    // ----------------------------------------------------
    // ALGORITMO DE RUTEO INTELIGENTE (Nearest Neighbor)
    // ----------------------------------------------------
    if (entregas.length > 1) {
      let currentLat = distribuidora.latitud || 2.9273; // Por defecto latitud de Neiva si la bodega no tiene GPS
      let currentLng = distribuidora.longitud || -75.28189;
      
      const rutaOptimizada = [];
      const entregasPendientes = [...entregas];

      while (entregasPendientes.length > 0) {
        let nearestIndex = 0;
        let minDistance = Infinity;

        // Buscar la entrega más cercana al punto actual
        for (let i = 0; i < entregasPendientes.length; i++) {
          const e = entregasPendientes[i];
          const dist = calcularDistancia(currentLat, currentLng, e.pedido.latitud, e.pedido.longitud);
          
          if (dist < minDistance) {
            minDistance = dist;
            nearestIndex = i;
          }
        }

        // Remover la más cercana y añadirla a la ruta optimizada
        const nextStop = entregasPendientes.splice(nearestIndex, 1)[0];
        rutaOptimizada.push(nextStop);
        
        // Actualizar nuestro "punto actual" al GPS de esa entrega, si lo tiene
        if (nextStop.pedido.latitud && nextStop.pedido.longitud) {
          currentLat = nextStop.pedido.latitud;
          currentLng = nextStop.pedido.longitud;
        }
      }
      
      entregas = rutaOptimizada;
    }

    return res.json(entregas);
  } catch (error) {
    console.error("Error obteniendo entregas:", error);
    return res.status(500).json({ error: 'Error al obtener entregas' });
  }
});

app.patch('/api/conductor/entregas/:pedidoId/entregado', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'conductor') {
    return res.status(403).json({ error: 'Solo para conductores' });
  }

  const pedidoId = Number(req.params.pedidoId);

  try {
    const entrega = await prisma.entrega.findUnique({ where: { pedidoId } });
    if (!entrega || entrega.conductorId !== req.user.id) {
      return res.status(404).json({ error: 'Entrega no encontrada o no asignada a ti' });
    }

    await prisma.entrega.update({
      where: { pedidoId },
      data: { estado: 'entregado' }
    });

    await prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado: 'entregado' }
    });

    return res.json({ success: true, message: 'Pedido marcado como entregado' });
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
  const { nombre, slug, telefono, descripcion, latitud, longitud } = req.body;
  
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
        telefono: telefono || distribuidora.telefono,
        descripcion: descripcion !== undefined ? descripcion : distribuidora.descripcion,
        latitud: latitud !== undefined ? latitud : distribuidora.latitud,
        longitud: longitud !== undefined ? longitud : distribuidora.longitud
      }
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar distribuidora' });
  }
});

// Gestión de Equipo (Asesores)
app.get('/api/equipo', authMiddleware, async (req, res) => {
  const userDetails = await prisma.usuario.findUnique({ where: { id: req.user.id } });
  
  if (req.user.rol !== 'distribuidor' && req.user.rol !== 'administrador') {
    if (!(req.user.rol === 'asesor' && userDetails?.puedeAlistar)) {
      return res.status(403).json({ error: 'No tienes permiso para ver el equipo' });
    }
  }

  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  const equipo = await prisma.usuario.findMany({
    where: { distribuidoraTrabajoId: distribuidora.id },
    select: { id: true, nombre: true, correo: true, rol: true, puedeAlistar: true }
  });
  res.json(equipo);
});

app.post('/api/equipo', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'distribuidor' && req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'No tienes permiso para agregar equipo' });
  }

  const { nombre, correo, contrasena, rol, puedeAlistar } = req.body;
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
        puedeAlistar: puedeAlistar || false,
        distribuidoraTrabajoId: distribuidora.id
      },
      select: { id: true, nombre: true, correo: true, rol: true, puedeAlistar: true }
    });
    return res.status(201).json(user);
  } catch (error) {
    return res.status(400).json({ error: 'Error al crear usuario (¿correo duplicado?)' });
  }
});

app.patch('/api/equipo/:id', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'distribuidor' && req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'No tienes permiso para modificar equipo' });
  }

  const { puedeAlistar, rol, nombre, correo, contrasena } = req.body;
  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  try {
    const existing = await prisma.usuario.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing || existing.distribuidoraTrabajoId !== distribuidora.id) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const dataToUpdate = {
      puedeAlistar: puedeAlistar !== undefined ? puedeAlistar : existing.puedeAlistar,
      rol: rol || existing.rol,
      nombre: nombre || existing.nombre,
      correo: correo || existing.correo
    };

    if (contrasena) {
      dataToUpdate.contrasena = await bcrypt.hash(contrasena, 10);
    }

    const updated = await prisma.usuario.update({
      where: { id: Number(req.params.id) },
      data: dataToUpdate,
      select: { id: true, nombre: true, correo: true, rol: true, puedeAlistar: true }
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar usuario' });
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
app.get('/api/tiendas/directorio', async (req, res) => {
  try {
    // Solo mostramos las que tengan productos para no mostrar tiendas vacías
    const tiendas = await prisma.distribuidora.findMany({
      where: { productos: { some: {} } },
      include: {
        _count: { select: { productos: true } }
      }
    });
    
    // Mapeamos para enviar un payload limpio
    const directorio = tiendas.map(t => ({
      id: t.id,
      nombre: t.nombre,
      slug: t.slug,
      descripcion: t.descripcion,
      logoUrl: t.logoUrl,
      portadaUrl: t.portadaUrl,
      productosCount: t._count.productos
    }));

    return res.json(directorio);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener directorio de tiendas' });
  }
});

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
  const { distribuidoraId, items, nombreCliente, telefonoCliente, direccionEnvio, latitud, longitud } = req.body;

  if (!distribuidoraId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'distribuidoraId e items son obligatorios' });
  }
  
  if (!nombreCliente || !telefonoCliente || !direccionEnvio) {
    return res.status(400).json({ error: 'Datos del cliente son obligatorios para el envío' });
  }

  try {
    let total = 0;
    const detalles = [];
    const transacciones = [];
    
    for (const item of items) {
      const producto = await prisma.producto.findUnique({ where: { id: item.productoId } });
      if (!producto || producto.distribuidoraId !== distribuidoraId) {
        throw new Error(`Producto ${item.productoId} no es válido`);
      }
      
      if (item.cantidad > producto.stock) {
        throw new Error(`No hay suficiente stock para el producto: ${producto.nombre} (Stock: ${producto.stock})`);
      }
      
      const subtotal = item.cantidad * producto.precio;
      total += subtotal;
      detalles.push({
        productoId: producto.id,
        cantidad: item.cantidad,
        subtotal
      });

      transacciones.push(
        prisma.producto.update({
          where: { id: producto.id },
          data: { stock: { decrement: item.cantidad } }
        })
      );
    }

    const pedidoData = {
      distribuidoraId,
      estado: 'en_preparacion',
      total,
      nombreCliente,
      telefonoCliente,
      direccionEnvio,
      latitud,
      longitud,
      detalles: { create: detalles },
      entrega: { create: { estado: 'en_preparacion' } }
    };

    transacciones.push(
      prisma.pedido.create({
        data: pedidoData,
        include: { detalles: true, entrega: true }
      })
    );

    const resultados = await prisma.$transaction(transacciones);
    const pedido = resultados[resultados.length - 1]; // El pedido es el último objeto de la transacción

    return res.status(201).json(pedido);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ProvEEndo backend running on http://localhost:${PORT}`);
});
