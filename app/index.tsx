// app/index.tsx
import { useEffect } from 'react';
import { View } from 'react-native';
import Chat from '../components/Chat';
import { localDb } from '../db/localDb';
import { syncManager } from '../services/syncManager';

export default function HomeScreen() {
  useEffect(() => {
    async function initializeDb() {
      try {
        await localDb.initialize();
        console.log('Local database ready!');
        await syncManager.start();
      } catch (error) {
        console.error('Database initialization failed:', error);
      }
    }
    
    initializeDb();
  }, []);
    return (
    <View style={{ flex: 1 }}>
      <Chat />
    </View>
  );
}
