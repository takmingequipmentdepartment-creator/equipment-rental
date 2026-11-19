import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      studentName,
      equipmentName,
      status,
      activityName,
      returnDate,
      reviewedBy,
      to,
      subject,
      html,
    } = body;

    const mailTo = to || email;
    const mailSubject = subject || `【德明學生會 設備部】借用申請狀態更新：${status}`;
    const mailHtml =
      html ||
      `
      <div style="font-family: sans-serif; line-height: 1.6; color: #18181b; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="border-bottom: 1px solid #e4e4e7; padding-bottom: 12px; font-weight: 600; font-size: 20px;">
          借用申請狀態更新
        </h2>
        <p>您好，<strong>${studentName}</strong> 同學：</p>
        <p>
          您的設備借用申請狀態已更新為：
          <strong style="color: ${
            status === '駁回' ? '#dc2626' : '#18181b'
          };">
            ${status}
          </strong>
        </p>

        <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 15px; color: #18181b;">申請單明細</h3>
          <ul style="list-style: none; padding-left: 0; margin-bottom: 0; font-size: 14px;">
            <li style="margin-bottom: 8px;"><strong>申請活動：</strong>${activityName || '未填寫'}</li>
            <li style="margin-bottom: 8px;"><strong>借用設備：</strong>${equipmentName}</li>
            ${
              status === '已借出'
                ? `<li style="margin-bottom: 8px; color: #dc2626;"><strong>應歸還日：</strong>${returnDate || '未設定'}（請務必於期限內歸還）</li>`
                : ''
            }
            <li style="margin-bottom: 0;"><strong>審核人員：</strong>${reviewedBy || '德明學生會 設備部'}</li>
          </ul>
        </div>

        <p style="font-size: 12px; color: #71717a; margin-top: 30px; border-top: 1px solid #e4e4e7; padding-top: 15px;">
          如有任何問題，請聯繫德明學生會 設備部。<br />
          ※ 此為系統自動發送之信件，請勿直接回覆。<br />
          <strong>德明學生會 設備部</strong>
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: '德明學生會 設備部 <noreply@takming-rent.me>',
      to: [mailTo],
      subject: mailSubject,
      html: mailHtml,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}