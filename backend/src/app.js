require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('./sentry.js'); // Sentry debe inicializarse antes que express y cualquier otra librería
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { sendWhatsAppMessage, handleIncomingMessage } = require('./services/whatsappService');

const prisma = new PrismaClient();
const app = express();
const apiCache = new NodeCache({ stdTTL: 15 });

// Middleware de caché genérico para proteger la BD de múltiples cargas
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    // Clave única por URL y por usuario (para no mezclar data de distribuidores)
    const key = `__cache__${req.originalUrl || req.url}__${req.user ? req.user.id : 'anon'}`;
    const cachedResponse = apiCache.get(key);
    if (cachedResponse) {
      return res.send(cachedResponse);
    } else {
      res.sendResponse = res.send;
      res.send = (body) => {
        apiCache.set(key, body, duration);
        res.sendResponse(body);
      };
      next();
    }
  };
};
app.use(helmet()); // Bloquea ataques de headers y añade escudos base
app.use(cors({ origin: true, credentials: true })); // origin:true refleja el origen de la petición
app.use(cookieParser());
app.use(morgan('dev'));
app.use(express.json());

// ----------------------------------------------------
// SISTEMA DE RATE LIMITING (SEGURIDAD)
// ----------------------------------------------------

// 1. Escudo Global: 300 peticiones por IP cada 15 minutos para toda la API
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Has excedido el límite de peticiones globales permitidas. Por favor, intenta de nuevo en 15 minutos.' }
});
app.use('/api/', globalApiLimiter);

// 2. Escudo Público: 100 peticiones por IP cada 15 min para el catálogo (evita bots extractores)
const publicTiendasLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Has excedido el límite de navegación de tiendas. Por favor, intenta más tarde.' }
});
app.use('/api/tiendas', publicTiendasLimiter);

// 3. Escudo de Registro: 3 creaciones de cuenta por IP cada 15 minutos (evita spam de bots)
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Demasiadas cuentas creadas desde esta IP. Por favor, intenta más tarde.' }
});

if (!process.env.JWT_SECRET) {
  console.error('CRITICAL ERROR: JWT_SECRET environment variable is not set.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const ORDER_STATUSES = ['pendiente', 'en_preparacion', 'preparado', 'en_ruta', 'entregado'];

// Middleware de autenticación
const authMiddleware = async (req, res, next) => {
  let token = req.cookies?.token;
  
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    const bearerToken = req.headers.authorization.split(' ')[1];
    if (bearerToken !== 'null' && bearerToken !== 'undefined' && bearerToken !== '') {
      token = bearerToken;
    }
  }

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
app.post('/api/auth/register', registerLimiter, async (req, res) => {
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
    
    // Inyectamos el JWT en una cookie httpOnly segura
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 día
    });

    res.json({ token, user: { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol, puedeAlistar: user.puedeAlistar } });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Ruta para cerrar sesión (destruye la cookie)
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Sesión cerrada correctamente' });
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
app.get('/api/productos', authMiddleware, cacheMiddleware(5), async (req, res) => {
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

app.get('/api/pedidos', authMiddleware, cacheMiddleware(5), async (req, res) => {
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

    if (existing.telefonoCliente) {
      const msg = `¡Hola ${existing.nombreCliente || 'Cliente'}! El estado de tu pedido ha cambiado a: ${estado.replace('_', ' ')}.`;
      sendWhatsAppMessage(existing.telefonoCliente, msg);
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
    const conductorData = await prisma.usuario.findUnique({ where: { id: Number(conductorId) } });
    if (!conductorData) return res.status(404).json({ error: 'Conductor no encontrado' });
    if (conductorData.enRuta) {
      return res.status(400).json({ error: 'El conductor ya salió a ruta y no puede recibir más pedidos.' });
    }

    const existing = await prisma.pedido.findUnique({ where: { id: pedidoId }, include: { entrega: true } });
    if (!existing || existing.distribuidoraId !== distribuidora.id) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (existing.estado !== 'preparado') {
      return res.status(400).json({ error: 'El pedido debe estar preparado antes de asignarlo' });
    }

    // Actualizamos el pedido a en_ruta
    await prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado: 'en_ruta' }
    });

    if (existing.entrega) {
      await prisma.entrega.update({
        where: { pedidoId },
        data: { estado: 'en_ruta', conductorId }
      });
    } else {
      // Si el pedido no tenía registro de entrega (ej. migración de BD), lo creamos
      await prisma.entrega.create({
        data: {
          pedidoId,
          estado: 'en_ruta',
          conductorId
        }
      });
    }

    return res.json({ success: true, message: 'Conductor asignado y en ruta' });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno al asignar' });
  }
});

// Rutas de Conductor (Logística Fase 4)
app.post('/api/conductor/ubicacion', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'conductor') return res.status(403).json({ error: 'Solo para conductores' });
  const { latitud, longitud } = req.body;
  
  try {
    await prisma.usuario.update({
      where: { id: req.user.id },
      data: { latitud, longitud }
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("Error guardando ubicación GPS:", err);
    return res.status(500).json({ error: 'Error guardando ubicación' });
  }
});

app.get('/api/conductor/estado', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'conductor') return res.status(403).json({ error: 'Solo para conductores' });
  const user = await prisma.usuario.findUnique({ where: { id: req.user.id } });
  return res.json({ enRuta: user.enRuta });
});

