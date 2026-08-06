import React, { useState, useEffect, useRef } from 'react';
import { Pencil, ArrowLeft, MoreVertical, Heart, X, Download, Loader2 } from 'lucide-react';
// 👇 Firebase 기능 불러오기
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, storage } from '../firebaseConfig'; 

export default function Diary() {
  const [currentView, setCurrentView] = useState('feed');
  const [activeTab, setActiveTab] = useState('feed'); 
  const [isLoading, setIsLoading] = useState(true); // 처음 데이터 불러올 때 로딩
  const [isUploading, setIsUploading] = useState(false); // 글 작성 시 로딩

  const [feeds, setFeeds] = useState([]);
  const [selectedFeed, setSelectedFeed] = useState(null);

  // =====================================================================
  // 🌟 [Firebase] 앱 실행 시 기존 피드 불러오기
  // =====================================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const q = query(collection(db, 'users', user.uid, 'diaries'), orderBy('createdAt', 'desc'));
          const querySnapshot = await getDocs(q);
          const fetchedFeeds = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setFeeds(fetchedFeeds);
        } catch (error) {
          console.error("피드 불러오기 실패:", error);
        }
      } else {
        setFeeds([]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // =====================================================================
  // 1. 피드 목록 화면
  // =====================================================================
  const renderFeedList = () => (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex justify-center border-b border-gray-100 py-3">
        <div className="flex gap-6 text-lg font-bold">
          <button onClick={() => setActiveTab('feed')} className={`${activeTab === 'feed' ? 'text-brand border-b-2 border-brand pb-1' : 'text-gray-400'}`}>피드</button>
          <button onClick={() => setActiveTab('calendar')} className={`${activeTab === 'calendar' ? 'text-brand border-b-2 border-brand pb-1' : 'text-gray-400'}`}>캘린더</button>
        </div>
      </div>

      {activeTab === 'feed' ? (
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Loader2 className="animate-spin text-brand w-8 h-8 mb-2" />
              <p>피드를 불러오는 중...</p>
            </div>
          ) : feeds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p>첫 일기를 작성해 보세요! 🐾</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {feeds.map((feed) => (
                <div key={feed.id} className="aspect-square bg-gray-100 cursor-pointer active:opacity-70 transition" onClick={() => { setSelectedFeed(feed); setCurrentView('detail'); }}>
                  {/* 여러 이미지 중 첫 번째 이미지를 썸네일로 사용 */}
                  <img src={feed.images[0]} alt="피드 썸네일" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">캘린더 화면은 준비 중입니다 📅</div>
      )}

      {/* 글쓰기 버튼 */}
      {activeTab === 'feed' && (
        <div className="absolute bottom-6 right-6 z-40">
          <label className="w-14 h-14 bg-brand text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer active:scale-95 transition">
            <Pencil size={24} />
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
          </label>
        </div>
      )}
    </div>
  );

  // =====================================================================
  // 2. 작성 화면 (Firebase Storage & Firestore 업로드)
  // =====================================================================
  const today = new Date();
  const [writeForm, setWriteForm] = useState({ 
    previewUrls: [], files: [], 
    year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate(), 
    location: '', content: '' 
  });
  const [writeCurrentImgIdx, setWriteCurrentImgIdx] = useState(0);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (files.length > 5) return alert("사진은 최대 5장까지 첨부할 수 있습니다.");
    
    // 미리보기 URL과 실제 File 객체를 분리해서 저장
    const imageUrls = files.map(file => URL.createObjectURL(file));
    setWriteForm(prev => ({ ...prev, previewUrls: imageUrls, files: files }));
    setCurrentView('write');
  };

  const handleWriteSubmit = async () => {
    if (!auth.currentUser) return alert("로그인이 필요합니다.");
    if (writeForm.files.length === 0) return alert("사진을 1장 이상 첨부해주세요.");
    
    setIsUploading(true); // 업로드 시작! 로딩 띄우기
    try {
      const uid = auth.currentUser.uid;
      const uploadedUrls = [];

      // 1. Firebase Storage에 이미지 하나씩 업로드하기
      for (const file of writeForm.files) {
        // 파일명이 겹치지 않게 현재 시간(Date.now)을 파일명 앞에 붙임
        const storageRef = ref(storage, `diaries/${uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        uploadedUrls.push(downloadUrl);
      }

      // 2. Firestore에 업로드된 URL들과 텍스트 내용 저장하기
      const newFeedData = {
        images: uploadedUrls, // 스토리지에서 받아온 진짜 이미지 URL들
        year: writeForm.year, month: writeForm.month, day: writeForm.day,
        date: `${writeForm.year}/${String(writeForm.month).padStart(2, '0')}/${String(writeForm.day).padStart(2, '0')}`,
        location: writeForm.location,
        content: writeForm.content,
        likes: 0,
        comments: [],
        createdAt: Date.now()
      };
      
      const docRef = await addDoc(collection(db, 'users', uid, 'diaries'), newFeedData);

      // 3. 화면 업데이트 및 초기화
      setFeeds([{ id: docRef.id, ...newFeedData }, ...feeds]);
      setCurrentView('feed');
      setWriteForm({ previewUrls: [], files: [], year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate(), location: '', content: '' });
    } catch (error) {
      console.error("업로드 에러:", error);
      alert("일기 저장에 실패했습니다.");
    } finally {
      setIsUploading(false); // 로딩 종료
    }
  };

  const renderWrite = () => {
    const currentYear = today.getFullYear();
    const years = Array.from({length: currentYear - 1950 + 1}, (_, i) => currentYear - i);
    const months = Array.from({length: 12}, (_, i) => i + 1);
    const days = Array.from({length: 31}, (_, i) => i + 1);

    return (
      <div className="flex flex-col h-full bg-white relative">
        {/* 업로드 로딩 오버레이 */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-brand w-12 h-12 mb-4" />
            <p className="font-bold text-gray-700">추억을 저장하고 있어요... 🐾</p>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button onClick={() => setCurrentView('feed')} className="text-gray-600"><X size={24}/></button>
          <h2 className="font-bold text-lg">일기 쓰기</h2>
          <label className="text-brand font-bold cursor-pointer">재선택<input type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} /></label>
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          {/* 이미지 미리보기 슬라이더 */}
          <div className="relative aspect-square bg-gray-100 flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden" onScroll={(e) => setWriteCurrentImgIdx(Math.round(e.target.scrollLeft / e.target.clientWidth))}>
            {writeForm.previewUrls.map((img, idx) => (
              <img key={idx} src={img} alt={`첨부 ${idx}`} className="w-full h-full object-cover flex-shrink-0 snap-center" />
            ))}
          </div>
          <div className="flex justify-center gap-1.5 py-3">
            {writeForm.previewUrls.map((_, idx) => <div key={idx} className={`w-2 h-2 rounded-full ${writeCurrentImgIdx === idx ? 'bg-brand' : 'bg-gray-300'}`} />)}
          </div>

          <div className="px-4 space-y-4">
            <div className="flex gap-2">
              <select value={writeForm.year} onChange={e=>setWriteForm({...writeForm, year: e.target.value})} className="border rounded-lg p-2 bg-gray-50 flex-1">{years.map(y => <option key={y} value={y}>{y}년</option>)}</select>
              <select value={writeForm.month} onChange={e=>setWriteForm({...writeForm, month: e.target.value})} className="border rounded-lg p-2 bg-gray-50 flex-1">{months.map(m => <option key={m} value={m}>{m}월</option>)}</select>
              <select value={writeForm.day} onChange={e=>setWriteForm({...writeForm, day: e.target.value})} className="border rounded-lg p-2 bg-gray-50 flex-1">{days.map(d => <option key={d} value={d}>{d}일</option>)}</select>
            </div>
            <input type="text" placeholder="장소를 입력하세요 (선택)" className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 focus:outline-none focus:border-brand" value={writeForm.location} onChange={e=>setWriteForm({...writeForm, location: e.target.value})} />
            <div className="relative">
              <textarea placeholder="오늘의 일기를 남겨주세요 (최대 200자)" maxLength={200} className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 h-32 resize-none focus:outline-none focus:border-brand" value={writeForm.content} onChange={e=>setWriteForm({...writeForm, content: e.target.value})} />
              <span className="absolute bottom-3 right-3 text-xs text-gray-400">{writeForm.content.length} / 200</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
          <button onClick={handleWriteSubmit} disabled={isUploading} className="w-full bg-brand text-white font-bold py-3.5 rounded-xl shadow-md active:scale-95 transition disabled:opacity-50">
            작성 완료
          </button>
        </div>
      </div>
    );
  };

  // =====================================================================
  // 3. 상세 화면 & 댓글 작성 (Firestore 실시간 저장)
  // =====================================================================
  const [detailCurrentImgIdx, setDetailCurrentImgIdx] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  const handleAddComment = async () => {
    if (!commentInput.trim() || !auth.currentUser) return;
    try {
      const uid = auth.currentUser.uid;
      const newComment = { user: "나", text: commentInput, createdAt: Date.now() };
      const updatedComments = [...selectedFeed.comments, newComment];

      // Firestore의 해당 문서(document)만 골라서 댓글 배열(comments) 업데이트
      const feedRef = doc(db, 'users', uid, 'diaries', selectedFeed.id);
      await updateDoc(feedRef, { comments: updatedComments });

      // 화면 즉시 반영
      const updatedFeed = { ...selectedFeed, comments: updatedComments };
      setSelectedFeed(updatedFeed);
      setFeeds(feeds.map(f => f.id === selectedFeed.id ? updatedFeed : f));
      setCommentInput('');
    } catch (error) {
      console.error("댓글 작성 실패", error);
    }
  };

  const renderDetail = () => {
    if (!selectedFeed) return null;

    return (
      <div className="flex flex-col h-full bg-white relative">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button onClick={() => setCurrentView('feed')} className="text-gray-800"><ArrowLeft size={24} /></button>
          <span className="font-bold text-gray-700">{selectedFeed.date}</span>
          <div className="w-6" />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="relative aspect-square bg-gray-100 flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden cursor-pointer" onClick={() => setIsViewerOpen(true)} onScroll={(e) => setDetailCurrentImgIdx(Math.round(e.target.scrollLeft / e.target.clientWidth))}>
            {selectedFeed.images.map((img, idx) => <img key={idx} src={img} alt={`피드 ${idx}`} className="w-full h-full object-cover flex-shrink-0 snap-center" />)}
          </div>
          <div className="flex justify-center gap-1.5 py-3">
            {selectedFeed.images.map((_, idx) => <div key={idx} className={`w-1.5 h-1.5 rounded-full ${detailCurrentImgIdx === idx ? 'bg-brand' : 'bg-gray-300'}`} />)}
          </div>

          <div className="px-4 pb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                  <img src="https://via.placeholder.com/150" alt="프로필" className="w-full h-full object-cover" />
                </div>
                <button className="flex items-center gap-1 text-gray-600 font-medium"><Heart size={22} className="active:scale-90 transition" /><span>{selectedFeed.likes}</span></button>
              </div>
              <button className="text-gray-500"><MoreVertical size={22} /></button>
            </div>
            
            {selectedFeed.location && <p className="text-xs text-brand font-bold mb-1">📍 {selectedFeed.location}</p>}
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{selectedFeed.content}</p>
          </div>

          <div className="border-t border-gray-100 p-4">
            <h4 className="text-sm font-bold text-gray-700 mb-3">댓글</h4>
            <div className="space-y-3 mb-4">
              {selectedFeed.comments.length === 0 ? <p className="text-xs text-gray-400">첫 댓글을 남겨보세요!</p> : selectedFeed.comments.map((c, i) => (
                <div key={i} className="flex gap-2 items-start text-sm">
                  <span className="font-bold text-gray-800">{c.user}</span>
                  <span className="text-gray-600">{c.text}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="코멘트 달기..." className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-brand" value={commentInput} onChange={e=>setCommentInput(e.target.value)} />
              <button className="text-brand font-bold text-sm px-2 active:scale-95" onClick={handleAddComment}>등록</button>
            </div>
          </div>
        </div>

        {/* 원본 퀄리티 이미지 뷰어 */}
        {isViewerOpen && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex justify-end p-4 z-50 absolute top-0 right-0 w-full bg-gradient-to-b from-black/50 to-transparent">
              <button onClick={() => setIsViewerOpen(false)} className="text-white p-2"><X size={28} /></button>
            </div>
            
            <div className="flex-1 flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden items-center">
              {selectedFeed.images.map((img, idx) => (
                <div key={idx} className="w-full h-full flex-shrink-0 snap-center flex justify-center items-center relative">
                  <img src={img} alt={`뷰어 ${idx}`} className="max-w-full max-h-full object-contain" />
                  <a href={img} target="_blank" rel="noopener noreferrer" download className="absolute bottom-8 right-6 bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/40 transition">
                    <Download size={24} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full overflow-hidden bg-gray-50">
      {currentView === 'feed' && renderFeedList()}
      {currentView === 'write' && renderWrite()}
      {currentView === 'detail' && renderDetail()}
    </div>
  );
}
