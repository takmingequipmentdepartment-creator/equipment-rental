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
      const { data } = await supabase.from('equipments').select('*');
      if (data) {
        setEquipments(data);
      }
    };
    fetchEquipments();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-4 py-10 sm:px-8 transition-colors">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            設備借用清單
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            德明學生會 設備部
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {equipments.map((item) => {
            const currentQuantity = item.quantity ?? 0;
            const isAvailable =
              (item.status === '可借用' || item.status === 'available' || item.status === 'Available') &&
              currentQuantity > 0;

            const displayStatus =
              item.status === 'available' || item.status === 'Available'
                ? '可借用'
                : item.status === 'unavailable'
                ? '暫停借用'
                : item.status;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedEq(item)}
                className="group bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 overflow-hidden flex flex-col cursor-pointer transition-colors"
              >
                <div className="h-44 bg-zinc-100 dark:bg-zinc-800/60 relative flex items-center justify-center overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">無圖片</span>
                  )}
                  {currentQuantity === 0 && (
                    <div className="absolute inset-0 bg-white/75 dark:bg-zinc-950/75 flex items-center justify-center">
                      <span className="text-xs font-medium tracking-wider text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 rounded">
                        目前無庫存
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex-grow flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 leading-snug">
                      {item.name}
                    </h3>
                  </div>

                  <div className="flex justify-between items-center mb-5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>庫存 {currentQuantity}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isAvailable ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-600'
                        }`}
                      />
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
                            maxQuantity: currentQuantity,
                          });
                        }}
                        disabled={isMaxReached || !isAvailable}
                        className={`mt-auto w-full py-2 rounded-md text-sm font-medium transition-colors ${
                          !isAvailable || isMaxReached
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                            : cartItem
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                        }`}
                      >
                        {!isAvailable
                          ? '無法借用'
                          : isMaxReached
                          ? '已達上限'
                          : cartItem
                          ? `已加入 (${cartItem.borrowQuantity}) +1`
                          : '加入清單'}
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 設備詳情 Modal */}
      {selectedEq && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedEq(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-xl max-w-lg w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedEq(null)}
              className="absolute top-3 right-3 bg-white/80 dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md w-8 h-8 flex items-center justify-center text-sm transition-colors"
            >
              ✕
            </button>

            {selectedEq.image_url && (
              <img
                src={selectedEq.image_url}
                alt={selectedEq.name}
                className="w-full h-60 object-cover border-b border-zinc-200 dark:border-zinc-800"
              />
            )}

            <div className="p-6">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                {selectedEq.name}
              </h2>
              <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                <span>剩餘庫存：{selectedEq.quantity}</span>
                <span>·</span>
                <span>
                  {(selectedEq.status === '可借用' ||
                    selectedEq.status === 'available' ||
                    selectedEq.status === 'Available') &&
                  selectedEq.quantity > 0
                    ? '可借用'
                    : '不可借用'}
                </span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-6">
                <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  設備說明
                </h3>
                {selectedEq.description ? (
                  <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed text-sm">
                    {selectedEq.description}
                  </p>
                ) : (
                  <p className="text-zinc-400 dark:text-zinc-500 text-sm">尚無詳細說明。</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedEq(null)}
                  className="flex-1 py-2.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 text-sm font-medium rounded-md transition-colors"
                >
                  關閉
                </button>
                {(() => {
                  const currentQty = selectedEq.quantity ?? 0;
                  const isAvailable =
                    (selectedEq.status === '可借用' ||
                      selectedEq.status === 'available' ||
                      selectedEq.status === 'Available') &&
                    currentQty > 0;
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
                          maxQuantity: currentQty,
                        });
                      }}
                      disabled={isMaxReached || !isAvailable}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
                        !isAvailable || isMaxReached
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                          : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                      }`}
                    >
                      {!isAvailable
                        ? '無法借用'
                        : isMaxReached
                        ? '已達上限'
                        : cartItem
                        ? `已加入 (${cartItem.borrowQuantity}) +1`
                        : '加入清單'}
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