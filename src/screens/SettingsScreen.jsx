import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, LogOut, Users, UserPlus, X, Copy, Trash2 } from 'lucide-react';

export default function SettingsScreen() {
  const navigate = useNavigate();

  // 🌟 패밀리 허브용 상태
  const [isFamilyHubOpen, setIsFamilyHubOpen] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // 🌟 보조 보호자 목록 불러오기 (나를 메인 보호자로 둔 유저들 찾기)
  const fetchFamilyMembers = async () => {
    if (!auth.currentUser) return;
    setIsLoadingMembers(true);
    try {
      const q = query(collection(db, 'users'), where('masterUid', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFamilyMembers(members);
    } catch (error) {
      console.error("가족 불러오기 실패:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // 🌟 초대 링크 공유하기
  const handleInvite = async () => {
    const inviteLink = `${window.location.origin}/?invite=${auth.currentUser.uid}`;
    
    // 스마트폰의 기본 공유 기능(카톡, 메시지 등) 띄우기
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
      // PC 등 공유 기능이 지원 안 되면 클립보드에 복사
      navigator.clipboard.writeText(inviteLink);
      alert("초대 링크가 복사되었습니다! 카카오톡이나 메일로 붙여넣기 해서 초대하세요. 🐾");
    }
  };

  // 🌟 보조 보호자 연결 끊기(삭제)
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("이 보호자와의 연결을 끊으시겠습니까?")) return;
    try {
      // 해당 유저의 정보에서 masterUid를 지워서 독립시킴
      await updateDoc(doc(db, 'users', memberId), { masterUid: null });
      setFamilyMembers(familyMembers.filter(m => m.id !== memberId));
      alert("보호자 연결이 해제되었습니다.");
    } catch (error) {
      alert("해제 실패: " + error.message);
    }
  };

  const handleLogout = async () => {

  const handleLogout = async () => {
    const confirmLogout = window.confirm("정말 로그아웃 하시겠습니까?");
    if (confirmLogout) {
      try {
        await signOut(auth);
        // 로그아웃 성공 시 App.jsx가 감지하여 자동으로 로그인 화면으로 이동합니다.
      } catch (error) {
        alert("로그아웃 중 오류가 발생했습니다.");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-bglight">
      {/* 상단 헤더 (뒤로가기 버튼) */}
      <div className="flex items-center p-5 sticky top-0 bg-bglight z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 active:scale-95 transition">
          <ArrowLeft size={24} className="text-gray-800" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">설정</h2>
      </div>
      
      {/* 설정 메뉴 리스트 */}
      <div className="p-5 flex flex-col gap-3">
        
        {/* 🌟 패밀리 허브 버튼 */}
        <button 
          onClick={() => {
            setIsFamilyHubOpen(true);
            fetchFamilyMembers(); // 모달 열릴 때 가족 목록 불러오기
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

      {/* 🌟 패밀리 허브 모달 오버레이 */}
      {isFamilyHubOpen && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col animate-[slideInRight_0.3s_ease-out]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={() => setIsFamilyHubOpen(false)} className="text-gray-800"><ArrowLeft size={24} /></button>
            <h2 className="font-bold text-lg">패밀리 허브</h2>
            <div className="w-6" />
          </div>

          <div className="flex-1 p-5 overflow-y-auto bg-gray-50">
            {/* 초대 버튼 영역 */}
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

            {/* 현재 연결된 가족 목록 */}
            <h4 className="font-bold text-gray-700 mb-3 px-1">등록된 보조 보호자</h4>
            {isLoadingMembers ? (
              <p className="text-center text-gray-400 py-10 text-sm">불러오는 중...</p>
            ) : familyMembers.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
                <p className="text-sm text-gray-400">아직 등록된 보조 보호자가 없습니다.<br/>링크를 공유하여 초대해보세요!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                        <img src={member.photoURL || "https://via.placeholder.com/150"} alt="프로필" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{member.displayName || "이름 없음"}</p>
                        <p className="text-xs text-brand font-medium">보조 보호자</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition active:scale-95 bg-gray-50 rounded-full"
                    >
                      <Trash2 size={18} />
                    </button>
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
