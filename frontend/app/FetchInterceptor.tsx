'use client';

import { useEffect } from 'react';

export default function FetchInterceptor() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        let [resource, config] = args;
        
        // Si la petición va a nuestra API, siempre incluimos las credenciales (cookies)
        if (typeof resource === 'string' && resource.includes('/api/')) {
          config = config || {};
          config.credentials = 'include';
        } else if (resource instanceof Request && resource.url.includes('/api/')) {
          // No podemos modificar fácilmente el objeto Request directamente para las credenciales,
          // pero como SWR y Next.js en este proyecto pasan un string, el primer caso cubrirá el 99%.
          config = config || {};
          config.credentials = 'include';
        }
        
        return originalFetch(resource, config);
      };
    }
  }, []);

  return null;
}
