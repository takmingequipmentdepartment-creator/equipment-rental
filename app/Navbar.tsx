'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useRouter } from 'next/navigation';
import { useCart } from '../store/useCart';

export default function Navbar() {
  // 用來記錄目前是否為登入狀態
  const [isLogin, setIsLogin] = useState(false);
  const router = useRouter();

  // 抓取購物車內的設備狀態
  const items = useCart((state) => state.items);
  // 避免 Next.js 伺服器與客戶端渲染不一致的 Hydration 問題
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 標記元件已在客戶端掛載，可以安全顯示 localStorage 讀取出來的購物車數量
    setMounted(true);

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
    router.push('/');
  };

  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center">
      {/* 左側 Logo / 標題 */}
      <Link href="/" className="text-xl font-bold text-blue-600">
        德明設備部
      </Link>

      {/* 右側選單 */}
      <div className="flex gap-4 items-center">
        <Link href="/" className="text-gray-600 hover:text-black">
          設備清單
        </Link>
        
        {/* 只有管理員(已登入)才顯示審核後台 */}
        {isLogin && (
          <Link href="/dashboard" className="text-gray-600 hover:text-black">
            審核後台
          </Link>
        )}

        {/* 購物車按鈕 (需確保 mounted 後才渲染，避免報錯) */}
        {mounted && (
          <Link href="/cart" className="relative bg-blue-100 text-blue-800 px-4 py-2 rounded-full hover:bg-blue-200 transition">
            🛒 借用清單
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {items.length}
              </span>
            )}
          </Link>
        )}

        {/* 登入/登出按鈕切換 */}
        {isLogin ? (
          <button onClick={handleLogout} className="text-red-600 hover:text-red-800 font-medium ml-2">
            登出
          </button>
        ) : (
          <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium ml-2">
            管理員登入
          </Link>
        )}
      </div>
    </nav>
  );
}