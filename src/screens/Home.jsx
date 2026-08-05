import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Settings, X, Loader2, Pencil } from 'lucide-react'; 
import { doggyData } from '../data/doggyData';
import { backgroundData } from '../data/backgroundData';
import { furnitureData } from '../data/furnitureData'; // 🌟 가구 데이터 불러오기
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; 
import { onAuthStateChanged } from 'firebase/auth';

// =============================================================================
// 🌟 [신규 컴포넌트] 가구의 개별 이동 & 핀치 줌을 담당하는 컴포넌트
// =============================================================================
const DraggableFurniture = ({ item, onUpdate, isModalReady }) => {
  const [pos, setPos] = useState({ x: item.x, y: item.y });
  const [scale, setScale] = useState(item.scale || 1);
  
  // 멀티 터치(손가락 여러 개)를 추적하기 위한 저장소
  const pointers = useRef(new Map()); 
  const dragStart = useRef({ x: 0, y: 0, initX: pos.x, initY: pos.y });
  const pinchStart = useRef({ dist: 0, initScale: scale });
  const isModified = useRef(false); // 변경사항이 있는지 체크

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 손가락 1개: 이동(Drag) 준비
    if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY, initX: pos.x, initY: pos.y };
    } 
    // 손가락 2개: 확대/축소(Pinch Zoom) 준비
    else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStart.current = { dist, initScale: scale };
    }
  };

  const handlePointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 손가락 1개: 위치 이동
    if (pointers.current.size === 1) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPos({ x: dragStart.current.initX + dx, y: dragStart.current.initY + dy });
      isModified.current = true;
    } 
    // 손가락 2개: 크기 조절
    else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      // 최소 0.3배 ~ 최대 2.5배까지만 커지도록 제한
      const newScale = Math.max(0.3, Math.min(2.5, pinchStart.current.initScale * (dist / pinchStart.current.dist))); 
      setScale(newScale);
      isModified.current = true;
    }
  };

  const handlePointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    // 터치가 모두 끝났고, 움직인 기록이 있다면 파이어베이스 저장을 위해 부모에게 알림!
    if (pointers.current.size === 0 && isModified.current) {
      onUpdate(item.instanceId, pos.x, pos.y, scale);
      isModified.current = false;
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="absolute top-1/2 left-1/2 touch-none cursor-grab active:cursor-grabbing z-0"
      style={{ 
        // 🌟 위치(translate)와 크기(scale)를 동시에 적용
        transform: `translate3d(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px), 0) scale(${scale})` 
      }}
    >
      <img src={item.image} alt="가구" draggable={false} className="w-48 object-contain drop-shadow-md" />
    </div>
  );
};


