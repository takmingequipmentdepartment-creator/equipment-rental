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

    // 尋找「今日到期」或「已逾期」且狀態為「已借出」的申請單
    const { data: requests, error } = await supabase
      .from('rental_requests')
      .select('*')
      .eq('status', '已借出')
      .lte('return_date', todayString)
      .order('return_date', { ascending: true });

    if (error) throw error;
    if (!requests || requests.length === 0) {
      return NextResponse.json({ message: '今天沒有到期或逾期的設備' });
    }

    const dueTodayList: typeof requests = [];
    const overdueList: Array<(typeof requests)[number] & { overdueDays: number }> = [];

    const todayMs = new Date(`${todayString}T00:00:00Z`).getTime();

    // 1. 分類並寄送 Email 給借用人
    for (const req of requests) {
      const returnMs = new Date(`${req.return_date}T00:00:00Z`).getTime();
      const diffDays = Math.floor((todayMs - returnMs) / (1000 * 60 * 60 * 24));
      const isOverdue = diffDays > 0;

      if (isOverdue) {
        overdueList.push({ ...req, overdueDays: diffDays });
      } else {
        dueTodayList.push(req);
      }

      const formattedEquipment = req.equipment_name
        ? req.equipment_name.split(', ').join('<br/>')
        : '未填寫';

      const subject = isOverdue
        ? `【德明學生會 設備部】設備逾期未還通知（已逾期 ${diffDays} 天）`
        : `【德明學生會 設備部】設備歸還提醒：借用期限為今日`;

      const title = isOverdue ? '設備逾期未還通知' : '設備歸還提醒';
      const leadText = isOverdue
        ? `您為 <strong>${req.activity_name || '未填寫活動'}</strong> 借用的設備，原定歸還日為 <strong>${req.return_date}</strong>，目前已<strong style="color: #dc2626;">逾期 ${diffDays} 天</strong>，請盡速歸還至設備部並聯繫管理員。`
        : `您為 <strong>${req.activity_name || '未填寫活動'}</strong> 借用的設備，歸還期限為 <strong style="color: #dc2626;">今日（${todayString}）</strong>，請務必於今日內歸還至設備部。`;

      const { error: mailError } = await resend.emails.send({
        from: '德明學生會 設備部 <noreply@takming-rent.me>',
        to: [req.email],
        subject,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #18181b; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="border-bottom: 1px solid #e4e4e7; padding-bottom: 12px; font-weight: 600; font-size: 20px;">
              ${title}
            </h2>
            <p>您好，<strong>${req.student_name}</strong> 同學：</p>
            <p>${leadText}</p>

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
        console.error(`寄送提醒失敗 (${req.email}):`, mailError.message);
      }
    }

    // 2. 彙整發送 Discord 通知給管理員
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      const fields: Array<{ name: string; value: string; inline: boolean }> = [];

      if (overdueList.length > 0) {
        fields.push({
          name: `已逾期未還（${overdueList.length} 筆）`,
          value: overdueList
            .map(
              (r) =>
                `• **${r.department} / ${r.student_name}**（${r.phone}）— 逾期 **${r.overdueDays} 天**（應還日 ${r.return_date}）\n 設備：${r.equipment_name}`
            )
            .join('\n')
            .slice(0, 1024),
          inline: false,
        });
      }

      if (dueTodayList.length > 0) {
        fields.push({
          name: `今日到期（${dueTodayList.length} 筆）`,
          value: dueTodayList
            .map(
              (r) =>
                `• **${r.department} / ${r.student_name}**（${r.phone}）\n 設備：${r.equipment_name}`
            )
            .join('\n')
            .slice(0, 1024),
          inline: false,
        });
      }

      fields.push({
        name: '快速管理',
        value: '[點此前往管理員後台](https://www.takming-rent.me/dashboard)',
        inline: false,
      });

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: '德明學生會 設備部',
          embeds: [
            {
              title: `每日歸還與逾期彙整（${todayString}）`,
              color: overdueList.length > 0 ? 0xdc2626 : 0x18181b, // 有逾期顯示紅色，僅今日到期顯示深灰
              fields,
              footer: { text: '德明學生會 設備部借用系統' },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      }).catch((err) => console.error('Discord 彙整通知發送失敗:', err));
    }

    return NextResponse.json({
      success: true,
      dueToday: dueTodayList.length,
      overdue: overdueList.length,
      message: `已處理 ${dueTodayList.length} 筆今日到期、${overdueList.length} 筆逾期通知。`,
    });
  } catch (error: any) {
    console.error('Cron Job 執行失敗:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}