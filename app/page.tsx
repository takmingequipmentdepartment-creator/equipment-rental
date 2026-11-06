export const instant = false;

import { supabase } from '../utils/supabase';
import { revalidatePath } from 'next/cache';
import AdminGuard from './AdminGuard'; // 👈 匯入我們的權限守門員
import Link from 'next/link';

export default async function Home() {
  const { data: equipments, error } = await supabase
    .from('equipments')
    .select('*')
    .order('created_at', { ascending: false });

  async function deleteEquipment(formData: FormData) {
    'use server';
    const id = formData.get('id');
    await supabase.from('equipments').delete().eq('id', id);
    revalidatePath('/');
  }

  async function toggleStatus(formData: FormData) {
    'use server';
    const id = formData.get('id');
    const currentStatus = formData.get('currentStatus');
    
    const newStatus = currentStatus === 'available' ? 'borrowed' : 'available';
    await supabase.from('equipments').update({ status: newStatus }).eq('id', id);
    revalidatePath('/');
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-10 bg-gray-100">
      <h1 className="text-3xl font-bold text-blue-600 mb-8">
        學生會設備借用系統
      </h1>
      
      <div className="w-full max-w-4xl">
        {error && <p className="text-red-500 mb-4">讀取發生錯誤：{error.message}</p>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipments?.map((equipment) => (
            <div key={equipment.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col justify-between">
              
              {equipment.image_url ? (
                <div className="w-full h-48 mb-4 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img 
                    src={equipment.image_url} 
                    alt={equipment.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-48 mb-4 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 font-medium">
                  無照片
                </div>
              )}

              <div>
                <h2 className="text-xl font-bold text-gray-800">{equipment.name}</h2>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-gray-600">數量：{equipment.quantity}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    equipment.status.includes('available') 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {equipment.status.includes('available') ? '可借用' : '已借出'}
                  </span>
                </div>
              </div>
              
              {/* 👇 給一般學生的「申請借用」按鈕 (只要狀態是 available 就顯示) */}
              {equipment.status.includes('available') && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link 
                    href={`/borrow?equip=${equipment.name}`}
                    className="block w-full text-center bg-green-50 text-green-600 font-bold py-2 rounded-lg hover:bg-green-100 transition"
                  >
                    🙋‍♂️ 申請借用
                  </Link>
                </div>
              )}
              
              {/* 👇 使用 AdminGuard 把按鈕區塊包起來，沒登入就看不見！ */}
              <AdminGuard>
                <div className="flex gap-3 mt-6 border-t pt-4">
                  <form action={toggleStatus} className="flex-1">
                    <input type="hidden" name="id" value={equipment.id} />
                    <input type="hidden" name="currentStatus" value={equipment.status} />
                    <button 
                      type="submit" 
                      className={`w-full font-bold py-2 rounded-lg transition ${
                        equipment.status.includes('available')
                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                      }`}
                    >
                      {equipment.status.includes('available') ? '登記借出' : '登記歸還'}
                    </button>
                  </form>

                  <form action={deleteEquipment} className="flex-1">
                    <input type="hidden" name="id" value={equipment.id} />
                    <button 
                      type="submit" 
                      className="w-full bg-red-50 text-red-600 font-bold py-2 rounded-lg hover:bg-red-100 transition"
                    >
                      刪除
                    </button>
                  </form>
                </div>
              </AdminGuard>

            </div>
          ))}
        </div>

        {equipments?.length === 0 && (
          <div className="text-center p-8 bg-white rounded-xl shadow-md">
            <p className="text-gray-600 text-lg font-bold">沒有讀取到任何設備 📭</p>
          </div>
        )}
      </div>
    </main>
  );
}