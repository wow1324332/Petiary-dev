import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, LogOut, Users, UserPlus, X, Copy, Trash2, User } from 'lucide-react';

export default function SettingsScreen() {
  const navigate = useNavigate();

  // 🌟 패밀리 허브용 상태
  const [isFamilyHubOpen, setIsFamilyHubOpen] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // 🌟 [추가] 내가 메인 보호자인지 판단하는 상태
  const [isMasterMode, setIsMasterMode] = useState(true);

  // 🌟 가족 구성원 전체 불러오기 (메인 + 보조 모두 포함)
  const fetchFamilyMembers = async () => {
    if (!auth.currentUser) return;
    setIsLoadingMembers(true);
    try {
      const myUid = auth.currentUser.uid;
      const myDoc = await getDoc(doc(db, 'users', myUid));
      
      // 1. 내가 보조라면 내 문서의 masterUid를, 메인이라면 내 UID를 마스터로 지정
      const masterUid = (myDoc.exists() && myDoc.data().masterUid) ? myDoc.data().masterUid : myUid;
      const isMaster = (masterUid === myUid);
      setIsMasterMode(isMaster);

      const membersList = [];

      // 2. 메인 보호자 무조건 1빠로 추가 
      // (메인 보호자가 프로필 저장을 안해서 DB에 문서가 없는 깡통 상태라도 목록에 무조건 띄웁니다)
      let masterData = { 
        id: masterUid, 
        isMaster: true, 
        displayName: "메인 보호자", 
        photoURL: "" 
      };
      
      const masterDoc = await getDoc(doc(db, 'users', masterUid));
      if (masterDoc.exists()) {
        masterData = { ...masterData, ...masterDoc.data(), id: masterUid, isMaster: true };
      } else if (isMaster) {
        masterData.displayName = auth.currentUser.displayName || "메인 보호자";
        masterData.photoURL = auth.currentUser.photoURL || "";
      }
      membersList.push(masterData);

      // 3. 해당 메인 보호자에게 연결된 보조 보호자들 전부 검색해서 추가
      const q = query(collection(db, 'users'), where('masterUid', '==', masterUid));
      const snapshot = await getDocs(q);
      
      snapshot.forEach(d => {
        // 메인 보호자 본인은 중복 추가 방지
        if (d.id !== masterUid) {
          membersList.push({ id: d.id, isMaster: false, ...d.data() });
        }
      });

      setFamilyMembers(membersList);
    } catch (error) {
      console.error("가족 불러오기 실패:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // 🌟 초대 링크 공유하기
  const handleInvite = async () => {
    const inviteLink = `${window.location.origin}/?invite=${auth.currentUser.uid}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Petiary 공동 보호자 초대',
          text: '우리의 펫 공간을 함께 꾸며봐요! 링크를 눌러 가입해주세요 🐾',
          url: inviteLink,
        });
      } catch (err) {
        console.log("공유 취소됨");
      }
    } else {
      navigator.clipboard.writeText(inviteLink);
      alert("초대 링크가 복사되었습니다! 카카오톡이나 메일로 붙여넣기 해서 초대하세요. 🐾");
    }
  };

  // 🌟 보조 보호자 연결 끊기(삭제)
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("이 보호자와의 연결을 끊으시겠습니까?")) return;
    try {
      await updateDoc(doc(db, 'users', memberId), { masterUid: null });
      setFamilyMembers(familyMembers.filter(m => m.id !== memberId));
      alert("보호자 연결이 해제되었습니다.");
    } catch (error) {
      alert("해제 실패: " + error.message);
    }
  };
  
  const handleLogout = async () => {
    const confirmLogout = window.confirm("정말 로그아웃 하시겠습니까?");
    if (confirmLogout) {
      try {
        await signOut(auth);
      } catch (error) {
        alert("로그아웃 중 오류가 발생했습니다.");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-bglight">
      <div className="flex items-center p-5 sticky top-0 bg-bglight z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 active:scale-95 transition">
          <ArrowLeft size={24} className="text-gray-800" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">설정</h2>
      </div>
      
      <div className="p-5 flex flex-col gap-3">
        <button 
          onClick={() => {
            setIsFamilyHubOpen(true);
            fetchFamilyMembers();
          }}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition"
        >
          <div className="flex items-center text-gray-800 font-bold">
            <Users size={20} className="mr-3 text-brand" />
            패밀리 허브 (보호자 관리)
          </div>
        </button>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition"
        >
          <div className="flex items-center text-red-500 font-bold">
            <LogOut size={20} className="mr-3" />
            로그아웃
          </div>
        </button>
      </div>

      {isFamilyHubOpen && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col animate-[slideInRight_0.3s_ease-out]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={() => setIsFamilyHubOpen(false)} className="text-gray-800"><ArrowLeft size={24} /></button>
            <h2 className="font-bold text-lg">패밀리 허브</h2>
            <div className="w-6" />
          </div>

          <div className="flex-1 p-5 overflow-y-auto bg-gray-50">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 text-center">
              <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserPlus size={24} className="text-brand" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">공동 보호자 초대하기</h3>
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                가족이나 연인을 초대하여<br/>펫의 공간과 기록을 함께 공유하세요!
              </p>
              <button 
                onClick={handleInvite}
                className="w-full bg-brand text-white font-bold py-3.5 rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Copy size={18} /> 초대 링크 복사 / 공유
              </button>
            </div>

            <h4 className="font-bold text-gray-700 mb-3 px-1">가족 구성원</h4>
            {isLoadingMembers ? (
              <p className="text-center text-gray-400 py-10 text-sm">불러오는 중...</p>
            ) : (
              <div className="flex flex-col gap-3">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      
                      {/* 🌟 원인 2 해결: 극심한 로딩 지연을 일으킨 placeholder 사이트를 제거하고, 프사가 없으면 즉시 로딩되는 기본 유저 아이콘(User) 적용 */}
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                        {member.photoURL ? (
                          <img src={member.photoURL} alt="프로필" className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className="text-gray-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800 text-sm">
                            {member.displayName || "이름 없음"} 
                            {member.id === auth.currentUser?.uid && <span className="text-xs text-gray-400 font-normal ml-1">(나)</span>}
                          </p>
                        </div>
                        <p className={`text-xs font-medium ${member.isMaster ? 'text-brand' : 'text-blue-500'}`}>
                          {member.isMaster ? '👑 메인 보호자' : '보조 보호자'}
                        </p>
                      </div>
                    </div>

                    {(isMasterMode && !member.isMaster) || (!isMasterMode && member.id === auth.currentUser?.uid) ? (
                      <button 
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition active:scale-95 bg-gray-50 rounded-full"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
