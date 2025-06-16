// app/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import ConnectionStatus from '../components/ConnectionStatus';
import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { useConnectionStatus } from '../components/ConnectionStatus';

export default function Layout() {
  const isOnline = useConnectionStatus();

  useEffect(() => {
    if(isOnline){
      Toast.show({
        type: 'success',
        text1: 'online',
        position: 'top',
        visibilityTime: 3000,
      });
    }
    else{
      Toast.show({
        type: 'error',
        text1: 'offline',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  }, [isOnline]);

  return (
    <>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0} // Adjust if you have a header
        >
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }} />
            {/* <ConnectionStatus /> */}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <Toast />
    </>
  );
}
