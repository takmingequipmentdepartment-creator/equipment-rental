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

  const [department, setDepartment] = useState('');
  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [activityName, setActivityName] = useState('');
  const [borrowDate, setBorrowDate] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 👉 新增：規則同意與動態規則狀態
  const [isAgreed, setIsAgreed] = useState(false);
  const [dynamicRules, setDynamicRules] = useState('載入規則中...');

  useEffect(() => {
    setMounted(true);

    // 👉 更新：加入完整的錯誤處理機制
    const fetchRules = async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('borrow_rules')
        .eq('id', 1)
        .single();
        
      if (error) {
        console.error('抓取規則失敗詳細原因:', error);
        setDynamicRules('無法連線至資料庫取得規則，請聯繫設備部管理員。');
      } else if (data) {
        setDynamicRules(data.borrow_rules);
      }
    };
    
    fetchRules();
  }, []);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('您的借用清單是空的！');
      return;
    }
    
    // 👉 新增防護：確保已勾選同意規則
    if (!isAgreed) {
      alert('⚠️ 請先詳細閱讀並勾選同意借用規則！');
      return;
    }
    
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

    const bDate = new Date(borrowDate);
    const rDate = new Date(bDate);
    rDate.setDate(rDate.getDate() + 14);
    const returnDateString = rDate.toISOString().split('T')[0]; 

    const equipmentNames = items.map((item) => `${item.name} x${item.borrowQuantity}`).join(', ');

    for (const item of items) {
      const { data: isSuccess, error: rpcError } = await supabase.rpc('reserve_equipment', {
        eq_id: item.id,
        borrow_qty: item.borrowQuantity
      });

      if (rpcError || !isSuccess) {
        alert(`⚠️ 糟糕！【${item.name}】的庫存已被其他人搶先借走或庫存不足！請重新確認清單。`);
        setIsSubmitting(false);
        return; 
      }
    }

    const { error } = await supabase.from('rental_requests').insert([
      {
        equipment_name: equipmentNames,
        department: department.trim(),
        student_name: studentName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        activity_name: activityName.trim(),
        borrow_date: borrowDate,
        return_date: returnDateString,
        status: '審核中',
      },
    ]);

    if (error) {
      alert('申請失敗，請稍後再試。錯誤代碼：' + error.message);
      setIsSubmitting(false);
      return;
    }

    fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: studentName.trim(),
        department: department.trim(),
        equipmentName: equipmentNames,
        email: email.trim(),
        phone: phone.trim(),
        activityName: activityName.trim(),
        borrowDate: borrowDate,
        returnDate: returnDateString
      })
    }).catch(err => console.error("管理員通知信發送失敗:", err));

    setIsSubmitting(false);
    alert(`✅ 借用申請已成功送出！\n系統已為您自動設定應歸還日為：${returnDateString}`);
    clearCart();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row border border-transparent dark:border-slate-700 transition-colors">
        
        {/* 左側：借用清單 */}
        <div className="md:w-[55%] p-6 sm:p-8 bg-gray-50 dark:bg-slate-800/50 border-b md:border-b-0 md:border-r border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">🛒 您的借用清單</h2>
          
          {items.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-center py-10">
              <p>清單目前是空的</p>
              <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block font-bold">
                &larr; 回首頁繼續挑選設備
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm gap-4 border border-gray-100 dark:border-slate-700 transition-colors">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-md border dark:border-slate-600" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 border dark:border-slate-600 rounded-md flex items-center justify-center text-xs text-gray-400 shrink-0">無圖</div>
                    )}
                    <span className="font-bold text-gray-700 dark:text-gray-200 text-lg">{item.name}</span>
                  </div>
                  
                  <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
                    <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors">
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)} 
                        className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-l-lg font-bold transition-colors"
                      >
                        -
                      </button>
                      <span className="px-4 font-bold text-blue-600 dark:text-blue-400 w-12 text-center bg-white dark:bg-slate-800 py-2 border-x border-gray-200 dark:border-slate-600 transition-colors">{item.borrowQuantity}</span>
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)} 
                        className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-r-lg font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 dark:text-red-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-500/80 text-sm font-bold px-3 py-2 rounded-lg transition-colors border border-red-200 dark:border-red-900/50 hover:border-red-500"
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
        <div className="md:w-[45%] p-6 sm:p-8 bg-white dark:bg-slate-800 transition-colors">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">📝 填寫申請人資料</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm">活動名稱 (Activity Name)</label>
              <input
                type="text"
                required
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="例如：資管系系卡展、迎新宿營"
              />
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm">借用日期 (Borrow Date)</label>
              <input
                type="date"
                required
                value={borrowDate}
                min={new Date().toISOString().split('T')[0]} 
                onChange={(e) => setBorrowDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {borrowDate && (
                <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 p-2 rounded border border-blue-100 dark:border-blue-800/50 transition-colors">
                  💡 系統將自動設定歸還日為 14 天後
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm">申請單位 (Department / Club)</label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="請輸入系社名稱 (如：吉他社、資管系學會)"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm">姓名 (Student Name)</label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="請輸入真實姓名"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm">聯絡電話 (Phone)</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="09XXXXXXXX"
                maxLength={10}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm">電子信箱 (Email)</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="接收審核與歸還通知信"
              />
            </div>

            {/* 👉 借用規則同意勾選區塊 (置於送出按鈕上方) */}
            <div className="flex items-start mt-6 mb-2">
              <div className="flex items-center h-5">
                <input
                  id="rules-agreement"
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                />
              </div>
              <label 
                htmlFor="rules-agreement" 
                className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer leading-relaxed"
              >
                我已詳細閱讀並同意借用規則：
                <br />
                <span className="text-red-600 dark:text-red-400 font-bold whitespace-pre-wrap">
                  {dynamicRules}
                </span>
              </label>
            </div>
            
            {/* 👉 按鈕加上 !isAgreed 的 disabled 狀態判斷 */}
            <button
              type="submit"
              disabled={items.length === 0 || isSubmitting || !isAgreed}
              className={`w-full py-3.5 rounded-lg font-bold text-white mt-4 transition-all shadow-md ${
                items.length === 0 || isSubmitting || !isAgreed
                  ? 'bg-gray-400 dark:bg-slate-600 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 hover:shadow-lg active:scale-[0.98]'
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