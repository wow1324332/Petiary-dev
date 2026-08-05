import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function LoginScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailSubmit = async (e) => {
    e.preventDefault(); // 폼 제출 시 새로고침 방지
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

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-bglight items-center justify-center relative shadow-xl">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-brand mb-2">Petiary</h1>
        <p className="text-gray-600">꾸우, 꾸루와 함께하는 소중한 시간들</p>
      </div>

      <div className="w-full px-8">
        <button 
          className="w-full bg-brand h-14 rounded-full flex justify-center items-center shadow-md text-white text-lg font-bold transition active:scale-95"
          onClick={() => setModalVisible(true)}
        >
          이메일로 시작하기
        </button>
      </div>

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
