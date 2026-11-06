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
    <main className="flex min-h-screen flex-col items-center justify-center p-10 bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md border border-gray-200">
        <h1 className="text-2xl font-bold text-blue-600 mb-6 text-center">管理員登入</h1>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">電子郵件</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-gray-900 w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="輸入管理員信箱"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-1">密碼</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-gray-900 w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="輸入密碼"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition mt-2"
          >
            登入
          </button>
        </form>

        {message && (
          <div className={`mt-4 text-center font-medium ${message.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>
            {message}
          </div>
        )}
      </div>
    </main>
  );
}