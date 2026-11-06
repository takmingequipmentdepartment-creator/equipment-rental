'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  // 用來記錄目前是否為登入狀態 (預設為否)
  const [isLogin, setIsLogin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 網頁載入時，檢查是否有登入的 session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLogin(!!session);
    };
    checkUser();

    // 隨時監聽登入/登出動作，即時更新 Navbar
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLogin(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 登出功能
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/'); // 登出後跳回首頁
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex space-x-8 items-center w-full">
            <Link href="/" className="text-xl font-black text-blue-600 hover:text-blue-700 tracking-wider">
              德明設備部
            </Link>
            
            <div className="flex space-x-2 flex-1 justify-end">
              <Link href="/" className="text-gray-600 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-lg font-medium transition">
                設備清單
              </Link>
              
              {/* 👇 只有「已登入」才會顯示的按鈕 */}
              {isLogin && (
                <>
                  {/* 新增這行：審核後台按鈕 */}
                  <Link href="/dashboard" className="text-gray-600 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-lg font-medium transition">
                    審核後台
                  </Link>

                  <Link href="/add" className="text-gray-600 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-lg font-medium transition">
                    新增設備
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition"
                  >
                    登出
                  </button>
                </>
              )}
              
              {/* 👇 只有「未登入」才會顯示的管理員登入按鈕 */}
              {!isLogin && (
                <Link href="/login" className="text-gray-600 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-lg font-medium transition">
                  管理員登入
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}