import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// 初始化 Resend 並帶入環境變數中的 API Key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // 接收來自 /dashboard 傳過來的學生資料、審核狀態與新欄位
    const { 
      email, 
      studentName, 
      equipmentName, 
      status,
      activityName, 
      returnDate,   
      reviewedBy    
    } = await request.json();

    // 呼叫 Resend 發送信件
    const { data, error } = await resend.emails.send({
      // ✅ 這裡已經改成你的專屬網域！現在可以寄給任何學生的信箱了
      from: '德明設備部 <noreply@takming-rent.me>',
      to: [email],
      subject: `【德明設備部】借用申請狀態更新：${status}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
          <h2 style="color: #2563eb;">您好，${studentName} 同學：</h2>
          <p>您的設備借用申請狀態已更新為：
            <strong style="color: ${status === '已借出' ? '#16a34a' : status === '駁回' ? '#dc2626' : '#ca8a04'}; font-size: 18px;">
              ${status}
            </strong>
          </p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #e5e7eb;">
            <h3 style="margin-top: 0; color: #374151; font-size: 16px;">📋 申請單明細</h3>
            <ul style="list-style-type: none; padding-left: 0; margin-bottom: 0;">
              <li style="margin-bottom: 8px;"><strong>🏷️ 申請活動：</strong>${activityName || '未填寫'}</li>
              <li style="margin-bottom: 8px;"><strong>📦 借用設備：</strong>${equipmentName}</li>
              
              <!-- 只有當狀態為已借出時，才特別用紅色強調歸還日期 -->
              ${status === '已借出' ? `<li style="margin-bottom: 8px; color: #dc2626;"><strong>⏰ 應歸還日：</strong>${returnDate || '未設定'} (請務必於期限內歸還)</li>` : ''}
              
              <li style="margin-bottom: 0;"><strong>👨‍💻 審核人員：</strong>${reviewedBy || '設備部管理員'}</li>
            </ul>
          </div>

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