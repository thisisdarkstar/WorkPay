import { useCallback, useRef, useState } from 'react';
import { BackHandler, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

/**
 * useExitConfirmation
 *
 * Reliable "press back twice + confirmation to exit" for Android, designed for
 * expo-router landing screens (Home / Dashboard).
 *
 * WHY useFocusEffect (not a global BackHandler):
 * A globally-mounted BackHandler competes with React Navigation's own hardware
 * back handling and, on root tab screens, the navigator can exit the app before
 * the global listener wins (a known expo-router / React-Navigation issue).
 * Registering the listener via useFocusEffect runs it in the focused screen's
 * navigation context, so it reliably intercepts the back press. When the handler
 * returns true, the event is consumed and the app does NOT exit.
 *
 * Behavior:
 *  - 1st back press  -> show a confirmation modal (armed for 3s). App does NOT exit.
 *  - 2nd back press within 3s (or tapping "Exit") -> exits the app.
 *  - No press within 3s -> modal auto-dismisses; state resets.
 *
 * Returns the modal element to render inside the screen: `const { ExitModal } = useExitConfirmation(); ... {ExitModal}`
 */
export function useExitConfirmation() {
  const [visible, setVisible] = useState(false);
  const armedRef = useRef(false);
  const timerRef = useRef(null);

  const disarm = useCallback(() => {
    armedRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    disarm();
    setVisible(false);
  }, [disarm]);

  const exit = useCallback(() => {
    disarm();
    setVisible(false);
    BackHandler.exitApp();
  }, [disarm]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Second press within the armed window → exit.
        if (armedRef.current) {
          exit();
          return true;
        }
        // First press → arm + show confirmation. Consume the event (return true)
        // so the app never exits on a single press.
        armedRef.current = true;
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          armedRef.current = false;
          setVisible(false);
          timerRef.current = null;
        }, 3000);
        return true;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        sub.remove();
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        armedRef.current = false;
      };
    }, [exit])
  );

  const ExitModal = (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={exit}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="exit-to-app" size={28} color="#EF4444" />
          </View>
          <Text style={styles.title}>Exit WorkPay?</Text>
          <Text style={styles.message}>Press back again or tap Exit to close the app.</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity activeOpacity={0.75} onPress={close} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.75} onPress={exit} style={styles.confirmButton}>
              <Text style={styles.confirmText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return { ExitModal };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
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
  title: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 13.5, color: '#8A9BAE', textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelButton: {
    flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#111a22',
    borderWidth: 1, borderColor: '#2A3441', alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { color: '#8A9BAE', fontSize: 14, fontWeight: '600' },
  confirmButton: {
    flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});

export default useExitConfirmation;
