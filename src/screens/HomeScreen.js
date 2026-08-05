import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bglight">
      <View className="flex-1 items-center justify-center p-5">
        <Text className="text-2xl font-bold text-brand mb-2">내 펫의 방 🐾</Text>
        <Text className="text-base text-gray-500 text-center">여기에 귀여운 꾸루의 방이 꾸며질 예정입니다.</Text>
      </View>
    </SafeAreaView>
  );
}
