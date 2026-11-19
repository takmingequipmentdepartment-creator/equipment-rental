'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-[96px] h-[34px]" />;

  return (
    <select
      aria-label="切換顯示主題"
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
      className="bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-md px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-colors cursor-pointer"
    >
      <option value="system">系統預設</option>
      <option value="light">淺色模式</option>
      <option value="dark">深色模式</option>
    </select>
  );
}