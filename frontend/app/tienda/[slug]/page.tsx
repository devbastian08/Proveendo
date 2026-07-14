'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ShoppingCart, Plus, Minus, Store, Phone, MapPin, CheckCircle, Trash2, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

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
  slug: string;
  telefono: string;
}

interface CartItem extends Producto {
  cantidad: number;
}

export default function TiendaPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [distribuidora, setDistribuidora] = useState<Distribuidora | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Formulario de checkout
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [direccionEnvio, setDireccionEnvio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/tienda/${slug}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'No se encontró la tienda');
        }

        setDistribuidora(data.distribuidora);
        setProductos(data.productos);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [slug]);

  const addToCart = (prod: Producto) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === prod.id);
      if (existing) {
        if (existing.cantidad >= prod.stock) return prev; // No exceder stock
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
      // 1. Crear el pedido en la base de datos
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

      // 2. Generar el mensaje de WhatsApp
      const numero = distribuidora.telefono.replace(/[^0-9]/g, '');
      let mensaje = `👋 ¡Hola *${distribuidora.nombre}*!\n\n`;
      mensaje += `Acabo de realizar el pedido *#${data.id.toString().padStart(4, '0')}* desde la plataforma.\n\n`;
      mensaje += `*Mis datos:*\n👤 Nombre: ${nombreCliente}\n📍 Dirección: ${direccionEnvio}\n📞 Teléfono: ${telefonoCliente}\n\n`;
      mensaje += `*Mi pedido:*\n`;
      
      cart.forEach(item => {
        mensaje += `- ${item.cantidad}x ${item.nombre} ($${(item.precio * item.cantidad).toLocaleString()})\n`;
      });
      
      mensaje += `\n*Total:* $${totalCart.toLocaleString()}\n\n`;
      mensaje += `¿Me confirmas si todo está bien para el envío?`;

      const whatsappUrl = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
      
      // Limpiar carrito y redirigir
      setCart([]);
      setIsCartOpen(false);
      window.open(whatsappUrl, '_blank');
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-[#4a6c6f]" />
      </div>
    );
  }

  if (error || !distribuidora) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Tienda no encontrada</h1>
          <p className="text-slate-500">{error || 'El enlace que ingresaste no es válido.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header Distribuidora */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/tiendas" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors hidden sm:block">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#e2e8ce] text-[#4a6c6f] rounded-full flex items-center justify-center font-bold text-xl">
                {distribuidora.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-lg leading-tight">{distribuidora.nombre}</h1>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" /> Distribuidor Autorizado
                </p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ShoppingCart className="w-6 h-6" />
            {itemsCount > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-[#d62246] text-white text-xs font-bold rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1 shadow-sm">
                {itemsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Catálogo de Productos */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Catálogo de Productos</h2>
        
        {productos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-500">No hay productos disponibles por el momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productos.map(prod => {
              const inCart = cart.find(c => c.id === prod.id);
              return (
                <div key={prod.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-slate-50 relative overflow-hidden">
                    {prod.imagenUrl ? (
                      <img src={prod.imagenUrl} alt={prod.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Store className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-xs font-medium text-[#4a6c6f] mb-1">{prod.categoria || 'General'}</p>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight mb-2 line-clamp-2">{prod.nombre}</h3>
                    <div className="mt-auto">
                      <div className="flex items-end justify-between mb-4">
                        <span className="font-black text-slate-900 text-xl">${prod.precio.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 font-medium">{prod.stock} disp.</span>
                      </div>
                      
                      {inCart ? (
                        <div className="flex items-center justify-between bg-slate-50 p-1 rounded-xl border border-slate-200">
                          <button onClick={() => updateQuantity(prod.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:text-slate-900">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-slate-900">{inCart.cantidad}</span>
                          <button onClick={() => updateQuantity(prod.id, 1)} disabled={inCart.cantidad >= prod.stock} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:text-slate-900 disabled:opacity-50">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(prod)}
                          disabled={prod.stock === 0}
                          className="w-full py-2.5 bg-[#4a6c6f] hover:bg-[#3a5658] disabled:opacity-50 disabled:bg-slate-300 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> 
                          {prod.stock === 0 ? 'Agotado' : 'Agregar'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal del Carrito (Side panel) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          
          <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-[#4a6c6f]" />
                Tu Pedido
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                  <p>Tu carrito está vacío</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      {item.imagenUrl ? (
                         <img src={item.imagenUrl} alt={item.nombre} className="w-16 h-16 object-cover rounded-lg bg-white" />
                      ) : (
                         <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-slate-300"><Store className="w-6 h-6" /></div>
                      )}
                      
                      <div className="flex-1 flex flex-col">
                        <h4 className="font-bold text-slate-900 text-sm leading-tight mb-1">{item.nombre}</h4>
                        <p className="font-medium text-[#4a6c6f] text-sm">${item.precio.toLocaleString()}</p>
                        
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button onClick={() => updateQuantity(item.id, -1)} className="text-slate-500 hover:text-slate-900"><Minus className="w-4 h-4" /></button>
                            <span className="font-bold text-sm">{item.cantidad}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="text-slate-500 hover:text-slate-900"><Plus className="w-4 h-4" /></button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-slate-500 font-medium">Total Estimado</span>
                      <span className="text-2xl font-black text-slate-900">${totalCart.toLocaleString()}</span>
                    </div>

                    <form onSubmit={handleCheckout} className="space-y-4">
                      <h3 className="font-bold text-slate-900">Tus Datos de Envío</h3>
                      <div>
                        <div className="relative">
                          <Store className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                          <input required type="text" placeholder="Nombre de tu tienda / Tu nombre" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none" />
                        </div>
                      </div>
                      <div>
                        <div className="relative">
                          <Phone className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                          <input required type="tel" placeholder="Teléfono de contacto" value={telefonoCliente} onChange={e => setTelefonoCliente(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none" />
                        </div>
                      </div>
                      <div>
                        <div className="relative">
                          <MapPin className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                          <input required type="text" placeholder="Dirección de entrega" value={direccionEnvio} onChange={e => setDireccionEnvio(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none" />
                        </div>
                      </div>
                      
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-4 mt-4 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
                      >
                        {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                          <>
                            Pedir por WhatsApp
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                          </>
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
