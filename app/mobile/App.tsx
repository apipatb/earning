import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreen from 'react-native-splash-screen';

export default function App() {
  useEffect(() => {
    SplashScreen.hide();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <RootNavigator />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