app.post('/api/conductor/iniciar-ruta', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'conductor') return res.status(403).json({ error: 'Solo para conductores' });
  await prisma.usuario.update({ where: { id: req.user.id }, data: { enRuta: true } });
  return res.json({ success: true, enRuta: true });
});

app.post('/api/conductor/finalizar-ruta', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'conductor') return res.status(403).json({ error: 'Solo para conductores' });
  
  const pendientes = await prisma.entrega.count({
    where: { conductorId: req.user.id, estado: 'en_ruta' }
  });
  
  if (pendientes > 0) {
    return res.status(400).json({ error: 'Aún tienes entregas pendientes en esta ruta.' });
  }
  
  await prisma.usuario.update({ where: { id: req.user.id }, data: { enRuta: false } });
  return res.json({ success: true, enRuta: false });
});

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
      },
      orderBy: { orden: 'asc' } // El Admin dicta el orden
    });

    let rutaGeometry = null;
    let origen = null;
    
    if (entregas.length > 0) {
      let startLat = distribuidora.latitud || 2.9273;
      let startLng = distribuidora.longitud || -75.28189;
      origen = { lat: startLat, lng: startLng };
      
      const validEntregas = entregas.filter(e => e.pedido.latitud && e.pedido.longitud);
      
      if (process.env.ORS_API_KEY && validEntregas.length > 0) {
        try {
          const orderedCoords = [];
          orderedCoords.push([startLng, startLat]); // Start
          
          validEntregas.forEach(e => {
            orderedCoords.push([e.pedido.longitud, e.pedido.latitud]);
          });
          
          orderedCoords.push([startLng, startLat]); // End (Viaje redondo)

          // Caché en memoria para evitar quemar la cuota de ORS
          if (!global.routeGeometryCache) {
            global.routeGeometryCache = new Map();
          }

          if (orderedCoords.length > 1) {
            // Generar un hash único de la ruta usando el ID del conductor y las coordenadas
            const routeHash = req.user.id + '_' + orderedCoords.map(c => `${c[0]},${c[1]}`).join('|');
            
            if (global.routeGeometryCache.has(routeHash)) {
              rutaGeometry = global.routeGeometryCache.get(routeHash);
            } else {
              const dirRes = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
                method: 'POST',
                headers: {
                  'Authorization': process.env.ORS_API_KEY,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ coordinates: orderedCoords, language: "es" })
              });
              
              if (dirRes.ok) {
                const dirData = await dirRes.json();
                if (dirData.features && dirData.features.length > 0) {
                  rutaGeometry = dirData.features[0].geometry;
                  global.routeGeometryCache.set(routeHash, rutaGeometry);
                }
              } else {
                console.warn("ORS API límite alcanzado o error:", await dirRes.text());
              }
            }
          }
        } catch (err) {
          console.error("Error llamando a ORS Directions:", err);
        }
      }
    }

    return res.json({ entregas, rutaGeometry, origen });
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

    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (pedido && pedido.telefonoCliente) {
      const msg = `¡Hola ${pedido.nombreCliente || 'Cliente'}! Tu pedido ha sido entregado. ¡Gracias por preferirnos!`;
      sendWhatsAppMessage(pedido.telefonoCliente, msg);
    }

    return res.json({ success: true, message: 'Pedido marcado como entregado' });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Ajustes de Distribuidora
