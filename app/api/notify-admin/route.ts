import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // 接收來自前台送單頁面傳來的資料
    const { studentName, department, equipmentName, email, phone } = await request.json();

    const { data, error } = await resend.emails.send({
      from: '系統通知 <onboarding@resend.dev>',
      // ⚠️ 關鍵：這裡請務必填寫你「註冊 Resend 的那個管理員信箱」
      to: ['takmingequipmentdepartment@gmail.com'], 
      subject: `🚨【新申請通知】${studentName} 提交了借用申請`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
          <h2 style="color: #ea580c;">🔔 收到新的設備借用申請！</h2>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p style="margin: 5px 0;"><strong>申請單位：</strong> ${department || '未填寫'}</p>
            <p style="margin: 5px 0;"><strong>申請人：</strong> ${studentName}</p>
            <p style="margin: 5px 0;"><strong>聯絡信箱：</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>聯絡電話：</strong> ${phone}</p>
            <p style="margin: 5px 0;"><strong>借用設備清單：</strong> <span style="color: #2563eb; font-weight: bold;">${equipmentName}</span></p>
          </div>
          <br />
          <p>請盡快登入後台進行審核。</p>
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