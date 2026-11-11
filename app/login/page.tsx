'use client';

import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('登入中...');

    // 呼叫 Supabase 的信箱密碼登入功能
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setMessage(`❌ 登入失敗：${error.message}`);
    } else {
      setMessage('✅ 登入成功！準備跳轉...');
      // 登入成功後，重新整理路由狀態並跳轉回首頁
      router.refresh();
      router.push('/');
    }
  };

  return (
    // 👉 外層背景加上 dark:bg-slate-900
    <main className="flex min-h-screen flex-col items-center justify-center p-10 bg-gray-100 dark:bg-slate-900 transition-colors duration-300">
      
      {/* 👉 卡片本體加上 dark:bg-slate-800 與 dark:border-slate-700 */}
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 transition-colors">
        
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-6 text-center">管理員登入</h1>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            {/* 👉 標籤文字加上 dark:text-gray-300 */}
            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">電子郵件</label>
            {/* 👉 輸入框加上深色背景、深色邊框與白字 */}
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 w-full border border-gray-300 dark:border-slate-600 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="輸入管理員信箱"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">密碼</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 w-full border border-gray-300 dark:border-slate-600 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="輸入密碼"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition mt-2 shadow-sm"
          >
            登入
          </button>
        </form>

        {message && (
          // 👉 錯誤與成功提示的深色模式對應顏色
          <div className={`mt-4 text-center font-medium ${message.includes('失敗') ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {message}
          </div>
        )}
      </div>
    </main>
  );
}