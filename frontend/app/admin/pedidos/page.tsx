'use client';

import { useState, useEffect } from 'react';
import { Loader2, Truck, CheckCircle, Package, Clock } from 'lucide-react';

interface Pedido {
  id: number;
  tenderoId: number;
  estado: string;
  total: number;
  creadoEn: string;
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchPedidos = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/pedidos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setPedidos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  const changeStatus = async (id: number, nuevoEstado: string) => {
    setActionLoadingId(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/pedidos/${id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      if (res.ok) {
        fetchPedidos(); // Refrescar tras éxito
      }
    } catch (err) {
      console.error('Error changing status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper visual para los estados
  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'en_preparacion':
        return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700"><Clock className="w-3 h-3"/> En Preparación</span>;
      case 'preparado':
        return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700"><Package className="w-3 h-3"/> Preparado</span>;
      case 'en_ruta':
        return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700"><Truck className="w-3 h-3"/> En Ruta</span>;
      case 'entregado':
        return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3"/> Entregado</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{estado}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Pedidos</h1>
          <p className="text-slate-500">Supervisa y actualiza el estado logístico de las ventas.</p>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#4a6c6f] mb-4" />
            <p>Cargando tablero...</p>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-center">
            <div className="w-16 h-16 bg-[#e2e8ce] text-[#4a6c6f] rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Aún no hay pedidos</h3>
            <p className="max-w-sm">Los pedidos que realicen los tenderos o asesores aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-500">
                  <th className="px-6 py-4 font-medium">Pedido #</th>
                  <th className="px-6 py-4 font-medium">Fecha</th>
                  <th className="px-6 py-4 font-medium">Tendero (ID)</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidos.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">#{pedido.id.toString().padStart(4, '0')}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(pedido.creadoEn).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-6 py-4 text-slate-600">Tendero {pedido.tenderoId}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">${pedido.total.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {getStatusBadge(pedido.estado)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {actionLoadingId === pedido.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400 inline" />
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {pedido.estado === 'en_preparacion' && (
                            <button onClick={() => changeStatus(pedido.id, 'preparado')} className="text-xs px-3 py-1.5 bg-[#4a6c6f] text-white rounded-lg hover:bg-[#3a5658] transition-colors">
                              Marcar Preparado
                            </button>
                          )}
                          {pedido.estado === 'preparado' && (
                            <button onClick={() => changeStatus(pedido.id, 'en_ruta')} className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                              Despachar
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
