import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';

export default function FeedScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bglight">
      <View className="flex-row justify-between items-center p-5">
        <Text className="text-2xl font-bold text-gray-800">우리의 일기 📖</Text>
        <TouchableOpacity className="bg-brand px-4 py-2 rounded-full">
          <Text className="text-white font-bold">+ 글쓰기</Text>
        </TouchableOpacity>
      </View>
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400 text-base">아직 작성된 일기가 없습니다.</Text>
      </View>
    </SafeAreaView>
  );
}
