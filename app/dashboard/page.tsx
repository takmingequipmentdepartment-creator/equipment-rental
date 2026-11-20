'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx'; // 引入匯出 Excel 套件

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

    const { data } = await supabase
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
    const { data } = await supabase
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
      alert('請先在畫面上方填寫「當前審核人員名稱」才能進行操作！');
      return;
    }

    if (!confirm(`確定要將此申請單標記為「${newStatus}」嗎？\n(操作人將記錄為：${reviewerName})`)) return;

    // 1. 只更新訂單狀態 (資料庫 Trigger 會自動在背後寫入 audit_logs，不用再手動 insert)
    const { error: updateError } = await supabase
      .from('rental_requests')
      .update({
        status: newStatus,
        reviewed_by: reviewerName,
      })
      .eq('id', request.id);

    if (updateError) {
      alert('狀態更新失敗：' + updateError.message);
      return;
    }

    // 2. 如果是駁回或歸還，加回庫存
    if (newStatus === '駁回' || newStatus === '已歸還') {
      const equipmentArray = request.equipment_name.split(', ').map((name) => name.trim());
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

    // 3. 寄送通知信給借用人
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
          activityName: request.activity_name,
        }),
      });

      if (emailRes.ok) {
        alert(`已成功將狀態更改為「${newStatus}」並發送通知信！`);
      }
    } catch (err) {
      console.error('網路錯誤:', err);
    }

    // 4. 重新整理畫面資料
    fetchRequests();

    if (selectedRequest) {
      setSelectedRequest({ ...request, status: newStatus, reviewed_by: reviewerName });
      // 稍微延遲一下再抓取 log，確保資料庫 Trigger 已經寫入完成
      setTimeout(() => fetchAuditLogs(request.id), 500);
    }
  };

  // 匯出 Excel 處理函式
  const handleExportExcel = () => {
    if (requests.length === 0) {
      alert('目前沒有資料可以匯出');
      return;
    }

    // 整理並翻譯欄位，讓匯出的 Excel 標題是全中文
    const exportData = requests.map(req => ({
      '申請時間': new Date(req.created_at).toLocaleString('zh-TW'),
      '活動名稱': req.activity_name || '未填寫',
      '申請單位': req.department || '未填寫',
      '申請人': req.student_name,
      '聯絡電話': req.phone,
      '電子信箱': req.email,
      '借用設備': req.equipment_name,
      '預計借用日': req.borrow_date || '未填寫',
      '應歸還日期': req.return_date || '未填寫',
      '狀態': req.status,
      '處理的管理員': req.reviewed_by || '無'
    }));

    // 建立 Excel 活頁簿與工作表
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '借用紀錄');

    // 觸發下載 (檔名會自動加上今天的日期)
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `設備部借用紀錄_${today}.xlsx`);
  };

  // 極簡狀態小圓點
  const getStatusDot = (status: string) => {
    if (status === '審核中') return 'bg-amber-500';
    if (status === '已借出') return 'bg-zinc-900 dark:bg-zinc-100';
    if (status === '已歸還') return 'bg-emerald-500';
    return 'bg-red-500';
  };

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">審核後台</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">管理借用申請單與歸還紀錄</p>
          </div>

          {/* 按鈕區塊：加入匯出 Excel 按鈕 */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              匯出 Excel
            </button>
            <Link
              href="/dashboard/settings"
              className="bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              系統與規則設定
            </Link>
          </div>
        </div>

        {/* 審核人員欄位 */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 mb-6 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
            當前審核人員
          </label>
          <input
            type="text"
            value={reviewerName}
            onChange={handleReviewerNameChange}
            placeholder="請輸入姓名（必填）"
            className="w-full sm:max-w-xs border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-colors"
          />
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            核准或駁回前須先填寫操作人
          </span>
        </div>

        {/* 申請單列表 */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/50">
                <th className="px-5 py-3.5">申請時間</th>
                <th className="px-5 py-3.5">活動名稱</th>
                <th className="px-5 py-3.5">申請單位</th>
                <th className="px-5 py-3.5">申請人</th>
                <th className="px-5 py-3.5">狀態</th>
                <th className="px-5 py-3.5 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
              {requests.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => handleOpenModal(req)}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    {new Date(req.created_at).toLocaleString('zh-TW', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-4 font-medium">{req.activity_name || '未填寫'}</td>
                  <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">{req.department || '未填寫'}</td>
                  <td className="px-5 py-4">{req.student_name}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950">
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(req.status)}`} />
                      {req.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                    檢視 &rarr;
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-sm text-zinc-400">
                    目前沒有任何申請單。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 申請單詳情 Modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold">申請單詳細資訊</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-700">
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(selectedRequest.status)}`} />
                  {selectedRequest.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">申請時間</p>
                  <p className="font-mono text-xs">
                    {new Date(selectedRequest.created_at).toLocaleString('zh-TW')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">活動名稱</p>
                  <p className="font-medium">{selectedRequest.activity_name || '未填寫'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">借用人 / 單位</p>
                  <p className="font-medium">
                    {selectedRequest.student_name}（{selectedRequest.department}）
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">聯絡方式</p>
                  <p>{selectedRequest.phone}</p>
                  <p className="text-xs text-zinc-500">{selectedRequest.email}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">預計借用日</p>
                  <p className="font-medium">{selectedRequest.borrow_date || '未設定'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">應歸還日期</p>
                  <p className="font-medium text-red-600 dark:text-red-400">
                    {selectedRequest.return_date || '未設定'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
                  借用設備
                </h3>
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg">
                  <p className="leading-relaxed">{selectedRequest.equipment_name}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
                  操作歷程
                </h3>
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                  {logsLoading ? (
                    <p className="text-xs text-zinc-400">載入紀錄中...</p>
                  ) : auditLogs.length > 0 ? (
                    <div className="space-y-2.5">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 text-xs border-b border-zinc-200 dark:border-zinc-800 last:border-0 pb-2.5 last:pb-0"
                        >
                          <span className="text-zinc-400 font-mono whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('zh-TW', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="font-medium">{log.operator}</span>
                          <span className="text-zinc-500">變更為 {log.action}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400">尚無操作紀錄。</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
              <div className="flex gap-3">
                {selectedRequest.status === '審核中' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest, '已借出')}
                      className="flex-1 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 py-2.5 rounded-md text-sm font-medium transition-colors"
                    >
                      核准借出
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest, '駁回')}
                      className="flex-1 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border border-zinc-300 dark:border-zinc-700 py-2.5 rounded-md text-sm font-medium transition-colors"
                    >
                      駁回申請
                    </button>
                  </>
                )}
                {selectedRequest.status === '已借出' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest, '已歸還')}
                    className="w-full bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 py-2.5 rounded-md text-sm font-medium transition-colors"
                  >
                    標記為已歸還
                  </button>
                )}
                {(selectedRequest.status === '已歸還' || selectedRequest.status === '駁回') && (
                  <div className="w-full text-center text-xs text-zinc-400 py-2">
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