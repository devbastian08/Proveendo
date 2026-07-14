'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, Loader2, Package, Search } from 'lucide-react';

interface DirectorioTienda {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  logoUrl: string | null;
  portadaUrl: string | null;
  productosCount: number;
}

export default function TiendasDirectorioPage() {
  const [tiendas, setTiendas] = useState<DirectorioTienda[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTiendas = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/tiendas/directorio');
        const data = await res.json();
        setTiendas(data);
      } catch (error) {
        console.error('Error al cargar tiendas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTiendas();
  }, []);

  const filteredTiendas = tiendas.filter(t => 
    t.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.descripcion && t.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Público */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="ProvEEndo" className="h-12 w-auto" />
            <span className="font-bold text-2xl tracking-tight text-[#4a6c6f]">ProvEEndo</span>
          </div>
          <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-[#4a6c6f] transition-colors">
            ¿Eres Distribuidor?
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Nuestras Distribuidoras Aliadas
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Encuentra los mejores precios, surte tu negocio y recibe todo directamente de distribuidores de confianza.
          </p>
        </div>

        {/* Buscador */}
        <div className="max-w-xl mx-auto mb-10 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre de distribuidora o tipo de producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-[#56cbf9] focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Listado */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-[#4a6c6f] mb-4" />
            <p className="text-lg font-medium">Buscando distribuidores disponibles...</p>
          </div>
        ) : tiendas.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-16 text-center">
            <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Aún no hay tiendas disponibles</h3>
            <p className="text-slate-500">Pronto se unirán nuevas distribuidoras a la plataforma.</p>
          </div>
        ) : filteredTiendas.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-bold text-slate-900 mb-2">No encontramos resultados</h3>
            <p className="text-slate-500">Intenta buscar con otras palabras.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTiendas.map((tienda) => (
              <Link href={`/tienda/${tienda.slug}`} key={tienda.id}>
                <div className="group bg-white rounded-3xl shadow-sm hover:shadow-xl border border-slate-100 hover:border-[#56cbf9] transition-all duration-300 overflow-hidden cursor-pointer h-full flex flex-col relative">
                  
                  {/* Foto de Portada */}
                  <div className="h-32 w-full bg-slate-200 relative overflow-hidden">
                    {tienda.portadaUrl ? (
                      <img 
                        src={tienda.portadaUrl} 
                        alt={`Portada de ${tienda.nombre}`} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-[#4a6c6f] to-[#56cbf9] opacity-90 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                  
                  {/* Foto de Perfil (Logo) */}
                  <div className="absolute top-20 left-6">
                    <div className="w-20 h-20 bg-white rounded-full p-1 shadow-md border border-slate-100">
                      <div className="w-full h-full bg-slate-50 rounded-full flex items-center justify-center overflow-hidden">
                        {tienda.logoUrl ? (
                          <img 
                            src={tienda.logoUrl} 
                            alt={`Logo de ${tienda.nombre}`} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-[#4a6c6f]">
                            {tienda.nombre.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="pt-12 pb-6 px-6 flex-1 flex flex-col bg-white">
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#4a6c6f] transition-colors">
                      {tienda.nombre}
                    </h3>
                    <p className="text-slate-500 text-sm mb-4 line-clamp-3 flex-1">
                      {tienda.descripcion || 'Distribuidora mayorista de productos de consumo masivo.'}
                    </p>
                    
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 w-fit px-3 py-1.5 rounded-lg mb-4">
                      <Package className="w-4 h-4" />
                      {tienda.productosCount} {tienda.productosCount === 1 ? 'producto' : 'productos'}
                    </div>

                    <div className="w-full py-2.5 text-center bg-slate-50 group-hover:bg-[#4a6c6f] group-hover:text-white text-[#4a6c6f] rounded-xl font-medium transition-all duration-300">
                      Visitar Tienda
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