app.get('/api/distribuidora', authMiddleware, cacheMiddleware(60), async (req, res) => {
  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });
  res.json(distribuidora);
});

app.patch('/api/distribuidora', authMiddleware, async (req, res) => {
  const { nombre, slug, telefono, descripcion, latitud, longitud, pedidoMinimo, tiempoEntrega, envioGratis, logoUrl, portadaUrl } = req.body;
  
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
        longitud: longitud !== undefined ? longitud : distribuidora.longitud,
        pedidoMinimo: pedidoMinimo !== undefined ? pedidoMinimo : distribuidora.pedidoMinimo,
        tiempoEntrega: tiempoEntrega !== undefined ? tiempoEntrega : distribuidora.tiempoEntrega,
        envioGratis: envioGratis !== undefined ? envioGratis : distribuidora.envioGratis,
        logoUrl: logoUrl !== undefined ? logoUrl : distribuidora.logoUrl,
        portadaUrl: portadaUrl !== undefined ? portadaUrl : distribuidora.portadaUrl
      }
    });
    return res.json(updated);
  } catch (error) {
    console.error("Error detallado al actualizar distribuidora:", error);
    return res.status(500).json({ error: 'Error al actualizar distribuidora: ' + (error.message || 'Desconocido') });
  }
});

// Gestión de Equipo (Asesores)
app.get('/api/equipo', authMiddleware, cacheMiddleware(10), async (req, res) => {
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
    select: { id: true, nombre: true, correo: true, rol: true, puedeAlistar: true, enRuta: true, puedeAtenderTickets: true }
  });
  res.json(equipo);
});

app.post('/api/equipo', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'distribuidor' && req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'No tienes permiso para agregar equipo' });
  }

  const { nombre, correo, contrasena, rol, puedeAlistar, puedeAtenderTickets } = req.body;
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
        puedeAtenderTickets: puedeAtenderTickets || false,
        distribuidoraTrabajoId: distribuidora.id
      },
      select: { id: true, nombre: true, correo: true, rol: true, puedeAlistar: true, puedeAtenderTickets: true }
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

  const { puedeAlistar, rol, nombre, correo, contrasena, enRuta, puedeAtenderTickets } = req.body;
  const distribuidora = await getMyDistribuidora(req.user.id);
  if (!distribuidora) return res.status(404).json({ error: 'Distribuidora no encontrada' });

  try {
    const existing = await prisma.usuario.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing || existing.distribuidoraTrabajoId !== distribuidora.id) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const dataToUpdate = {
      puedeAlistar: puedeAlistar !== undefined ? puedeAlistar : existing.puedeAlistar,
      puedeAtenderTickets: puedeAtenderTickets !== undefined ? puedeAtenderTickets : existing.puedeAtenderTickets,
      enRuta: enRuta !== undefined ? enRuta : existing.enRuta,
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
      select: { id: true, nombre: true, correo: true, rol: true, puedeAlistar: true, puedeAtenderTickets: true }
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

app.get('/api/tiendas/frecuentes', cacheMiddleware(30), async (req, res) => {
  const { telefono } = req.query;
  if (!telefono) return res.json([]);

  try {
    const tendero = await prisma.tendero.findFirst({
      where: { telefono: String(telefono) }
    });

    if (!tendero) return res.json([]);

    const pedidos = await prisma.pedido.findMany({
      where: { tenderoId: tendero.id },
      select: { distribuidoraId: true },
      distinct: ['distribuidoraId']
    });

    const distIds = pedidos.map(p => p.distribuidoraId);
    if (distIds.length === 0) return res.json([]);

    const tiendas = await prisma.distribuidora.findMany({
      where: { id: { in: distIds } },
      include: {
        _count: { select: { productos: true } }
      }
    });

    const frecuentes = tiendas.map(t => ({
      id: t.id,
      nombre: t.nombre,
      slug: t.slug,
      descripcion: t.descripcion,
      logoUrl: t.logoUrl,
      portadaUrl: t.portadaUrl,
      productosCount: t._count.productos,
      pedidoMinimo: t.pedidoMinimo,
      tiempoEntrega: t.tiempoEntrega,
      envioGratis: t.envioGratis
    }));

    return res.json(frecuentes);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener tiendas frecuentes' });
  }
});

app.get('/api/tiendas/directorio', cacheMiddleware(60), async (req, res) => {
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
      productosCount: t._count.productos,
      pedidoMinimo: t.pedidoMinimo,
      tiempoEntrega: t.tiempoEntrega,
      envioGratis: t.envioGratis
    }));

    return res.json(directorio);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener directorio de tiendas' });
  }
});

