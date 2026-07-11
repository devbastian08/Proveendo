'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogIn, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contrasena })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // MVP: Guardamos en localStorage. 
      // En una app más avanzada usaríamos Cookies HTTP-Only y un Context de React.
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirección basada en ROLES (RBAC)
      if (data.user.rol === 'superadmin') {
        router.push('/admin/saas');
      } else if (data.user.rol === 'administrador' || data.user.rol === 'distribuidor') {
        router.push('/admin/productos');
      } else {
        router.push('/admin/pedidos');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-6">
              <Image 
                src="/logo.svg" 
                alt="ProvEEndo" 
                width={90} 
                height={90} 
                className="text-[#4a6c6f] object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bienvenido de nuevo</h1>
            <p className="text-slate-500">Ingresa a tu cuenta de ProvEEndo</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#56cbf9] focus:border-[#56cbf9] outline-none transition-all"
                  placeholder="ejemplo@proveendo.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#56cbf9] focus:border-[#56cbf9] outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#4a6c6f] hover:bg-[#3a5658] disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
        <div className="bg-slate-50 p-4 text-center text-sm text-slate-500 border-t border-slate-100">
          Usa tu correo y contraseña registrados para ingresar.
        </div>
      </div>
    </div>
  );
}
