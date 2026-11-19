import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('缺少環境變數 DISCORD_WEBHOOK_URL');
      return NextResponse.json(
        { error: 'Discord Webhook 未設定' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      studentName,
      department,
      equipmentName,
      email,
      phone,
      activityName,
      borrowDate,
      returnDate,
    } = body;

    const formattedEquipments = equipmentName
      ? equipmentName
          .split(', ')
          .map((item: string) => `• ${item}`)
          .join('\n')
      : '無';

    const discordPayload = {
      username: '德明學生會 設備部',
      embeds: [
        {
          title: '新設備借用申請通知',
          description: '有新的借用申請已送出，請管理員前往後台審核。',
          color: 0x18181b, // 極簡深灰（Zinc-900）
          fields: [
            { name: '借用單位', value: department || '未填寫', inline: true },
            { name: '申請人', value: studentName || '未填寫', inline: true },
            { name: '活動名稱', value: activityName || '未填寫', inline: false },
            { name: '預計借用日', value: borrowDate || '未填寫', inline: true },
            { name: '預計歸還日', value: returnDate || '未填寫', inline: true },
            { name: '聯絡電話', value: phone || '未填寫', inline: true },
            { name: '電子信箱', value: email || '未填寫', inline: true },
            { name: '借用設備清單', value: formattedEquipments, inline: false },
            {
              name: '快速審核',
              value: '[點此前往管理員後台](https://www.takming-rent.me/dashboard)',
              inline: false,
            },
          ],
          footer: {
            text: '德明學生會 設備部借用系統',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord Webhook 發送失敗:', response.status, errorText);
      return NextResponse.json(
        { error: 'Discord 通知發送失敗' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('處理管理員通知時發生錯誤:', error);
    return NextResponse.json(
      { error: '伺服器內部錯誤' },
      { status: 500 }
    );
  }
}