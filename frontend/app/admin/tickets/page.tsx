'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Loader2, Inbox, Lock, MessageSquare, CheckCircle, Clock, Plus, Minus, PackagePlus, Send, X } from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  id: number;
  motivo: string;
  estado: string;
  fecha: string;
  notasAdmin: string | null;
  respuestaCliente: string | null;
  atendidoPorId: number | null;
  pedidoId?: number | null;
  pedido: { codigo: string | null, total: number } | null;
  tendero: { nombre_tienda: string, telefono: string };
  atendidoPor: { id: number, nombre: string } | null;
}

interface Producto {
  id: number;
  nombre: string;
  stock: number;
}

const fetcher = async (url: string) => {
  const token = localStorage.getItem('token');
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al cargar datos');
  }
  return res.json();
};

export default function TicketsPage() {
  const [user, setUser] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  // Productos y Reposición
  const [showReposicionUI, setShowReposicionUI] = useState(false);
  const [reposicionCart, setReposicionCart] = useState<{id: number, cantidad: number}[]>([]);
  const [creatingReposicion, setCreatingReposicion] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notas, setNotas] = useState('');
  const [respuestaCliente, setRespuestaCliente] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const { data: ticketsData, isLoading: loadingTickets, mutate: mutateTickets } = useSWR<Ticket[]>(
    user ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/tickets` : null,
    fetcher
  );

  const { data: productosData } = useSWR<Producto[]>(
    user ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/productos` : null,
    fetcher
  );

  const tickets = Array.isArray(ticketsData) ? ticketsData : [];
  const productos = Array.isArray(productosData) ? productosData : [];
  const loading = !user || loadingTickets;

  const handleOpenTicket = async (ticket: Ticket) => {
    if (ticket.atendidoPorId && ticket.atendidoPorId !== user?.id) {
      toast.error(`Ticket bloqueado. Ya está siendo atendido por ${ticket.atendidoPor?.nombre}`);
      return;
    }

    if (!ticket.atendidoPorId) {
      const promise = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/tickets/${ticket.id}/abrir`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
      };

      toast.promise(promise, {
        loading: 'Abriendo ticket...',
        success: (updatedTicket) => {
          mutateTickets((prev) => prev ? prev.map(t => t.id === updatedTicket.id ? updatedTicket : t) : [], { revalidate: false });
          openModal(updatedTicket);
          return `¡Ticket bloqueado a tu nombre!`;
        },
        error: (err) => err.message
      });
    } else {
      openModal(ticket);
    }
  };

  const openModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setNotas(ticket.notasAdmin || '');
    setRespuestaCliente(ticket.respuestaCliente || '');
    setShowReposicionUI(false);
    setReposicionCart([]);
    setIsModalOpen(true);
  };

  const handleSaveStatus = async (nuevoEstado: string) => {
    if (!selectedTicket) return;
    setSavingStatus(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/tickets/${selectedTicket.id}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: nuevoEstado, notasAdmin: notas, respuestaCliente })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(nuevoEstado === 'resuelto' ? 'Ticket marcado como resuelto y cliente notificado' : 'Notas guardadas correctamente');
      if (nuevoEstado === 'resuelto') {
        setIsModalOpen(false);
      }
      mutateTickets();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleLiberar = async () => {
    if (!selectedTicket) return;
    setSavingStatus(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/tickets/${selectedTicket.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ estado: 'abierto', notasAdmin: notas, respuestaCliente, liberar: true })
      });
      if (!res.ok) throw new Error('Error al liberar');
      toast.success('Ticket devuelto a la bandeja compartida');
      setIsModalOpen(false);
      mutateTickets();
    } catch(err: any) {
      toast.error(err.message || 'Error al liberar');
    } finally {
      setSavingStatus(false);
    }
  };

  const updateCart = (productoId: number, delta: number) => {
    setReposicionCart(prev => {
      const existing = prev.find(p => p.id === productoId);
      if (existing) {
        const newCantidad = existing.cantidad + delta;
        if (newCantidad <= 0) return prev.filter(p => p.id !== productoId);
        return prev.map(p => p.id === productoId ? { ...p, cantidad: newCantidad } : p);
      }
      if (delta > 0) return [...prev, { id: productoId, cantidad: delta }];
      return prev;
    });
  };

  const handleCrearReposicion = async () => {
    if (!selectedTicket || reposicionCart.length === 0) {
      toast.error('Añade al menos un producto a la reposición');
      return;
    }
    setCreatingReposicion(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/tickets/${selectedTicket.id}/reposicion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productos: reposicionCart })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(`Pedido Exprés #${data.pedido.codigo} creado y enviado a bodega.`);
      
      // Actualizar localmente la nota
      const nuevasNotas = (notas ? notas + '\n' : '') + `[REPOSICIÓN LOGÍSTICA]: Se creó el sub-pedido #${data.pedido.codigo} con costo $0 para enviar al cliente.`;
      setNotas(nuevasNotas);
      setShowReposicionUI(false);
      setReposicionCart([]);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear reposición');
    } finally {
      setCreatingReposicion(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bandeja de Tickets</h1>
          <p className="text-slate-500 dark:text-slate-400">Atiende los reclamos y solicitudes de tus clientes.</p>
        </div>
        <button onClick={() => mutateTickets()} className="text-sm px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors">
          Actualizar Buzón
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#4a6c6f] mb-4" />
            <p>Cargando bandeja compartida...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400 text-center">
            <div className="w-16 h-16 bg-[#e2e8ce] text-[#4a6c6f] rounded-full flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">¡Bandeja Limpia!</h3>
            <p className="max-w-sm mb-6">No tienes tickets pendientes de responder en este momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-4 font-medium">Ticket ID</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Motivo</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium">Asignado a</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tickets.map((ticket) => {
                  const isLockedByOther = ticket.atendidoPorId && ticket.atendidoPorId !== user.id;
                  const isMine = ticket.atendidoPorId === user.id;
                  
                  return (
                    <tr 
                      key={ticket.id} 
                      onClick={() => handleOpenTicket(ticket)}
                      className={`transition-colors cursor-pointer ${
                        isLockedByOther 
                          ? 'bg-slate-50 opacity-60 dark:bg-slate-950/50' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        #{ticket.id.toString().padStart(4, '0')}
                        <div className="text-xs text-slate-500">
                          {new Date(ticket.fecha).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#4a6c6f]">{ticket.tendero.nombre_tienda}</div>
                        <div className="text-xs text-slate-500">{ticket.tendero.telefono}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium whitespace-pre-wrap line-clamp-2">{ticket.motivo}</span>
                        {ticket.pedido && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            Pedido #{ticket.pedido.codigo || 'N/A'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          ticket.estado === 'abierto' ? 'bg-red-50 text-red-600 border border-red-200' :
                          ticket.estado === 'en_progreso' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                          'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}>
                          {ticket.estado === 'abierto' && <MessageSquare className="w-3 h-3" />}
                          {ticket.estado === 'en_progreso' && <Clock className="w-3 h-3" />}
                          {ticket.estado === 'resuelto' && <CheckCircle className="w-3 h-3" />}
                          {ticket.estado.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isLockedByOther ? (
                          <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                            <Lock className="w-4 h-4 text-slate-400" />
                            {ticket.atendidoPor?.nombre}
                          </div>
                        ) : isMine ? (
                          <div className="flex items-center gap-1.5 text-[#4a6c6f] font-bold text-sm">
                            <span className="w-2 h-2 rounded-full bg-[#4a6c6f]"></span>
                            Tú
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400 italic">Sin asignar</div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle de Ticket */}
      {isModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 flex flex-col max-h-[90vh]">
            
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Ticket #{selectedTicket.id.toString().padStart(4, '0')}
                  <span className="text-xs px-2 py-1 bg-[#e2e8ce] text-[#4a6c6f] rounded-full">En Progreso</span>
                </h2>
                <p className="text-slate-500 text-sm mt-1">{new Date(selectedTicket.fecha).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cliente</p>
                    <p className="font-medium text-slate-900 dark:text-white">{selectedTicket.tendero.nombre_tienda}</p>
                    <a href={`https://wa.me/${selectedTicket.tendero.telefono.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-sm text-[#4a6c6f] hover:underline">
                      {selectedTicket.tendero.telefono}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pedido Afectado</p>
                    {selectedTicket.pedido ? (
                      <p className="font-medium text-slate-900 dark:text-white">#{selectedTicket.pedido.codigo || selectedTicket.pedidoId}</p>
                    ) : (
                      <p className="text-slate-400 italic">N/A</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Motivo del Reclamo</p>
                  <p className="font-medium text-slate-900 dark:text-white text-lg whitespace-pre-wrap">{selectedTicket.motivo}</p>
                </div>
              </div>

              {/* Botón y UI de Reposición */}
              {selectedTicket.pedido && (
                <div className="mb-6">
                  {!showReposicionUI ? (
                    <button 
                      onClick={() => setShowReposicionUI(true)}
                      className="flex items-center gap-2 text-sm font-bold text-[#4a6c6f] bg-[#e2e8ce]/50 hover:bg-[#e2e8ce] px-4 py-2 rounded-lg transition-colors border border-[#4a6c6f]/20"
                    >
                      <PackagePlus className="w-4 h-4" />
                      Programar Envío de Reposición (Día Siguiente)
                    </button>
                  ) : (
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white">Selecciona los productos a reponer</h3>
                        <button onClick={() => {setShowReposicionUI(false); setReposicionCart([]);}} className="text-xs text-slate-500 hover:text-slate-700 font-bold">
                          Cancelar
                        </button>
                      </div>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto mb-4 custom-scrollbar pr-2">
                        {productos.map(p => {
                          const cartItem = reposicionCart.find(c => c.id === p.id);
                          const qty = cartItem ? cartItem.cantidad : 0;
                          return (
                            <div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{p.nombre}</p>
                                <p className="text-xs text-slate-500">Stock actual: {p.stock}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <button onClick={() => updateCart(p.id, -1)} disabled={qty === 0} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50">
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-4 text-center font-bold">{qty}</span>
                                <button onClick={() => updateCart(p.id, 1)} disabled={p.stock <= qty} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50">
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleCrearReposicion}
                        disabled={creatingReposicion || reposicionCart.length === 0}
                        className="w-full py-2.5 bg-[#4a6c6f] hover:bg-[#3a5658] text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                      >
                        {creatingReposicion ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />}
                        Generar Pedido Exprés ($0)
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-bold text-yellow-600 dark:text-yellow-500 mb-2">
                  🟨 Notas Internas (Privadas)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Escribe apuntes internos para tu equipo (ej. Hablé con el conductor). El cliente NO verá esto."
                  className="w-full h-24 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/50 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none resize-none text-slate-900 dark:text-yellow-100"
                />
              </div>

              <div className="mb-2">
                <label className="block text-sm font-bold text-emerald-600 dark:text-emerald-500 mb-2">
                  🟩 Respuesta al Cliente (Pública)
                </label>
                <textarea
                  value={respuestaCliente}
                  onChange={(e) => setRespuestaCliente(e.target.value)}
                  placeholder="Escribe la solución oficial. Esto es lo que se le enviará al cliente por WhatsApp al marcar como resuelto."
                  className="w-full h-24 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-700/50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-slate-900 dark:text-emerald-100"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
              <button
                disabled={savingStatus}
                onClick={handleLiberar}
                className="flex-1 px-4 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 flex items-center justify-center gap-2"
              >
                Liberar Ticket
              </button>
              <button
                disabled={savingStatus}
                onClick={() => handleSaveStatus('en_progreso')}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 font-bold rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                Guardar Avance
              </button>
              <button
                disabled={savingStatus}
                onClick={() => handleSaveStatus('resuelto')}
                className="flex-[2] px-4 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 disabled:opacity-70 text-lg"
              >
                {savingStatus ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                Resolver y Notificar
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
