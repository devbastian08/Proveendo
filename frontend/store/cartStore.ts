import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  categoria: string;
  imagenUrl: string | null;
}

export interface CartItem extends Producto {
  cantidad: number;
}

export interface CheckoutForm {
  nombreCliente: string;
  telefonoCliente: string;
  direccionEnvio: string;
}

interface CartState {
  cart: CartItem[];
  isCartOpen: boolean;
  addToCart: (producto: Producto) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, delta: number) => void;
  clearCart: () => void;
  setIsCartOpen: (isOpen: boolean) => void;
  totalCart: () => number;
  itemsCount: () => number;
  checkoutForm: CheckoutForm;
  setCheckoutForm: (form: CheckoutForm) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      isCartOpen: false,
      checkoutForm: {
        nombreCliente: '',
        telefonoCliente: '',
        direccionEnvio: ''
      },
      setCheckoutForm: (form) => set({ checkoutForm: form }),

      addToCart: (prod) => set((state) => {
        const existing = state.cart.find(item => item.id === prod.id);
        if (existing) {
          if (existing.cantidad >= prod.stock) return state; // No superar stock
          return {
            cart: state.cart.map(item => 
              item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item
            )
          };
        }
        return { cart: [...state.cart, { ...prod, cantidad: 1 }] };
      }),

      removeFromCart: (id) => set((state) => ({
        cart: state.cart.filter(item => item.id !== id)
      })),

      updateQuantity: (id, delta) => set((state) => ({
        cart: state.cart.map(item => {
          if (item.id === id) {
            const newQ = item.cantidad + delta;
            if (newQ > 0 && newQ <= item.stock) {
              return { ...item, cantidad: newQ };
            }
          }
          return item;
        })
      })),

      clearCart: () => set({ cart: [] }),
      
      setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),

      totalCart: () => get().cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0),
      
      itemsCount: () => get().cart.reduce((acc, item) => acc + item.cantidad, 0),
    }),
    {
      name: 'cart-storage', // Guarda el carrito en localStorage
    }
  )
);
