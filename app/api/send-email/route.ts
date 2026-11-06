import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    // 🌟 終端機假寄信模式：不真的寄信，而是印在終端機
    console.log('\n=============================================');
    console.log('🚀 [系統通知] 成功攔截並模擬寄出一封 Email！');
    console.log(`👤 收件人 (To): ${to}`);
    console.log(`📝 主旨 (Subject): ${subject}`);
    console.log(`📄 信件內容:\n${html}`);
    console.log('=============================================\n');

    // 回傳成功給前端
    return NextResponse.json({ message: 'Fake email logged successfully' }, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to process email' }, { status: 500 });
  }
}