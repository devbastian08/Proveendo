'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Package, ShoppingCart, LogOut, Menu, X, Users, Store } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Verificamos si hay un usuario logueado en el frontend
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  // Mientras carga la info del usuario, no mostramos nada para evitar flasheos de UI
  if (!user) return null; 

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Definimos las rutas y quién tiene acceso a cada una según USER_ROLES.md
  const menuItems = [
    {
      title: 'Mis Clientes (SaaS)',
      icon: <Store className="w-5 h-5" />,
      href: '/admin/saas',
      roles: ['superadmin']
    },
    {
      title: 'Inventario',
      icon: <Package className="w-5 h-5" />,
      href: '/admin/productos',
      roles: ['administrador', 'distribuidor']
    },
    {
      title: 'Pedidos',
      icon: <ShoppingCart className="w-5 h-5" />,
      href: '/admin/pedidos',
      roles: ['administrador', 'asesor', 'distribuidor']
    },
    {
      title: 'Clientes (Pronto)',
      icon: <Users className="w-5 h-5" />,
      href: '#', 
      roles: ['administrador', 'asesor']
    },
    {
      title: 'Ajustes de Tienda',
      icon: <Users className="w-5 h-5" />,
      href: '/admin/ajustes', 
      roles: ['administrador', 'distribuidor']
    },
    {
      title: 'Equipo',
      icon: <Users className="w-5 h-5" />,
      href: '/admin/equipo',
      roles: ['administrador', 'distribuidor']
    }
  ];

  // Filtramos el menú según el rol del usuario actual
  const visibleMenuItems = menuItems.filter(item => item.roles.includes(user.rol));

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Overlay para móviles */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Menú Lateral (Sidebar) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Header del Sidebar */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="ProvEEndo" width={40} height={40} className="text-[#4a6c6f] object-contain" />
              <span className="font-bold text-xl text-slate-900">ProvEEndo</span>
            </div>
            <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tarjeta de Usuario Actual */}
          <div className="px-6 pb-6">
            <div className="px-4 py-3 bg-[#e2e8ce]/40 rounded-xl border border-[#e2e8ce]">
              <p className="text-sm font-bold text-[#4a6c6f] truncate">{user.nombre}</p>
              <p className="text-xs text-slate-500 capitalize font-medium">{user.rol}</p>
            </div>
          </div>

          {/* Enlaces de Navegación */}
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            {visibleMenuItems.map((item) => {
              const isActive = pathname.startsWith(item.href) && item.href !== '#';
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all
                    ${isActive 
                      ? 'bg-[#4a6c6f] text-white shadow-md shadow-[#4a6c6f]/20' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                  `}
                >
                  {item.icon}
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Footer del Sidebar */}
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-left text-[#d62246] hover:bg-[#d62246]/10 rounded-xl font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barra superior solo en móviles */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 lg:hidden">
          <button className="text-slate-500" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-lg text-[#4a6c6f]">ProvEEndo</span>
        </header>

        {/* Aquí se renderizarán las páginas de Productos o Pedidos */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
