import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Settings, X, Loader2 } from 'lucide-react'; // 🌟 로딩 아이콘(Loader2) 추가
import { doggyData } from '../data/doggyData';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; 
import { onAuthStateChanged } from 'firebase/auth';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDog, setSelectedDog] = useState(doggyData[0]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // 🌟 1. 데이터를 불러오는 중인지 확인하는 로딩 상태 (처음엔 무조건 true)
  const [isLoading, setIsLoading] = useState(true); 

  const dragRef = useRef({ startX: 0, startY: 0, initPosX: 0, initPosY: 0, isDragged: false, lastX: 0, lastY: 0 });

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
            
            if (userData.myDogPosition) {
              setPosition(userData.myDogPosition);
            }
          }
        } catch (error) {
          console.error("🔥 데이터 불러오기 에러:", error);
        } finally {
          // 🌟 2. 데이터 세팅이 (성공하든 실패하든) 다 끝났으면 로딩을 끝냅니다!
          setIsLoading(false);
        }
      } else {
        // 로그아웃 상태일 때도 로딩은 끝내줘야 화면이 보입니다.
        setPosition({ x: 0, y: 0 });
        setSelectedDog(doggyData[0]);
        setIsLoading(false); 
      }
    });

    return () => unsubscribe();
  }, []);

  // ... (handleDogSelect, handlePointerDown 등 함수들은 기존 코드 그대로 유지) ...

  const handleDogSelect = async (dog) => {
    setSelectedDog(dog);
    setIsModalOpen(false);
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { mySelectedDog: dog.id }, { merge: true });
    }
  };

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX, startY: e.clientY, initPosX: position.x, initPosY: position.y, isDragged: false, lastX: position.x, lastY: position.y
    };
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
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, {
          myDogPosition: { x: dragRef.current.lastX, y: dragRef.current.lastY }
        }, { merge: true });
      }
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* 톱니바퀴 설정 버튼 */}
      <div className="absolute top-0 right-0 p-5 z-20">
        <Link to="/settings" className="text-gray-400 hover:text-brand transition block active:scale-95">
          <Settings size={24} />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brand w-10 h-10 mb-4" />
          <span className="text-gray-400 font-medium">펫의 방을 여는 중... 🐾</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-5 relative">
          
          {/* 🌟 1. 드래그된 최종 위치를 고정하는 바깥쪽 상자 */}
          <div
            className="touch-none relative z-10"
            style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
          >
            {/* 🌟 2. 터치 인식 + 둥둥 떠다니는 애니메이션 합치기 */}
            {/* rounded-full을 추가해 정사각형의 투명한 모서리 클릭을 방지합니다. */}
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
                // 애니메이션이 부모 div로 올라갔으므로 여기서는 빼줍니다!
                className="w-44 h-44 object-contain drop-shadow-xl"
              />
            </div>
          </div>

        </div>
      )}

      {/* 모달창 코드는 기존과 완벽하게 동일합니다 */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end z-50">
          <div className="bg-white rounded-t-3xl p-6 min-h-[350px] w-full animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">함께할 펫 선택</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={28} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {doggyData.map((dog) => (
                <button
                  key={dog.id}
                  onClick={() => handleDogSelect(dog)}
                  className={`flex flex-col items-center p-4 rounded-2xl border-2 transition active:scale-95 ${
                    selectedDog.id === dog.id ? 'border-brand bg-brand/5' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <img src={dog.image} alt={dog.name} className="w-16 h-16 object-contain mb-3 drop-shadow-sm" />
                  <span className="text-sm font-bold text-gray-700">{dog.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
