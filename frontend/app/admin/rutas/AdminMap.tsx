'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MapOverlayControls = () => {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto', marginTop: '60px' }}>
      <div className="leaflet-control leaflet-bar" style={{ display: 'flex', flexDirection: 'column' }}>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const container = map.getContainer();
            if (!document.fullscreenElement) {
              container.requestFullscreen().catch(err => console.log(err));
            } else {
              document.exitFullscreen();
            }
          }}
          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-950 p-2 text-slate-700 dark:text-slate-200 transition-colors"
          title="Pantalla Completa"
        >
          <Maximize className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const bodegaIcon = L.divIcon({
  className: 'custom-div-icon bg-transparent border-0',
  html: `<div style="width:40px; height:40px; display:flex; align-items:center; justify-content:center; background-color:#0f172a; color:white; border-radius:50%; border:2px solid white; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const getMarkerIcon = (number: number, isSelected: boolean) => L.divIcon({
  className: 'custom-div-icon bg-transparent border-0',
  html: `<div style="width:30px; height:30px; display:flex; align-items:center; justify-content:center; background-color:${isSelected ? '#8b5cf6' : '#f8fafc'}; color:${isSelected ? 'white' : '#475569'}; border-radius:50%; font-weight:bold; border:2px solid ${isSelected ? 'white' : '#cbd5e1'}; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); font-size: 14px;">
           ${number}
         </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const getTruckIcon = (nombre: string) => L.divIcon({
  className: 'custom-div-icon bg-transparent border-0',
  html: `<div style="display:flex; flex-direction:column; align-items:center;">
           <div style="background-color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap;">${nombre}</div>
           <div style="width:40px; height:40px; display:flex; align-items:center; justify-content:center; background-color:#ef4444; color:white; border-radius:50%; border:2px solid white; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-9h-4V5H14v12h3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
           </div>
         </div>`,
  iconSize: [60, 60],
  iconAnchor: [30, 40]
});

const BoundsComponent = ({ bounds, selectedConductorId }: { bounds: L.LatLngBounds, selectedConductorId: number | null }) => {
  const map = useMap();
  const [lastSelected, setLastSelected] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    // Solo ajustar el zoom la primera vez o cuando el administrador cambia de pestaña (conductor)
    if (bounds.isValid() && lastSelected !== selectedConductorId) {
      map.fitBounds(bounds, { padding: [40, 40] });
      setLastSelected(selectedConductorId);
    }
  }, [bounds, map, selectedConductorId, lastSelected]);
  return null;
};

export default function AdminMap({ conductores, selectedConductorId, origen }: any) {
  const bounds = L.latLngBounds([]);
  
  if (origen) bounds.extend([origen.lat, origen.lng]);

  const markers: any[] = [];
  const trucks: any[] = [];
  const polylines: any[] = [];

  conductores.forEach((c: any) => {
    const isSelected = c.id === selectedConductorId;
    
    if (c.latitud && c.longitud) {
      trucks.push(
        <Marker key={`truck-${c.id}`} position={[c.latitud, c.longitud]} icon={getTruckIcon(c.nombre)} zIndexOffset={1000}>
          <Popup><strong>Camión:</strong> {c.nombre}</Popup>
        </Marker>
      );
      bounds.extend([c.latitud, c.longitud]);
    }

    if (c.entregas) {
      const coords: [number, number][] = [];
      if (origen) coords.push([origen.lat, origen.lng]);

      c.entregas.forEach((e: any, idx: number) => {
        if (e.pedido.latitud && e.pedido.longitud) {
          coords.push([e.pedido.latitud, e.pedido.longitud]);
          bounds.extend([e.pedido.latitud, e.pedido.longitud]);
          markers.push(
            <Marker key={`job-${e.id}`} position={[e.pedido.latitud, e.pedido.longitud]} icon={getMarkerIcon(e.orden || idx + 1, isSelected)} zIndexOffset={isSelected ? 600 : 400}>
              <Popup><strong>{e.pedido.nombreCliente}</strong><br/>Parada #{e.orden || idx + 1}</Popup>
            </Marker>
          );
        }
      });
      
      if (c.rutaGeometry && c.rutaGeometry.coordinates) {
        // Usar la ruta real de GeoJSON de ORS
        const routeCoords = c.rutaGeometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
        routeCoords.forEach((pos: [number, number]) => bounds.extend(pos));
        polylines.push(
          <Polyline 
            key={`route-${c.id}`} 
            positions={routeCoords} 
            pathOptions={{ 
              color: isSelected ? '#3b82f6' : '#94a3b8', 
              weight: isSelected ? 5 : 3, 
              opacity: isSelected ? 0.8 : 0.4,
              dashArray: isSelected ? '' : '5, 10'
            }} 
          />
        );
      } else {
        // Fallback: Líneas rectas entre puntos
        if (origen) coords.push([origen.lat, origen.lng]);
        if (coords.length > 1) {
          polylines.push(
            <Polyline 
              key={`route-fallback-${c.id}`} 
              positions={coords} 
              pathOptions={{ 
                color: isSelected ? '#8b5cf6' : '#94a3b8', 
                weight: isSelected ? 5 : 3, 
                opacity: isSelected ? 0.8 : 0.4,
                dashArray: '5, 10'
              }} 
            />
          );
        }
      }
    }
  });

  const center = origen ? [origen.lat, origen.lng] : [4.6097, -74.0817];

  return (
    <MapContainer center={center as [number, number]} zoom={12} style={{ height: '100%', width: '100%', zIndex: 1 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapOverlayControls />
      {origen && (
        <Marker position={[origen.lat, origen.lng]} icon={bodegaIcon} zIndexOffset={500}>
          <Popup>Bodega Principal</Popup>
        </Marker>
      )}
      {polylines}
      {markers}
      {trucks}
      {bounds.isValid() && <BoundsComponent bounds={bounds} selectedConductorId={selectedConductorId} />}
    </MapContainer>
  );
}
