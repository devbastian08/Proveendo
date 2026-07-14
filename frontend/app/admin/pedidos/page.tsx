'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Truck, CheckCircle, Package, Clock, Eye, X, User as UserIcon, Phone, MapPin, RefreshCw, ArrowLeft } from 'lucide-react';

interface DetallePedido {
  id: number;
  cantidad: number;
  subtotal: number;
  producto: {
    nombre: string;
    precio: number;
    imagenUrl: string | null;
  };
}

interface Usuario {
  id: number;
  nombre: string;
  rol: string;
}

interface Pedido {
  id: number;
  tenderoId: number | null;
  nombreCliente: string | null;
  telefonoCliente: string | null;
  direccionEnvio: string | null;
  estado: string;
  total: number;
  fecha: string;
  detalles: DetallePedido[];
  entrega: {
    conductor?: Usuario;
  } | null;
}

export default function PedidosPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [equipo, setEquipo] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [filtroTab, setFiltroTab] = useState<'activos' | 'historial'>('activos');
  const [userRole, setUserRole] = useState<string>('');
  
  // Modales
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [selectedConductorId, setSelectedConductorId] = useState<string>('');
  const [selectedReactivarId, setSelectedReactivarId] = useState<number | null>(null);
  const [motivoReactivacion, setMotivoReactivacion] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(user.rol || '');
      
      // Fetch Pedidos
      const resPedidos = await fetch('http://localhost:3001/api/pedidos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataPedidos = await resPedidos.json();
      setPedidos(Array.isArray(dataPedidos) ? dataPedidos : []);

      // Fetch Equipo (para asignar conductores)
      const resEquipo = await fetch('http://localhost:3001/api/equipo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataEquipo = await resEquipo.json();
      if (Array.isArray(dataEquipo)) {
        setEquipo(dataEquipo.filter(u => u.rol === 'conductor'));
      }

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const changeStatus = async (id: number, nuevoEstado: string, motivo?: string) => {
    setActionLoadingId(id);
    try {
      const token = localStorage.getItem('token');
      const payload: any = { estado: nuevoEstado };
      if (motivo) {
        payload.motivoReactivacion = motivo;
      }
      
      const res = await fetch(`http://localhost:3001/api/pedidos/${id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchData();
        setSelectedPedido(null);
        setSelectedReactivarId(null);
        setMotivoReactivacion('');
      }
    } catch (err) {
      console.error('Error changing status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const assignDriverAndDispatch = async (id: number) => {
    if (!selectedConductorId) {
      alert("Debes seleccionar un conductor primero");
      return;
    }
    setActionLoadingId(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/pedidos/${id}/asignar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ conductorId: Number(selectedConductorId) })
      });
      if (res.ok) {
        fetchData();
        setSelectedPedido(null);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Error al asignar conductor");
      }
    } catch (err) {
      console.error('Error asignando:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper visual para los estados
  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'en_preparacion':
        return <span className="flex w-fit items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700"><Clock className="w-3 h-3"/> En Preparación</span>;
      case 'preparado':
        return <span className="flex w-fit items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700"><Package className="w-3 h-3"/> Preparado</span>;
      case 'en_ruta':
        return <span className="flex w-fit items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700"><Truck className="w-3 h-3"/> En Ruta</span>;
      case 'entregado':
        return <span className="flex w-fit items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3"/> Entregado</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{estado}</span>;
    }
  };

  const pedidosFiltrados = pedidos.filter(p => 
    filtroTab === 'activos' ? p.estado !== 'entregado' : p.estado === 'entregado'
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {userRole === 'asesor' && (
            <button 
              onClick={() => router.push('/asesor')}
              className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full transition-colors text-slate-600 hover:text-slate-900 shadow-sm"
              title="Volver a Toma de Pedidos"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Pedidos</h1>
            <p className="text-slate-500">Administra y despacha las órdenes de tus clientes.</p>
          </div>
        </div>
        
        {/* Pestañas (Tabs) */}
        <div className="flex bg-slate-200/50 p-1 rounded-lg w-fit">
          <button
            onClick={() => setFiltroTab('activos')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filtroTab === 'activos' ? 'bg-white text-[#4a6c6f] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Activos
          </button>
          <button
            onClick={() => setFiltroTab('historial')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filtroTab === 'historial' ? 'bg-white text-[#4a6c6f] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Historial (Entregados)
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#4a6c6f] mb-4" />
            <p>Cargando pedidos...</p>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-center">
            <div className="w-16 h-16 bg-[#e2e8ce] text-[#4a6c6f] rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {filtroTab === 'activos' ? 'No hay pedidos activos' : 'No hay historial de entregas'}
            </h3>
            <p className="max-w-sm mb-6">
              {filtroTab === 'activos' 
                ? 'Los pedidos nuevos aparecerán aquí automáticamente.'
                : 'Aún no se ha completado ninguna entrega.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-500">
                  <th className="px-6 py-4 font-medium">Pedido #</th>
                  <th className="px-6 py-4 font-medium">Fecha</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidosFiltrados.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">#{pedido.id.toString().padStart(4, '0')}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {new Date(pedido.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm">{pedido.nombreCliente || `Tendero ${pedido.tenderoId}`}</p>
                      <p className="text-xs text-slate-500">{pedido.telefonoCliente || 'Sin teléfono'}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">${pedido.total.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {getStatusBadge(pedido.estado)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {filtroTab === 'historial' && (userRole === 'administrador' || userRole === 'distribuidor') && (
                          <button 
                            onClick={() => setSelectedReactivarId(pedido.id)}
                            disabled={actionLoadingId === pedido.id}
                            className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors border border-amber-200"
                          >
                            {actionLoadingId === pedido.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Reactivar
                          </button>
                        )}
                        <button 
                          onClick={() => { setSelectedPedido(pedido); setSelectedConductorId(''); }}
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#4a6c6f] hover:text-[#3a5658] bg-[#e2e8ce]/30 hover:bg-[#e2e8ce]/60 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" /> Detalles
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Reactivación */}
      {selectedReactivarId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setSelectedReactivarId(null); setMotivoReactivacion(''); }}></div>
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border-t-4 border-amber-500 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-amber-500" />
              Reactivar Pedido
            </h2>
            <div className="mb-6 space-y-3">
              <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
                Al confirmar, este pedido será devuelto a la pestaña de <b>Activos</b> en estado <b>Pendiente</b> para que vuelva a ser despachado.
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Motivo del error (Trazabilidad)
              </label>
              <div className="relative">
                <textarea
                  value={motivoReactivacion}
                  onChange={(e) => setMotivoReactivacion(e.target.value)}
                  placeholder="Ej. El cliente rechazó la caja porque faltaba producto..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none resize-none min-h-[80px]"
                  required
                  maxLength={200}
                />
                <div className={`text-xs text-right mt-1 font-medium ${motivoReactivacion.length >= 200 ? 'text-red-500' : 'text-slate-400'}`}>
                  {motivoReactivacion.length} / 200 caracteres
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setSelectedReactivarId(null); setMotivoReactivacion(''); }}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoadingId === selectedReactivarId || motivoReactivacion.trim() === ''}
                onClick={() => changeStatus(selectedReactivarId, 'pendiente', motivoReactivacion)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-70 text-white rounded-lg font-medium shadow-md shadow-amber-500/20"
              >
                {actionLoadingId === selectedReactivarId ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Confirmar Reactivación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alistamiento (Detalles del Pedido) */}
      {selectedPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedPedido(null)}></div>
          
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Pedido #{selectedPedido.id.toString().padStart(4, '0')}
                </h2>
                <div className="mt-1">{getStatusBadge(selectedPedido.estado)}</div>
              </div>
              <button onClick={() => setSelectedPedido(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Info del Cliente */}
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-2 text-blue-800 font-bold mb-1">
                    <UserIcon className="w-4 h-4" /> Cliente
                  </div>
                  <p className="text-blue-900">{selectedPedido.nombreCliente}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-blue-800 font-bold mb-1">
                    <Phone className="w-4 h-4" /> Teléfono
                  </div>
                  <p className="text-blue-900">{selectedPedido.telefonoCliente}</p>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 text-blue-800 font-bold mb-1">
                    <MapPin className="w-4 h-4" /> Dirección de Entrega
                  </div>
                  <p className="text-blue-900">{selectedPedido.direccionEnvio}</p>
                </div>
              </div>

              {/* Lista de Empaque */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#4a6c6f]" /> Lista de Empaque (Picking)
                </h3>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 font-medium text-slate-500">Cant.</th>
                        <th className="px-4 py-2 font-medium text-slate-500">Producto</th>
                        <th className="px-4 py-2 font-medium text-slate-500 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPedido.detalles.map(det => (
                        <tr key={det.id}>
                          <td className="px-4 py-3 font-bold text-slate-900">{det.cantidad}x</td>
                          <td className="px-4 py-3 text-slate-700">{det.producto.nombre}</td>
                          <td className="px-4 py-3 font-medium text-slate-900 text-right">${det.subtotal.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-100">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 font-bold text-slate-600 text-right">TOTAL A COBRAR:</td>
                        <td className="px-4 py-3 font-black text-slate-900 text-right">${selectedPedido.total.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>
            
            {/* Acciones de Estado */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col gap-3">
              {selectedPedido.estado === 'pendiente' && (
                <div className="flex justify-end">
                  <button 
                    onClick={() => changeStatus(selectedPedido.id, 'en_preparacion')} 
                    disabled={actionLoadingId === selectedPedido.id}
                    className="flex items-center gap-2 px-6 py-3 bg-[#4a6c6f] text-white rounded-xl font-bold hover:bg-[#3a5658] transition-colors disabled:opacity-50"
                  >
                    {actionLoadingId === selectedPedido.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
                    Comenzar Alistamiento (A bodega)
                  </button>
                </div>
              )}

              {selectedPedido.estado === 'en_preparacion' && (
                <div className="flex justify-end">
                  <button 
                    onClick={() => changeStatus(selectedPedido.id, 'preparado')} 
                    disabled={actionLoadingId === selectedPedido.id}
                    className="flex items-center gap-2 px-6 py-3 bg-[#4a6c6f] text-white rounded-xl font-bold hover:bg-[#3a5658] transition-colors disabled:opacity-50"
                  >
                    {actionLoadingId === selectedPedido.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
                    Caja Armada (Marcar Preparado)
                  </button>
                </div>
              )}

              {selectedPedido.estado === 'preparado' && (
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-bold text-purple-900 mb-1">Asignar a un Conductor</label>
                    <select 
                      value={selectedConductorId} 
                      onChange={(e) => setSelectedConductorId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="">Selecciona un conductor...</option>
                      {equipo.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={() => assignDriverAndDispatch(selectedPedido.id)}
                    disabled={actionLoadingId === selectedPedido.id || !selectedConductorId}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoadingId === selectedPedido.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}
                    Despachar En Ruta
                  </button>
                </div>
              )}

              {selectedPedido.estado === 'en_ruta' && (userRole === 'administrador' || userRole === 'distribuidor') && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex flex-col items-center gap-3">
                  <div className="text-center text-emerald-800 font-medium text-sm">
                    El pedido está en ruta con el conductor <span className="font-bold">{selectedPedido.entrega?.conductor?.nombre}</span>. Él debería marcarlo como entregado en su app, pero si necesitas forzarlo desde la bodega:
                  </div>
                  <button 
                    onClick={() => changeStatus(selectedPedido.id, 'entregado')} 
                    disabled={actionLoadingId === selectedPedido.id}
                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoadingId === selectedPedido.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Marcar como Entregado Manualmente
                  </button>
                </div>
              )}
              
              {selectedPedido.estado === 'entregado' && (
                <div className="text-center text-emerald-600 font-bold">
                  ¡Pedido entregado con éxito!
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
