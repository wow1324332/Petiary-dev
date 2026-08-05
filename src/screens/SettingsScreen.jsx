import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { ArrowLeft, LogOut } from 'lucide-react';

export default function SettingsScreen() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirmLogout = window.confirm("정말 로그아웃 하시겠습니까?");
    if (confirmLogout) {
      try {
        await signOut(auth);
        // 로그아웃 성공 시 App.jsx가 감지하여 자동으로 로그인 화면으로 이동합니다.
      } catch (error) {
        alert("로그아웃 중 오류가 발생했습니다.");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-bglight">
      {/* 상단 헤더 (뒤로가기 버튼) */}
      <div className="flex items-center p-5 sticky top-0 bg-bglight z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 active:scale-95 transition">
          <ArrowLeft size={24} className="text-gray-800" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">설정</h2>
      </div>
      
      {/* 설정 메뉴 리스트 */}
      <div className="p-5">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition"
        >
          <div className="flex items-center text-red-500 font-bold">
            <LogOut size={20} className="mr-3" />
            로그아웃
          </div>
        </button>
      </div>
    </div>
  );
}
