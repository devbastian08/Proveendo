'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Store, Link as LinkIcon, ShieldAlert } from 'lucide-react';

interface Distribuidora {
  id: number;
  nombre: string;
  slug: string;
  telefono: string;
  usuario: {
    nombre: string;
    correo: string;
  };
}

export default function SaasAdminPage() {
  const [distribuidoras, setDistribuidoras] = useState<Distribuidora[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [nombreDueno, setNombreDueno] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [nombreTienda, setNombreTienda] = useState('');
  const [telefono, setTelefono] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDistribuidoras = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/superadmin/distribuidoras', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setDistribuidoras(Array.isArray(data) ? data : []);
      } else {
        setError(data.error || 'Error de permisos');
      }
    } catch (err) {
      console.error(err);
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistribuidoras();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/superadmin/distribuidoras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombreDueno, correo, contrasena, nombreTienda, telefono })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear la tienda');
      }
      
      setIsModalOpen(false);
      setNombreDueno('');
      setCorreo('');
      setContrasena('');
      setNombreTienda('');
      setTelefono('');
      setSuccess('¡Distribuidora creada con éxito! Ya puedes informarle a tu cliente.');
      setTimeout(() => setSuccess(''), 5000);
      
      fetchDistribuidoras(); // Refrescar lista
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#4a6c6f] p-6 sm:p-8 rounded-2xl text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full mb-3">
            <ShieldAlert className="w-3 h-3" /> Panel SuperAdmin
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Mis Clientes (SaaS)</h1>
          <p className="text-[#e2e8ce] max-w-xl">Gestiona las distribuidoras que usan tu plataforma. Aquí puedes crearles sus cuentas para que empiecen a vender.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="shrink-0 flex items-center justify-center gap-2 px-5 py-3 bg-white text-[#4a6c6f] hover:bg-slate-50 rounded-xl font-bold transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          Crear Tienda
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl font-medium border border-emerald-100 flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess('')} className="text-emerald-700 font-bold hover:opacity-70">x</button>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-medium border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#4a6c6f] mb-4" />
            <p>Cargando distribuidoras...</p>
          </div>
        ) : distribuidoras.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <Store className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No hay distribuidoras activas</h3>
            <p className="max-w-sm mb-6">Comienza creando tu primer cliente en la plataforma.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-500">
                  <th className="px-6 py-4 font-medium">Tienda</th>
                  <th className="px-6 py-4 font-medium">Dueño</th>
                  <th className="px-6 py-4 font-medium">Contacto</th>
                  <th className="px-6 py-4 font-medium">Enlace Público</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {distribuidoras.map((dist) => (
                  <tr key={dist.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{dist.nombre}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{dist.usuario.nombre}</p>
                      <p className="text-sm text-slate-500">{dist.usuario.correo}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {dist.telefono}
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={`http://localhost:3000/tienda/${dist.slug}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e2e8ce]/50 text-[#4a6c6f] hover:bg-[#e2e8ce] font-medium text-sm rounded-lg transition-colors"
                      >
                        <LinkIcon className="w-4 h-4" />
                        /{dist.slug}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Nueva Distribuidora</h2>
            <p className="text-slate-500 mb-6">Crea los accesos y el perfil de tu nuevo cliente.</p>
            
            <form onSubmit={handleCreate} className="space-y-5">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#4a6c6f]" /> Datos de la Tienda
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Comercial de la Tienda</label>
                  <input
                    type="text"
                    required
                    value={nombreTienda}
                    onChange={e => setNombreTienda(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                    placeholder="Ej. Distribuidora El Sol"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono de WhatsApp (Recibe Pedidos)</label>
                  <input
                    type="tel"
                    required
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                    placeholder="Ej. 573001234567"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#4a6c6f]" /> Credenciales de Acceso
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Dueño/Representante</label>
                  <input
                    type="text"
                    required
                    value={nombreDueno}
                    onChange={e => setNombreDueno(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Correo (Para Iniciar Sesión)</label>
                  <input
                    type="email"
                    required
                    value={correo}
                    onChange={e => setCorreo(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                    placeholder="contacto@distribuidora.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña Temporal</label>
                  <input
                    type="text"
                    required
                    value={contrasena}
                    onChange={e => setContrasena(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                    placeholder="Ej. Temporal123"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg">
                  {error}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#4a6c6f] hover:bg-[#3a5658] disabled:opacity-70 text-white rounded-xl font-bold transition-all shadow-md"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Creando Tienda...' : 'Crear Tienda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
