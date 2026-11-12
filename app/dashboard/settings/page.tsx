'use client';

import { useState, useEffect } from 'react';
// ⚠️ 請注意：根據你的專案結構，確認這裡的 supabase 路徑是否正確 (例如 ../../../utils/supabase 或 @/utils/supabase)
import { supabase } from '../../../utils/supabase'; 

export default function AdminSettings() {
  const [rules, setRules] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 1. 載入目前規則 (對應資料庫 system_settings 表格中 id=1 的 borrow_rules 欄位)
  useEffect(() => {
    const fetchRules = async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('borrow_rules')
        .eq('id', 1)
        .single();
        
      if (data && !error) {
        setRules(data.borrow_rules);
      }
    };
    fetchRules();
  }, []);

  // 2. 儲存修改後的規則
  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('system_settings')
      .update({ borrow_rules: rules })
      .eq('id', 1);
      
    if (!error) {
      alert('✅ 借用規則已成功更新！前端表單將立即同步。');
    } else {
      alert(`❌ 更新失敗：${error.message}`);
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          ⚙️ 系統通用設定
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          在這裡修改的借用規則，儲存後會即時同步顯示在學生的前台借用申請表單中。
        </p>
        
        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-3">
            借用同意規則條款 (支援換行顯示)
          </label>
          <textarea 
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 leading-relaxed resize-y"
            placeholder="請輸入欲顯示給學生看的借用規則..."
          />
        </div>
        
        <div className="flex justify-end">
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className={`font-bold py-3 px-8 rounded-lg transition-colors ${
              isSaving 
                ? 'bg-gray-400 cursor-not-allowed text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
            }`}
          >
            {isSaving ? '儲存中...' : '儲存設定'}
          </button>
        </div>
      </div>
    </div>
  );
}