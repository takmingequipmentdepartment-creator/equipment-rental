'use client';

import { useState } from 'react';
import { supabase } from '../../utils/supabase';

export default function AddEquipment() {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('處理中，請稍候...');

    let imageUrl = '';

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('equipment-images')
        .upload(filePath, file);

      if (uploadError) {
        setMessage(`❌ 圖片上傳失敗：${uploadError.message}`);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('equipment-images')
        .getPublicUrl(filePath);

      imageUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase
      .from('equipments')
      .insert([{ name: name, quantity: quantity, status: 'available', image_url: imageUrl }]);

    if (error) {
      setMessage(`❌ 新增失敗：${error.message}`);
    } else {
      setMessage('✅ 新增成功！');
      setName('');
      setQuantity(1);
      setFile(null); 
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-10 bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md border border-gray-200">
        <h1 className="text-2xl font-bold text-blue-600 mb-6 text-center">新增設備</h1>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">設備名稱</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-gray-900 w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-1">數量</label>
            <input 
              type="number" 
              required
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="text-gray-900 w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">設備照片 (選填)</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-gray-900 w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition mt-2"
          >
            確認新增
          </button>
        </form>

        {message && (
          <div className="mt-4 text-center font-medium text-gray-700">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}