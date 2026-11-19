'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useRouter } from 'next/navigation';
import { useCart } from '../store/useCart';
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="flex justify-between items-center max-w-6xl mx-auto px-4 sm:px-8 h-16">
        
        {/* 左側標題 */}
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap"
        >
          德明學生會 設備部
        </Link>

        {/* 手機版：漢堡選單按鈕 */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="切換選單"
          className="md:hidden text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 focus:outline-none text-xl px-2 py-1"
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>

        {/* 右側選單 */}
        <div
          className={`
            absolute md:static top-full left-0 w-full md:w-auto
            bg-white dark:bg-zinc-950 md:bg-transparent md:dark:bg-transparent
            border-b border-zinc-200 dark:border-zinc-800 md:border-none
            flex-col md:flex-row gap-4 md:gap-6 md:items-center px-4 py-5 md:p-0
            ${isMenuOpen ? 'flex' : 'hidden md:flex'}
          `}
        >
          <Link
            href="/"
            onClick={() => setIsMenuOpen(false)}
            className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors py-1 md:py-0"
          >
            設備清單
          </Link>

          {isLogin && (
            <>
              <Link
                href="/dashboard"
                onClick={() => setIsMenuOpen(false)}
                className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors py-1 md:py-0"
              >
                審核後台
              </Link>
              <Link
                href="/manage"
                onClick={() => setIsMenuOpen(false)}
                className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors py-1 md:py-0"
              >
                設備管理
              </Link>
            </>
          )}

          {mounted && (
            <Link
              href="/cart"
              onClick={() => setIsMenuOpen(false)}
              className="inline-flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors w-max"
            >
              <span>借用清單</span>
              {items.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-white/20 dark:bg-zinc-900/15 leading-none">
                  {items.length}
                </span>
              )}
            </Link>
          )}

          <div className="py-1 md:py-0">
            <ThemeToggle />
          </div>

          {isLogin ? (
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors py-1 md:py-0 text-left"
            >
              登出
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 px-3 py-1.5 rounded-md transition-colors w-max"
            >
              管理員登入
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}