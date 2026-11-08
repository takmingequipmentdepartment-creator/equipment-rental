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

  // 處理表單送出 (新增或修改)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity < 0) {
      alert('數量不能為負數！');
      return;
    }

    const payload = {
      name,
      image_url: imageUrl,
      quantity,
      status,
    };

    if (isEditing && editId) {
      // 修改現有設備
      const { error } = await supabase
        .from('equipments')
        .update(payload)
        .eq('id', editId);

      if (error) alert('修改失敗：' + error.message);
      else alert('✅ 修改成功！');
    } else {
      // 新增設備
      const { error } = await supabase
        .from('equipments')
        .insert([payload]);

      if (error) alert('新增失敗：' + error.message);
      else alert('✅ 新增成功！');
    }

    resetForm();
    fetchEquipments();
  };

  // 點擊編輯按鈕
  const handleEdit = (eq: Equipment) => {
    setIsEditing(true);
    setEditId(eq.id);
    setName(eq.name);
    setImageUrl(eq.image_url || '');
    setQuantity(eq.quantity || 0);
    setStatus(eq.status);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // 滾動到最上方填寫表單
  };

  // 點擊刪除按鈕
  const handleDelete = async (id: string, eqName: string) => {
    if (!confirm(`確定要刪除「${eqName}」嗎？這個動作無法復原喔！`)) return;

    const { error } = await supabase
      .from('equipments')
      .delete()
      .eq('id', id);

    if (error) {
      alert('刪除失敗：' + error.message);
    } else {
      alert('🗑️ 設備已刪除');
      fetchEquipments();
    }
  };

  // 重置表單
  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setName('');
    setImageUrl('');
    setQuantity(1);
    setStatus('available');
  };

  if (loading) return <div className="p-8 text-center">載入中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">📦 設備管理系統</h1>
        
        {/* 上方：新增/修改表單 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border-t-4 border-blue-500">
          <h2 className="text-xl font-bold text-gray-700 mb-4">
            {isEditing ? '✏️ 修改設備資料' : '➕ 新增設備'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-2">設備名稱 *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black" placeholder="例：Sony A7M4 相機" />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">圖片網址 (選填)</label>
              <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black" placeholder="請貼上圖片連結 (https://...)" />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">庫存數量 *</label>
              <input type="number" min="0" required value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black" />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">設備狀態 *</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black">
                <option value="available">可借用 (available)</option>
                <option value="unavailable">目前無法借用 (unavailable)</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-4 mt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition">
                {isEditing ? '儲存修改' : '確認新增'}
              </button>
              {isEditing && (
                <button type="button" onClick={resetForm} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition">
                  取消修改
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 下方：現有設備列表 */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-4 whitespace-nowrap">圖片</th>
                <th className="p-4 whitespace-nowrap">設備名稱</th>
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
                      <img src={eq.image_url} alt={eq.name} className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">無圖</div>
                    )}
                  </td>
                  <td className="p-4 font-bold text-gray-800">{eq.name}</td>
                  <td className="p-4 text-blue-600 font-bold">{eq.quantity ?? 0}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      eq.status === 'available' || eq.status === '可借用' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {eq.status === 'available' ? '可借用' : eq.status === 'unavailable' ? '不可借用' : eq.status}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => handleEdit(eq)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm whitespace-nowrap">
                      編輯
                    </button>
                    <button onClick={() => handleDelete(eq.id, eq.name)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm whitespace-nowrap">
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
              {equipments.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">目前沒有任何設備資料。</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}