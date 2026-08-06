import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookImage } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const originalHeight = window.innerHeight;

    const handleResize = () => {
      // 화면 높이가 150px 이상 줄어들면 키보드가 올라온 것으로 판단
      if (originalHeight - window.innerHeight > 150) {
        setIsKeyboardOpen(true);
      } else {
        setIsKeyboardOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 키보드가 켜졌을 때는 하단 바를 화면에서 아예 없앱니다
  if (isKeyboardOpen) return null;

  return (
    <div className="absolute bottom-0 w-full h-16 bg-white border-t border-gray-100 flex shadow-[0_-5px_10px_rgba(0,0,0,0.05)] z-40">
      <Link to="/" className="flex-1 flex flex-col items-center justify-center transition-colors">
        <Home size={24} className={location.pathname === '/' ? 'text-brand' : 'text-gray-300'} />
        <span className={`text-xs mt-1 font-medium ${location.pathname === '/' ? 'text-brand' : 'text-gray-400'}`}>마이룸</span>
      </Link>
      <Link to="/diary" className="flex-1 flex flex-col items-center justify-center transition-colors">
        <BookImage size={24} className={location.pathname === '/diary' ? 'text-brand' : 'text-gray-300'} />
        <span className={`text-xs mt-1 font-medium ${location.pathname === '/diary' ? 'text-brand' : 'text-gray-400'}`}>일기장</span>
      </Link>
    </div>
  );
}
