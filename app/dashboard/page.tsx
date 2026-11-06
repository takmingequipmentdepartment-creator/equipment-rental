export const instant = false;

import { supabase } from '../../utils/supabase';
import { revalidatePath } from 'next/cache';
import AdminGuard from '../AdminGuard';

export default async function Dashboard() {
  const { data: requests, error } = await supabase
    .from('rental_requests')
    .select('*')
    .order('created_at', { ascending: false });

  async function updateStatus(formData: FormData) {
    'use server';
    const id = formData.get('id');
    const newStatus = formData.get('newStatus') as string;
    
    // 1. 更新資料庫中的申請單狀態
    await supabase.from('rental_requests').update({ status: newStatus }).eq('id', id);

    // 2. 撈取這筆申請單的詳細資料（為了知道要寄信給哪個學生）
    const { data: reqData } = await supabase
      .from('rental_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (reqData) {
      // 3. 根據不同的狀態，準備對應的信件主旨與內容
      let subject = '';
      let message = '';

      if (newStatus === 'borrowed') {
        subject = `【審核通過】${reqData.equipment_name} 借用申請已核准！`;
        message = `親愛的 ${reqData.student_name} 同學：\n\n您申請借用的「${reqData.equipment_name}」已獲管理員核准借出！\n請盡速前往設備部領取器材。`;
      } else if (newStatus === 'rejected') {
        subject = `【審核駁回】${reqData.equipment_name} 借用申請未通過`;
        message = `親愛的 ${reqData.student_name} 同學：\n\n很抱歉，您申請借用的「${reqData.equipment_name}」已被管理員駁回。\n如有疑問請聯繫設備部。`;
      } else if (newStatus === 'returned') {
        subject = `【歸還成功】${reqData.equipment_name} 歸還手續已完成`;
        message = `親愛的 ${reqData.student_name} 同學：\n\n您借用的「${reqData.equipment_name}」已由管理員確認歸還無誤。\n感謝您的使用！`;
      }

      // 4. 模擬寄信給學生 (印在終端機)
      console.log('\n=============================================');
      console.log('🚀 [系統通知] 管理員操作成功，模擬寄出審核結果 Email！');
      console.log(`👤 收件人 (學生 Email): ${reqData.email}`);
      console.log(`📝 主旨 (Subject): ${subject}`);
      console.log(`📄 信件內容:\n${message}`);
      console.log('=============================================\n');
    }

    // 重新整理畫面
    revalidatePath('/dashboard');
  }

  const getStatusBadge = (rawStatus: string) => {
    const status = rawStatus?.replace(/['"]/g, '') || '';
    switch(status) {
      case 'pending': return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold border border-yellow-200">待審核</span>;
      case 'borrowed': return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold border border-blue-200">借用中</span>;
      case 'returned': return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-bold border border-gray-200">已歸還</span>;
      case 'rejected': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold border border-red-200">已駁回</span>;
      default: return status;
    }
  };

  return (
    <AdminGuard>
      <main className="flex min-h-screen flex-col items-center p-10 bg-gray-50">
        <div className="w-full max-w-6xl">
          <h1 className="text-3xl font-bold text-blue-600 mb-8">管理員審核後台</h1>
          
          {error && <p className="text-red-500 mb-4">讀取發生錯誤：{error.message}</p>}
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-500 uppercase">申請設備</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-500 uppercase">申請人</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-500 uppercase">聯絡方式</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-500 uppercase">狀態</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-500 uppercase">操作審核</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests?.map((req) => {
                  const status = req.status?.replace(/['"]/g, '') || '';
                  return (
                  <tr key={req.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-800 text-lg">{req.equipment_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700">{req.student_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="font-medium text-gray-800">{req.phone}</div>
                      <div className="text-gray-400">{req.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                      {status === 'pending' && (
                        <>
                          <form action={updateStatus}>
                            <input type="hidden" name="id" value={req.id} />
                            <input type="hidden" name="newStatus" value="borrowed" />
                            <button type="submit" className="bg-blue-50 text-blue-600 font-bold px-4 py-2 rounded-lg hover:bg-blue-100 transition shadow-sm">核准借出</button>
                          </form>
                          <form action={updateStatus}>
                            <input type="hidden" name="id" value={req.id} />
                            <input type="hidden" name="newStatus" value="rejected" />
                            <button type="submit" className="bg-red-50 text-red-600 font-bold px-4 py-2 rounded-lg hover:bg-red-100 transition shadow-sm">駁回</button>
                          </form>
                        </>
                      )}
                      {status === 'borrowed' && (
                        <form action={updateStatus}>
                          <input type="hidden" name="id" value={req.id} />
                          <input type="hidden" name="newStatus" value="returned" />
                          <button type="submit" className="bg-green-50 text-green-700 font-bold px-4 py-2 rounded-lg hover:bg-green-100 transition shadow-sm">標記已歸還</button>
                        </form>
                      )}
                      {(status === 'returned' || status === 'rejected') && (
                        <span className="text-gray-400 font-medium px-2 py-2">無可操作動作</span>
                      )}
                    </td>
                  </tr>
                )})}
                {requests?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">目前沒有任何申請單 📭</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}