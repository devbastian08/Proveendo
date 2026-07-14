'use client';

import { useState, useEffect } from 'react';
import { Loader2, UserPlus, Users, AlertCircle, Shield, Edit2, PackageSearch } from 'lucide-react';

interface Miembro {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  puedeAlistar: boolean;
}

export default function EquipoPage() {
  const [equipo, setEquipo] = useState<Miembro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rol, setRol] = useState('asesor'); // Por defecto creamos asesores
  const [puedeAlistar, setPuedeAlistar] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [error, setError] = useState('');

  const fetchEquipo = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/equipo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setEquipo(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipo();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `http://localhost:3001/api/equipo/${editingId}` : 'http://localhost:3001/api/equipo';
      const method = editingId ? 'PATCH' : 'POST';
      
      const payload: any = { nombre, correo, rol, puedeAlistar };
      if (contrasena) payload.contrasena = contrasena;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el usuario');
      }
      
      setIsModalOpen(false);
      setNombre('');
      setCorreo('');
      setContrasena('');
      setPuedeAlistar(false);
      fetchEquipo(); // Refrescar lista
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAlistar = async (miembro: Miembro) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/equipo/${miembro.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ puedeAlistar: !miembro.puedeAlistar })
      });
      if (res.ok) {
        fetchEquipo();
      }
    } catch (error) {
      console.error('Error toggling puedeAlistar', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Equipo</h1>
          <p className="text-slate-500">Administra los asesores y conductores de tu distribuidora.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#4a6c6f] hover:bg-[#3a5658] text-white rounded-lg font-medium transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Crear Usuario
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#4a6c6f] mb-4" />
            <p>Cargando equipo...</p>
          </div>
        ) : equipo.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-center">
            <div className="w-16 h-16 bg-[#e2e8ce] text-[#4a6c6f] rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Aún no hay equipo</h3>
            <p className="max-w-sm mb-6">Crea cuentas para tus asesores para que puedan tomar pedidos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-500">
                  <th className="px-6 py-4 font-medium">Nombre</th>
                  <th className="px-6 py-4 font-medium">Correo</th>
                  <th className="px-6 py-4 font-medium">Rol</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {equipo.map((miembro) => (
                  <tr key={miembro.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{miembro.nombre}</td>
                    <td className="px-6 py-4 text-slate-600">{miembro.correo}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 w-fit px-3 py-1 bg-[#e2e8ce]/50 text-[#4a6c6f] font-bold text-xs rounded-full capitalize">
                        <Shield className="w-3 h-3" /> {miembro.rol} {miembro.rol === 'asesor' && miembro.puedeAlistar && '(Alista)'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setEditingId(miembro.id);
                          setNombre(miembro.nombre);
                          setCorreo(miembro.correo);
                          setRol(miembro.rol);
                          setPuedeAlistar(miembro.puedeAlistar || false);
                          setContrasena('');
                          setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-[#4a6c6f] hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm border border-transparent hover:border-slate-200 ml-auto"
                        title="Editar datos"
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </button>
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
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); setEditingId(null); setNombre(''); setCorreo(''); setContrasena(''); }}></div>
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-[#4a6c6f]" />
              {editingId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </h2>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={correo}
                  onChange={e => setCorreo(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                  placeholder="juan@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                <input
                  type="text"
                  required={!editingId}
                  value={contrasena}
                  onChange={e => setContrasena(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                  placeholder={editingId ? 'Déjalo en blanco para no cambiarla' : 'Asigna una contraseña segura'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol en la Tienda</label>
                <select
                  value={rol}
                  onChange={e => setRol(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                >
                  <option value="asesor">Asesor (Registrar Pedidos y Clientes)</option>
                  <option value="conductor">Conductor (Ver Rutas y Entregas)</option>
                </select>
              </div>

              {rol === 'asesor' && (
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={puedeAlistar}
                    onChange={(e) => setPuedeAlistar(e.target.checked)}
                    className="w-5 h-5 rounded text-[#4a6c6f] focus:ring-[#4a6c6f] border-slate-300"
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-800">Permitir Alistamiento (Bodega)</div>
                    <div className="text-xs text-slate-500">Este asesor podrá ver y cambiar el estado de los pedidos.</div>
                  </div>
                </label>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingId(null); setNombre(''); setCorreo(''); setContrasena(''); }}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-[#4a6c6f] hover:bg-[#3a5658] disabled:opacity-70 text-white rounded-lg font-medium"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Crear Usuario')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
