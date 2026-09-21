'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Maximize, Map as MapIcon } from 'lucide-react';

interface MapProps {
  entregas: any[];
  origen: { lat: number, lng: number } | null;
  rutaGeometry: any;
}

const getMarkerIcon = (index: number) => {
  return L.divIcon({
    className: 'custom-div-icon bg-transparent border-0',
    html: `<div style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; background-color:#9333ea; color:white; border-radius:9999px; font-weight:bold; border:2px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);">${index}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const bodegaIcon = L.divIcon({
  className: 'custom-div-icon bg-transparent border-0',
  html: `<div style="width:40px; height:40px; display:flex; align-items:center; justify-content:center; background-color:#0f172a; color:white; border-radius:12px; border:2px solid white; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Componente para auto-ajustar la vista
const BoundsComponent = ({ bounds }: { bounds: L.LatLngBounds }) => {
  const map = useMap();
  React.useEffect(() => {
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
};

// Componente para botones flotantes personalizados
const MapOverlayControls = ({ currentPos }: { currentPos: { lat: number, lng: number } | null }) => {
  const map = useMap();
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  return (
    <>
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-800/90 backdrop-blur text-white px-5 py-2.5 rounded-full shadow-xl font-bold text-sm pointer-events-none transition-opacity duration-300">
          {toastMessage}
        </div>
      )}
      <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto', marginTop: '60px' }}>
        <div className="leaflet-control leaflet-bar" style={{ display: 'flex', flexDirection: 'column' }}>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (currentPos) map.flyTo([currentPos.lat, currentPos.lng], 16);
              else showToast("Buscando señal GPS...");
            }}
            className="bg-white hover:bg-slate-50 p-2 text-slate-700 border-b border-slate-200 transition-colors"
            title="Centrar en mi ubicación"
          >
            <LocateFixed className="w-5 h-5" />
          </button>
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
            className="bg-white hover:bg-slate-50 p-2 text-slate-700 transition-colors"
            title="Pantalla Completa"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default function MapComponent({ entregas, origen, rutaGeometry }: MapProps) {
  const [currentPos, setCurrentPos] = React.useState<{lat: number, lng: number} | null>(null);

  React.useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => console.warn('Error obteniendo ubicación GPS:', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const validEntregas = entregas.filter(e => e.pedido.latitud && e.pedido.longitud);
  
  if (validEntregas.length === 0) return null;

  // Centro por defecto: la primera entrega o el origen
  const center = origen ? [origen.lat, origen.lng] : [validEntregas[0].pedido.latitud, validEntregas[0].pedido.longitud];

  // Extraer las coordenadas de la ruta de GeoJSON
  let polylinePositions: [number, number][] = [];
  let bounds = L.latLngBounds([]);

  if (rutaGeometry && rutaGeometry.coordinates) {
    // GeoJSON usa [lng, lat], Leaflet usa [lat, lng]
    polylinePositions = rutaGeometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
    polylinePositions.forEach(pos => bounds.extend(pos));
  } else {
    // Fallback: usar las coordenadas de los pines para los bounds
    if (origen) bounds.extend([origen.lat, origen.lng]);
    validEntregas.forEach(e => bounds.extend([e.pedido.latitud!, e.pedido.longitud!]));
  }
  
  // Extendemos bounds para incluir la posición actual si existe
  if (currentPos) {
    bounds.extend([currentPos.lat, currentPos.lng]);
  }

  const truckIcon = L.divIcon({
    className: 'custom-div-icon bg-transparent border-0',
    html: `<div style="width:40px; height:40px; display:flex; align-items:center; justify-content:center; background-color:#ef4444; color:white; border-radius:50%; border:2px solid white; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-9h-4V5H14v12h3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  return (
    <MapContainer 
      key={`${center[0]}-${center[1]}-${validEntregas.length}`}
      center={center as [number, number]} 
      zoom={13} 
      style={{ height: '100%', width: '100%', zIndex: 1 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapOverlayControls currentPos={currentPos} />

      {origen && (
        <Marker position={[origen.lat, origen.lng]} icon={bodegaIcon}>
          <Popup><strong>📍 Mi Bodega</strong><br/>Punto de partida</Popup>
        </Marker>
      )}

      {validEntregas.map((entrega, index) => (
        <Marker 
          key={entrega.id} 
          position={[entrega.pedido.latitud!, entrega.pedido.longitud!]} 
          icon={getMarkerIcon(index + 1)}
        >
          <Popup>
            <strong>{entrega.pedido.nombreCliente}</strong><br/>
            {entrega.pedido.direccionEnvio}
          </Popup>
        </Marker>
      ))}
      
      {currentPos && (
        <Marker position={[currentPos.lat, currentPos.lng]} icon={truckIcon} zIndexOffset={1000}>
          <Popup><strong>🚚 Mi Camión</strong><br/>Ubicación actual</Popup>
        </Marker>
      )}

      {polylinePositions.length > 0 && (
        <Polyline positions={polylinePositions} pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.8 }} />
      )}

      {bounds.isValid() && <BoundsComponent bounds={bounds} />}
    </MapContainer>
  );
}
