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
  activity_name: string | null;
  borrow_date: string | null;
  return_date: string | null;
  reviewed_by: string | null;
}

interface AuditLog {
  id: string;
  request_id: string;
  action: string;
  operator: string;
  created_at: string;
}

export default function DashboardPage() {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewerName, setReviewerName] = useState('');
  
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
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
    const savedName = localStorage.getItem('reviewerName');
    if (savedName) setReviewerName(savedName);
    fetchRequests();
  }, []);

  const handleReviewerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setReviewerName(name);
    localStorage.setItem('reviewerName', name);
  };

  const fetchAuditLogs = async (requestId: string) => {
    setLogsLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true }); 

    if (data) setAuditLogs(data);
    setLogsLoading(false);
  };

  const handleOpenModal = (req: RentalRequest) => {
    setSelectedRequest(req);
    fetchAuditLogs(req.id);
  };

  const handleUpdateStatus = async (request: RentalRequest, newStatus: string) => {
    if (!reviewerName.trim()) {
      alert('⚠️ 請先在畫面上方填寫「當前審核人員名稱」才能進行操作！');
      return;
    }

    if (!confirm(`確定要將此申請單標記為「${newStatus}」嗎？\n(操作人將記錄為：${reviewerName})`)) return;

    const { error: updateError } = await supabase
      .from('rental_requests')
      .update({ 
        status: newStatus,
        reviewed_by: reviewerName
      })
      .eq('id', request.id);

    if (updateError) {
      alert('狀態更新失敗：' + updateError.message);
      return;
    }

    await supabase.from('audit_logs').insert([{
      request_id: request.id,
      action: newStatus,
      operator: reviewerName
    }]);

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

    try {
      const emailRes = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.email,
          studentName: request.student_name,
          equipmentName: request.equipment_name,
          status: newStatus,
          reviewedBy: reviewerName,
          returnDate: request.return_date,
          activityName: request.activity_name
        }),
      });

      if (emailRes.ok) {
        alert(`✅ 已成功將狀態更改為「${newStatus}」並發送通知信！`);
      }
    } catch (err) {
      console.error('網路錯誤:', err);
    }

    fetchRequests();
    
    if (selectedRequest) {
      setSelectedRequest({ ...request, status: newStatus, reviewed_by: reviewerName });
      fetchAuditLogs(request.id);
    }
  };

  if (loading) return <div className="p-4 sm:p-8 text-center dark:text-gray-300">載入中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-8 transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">🛠️ 審核後台管理</h1>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 mb-6 rounded-md flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="text-sm font-bold text-yellow-800 dark:text-yellow-500 whitespace-nowrap">
            👨‍💻 當前審核人員：
          </label>
          <input
            type="text"
            value={reviewerName}
            onChange={handleReviewerNameChange}
            placeholder="請輸入您的名字 (如: 設備部-蛇丸)"
            className="w-full sm:max-w-sm border-2 border-yellow-300 dark:border-yellow-700 rounded p-2 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 font-bold placeholder-gray-500 dark:placeholder-gray-400 shadow-inner transition-colors"
          />
          <span className="text-xs text-yellow-600 dark:text-yellow-500 mt-1 sm:mt-0">
            * 必須填寫才能進行核准或駁回操作
          </span>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden overflow-x-auto w-full border border-transparent dark:border-slate-700 transition-colors">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-800 dark:bg-slate-950 text-white border-b dark:border-slate-700">
                <th className="p-4 whitespace-nowrap">申請時間</th>
                <th className="p-4 whitespace-nowrap">活動名稱</th> 
                <th className="p-4 whitespace-nowrap">申請單位</th>
                <th className="p-4 whitespace-nowrap">申請人</th>
                <th className="p-4 whitespace-nowrap">目前狀態</th>
                <th className="p-4 whitespace-nowrap text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr 
                  key={req.id} 
                  onClick={() => handleOpenModal(req)}
                  className="border-b dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-750 cursor-pointer transition-colors"
                >
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(req.created_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-4 font-bold text-gray-800 dark:text-gray-200">{req.activity_name || '未填寫'}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{req.department || '未填寫'}</td>
                  <td className="p-4 font-bold text-gray-800 dark:text-gray-200">{req.student_name}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                      req.status === '審核中' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      req.status === '已借出' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      req.status === '已歸還' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-blue-500 dark:text-blue-400 font-bold text-sm hover:underline">查看詳情 & 操作 ➔</span>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">目前沒有任何申請單。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity" onClick={() => setSelectedRequest(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-transparent dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            
            <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/90 sticky top-0 z-10 backdrop-blur transition-colors">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                📄 申請單詳細資訊
              </h2>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-full w-8 h-8 flex items-center justify-center font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 dark:bg-slate-900/50 p-5 rounded-xl border border-gray-100 dark:border-slate-700 transition-colors">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">申請時間</p>
                  <p className="font-bold text-gray-800 dark:text-gray-200">
                    {new Date(selectedRequest.created_at).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">活動名稱</p>
                  <p className="font-bold text-gray-800 dark:text-gray-200">{selectedRequest.activity_name || '未填寫'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">借用人 / 單位</p>
                  <p className="font-bold text-gray-800 dark:text-gray-200">{selectedRequest.student_name} ({selectedRequest.department})</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">聯絡方式</p>
                  <p className="font-bold text-gray-800 dark:text-gray-200">{selectedRequest.phone}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRequest.email}</p>
                </div>
                <div className="sm:col-span-2 flex gap-4 border-t dark:border-slate-700 pt-4 mt-2">
                  <div className="flex-1 bg-white dark:bg-slate-800 p-3 rounded shadow-sm border border-gray-200 dark:border-slate-600 transition-colors">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">預計借用日</p>
                    <p className="font-bold text-blue-700 dark:text-blue-400">{selectedRequest.borrow_date || '未設定'}</p>
                  </div>
                  <div className="flex-1 bg-white dark:bg-slate-800 p-3 rounded shadow-sm border border-gray-200 dark:border-slate-600 transition-colors">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">應歸還日期</p>
                    <p className="font-bold text-red-600 dark:text-red-400">{selectedRequest.return_date || '未設定'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 border-l-4 border-blue-500 pl-3">📦 借用清單</h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-4 rounded-xl transition-colors">
                  <p className="font-bold text-blue-800 dark:text-blue-300 leading-relaxed">
                    {selectedRequest.equipment_name}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 border-l-4 border-emerald-500 pl-3">🕒 操作歷程紀錄</h3>
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700 rounded-xl p-4 transition-colors">
                  {logsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">載入紀錄中...</p>
                  ) : auditLogs.length > 0 ? (
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 text-sm border-b border-gray-200 dark:border-slate-700 last:border-0 pb-3 last:pb-0">
                          <div className="mt-1 text-slate-400 dark:text-slate-500 font-mono text-xs whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-xs mr-2 transition-colors">
                              {log.operator}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              將狀態變更為 <span className="font-bold text-blue-600 dark:text-blue-400">[{log.action}]</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">尚無任何操作紀錄，目前為初始申請狀態。</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-800 dark:bg-slate-950 text-white mt-auto rounded-b-2xl border-t dark:border-slate-800 transition-colors">
              <div className="flex justify-between items-center mb-4">
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                  selectedRequest.status === '審核中' ? 'bg-yellow-400 text-yellow-900' :
                  selectedRequest.status === '已借出' ? 'bg-blue-400 text-blue-900' :
                  selectedRequest.status === '已歸還' ? 'bg-green-400 text-green-900' :
                  'bg-red-400 text-red-900'
                }`}>
                  當前狀態：{selectedRequest.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-slate-700 dark:border-slate-800 pt-4">
                {selectedRequest.status === '審核中' && (
                  <>
                    <button onClick={() => handleUpdateStatus(selectedRequest, '已借出')} className="flex-1 bg-blue-500 hover:bg-blue-400 text-white py-3 rounded-lg font-bold transition-colors shadow-lg">
                      ✅ 核准借出
                    </button>
                    <button onClick={() => handleUpdateStatus(selectedRequest, '駁回')} className="flex-1 bg-red-500 hover:bg-red-400 text-white py-3 rounded-lg font-bold transition-colors shadow-lg">
                      ❌ 駁回申請
                    </button>
                  </>
                )}
                {selectedRequest.status === '已借出' && (
                  <button onClick={() => handleUpdateStatus(selectedRequest, '已歸還')} className="w-full bg-green-500 hover:bg-green-400 text-white py-3 rounded-lg font-bold transition-colors shadow-lg text-lg">
                    📦 標記為「已歸還」
                  </button>
                )}
                {(selectedRequest.status === '已歸還' || selectedRequest.status === '駁回') && (
                  <div className="w-full bg-slate-700 text-slate-300 dark:text-slate-400 py-3 rounded-lg font-bold text-center border border-slate-600 dark:border-slate-800 transition-colors">
                    此訂單已結案，無法再變更狀態。
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}