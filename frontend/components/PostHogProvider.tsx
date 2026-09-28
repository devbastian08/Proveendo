'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Solo inicializa si la variable de entorno existe (protección para desarrollo local)
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com', // Por defecto US cloud
        person_profiles: 'identified_only', // Para no cobrar extra por usuarios anónimos en exceso
        capture_pageview: false // Desactivamos el automático porque Next.js App Router necesita uno manual
      });
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
