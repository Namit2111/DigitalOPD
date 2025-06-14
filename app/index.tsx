// app/index.tsx
import { View } from 'react-native';
import Chat from './components/Chat';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Chat />
    </View>
  );
}
