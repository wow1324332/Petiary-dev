import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookImage } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();

  return (
    <div className="absolute bottom-0 w-full h-16 bg-white border-t border-gray-100 flex shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
      <Link to="/" className="flex-1 flex flex-col items-center justify-center transition-colors">
        <Home size={24} className={location.pathname === '/' ? 'text-brand' : 'text-gray-300'} />
        <span className={`text-xs mt-1 font-medium ${location.pathname === '/' ? 'text-brand' : 'text-gray-400'}`}>마이룸</span>
      </Link>
      
      {/* 👇 클릭 시 이동 주소(to)와 색칠 기준(pathname)을 모두 소문자 /diary 로 완벽하게 통일했습니다! */}
      <Link to="/diary" className="flex-1 flex flex-col items-center justify-center transition-colors">
        <BookImage size={24} className={location.pathname === '/diary' ? 'text-brand' : 'text-gray-300'} />
        <span className={`text-xs mt-1 font-medium ${location.pathname === '/diary' ? 'text-brand' : 'text-gray-400'}`}>일기장</span>
      </Link>
    </div>
  );
}
