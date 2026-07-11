'use client';

import { useState, useEffect } from 'react';
import { Loader2, UserPlus, Users, AlertCircle, Shield } from 'lucide-react';

interface Miembro {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
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
      const res = await fetch('http://localhost:3001/api/equipo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre, correo, contrasena, rol })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el usuario');
      }
      
      setIsModalOpen(false);
      setNombre('');
      setCorreo('');
      setContrasena('');
      fetchEquipo(); // Refrescar lista
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {equipo.map((miembro) => (
                  <tr key={miembro.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{miembro.nombre}</td>
                    <td className="px-6 py-4 text-slate-600">{miembro.correo}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 w-fit px-3 py-1 bg-[#e2e8ce]/50 text-[#4a6c6f] font-bold text-xs rounded-full capitalize">
                        <Shield className="w-3 h-3" /> {miembro.rol}
                      </span>
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
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-[#4a6c6f]" />
              Crear Nuevo Usuario
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
                  required
                  value={contrasena}
                  onChange={e => setContrasena(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                  placeholder="Asigna una contraseña segura"
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

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  {isSubmitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