app.get('/api/tienda/:slug', cacheMiddleware(15), async (req, res) => {
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
    const distribuidora = await prisma.distribuidora.findUnique({
      where: { id: distribuidoraId }
    });
    
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

    const cleanPhone = telefonoCliente.replace(/\D/g, '');
    let tendero = await prisma.tendero.findFirst({
      where: { telefono: { contains: cleanPhone.slice(-10) } }
    });

    if (!tendero) {
      tendero = await prisma.tendero.create({
        data: {
          nombre_tienda: nombreCliente,
          telefono: telefonoCliente,
          direccion: direccionEnvio
        }
      });
    }

    // 1. Incrementar el contador de la distribuidora
    const distActualizada = await prisma.distribuidora.update({
      where: { id: distribuidoraId },
      data: { contadorPedidos: { increment: 1 } }
    });

    // 2. Generar el número secuencial limpio (Opción 3)
    // Rellenamos con ceros a la izquierda para que empiece en "0001"
    const codigoPedido = distActualizada.contadorPedidos.toString().padStart(4, '0');

    const pedidoData = {
      distribuidoraId,
      tenderoId: tendero.id,
      estado: 'en_preparacion',
      total,
      nombreCliente,
      telefonoCliente,
      direccionEnvio,
      latitud,
      longitud,
      codigo: codigoPedido,
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

    // Notificar al cliente
    if (telefonoCliente) {
      const msgCliente = `¡Hola ${nombreCliente}! Hemos recibido tu pedido #${pedido.codigo} por un total de $${total.toLocaleString()}. Te notificaremos cuando haya cambios.`;
      sendWhatsAppMessage(telefonoCliente, msgCliente);
    }

    // Notificar a la distribuidora (administrador)
    if (distribuidora && distribuidora.telefono) {
      const msgAdmin = `NUEVO PEDIDO #${pedido.codigo} 🛒\n\nCliente: ${nombreCliente}\nTeléfono: ${telefonoCliente}\nDirección: ${direccionEnvio}\nTotal: $${total.toLocaleString()}\n\nRevisa el panel de administrador para ver el detalle de los productos.`;
      sendWhatsAppMessage(distribuidora.telefono, msgAdmin);
    }

    return res.status(201).json(pedido);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// ----------------------------------------------------
// TORRE DE CONTROL (Administrador)
// ----------------------------------------------------
app.get('/api/admin/torre-control', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'administrador' && req.user.rol !== 'distribuidor') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const distribuidora = await getMyDistribuidora(req.user.id);
  
  try {
    const conductores = await prisma.usuario.findMany({
      where: { 
        distribuidoraTrabajoId: distribuidora.id, 
        rol: 'conductor',
        entregas: {
          some: { estado: 'en_ruta' }
        }
      },
      select: {
        id: true,
        nombre: true,
        latitud: true,
        longitud: true,
        entregas: {
          where: { estado: 'en_ruta' },
          orderBy: { orden: 'asc' },
          include: { 
            pedido: { include: { detalles: { include: { producto: true } } } } 
          }
        }
      }
    });

    // Enriquecer con rutaGeometry (para que el Admin vea las calles, igual que el conductor)
    let startLat = distribuidora.latitud || 2.9273;
    let startLng = distribuidora.longitud || -75.28189;

    // Caché en memoria para evitar quemar la cuota de ORS
    if (!global.routeGeometryCache) {
      global.routeGeometryCache = new Map();
    }

    for (const c of conductores) {
      c.rutaGeometry = null;
      if (c.entregas && c.entregas.length > 0 && process.env.ORS_API_KEY) {
        const orderedCoords = [];
        orderedCoords.push([startLng, startLat]);
        c.entregas.forEach(e => {
          if (e.pedido.latitud && e.pedido.longitud) {
            orderedCoords.push([e.pedido.longitud, e.pedido.latitud]);
          }
        });
        orderedCoords.push([startLng, startLat]);

        if (orderedCoords.length > 1) {
          const routeHash = c.id + '_' + orderedCoords.map(c => `${c[0]},${c[1]}`).join('|');
          
          if (global.routeGeometryCache.has(routeHash)) {
            c.rutaGeometry = global.routeGeometryCache.get(routeHash);
          } else {
            try {
              const dirRes = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
                method: 'POST',
                headers: {
                  'Authorization': process.env.ORS_API_KEY,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ coordinates: orderedCoords, language: "es" })
              });
              
              if (dirRes.ok) {
                const dirData = await dirRes.json();
                if (dirData.features && dirData.features.length > 0) {
                  c.rutaGeometry = dirData.features[0].geometry;
                  global.routeGeometryCache.set(routeHash, c.rutaGeometry);
                }
              } else {
                console.warn("ORS API límite alcanzado o error:", await dirRes.text());
              }
            } catch (err) {
              console.error("Error obteniendo ruta para conductor " + c.id, err);
            }
          }
        }
      }
    }

    return res.json(conductores);
  } catch (error) {
    return res.status(500).json({ error: 'Error obteniendo datos' });
  }
});

