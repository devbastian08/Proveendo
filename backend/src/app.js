const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// MVP context (docs/MVP_FEATURES.md + docs/DATABASE.md):
// Roles: administrador, conductor, tendero
// Estados de pedido: en_preparacion, preparado, en_ruta, entregado

const ORDER_STATUSES = ['en_preparacion', 'preparado', 'en_ruta', 'entregado'];

const db = {
  users: [
    { id: 1, nombre: 'Admin Demo', correo: 'admin@proveendo.com', rol: 'administrador' },
    { id: 2, nombre: 'Conductor Demo', correo: 'driver@proveendo.com', rol: 'conductor' },
    { id: 3, nombre: 'Tendero Demo', correo: 'shop@proveendo.com', rol: 'tendero' }
  ],
  tenderos: [{ id: 1, nombre_tienda: 'Tienda Central', direccion: 'Calle 1 # 2-3', telefono: '3001234567' }],
  productos: [
    { id: 1, nombre: 'Arroz 1kg', precio: 4500, stock: 120, categoria: 'Granos' },
    { id: 2, nombre: 'Aceite 900ml', precio: 9800, stock: 60, categoria: 'Despensa' }
  ],
  pedidos: [],
  detallePedido: [],
  entregas: []
};

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'ProvEEndo API', mvp: true });
});

app.get('/api/productos', (_req, res) => {
  res.json(db.productos);
});

app.post('/api/productos', (req, res) => {
  const { nombre, precio, stock, categoria } = req.body;
  if (!nombre || typeof precio !== 'number' || typeof stock !== 'number') {
    return res.status(400).json({ error: 'nombre, precio y stock son obligatorios' });
  }

  const producto = {
    id: db.productos.length + 1,
    nombre,
    precio,
    stock,
    categoria: categoria || 'General'
  };

  db.productos.push(producto);
  return res.status(201).json(producto);
});

app.post('/api/pedidos', (req, res) => {
  const { tendero_id, items } = req.body;

  if (!tendero_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'tendero_id e items son obligatorios' });
  }

  const tendero = db.tenderos.find((t) => t.id === tendero_id);
  if (!tendero) {
    return res.status(404).json({ error: 'Tendero no encontrado' });
  }

  const pedidoId = db.pedidos.length + 1;
  let total = 0;
  const detalles = [];

  for (const item of items) {
    const producto = db.productos.find((p) => p.id === item.producto_id);
    if (!producto) {
      return res.status(404).json({ error: `Producto ${item.producto_id} no encontrado` });
    }

    const cantidad = Number(item.cantidad || 0);
    if (cantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a cero' });
    }

    const subtotal = cantidad * producto.precio;
    total += subtotal;

    const detalle = {
      id: db.detallePedido.length + detalles.length + 1,
      pedido_id: pedidoId,
      producto_id: producto.id,
      cantidad,
      subtotal
    };

    detalles.push(detalle);
  }

  const pedido = {
    id: pedidoId,
    tendero_id,
    estado: 'en_preparacion',
    total,
    fecha: new Date().toISOString()
  };

  db.pedidos.push(pedido);
  db.detallePedido.push(...detalles);
  db.entregas.push({ id: db.entregas.length + 1, pedido_id: pedidoId, conductor_id: null, estado: 'en_preparacion' });

  return res.status(201).json({ pedido, detalles });
});

app.patch('/api/pedidos/:id/estado', (req, res) => {
  const pedidoId = Number(req.params.id);
  const { estado } = req.body;

  if (!ORDER_STATUSES.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Usa: ${ORDER_STATUSES.join(', ')}` });
  }

  const pedido = db.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }

  pedido.estado = estado;
  const entrega = db.entregas.find((e) => e.pedido_id === pedidoId);
  if (entrega) entrega.estado = estado;

  return res.json(pedido);
});

app.get('/api/tendero/:id/catalogo', (req, res) => {
  const tenderoId = Number(req.params.id);
  const tendero = db.tenderos.find((t) => t.id === tenderoId);

  if (!tendero) {
    return res.status(404).json({ error: 'Tendero no encontrado' });
  }

  return res.json({
    tendero,
    productos: db.productos,
    whatsapp_link: `https://wa.me/573001234567?text=Hola%20quiero%20hacer%20un%20pedido%20de%20la%20tienda%20${encodeURIComponent(
      tendero.nombre_tienda
    )}`
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ProvEEndo backend running on http://localhost:${PORT}`);
});
