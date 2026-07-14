'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ConductorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Header Conductor */}
      <header className="bg-white text-[#4a6c6f] shadow-sm border-b border-slate-200 sticky top-0 z-40">
        {/* Botón de Salir (Fijado al extremo derecho de la pantalla completa) */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden sm:block">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors border border-transparent hover:border-red-100 shadow-sm hover:shadow"
            title="Cerrar sesión"
          >
            Salir <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Botón de Salir (Versión Móvil) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 sm:hidden">
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
              Módulo Conductores
            </span>
          </div>
        </div>
      </header>

      {/* Main Content (Mobile Centered) */}
      <main className="max-w-md mx-auto p-4">
        {children}
      </main>
    </div>
  );
}
