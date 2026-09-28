'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Solo inicializa si la variable de entorno existe (protección para desarrollo local)
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (typeof window !== 'undefined' && posthogKey) {
      posthog.init(posthogKey, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com', // Por defecto US cloud
        person_profiles: 'identified_only', // Para no cobrar extra por usuarios anónimos en exceso
        capture_pageview: false // Desactivamos el automático porque Next.js App Router necesita uno manual
      });
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
