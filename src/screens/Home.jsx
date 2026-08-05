import React from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react'; 

export default function Home() {
  return (
    <div className="flex flex-col h-full relative">
      {/* 🌟 톱니바퀴 설정 버튼 */}
      <div className="absolute top-0 right-0 p-5 z-10">
        <Link to="/settings" className="text-gray-400 hover:text-brand transition block active:scale-95">
          <Settings size={24} />
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-5">
        <h2 className="text-2xl font-bold text-brand mb-6">내 펫의 방 🐾</h2>
        
        {/* 🌟 여기에 방금 만든 투명 배경 꾸루 이미지가 들어갑니다! (둥둥 떠다니는 애니메이션 추가) */}
        <img
          src="/ezgif-8ab4d8c3c611b2e0.webp"
          alt="꾸루"
          className="w-56 h-56 object-contain drop-shadow-xl animate-[bounce_3s_ease-in-out_infinite] mb-6"
        />

        <p className="text-base text-gray-500 text-center">여기에 귀여운 꾸루의 방이 꾸며질 예정입니다.</p>
      </div>
    </div>
  );
}
