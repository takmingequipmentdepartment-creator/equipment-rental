'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // 確保在客戶端掛載後才顯示，避免伺服器端與客戶端渲染畫面不一致 (Hydration Error)
  useEffect(() => setMounted(true), []);

  // 還沒載入完成前先回傳一個空的佔位符，避免畫面閃爍
  if (!mounted) return <div className="w-[120px] h-[34px]"></div>;

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
      className="bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
    >
      <option value="system">🖥️ 系統預設</option>
      <option value="light">☀️ 淺色模式</option>
      <option value="dark">🌙 深色模式</option>
    </select>
  );
}