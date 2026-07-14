'use client';

import { LogOut, PackageSearch } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AsesorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const goToBodega = () => {
    router.push('/admin/pedidos');
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Header Asesor */}
      <header className="bg-white text-[#4a6c6f] shadow-sm border-b border-slate-200 sticky top-0 z-40">
        {/* Botones de acción derecha (Desktop) */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center gap-3">
          {user?.puedeAlistar && (
            <button 
              onClick={goToBodega}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-[#4a6c6f] hover:bg-slate-50 rounded-full transition-colors border border-[#4a6c6f]/20 hover:border-[#4a6c6f]/50 shadow-sm"
              title="Ir a Bodega"
            >
              <PackageSearch className="w-4 h-4" /> Bodega
            </button>
          )}
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors border border-transparent hover:border-red-100 shadow-sm hover:shadow"
            title="Cerrar sesión"
          >
            Salir <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Botones de acción derecha (Móvil) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex sm:hidden items-center gap-1">
          {user?.puedeAlistar && (
            <button 
              onClick={goToBodega}
              className="flex items-center justify-center w-10 h-10 text-[#4a6c6f] hover:bg-slate-50 rounded-full transition-colors"
              title="Ir a Bodega"
            >
              <PackageSearch className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={handleLogout} 
            className="flex items-center justify-center w-10 h-10 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="max-w-md mx-auto px-4 h-20 flex items-center justify-between relative">
          {/* Logo y Título Centrados Absolutamente */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-max pointer-events-none">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="ProvEEndo" className="h-10 w-auto" />
              <span className="font-bold text-2xl tracking-tight">ProvEEndo</span>
            </div>
            <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 mt-0.5">
              Fuerza de Ventas
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
