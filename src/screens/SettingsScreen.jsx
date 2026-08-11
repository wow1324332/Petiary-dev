import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, LogOut, Users, UserPlus, X, Copy, Trash2, User, Unplug } from 'lucide-react';

export default function SettingsScreen() {
  const navigate = useNavigate();

  const [isFamilyHubOpen, setIsFamilyHubOpen] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isMasterMode, setIsMasterMode] = useState(true);

  // 🌟 [작성자님 논리 완벽 적용] 
  // 메인/보조 입장을 명확히 나눠서 직관적으로 가져옵니다!
  const fetchFamilyMembers = async () => {
    if (!auth.currentUser) return;
    setIsLoadingMembers(true);
    try {
      const myUid = auth.currentUser.uid;
      const myDoc = await getDoc(doc(db, 'users', myUid));
      const myData = myDoc.exists() ? myDoc.data() : {};

      const membersList = [];

      // [1. 내가 보조 보호자인 경우] : 내 정보 + 메인 보호자 정보
      if (myData.masterUid && myData.masterUid !== myUid) {
        setIsMasterMode(false);
        
        // 내 정보 먼저 넣기
        membersList.push({
          id: myUid,
          isMaster: false,
          displayName: myData.displayName || "보조 보호자",
          photoURL: myData.photoURL || ""
        });

        // 메인 보호자(masterUid) 정보 가져오기
        const masterDoc = await getDoc(doc(db, 'users', myData.masterUid));
        if (masterDoc.exists()) {
          membersList.push({
            id: masterDoc.id,
            isMaster: true,
            displayName: masterDoc.data().displayName || "메인 보호자",
            photoURL: masterDoc.data().photoURL || ""
          });
        } else {
          // 혹시 메인이 DB에 없어도 이름표는 띄워줌
          membersList.push({
            id: myData.masterUid,
            isMaster: true,
            displayName: "메인 보호자",
            photoURL: ""
          });
        }

      } 
      // [2. 내가 메인 보호자인 경우] : 내 정보 + 나를 masterUid로 둔 보조들
      else {
        setIsMasterMode(true);
        
        // 내 정보(메인) 넣기
        membersList.push({
          id: myUid,
          isMaster: true,
          displayName: myData.displayName || "메인 보호자",
          photoURL: myData.photoURL || ""
        });

        // 나를 마스터로 등록한 보조 보호자들 찾아서 넣기
        const q = query(collection(db, 'users'), where('masterUid', '==', myUid));
        const snapshot = await getDocs(q);
        snapshot.forEach((d) => {
          if (d.id !== myUid) {
            membersList.push({
              id: d.id,
              isMaster: false,
              displayName: d.data().displayName || "보조 보호자",
              photoURL: d.data().photoURL || ""
            });
          }
        });
      }

      // 🌟 배열 정렬: 보기 좋게 '메인 보호자'가 항상 맨 위에 오도록 설정
      membersList.sort((a, b) => (b.isMaster === a.isMaster ? 0 : a.isMaster ? -1 : 1));
      
      setFamilyMembers(membersList);
    } catch (error) {
      console.error("가족 불러오기 실패:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

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

  const handleRemoveMember = async (memberId, isSelf = false) => {
    const confirmMsg = isSelf 
      ? "정말 메인 보호자와의 연결을 해제하시겠습니까?\n해제하면 더 이상 홈과 일기를 공유할 수 없습니다." 
      : "이 보조 보호자를 패밀리에서 제외하시겠습니까?";
      
    if (!window.confirm(confirmMsg)) return;
    
    try {
      await updateDoc(doc(db, 'users', memberId), { masterUid: null });
      alert(isSelf ? "연결이 해제되었습니다. 내 방으로 돌아갑니다." : "보호자가 제외되었습니다.");
      
      if (isSelf) {
        window.location.reload();
      } else {
        setFamilyMembers(familyMembers.filter(m => m.id !== memberId));
      }
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
            
            {/* 메인 보호자에게만 보이는 초대 영역 */}
            {isMasterMode && (
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
            )}

            <h4 className="font-bold text-gray-700 mb-3 px-1">가족 구성원</h4>
            {isLoadingMembers ? (
              <p className="text-center text-gray-400 py-10 text-sm">불러오는 중...</p>
            ) : (
              <div className="flex flex-col gap-3">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      
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

                    {/* 🌟 1. 쓰레기통 아이콘은 메인 보호자가 남(보조)을 지울 때만 보입니다 */}
                    {isMasterMode && !member.isMaster && (
                      <button 
                        onClick={() => handleRemoveMember(member.id, false)}
                        className="p-2 text-gray-400 hover:text-red-500 transition active:scale-95 bg-gray-50 rounded-full"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}

                {/* 🌟 2. 보조 보호자 전용: 하단에 큼직한 '연결 해제' 버튼 제공 */}
                {!isMasterMode && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button 
                      onClick={() => handleRemoveMember(auth.currentUser.uid, true)}
                      className="w-full bg-white border border-red-200 text-red-500 font-bold py-3.5 rounded-xl shadow-sm active:scale-95 transition flex items-center justify-center gap-2 hover:bg-red-50"
                    >
                      <Unplug size={18} /> 메인 보호자와 연결 해제
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-3">
                      연결을 해제하면 내 방으로 돌아가며,<br/>이전 기록은 공유되지 않습니다.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
