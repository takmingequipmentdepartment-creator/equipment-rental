'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

interface RentalRequest {
  id: string;
  equipment_name: string;
  department: string;
  student_name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
  // 👉 新增介面定義：對應 Supabase 資料庫的新欄位
  activity_name: string | null;
  borrow_date: string | null;
  return_date: string | null;
  reviewed_by: string | null;
}

export default function DashboardPage() {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 👉 新增狀態：讓管理員輸入自己的名字
  const [reviewerName, setReviewerName] = useState('');
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
    // 👉 元件載入時，先去 localStorage 抓看看之前有沒有輸入過名字，避免每次重整都要重打
    const savedName = localStorage.getItem('reviewerName');
    if (savedName) setReviewerName(savedName);
    
    fetchRequests();
  }, []);

  // 👉 新增處理名字改變的函式
  const handleReviewerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setReviewerName(name);
    localStorage.setItem('reviewerName', name); // 記住名字
  };

  const handleUpdateStatus = async (request: RentalRequest, newStatus: string) => {
    // 👉 阻擋機制：如果沒有填寫審核人名稱，就不允許進行狀態變更
    if (!reviewerName.trim()) {
      alert('⚠️ 請先在畫面上方填寫「當前審核人員名稱」才能進行操作！');
      return;
    }

    if (!confirm(`確定要將此申請單標記為「${newStatus}」嗎？\n(審核人將記錄為：${reviewerName})`)) return;

    // 1. 更新申請單狀態 (👉 並且把 reviewed_by 一起寫進去)
    const { error } = await supabase
      .from('rental_requests')
      .update({ 
        status: newStatus,
        reviewed_by: reviewerName // 👉 新增這行
      })
      .eq('id', request.id);

    if (error) {
      alert('狀態更新失敗：' + error.message);
      return;
    }

    // 2. 庫存回補邏輯 (針對駁回或已歸還) - 維持原本你寫的很棒的邏輯
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
      const emailRes = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.email,
          studentName: request.student_name,
          equipmentName: request.equipment_name,
          status: newStatus,
          // 👉 把這些新資料也傳給發信 API，讓通知信裡面可以寫出是誰審核的、歸還日期是什麼時候
          reviewedBy: reviewerName,
          returnDate: request.return_date,
          activityName: request.activity_name
        }),
      });

      const emailResult = await emailRes.json();

      if (!emailRes.ok) {
        console.error("寄信失敗詳細原因:", emailResult);
        alert(`⚠️ 狀態已更新，但寄信失敗！\n錯誤原因：${emailResult.error}\n\n(提示：測試階段只能寄信給註冊 Resend 的那個信箱)`);
      } else {
        alert(`✅ 已成功將狀態更改為「${newStatus}」並發送通知信！`);
      }

    } catch (err) {
      console.error('寄信通知發生網路錯誤:', err);
      alert(`⚠️ 狀態已更新，但呼叫寄信系統發生網路錯誤。`);
    }

    fetchRequests();
  };

  if (loading) return <div className="p-8 text-center">載入中...</div>;
      /*{ 👉 調整手機版 padding }*/
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">🛠️ 審核後台管理</h1>
        
        {/* 👉 調整為 flex-col sm:flex-row 讓手機版垂直排列 */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-md flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="text-sm font-bold text-yellow-800 whitespace-nowrap">
            👨‍💻 當前審核人員：
          </label>
          {/* 👉 修改這裡：加深輸入框文字顏色與提示字體，加上內陰影與粗體 */}
          <input
            type="text"
            value={reviewerName}
            onChange={handleReviewerNameChange}
            placeholder="請輸入您的名字 (例如: 設備部-王某某)"
            className="w-full sm:max-w-sm border-2 border-yellow-300 rounded p-2 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 bg-white text-gray-900 font-bold placeholder-gray-500 shadow-inner"
          />
          <span className="text-xs text-yellow-600 mt-1 sm:mt-0">
            * 必須填寫才能進行核准或駁回操作
          </span>
        </div>
        
        {/* 👉 加入 w-full 確保容器寬度，並允許水平捲動 */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden overflow-x-auto w-full">
          {/* 👉 加入 min-w-[1000px] 避免表格在手機上被擠壓變形 */}
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-4 whitespace-nowrap">申請時間</th>
                {/* 👉 新增表頭 */}
                <th className="p-4 whitespace-nowrap">活動 / 借還日</th> 
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
                    {new Date(req.created_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  
                  {/* 👉 新增資料行：顯示活動名稱與日期 */}
                  <td className="p-4">
                    <div className="font-bold text-gray-800 mb-1">
                      {req.activity_name || '未填寫'}
                    </div>
                    <div className="text-xs text-gray-500">
                      借: {req.borrow_date || '未設定'}<br/>
                      <span className="text-red-500">還: {req.return_date || '未設定'}</span>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-bold border">
                      {req.department || '未填寫'}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-800">{req.student_name}</td>
                  <td className="p-4 text-blue-600 font-medium max-w-[200px] truncate" title={req.equipment_name}>
                    {req.equipment_name}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {req.phone}<br/>{req.email}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        req.status === '審核中' ? 'bg-yellow-100 text-yellow-700' :
                        req.status === '已借出' ? 'bg-blue-100 text-blue-700' :
                        req.status === '已歸還' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {req.status}
                      </span>
                      {/* 👉 修改這裡：顯示是誰審核的 (加深顏色、加粗並加上徽章樣式) */}
                      {req.reviewed_by && (
                        <span className="text-xs text-slate-700 font-bold bg-slate-100 px-2 py-1 rounded-md mt-1 inline-block border border-slate-200 shadow-sm whitespace-nowrap">
                          📝 由 {req.reviewed_by} 審核
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 flex flex-col gap-2">
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
                  <td colSpan={8} className="p-8 text-center text-gray-500">目前沒有任何申請單。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}