app.post('/api/admin/torre-control/optimizar/:conductorId', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'administrador' && req.user.rol !== 'distribuidor') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const distribuidora = await getMyDistribuidora(req.user.id);
  const conductorId = parseInt(req.params.conductorId);

  try {
    const entregas = await prisma.entrega.findMany({
      where: { conductorId, estado: 'en_ruta' },
      include: { pedido: true }
    });

    const validEntregas = entregas.filter(e => e.pedido.latitud && e.pedido.longitud);
    if (!process.env.ORS_API_KEY || validEntregas.length === 0) {
      return res.status(400).json({ error: 'No se puede optimizar (Faltan coordenadas o API Key)' });
    }

    let startLat = distribuidora.latitud || 2.9273;
    let startLng = distribuidora.longitud || -75.28189;

    const payload = {
      jobs: validEntregas.map((e, index) => ({
        id: index + 1,
        location: [e.pedido.longitud, e.pedido.latitud]
      })),
      vehicles: [
        {
          id: 1,
          profile: "driving-car",
          start: [startLng, startLat],
          end: [startLng, startLat]
        }
      ]
    };

    const optRes = await fetch("https://api.openrouteservice.org/optimization", {
      method: 'POST',
      headers: {
        'Authorization': process.env.ORS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const optData = await optRes.json();

    if (optData.code === 0 && optData.routes && optData.routes.length > 0) {
      const updates = [];
      let currentOrder = 1;

      optData.routes[0].steps.forEach(step => {
        if (step.type === 'job') {
          const originalIndex = step.job - 1;
          const entregaId = validEntregas[originalIndex].id;
          updates.push(
            prisma.entrega.update({ where: { id: entregaId }, data: { orden: currentOrder++ } })
          );
        }
      });

      await prisma.$transaction(updates);
      return res.json({ success: true, message: 'Ruta optimizada' });
    } else {
      return res.status(500).json({ error: 'Error del motor ORS' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/admin/torre-control/invertir/:conductorId', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'administrador' && req.user.rol !== 'distribuidor') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const conductorId = parseInt(req.params.conductorId);
  try {
    const entregas = await prisma.entrega.findMany({
      where: { conductorId, estado: 'en_ruta' },
      orderBy: { orden: 'asc' }
    });
    
    // Invertir arreglo y asignar nuevos órdenes secuenciales
    const reversed = [...entregas].reverse();
    const updates = reversed.map((e, index) => 
      prisma.entrega.update({ where: { id: e.id }, data: { orden: index + 1 } })
    );
    
    await prisma.$transaction(updates);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Error al invertir ruta' });
  }
});

app.post('/api/admin/torre-control/ordenar-manual/:conductorId', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'administrador' && req.user.rol !== 'distribuidor') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const { ordenamiento } = req.body; // Array de { id: idEntrega, orden: 1,2,3 }
  try {
    const updates = ordenamiento.map(o => 
      prisma.entrega.update({ where: { id: o.id }, data: { orden: o.orden } })
    );
    await prisma.$transaction(updates);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Error guardando orden manual' });
  }
});

// ==========================================
// RUTAS DE TICKETS DE SOPORTE
// ==========================================

// 1. Obtener todos los tickets
app.get('/api/tickets', authMiddleware, cacheMiddleware(5), async (req, res) => {
  const user = await prisma.usuario.findUnique({ where: { id: req.user.id } });
  
  if (user.rol !== 'administrador' && user.rol !== 'distribuidor' && !user.puedeAtenderTickets) {
    return res.status(403).json({ error: 'No tienes permiso para acceder a los tickets' });
  }

  const tickets = await prisma.ticketSoporte.findMany({
    include: {
      pedido: { select: { codigo: true, total: true } },
      tendero: { select: { nombre_tienda: true, telefono: true } },
      atendidoPor: { select: { id: true, nombre: true } }
    },
    orderBy: { fecha: 'desc' }
  });
  
  res.json(tickets);
});

// 1.5 Crear Pedido de Reposición (Costo $0)
app.post('/api/tickets/:id/reposicion', authMiddleware, async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const { productos } = req.body; // Array de { id, cantidad }
  const userId = req.user.id;
  
  const user = await prisma.usuario.findUnique({ where: { id: userId } });
  if (user.rol !== 'administrador' && user.rol !== 'distribuidor' && !user.puedeAtenderTickets) {
    return res.status(403).json({ error: 'No tienes permiso para atender tickets' });
  }

  const ticket = await prisma.ticketSoporte.findUnique({ 
    where: { id: ticketId },
    include: { pedido: true } 
  });
  if (!ticket || !ticket.pedido) return res.status(404).json({ error: 'Ticket o pedido no encontrado' });

  // Crear el código del nuevo pedido
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '').slice(2);
  const totalPedidosHoy = await prisma.pedido.count({
    where: { fecha: { gte: new Date(today.setHours(0,0,0,0)) } }
  });
  const codigo = `REP-${dateStr}-${(totalPedidosHoy + 1).toString().padStart(3, '0')}`;

  let detallesCrear = [];
  
  // Descontar inventario y preparar detalles
  for (const prod of productos) {
    if (prod.cantidad <= 0) continue;
    const p = await prisma.producto.findUnique({ where: { id: prod.id } });
    if (!p) continue;
    if (p.stock < prod.cantidad) return res.status(400).json({ error: `Stock insuficiente para ${p.nombre}` });
    
    await prisma.producto.update({
      where: { id: p.id },
      data: { stock: p.stock - prod.cantidad }
    });
    
    detallesCrear.push({
      productoId: p.id,
      cantidad: prod.cantidad,
      subtotal: 0 // Es reposición, así que el costo al cliente es $0
    });
  }

  if (detallesCrear.length === 0) {
    return res.status(400).json({ error: 'No se enviaron productos válidos' });
  }

  const nuevoPedido = await prisma.pedido.create({
    data: {
      codigo,
      total: 0,
      estado: 'pendiente',
      metodoPago: 'reposicion',
      tenderoId: ticket.tenderoId,
      distribuidoraId: ticket.pedido.distribuidoraId,
      detalles: { create: detallesCrear }
    }
  });

  const nuevasNotas = (ticket.notasAdmin ? ticket.notasAdmin + '\n' : '') + `[REPOSICIÓN LOGÍSTICA]: Se creó el sub-pedido #${codigo} con costo $0 para enviar al cliente.`;
  await prisma.ticketSoporte.update({
    where: { id: ticketId },
    data: { notasAdmin: nuevasNotas }
  });

  res.json({ success: true, pedido: nuevoPedido });
});

// 2. Abrir / Bloquear un ticket
app.put('/api/tickets/:id/abrir', authMiddleware, async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const userId = req.user.id;
  
  const user = await prisma.usuario.findUnique({ where: { id: userId } });
  if (user.rol !== 'administrador' && user.rol !== 'distribuidor' && !user.puedeAtenderTickets) {
    return res.status(403).json({ error: 'No tienes permiso para atender tickets' });
  }

  const ticket = await prisma.ticketSoporte.findUnique({ where: { id: ticketId } });
  if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

  if (ticket.atendidoPorId && ticket.atendidoPorId !== userId) {
    return res.status(409).json({ error: 'Este ticket ya está siendo atendido por otro asesor' });
  }

  const updatedTicket = await prisma.ticketSoporte.update({
    where: { id: ticketId },
    data: { atendidoPorId: userId, estado: 'en_progreso' },
    include: { 
      atendidoPor: { select: { id: true, nombre: true } },
      pedido: { select: { codigo: true, total: true } },
      tendero: { select: { nombre_tienda: true, telefono: true } }
    }
  });

  res.json(updatedTicket);
});

