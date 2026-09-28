'use client';
import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div role="dialog" aria-live="polite" aria-label="Aviso de cookies" className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 shadow-2xl z-50 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-sm">
        <p>
          <strong>Valoramos tu privacidad.</strong> Utilizamos cookies propias y de terceros para mejorar tu experiencia, analizar nuestro tráfico y garantizar la seguridad del sitio. Puedes leer nuestra <a href="/cookies" className="underline text-blue-400 hover:text-blue-300">Política de Cookies</a>.
        </p>
      </div>
      <div className="flex gap-3 shrink-0">
        <button onClick={handleDecline} className="px-4 py-2 text-sm font-medium border border-slate-600 rounded-lg hover:bg-slate-800 focus:ring-2 focus:ring-slate-400 focus:outline-none">
          Rechazar
        </button>
        <button onClick={handleAccept} className="px-4 py-2 text-sm font-bold bg-[#4a6c6f] text-white rounded-lg hover:bg-[#3a5658] focus:ring-2 focus:ring-[#56cbf9] focus:outline-none">
          Aceptar Cookies
        </button>
      </div>
    </div>
  );
}
