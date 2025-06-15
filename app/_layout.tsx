// app/_layout.tsx
import { Stack } from 'expo-router';
import { View } from 'react-native';
import ConnectionStatus from '../components/ConnectionStatus';

export default function Layout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <ConnectionStatus />
    </View>
  );
}
