'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

interface Equipment {
  id: string;
  name: string;
  image_url: string;
  quantity: number;
  status: string;
  description: string | null;
}

export default function ManageEquipmentsPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 表單狀態
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [status, setStatus] = useState('available');
  const [description, setDescription] = useState('');

  // 圖片上傳狀態
  const [isUploading, setIsUploading] = useState(false);

  const fetchEquipments = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      alert('請先以管理員身分登入！');
      router.push('/login');
      return;
    }

    const { data } = await supabase
      .from('equipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setEquipments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('equipment-images')
      .upload(fileName, file);

    if (uploadError) {
      alert('圖片上傳失敗：' + uploadError.message);
      setIsUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from('equipment-images')
      .getPublicUrl(fileName);

    setImageUrl(data.publicUrl);
    setIsUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity < 0) {
      alert('數量不能為負數！');
      return;
    }

    const finalStatus = quantity === 0 ? 'unavailable' : status;

    const payload = {
      name,
      image_url: imageUrl,
      quantity,
      status: finalStatus,
      description: description.trim(),
    };

    if (isEditing && editId) {
      const { error } = await supabase.from('equipments').update(payload).eq('id', editId);
      if (error) alert('修改失敗：' + error.message);
      else alert('修改成功！');
    } else {
      const { error } = await supabase.from('equipments').insert([payload]);
      if (error) alert('新增失敗：' + error.message);
      else alert('新增成功！');
    }

    resetForm();
    fetchEquipments();
  };

  const handleEdit = (eq: Equipment) => {
    setIsEditing(true);
    setEditId(eq.id);
    setName(eq.name);
    setImageUrl(eq.image_url || '');
    setQuantity(eq.quantity || 0);
    setDescription(eq.description || '');
    setStatus(eq.quantity === 0 ? 'unavailable' : eq.status);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, eqName: string) => {
    if (!confirm(`確定要刪除「${eqName}」嗎？此動作無法復原。`)) return;

    const { error } = await supabase.from('equipments').delete().eq('id', id);
    if (error) {
      alert('刪除失敗：' + error.message);
    } else {
      alert('設備已刪除。');
      fetchEquipments();
    }
  };

  const handleClearImage = () => {
    setImageUrl('');
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setName('');
    setImageUrl('');
    setQuantity(1);
    setStatus('available');
    setDescription('');
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const inputClass =
    'w-full px-3.5 py-2 text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-colors placeholder-zinc-400 dark:placeholder-zinc-600';

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-10 text-center text-sm text-zinc-500">
        載入中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-4 py-10 sm:px-8 transition-colors">
      <div className="max-w-6xl mx-auto">
        
        {/* 頁首 */}
        <div className="mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-2xl font-semibold tracking-tight">設備管理</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            新增、編輯設備資料與庫存狀態
          </p>
        </div>

        {/* 新增 / 編輯表單卡片 */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold tracking-tight">
              {isEditing ? '編輯設備資料' : '新增設備'}
            </h2>
            {isEditing && (
              <span className="text-xs px-2.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                編輯模式
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                設備名稱 *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="例如：Sony A7M4 相機"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                庫存數量 *
              </label>
              <input
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => {
                  const newQty = parseInt(e.target.value) || 0;
                  setQuantity(newQty);
                  if (newQty === 0) setStatus('unavailable');
                }}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                設備詳細說明（選填）
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`${inputClass} resize-y leading-relaxed`}
                placeholder="例如：包含電池x2、記憶卡x1、充電線。借用前請確認鏡頭無刮傷..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                設備圖片
              </label>
              <div className="flex flex-col gap-3">
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="w-full text-xs text-zinc-500 dark:text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-zinc-300 dark:file:border-zinc-700 file:text-xs file:font-medium file:bg-zinc-50 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-200 hover:file:bg-zinc-100 dark:hover:file:bg-zinc-700 cursor-pointer transition-colors"
                />
                {isUploading && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 animate-pulse">
                    圖片上傳中，請稍候...
                  </span>
                )}

                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className={inputClass}
                  placeholder="或手動貼上圖片連結"
                />

                {imageUrl && (
                  <div className="mt-1 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-zinc-50 dark:bg-zinc-950 inline-flex flex-col gap-2 w-fit">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-zinc-500">圖片預覽</span>
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        移除
                      </button>
                    </div>
                    <img
                      src={imageUrl}
                      alt="預覽"
                      className="h-28 object-contain rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                設備狀態 *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`${inputClass} ${
                  quantity === 0 ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <option value="available" disabled={quantity === 0}>
                  可借用（available）{quantity === 0 ? ' - 庫存為 0' : ''}
                </option>
                <option value="unavailable">目前無法借用（unavailable）</option>
              </select>
            </div>

            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isUploading}
                className={`px-6 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isUploading
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                    : 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900'
                }`}
              >
                {isEditing ? '儲存修改' : '確認新增'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 rounded-md text-sm font-medium bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 transition-colors"
                >
                  取消編輯
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 設備列表 */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/50">
                <th className="px-5 py-3.5 w-24">圖片</th>
                <th className="px-5 py-3.5">設備名稱與說明</th>
                <th className="px-5 py-3.5 w-28">庫存</th>
                <th className="px-5 py-3.5 w-32">狀態</th>
                <th className="px-5 py-3.5 w-36 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
              {equipments.map((eq) => {
                const isAvailable =
                  (eq.status === 'available' || eq.status === '可借用') && eq.quantity !== 0;

                return (
                  <tr
                    key={eq.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      {eq.image_url ? (
                        <img
                          src={eq.image_url}
                          alt={eq.name}
                          className="w-12 h-12 object-cover rounded-md border border-zinc-200 dark:border-zinc-800"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md flex items-center justify-center text-xs text-zinc-400">
                          無圖
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {eq.name}
                      </div>
                      {eq.description && (
                        <div
                          className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2"
                          title={eq.description}
                        >
                          {eq.description}
                        </div>
                      )}
                    </td>
                    <td
                      className={`px-5 py-4 font-mono font-medium ${
                        eq.quantity === 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {eq.quantity ?? 0}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 whitespace-nowrap">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isAvailable ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-600'
                          }`}
                        />
                        {isAvailable ? '可借用' : '不可借用'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(eq)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 transition-colors"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDelete(eq.id, eq.name)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {equipments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-zinc-400">
                    目前沒有任何設備資料。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}