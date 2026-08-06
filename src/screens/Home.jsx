import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Settings, X, Loader2, Pencil } from 'lucide-react'; 
import { doggyData } from '../data/doggyData';
import { backgroundData } from '../data/backgroundData';
import { furnitureData } from '../data/furnitureData'; 
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; 
import { onAuthStateChanged } from 'firebase/auth';  

// =============================================================================
// 🌟 가구 컴포넌트 (롱프레스 유지, 버튼 크기 고정, 미세 떨림 방지 적용)
// =============================================================================
const DraggableFurniture = ({ item, onUpdate, onDelete }) => {
  const [pos, setPos] = useState({ x: item.x, y: item.y });
  const [scale, setScale] = useState(item.scale || 1);
  const [showDelete, setShowDelete] = useState(false); 
  
  const longPressTimer = useRef(null); 
  // 🌟 1. 롱프레스가 성공했는지 기억하는 변수 추가
  const isLongPressed = useRef(false); 

  const pointers = useRef(new Map()); 
  const dragStart = useRef({ x: 0, y: 0, initX: pos.x, initY: pos.y });
  const pinchStart = useRef({ dist: 0, initScale: scale });
  const isModified = useRef(false);

  useEffect(() => {
    // 삭제 버튼이 떠 있지 않으면 굳이 감지할 필요 없음
    if (!showDelete) return; 

    const handleTouchOutside = () => {
      setShowDelete(false); // 어디든 터치하면 X버튼 숨김
    };

    // 화면(window) 전체에 터치 감지기를 달아줍니다.
    window.addEventListener('pointerdown', handleTouchOutside);
    
    return () => {
      // 컴포넌트가 지워지거나 버튼이 숨겨지면 감지기도 깔끔하게 제거
      window.removeEventListener('pointerdown', handleTouchOutside);
    };
  }, [showDelete]);

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    isLongPressed.current = false; // 초기화
    longPressTimer.current = setTimeout(() => {
      setShowDelete(true);
      isLongPressed.current = true; // 🌟 0.5초를 채우면 롱프레스로 인정!
    }, 500);

    if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY, initX: pos.x, initY: pos.y };
    } else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      pinchStart.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), initScale: scale };
    }
  };

  const handlePointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      
      // 🌟 2. 손가락이 5px 이상 확실하게 움직였을 때만 이동으로 간주 (미세한 떨림에 롱프레스가 취소되는 것 방지)
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        clearTimeout(longPressTimer.current);
        setShowDelete(false); 
        setPos({ x: dragStart.current.initX + dx, y: dragStart.current.initY + dy });
        isModified.current = true;
      }
    } else if (pointers.current.size === 2) {
      clearTimeout(longPressTimer.current);
      setShowDelete(false);
      const pts = Array.from(pointers.current.values());
      setScale(Math.max(0.3, Math.min(2.5, pinchStart.current.initScale * (Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / pinchStart.current.dist))));
      isModified.current = true;
    }
  };

  const handlePointerUp = (e) => {
    clearTimeout(longPressTimer.current); 
    pointers.current.delete(e.pointerId);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (pointers.current.size === 0) {
      if (isModified.current) {
        onUpdate(item.instanceId, pos.x, pos.y, scale);
        isModified.current = false;
      } else {
        // 🌟 3. 롱프레스가 아니었던 경우(그냥 가볍게 툭 친 경우)에만 삭제 버튼을 숨김
        if (!isLongPressed.current) {
          setShowDelete(false);
        }
      }
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      className="absolute top-1/2 left-1/2 touch-none select-none cursor-grab active:cursor-grabbing z-0"
      // 🌟 4. 제일 바깥 상자에는 '위치(translate)'만 적용합니다.
      style={{ 
        transform: `translate3d(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px), 0)`,
        WebkitTouchCallout: 'none'
      }}
    >
      {/* 🌟 5. 이미지를 감싸는 안쪽 상자에만 '크기(scale)'를 적용합니다. */}
      <div style={{ transform: `scale(${scale})` }}>
        <img src={item.image} alt="가구" draggable={false} className="w-48 object-contain drop-shadow-md relative pointer-events-none" />
      </div>
      
      {/* 🌟 6. 삭제 버튼은 안쪽 상자 밖에 있으므로, 가구가 커져도 얘는 원래 크기를 유지합니다! */}
      {showDelete && (
        <button
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={(e) => { e.stopPropagation(); onDelete(item.instanceId); }}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white text-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-red-100 z-50 transition active:scale-90"
        >
          <X size={18} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};

// =============================================================================
// 🌟 홈 화면 메인 컴포넌트
// =============================================================================
export default function Home() {
  const [isLoading, setIsLoading] = useState(true); 
  const [isModalReady, setIsModalReady] = useState(false);

  const scrollRef = useRef(null);
  
  const [selectedDog, setSelectedDog] = useState(doggyData[0]);
  const [dogPosition, setDogPosition] = useState({ x: 0, y: 0 });
  const [selectedBg, setSelectedBg] = useState(backgroundData[0]);
  const [placedFurniture, setPlacedFurniture] = useState([]);

  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isDogModalOpen, setIsDogModalOpen] = useState(false);
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);
  const [isFurnModalOpen, setIsFurnModalOpen] = useState(false); 

  const dogDragRef = useRef({ startX: 0, startY: 0, initPosX: 0, initPosY: 0, isDragged: false, lastX: 0, lastY: 0 });
  const [isDogDragging, setIsDogDragging] = useState(false);

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
            if (userData.myPlacedFurniture) setPlacedFurniture(userData.myPlacedFurniture);
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

  useEffect(() => {
    if (isDogModalOpen || isBgModalOpen || isFurnModalOpen) {
      const timer = setTimeout(() => setIsModalReady(true), 300);
      return () => clearTimeout(timer);
    } else {
      setIsModalReady(false);
    }
  }, [isDogModalOpen, isBgModalOpen, isFurnModalOpen]);

  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      const container = scrollRef.current;
      // 전체 스크롤 길이에서 현재 화면 너비를 뺀 후 반으로 나누면 정확히 정중앙이 됩니다.
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
    }
  }, [isLoading]);

  // 가구 추가
  const handleFurnitureSelect = async (furnItem) => {
    if (!isModalReady) return; 
    const newFurniture = { instanceId: Date.now(), baseId: furnItem.id, image: furnItem.image, x: 0, y: 0, scale: 1 };
    const updatedFurniture = [...placedFurniture, newFurniture];
    setPlacedFurniture(updatedFurniture);
    setIsFurnModalOpen(false);
    if (auth.currentUser) await setDoc(doc(db, 'users', auth.currentUser.uid), { myPlacedFurniture: updatedFurniture }, { merge: true });
  };

  // 가구 위치/크기 업데이트
  const handleFurnitureUpdate = async (instanceId, newX, newY, newScale) => {
    const updatedFurniture = placedFurniture.map(item => 
      item.instanceId === instanceId ? { ...item, x: newX, y: newY, scale: newScale } : item
    );
    setPlacedFurniture(updatedFurniture);
    if (auth.currentUser) await setDoc(doc(db, 'users', auth.currentUser.uid), { myPlacedFurniture: updatedFurniture }, { merge: true });
  };

  // 가구 삭제
  const handleFurnitureDelete = async (instanceId) => {
    const updatedFurniture = placedFurniture.filter(item => item.instanceId !== instanceId);
    setPlacedFurniture(updatedFurniture);
    if (auth.currentUser) await setDoc(doc(db, 'users', auth.currentUser.uid), { myPlacedFurniture: updatedFurniture }, { merge: true });
  };

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
    <div className="flex flex-col h-full relative overflow-hidden bg-gray-100"
      onContextMenu={(e) => e.preventDefault()}>
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
        <div ref={scrollRef} className="flex-1 w-full overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="h-full aspect-square relative">
            <img src={selectedBg.image} alt="룸 배경" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

            {/* 가구 렌더링 */}
            {placedFurniture.map(item => (
              <DraggableFurniture 
                key={item.instanceId} 
                item={item} 
                onUpdate={handleFurnitureUpdate} 
                onDelete={handleFurnitureDelete} 
              />
            ))}

            {/* 강아지 렌더링 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto touch-none relative z-10" style={{ transform: `translate3d(${dogPosition.x}px, ${dogPosition.y}px, 0)` }}>
                <div onPointerDown={handleDogPointerDown} onPointerMove={handleDogPointerMove} onPointerUp={handleDogPointerUp} onPointerCancel={handleDogPointerUp} className="cursor-grab active:cursor-grabbing rounded-full">
                  <img src={selectedDog.image} alt={selectedDog.name} draggable={false} className="w-44 h-44 object-contain drop-shadow-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 우측 하단 플로팅 메뉴 */}
      <div className="absolute bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {isFabOpen && (
          <div className="flex flex-col gap-3 animate-[slideUp_0.2s_ease-out] origin-bottom-right">
            {[
              { label: '배경 변경', action: () => { setIsBgModalOpen(true); setIsFabOpen(false); } },
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

      {/* 펫 선택 모달 */}
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
                  <img src={dog.image} alt={dog.name} className="w-16 h-16 object-contain mb-3 drop-shadow-sm pointer-events-none" />
                  <span className="text-sm font-bold text-gray-700">{dog.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 배경 선택 모달 */}
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

      {/* 가구 배치 모달 */}
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
                  <img src={furn.image} alt={furn.name} className="w-16 h-16 object-contain mb-3 drop-shadow-sm" pointer-events-none/>
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
