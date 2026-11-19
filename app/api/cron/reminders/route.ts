import { NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 取得今天的日期 (YYYY-MM-DD，以台灣時間 UTC+8 為準)
    const today = new Date();
    const twTime = new Date(today.getTime() + 8 * 60 * 60 * 1000);
    const todayString = twTime.toISOString().split('T')[0];

    // 尋找「今天到期」且「已借出」的申請單
    const { data: dueRequests, error } = await supabase
      .from('rental_requests')
      .select('*')
      .eq('status', '已借出')
      .eq('return_date', todayString);

    if (error) throw error;
    if (!dueRequests || dueRequests.length === 0) {
      return NextResponse.json({ message: '今天沒有需要歸還的設備' });
    }

    // 針對每一筆到期訂單發送提醒信
    for (const req of dueRequests) {
      const formattedEquipment = req.equipment_name
        ? req.equipment_name.split(', ').join('<br/>')
        : '未填寫';

      const { error: mailError } = await resend.emails.send({
        from: '德明學生會 設備部 <noreply@takming-rent.me>',
        to: [req.email],
        subject: `【德明學生會 設備部】設備歸還提醒：借用期限為今日`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #18181b; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="border-bottom: 1px solid #e4e4e7; padding-bottom: 12px; font-weight: 600; font-size: 20px;">
              設備歸還提醒
            </h2>
            <p>您好，<strong>${req.student_name}</strong> 同學：</p>
            <p>
              您為 <strong>${req.activity_name || '未填寫活動'}</strong> 借用的設備，歸還期限為
              <strong style="color: #dc2626;">今日（${todayString}）</strong>，請務必於今日內歸還至設備部。
            </p>

            <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; font-size: 15px; color: #18181b;">應歸還設備清單</h3>
              <div style="font-size: 14px; padding-left: 10px; border-left: 2px solid #a1a1aa;">
                ${formattedEquipment}
              </div>
            </div>

            <p style="font-size: 14px; color: #3f3f46;">
              若已完成歸還請忽略此信；如需申請延期或有任何疑問，請盡快聯繫德明學生會 設備部。
            </p>

            <p style="font-size: 12px; color: #71717a; margin-top: 30px; border-top: 1px solid #e4e4e7; padding-top: 15px;">
              ※ 此為系統自動發送之提醒信件，請勿直接回覆。<br />
              <strong>德明學生會 設備部</strong>
            </p>
          </div>
        `,
      });

      if (mailError) {
        console.error(`寄送歸還提醒失敗 (${req.email}):`, mailError.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `已處理 ${dueRequests.length} 封歸還提醒信。`,
    });
  } catch (error: any) {
    console.error('Cron Job 執行失敗:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}