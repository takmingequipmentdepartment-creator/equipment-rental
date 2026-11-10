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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('請先以管理員身分登入！');
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
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
      else alert('✅ 修改成功！');
    } else {
      const { error } = await supabase.from('equipments').insert([payload]);
      if (error) alert('新增失敗：' + error.message);
      else alert('✅ 新增成功！');
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
    if (!confirm(`確定要刪除「${eqName}」嗎？這個動作無法復原喔！`)) return;

    const { error } = await supabase.from('equipments').delete().eq('id', id);
    if (error) {
      alert('刪除失敗：' + error.message);
    } else {
      alert('🗑️ 設備已刪除');
      fetchEquipments();
    }
  };

  // 👉 新增：清除圖片的同步函式
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

  if (loading) return <div className="p-8 text-center">載入中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">📦 設備管理系統</h1>
        
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border-t-4 border-blue-500">
          <h2 className="text-xl font-bold text-gray-700 mb-4">
            {isEditing ? '✏️ 修改設備資料' : '➕ 新增設備'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-2">設備名稱 *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black" placeholder="例：Sony A7M4 相機" />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">庫存數量 *</label>
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black" 
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-700 font-bold mb-2">設備詳細說明 (選填)</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black resize-y" 
                placeholder="例如：包含電池x2、記憶卡x1、充電線。借用前請確認鏡頭無刮傷..." 
              />
            </div>
            
            <div className="row-span-2">
              <label className="block text-gray-700 font-bold mb-2">設備圖片</label>
              <div className="flex flex-col gap-3">
                <input 
                  id="image-upload"
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {isUploading && <span className="text-sm text-blue-500 font-bold animate-pulse">⏳ 圖片上傳中，請稍候...</span>}
                
                <input 
                  type="url" 
                  value={imageUrl} 
                  onChange={(e) => setImageUrl(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm" 
                  placeholder="或手動貼上圖片連結" 
                />
                
                {/* 👉 修改：加入清除按鈕的圖片預覽區塊 */}
                {imageUrl && (
                  <div className="mt-2 border rounded-lg p-3 bg-gray-50 inline-block relative">
                    <p className="text-xs text-gray-500 mb-2">圖片預覽：</p>
                    <img src={imageUrl} alt="預覽" className="h-32 object-contain rounded bg-white border" />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow"
                    >
                      移除圖片
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-2">設備狀態 *</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)} 
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${quantity === 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="available" disabled={quantity === 0}>
                  可借用 (available) {quantity === 0 ? '🚫 (庫存為0)' : ''}
                </option>
                <option value="unavailable">目前無法借用 (unavailable)</option>
              </select>
            </div>
            
            <div className="md:col-span-2 flex gap-4 mt-4">
              <button type="submit" disabled={isUploading} className={`flex-1 font-bold py-3 px-4 rounded-lg transition text-white ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isEditing ? '儲存修改' : '確認新增'}
              </button>
              {isEditing && (
                <button type="button" onClick={resetForm} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg transition">
                  取消修改
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-4 whitespace-nowrap">圖片</th>
                <th className="p-4 whitespace-nowrap w-1/4">設備名稱 & 說明</th>
                <th className="p-4 whitespace-nowrap">庫存</th>
                <th className="p-4 whitespace-nowrap">狀態</th>
                <th className="p-4 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {equipments.map((eq) => (
                <tr key={eq.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    {eq.image_url ? (
                      <img src={eq.image_url} alt={eq.name} className="w-16 h-16 object-cover rounded shadow-sm border" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">無圖</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-gray-800">{eq.name}</div>
                    {eq.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2" title={eq.description}>
                        {eq.description}
                      </div>
                    )}
                  </td>
                  <td className={`p-4 font-bold text-lg ${eq.quantity === 0 ? 'text-red-500' : 'text-blue-600'}`}>
                    {eq.quantity ?? 0}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                      (eq.status === 'available' || eq.status === '可借用') && eq.quantity !== 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {eq.quantity === 0 || eq.status === 'unavailable' ? '不可借用' : '可借用'}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => handleEdit(eq)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded font-bold text-sm whitespace-nowrap transition">
                      編輯
                    </button>
                    <button onClick={() => handleDelete(eq.id, eq.name)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-bold text-sm whitespace-nowrap transition">
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
              {equipments.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-bold">目前沒有任何設備資料。</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}