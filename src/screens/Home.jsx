import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, X } from 'lucide-react'; // 모달 닫기용 X 아이콘 추가
import { doggyData } from '../data/doggyData'; // 🌟 만들어둔 데이터 불러오기

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDog, setSelectedDog] = useState(doggyData[0]); // 기본값은 첫 번째 강아지(꾸루)

  // 앱이 켜질 때, 이전에 선택했던 강아지가 있는지 확인하고 불러옵니다.
  useEffect(() => {
    const savedDogId = localStorage.getItem('mySelectedDog');
    if (savedDogId) {
      const foundDog = doggyData.find(dog => dog.id === parseInt(savedDogId));
      if (foundDog) setSelectedDog(foundDog);
    }
  }, []);

  // 강아지를 선택했을 때 실행되는 함수
  const handleDogSelect = (dog) => {
    setSelectedDog(dog); // 화면에 보이는 강아지 변경
    localStorage.setItem('mySelectedDog', dog.id); // 내 폰에 선택한 강아지 번호 저장
    setIsModalOpen(false); // 모달 닫기
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* 톱니바퀴 설정 버튼 */}
      <div className="absolute top-0 right-0 p-5 z-10">
        <Link to="/settings" className="text-gray-400 hover:text-brand transition block active:scale-95">
          <Settings size={24} />
        </Link>
      </div>

      {/* 메인 펫 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center p-5">
        {/* 🌟 이미지를 버튼으로 감싸서 누를 수 있게 만들었습니다 */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="transition-transform active:scale-95 focus:outline-none"
        >
          <img
            src={selectedDog.image}
            alt={selectedDog.name}
            className="w-44 h-44 object-contain drop-shadow-xl animate-[bounce_3s_ease-in-out_infinite] mt-20"
          />
        </button>
      </div>

      {/* 🌟 펫 선택 모달 (isModalOpen이 true일 때만 나타남) */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end z-50">
          <div className="bg-white rounded-t-3xl p-6 min-h-[350px] w-full animate-[slideUp_0.3s_ease-out]">
            
            {/* 모달 상단 헤더 */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">함께할 펫 선택</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={28} />
              </button>
            </div>

            {/* 강아지 리스트 나열 */}
            <div className="grid grid-cols-3 gap-4">
              {doggyData.map((dog) => (
                <button
                  key={dog.id}
                  onClick={() => handleDogSelect(dog)}
                  // 선택된 강아지는 테두리 색을 주황색(brand)으로 표시합니다.
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
