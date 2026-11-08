'use client';

import { useState, useEffect } from 'react';
import { useCart } from '../../store/useCart';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CartPage() {
  const { items, removeItem, clearCart, updateQuantity } = useCart();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // 申請人表單狀態
  const [department, setDepartment] = useState(''); // 自行輸入的申請單位
  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // 處理表單送出與預扣庫存
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('您的借用清單是空的！');
      return;
    }
    setIsSubmitting(true);

    // 將購物車內的設備加上數量標籤 (例如: "相機 x2, 腳架 x1")
    const equipmentNames = items.map((item) => `${item.name} x${item.borrowQuantity}`).join(', ');

    // 1. 寫入申請單資料表（包含 department 欄位）
    const { error } = await supabase.from('rental_requests').insert([
      {
        equipment_name: equipmentNames,
        department: department,
        student_name: studentName,
        phone: phone,
        email: email,
        status: '審核中',
      },
    ]);

    if (error) {
      alert('申請失敗，請稍後再試。錯誤代碼：' + error.message);
      setIsSubmitting(false);
      return;
    }

    // 2. 預扣庫存邏輯 (扣除該學生借用的精確數量)
    for (const item of items) {
      const { data: eqData } = await supabase
        .from('equipments')
        .select('quantity, status')
        .eq('id', item.id)
        .single();

      if (eqData) {
        const currentQuantity = eqData.quantity ?? 0;
        const newQuantity = Math.max(0, currentQuantity - item.borrowQuantity);
        const newStatus = newQuantity === 0 ? 'unavailable' : eqData.status;

        await supabase
          .from('equipments')
          .update({ quantity: newQuantity, status: newStatus })
          .eq('id', item.id);
      }
    }

    setIsSubmitting(false);
    alert('✅ 借用申請已成功送出！設備已為您保留，請等候審核。');
    clearCart();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row">
        
        {/* 左側：借用清單 */}
        <div className="md:w-[55%] p-8 bg-gray-50 border-r">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🛒 您的借用清單</h2>
          
          {items.length === 0 ? (
            <div className="text-gray-500 text-center py-10">
              <p>清單目前是空的</p>
              <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
                回首頁繼續挑選設備
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded shadow-sm gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400 shrink-0">無圖</div>
                    )}
                    <span className="font-bold text-gray-700">{item.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-gray-100 rounded-lg border">
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)} 
                        className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded-l-lg font-bold"
                      >
                        -
                      </button>
                      <span className="px-4 font-bold text-blue-600 w-10 text-center">{item.borrowQuantity}</span>
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)} 
                        className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded-r-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-bold px-3 py-2 bg-red-50 rounded"
                    >
                      移除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 右側：申請人資料表單 */}
        <div className="md:w-[45%] p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📝 填寫申請人資料</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-bold mb-2">申請單位 (Department / Club)</label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="請輸入系社名稱 (如：吉他社、資管系學會)"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">姓名 (Student Name)</label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="請輸入姓名"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">聯絡電話 (Phone)</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="請輸入手機號碼"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">電子信箱 (Email)</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="接收審核通知信"
              />
            </div>
            <button
              type="submit"
              disabled={items.length === 0 || isSubmitting}
              className={`w-full py-3 rounded-lg font-bold text-white mt-6 transition-colors ${
                items.length === 0 || isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? '送出中...' : '確認送出申請'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}