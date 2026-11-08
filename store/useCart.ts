import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  image_url: string;
  borrowQuantity: number; // 學生想借的數量
  maxQuantity: number;    // 資料庫目前的庫存上限
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'borrowQuantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
}

export const useCart = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      // 加入清單 (如果已經在裡面，就自動數量 +1)
      addItem: (newItem) => set((state) => {
        const existingItem = state.items.find((i) => i.id === newItem.id);
        if (existingItem) {
          // 如果目前的借用數量還沒達到庫存上限，才允許 +1
          if (existingItem.borrowQuantity < existingItem.maxQuantity) {
            return {
              items: state.items.map((i) =>
                i.id === newItem.id ? { ...i, borrowQuantity: i.borrowQuantity + 1 } : i
              ),
            };
          }
          return state; // 超過庫存上限就不做事
        }
        // 第一次加入清單，預設數量為 1
        return { items: [...state.items, { ...newItem, borrowQuantity: 1 }] };
      }),
      
      removeItem: (id) => set((state) => ({
        items: state.items.filter((i) => i.id !== id),
      })),
      
      // 在購物車內增加或減少數量
      updateQuantity: (id, delta) => set((state) => ({
        items: state.items.map((i) => {
          if (i.id === id) {
            const newQty = i.borrowQuantity + delta;
            // 確保數量最少為 1，且不能超過庫存上限
            if (newQty >= 1 && newQty <= i.maxQuantity) {
              return { ...i, borrowQuantity: newQty };
            }
          }
          return i;
        })
      })),
      
      clearCart: () => set({ items: [] }),
    }),
    { name: 'cart-storage' } // 存在 localStorage 讓重新整理不會不見
  )
);