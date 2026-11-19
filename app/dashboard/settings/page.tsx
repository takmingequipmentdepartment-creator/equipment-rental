'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../utils/supabase';

export default function AdminSettings() {
  const [rules, setRules] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  // 驗證登入並載入目前規則
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert('請先以管理員身分登入！');
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('system_settings')
        .select('borrow_rules')
        .eq('id', 1)
        .single();

      if (data && !error) {
        setRules(data.borrow_rules);
      }
      setIsLoading(false);
    };

    init();
  }, [router]);

  // 儲存修改後的規則（含防假成功檢查）
  const handleSave = async () => {
    setIsSaving(true);
    const { data, error } = await supabase
      .from('system_settings')
      .update({ borrow_rules: rules })
      .eq('id', 1)
      .select();

    if (error) {
      alert(`更新失敗：${error.message}`);
    } else if (!data || data.length === 0) {
      alert('更新失敗：沒有修改權限或找不到設定資料，請檢查 Supabase RLS 設定。');
    } else {
      alert('借用規則已更新，前台申請表單將立即同步。');
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-4 py-10 sm:px-8 transition-colors">
      <div className="max-w-3xl mx-auto">
        
        {/* 頁首與返回連結 */}
        <div className="mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <Link
            href="/dashboard"
            className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors inline-block mb-3"
          >
            &larr; 返回審核後台
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">系統與規則設定</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            在此修改的借用規則，儲存後會即時同步顯示於前台申請表單中。
          </p>
        </div>

        {/* 設定卡片 */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
          <div className="mb-6">
            <label
              htmlFor="borrow-rules"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2"
            >
              借用同意規則條款（支援換行顯示）
            </label>
            <textarea
              id="borrow-rules"
              value={rules}
              disabled={isLoading}
              onChange={(e) => setRules(e.target.value)}
              className="w-full h-56 p-4 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 leading-relaxed resize-y transition-colors placeholder-zinc-400 dark:placeholder-zinc-600 disabled:opacity-50"
              placeholder={isLoading ? '載入規則中...' : '請輸入欲顯示給學生閱讀的借用規則...'}
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className={`px-6 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isSaving || isLoading
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                  : 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900'
              }`}
            >
              {isSaving ? '儲存中...' : '儲存設定'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}