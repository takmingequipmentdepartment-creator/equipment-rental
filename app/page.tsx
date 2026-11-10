'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useCart } from '../store/useCart';

export default function Home() {
  const [equipments, setEquipments] = useState<any[]>([]);
  const addItem = useCart((state) => state.addItem);
  const items = useCart((state) => state.items);
  const [mounted, setMounted] = useState(false);

  const [selectedEq, setSelectedEq] = useState<any | null>(null);

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
    // 👉 1. 最外層背景：加入 dark:bg-slate-900
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8 transition-colors duration-300">
      {/* 👉 標題：加入 dark:text-blue-400 讓深色模式下的藍色亮一點 */}
      <h1 className="text-3xl font-bold text-center text-blue-600 dark:text-blue-400 mb-8">學生會設備借用系統</h1>
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {equipments.map((item) => {
          const currentQuantity = item.quantity ?? 0;
          
          const isAvailable = 
            (item.status === '可借用' || item.status === 'available' || item.status === 'Available') 
            && currentQuantity > 0;
          
          const displayStatus = 
            item.status === 'available' || item.status === 'Available' ? '可借用' : 
            item.status === 'unavailable' ? '目前無法借用' : 
            item.status;

          return (
            // 👉 2. 卡片本體：加入 dark:bg-slate-800 與 dark:border-slate-700
            <div 
              key={item.id} 
              onClick={() => setSelectedEq(item)}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden flex flex-col transition-transform hover:scale-105 cursor-pointer border border-gray-100 dark:border-slate-700"
            >
              {/* 圖片區塊背景 */}
              <div className="h-48 bg-gray-200 dark:bg-slate-700 relative flex items-center justify-center">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400 dark:text-gray-500 font-medium">無圖片</div>
                )}
                {currentQuantity === 0 && (
                  <div className="absolute inset-0 bg-white/60 dark:bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white font-bold px-4 py-1 rounded shadow-lg transform -rotate-12">庫存為 0</span>
                  </div>
                )}
              </div>
              
              <div className="p-5 flex-grow flex flex-col">
                {/* 👉 文字顏色：加入 dark:text-white 等 */}
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{item.name}</h3>
                <div className="flex justify-between items-center mb-4 text-sm text-gray-600 dark:text-gray-300">
                  <span>庫存：{currentQuantity}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    isAvailable ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                  }`}>
                    {displayStatus}
                  </span>
                </div>
                
                {mounted && (() => {
                  const cartItem = items.find((i) => i.id === item.id);
                  const isMaxReached = cartItem && cartItem.borrowQuantity >= currentQuantity;

                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
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
                          ? 'bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-slate-400 cursor-not-allowed'
                          : isMaxReached
                          ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400 cursor-not-allowed border border-orange-300 dark:border-orange-800'
                          : cartItem
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 border border-blue-500 dark:border-blue-700'
                          : 'bg-green-50 text-green-600 dark:bg-green-900/50 dark:text-green-400 hover:bg-green-500 hover:text-white dark:hover:bg-green-600 border border-green-500 dark:border-green-700'
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

      {/* 👉 3. 彈出視窗 Modal 深色模式支援 */}
      {selectedEq && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedEq(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative border dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            
            <button 
              onClick={() => setSelectedEq(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-full w-8 h-8 flex items-center justify-center z-10 font-bold transition-colors"
            >
              ✕
            </button>

            {selectedEq.image_url && (
              <img src={selectedEq.image_url} alt={selectedEq.name} className="w-full h-64 object-cover" />
            )}
            
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{selectedEq.name}</h2>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded font-bold text-sm">
                  剩餘數量：{selectedEq.quantity}
                </span>
                <span className={`px-3 py-1 rounded font-bold text-sm ${
                    (selectedEq.status === '可借用' || selectedEq.status === 'available' || selectedEq.status === 'Available') && selectedEq.quantity > 0
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {(selectedEq.status === '可借用' || selectedEq.status === 'available' || selectedEq.status === 'Available') && selectedEq.quantity > 0 ? '可借用' : '不可借用'}
                </span>
              </div>
              
              <div className="bg-gray-50 dark:bg-slate-700/50 border dark:border-slate-600 rounded-xl p-5 mb-8">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
                  📝 設備詳細說明
                </h3>
                {selectedEq.description ? (
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
                    {selectedEq.description}
                  </p>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 italic text-sm">管理員尚未提供此設備的說明。</p>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedEq(null)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors"
                >
                  關閉
                </button>
                {(() => {
                  const currentQty = selectedEq.quantity ?? 0;
                  const isAvailable = (selectedEq.status === '可借用' || selectedEq.status === 'available' || selectedEq.status === 'Available') && currentQty > 0;
                  const cartItem = items.find((i) => i.id === selectedEq.id);
                  const isMaxReached = cartItem && cartItem.borrowQuantity >= currentQty;

                  return (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem({ 
                          id: selectedEq.id, 
                          name: selectedEq.name, 
                          image_url: selectedEq.image_url, 
                          maxQuantity: currentQty 
                        });
                      }}
                      disabled={isMaxReached || !isAvailable}
                      className={`flex-1 py-3 font-bold rounded-xl transition-colors ${
                        !isAvailable || isMaxReached
                          ? 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
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
          </div>
        </div>
      )}
    </div>
  );
}