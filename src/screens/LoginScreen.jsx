import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Download } from 'lucide-react';

export default function LoginScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. 현재 기기가 아이폰/아이패드인지 감지
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // 2. 이미 홈 화면에 추가된 '앱 모드'로 실행 중인지 감지
    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);
  }, []);

  // 설치 버튼 클릭 시 동작
  const handleInstallClick = async () => {
    if (isIOS) {
      alert("아이폰에서는 화면 하단의 ⬆️[공유] 버튼을 누른 후, ➕[홈 화면에 추가]를 선택해주세요!");
      return;
    }
    
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      const { outcome } = await window.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        window.deferredPrompt = null;
      }
    } else {
      alert("설치 조건을 확인중입니다. (이 메시지가 계속 뜨면 안드로이드 크롬의 '방문 기록(캐시)'을 한 번 지우고 새로고침 해주세요!)");
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault(); 
    try {
      if (isLoginTab) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      alert("오류가 발생했습니다: " + error.message);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      alert("구글 로그인 중 오류가 발생했습니다.");
    }
  };

  return (
    <div 
      className="flex flex-col h-screen max-w-md mx-auto bg-cover bg-center relative shadow-xl justify-end pb-12"
      style={{ backgroundImage: "url('/Login-bg.webp')" }} // 🌟 배경 이미지 적용
    >
      
      {/* 우측 상단 앱 설치 버튼 */}
      {!isStandalone && (
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={handleInstallClick}
            className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm text-brand font-bold text-sm border border-brand/20 transition active:scale-95"
          >
            <Download size={16} />
            앱 설치
          </button>
        </div>
      )}

      {/* 🌟 기존의 Petiary 타이틀과 문구는 요청하신 대로 삭제했습니다! */}

      {/* 하단 로그인 버튼 영역 */}
      <div className="w-full px-8 flex flex-col gap-4 z-10">
        <button 
          className="w-full bg-brand h-14 rounded-full flex justify-center items-center shadow-md text-white text-lg font-bold transition active:scale-95"
          onClick={() => setModalVisible(true)}
        >
          이메일로 시작하기
        </button>

        <button 
          className="w-full bg-white h-14 rounded-full flex justify-center items-center shadow-md text-gray-700 text-base font-bold border border-gray-200 transition active:scale-95"
          onClick={handleGoogleLogin}
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google 계정으로 시작하기
        </button>
      </div>

      {/* 이메일 로그인/가입 모달 */}
      {modalVisible && (
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end z-50">
          <div className="bg-white rounded-t-3xl p-6 min-h-[450px] w-full animate-[slideUp_0.3s_ease-out]">
            <div className="flex mb-6 border-b border-gray-200">
              <button 
                className={`flex-1 py-4 text-center font-bold text-base transition-colors ${isLoginTab ? 'border-b-2 border-brand text-brand' : 'text-gray-400'}`}
                onClick={() => setIsLoginTab(true)}
              >
                로그인
              </button>
              <button 
                className={`flex-1 py-4 text-center font-bold text-base transition-colors ${!isLoginTab ? 'border-b-2 border-brand text-brand' : 'text-gray-400'}`}
                onClick={() => setIsLoginTab(false)}
              >
                계정 등록
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="flex flex-col mb-6">
              <input 
                type="email"
                className="bg-gray-50 h-14 rounded-xl px-4 mb-4 border border-gray-200 outline-none focus:border-brand" 
                placeholder="이메일 주소" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
              />
              <input 
                type="password"
                className="bg-gray-50 h-14 rounded-xl px-4 mb-4 border border-gray-200 outline-none focus:border-brand" 
                placeholder="비밀번호 (6자리 이상)" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
              />
              <button 
                type="submit"
                className="bg-brand h-14 rounded-xl flex justify-center items-center mt-2 text-white text-lg font-bold w-full transition active:scale-95"
              >
                {isLoginTab ? '로그인' : '가입하기'}
              </button>
            </form>

            <button className="w-full text-center text-gray-400 text-sm py-2" onClick={() => setModalVisible(false)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
