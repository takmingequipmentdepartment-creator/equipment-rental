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
  const [department, setDepartment] = useState('');
  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // 👉 新增：活動名稱與借用日期狀態
  const [activityName, setActivityName] = useState('');
  const [borrowDate, setBorrowDate] = useState('');
  
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
    
    // 👉 1. 前端資料格式驗證機制
    if (!borrowDate) {
      alert('⚠️ 請選擇借用日期！');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    if (borrowDate < today) {
      alert('⚠️ 借用日期不能是過去的時間！');
      return;
    }

    const phoneRegex = /^09\d{8}$/;
    if (!phoneRegex.test(phone.trim())) {
      alert('⚠️ 手機號碼格式錯誤！請輸入 09 開頭的 10 碼數字。');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      alert('⚠️ Email 格式錯誤！請輸入有效的電子信箱。');
      return;
    }

    setIsSubmitting(true);

    // 👉 2. 計算歸還日期 (借用日期 + 14 天)
    const bDate = new Date(borrowDate);
    const rDate = new Date(bDate);
    rDate.setDate(rDate.getDate() + 14);
    const returnDateString = rDate.toISOString().split('T')[0]; // 轉換為 YYYY-MM-DD 格式

    // 將購物車內的設備加上數量標籤 (例如: "相機 x2, 腳架 x1")
    const equipmentNames = items.map((item) => `${item.name} x${item.borrowQuantity}`).join(', ');

    // 👉 3. 預扣庫存邏輯 (升級為 RPC 行鎖防超賣)
    for (const item of items) {
      const { data: isSuccess, error: rpcError } = await supabase.rpc('reserve_equipment', {
        eq_id: item.id,
        borrow_qty: item.borrowQuantity
      });

      if (rpcError || !isSuccess) {
        alert(`⚠️ 糟糕！【${item.name}】的庫存已被其他人搶先借走或庫存不足！請重新確認清單。`);
        setIsSubmitting(false);
        return; // 立即終止流程，不寫入訂單
      }
    }

    // 4. 寫入申請單資料表 (加入活動名稱、借用日與歸還日)
    const { error } = await supabase.from('rental_requests').insert([
      {
        equipment_name: equipmentNames,
        department: department.trim(),
        student_name: studentName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        activity_name: activityName.trim(),    // 👉 新增欄位
        borrow_date: borrowDate,        // 👉 新增欄位
        return_date: returnDateString,  // 👉 新增欄位 (自動計算)
        status: '審核中',
      },
    ]);

    if (error) {
      alert('申請失敗，請稍後再試。錯誤代碼：' + error.message);
      setIsSubmitting(false);
      return;
    }

    // 5. 呼叫通知 API，發送信件給管理員 (一併附上新欄位供信件模板使用)
    fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: studentName.trim(),
        department: department.trim(),
        equipmentName: equipmentNames,
        email: email.trim(),
        phone: phone.trim(),
        activityName: activityName.trim(),    // 傳給後端 API
        borrowDate: borrowDate,        // 傳給後端 API
        returnDate: returnDateString   // 傳給後端 API
      })
    }).catch(err => console.error("管理員通知信發送失敗:", err));

    setIsSubmitting(false);
    alert(`✅ 借用申請已成功送出！\n系統已為您自動設定應歸還日為：${returnDateString}`);
    clearCart();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row">
        
        {/* 左側：借用清單 */}
        <div className="md:w-[55%] p-6 sm:p-8 bg-gray-50 border-b md:border-b-0 md:border-r">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🛒 您的借用清單</h2>
          
          {items.length === 0 ? (
            <div className="text-gray-500 text-center py-10">
              <p>清單目前是空的</p>
              <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block font-bold">
                &larr; 回首頁繼續挑選設備
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg shadow-sm gap-4 border border-gray-100">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-md border" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 border rounded-md flex items-center justify-center text-xs text-gray-400 shrink-0">無圖</div>
                    )}
                    <span className="font-bold text-gray-700 text-lg">{item.name}</span>
                  </div>
                  
                  <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
                    <div className="flex items-center bg-gray-100 rounded-lg border border-gray-200">
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)} 
                        className="px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-l-lg font-bold transition-colors"
                      >
                        -
                      </button>
                      <span className="px-4 font-bold text-blue-600 w-12 text-center bg-white py-2 border-x">{item.borrowQuantity}</span>
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)} 
                        className="px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-r-lg font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-white hover:bg-red-500 text-sm font-bold px-3 py-2 rounded-lg transition-colors border border-red-200 hover:border-red-500"
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
        <div className="md:w-[45%] p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📝 填寫申請人資料</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* 👉 新增：活動名稱 */}
            <div>
              <label className="block text-gray-700 font-bold mb-1 text-sm">活動名稱 (Activity Name)</label>
              <input
                type="text"
                required
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-shadow"
                placeholder="例如：資管系系卡展、迎新宿營"
              />
            </div>

            {/* 👉 新增：借用日期 */}
            <div>
              <label className="block text-gray-700 font-bold mb-1 text-sm">借用日期 (Borrow Date)</label>
              <input
                type="date"
                required
                value={borrowDate}
                min={new Date().toISOString().split('T')[0]} // 防止選到過去的時間
                onChange={(e) => setBorrowDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-shadow"
              />
              {borrowDate && (
                <p className="mt-1.5 text-xs text-blue-600 font-bold bg-blue-50 p-2 rounded border border-blue-100">
                  💡 系統將自動設定歸還日為 14 天後
                </p>
              )}
            </div>

            {/* 原有欄位保留不變 */}
            <div>
              <label className="block text-gray-700 font-bold mb-1 text-sm">申請單位 (Department / Club)</label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-shadow"
                placeholder="請輸入系社名稱 (如：吉他社、資管系學會)"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1 text-sm">姓名 (Student Name)</label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-shadow"
                placeholder="請輸入真實姓名"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1 text-sm">聯絡電話 (Phone)</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-shadow"
                placeholder="09XXXXXXXX"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1 text-sm">電子信箱 (Email)</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-shadow"
                placeholder="接收審核與歸還通知信"
              />
            </div>
            
            <button
              type="submit"
              disabled={items.length === 0 || isSubmitting}
              className={`w-full py-3.5 rounded-lg font-bold text-white mt-8 transition-all shadow-md ${
                items.length === 0 || isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? '處理中...' : '確認送出申請'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}