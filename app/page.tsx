'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useCart } from '../store/useCart';

export default function Home() {
  const [equipments, setEquipments] = useState<any[]>([]);
  const addItem = useCart((state) => state.addItem);
  const items = useCart((state) => state.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchEquipments = async () => {
      const { data, error } = await supabase.from('equipments').select('*');
      if (data) {
        setEquipments(data);
      }
    };
    fetchEquipments();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-center text-blue-600 mb-8">學生會設備借用系統</h1>
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {equipments.map((item) => {
          const currentQuantity = item.quantity ?? 0;
          
          const isAvailable = 
            (item.status === '可借用' || item.status === 'available' || item.status === 'Available') 
            && currentQuantity > 0;
          
          // 狀態文字中文化轉換
          const displayStatus = 
            item.status === 'available' || item.status === 'Available' ? '可借用' : 
            item.status === 'unavailable' ? '目前無法借用' : 
            item.status;

          return (
            <div key={item.id} className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col transition-transform hover:scale-105">
              <div className="h-48 bg-gray-200 relative">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">無圖片</div>
                )}
              </div>
              
              <div className="p-5 flex-grow flex flex-col">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{item.name}</h3>
                <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                  <span>庫存：{currentQuantity}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {displayStatus}
                  </span>
                </div>
                
                {mounted && (() => {
                  const cartItem = items.find((i) => i.id === item.id);
                  const isMaxReached = cartItem && cartItem.borrowQuantity >= currentQuantity;

                  return (
                    <button
                      onClick={() => {
                        addItem({ 
                          id: item.id, 
                          name: item.name, 
                          image_url: item.image_url, 
                          maxQuantity: currentQuantity 
                        });
                      }}
                      disabled={isMaxReached || !isAvailable}
                      className={`mt-auto w-full py-2 rounded-lg font-bold transition-colors ${
                        !isAvailable
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : isMaxReached
                          ? 'bg-orange-100 text-orange-600 cursor-not-allowed border border-orange-300'
                          : cartItem
                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-500'
                          : 'bg-green-50 text-green-600 hover:bg-green-500 hover:text-white border border-green-500'
                      }`}
                    >
                      {!isAvailable 
                        ? '目前無法借用' 
                        : isMaxReached 
                        ? '已達庫存上限' 
                        : cartItem 
                        ? `再加一個 (已選 ${cartItem.borrowQuantity})` 
                        : '加入借用清單'}
                    </button>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}