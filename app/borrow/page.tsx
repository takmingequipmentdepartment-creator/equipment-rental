'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BorrowForm() {
  const [equipmentName, setEquipmentName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  
  // 👉 新增：規則同意、動態規則、目前借用中名單的狀態
  const [isAgreed, setIsAgreed] = useState(false);
  const [dynamicRules, setDynamicRules] = useState('載入規則中...');
  const [activeBorrows, setActiveBorrows] = useState<any[]>([]);

  const router = useRouter();

  useEffect(() => {
    // 👉 新增：從資料庫 system_settings 撈取動態規則
    const fetchRules = async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('borrow_rules')
        .eq('id', 1)
        .single();
        
      if (data && !error) {
        setDynamicRules(data.borrow_rules);
      }
    };

    // 👉 新增：查詢目前有哪些人正在借用這個設備
    const fetchActiveBorrows = async (equip: string) => {
      const { data, error } = await supabase
        .from('rental_requests')
        .select('student_name, email') // 若有預計歸還日(return_date)也可加入
        .eq('equipment_name', equip)
        .eq('status', '已借出'); // 假設你的狀態欄位叫做 status

      if (data && !error) {
        setActiveBorrows(data);
      }
    };

    const params = new URLSearchParams(window.location.search);
    const equip = params.get('equip');
    
    if (equip) {
      setEquipmentName(equip);
      fetchActiveBorrows(equip);
    }
    
    fetchRules(); // 載入頁面時抓取規則
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 👉 新增防護：確保已勾選同意
    if (!isAgreed) {
      alert('請先閱讀並勾選同意借用規則！');
      return;
    }

    setMessage('🚀 申請送出中...');

    // 1. 寫入資料庫
    const { error } = await supabase
      .from('rental_requests')
      .insert([{
        equipment_name: equipmentName,
        student_name: studentName,
        phone: phone,
        email: email
      }]);

    if (error) {
      setMessage(`❌ 申請失敗：${error.message}`);
    } else {
      // 2. 寫入成功後：呼叫寄信 API 通知管理員
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'takmingequipmentdepartment@gmail.com', // 預設寄給管理員
          subject: `【新申請通知】${studentName} 想要借用 ${equipmentName}`,
          html: `系統收到一筆新的設備借用申請！\n\n申請人：${studentName}\n欲借設備：${equipmentName}\n聯絡電話：${phone}\n聯絡信箱：${email}\n\n👉 請盡速登入後台審核此申請！`
        })
      });

      setMessage('✅ 申請成功！請靜候管理員審核與 Email 通知。');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-10 bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md border border-gray-200">
        <h1 className="text-2xl font-bold text-green-600 mb-2 text-center">填寫借用申請單</h1>
        <p className="text-gray-500 text-sm text-center mb-6">請確實填寫聯絡資訊，審核結果將寄至您的信箱。</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">欲借用設備</label>
            <input type="text" required readOnly value={equipmentName} className="text-gray-600 w-full border border-gray-300 p-2 rounded-lg bg-gray-50 outline-none mb-1" />
            
            {/* 👉 新增：顯示目前誰正在借用此設備的提示區塊 */}
            {activeBorrows.length > 0 && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="text-xs font-bold text-amber-800 mb-1 flex items-center">
                  ⚠️ 此設備目前出借中：
                </h4>
                <ul className="space-y-1">
                  {activeBorrows.map((borrow, idx) => (
                    <li key={idx} className="text-xs text-amber-700 bg-white p-1.5 rounded border border-amber-100 flex justify-between">
                      <span>借用人：<span className="font-bold">{borrow.student_name}</span></span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-amber-600 mt-1">※ 您仍可送出申請，或先向目前借用人協調。</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">您的姓名</label>
            <input type="text" required value={studentName} onChange={(e) => setStudentName(e.target.value)} className="text-gray-900 w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="例如：王小明" />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">聯絡電話</label>
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="text-gray-900 w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="例如：0912345678" />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">聯絡 Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="text-gray-900 w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="接收審核通知用" />
          </div>

          {/* 👉 新增：借用規則同意勾選區塊 (動態抓取規則) */}
          <div className="flex items-start mt-2">
            <div className="flex items-center h-5">
              <input
                id="rules-agreement"
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
              />
            </div>
            <label 
              htmlFor="rules-agreement" 
              className="ml-3 text-sm font-medium text-gray-700 cursor-pointer leading-relaxed"
            >
              我已詳細閱讀並同意借用規則：
              <br />
              <span className="text-red-600 font-bold whitespace-pre-wrap">
                {dynamicRules}
              </span>
            </label>
          </div>

          <div className="flex gap-3 mt-4">
            <Link href="/" className="flex-1 text-center bg-gray-100 text-gray-600 font-bold py-2 rounded-lg hover:bg-gray-200 transition">取消</Link>
            
            {/* 👉 修改：按鈕加上 disabled 狀態判斷 */}
            <button 
              type="submit" 
              disabled={!isAgreed}
              className={`flex-1 font-bold py-2 px-4 rounded-lg transition-colors ${
                !isAgreed 
                  ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                  : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
              }`}
            >
              送出申請
            </button>
          </div>
        </form>

        {message && (
          <div className={`mt-4 text-center font-bold ${message.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>{message}</div>
        )}
      </div>
    </main>
  );
}