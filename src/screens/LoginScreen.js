import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Modal } from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

export default function LoginScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailSubmit = async () => {
    try {
      if (isLoginTab) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      alert("오류가 발생했습니다: " + error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bglight items-center justify-center">
      <View className="items-center mb-16">
        <Text className="text-4xl font-bold text-brand mb-2">Petiary</Text>
        <Text className="text-base text-gray-600">꾸우, 꾸루와 함께하는 소중한 시간들</Text>
      </View>
      
      <View className="w-full px-8">
        <TouchableOpacity 
          className="bg-brand h-14 rounded-full justify-center items-center shadow-sm"
          onPress={() => setModalVisible(true)}
        >
          <Text className="text-white text-lg font-bold">이메일로 시작하기</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 min-h-[450px]">
            <View className="flex-row mb-6 border-b border-gray-200">
              <TouchableOpacity 
                className={`flex-1 py-4 items-center ${isLoginTab ? 'border-b-2 border-brand' : ''}`}
                onPress={() => setIsLoginTab(true)}
              >
                <Text className={`text-base ${isLoginTab ? 'text-brand font-bold' : 'text-gray-400'}`}>로그인</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className={`flex-1 py-4 items-center ${!isLoginTab ? 'border-b-2 border-brand' : ''}`}
                onPress={() => setIsLoginTab(false)}
              >
                <Text className={`text-base ${!isLoginTab ? 'text-brand font-bold' : 'text-gray-400'}`}>계정 등록</Text>
              </TouchableOpacity>
            </View>

            <View className="mb-6">
              <TextInput 
                className="bg-gray-50 h-14 rounded-xl px-4 mb-4 border border-gray-200" 
                placeholder="이메일 주소" 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none" 
              />
              <TextInput 
                className="bg-gray-50 h-14 rounded-xl px-4 mb-4 border border-gray-200" 
                placeholder="비밀번호 (6자리 이상)" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry 
              />
              <TouchableOpacity 
                className="bg-brand h-14 rounded-xl justify-center items-center mt-2"
                onPress={handleEmailSubmit}
              >
                <Text className="text-white text-lg font-bold">{isLoginTab ? '로그인' : '가입하기'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity className="items-center p-2" onPress={() => setModalVisible(false)}>
              <Text className="text-gray-400 text-sm">닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
