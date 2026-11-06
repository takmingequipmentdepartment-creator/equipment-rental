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
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const equip = params.get('equip');
    if (equip) setEquipmentName(equip);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // 2. 寫入成功後：呼叫假寄信 API 通知管理員
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
            <input type="text" required readOnly value={equipmentName} className="text-gray-600 w-full border border-gray-300 p-2 rounded-lg bg-gray-50 outline-none" />
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

          <div className="flex gap-3 mt-4">
            <Link href="/" className="flex-1 text-center bg-gray-100 text-gray-600 font-bold py-2 rounded-lg hover:bg-gray-200 transition">取消</Link>
            <button type="submit" className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition">送出申請</button>
          </div>
        </form>

        {message && (
          <div className={`mt-4 text-center font-bold ${message.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>{message}</div>
        )}
      </div>
    </main>
  );
}