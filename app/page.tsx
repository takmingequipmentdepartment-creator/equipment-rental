'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useCart } from '../store/useCart';

export default function Home() {
  const [equipments, setEquipments] = useState<any[]>([]);
  const addItem = useCart((state) => state.addItem);
  const items = useCart((state) => state.items);
  const [mounted, setMounted] = useState(false);

  // 👉 新增：控制彈出視窗所選擇的設備
  const [selectedEq, setSelectedEq] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
    const fetchEquipments = async () => {
      // 記得要選取所有欄位，包含我們剛新增的 description
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
            // 👉 在卡片外層加上 onClick 與 cursor-pointer 讓整張卡片可以被點擊
            <div 
              key={item.id} 
              onClick={() => setSelectedEq(item)}
              className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col transition-transform hover:scale-105 cursor-pointer border border-gray-100"
            >
              <div className="h-48 bg-gray-200 relative">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">無圖片</div>
                )}
                {/* 庫存為 0 時的浮水印提示 */}
                {currentQuantity === 0 && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <span className="bg-red-500 text-white font-bold px-4 py-1 rounded shadow-lg transform -rotate-12">庫存為 0</span>
                  </div>
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
                      // 👉 加上 e.stopPropagation() 避免點擊按鈕時觸發外層卡片的 onClick (打開 Modal)
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

      {/* 👉 新增：設備詳細說明 Modal 彈出視窗 */}
      {selectedEq && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedEq(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            
            <button 
              onClick={() => setSelectedEq(null)}
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 z-10 font-bold"
            >
              ✕
            </button>

            {selectedEq.image_url && (
              <img src={selectedEq.image_url} alt={selectedEq.name} className="w-full h-64 object-cover" />
            )}
            
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedEq.name}</h2>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded font-bold text-sm">
                  剩餘數量：{selectedEq.quantity}
                </span>
                <span className={`px-3 py-1 rounded font-bold text-sm ${
                    (selectedEq.status === '可借用' || selectedEq.status === 'available' || selectedEq.status === 'Available') && selectedEq.quantity > 0
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {(selectedEq.status === '可借用' || selectedEq.status === 'available' || selectedEq.status === 'Available') && selectedEq.quantity > 0 ? '可借用' : '不可借用'}
                </span>
              </div>
              
              <div className="bg-gray-50 border rounded-xl p-5 mb-8">
                <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                  📝 設備詳細說明
                </h3>
                {selectedEq.description ? (
                  <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm">
                    {selectedEq.description}
                  </p>
                ) : (
                  <p className="text-gray-400 italic text-sm">管理員尚未提供此設備的說明。</p>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedEq(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  關閉
                </button>
                {/* 借用按鈕邏輯跟卡片上的保持一致 */}
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
                        // 這裡選擇不自動關閉視窗，讓學生可以繼續看說明，或者你可以把下面這行取消註解
                        // setSelectedEq(null); 
                      }}
                      disabled={isMaxReached || !isAvailable}
                      className={`flex-1 py-3 font-bold rounded-xl transition-colors ${
                        !isAvailable || isMaxReached
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
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