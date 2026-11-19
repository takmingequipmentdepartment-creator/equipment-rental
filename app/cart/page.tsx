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

  const [isAgreed, setIsAgreed] = useState(false);
  const [dynamicRules, setDynamicRules] = useState('載入規則中...');

  useEffect(() => {
    setMounted(true);

    const fetchRules = async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('borrow_rules')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('抓取規則失敗詳細原因:', error);
        setDynamicRules('無法連線至資料庫取得規則，請聯繫德明學生會 設備部。');
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

    if (!isAgreed) {
      alert('請先詳細閱讀並勾選同意借用規則！');
      return;
    }

    if (!borrowDate) {
      alert('請選擇借用日期！');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    if (borrowDate < today) {
      alert('借用日期不能是過去的時間！');
      return;
    }

    const phoneRegex = /^09\d{8}$/;
    if (!phoneRegex.test(phone.trim())) {
      alert('手機號碼格式錯誤！請輸入 09 開頭的 10 碼數字。');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      alert('Email 格式錯誤！請輸入有效的電子信箱。');
      return;
    }

    setIsSubmitting(true);

    const bDate = new Date(borrowDate);
    const rDate = new Date(bDate);
    rDate.setDate(rDate.getDate() + 14);
    const returnDateString = rDate.toISOString().split('T')[0];

    const equipmentNames = items.map((item) => `${item.name} x${item.borrowQuantity}`).join(', ');

    // 1. 單一原子性交易：同時完成「扣庫存 + 寫入訂單」，任一步失敗自動整批回滾
    const { error: rpcError } = await supabase.rpc('submit_rental_order', {
      p_items: items.map((item) => ({
        id: item.id,
        qty: item.borrowQuantity,
      })),
      p_department: department.trim(),
      p_student_name: studentName.trim(),
      p_phone: phone.trim(),
      p_email: email.trim(),
      p_activity_name: activityName.trim(),
      p_borrow_date: borrowDate,
      p_return_date: returnDateString,
    });

    if (rpcError) {
      if (rpcError.message.includes('INSUFFICIENT_STOCK:')) {
        const failedName = rpcError.message.split('INSUFFICIENT_STOCK:')[1];
        alert(
          `【${failedName}】的庫存已被其他人搶先借走或庫存不足。\n系統已自動取消本次所有扣庫存，請重新確認清單。`
        );
      } else {
        alert('申請失敗，請稍後再試。錯誤代碼：' + rpcError.message);
      }
      setIsSubmitting(false);
      return;
    }

    // 2. 背景並行觸發管理員 Discord 通知與借用人確認信（不阻塞畫面，keepalive 確保跳轉仍能送完）
    void Promise.allSettled([
      fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          studentName: studentName.trim(),
          department: department.trim(),
          equipmentName: equipmentNames,
          email: email.trim(),
          phone: phone.trim(),
          activityName: activityName.trim(),
          borrowDate: borrowDate,
          returnDate: returnDateString,
        }),
      }).catch((err) => console.error('管理員通知發送失敗:', err)),
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          to: email.trim(),
          subject: `【德明學生會 設備部】借用申請送出成功通知`,
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #18181b; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="border-bottom: 1px solid #e4e4e7; padding-bottom: 12px; font-weight: 600;">借用申請送出成功</h2>
              <p>親愛的 <strong>${studentName.trim()}</strong> 您好：</p>
              <p>系統已收到您的設備借用申請，並已通知德明學生會 設備部管理員進行審核。</p>
              <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; font-size: 15px;">申請明細</h3>
                <ul style="list-style: none; padding-left: 0; margin-bottom: 0;">
                  <li style="margin-bottom: 8px;"><strong>借用單位：</strong>${department.trim()}</li>
                  <li style="margin-bottom: 8px;"><strong>活動名稱：</strong>${activityName.trim()}</li>
                  <li style="margin-bottom: 8px;"><strong>預計借用日：</strong>${borrowDate}</li>
                  <li style="margin-bottom: 8px;"><strong>預計歸還日：</strong><span style="color: #dc2626; font-weight: 600;">${returnDateString}</span></li>
                  <li><strong>借用設備：</strong><br/>
                    <div style="margin-top: 6px; padding-left: 10px; border-left: 2px solid #a1a1aa;">
                      ${equipmentNames.split(', ').join('<br/>')}
                    </div>
                  </li>
                </ul>
              </div>
              <p>審核完成後，系統會再次發送 Email 通知您最終審核結果，請留意信箱。</p>
              <p style="font-size: 12px; color: #71717a; margin-top: 30px; border-top: 1px solid #e4e4e7; padding-top: 15px;">
                ※ 此為系統自動發送之信件，請勿直接回覆。<br/>
                <strong>德明學生會 設備部</strong>
              </p>
            </div>
          `,
        }),
      }).catch((err) => console.error('借用者通知信發送失敗:', err)),
    ]);

    // 3. 資料庫寫入成功立即回饋並導回首頁
    setIsSubmitting(false);
    alert(`借用申請已成功送出！\n系統正在發送確認信至您的信箱，應歸還日預設為：${returnDateString}`);
    clearCart();
    router.push('/');
  };

  const inputClass =
    'w-full px-3.5 py-2 text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-colors placeholder-zinc-400 dark:placeholder-zinc-600';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-4 py-10 sm:px-8 transition-colors">
      <div className="max-w-5xl mx-auto bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col md:flex-row">
        
        {/* 左側：借用清單 */}
        <div className="md:w-[55%] p-6 sm:p-8 bg-zinc-50/50 dark:bg-zinc-950/30 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold tracking-tight mb-6">借用清單</h2>

          {items.length === 0 ? (
            <div className="text-zinc-500 dark:text-zinc-400 text-center py-16 text-sm">
              <p>清單目前是空的</p>
              <Link
                href="/"
                className="text-zinc-900 dark:text-zinc-100 underline underline-offset-4 hover:text-zinc-600 dark:hover:text-zinc-300 mt-4 inline-block font-medium"
              >
                &larr; 回首頁挑選設備
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 first:pt-0 gap-4"
                >
                  <div className="flex items-center gap-3.5 w-full sm:w-auto">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 object-cover rounded-md border border-zinc-200 dark:border-zinc-800"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md flex items-center justify-center text-xs text-zinc-400 shrink-0">
                        無圖
                      </div>
                    )}
                    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
                    <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="px-2.5 py-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm transition-colors"
                      >
                        -
                      </button>
                      <span className="px-3 text-sm font-medium w-10 text-center border-x border-zinc-200 dark:border-zinc-700 py-1">
                        {item.borrowQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="px-2.5 py-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 px-2 py-1.5 transition-colors"
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
          <h2 className="text-lg font-semibold tracking-tight mb-6">申請人資料</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1.5 text-xs">
                活動名稱
              </label>
              <input
                type="text"
                required
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                className={inputClass}
                placeholder="例如：資管系系卡展、迎新宿營"
              />
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1.5 text-xs">
                借用日期
              </label>
              <input
                type="date"
                required
                value={borrowDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setBorrowDate(e.target.value)}
                className={inputClass}
              />
              {borrowDate && (
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  系統將自動設定應歸還日為 14 天後
                </p>
              )}
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1.5 text-xs">
                申請單位
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className={inputClass}
                placeholder="系社名稱（如：吉他社、資管系學會）"
              />
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1.5 text-xs">
                姓名
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className={inputClass}
                placeholder="真實姓名"
              />
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1.5 text-xs">
                聯絡電話
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="09XXXXXXXX"
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1.5 text-xs">
                電子信箱
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="接收審核與歸還通知信"
              />
            </div>

            {/* 借用規則同意區塊 */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <label
                htmlFor="rules-agreement"
                className="flex items-start gap-3 cursor-pointer"
              >
                <input
                  id="rules-agreement"
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-zinc-900 dark:accent-zinc-100 rounded cursor-pointer shrink-0"
                />
                <span className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  我已詳細閱讀並同意借用規則：
                  <span className="block mt-1 text-red-600 dark:text-red-400 font-medium whitespace-pre-wrap">
                    {dynamicRules}
                  </span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={items.length === 0 || isSubmitting || !isAgreed}
              className={`w-full py-2.5 rounded-md text-sm font-medium mt-2 transition-colors ${
                items.length === 0 || isSubmitting || !isAgreed
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                  : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
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