'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2, Navigation, MapPin, ListOrdered, FileDown, ArrowDownUp, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminMap = dynamic(() => import('./AdminMap'), { ssr: false });

export default function TorreControlPage() {
  const router = useRouter();
  const [conductores, setConductores] = useState<any[]>([]);
  const [origen, setOrigen] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedConductorId, setSelectedConductorId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      const resDist = await fetch('http://localhost:3001/api/distribuidora', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resDist.ok) {
        const dist = await resDist.json();
        if (dist.latitud && dist.longitud) {
          setOrigen({ lat: dist.latitud, lng: dist.longitud });
        }
      }

      const resRutas = await fetch('http://localhost:3001/api/admin/torre-control', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resRutas.ok) {
        const data = await resRutas.json();
        setConductores(data);
        if (data.length > 0 && !selectedConductorId) {
          setSelectedConductorId(data[0].id);
        }
      } else if (resRutas.status === 401 || resRutas.status === 403) {
        router.push('/login');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 10 seconds for GPS updates
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const selectedConductor = conductores.find(c => c.id === selectedConductorId);

  const optimizarRuta = async (conductorId: number) => {
    setActionLoading(true);
    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:3001/api/admin/torre-control/optimizar/${conductorId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchData();
    } catch(err) {
      console.error(err);
    }
    setActionLoading(false);
  };

  const invertirRuta = async (conductorId: number) => {
    setActionLoading(true);
    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:3001/api/admin/torre-control/invertir/${conductorId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchData();
    } catch(err) {
      console.error(err);
    }
    setActionLoading(false);
  };

  const moverOrden = async (conductorId: number, indexActual: number, indexNuevo: number) => {
    if (!selectedConductor) return;
    const entregas = [...selectedConductor.entregas];
    if (indexNuevo < 0 || indexNuevo >= entregas.length) return;

    // Swap
    const temp = entregas[indexActual];
    entregas[indexActual] = entregas[indexNuevo];
    entregas[indexNuevo] = temp;

    // Reassign order sequential
    const ordenamiento = entregas.map((e, idx) => ({ id: e.id, orden: idx + 1 }));

    setActionLoading(true);
    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:3001/api/admin/torre-control/ordenar-manual/${conductorId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ordenamiento })
      });
      await fetchData();
    } catch(err) {
      console.error(err);
    }
    setActionLoading(false);
  };

  const descargarPDF = () => {
    if (!selectedConductor || !selectedConductor.entregas) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(`Manifiesto de Ruta - ${selectedConductor.nombre}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableData = selectedConductor.entregas.map((e: any, idx: number) => [
      e.orden || idx + 1,
      e.pedido.nombreCliente,
      e.pedido.telefonoCliente || 'N/A',
      e.pedido.direccionEnvio,
      e.pedido.detalles.length + ' cajas'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Cliente', 'Teléfono', 'Dirección', 'Paquetes']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [74, 108, 111] }
    });

    doc.save(`Ruta_${selectedConductor.nombre.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen w-full overflow-hidden bg-slate-50">
      {/* Sidebar de Control */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Navigation className="w-6 h-6 text-[#4a6c6f]" />
            Control de Logística
          </h1>
          <p className="text-slate-500 text-sm mt-1">Supervisa y ordena las rutas en tiempo real.</p>
        </div>

        {/* Lista de Conductores (Tabs) */}
        <div className="flex overflow-x-auto p-4 gap-2 border-b border-slate-100 no-scrollbar">
          {conductores.length === 0 && !loading && (
            <p className="text-sm text-slate-500 text-center w-full">No hay conductores con rutas asignadas</p>
          )}
          {conductores.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedConductorId(c.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                selectedConductorId === c.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🚚 {c.nombre}
            </button>
          ))}
        </div>

        {/* Panel del Conductor Seleccionado */}
        <div className="flex-1 overflow-y-auto p-4 relative">
          {actionLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
          )}

          {selectedConductor && (
            <div className="space-y-6">
              {/* Acciones Rápidas */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => optimizarRuta(selectedConductor.id)}
                  className="flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 p-3 rounded-xl text-sm font-bold transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Optimizar Inteligente
                </button>
                <button 
                  onClick={() => invertirRuta(selectedConductor.id)}
                  className="flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 p-3 rounded-xl text-sm font-bold transition-colors"
                >
                  <ArrowDownUp className="w-4 h-4" /> Invertir Orden
                </button>
                <button 
                  onClick={descargarPDF}
                  className="col-span-2 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl text-sm font-bold transition-colors shadow-md"
                >
                  <FileDown className="w-4 h-4" /> Descargar Manifiesto PDF
                </button>
              </div>

              {/* Lista de Entregas (Control Manual) */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-purple-600" />
                  Orden de Entrega Forzado
                </h3>
                
                <div className="space-y-2">
                  {selectedConductor.entregas?.map((entrega: any, idx: number) => (
                    <div key={entrega.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <button 
                          onClick={() => moverOrden(selectedConductor.id, idx, idx - 1)}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-purple-600 disabled:opacity-30 disabled:hover:text-slate-400"
                        >
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <span className="font-black text-slate-800 text-lg">{entrega.orden || idx + 1}</span>
                        <button 
                          onClick={() => moverOrden(selectedConductor.id, idx, idx + 1)}
                          disabled={idx === selectedConductor.entregas.length - 1}
                          className="text-slate-400 hover:text-purple-600 disabled:opacity-30 disabled:hover:text-slate-400"
                        >
                          <ChevronDown className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{entrega.pedido.nombreCliente}</p>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" /> {entrega.pedido.direccionEnvio}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mapa Principal */}
      <div className="flex-1 h-full relative bg-slate-200">
        {loading && !conductores.length ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-50/80 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Cargando ubicación de flotilla...</p>
          </div>
        ) : (
          <AdminMap conductores={conductores} selectedConductorId={selectedConductorId} origen={origen} />
        )}
      </div>
    </div>
  );
}
