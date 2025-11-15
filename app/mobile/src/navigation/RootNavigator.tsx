import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/home/DashboardScreen';
import EarningsScreen from '../screens/earnings/EarningsScreen';
import AddEarningScreen from '../screens/earnings/AddEarningScreen';
import PlatformsScreen from '../screens/platforms/PlatformsScreen';
import AIInsightsScreen from '../screens/insights/AIInsightsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';

import APIClient from '../api/client';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// App Stack with Bottom Tab Navigation
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Earnings') {
            iconName = focused ? 'cash' : 'cash-outline';
          } else if (route.name === 'Platforms') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Insights') {
            iconName = focused ? 'bulb' : 'bulb-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#1f2937',
          borderTopColor: '#374151',
        },
        headerStyle: {
          backgroundColor: '#111827',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          title: 'Earnings',
          tabBarLabel: 'Earnings',
        }}
      />
      <Tab.Screen
        name="Platforms"
        component={PlatformsScreen}
        options={{
          title: 'Platforms',
          tabBarLabel: 'Platforms',
        }}
      />
      <Tab.Screen
        name="Insights"
        component={AIInsightsScreen}
        options={{
          title: 'AI Insights',
          tabBarLabel: 'Insights',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

// App Stack
function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="AppTabs"
        component={AppTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddEarning"
        component={AddEarningScreen}
        options={{
          title: 'Add Earning',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Edit Profile',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}

// Root Navigator
interface RootNavigatorProps {
  initialState?: any;
  onStateChange?: (state: any) => void;
}

export function RootNavigator({ initialState, onStateChange }: RootNavigatorProps) {
  const [state, dispatch] = React.useReducer(
    (prevState: any, action: any) => {
      switch (action.type) {
        case 'RESTORE_TOKEN':
          return {
            ...prevState,
            isLoading: false,
            isSignedIn: !!action.payload,
          };
        case 'SIGN_IN':
          return {
            ...prevState,
            isSignedIn: true,
            userToken: action.payload,
          };
        case 'SIGN_OUT':
          return {
            ...prevState,
            isSignedIn: false,
            userToken: null,
          };
        default:
          return prevState;
      }
    },
    {
      isLoading: true,
      isSignedIn: false,
      userToken: null,
    }
  );

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await APIClient.getToken();
        dispatch({ type: 'RESTORE_TOKEN', payload: token });
      } catch (e) {
        // Restoring token failed
        dispatch({ type: 'RESTORE_TOKEN', payload: null });
      }
    };

    bootstrapAsync();
  }, []);

  const authContext = React.useMemo(
    () => ({
      signIn: async (email: string, password: string) => {
        try {
          const response = await APIClient.login(email, password);
          dispatch({ type: 'SIGN_IN', payload: response.token });
        } catch (error) {
          throw error;
        }
      },
      signUp: async (email: string, password: string, name: string) => {
        try {
          const response = await APIClient.register(email, password, name);
          dispatch({ type: 'SIGN_IN', payload: response.token });
        } catch (error) {
          throw error;
        }
      },
      signOut: async () => {
        await APIClient.clearToken();
        dispatch({ type: 'SIGN_OUT' });
      },
    }),
    []
  );

  if (state.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {state.isSignedIn ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default RootNavigator;
