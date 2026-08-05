import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Settings, X } from 'lucide-react'; 
import { doggyData } from '../data/doggyData';

// 🌟 파이어베이스 기능 불러오기 (경로는 본인 프로젝트에 맞게 확인해주세요!)
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDog, setSelectedDog] = useState(doggyData[0]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragRef = useRef({ startX: 0, startY: 0, initPosX: 0, initPosY: 0, isDragged: false, lastX: 0, lastY: 0 });

  // 1. 🌟 앱 실행 시 Firebase에서 내 데이터 불러오기
  useEffect(() => {
    // 유저의 로그인 상태를 확인하고 데이터를 가져옵니다.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          
          // 저장된 강아지 번호가 있다면 불러오기
          if (userData.mySelectedDog) {
            const foundDog = doggyData.find(dog => dog.id === userData.mySelectedDog);
            if (foundDog) setSelectedDog(foundDog);
          }
          
          // 저장된 강아지 위치가 있다면 불러오기
          if (userData.myDogPosition) {
            setPosition(userData.myDogPosition);
          }
        }
      }
    });

    return () => unsubscribe(); // 컴포넌트가 꺼질 때 리스너 해제
  }, []);

  // 2. 🌟 강아지 선택 시 Firebase에 저장하기
  const handleDogSelect = async (dog) => {
    setSelectedDog(dog);
    setIsModalOpen(false);

    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      // { merge: true }를 꼭 넣어줘야 다른 유저 데이터(이름, 이메일 등)가 날아가지 않습니다!
      await setDoc(userRef, { mySelectedDog: dog.id }, { merge: true });
    }
  };

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: position.x,
      initPosY: position.y,
      isDragged: false,
      lastX: position.x,
      lastY: position.y
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.isDragged = true;
    }
    
    const newX = dragRef.current.initPosX + dx;
    const newY = dragRef.current.initPosY + dy;
    
    dragRef.current.lastX = newX;
    dragRef.current.lastY = newY;
    setPosition({ x: newX, y: newY });
  };

  // 3. 🌟 드래그 종료 시 Firebase에 최종 위치 저장하기
  const handlePointerUp = async (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (!dragRef.current.isDragged) {
      setIsModalOpen(true); // 툭 누른 거면 모달 열기
    } else {
      // 드래그가 끝났으면 파이어베이스에 위치 저장
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
      <div className="absolute top-0 right-0 p-5 z-20">
        <Link to="/settings" className="text-gray-400 hover:text-brand transition block active:scale-95">
          <Settings size={24} />
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-5 relative">
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="touch-none relative cursor-grab active:cursor-grabbing z-10"
          style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
        >
          <img
            src={selectedDog.image}
            alt={selectedDog.name}
            draggable={false}
            className="w-44 h-44 object-contain drop-shadow-xl animate-[bounce_3s_ease-in-out_infinite]"
          />
        </div>
      </div>

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
}
