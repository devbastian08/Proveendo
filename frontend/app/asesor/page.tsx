'use client';

import { useState, useEffect } from 'react';
import { Loader2, ShoppingCart, Plus, Minus, Store, Phone, MapPin, CheckCircle, Trash2 } from 'lucide-react';

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  categoria: string;
  imagenUrl: string | null;
}

interface Distribuidora {
  id: number;
  nombre: string;
}

interface CartItem extends Producto {
  cantidad: number;
}

export default function AsesorPage() {
  const [distribuidora, setDistribuidora] = useState<Distribuidora | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Formulario de checkout (Datos del cliente que dicta)
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [direccionEnvio, setDireccionEnvio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCatalogo = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:3001/api/asesor/catalogo`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'No se pudo cargar el catálogo');
        }

        setDistribuidora(data.distribuidora);
        setProductos(data.productos);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogo();
  }, []);

  const addToCart = (prod: Producto) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === prod.id);
      if (existing) {
        if (existing.cantidad >= prod.stock) return prev;
        return prev.map(item => item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { ...prod, cantidad: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQ = item.cantidad + delta;
          if (newQ > 0 && newQ <= item.stock) {
            return { ...item, cantidad: newQ };
          }
        }
        return item;
      });
    });
  };

  const totalCart = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const itemsCount = cart.reduce((acc, item) => acc + item.cantidad, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !distribuidora) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('http://localhost:3001/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distribuidoraId: distribuidora.id,
          nombreCliente,
          telefonoCliente,
          direccionEnvio,
          items: cart.map(item => ({ productoId: item.id, cantidad: item.cantidad }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar el pedido');

      alert(`✅ ¡Pedido #${data.id} creado con éxito para ${nombreCliente}!`);
      
      // Limpiar carrito para el siguiente cliente
      setCart([]);
      setNombreCliente('');
      setTelefonoCliente('');
      setDireccionEnvio('');
      setIsCartOpen(false);
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-[#4a6c6f]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tomar Pedido</h1>
          <p className="text-slate-500 text-sm">Selecciona los productos y registra el pedido de tu cliente.</p>
        </div>
        
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative p-3 bg-white text-slate-600 hover:text-[#4a6c6f] shadow-sm border border-slate-200 rounded-full transition-all hover:shadow-md"
        >
          <ShoppingCart className="w-6 h-6" />
          {itemsCount > 0 && (
            <span className="absolute top-0 right-0 w-6 h-6 bg-[#d62246] text-white text-xs font-bold rounded-full flex items-center justify-center transform translate-x-2 -translate-y-2 shadow-sm border-2 border-white">
              {itemsCount}
            </span>
          )}
        </button>
      </div>

      {/* Catálogo */}
      {productos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 font-medium">No hay productos con stock disponible en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {productos.map(prod => {
            const inCart = cart.find(c => c.id === prod.id);
            return (
              <div key={prod.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md hover:border-slate-300 transition-all">
                <div className="aspect-square bg-slate-50 relative overflow-hidden">
                  {prod.imagenUrl ? (
                    <img src={prod.imagenUrl} alt={prod.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Store className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4a6c6f] mb-1">{prod.categoria || 'General'}</p>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight mb-2 line-clamp-2">{prod.nombre}</h3>
                  <div className="mt-auto">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 sm:gap-0 mb-3">
                      <span className="font-black text-[#4a6c6f] text-base sm:text-lg">${prod.precio.toLocaleString()}</span>
                      <span className="text-[10px] sm:text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full w-fit">Disp: {prod.stock}</span>
                    </div>
                    
                    {inCart ? (
                      <div className="flex items-center justify-between bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <button onClick={() => updateQuantity(prod.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:text-slate-900 active:scale-95 transition-transform">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-bold text-slate-900">{inCart.cantidad}</span>
                        <button onClick={() => updateQuantity(prod.id, 1)} disabled={inCart.cantidad >= prod.stock} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:text-slate-900 disabled:opacity-50 active:scale-95 transition-transform">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCart(prod)}
                        disabled={prod.stock === 0}
                        className="w-full py-2 bg-[#4a6c6f] hover:bg-[#3a5658] disabled:opacity-50 disabled:bg-slate-300 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 active:scale-95 text-sm"
                      >
                        <Plus className="w-4 h-4" /> 
                        {prod.stock === 0 ? 'Agotado' : 'Añadir'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Side panel / Bottom sheet del carrito */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex sm:justify-end flex-col sm:flex-row">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
          
          <div className="relative w-full sm:w-[450px] bg-white h-[90vh] sm:h-full mt-auto sm:mt-0 rounded-t-3xl sm:rounded-none flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            {/* Grabber para móvil */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden"></div>
            
            <div className="px-6 pb-4 sm:pt-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-[#4a6c6f]" />
                Resumen del Pedido
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                    <ShoppingCart className="w-10 h-10 opacity-50" />
                  </div>
                  <p className="font-medium">El pedido está vacío</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex gap-4 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      {item.imagenUrl ? (
                         <img src={item.imagenUrl} alt={item.nombre} className="w-20 h-20 object-cover rounded-xl bg-slate-50" />
                      ) : (
                         <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300"><Store className="w-8 h-8" /></div>
                      )}
                      
                      <div className="flex-1 flex flex-col justify-center">
                        <h4 className="font-bold text-slate-900 text-sm leading-tight mb-1">{item.nombre}</h4>
                        <p className="font-black text-[#4a6c6f] text-sm">${item.precio.toLocaleString()}</p>
                        
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-lg border border-slate-100">
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-500 hover:text-slate-900"><Minus className="w-3 h-3" /></button>
                            <span className="font-bold text-sm min-w-[1.5rem] text-center">{item.cantidad}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-500 hover:text-slate-900"><Plus className="w-3 h-3" /></button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-6 mt-6 border-t border-slate-200 border-dashed">
                    <div className="flex justify-between items-end mb-6">
                      <span className="text-slate-500 font-medium">Total a Pagar</span>
                      <span className="text-3xl font-black text-[#4a6c6f]">${totalCart.toLocaleString()}</span>
                    </div>

                    <form onSubmit={handleCheckout} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-[#4a6c6f]" /> Datos del Cliente
                      </h3>
                      <div>
                        <input required type="text" placeholder="Nombre de la Tienda / Cliente" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none text-sm font-medium" />
                      </div>
                      <div>
                        <input required type="tel" placeholder="Teléfono" value={telefonoCliente} onChange={e => setTelefonoCliente(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none text-sm font-medium" />
                      </div>
                      <div>
                        <input required type="text" placeholder="Dirección exacta" value={direccionEnvio} onChange={e => setDireccionEnvio(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none text-sm font-medium" />
                      </div>
                      
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-4 mt-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                          <>Confirmar y Enviar a Bodega <ShoppingCart className="w-4 h-4" /></>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
