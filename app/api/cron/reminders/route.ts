import { NextResponse } from 'next/server';
import { headers } from 'next/headers'; 
import { supabase } from '../../../../utils/supabase'; 
import { Resend } from 'resend';

// ❌ 已經幫你把 export const dynamic = 'force-dynamic'; 刪掉了！

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  try {
    // 改用 next/headers 來取得驗證資訊，並加上 await
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 取得今天的日期 (轉換為 YYYY-MM-DD 格式，以台灣時間為準)
    const today = new Date();
    const twTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
    const todayString = twTime.toISOString().split('T')[0];

    // 去資料庫尋找「今天到期」且「尚未歸還」的申請單
    const { data: dueRequests, error } = await supabase
      .from('rental_requests')
      .select('*')
      .eq('status', '已借出')
      .eq('return_date', todayString);

    if (error) throw error;
    if (!dueRequests || dueRequests.length === 0) {
      return NextResponse.json({ message: '今天沒有需要歸還的設備' });
    }

    // 針對每一筆到期的訂單，發送提醒信
    for (const req of dueRequests) {
      await resend.emails.send({
        from: '德明設備部 <onboarding@resend.dev>', // 測試階段請用 onboarding
        to: [req.email], 
        subject: `【歸還提醒】🚨 您的設備借用期限就是今天！`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <h2 style="color: #dc2626;">🚨 設備歸還提醒！</h2>
            <p><strong>${req.student_name}</strong> 同學您好：</p>
            <p>您於 <strong>${req.activity_name || '未填寫活動'}</strong> 借用的設備，歸還期限為 <strong>今天 (${todayString})</strong>，請務必於今日內歸還至設備部。</p>
            
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #f87171;">
              <h3 style="margin-top: 0; color: #991b1b;">📦 應歸還設備清單</h3>
              <p style="font-weight: bold; font-size: 16px;">${req.equipment_name}</p>
            </div>

            <br />
            <p style="font-size: 14px; color: #666;">
              若已歸還請忽略此信；若需延期或有任何問題，請盡快聯繫德明學生會設備部。<br />
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `已成功發送 ${dueRequests.length} 封歸還提醒信！` 
    });

  } catch (error: any) {
    console.error("Cron Job 執行失敗:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}