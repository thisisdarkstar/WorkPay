import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  BackHandler,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigationContainerRef } from 'expo-router';

export default function ExitConfirmationModal() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const navigationRef = useNavigationContainerRef();

  const handleClose = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setVisible(false);
  }, []);

  const handleConfirmExit = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setVisible(false);
    BackHandler.exitApp();
  }, []);

  // Hardware back press listener for Android
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      // 1. If modal is already showing, a back press triggers exit
      if (visible) {
        handleConfirmExit();
        return true;
      }

      // 2. If navigator can go back to a previous screen, let it navigate back
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }

      // 3. At root screen: intercept exit and show styled confirmation dialog
      setVisible(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      // Auto-dismiss after 4 seconds if no action taken
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 4000);

      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible, navigationRef, handleConfirmExit]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleConfirmExit}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Icon */}
              <View style={styles.iconCircle}>
                <MaterialIcons name="exit-to-app" size={28} color="#EF4444" />
              </View>

              {/* Title & Message */}
              <Text style={styles.title}>Exit WorkPay?</Text>
              <Text style={styles.message}>
                Are you sure you want to exit the app? Press back again or tap Confirm to exit.
              </Text>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleClose}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleConfirmExit}
                  style={styles.confirmButton}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#192633',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3441',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 13.5,
    color: '#8A9BAE',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#111a22',
    borderWidth: 1,
    borderColor: '#2A3441',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#8A9BAE',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
