import NetInfo from '@react-native-community/netinfo';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

export const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [wasPreviouslyOffline, setWasPreviouslyOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const newIsOnline = state.isConnected ?? true;
      
      if (!newIsOnline) {
        // Going offline
        Toast.show({
          type: 'error',
          text1: 'offline',
          text2: 'Changes will be stored locally',
          position: 'top',
          visibilityTime: 3000,
        });
        setWasPreviouslyOffline(true);
      } else if (newIsOnline && wasPreviouslyOffline) {
        // Coming back online after being offline
        Toast.show({
          type: 'success',
          text1: 'online',
          position: 'top',
          visibilityTime: 3000,
        });
        
        // Show syncing toast after online toast
        setTimeout(() => {
          Toast.show({
            type: 'info',
            text1: 'Syncing with backend',
            text2: 'Your offline changes are being synchronized...',
            position: 'top',
            visibilityTime: 3000,
          });
        }, 3000);

        Toast.show({
          type: 'info',
          text1: 'Synced',
          text2: 'Your offline changes are synced with the backend',
          position: 'top',
          visibilityTime: 3000,
        });
        
        setWasPreviouslyOffline(false);
      } else if (newIsOnline) {
        // Just coming online (first time)
        Toast.show({
          type: 'success',
          text1: 'online',
          position: 'top',
          visibilityTime: 3000,
        });
      }
      
      setIsOnline(newIsOnline);
    });

    return () => {
      unsubscribe();
    };
  }, [wasPreviouslyOffline]);

  return isOnline;
};

const ConnectionStatus: React.FC = () => {
  const isOnline = useConnectionStatus();
  const opacity = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate the opacity when connection status changes
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 0.4,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOnline]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={[styles.dot, { backgroundColor: isOnline ? '#4caf50' : '#f44336' }]} />
      <Text style={styles.text}>{isOnline ? 'Online' : 'Offline'}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ConnectionStatus; 