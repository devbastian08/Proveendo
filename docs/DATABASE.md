# Base de Datos

## Tabla Usuarios
- id
- nombre
- correo
- contraseña
- rol

---

## Tabla Tenderos
- id
- nombre_tienda
- dirección
- teléfono

---

## Tabla Productos
- id
- nombre
- precio
- stock
- categoría

---

## Tabla Pedidos
- id
- tendero_id
- estado
- total
- fecha

---

## Tabla Detalle_Pedido
- id
- pedido_id
- producto_id
- cantidad
- subtotal

---

## Tabla Entregas
- id
- pedido_id
- conductor_id
- estado