// 3. Marcar como resuelto
app.put('/api/tickets/:id/estado', authMiddleware, async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const { estado, notasAdmin, respuestaCliente, liberar } = req.body;
  const userId = req.user.id;
  
  const user = await prisma.usuario.findUnique({ where: { id: userId } });
  
  const ticket = await prisma.ticketSoporte.findUnique({ 
    where: { id: ticketId },
    include: { tendero: true }
  });
  
  if (user.rol !== 'administrador' && user.rol !== 'distribuidor' && ticket.atendidoPorId !== userId) {
    return res.status(403).json({ error: 'Solo el asesor a cargo o un administrador puede modificar este ticket' });
  }

  let updateData = { estado, notasAdmin, respuestaCliente };
  
  if (liberar) {
    updateData.atendidoPorId = null;
    updateData.estado = 'abierto';
  }

  const updatedTicket = await prisma.ticketSoporte.update({
    where: { id: ticketId },
    data: updateData
  });

  if (estado === 'resuelto' && ticket.estado !== 'resuelto' && !liberar) {
    const { notifyTicketResolved } = require('./services/whatsappService');
    if (notifyTicketResolved && ticket.tendero?.telefono) {
      await notifyTicketResolved(ticket.id, ticket.tendero.telefono, respuestaCliente || notasAdmin || "Caso cerrado exitosamente.");
    }
  }

  res.json(updatedTicket);
});

