import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Settings, X, Loader2, Pencil } from 'lucide-react'; // 🌟 연필 아이콘 추가
import { doggyData } from '../data/doggyData';
import { backgroundData } from '../data/backgroundData'; // 🌟 배경 데이터 불러오기
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; 
import { onAuthStateChanged } from 'firebase/auth';

export default function Home() {
  // 펫 관련 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDog, setSelectedDog] = useState(doggyData[0]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initPosX: 0, initPosY: 0, isDragged: false, lastX: 0, lastY: 0 });
  
  const [isLoading, setIsLoading] = useState(true); 
  const [isModalReady, setIsModalReady] = useState(false);

  // 🌟 배경 & 꾸미기 메뉴 관련 상태
  const [selectedBg, setSelectedBg] = useState(backgroundData[0]);
  const [isFabOpen, setIsFabOpen] = useState(false); // 플로팅 버튼 메뉴 열림 상태
  const [isBgModalOpen, setIsBgModalOpen] = useState(false); // 배경 선택 모달

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.mySelectedDog) {
              const foundDog = doggyData.find(dog => dog.id === userData.mySelectedDog);
              if (foundDog) setSelectedDog(foundDog);
            }
            if (userData.myDogPosition) setPosition(userData.myDogPosition);
            
            // 🌟 저장된 배경이 있다면 불러오기
            if (userData.mySelectedBg) {
              const foundBg = backgroundData.find(bg => bg.id === userData.mySelectedBg);
              if (foundBg) setSelectedBg(foundBg);
            }
          }
        } catch (error) {
          console.error("🔥 데이터 불러오기 에러:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setPosition({ x: 0, y: 0 });
        setSelectedDog(doggyData[0]);
        setSelectedBg(backgroundData[0]);
        setIsLoading(false); 
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isModalOpen || isBgModalOpen) {
      const timer = setTimeout(() => setIsModalReady(true), 300);
      return () => clearTimeout(timer);
    } else {
      setIsModalReady(false);
    }
  }, [isModalOpen, isBgModalOpen]);

  // 펫 선택 함수
  const handleDogSelect = async (dog) => {
    if (!isModalReady) return; 
    setSelectedDog(dog);
    setIsModalOpen(false);
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { mySelectedDog: dog.id }, { merge: true });
    }
  };

  // 🌟 배경 선택 함수
  const handleBgSelect = async (bg) => {
    if (!isModalReady) return; 
    setSelectedBg(bg);
    setIsBgModalOpen(false);
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { mySelectedBg: bg.id }, { merge: true });
    }
  };

  // 드래그 로직 (기존 유지)
  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initPosX: position.x, initPosY: position.y, isDragged: false, lastX: position.x, lastY: position.y };
  };
  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.isDragged = true;
    const newX = dragRef.current.initPosX + dx;
    const newY = dragRef.current.initPosY + dy;
    dragRef.current.lastX = newX;
    dragRef.current.lastY = newY;
    setPosition({ x: newX, y: newY });
  };
  const handlePointerUp = async (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (!dragRef.current.isDragged) {
      setIsModalOpen(true);
    } else {
      if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await setDoc(userRef, { myDogPosition: { x: dragRef.current.lastX, y: dragRef.current.lastY } }, { merge: true });
        } catch (error) {
          console.error("🔥 파이어베이스 위치 저장 에러:", error);
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-gray-100">
      
      {/* 설정 버튼 */}
      <div className="absolute top-0 right-0 p-5 z-20">
        <Link to="/settings" className="text-gray-600 hover:text-brand transition block active:scale-95 bg-white/50 backdrop-blur-sm p-2 rounded-full">
          <Settings size={24} />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brand w-10 h-10 mb-4" />
          <span className="text-gray-400 font-medium">펫의 방을 여는 중... 🐾</span>
        </div>
      ) : (
        // 🌟 배경 가로 스크롤 영역 (스크롤바 숨김 처리)
        <div 
          className="flex-1 w-full overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* 높이(h-full)에 맞춰 1:1 비율(aspect-square) 유지 */}
          <div className="h-full aspect-square relative">
            
            {/* 배경 이미지 */}
            <img 
              src={selectedBg.image} 
              alt="룸 배경" 
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* 강아지 캐릭터 (배경과 함께 스크롤되도록 배경 컨테이너 안에 배치) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="pointer-events-auto touch-none relative z-10"
                style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
              >
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="cursor-grab active:cursor-grabbing animate-[bounce_3s_ease-in-out_infinite] rounded-full"
                >
                  <img
                    src={selectedDog.image}
                    alt={selectedDog.name}
                    draggable={false}
                    className="w-44 h-44 object-contain drop-shadow-xl"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 🌟 우측 하단 플로팅 버튼 (글래스모피즘) */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col items-end gap-3">
        {/* 확장 메뉴들 */}
        {isFabOpen && (
          <div className="flex flex-col gap-3 animate-[slideUp_0.2s_ease-out] origin-bottom-right">
            {[
              { label: '배경 변경', action: () => { setIsBgModalOpen(true); setIsFabOpen(false); } },
              { label: '가구 배치', action: () => {} },
              { label: '가전 배치', action: () => {} },
              { label: '소품 배치', action: () => {} },
              { label: '댕댕 추가', action: () => {} },
            ].map((menu, idx) => (
              <button 
                key={idx}
                onClick={menu.action}
                className="bg-white/60 backdrop-blur-md border border-white/40 shadow-lg text-gray-800 font-bold px-4 py-2.5 rounded-full text-sm transition active:scale-95"
              >
                {menu.label}
              </button>
            ))}
          </div>
        )}

        {/* 연필 버튼 */}
        <button 
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 backdrop-blur-lg transition-all duration-300 active:scale-95 ${
            isFabOpen ? 'bg-brand text-white rotate-45' : 'bg-white/70 text-gray-700'
          }`}
        >
          <Pencil size={24} />
        </button>
      </div>

      {/* 펫 선택 모달 (기존과 동일) */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end z-50">
          <div className="bg-white rounded-t-3xl p-6 min-h-[350px] w-full animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">함께할 펫 선택</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={28} /></button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {doggyData.map((dog) => (
                <button
                  key={dog.id}
                  onClick={() => handleDogSelect(dog)}
                  className={`flex flex-col items-center p-4 rounded-2xl border-2 transition ${isModalReady ? 'active:scale-95' : 'opacity-90'} ${selectedDog.id === dog.id ? 'border-brand bg-brand/5' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <img src={dog.image} alt={dog.name} className="w-16 h-16 object-contain mb-3 drop-shadow-sm" />
                  <span className="text-sm font-bold text-gray-700">{dog.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 배경 선택 모달 */}
      {isBgModalOpen && (
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end z-50">
          <div className="bg-white rounded-t-3xl p-6 min-h-[350px] w-full animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">배경 변경</h3>
              <button onClick={() => setIsBgModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={28} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {backgroundData.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => handleBgSelect(bg)}
                  className={`flex flex-col items-center p-2 rounded-2xl border-2 transition overflow-hidden ${isModalReady ? 'active:scale-95' : 'opacity-90'} ${selectedBg.id === bg.id ? 'border-brand bg-brand/5' : 'border-transparent'}`}
                >
                  <img src={bg.image} alt={bg.name} className="w-full h-32 object-cover rounded-xl mb-2" />
                  <span className="text-sm font-bold text-gray-700">{bg.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
