'use client';

import { useState, useEffect } from 'react';
import { Loader2, Inbox, Lock, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  id: number;
  motivo: string;
  estado: string;
  fecha: string;
  notasAdmin: string | null;
  atendidoPorId: number | null;
  pedidoId?: number | null;
  pedido: { codigo: string | null, total: number } | null;
  tendero: { nombre_tienda: string, telefono: string };
  atendidoPor: { id: number, nombre: string } | null;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notas, setNotas] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/tickets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setTickets(Array.isArray(data) ? data : []);
      } else {
        toast.error(data.error || 'Error al cargar tickets');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicket = async (ticket: Ticket) => {
    // Si ya está bloqueado por otro
    if (ticket.atendidoPorId && ticket.atendidoPorId !== user?.id) {
      toast.error(`Ticket bloqueado. Ya está siendo atendido por ${ticket.atendidoPor?.nombre}`);
      return;
    }

    // Si no está bloqueado por nosotros, lo reclamamos
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
          // Actualizamos la lista local y abrimos el modal
          setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
          openModal(updatedTicket);
          return `¡Ticket bloqueado a tu nombre!`;
        },
        error: (err) => err.message
      });
    } else {
      // Ya es nuestro
      openModal(ticket);
    }
  };

  const openModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setNotas(ticket.notasAdmin || '');
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
        body: JSON.stringify({ estado: nuevoEstado, notasAdmin: notas })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(nuevoEstado === 'resuelto' ? 'Ticket marcado como resuelto' : 'Notas guardadas correctamente');
      setIsModalOpen(false);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSavingStatus(false);
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
        <button onClick={fetchTickets} className="text-sm px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors">
          Actualizar Buzón
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#4a6c6f] mb-4" />
            <p>Cargando buzón compartida...</p>
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
                        <span className="font-medium">{ticket.motivo}</span>
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
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 flex flex-col max-h-[90vh]">
            
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Ticket #{selectedTicket.id.toString().padStart(4, '0')}
                  <span className="text-xs px-2 py-1 bg-[#e2e8ce] text-[#4a6c6f] rounded-full">En Progreso</span>
                </h2>
                <p className="text-slate-500 text-sm mt-1">{new Date(selectedTicket.fecha).toLocaleString()}</p>
              </div>
            </div>

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
                <p className="font-medium text-slate-900 dark:text-white text-lg">{selectedTicket.motivo}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[120px] mb-6">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Notas Internas de Resolución (Privadas)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Escribe aquí las acciones que tomaste para solucionar este problema..."
                className="w-full h-32 px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#4a6c6f] outline-none resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
              >
                Cerrar Modal
              </button>
              <button
                disabled={savingStatus}
                onClick={() => handleSaveStatus('en_progreso')}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-bold rounded-xl transition-colors disabled:opacity-70"
              >
                Guardar Notas
              </button>
              <button
                disabled={savingStatus}
                onClick={() => handleSaveStatus('resuelto')}
                className="flex-1 px-4 py-2.5 bg-[#4a6c6f] hover:bg-[#3a5658] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {savingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Marcar Resuelto
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