// =============================================================================
// 🌟 메인 홈 화면 컴포넌트
// =============================================================================
export default function Home() {
  const [isLoading, setIsLoading] = useState(true); 
  const [isModalReady, setIsModalReady] = useState(false);
  
  // 강아지 & 배경 상태
  const [selectedDog, setSelectedDog] = useState(doggyData[0]);
  const [dogPosition, setDogPosition] = useState({ x: 0, y: 0 });
  const [selectedBg, setSelectedBg] = useState(backgroundData[0]);
  
  // 🌟 배치된 가구들을 담는 배열 (여러 개의 가구를 배치할 수 있습니다!)
  const [placedFurniture, setPlacedFurniture] = useState([]);

  // 모달 오픈 상태
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isDogModalOpen, setIsDogModalOpen] = useState(false);
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);
  const [isFurnModalOpen, setIsFurnModalOpen] = useState(false); // 가구 모달

  const dogDragRef = useRef({ startX: 0, startY: 0, initPosX: 0, initPosY: 0, isDragged: false, lastX: 0, lastY: 0 });
  const [isDogDragging, setIsDogDragging] = useState(false);

  // 1. 파이어베이스 데이터 불러오기
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
            if (userData.myDogPosition) setDogPosition(userData.myDogPosition);
            if (userData.mySelectedBg) {
              const foundBg = backgroundData.find(bg => bg.id === userData.mySelectedBg);
              if (foundBg) setSelectedBg(foundBg);
            }
            // 🌟 배치된 가구들 불러오기
            if (userData.myPlacedFurniture) {
              setPlacedFurniture(userData.myPlacedFurniture);
            }
          }
        } catch (error) {
          console.error("데이터 불러오기 에러:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setDogPosition({ x: 0, y: 0 });
        setSelectedDog(doggyData[0]);
        setSelectedBg(backgroundData[0]);
        setPlacedFurniture([]);
        setIsLoading(false); 
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. 모달 방어막 타이머 (고스트 클릭 방지)
  useEffect(() => {
    if (isDogModalOpen || isBgModalOpen || isFurnModalOpen) {
      const timer = setTimeout(() => setIsModalReady(true), 300);
      return () => clearTimeout(timer);
    } else {
      setIsModalReady(false);
    }
  }, [isDogModalOpen, isBgModalOpen, isFurnModalOpen]);


  // 3. 🌟 가구 추가 함수 (방 정중앙에 기본 크기로 톡! 떨어집니다)
  const handleFurnitureSelect = async (furnItem) => {
    if (!isModalReady) return; 
    
    // 새 가구 데이터 생성 (고유한 instanceId 부여)
    const newFurniture = {
      instanceId: Date.now(), // 고유 번호 (여러 개의 소파를 구분하기 위해)
      baseId: furnItem.id,
      image: furnItem.image,
      x: 0, 
      y: 0, 
      scale: 1
    };

    const updatedFurniture = [...placedFurniture, newFurniture];
    setPlacedFurniture(updatedFurniture);
    setIsFurnModalOpen(false);

    // 파이어베이스에 전체 가구 배열 업데이트
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { myPlacedFurniture: updatedFurniture }, { merge: true });
    }
  };

  // 4. 🌟 가구 이동/크기조절 완료 시 실행되는 함수
  const handleFurnitureUpdate = async (instanceId, newX, newY, newScale) => {
    // 변경된 가구만 데이터를 업데이트해서 배열 교체
    const updatedFurniture = placedFurniture.map(item => 
      item.instanceId === instanceId ? { ...item, x: newX, y: newY, scale: newScale } : item
    );
    setPlacedFurniture(updatedFurniture);

    // 파이어베이스 저장
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { myPlacedFurniture: updatedFurniture }, { merge: true });
    }
  };


  // 강아지 드래그 및 선택 로직 (기존과 동일)
  const handleDogSelect = async (dog) => {
    if (!isModalReady) return; 
    setSelectedDog(dog); setIsDogModalOpen(false);
    if (auth.currentUser) await setDoc(doc(db, 'users', auth.currentUser.uid), { mySelectedDog: dog.id }, { merge: true });
  };
  const handleBgSelect = async (bg) => {
    if (!isModalReady) return; 
    setSelectedBg(bg); setIsBgModalOpen(false);
    if (auth.currentUser) await setDoc(doc(db, 'users', auth.currentUser.uid), { mySelectedBg: bg.id }, { merge: true });
  };

  const handleDogPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId); setIsDogDragging(true);
    dogDragRef.current = { startX: e.clientX, startY: e.clientY, initPosX: dogPosition.x, initPosY: dogPosition.y, isDragged: false, lastX: dogPosition.x, lastY: dogPosition.y };
  };
  const handleDogPointerMove = (e) => {
    if (!isDogDragging) return;
    const dx = e.clientX - dogDragRef.current.startX; const dy = e.clientY - dogDragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dogDragRef.current.isDragged = true;
    const newX = dogDragRef.current.initPosX + dx; const newY = dogDragRef.current.initPosY + dy;
    dogDragRef.current.lastX = newX; dogDragRef.current.lastY = newY;
    setDogPosition({ x: newX, y: newY });
  };
  const handleDogPointerUp = async (e) => {
    if (!isDogDragging) return;
    setIsDogDragging(false); e.currentTarget.releasePointerCapture(e.pointerId);
    if (!dogDragRef.current.isDragged) setIsDogModalOpen(true);
    else if (auth.currentUser) await setDoc(doc(db, 'users', auth.currentUser.uid), { myDogPosition: { x: dogDragRef.current.lastX, y: dogDragRef.current.lastY } }, { merge: true });
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-gray-100">
      <div className="absolute top-0 right-0 p-5 z-40">
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
        <div className="flex-1 w-full overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="h-full aspect-square relative">
            <img src={selectedBg.image} alt="룸 배경" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

            {/* 🌟 1. 배치된 가구들 렌더링 영역 (강아지보다 뒤에 보이도록 z-0 할당) */}
            {placedFurniture.map(item => (
              <DraggableFurniture 
                key={item.instanceId} 
                item={item} 
                onUpdate={handleFurnitureUpdate} 
                isModalReady={isModalReady} 
              />
            ))}

            {/* 2. 강아지 렌더링 영역 (가구보다 앞에 보이도록 z-10 할당) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto touch-none relative z-10" style={{ transform: `translate3d(${dogPosition.x}px, ${dogPosition.y}px, 0)` }}>
                <div onPointerDown={handleDogPointerDown} onPointerMove={handleDogPointerMove} onPointerUp={handleDogPointerUp} onPointerCancel={handleDogPointerUp} className="cursor-grab active:cursor-grabbing animate-[bounce_3s_ease-in-out_infinite] rounded-full">
                  <img src={selectedDog.image} alt={selectedDog.name} draggable={false} className="w-44 h-44 object-contain drop-shadow-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 플로팅 버튼 영역 */}
      <div className="absolute bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {isFabOpen && (
          <div className="flex flex-col gap-3 animate-[slideUp_0.2s_ease-out] origin-bottom-right">
            {[
              { label: '배경 변경', action: () => { setIsBgModalOpen(true); setIsFabOpen(false); } },
              // 🌟 '가구 배치' 버튼 클릭 시 모달 연결
              { label: '가구 배치', action: () => { setIsFurnModalOpen(true); setIsFabOpen(false); } },
              { label: '가전 배치', action: () => {} },
              { label: '소품 배치', action: () => {} },
              { label: '댕댕 추가', action: () => {} },
            ].map((menu, idx) => (
              <button key={idx} onClick={menu.action} className="bg-white/60 backdrop-blur-md border border-white/40 shadow-lg text-gray-800 font-bold px-4 py-2.5 rounded-full text-sm transition active:scale-95">
                {menu.label}
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setIsFabOpen(!isFabOpen)} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 backdrop-blur-lg transition-all duration-300 active:scale-95 ${isFabOpen ? 'bg-brand text-white rotate-45' : 'bg-white/70 text-gray-700'}`}>
          <Pencil size={24} />
        </button>
      </div>

      {/* 펫 & 배경 모달 (생략 없이 모두 포함) */}
      {isDogModalOpen && (
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end z-50">
          <div className="bg-white rounded-t-3xl p-6 min-h-[350px] w-full animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">함께할 펫 선택</h3>
              <button onClick={() => setIsDogModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={28} /></button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {doggyData.map((dog) => (
                <button key={dog.id} onClick={() => handleDogSelect(dog)} className={`flex flex-col items-center p-4 rounded-2xl border-2 transition ${isModalReady ? 'active:scale-95' : 'opacity-90'} ${selectedDog.id === dog.id ? 'border-brand bg-brand/5' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <img src={dog.image} alt={dog.name} className="w-16 h-16 object-contain mb-3 drop-shadow-sm" />
                  <span className="text-sm font-bold text-gray-700">{dog.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isBgModalOpen && (
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end z-50">
          <div className="bg-white rounded-t-3xl p-6 min-h-[350px] w-full animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">배경 변경</h3>
              <button onClick={() => setIsBgModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={28} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {backgroundData.map((bg) => (
                <button key={bg.id} onClick={() => handleBgSelect(bg)} className={`flex flex-col items-center p-2 rounded-2xl border-2 transition overflow-hidden ${isModalReady ? 'active:scale-95' : 'opacity-90'} ${selectedBg.id === bg.id ? 'border-brand bg-brand/5' : 'border-transparent'}`}>
                  <img src={bg.image} alt={bg.name} className="w-full h-32 object-cover rounded-xl mb-2" />
                  <span className="text-sm font-bold text-gray-700">{bg.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 가구 선택 모달 */}
      {isFurnModalOpen && (
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end z-50">
          <div className="bg-white rounded-t-3xl p-6 min-h-[350px] w-full animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">가구 배치하기</h3>
              <button onClick={() => setIsFurnModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={28} /></button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {furnitureData.map((furn) => (
                <button
                  key={furn.id}
                  onClick={() => handleFurnitureSelect(furn)}
                  className={`flex flex-col items-center p-4 rounded-2xl border-2 border-gray-100 hover:bg-gray-50 transition ${isModalReady ? 'active:scale-95' : 'opacity-90'}`}
                >
                  <img src={furn.image} alt={furn.name} className="w-16 h-16 object-contain mb-3 drop-shadow-sm" />
                  <span className="text-sm font-bold text-gray-700 text-center">{furn.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
