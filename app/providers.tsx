'use client';

import { ThemeProvider } from 'next-themes';
import { useState, useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // 確保元件掛載後才渲染，避免 Hydration 錯誤
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    // attribute="class" 會自動在 <html> 標籤加上 class="dark" 或 "light"
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}