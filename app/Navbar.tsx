'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useRouter } from 'next/navigation';
import { useCart } from '../store/useCart';
// 👉 1. 引入剛剛寫好的 ThemeToggle 切換元件
import ThemeToggle from './ThemeToggle'; 

export default function Navbar() {
  const [isLogin, setIsLogin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const items = useCart((state) => state.items);
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
    setIsMenuOpen(false); 
    router.push('/');
  };

  return (
    // 👉 2. 導覽列最外層加上 dark:bg-slate-900 與 dark:border-slate-800 支援深色背景
    <nav className="bg-white dark:bg-slate-900 shadow-md p-4 relative z-50 transition-colors duration-300 border-b border-transparent dark:border-slate-800">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        
        {/* 左側 Logo / 標題 */}
        <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
          德明設備部
        </Link>

        {/* 手機版：漢堡選單按鈕 */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white focus:outline-none text-2xl px-2"
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>

        {/* 右側選單 */}
        <div className={`
          absolute md:static top-full left-0 w-full md:w-auto bg-white dark:bg-slate-900 md:bg-transparent shadow-md md:shadow-none
          flex-col md:flex-row gap-4 md:items-center p-4 md:p-0 transition-all duration-200
          ${isMenuOpen ? 'flex' : 'hidden md:flex'}
        `}>
          <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white py-2 md:py-0 font-medium">
            設備清單
          </Link>
          
          {isLogin && (
            <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white py-2 md:py-0 font-medium">
              審核後台
            </Link>
          )}
          {isLogin && (
            <Link href="/manage" onClick={() => setIsMenuOpen(false)} className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white py-2 md:py-0 font-medium">
              設備管理
            </Link>
          )}

          {mounted && (
            <Link href="/cart" onClick={() => setIsMenuOpen(false)} className="relative inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition w-max">
              🛒 借用清單
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Link>
          )}

          {/* 👉 3. 將 ThemeToggle 放在這裡！(借用清單的旁邊) */}
          <div className="py-2 md:py-0">
            <ThemeToggle />
          </div>

          {isLogin ? (
            <button onClick={handleLogout} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-bold py-2 md:py-0 text-left md:ml-2">
              登出
            </button>
          ) : (
            <Link href="/login" onClick={() => setIsMenuOpen(false)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold py-2 md:py-0 md:ml-2">
              管理員登入
            </Link>
          )}
        </div>
        
      </div>
    </nav>
  );
}