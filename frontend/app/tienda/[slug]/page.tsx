'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ShoppingCart, Plus, Minus, Store, Phone, MapPin, CheckCircle, Trash2, ArrowLeft, AlertCircle, LayoutGrid, List, Search, X, PackageX } from 'lucide-react';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';

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
  pedidoMinimo?: number;
  portadaUrl?: string | null;
  logoUrl?: string | null;
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

  const { cart, isCartOpen, addToCart, removeFromCart, updateQuantity, clearCart, setIsCartOpen, totalCart, itemsCount, checkoutForm, setCheckoutForm } = useCartStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccessId, setOrderSuccessId] = useState<string | null>(null);

  // GPS local state (No guardado en localStorage para obligar a capturarlo siempre)
  const [gpsLocation, setGpsLocation] = useState({
    latitud: null as number | null,
    longitud: null as number | null
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<{title: string, message: string, isError: boolean} | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}`}/api/tienda/${slug}`);
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

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !distribuidora) return;

    const minimo = distribuidora.pedidoMinimo || 0;
    if (totalCart() < minimo) {
      setAlertModal({
        title: 'Pedido mínimo no alcanzado',
        message: `El pedido mínimo es de $${minimo.toLocaleString()}. Te faltan $${(minimo - totalCart()).toLocaleString()} para poder realizar el pedido.`,
        isError: true
      });
      return;
    }

    if (!gpsLocation.latitud || !gpsLocation.longitud) {
      setAlertModal({
        title: 'Ubicación Requerida',
        message: "Para garantizar que tu pedido llegue rápido y sin contratiempos a tu negocio, por favor toca el botón '📍 Compartir ubicación exacta' antes de enviar el pedido. Esto ayuda al conductor a encontrarte fácilmente.",
        isError: false
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Crear el pedido en la base de datos
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distribuidoraId: distribuidora.id,
          nombreCliente: checkoutForm.nombreCliente,
          telefonoCliente: checkoutForm.telefonoCliente,
          direccionEnvio: checkoutForm.direccionEnvio,
          latitud: gpsLocation.latitud,
          longitud: gpsLocation.longitud,
          items: cart.map(item => ({ productoId: item.id, cantidad: item.cantidad }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar el pedido');

      // Limpiar carrito e informar éxito
      clearCart();
      setIsCartOpen(false);
      setOrderSuccessId(data.id.toString().padStart(4, '0'));
      
    } catch (err: any) {
      setAlertModal({ title: 'Error al procesar', message: err.message, isError: true });
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
      {/* Portada de la Tienda */}
      {distribuidora.portadaUrl && (
        <div className="w-full h-48 sm:h-64 lg:h-80 relative overflow-hidden bg-slate-200">
          <img 
            src={distribuidora.portadaUrl} 
            alt={`Portada de ${distribuidora.nombre}`} 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Header Distribuidora */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/tiendas" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors hidden sm:block">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              {distribuidora.logoUrl ? (
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-4 border-white shadow-md shrink-0 ${distribuidora.portadaUrl ? '-mt-10 relative z-10 sm:mt-0 sm:z-auto' : ''}`}>
                  <img src={distribuidora.logoUrl} alt="Logo" className="w-full h-full object-cover bg-white" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-[#e2e8ce] text-[#4a6c6f] rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                  {distribuidora.nombre.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="font-bold text-slate-900 text-lg sm:text-xl leading-tight">{distribuidora.nombre}</h1>
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
            {itemsCount() > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-[#d62246] text-white text-xs font-bold rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1 shadow-sm">
                {itemsCount()}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Helper para buscador sin tildes */}
      {(() => {
        const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        
        const filteredProductos = productos.filter(p => 
          (selectedCategory === 'Todas' || (p.categoria || 'General') === selectedCategory) && 
          normalizeStr(p.nombre).includes(normalizeStr(searchTerm))
        );

        return (
          <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Buscador y Filtros Rápidos */}
        <div className="sticky top-[80px] z-30 bg-slate-50 pt-4 pb-2 -mx-4 px-4 border-b border-slate-200 mb-6 shadow-[0_10px_10px_-10px_rgba(0,0,0,0.05)]">
          <div className="mb-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar productos rápidamente... (Ej: Aceite)" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#4a6c6f] focus:border-transparent outline-none shadow-sm text-slate-700 sm:text-lg transition-shadow"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors"
                  title="Borrar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex overflow-x-auto pb-2 gap-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {['Todas', ...Array.from(new Set(productos.map(p => p.categoria || 'General')))].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-5 py-2.5 rounded-full font-bold text-sm transition-all snap-start ${
                  selectedCategory === cat 
                    ? 'bg-[#4a6c6f] text-white shadow-md transform scale-105' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Catálogo de Productos</h2>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[#4a6c6f] text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
              title="Vista de Tarjetas"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#4a6c6f] text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
              title="Vista de Lista Rápida"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {productos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-500">No hay productos disponibles por el momento.</p>
          </div>
        ) : filteredProductos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <PackageX className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No encontramos productos</h3>
            <p className="text-slate-500 font-medium mb-6">No hay resultados para "{searchTerm}" en la categoría "{selectedCategory}".</p>
            <button onClick={() => { setSearchTerm(''); setSelectedCategory('Todas'); }} className="px-6 py-2.5 bg-[#4a6c6f] hover:bg-[#3a5658] text-white rounded-xl font-bold transition-colors">
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" : "flex flex-col gap-3"}>
            {filteredProductos.map(prod => {
              const inCart = cart.find(c => c.id === prod.id);
              
              if (viewMode === 'list') {
                return (
                  <div key={prod.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex items-center p-3 gap-4 hover:shadow-md transition-shadow">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 relative overflow-hidden rounded-lg shrink-0 border border-slate-100">
                      {prod.imagenUrl ? (
                        <img src={prod.imagenUrl} alt={prod.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Store className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#4a6c6f] mb-0.5 truncate">{prod.categoria || 'General'}</p>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">{prod.nombre}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-black text-slate-900">${prod.precio.toLocaleString()}</span>
                        {prod.stock > 0 && prod.stock <= 10 ? (
                          <span className="text-[10px] sm:text-xs font-bold text-red-500 animate-pulse bg-red-50 px-1.5 py-0.5 rounded-md">🔥 Quedan {prod.stock}</span>
                        ) : (
                          <span className="text-[10px] sm:text-xs text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">{prod.stock === 0 ? 'Agotado' : `${prod.stock} disp.`}</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 w-[100px] sm:w-[120px]">
                      {inCart ? (
                        <div className="flex items-center justify-between bg-slate-50 p-1 rounded-lg border border-slate-200">
                          <button onClick={() => updateQuantity(prod.id, -1)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-600 hover:text-slate-900">
                            <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <span className="font-bold text-sm text-slate-900">{inCart.cantidad}</span>
                          <button onClick={() => updateQuantity(prod.id, 1)} disabled={inCart.cantidad >= prod.stock} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-600 hover:text-slate-900 disabled:opacity-50">
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(prod)}
                          disabled={prod.stock === 0}
                          className="w-full py-2 bg-[#4a6c6f] hover:bg-[#3a5658] disabled:opacity-50 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 text-sm"
                        >
                          <Plus className="w-3.5 h-3.5" /> 
                          {prod.stock === 0 ? 'Agotado' : 'Agregar'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              // Vista de Grid Original
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
                    <p className="text-xs font-medium text-[#4a6c6f] mb-1 truncate">{prod.categoria || 'General'}</p>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight mb-2 line-clamp-2">{prod.nombre}</h3>
                    <div className="mt-auto">
                      <div className="flex items-end justify-between mb-4">
                        <span className="font-black text-slate-900 text-xl">${prod.precio.toLocaleString()}</span>
                        {prod.stock > 0 && prod.stock <= 10 ? (
                          <span className="text-xs font-bold text-red-500 animate-pulse flex items-center gap-1">
                            <span className="text-sm">🔥</span> ¡Solo quedan {prod.stock}!
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">{prod.stock === 0 ? 'Agotado' : `${prod.stock} disp.`}</span>
                        )}
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
      );
      })()}

      {/* Botón Flotante (Sticky Cart) */}
      {itemsCount() > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full max-w-md bg-[#25D366] hover:bg-[#128C7E] text-white py-4 px-6 rounded-2xl shadow-2xl flex items-center justify-between animate-[pulse_2s_ease-in-out_infinite] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/30 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                {itemsCount()}
              </div>
              <span className="font-bold text-lg">Pedir Ahora</span>
            </div>
            <span className="font-black text-xl shadow-sm">${totalCart().toLocaleString()}</span>
          </button>
        </div>
      )}

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
                    {/* Barra de Progreso de Pedido Mínimo */}
                    <div className="mb-6">
                      {totalCart() < (distribuidora?.pedidoMinimo || 50000) ? (
                        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-orange-700 font-bold text-sm">Faltan ${((distribuidora?.pedidoMinimo || 50000) - totalCart()).toLocaleString()} para el mínimo</span>
                            <span className="text-orange-700 font-black text-sm">{Math.round((totalCart() / (distribuidora?.pedidoMinimo || 50000)) * 100)}%</span>
                          </div>
                          <div className="w-full bg-orange-200 rounded-full h-2">
                            <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min((totalCart() / (distribuidora?.pedidoMinimo || 50000)) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-700">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                          <span className="font-bold text-sm">¡Has superado el pedido mínimo!</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mb-6">
                      <span className="text-slate-500 font-medium">Total Estimado</span>
                      <span className="text-2xl font-black text-slate-900">${totalCart().toLocaleString()}</span>
                    </div>

                    <form onSubmit={handleCheckout} className="space-y-4">
                      <h3 className="font-bold text-slate-900">Tus Datos de Envío</h3>
                      <div>
                        <div className="relative">
                          <Store className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                          <input required type="text" placeholder="Nombre de tu tienda / Tu nombre" value={checkoutForm.nombreCliente} onChange={e => setCheckoutForm({...checkoutForm, nombreCliente: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none" />
                        </div>
                      </div>
                      <div>
                        <div className="relative">
                          <Phone className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                          <input required type="tel" placeholder="Teléfono de contacto" value={checkoutForm.telefonoCliente} onChange={e => setCheckoutForm({...checkoutForm, telefonoCliente: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Dirección de Entrega</label>
                        <div className="flex gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!navigator.geolocation) {
                                setAlertModal({ title: 'Navegador no compatible', message: 'Tu navegador no soporta geolocalización. Intenta desde tu celular.', isError: true });
                                return;
                              }
                              setGpsLoading(true);
                              navigator.geolocation.getCurrentPosition(
                                (position) => {
                                  setGpsLocation({
                                    latitud: position.coords.latitude,
                                    longitud: position.coords.longitude
                                  });
                                  setGpsLoading(false);
                                },
                                (error) => {
                                  setAlertModal({ title: 'No pudimos obtener tu ubicación', message: 'Asegúrate de dar permisos de ubicación al navegador o intenta desde tu celular.', isError: true });
                                  setGpsLoading(false);
                                },
                                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                              );
                            }}
                            className={`flex-1 py-3 font-bold rounded-xl border flex items-center justify-center gap-2 transition-colors ${
                              gpsLocation.latitud 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-sm animate-pulse'
                            }`}
                          >
                            {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                            {gpsLocation.latitud ? '📍 Ubicación exacta confirmada' : '📍 Compartir ubicación exacta (Requerido para entrega rápida)'}
                          </button>
                        </div>
                        <textarea 
                          required 
                          value={checkoutForm.direccionEnvio}
                          onChange={e => setCheckoutForm({...checkoutForm, direccionEnvio: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4a6c6f] resize-none"
                          rows={2}
                          placeholder="Ej: Calle 8 # 14-22, Casa verde de dos pisos"
                        />
                      </div>
                      
                      <button 
                        type="submit" 
                        disabled={isSubmitting || totalCart() < (distribuidora?.pedidoMinimo || 50000)}
                        className="w-full py-4 mt-4 bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 disabled:bg-slate-300 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
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

      {/* Modal de Éxito */}
      {orderSuccessId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Pedido Exitoso!</h2>
            <p className="text-slate-500 mb-6 leading-relaxed">
              Tu orden <span className="font-bold text-slate-700">#{orderSuccessId}</span> ha sido enviada a la distribuidora. Te notificaremos por WhatsApp cualquier novedad.
            </p>
            <button
              onClick={() => setOrderSuccessId(null)}
              className="w-full py-4 bg-[#4a6c6f] hover:bg-[#3a5658] text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-[#4a6c6f]/30"
            >
              Seguir Comprando
            </button>
          </div>
        </div>
      )}

      {/* Modal de Alerta Custom */}
      {alertModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${alertModal.isError ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}`}>
                {alertModal.isError ? <AlertCircle className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1">{alertModal.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{alertModal.message}</p>
              </div>
            </div>
            <button
              onClick={() => setAlertModal(null)}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${alertModal.isError ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'}`}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