// 4. Asignar permiso de tickets a un usuario (Solo Admin)
app.put('/api/usuarios/:id/permisos-tickets', authMiddleware, async (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const { puedeAtenderTickets } = req.body;
  
  const adminUser = await prisma.usuario.findUnique({ where: { id: req.user.id } });
  if (adminUser.rol !== 'administrador' && adminUser.rol !== 'distribuidor') {
    return res.status(403).json({ error: 'Solo un administrador puede asignar permisos' });
  }

  const updated = await prisma.usuario.update({
    where: { id: targetUserId },
    data: { puedeAtenderTickets }
  });

  res.json({ success: true, puedeAtenderTickets: updated.puedeAtenderTickets });
});


// ==========================================
// WEBHOOK DE WHATSAPP (Green API)
// ==========================================
app.post('/api/webhook/whatsapp', (req, res) => {
  // 1. Responder INMEDIATAMENTE con 200 OK
  // Esto libera a Green API y evita que el webhook se trabe o repita el envío.
  res.status(200).send('OK');

  // 2. Procesar en el "fondo" (sin await)
  const webhookBody = req.body;
  if (webhookBody && webhookBody.typeWebhook === 'incomingMessageReceived') {
    handleIncomingMessage(webhookBody, prisma)
      .catch(err => console.error("Error procesando mensaje de WhatsApp en background:", err));
  }
});

const PORT = process.env.PORT || 3001;
const Sentry = require("@sentry/node");
Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  console.error('Express Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message, stack: err.stack });
});

app.listen(PORT, () => {
  console.log(`ProvEEndo backend running on http://localhost:${PORT}`);
});
