import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';

import LoginScreen from './screens/LoginScreen';
import Home from './screens/Home';
// 👇 이름과 경로를 완벽하게 맞췄습니다!
import Diary from './screens/Diary'; 
import SettingsScreen from './screens/SettingsScreen'; 
import BottomNav from './components/BottomNav';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-bglight font-bold text-brand">Petiary 로딩중...</div>;

  return (
    <BrowserRouter>
      {!user ? (
        <LoginScreen />
      ) : (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl relative overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-bglight pb-16">
            <Routes>
              <Route path="/" element={<Home />} />
              {/* 👇 소문자 /diary 로 주소 통일, 컴포넌트 이름도 정확히 매칭! */}
              <Route path="/diary" element={<Diary />} />
              <Route path="/settings" element={<SettingsScreen />} /> 
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <BottomNav />
        </div>
      )}
    </BrowserRouter>
  );
}
