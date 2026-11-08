'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

interface RentalRequest {
  id: string;
  equipment_name: string;
  department: string; // 申請單位
  student_name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchRequests = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('請先以管理員身分登入！');
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('rental_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (request: RentalRequest, newStatus: string) => {
    if (!confirm(`確定要將此申請單標記為「${newStatus}」嗎？`)) return;

    // 1. 更新申請單狀態
    const { error } = await supabase
      .from('rental_requests')
      .update({ status: newStatus })
      .eq('id', request.id);

    if (error) {
      alert('狀態更新失敗：' + error.message);
      return;
    }

    // 2. 庫存回補邏輯 (針對駁回或已歸還)
    if (newStatus === '駁回' || newStatus === '已歸還') {
      const equipmentArray = request.equipment_name.split(', ').map(name => name.trim());

      for (const eqStr of equipmentArray) {
        const match = eqStr.match(/(.+) x(\d+)$/);
        const name = match ? match[1] : eqStr;
        const returnQty = match ? parseInt(match[2], 10) : 1;

        const { data: eqData } = await supabase
          .from('equipments')
          .select('quantity')
          .eq('name', name)
          .single();

        if (eqData) {
          const newQuantity = (eqData.quantity ?? 0) + returnQty;
          await supabase
            .from('equipments')
            .update({ quantity: newQuantity, status: 'available' })
            .eq('name', name);
        }
      }
    }

    // 3. 呼叫發信 API
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.email,
          studentName: request.student_name,
          equipmentName: request.equipment_name,
          status: newStatus,
        }),
      });
    } catch (err) {
      console.log('寄信通知發生錯誤，但狀態已更新', err);
    }

    alert(`✅ 已成功將狀態更改為「${newStatus}」並發送通知信！`);
    fetchRequests();
  };

  if (loading) return <div className="p-8 text-center">載入中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🛠️ 審核後台管理</h1>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-4 whitespace-nowrap">申請時間</th>
                <th className="p-4 whitespace-nowrap">申請單位</th>
                <th className="p-4 whitespace-nowrap">申請人</th>
                <th className="p-4 whitespace-nowrap">借用設備清單</th>
                <th className="p-4 whitespace-nowrap">聯絡方式</th>
                <th className="p-4 whitespace-nowrap">目前狀態</th>
                <th className="p-4 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-600">
                    {new Date(req.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-bold border">
                      {req.department || '未填寫'}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-800">{req.student_name}</td>
                  <td className="p-4 text-blue-600 font-medium">{req.equipment_name}</td>
                  <td className="p-4 text-sm text-gray-600">
                    {req.phone}<br/>{req.email}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                      req.status === '審核中' ? 'bg-yellow-100 text-yellow-700' :
                      req.status === '已借出' ? 'bg-blue-100 text-blue-700' :
                      req.status === '已歸還' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    {req.status === '審核中' && (
                      <>
                        <button onClick={() => handleUpdateStatus(req, '已借出')} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm whitespace-nowrap">核准借出</button>
                        <button onClick={() => handleUpdateStatus(req, '駁回')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm whitespace-nowrap">駁回</button>
                      </>
                    )}
                    {req.status === '已借出' && (
                      <button onClick={() => handleUpdateStatus(req, '已歸還')} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm whitespace-nowrap">標記歸還</button>
                    )}
                    {(req.status === '已歸還' || req.status === '駁回') && (
                      <span className="text-gray-400 text-sm whitespace-nowrap">已結案</span>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">目前沒有任何申請單。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}