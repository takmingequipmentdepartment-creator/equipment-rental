import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// 初始化 Resend 並帶入環境變數中的 API Key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // 接收來自 /dashboard 傳過來的學生資料與審核狀態
    const { email, studentName, equipmentName, status } = await request.json();

    // 呼叫 Resend 發送信件
    const { data, error } = await resend.emails.send({
      // ⚠️ 測試階段只能用 onboarding@resend.dev，且只能寄給你註冊 Resend 的信箱
      from: '德明設備部 <onboarding@resend.dev>',
      to: [email],
      subject: `【德明設備部】借用申請狀態更新：${status}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">您好，${studentName} 同學：</h2>
          <p>您申請借用的設備清單：<strong>${equipmentName}</strong></p>
          <p>目前的審核狀態已更新為：
            <strong style="color: ${status === '已借出' ? '#16a34a' : status === '駁回' ? '#dc2626' : '#ca8a04'}; font-size: 18px;">
              ${status}
            </strong>
          </p>
          <br />
          <hr style="border: 1px solid #eee;" />
          <p style="font-size: 14px; color: #666;">
            如有任何問題，請聯繫德明學生會設備部。<br />
            ※ 此為系統自動發送之信件，請勿直接回覆。
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}