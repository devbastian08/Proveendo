'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, PhoneCall, Navigation, PackageOpen, ListOrdered, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Entrega {
  id: number;
  pedidoId: number;
  estado: string;
  pedido: {
    nombreCliente: string | null;
    telefonoCliente: string | null;
    direccionEnvio: string | null;
    latitud: number | null;
    longitud: number | null;
    total: number;
    detalles: any[];
  };
}

export default function ConductorPage() {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'entregadas'>('pendientes');
  
  const router = useRouter();

  const fetchEntregas = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch('http://localhost:3001/api/conductor/entregas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setEntregas(Array.isArray(data) ? data : []);
      } else {
        if (res.status === 401 || res.status === 403) router.push('/login');
      }
    } catch (err) {
      console.error('Error fetching entregas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntregas();
  }, []);

  const marcarEntregado = async (pedidoId: number) => {
    setActionLoadingId(pedidoId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/conductor/entregas/${pedidoId}/entregado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        // Remover de la lista activa
        setEntregas(prev => prev.filter(e => e.pedidoId !== pedidoId));
      }
    } catch (err) {
      console.error('Error completando entrega:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-[#4a6c6f] mb-4" />
        <p className="font-medium text-lg">Cargando tu ruta...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Saludo */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
          <PackageOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900">Ruta de Hoy</h2>
          <p className="text-slate-500 font-medium">{entregas.length} entregas pendientes</p>
        </div>
      </div>

      {entregas.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">¡Todo al día!</h3>
          <p className="text-slate-500">No tienes más pedidos asignados para entregar en este momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entregas.map((entrega, index) => (
            <div key={entrega.id} className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-[#56cbf9]" />
              
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase">
                    Parada #{index + 1}
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    ${entrega.pedido.total.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">
                      {entrega.pedido.nombreCliente}
                    </h3>
                    <p className="text-slate-500 text-sm flex items-start gap-1 mt-1">
                      <MapPin className="w-4 h-4 text-[#4a6c6f] mt-0.5 shrink-0" />
                      {entrega.pedido.direccionEnvio}
                    </p>
                  </div>
                  
                  <div className="text-sm bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2 font-medium text-slate-600">
                    <ListOrdered className="w-4 h-4 text-[#4a6c6f]" />
                    {entrega.pedido.detalles.length} cajas/ítems para bajar
                  </div>
                </div>
              </div>

              {/* Botones de Acción (Llamar / Mapas) */}
              <div className="px-5 pb-5">
                <a 
                  href={`tel:${entrega.pedido.telefonoCliente}`}
                  className="flex w-full items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold transition-colors mb-3"
                >
                  <PhoneCall className="w-5 h-5" /> Llamar Cliente
                </a>
                
                <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-3 rounded-2xl">
                  <button 
                    onClick={() => {
                      // Construir enlace de ruta
                      const destLat = entrega.pedido.latitud;
                      const destLng = entrega.pedido.longitud;
                      
                      let mapsUrl = '';
                      if (destLat && destLng) {
                        // Si hay GPS, construimos la ruta
                        mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
                        
                        // Si no es la primera entrega, usamos la entrega anterior como origen para dibujar la ruta continua
                        if (index > 0) {
                          const prevLat = entregas[index - 1].pedido.latitud;
                          const prevLng = entregas[index - 1].pedido.longitud;
                          if (prevLat && prevLng) {
                            mapsUrl += `&origin=${prevLat},${prevLng}`;
                          }
                        }
                      } else {
                        // Búsqueda por texto fallback
                        mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entrega.pedido.direccionEnvio || '')}`;
                      }
                      
                      window.open(mapsUrl, '_blank');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 py-3 rounded-xl font-bold transition-colors"
                  >
                    <Navigation className="w-5 h-5" />
                    📍 Navegar Mapa
                  </button>
                  
                  <button 
                    onClick={() => marcarEntregado(entrega.pedidoId)}
                    disabled={actionLoadingId === entrega.pedidoId}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {actionLoadingId === entrega.pedidoId ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    Entregado
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
