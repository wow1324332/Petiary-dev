import React from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react'; 

export default function Home() {
  return (
    <div className="flex flex-col h-full relative">
      {/* 🌟 톱니바퀴 설정 버튼 유지 */}
      <div className="absolute top-0 right-0 p-5 z-10">
        <Link to="/settings" className="text-gray-400 hover:text-brand transition block active:scale-95">
          <Settings size={24} />
        </Link>
      </div>

      {/* 🌟 텍스트 제거 및 강아지 위치 조정 */}
      <div className="flex-1 flex flex-col items-center justify-center p-5">
        <img
          src="/ezgif-8ab4d8c3c611b2e0.webp"
          alt="꾸루"
          // 크기를 w-44 h-44로 줄이고, mt-20을 추가해 화면 중앙에서 살짝 하단으로 내렸습니다.
          className="w-44 h-44 object-contain drop-shadow-xl animate-[bounce_3s_ease-in-out_infinite] mt-20"
        />
      </div>
    </div>
  );
}
