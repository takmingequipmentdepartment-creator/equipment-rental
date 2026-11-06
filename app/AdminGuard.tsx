'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    // 檢查初始狀態
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLogin(!!session);
    };
    checkUser();

    // 監聽登入/登出狀態變化
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLogin(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 如果未登入，就回傳 null (隱藏內容)
  if (!isLogin) return null;

  // 如果已登入，就顯示被包起來的內容 (children)
  return <>{children}</>;
}