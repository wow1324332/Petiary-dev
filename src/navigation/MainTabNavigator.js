import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import FeedScreen from '../screens/FeedScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF7F50',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#FFF', borderTopWidth: 0, elevation: 10 },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Feed') iconName = focused ? 'book' : 'book-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '마이룸' }} />
      <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarLabel: '일기장' }} />
    </Tab.Navigator>
  );
}
