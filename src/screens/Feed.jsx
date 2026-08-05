import React from 'react';

export default function Feed() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-5 bg-bglight sticky top-0">
        <h2 className="text-2xl font-bold text-gray-800">우리의 일기 📖</h2>
        <button className="bg-brand px-4 py-2 rounded-full text-white font-bold text-sm shadow transition active:scale-95">
          + 글쓰기
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-base">아직 작성된 일기가 없습니다.</p>
      </div>
    </div>
  );
}
