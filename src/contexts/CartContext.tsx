import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  id: string;
  title: string;
  price_mxn: number;
  quantity: number;
  images: string[];
  stock: number;
  variation_id?: string;
  variation_data?: {
    combination: Record<string, string>;
    sku?: string;
  };
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (product: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Determine Cart Key based on tenant/subdomain to isolate carts
  // In production (subdomains), localStorage is already isolated.
  // This helps in development/preview modes on shared domains.
  const getCartKey = () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const host = searchParams.get('host') || window.location.hostname;
      // Simple sanitization
      return `cart_${host.replace(/[^a-z0-9]/gi, '_')}`;
    } catch {
      return 'cart_default';
    }
  };

  const CART_KEY = getCartKey();

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_KEY);
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    } else {
      // Reset if no cart for this key (important when switching keys)
      setItems([]);
    }
  }, [CART_KEY]);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, CART_KEY]);

  const addItem = (product: Omit<CartItem, 'quantity'>) => {
    setItems(currentItems => {
      // Para productos con variaciones, comparar por id + variation_id
      const itemKey = product.variation_id ? `${product.id}_${product.variation_id}` : product.id;
      const existingItem = currentItems.find(item => {
        const existingKey = item.variation_id ? `${item.id}_${item.variation_id}` : item.id;
        return existingKey === itemKey;
      });

      if (existingItem) {
        // Check stock before adding
        if (existingItem.quantity >= product.stock) {
          return currentItems;
        }
        return currentItems.map(item => {
          const existingKey = item.variation_id ? `${item.id}_${item.variation_id}` : item.id;
          return existingKey === itemKey
            ? { ...item, quantity: item.quantity + 1 }
            : item;
        });
      }

      return [...currentItems, { ...product, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    setItems(currentItems =>
      currentItems.map(item => {
        if (item.id === id) {
          // Check stock limit
          const newQuantity = Math.min(quantity, item.stock);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const toggleCart = () => {
    setIsOpen(prev => !prev);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = items.reduce(
    (total, item) => {
      const price = item.price_mxn || 0; // Protección contra undefined
      return total + (price * item.quantity);
    },
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalPrice,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isOpen,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};