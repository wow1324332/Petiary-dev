import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';

import LoginScreen from './screens/LoginScreen';
import Home from './screens/Home';
import Feed from './screens/Diary';
import SettingsScreen from './screens/SettingsScreen'; // 🌟 새로 추가된 부분
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
              <Route path="/Diary" element={<Diary />} />
              <Route path="/settings" element={<SettingsScreen />} /> {/* 🌟 설정 경로 추가 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <BottomNav />
        </div>
      )}
    </BrowserRouter>
  );
}
