import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Screens
import HomeScreen from './screens/HomeScreen';
import GymsScreen from './screens/GymsScreen';
import WorkoutsScreen from './screens/WorkoutsScreen';
import LogWorkoutScreen from './screens/LogWorkoutScreen';
import WorkoutDetailScreen from './screens/WorkoutDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import ScheduleScreen from './screens/ScheduleScreen';
import BuddiesScreen from './screens/BuddiesScreen';
import ChatScreen from './screens/ChatScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

import { AuthProvider, useAuth } from './services/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Gyms':
              iconName = focused ? 'map-marker' : 'map-marker-outline';
              break;
            case 'Workouts':
              iconName = 'dumbbell';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            case 'Schedule':
              iconName = focused ? 'calendar-clock' : 'calendar-clock-outline';
              break;
            case 'Buddies':
              iconName = focused ? 'account-group' : 'account-group-outline';
              break;
            case 'Chat':
              iconName = focused ? 'chat' : 'chat-outline';
              break;
            default:
              iconName = 'circle';
          }
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Gyms" component={GymsScreen} />
      <Tab.Screen name="Workouts" component={WorkoutsScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Buddies" component={BuddiesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="LogWorkout" component={LogWorkoutScreen} />
          <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AuthProvider>
  );
}