'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useRouter } from 'next/navigation';
import { useCart } from '../store/useCart';

export default function Navbar() {
  // 用來記錄目前是否為登入狀態
  const [isLogin, setIsLogin] = useState(false);
  // 新增：用來控制手機版漢堡選單的開關狀態
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  // 抓取購物車內的設備狀態
  const items = useCart((state) => state.items);
  // 避免 Next.js 伺服器與客戶端渲染不一致的 Hydration 問題
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLogin(!!session);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLogin(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false); // 登出後自動關閉選單
    router.push('/');
  };

  return (
    <nav className="bg-white shadow-md p-4 relative z-50">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        
        {/* 左側 Logo / 標題 */}
        <Link href="/" className="text-xl font-bold text-blue-600 whitespace-nowrap">
          德明設備部
        </Link>

        {/* 手機版：漢堡選單按鈕 (只有在 md 尺寸以下才會顯示) */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden text-gray-600 hover:text-black focus:outline-none text-2xl px-2"
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>

        {/* 右側選單 (電腦版單排顯示，手機版則由漢堡按鈕控制展開/收合) */}
        <div className={`
          absolute md:static top-full left-0 w-full md:w-auto bg-white md:bg-transparent shadow-md md:shadow-none
          flex-col md:flex-row gap-4 md:items-center p-4 md:p-0 transition-all duration-200
          ${isMenuOpen ? 'flex' : 'hidden md:flex'}
        `}>
          <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-gray-600 hover:text-black py-2 md:py-0">
            設備清單
          </Link>
          
          {isLogin && (
            <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="text-gray-600 hover:text-black py-2 md:py-0">
              審核後台
            </Link>
          )}
          {/* 加入這一行：設備管理 */}
          {isLogin && (
            <Link href="/manage" onClick={() => setIsMenuOpen(false)} className="text-gray-600 hover:text-black py-2 md:py-0">
              設備管理
            </Link>
          )}

          {mounted && (
            <Link href="/cart" onClick={() => setIsMenuOpen(false)} className="relative inline-flex items-center justify-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full hover:bg-blue-200 transition w-max">
              🛒 借用清單
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Link>
          )}

          {isLogin ? (
            <button onClick={handleLogout} className="text-red-600 hover:text-red-800 font-medium py-2 md:py-0 text-left md:ml-2">
              登出
            </button>
          ) : (
            <Link href="/login" onClick={() => setIsMenuOpen(false)} className="text-blue-600 hover:text-blue-800 font-medium py-2 md:py-0 md:ml-2">
              管理員登入
            </Link>
          )}
        </div>
        
      </div>
    </nav>
  );
}