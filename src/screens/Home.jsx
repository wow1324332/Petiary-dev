import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Settings, X, Loader2, Pencil, Lock, Unlock, PawPrint, User, ArrowLeft } from 'lucide-react';
import { doggyData } from '../data/doggyData';
import { backgroundData } from '../data/backgroundData';
import { furnitureData } from '../data/furnitureData'; 
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; 
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { toastMessages } from '../data/toastData';

// =============================================================================
// 🌟 가구 컴포넌트 (PC 마우스 휠 확대/축소 기능 추가 완료!)
// =============================================================================
const DraggableFurniture = ({ item, onUpdate, onDelete, onBringToFront, isLocked }) => {
  const [pos, setPos] = useState({ x: item.x, y: item.y });
  const [scale, setScale] = useState(item.scale || 1);
  const [showDelete, setShowDelete] = useState(false); 
  
  const longPressTimer = useRef(null); 
  const isLongPressed = useRef(false); 
  
  // 👉 1. 마우스 휠 연속 저장을 막기 위한 타이머 추가
  const wheelTimeout = useRef(null); 

  const pointers = useRef(new Map()); 
  const dragStart = useRef({ x: 0, y: 0, initX: pos.x, initY: pos.y });
  const pinchStart = useRef({ dist: 0, initScale: scale });
  const isModified = useRef(false);

  useEffect(() => {
    if (!showDelete) return; 
    const handleTouchOutside = () => setShowDelete(false); 
    window.addEventListener('pointerdown', handleTouchOutside);
    return () => window.removeEventListener('pointerdown', handleTouchOutside);
  }, [showDelete]);

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    onBringToFront(item.instanceId); 

    isLongPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      setShowDelete(true);
      isLongPressed.current = true;
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
        if (!isLongPressed.current) {
          setShowDelete(false);
        }
      }
    }
  };

  // 👉 2. 마우스 휠 이벤트 함수 추가
  const handleWheel = (e) => {
    if (isLocked) return; // 자물쇠로 잠겨있으면 크기 조절 불가

    // 스크롤 방향 확인 (위로 굴리면 1, 아래로 굴리면 -1)
    const zoomStep = 0.1;
    const direction = e.deltaY < 0 ? 1 : -1;

    setScale((prevScale) => {
      // 최소 0.3배 ~ 최대 2.5배 안에서 크기 증감
      const updatedScale = Math.max(0.3, Math.min(2.5, prevScale + (direction * zoomStep)));
      
      // 스크롤 할 때마다 타이머를 초기화해서, 스크롤을 멈추고 0.3초(300ms) 뒤에 파이어베이스에 1번만 저장!
      if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
      wheelTimeout.current = setTimeout(() => {
        onUpdate(item.instanceId, pos.x, pos.y, updatedScale);
      }, 300);

      return updatedScale;
    });
  };

  return (
    <div
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
      onWheel={handleWheel} // 👉 3. 휠 이벤트 연결
      onContextMenu={(e) => e.preventDefault()}
      className={`absolute top-1/2 left-1/2 select-none z-0 ${
        isLocked ? 'pointer-events-none' : 'touch-none cursor-grab active:cursor-grabbing pointer-events-auto'
      }`}
      style={{ 
        transform: `translate3d(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px), 0)`,
        WebkitTouchCallout: 'none'
      }}
    >
      <div style={{ transform: `scale(${scale})` }}>
        <img src={item.image} alt="가구" draggable={false} className="w-48 object-contain drop-shadow-md relative pointer-events-none" />
      </div>
      
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
  const [isLocked, setIsLocked] = useState(true);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);

  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [newProfileFile, setNewProfileFile] = useState(null);
  const [isProfileUploading, setIsProfileUploading] = useState(false);

  // 👇 1. 단순 문자열에서 객체를 담을 수 있도록 초기값을 null로 변경
  const [toast, setToast] = useState(null); 
  const toastTimer = useRef(null);

  // 👇 2. msg 대신 toastObj(객체)를 받아서 통째로 저장
  const showToast = (toastObj) => {
    setToast(toastObj);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500); 
  };

  const scrollRef = useRef(null);

  const isDraggingBg = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  
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

  const handleBgMouseDown = (e) => {
    if (!isLocked || !scrollRef.current) return; // 잠금 상태일 때만 드래그 허용
    isDraggingBg.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
  };

  const handleBgMouseLeave = () => { isDraggingBg.current = false; };
  const handleBgMouseUp = () => { isDraggingBg.current = false; };

  const handleBgMouseMove = (e) => {
    if (!isDraggingBg.current || !scrollRef.current) return;
    e.preventDefault(); // 드래그 중 텍스트 선택 등 방지
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // 1.5는 스크롤 속도 배율
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  // 가구 추가
  const handleFurnitureSelect = async (furnItem) => {
    if (!isModalReady) return; 
    if (isLocked) {
      showToast(toastMessages.lockedFurn); // 👉 alert 대신 교체!
      return; 
    }
    const newFurniture = { instanceId: Date.now(), baseId: furnItem.id, image: furnItem.image, x: 0, y: 0, scale: 1 };
    const updatedFurniture = [...placedFurniture, newFurniture];
    setPlacedFurniture(updatedFurniture);
    setIsFurnModalOpen(false);
    if (auth.currentUser) await setDoc(doc(db, 'users', auth.currentUser.uid), { myPlacedFurniture: updatedFurniture }, { merge: true });
  };

    const handleFurnitureUpdate = async (instanceId, newX, newY, newScale) => {
    setPlacedFurniture((prev) => {
      const updatedFurniture = prev.map(item => 
        item.instanceId === instanceId ? { ...item, x: newX, y: newY, scale: newScale } : item
      );
      if (auth.currentUser) {
        setDoc(doc(db, 'users', auth.currentUser.uid), { myPlacedFurniture: updatedFurniture }, { merge: true });
      }
      return updatedFurniture;
    });
  };

  // 👇 handleFurnitureDelete(삭제) 함수 위에 이 새로운 함수를 추가해 주세요! 👇
  const handleBringToFront = (instanceId) => {
    setPlacedFurniture((prev) => {
      // 선택한 가구를 배열에서 빼서 맨 끝(화면의 맨 위)으로 보냅니다.
      const target = prev.find(item => item.instanceId === instanceId);
      const others = prev.filter(item => item.instanceId !== instanceId);
      const updated = [...others, target];
      
      // 순서가 바뀐 것을 파이어베이스에도 즉시 저장! (앱 껐다 켜도 순서 기억)
      if (auth.currentUser) {
        setDoc(doc(db, 'users', auth.currentUser.uid), { myPlacedFurniture: updated }, { merge: true });
      }
      return updated;
    });
  };

  // 가구 삭제
  const handleFurnitureDelete = async (instanceId) => {
    const updatedFurniture = placedFurniture.filter(item => item.instanceId !== instanceId);
    setPlacedFurniture(updatedFurniture);
    if (auth.currentUser) await setDoc(doc(db, 'users', auth.currentUser.uid), { myPlacedFurniture: updatedFurniture }, { merge: true });
  };

  const handleDogSelect = async (dog) => {
    if (!isModalReady) return; 
    if (isLocked) {
      showToast(toastMessages.lockedDog); // 👉 alert 대신 교체!
      return; 
    }
    setSelectedDog(dog); setIsDogModalOpen(false);
    if (auth.currentUser) await setDoc(doc(db, 'users', auth.currentUser.uid), { mySelectedDog: dog.id }, { merge: true });
  };

  const handleBgSelect = async (bg) => {
    if (!isModalReady) return; 
    if (isLocked) {
      showToast(toastMessages.lockedBg); // 👉 alert 대신 교체!
      return; 
    }
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

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    setIsProfileUploading(true);
    try {
      let photoURL = auth.currentUser.photoURL;
      if (newProfileFile) {
        const storageRef = ref(storage, `profiles/${auth.currentUser.uid}_${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, newProfileFile);
        photoURL = await getDownloadURL(snapshot.ref);
      }
      await updateProfile(auth.currentUser, { displayName: nickname, photoURL: photoURL });
      showToast({ message: "프로필이 예쁘게 저장되었습니다! 🐾", style: "bg-gray-800 text-white" });
      setIsMyPageOpen(false);
    } catch (error) {
      console.error("프로필 저장 에러:", error);
      showToast({ message: "프로필 저장에 실패했습니다.", style: "bg-red-500 text-white" });
    } finally {
      setIsProfileUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-gray-100"
      onContextMenu={(e) => e.preventDefault()}>

      {toast && (
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-[60] backdrop-blur-xl px-6 py-3 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border font-bold text-sm flex items-center whitespace-nowrap animate-[slideDown_0.3s_ease-out] ${toast.style}`}>
          {toast.message}
        </div>
      )}
      
      {/* 🌟 좌측 상단 펫 메뉴 (발바닥 버튼) */}
      <div className="absolute top-6 left-6 z-40 flex flex-col items-center gap-3">
        <button 
          onClick={() => setIsTopMenuOpen(!isTopMenuOpen)} 
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md border border-white/50 backdrop-blur-lg transition-all duration-300 active:scale-95 ${isTopMenuOpen ? 'bg-brand text-white' : 'bg-white/70 text-gray-700'}`}
        >
          <PawPrint size={24} />
        </button>
        
        {/* 스르륵 나타나는 하위 버튼들 */}
        {isTopMenuOpen && (
          <div className="flex flex-col gap-3 origin-top animate-[slideUp_0.2s_ease-out]">
            
            {/* 마이페이지 버튼 */}
            <button 
              onClick={() => {
                setIsTopMenuOpen(false);
                setNickname(auth.currentUser?.displayName || '');
                setNewProfileFile(null);
                setIsMyPageOpen(true);
              }}
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-brand transition-all active:scale-95 bg-white/60 backdrop-blur-md rounded-full shadow-sm border border-white/40"
            >
              <User size={18} />
            </button>

            <button 
              onClick={() => setIsLocked(!isLocked)}
              className={`w-10 h-10 flex items-center justify-center transition-all active:scale-95 bg-white/60 backdrop-blur-md rounded-full shadow-sm border border-white/40 ${isLocked ? 'text-brand' : 'text-gray-500'}`}
            >
              {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
            </button>
            <Link to="/settings" className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-brand transition-all active:scale-95 bg-white/60 backdrop-blur-md rounded-full shadow-sm border border-white/40">
              <Settings size={18} />
            </Link>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brand w-10 h-10 mb-4" />
          <span className="text-gray-400 font-medium">펫의 방을 여는 중... 🐾</span>
        </div>
      ) : (
        <div 
          ref={scrollRef} 
          // 👇 여기에 마우스 이벤트 4개 연결 👇
          onMouseDown={handleBgMouseDown}
          onMouseLeave={handleBgMouseLeave}
          onMouseUp={handleBgMouseUp}
          onMouseMove={handleBgMouseMove}
          // 👇 className 맨 끝에 잠금 상태일 때 손바닥 커서(cursor-grab)가 나오도록 추가 👇
          className={`flex-1 w-full overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden ${isLocked ? 'cursor-grab active:cursor-grabbing' : ''}`} 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >          <div className="h-full aspect-square relative">
            <img src={selectedBg.image} alt="룸 배경" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

            {/* 가구 렌더링 */}
            {placedFurniture.map(item => (
              <DraggableFurniture 
                key={item.instanceId} 
                item={item} 
                onUpdate={handleFurnitureUpdate} 
                onDelete={handleFurnitureDelete} 
                onBringToFront={handleBringToFront}
                isLocked={isLocked} // 👉 🌟 잠금 상태 전달
              />
            ))}

            {/* 강아지 렌더링 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* 👉 🌟 강아지에게도 isLocked 상태에 따라 pointer-events-none 적용 */}
              <div className={`relative z-10 ${isLocked ? 'pointer-events-none' : 'pointer-events-auto touch-none'}`} style={{ transform: `translate3d(${dogPosition.x}px, ${dogPosition.y}px, 0)` }}>
                <div onPointerDown={handleDogPointerDown} onPointerMove={handleDogPointerMove} onPointerUp={handleDogPointerUp} onPointerCancel={handleDogPointerUp} className="cursor-grab active:cursor-grabbing rounded-full">
                  <img src={selectedDog.image} alt={selectedDog.name} draggable={false} className="w-44 h-44 object-contain drop-shadow-xl pointer-events-none" />
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

      {/* 마이페이지 모달 화면 */}
      {isMyPageOpen && (
        <div className="absolute inset-0 bg-white z-[100] flex flex-col animate-[slideInRight_0.3s_ease-out]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={() => setIsMyPageOpen(false)} className="text-gray-800"><ArrowLeft size={24} /></button>
            <h2 className="font-bold text-lg">마이페이지</h2>
            <div className="w-6" />
          </div>

          <div className="flex-1 flex flex-col items-center p-8 space-y-8 overflow-y-auto relative">
            {isProfileUploading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-brand w-12 h-12 mb-4" />
                <p className="font-bold text-gray-700">저장 중입니다...</p>
              </div>
            )}

            <div className="flex flex-col items-center">
              <label className="relative cursor-pointer group">
                <div className="w-32 h-32 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden shadow-sm">
                  <img 
                    src={newProfileFile ? URL.createObjectURL(newProfileFile) : (auth.currentUser?.photoURL || 'https://via.placeholder.com/150')} 
                    alt="프로필" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition">
                  <Pencil className="text-white" size={24} />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && setNewProfileFile(e.target.files[0])} />
              </label>
              <span className="text-xs text-gray-400 mt-3 font-medium">사진을 눌러 변경</span>
            </div>

            <div className="w-full space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">별명</label>
              <input 
                type="text" 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)} 
                placeholder="사용할 별명을 입력해주세요" 
                className="w-full border border-gray-200 rounded-xl p-4 bg-gray-50 focus:outline-none focus:border-brand transition" 
              />
            </div>

            <button 
              onClick={handleSaveProfile} 
              disabled={isProfileUploading} 
              className="w-full mt-auto bg-brand text-white font-bold py-4 rounded-xl shadow-md active:scale-95 transition disabled:opacity-50"
            >
              프로필 저장하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
