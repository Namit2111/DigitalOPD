// app/_layout.tsx
import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import ConnectionStatus from '../components/ConnectionStatus';

export default function Layout() {
  return (
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
  );
}
