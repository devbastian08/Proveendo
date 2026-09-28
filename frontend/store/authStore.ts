import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: any | null;
  token: string | null;
  login: (user: any, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => {
        // La sesión (token) se maneja silenciosamente por cookies httpOnly del backend.
        // Solo guardamos datos públicos del usuario en memoria y localStorage.
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token });
      },
      logout: () => {
        // Hacemos petición al backend para destruir la cookie segura
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/logout`, { method: 'POST' })
          .catch(err => console.error('Error logout:', err));
          
        localStorage.removeItem('token'); // Limpiamos por si quedaban rastros de la arquitectura vieja
        localStorage.removeItem('user');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
