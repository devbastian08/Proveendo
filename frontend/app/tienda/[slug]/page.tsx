import TiendaClient from './TiendaClient';
import { Store } from 'lucide-react';

export default async function TiendaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;

  try {
    // Usamos el entorno de producción para el fecthing en el servidor
    // Para optimización extrema, configuramos ISR o revalidación si lo deseamos
    // cache: 'no-store' asegura que siempre veamos inventario fresco
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const res = await fetch(`${API_URL}/api/tienda/${slug}`, {
      cache: 'no-store' 
    });

    if (!res.ok) {
      throw new Error('No se encontró la tienda');
    }

    const data = await res.json();

    return (
      <TiendaClient 
        distribuidora={data.distribuidora} 
        productos={data.productos} 
      />
    );
  } catch (error: any) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Tienda no encontrada</h1>
          <p className="text-slate-500">
            El enlace que ingresaste no es válido o la distribuidora no existe.
          </p>
        </div>
      </div>
    );
  }
}
