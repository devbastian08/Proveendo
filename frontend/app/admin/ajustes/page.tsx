'use client';

import { useState, useEffect } from 'react';
import { Loader2, Store, Save, Link as LinkIcon, Phone } from 'lucide-react';

interface Distribuidora {
  id: number;
  nombre: string;
  slug: string;
  telefono: string;
}

export default function AjustesPage() {
  const [distribuidora, setDistribuidora] = useState<Distribuidora | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [telefono, setTelefono] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDistribuidora = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/distribuidora', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setDistribuidora(data);
        setNombre(data.nombre);
        setSlug(data.slug);
        setTelefono(data.telefono);
      } else {
        setError(data.error || 'Error al cargar los ajustes');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistribuidora();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/distribuidora', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre, slug, telefono })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar los ajustes');
      }
      
      setDistribuidora(data);
      setNombre(data.nombre);
      setSlug(data.slug);
      setTelefono(data.telefono);
      setSuccess('Ajustes guardados correctamente.');
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tiendaUrl = `http://localhost:3000/tienda/${slug}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#4a6c6f] mb-4" />
        <p>Cargando ajustes...</p>
      </div>
    );
  }

  if (!distribuidora) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl">
        No se pudo cargar la información de la tienda. {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración de Tienda</h1>
        <p className="text-slate-500">Personaliza la información y el enlace público de tu catálogo.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 sm:p-8">
        
        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="space-y-2">
            <label className="block font-medium text-slate-700">Nombre de la Tienda / Distribuidora</label>
            <div className="relative">
              <Store className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-medium text-slate-700">Enlace Personalizado (Slug)</label>
            <p className="text-sm text-slate-500 mb-2">Este será el enlace que compartirás con tus clientes.</p>
            <div className="relative">
              <LinkIcon className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none"
              />
            </div>
            <div className="mt-2 p-3 bg-[#e2e8ce]/30 rounded-lg text-sm text-[#4a6c6f] font-medium break-all">
              👉 {tiendaUrl}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-medium text-slate-700">Número de WhatsApp (Pedidos)</label>
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="tel"
                required
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none"
                placeholder="Ej. 573001234567"
              />
            </div>
            <p className="text-xs text-slate-500">Asegúrate de incluir el código de país si es necesario (ej. 57 para Colombia).</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm font-medium">
              {success}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#4a6c6f] hover:bg-[#3a5658] disabled:opacity-70 text-white rounded-xl font-bold transition-colors shadow-md shadow-[#4a6c6f]/20"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSubmitting ? 'Guardando...' : 'Guardar Ajustes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
