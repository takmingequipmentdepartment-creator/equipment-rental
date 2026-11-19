import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const {
      studentName,
      department,
      equipmentName,
      email,
      phone,
      activityName,
      borrowDate,
      returnDate,
    } = await request.json();

    const formattedEquipment = equipmentName
      ? equipmentName.split(', ').join('<br/>')
      : '未填寫';

    const { data, error } = await resend.emails.send({
      from: '德明學生會 設備部 <noreply@takming-rent.me>',
      to: ['takmingequipmentdepartment@gmail.com'],
      subject: `【德明學生會 設備部】新借用申請通知：${studentName}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #18181b; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="border-bottom: 1px solid #e4e4e7; padding-bottom: 12px; font-weight: 600; font-size: 20px;">
            收到新的設備借用申請
          </h2>
          <p style="font-size: 14px; color: #3f3f46;">
            以下為新提交的借用申請明細，請盡快登入審核後台處理。
          </p>

          <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <ul style="list-style: none; padding-left: 0; margin: 0; font-size: 14px;">
              <li style="margin-bottom: 8px;"><strong>申請活動：</strong>${activityName || '未填寫'}</li>
              <li style="margin-bottom: 8px;"><strong>申請單位：</strong>${department || '未填寫'}</li>
              <li style="margin-bottom: 8px;"><strong>申請人：</strong>${studentName}</li>
              <li style="margin-bottom: 8px;"><strong>聯絡信箱：</strong>${email}</li>
              <li style="margin-bottom: 12px;"><strong>聯絡電話：</strong>${phone}</li>
              <li style="margin-bottom: 12px;">
                <strong>借用設備清單：</strong>
                <div style="margin-top: 6px; padding-left: 10px; border-left: 2px solid #a1a1aa;">
                  ${formattedEquipment}
                </div>
              </li>
              <li style="border-top: 1px solid #e4e4e7; padding-top: 12px; margin-bottom: 8px;">
                <strong>預計借用日：</strong>${borrowDate || '未設定'}
              </li>
              <li style="margin-bottom: 0; color: #dc2626;">
                <strong>系統預計歸還日：</strong><strong>${returnDate || '未設定'}</strong>
              </li>
            </ul>
          </div>

          <div style="margin-top: 24px;">
            <a
              href="https://takming-rent.me/dashboard"
              style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500;"
            >
              前往審核後台
            </a>
          </div>

          <p style="font-size: 12px; color: #71717a; margin-top: 30px; border-top: 1px solid #e4e4e7; padding-top: 15px;">
            ※ 此為系統自動發送之通知信件，請勿直接回覆。<br />
            <strong>德明學生會 設備部</strong>
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