'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, PhoneCall, Navigation, PackageOpen, ListOrdered, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-80 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-medium">Cargando mapa interactivo...</div>
});
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
  const [enRuta, setEnRuta] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'alert' | 'confirm'; onConfirm?: () => void } | null>(null);
  const [rutaGeometry, setRutaGeometry] = useState<any>(null);
  const [origen, setOrigen] = useState<{lat: number, lng: number} | null>(null);

  const router = useRouter();

  const fetchEntregas = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/conductor/entregas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        if (Array.isArray(data)) {
          setEntregas(data);
        } else {
          setEntregas(data.entregas || []);
          setRutaGeometry(data.rutaGeometry || null);
          setOrigen(data.origen || null);
        }
      } else {
        if (res.status === 401 || res.status === 403) router.push('/login');
      }
    } catch (err) {
      console.error('Error fetching entregas:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEstado = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/conductor/estado`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEnRuta(data.enRuta);
      }
    } catch (err) {
      console.error('Error fetching estado:', err);
    }
  };

  useEffect(() => {
    fetchEntregas();
    fetchEstado();

    // Iniciar rastreo GPS en segundo plano
    if (!('geolocation' in navigator)) return;
    
    let lastPingTime = 0;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        // Ping al servidor cada 20 segundos
        if (now - lastPingTime > 20000) {
          lastPingTime = now;
          const token = localStorage.getItem('token');
          if (token) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/conductor/ubicacion`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                latitud: pos.coords.latitude, 
                longitud: pos.coords.longitude 
              })
            }).catch(err => console.error("Error enviando ping GPS", err));
          }
        }
      },
      (err) => console.warn('GPS ping falló:', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const iniciarRuta = async () => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Iniciar Ruta',
      message: '¿Seguro que deseas iniciar tu ruta? La bodega no podrá asignarte más pedidos hasta que finalices.',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/conductor/iniciar-ruta`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) setEnRuta(true);
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const finalizarRuta = async () => {
    if (entregas.length > 0) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Acción no permitida',
        message: 'Aún tienes entregas pendientes.'
      });
      return;
    }
    
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Finalizar Ruta',
      message: '¿Seguro que deseas finalizar tu ruta?',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/conductor/finalizar-ruta`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setEnRuta(false);
          } else {
            const data = await res.json();
            setModal({
              isOpen: true,
              type: 'alert',
              title: 'Error',
              message: data.error || 'Ocurrió un error al finalizar la ruta.'
            });
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const marcarEntregado = async (pedidoId: number) => {
    setActionLoadingId(pedidoId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}`}/api/conductor/entregas/${pedidoId}/entregado`, {
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
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-[#4a6c6f] mb-4" />
        <p className="font-medium text-lg">Cargando tu ruta...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Custom Modal */}
      {modal && modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-6 w-full max-w-sm animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{modal.title}</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">{modal.message}</p>
            <div className="flex gap-3">
              {modal.type === 'confirm' && (
                <button 
                  onClick={() => setModal(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={() => {
                  if (modal.onConfirm) modal.onConfirm();
                  if (modal.type === 'alert') setModal(null);
                }}
                className={`flex-1 py-3 text-white font-bold rounded-xl transition-colors ${modal.type === 'alert' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {modal.type === 'alert' ? 'Entendido' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saludo */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
            <PackageOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Ruta de Hoy</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{entregas.length} entregas pendientes</p>
          </div>
        </div>
        <div>
          {enRuta ? (
            <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              En Ruta
            </span>
          ) : (
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-full text-xs font-bold uppercase">
              En Bodega
            </span>
          )}
        </div>
      </div>

      {/* Mapa Visual Mapbox */}
      {entregas.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-3 relative">
           {/* Contenedor del Mapa Leaflet */}
           <div className="w-full h-80 rounded-2xl shadow-inner border border-slate-100 dark:border-slate-800 overflow-hidden relative z-0">
              <LeafletMap entregas={entregas} origen={origen} rutaGeometry={rutaGeometry} />
           </div>
        </div>
      )}

      {!enRuta && entregas.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center space-y-4">
          <h3 className="text-blue-900 font-bold text-lg">¿Listo para salir?</h3>
          <p className="text-blue-700 text-sm">
            Para poder entregar pedidos y obtener las rutas de navegación, debes iniciar tu ruta. 
            <strong> Recuerda que una vez iniciada, la bodega no te podrá asignar más pedidos.</strong>
          </p>
          <button 
            onClick={iniciarRuta}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm"
          >
            Iniciar Ruta
          </button>
        </div>
      )}

      {enRuta && entregas.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4">
          <h3 className="text-emerald-900 font-bold text-lg">¡Ruta Completada!</h3>
          <p className="text-emerald-700 text-sm">
            Has completado todas tus entregas asignadas.
          </p>
          <button 
            onClick={finalizarRuta}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm"
          >
            Finalizar Ruta
          </button>
        </div>
      )}

      {entregas.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">¡Todo al día!</h3>
          <p className="text-slate-500 dark:text-slate-400">No tienes más pedidos asignados para entregar en este momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entregas.map((entrega, index) => (
            <div key={entrega.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black shrink-0 text-lg">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
                      {entrega.pedido.nombreCliente}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs flex items-start gap-1 mt-1 pr-2">
                      <MapPin className="w-3 h-3 text-[#4a6c6f] mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{entrega.pedido.direccionEnvio}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                   <span className="text-sm font-black text-slate-900 dark:text-white block">
                     ${entrega.pedido.total.toLocaleString()}
                   </span>
                   <span className="text-xs text-slate-400 font-medium">{entrega.pedido.detalles.length} cajas</span>
                </div>
              </div>

              {/* Botones de Acción (Compactos) */}
              <div className="flex gap-2 mt-1">
                <a 
                  href={`tel:${entrega.pedido.telefonoCliente}`}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  <PhoneCall className="w-4 h-4" /> Llamar
                </a>
                
                {enRuta ? (
                  <button 
                    onClick={() => marcarEntregado(entrega.pedidoId)}
                    disabled={actionLoadingId === entrega.pedidoId}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {actionLoadingId === entrega.pedidoId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Entregado
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-amber-50 text-amber-700 text-xs font-bold rounded-xl border border-amber-200 px-2 text-center">
                    Inicia ruta para entregar
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
