// Employee context: global employee state + app-wide toast notifications.
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
const defaultContext = {
  employeeData: {},
  setEmployeeData: () => {},
  showToast: (message, type) => {
    console.log(`[Toast ${type || 'Info'}]:`, message);
  },
};

// 1. Create Context
const AppContext = createContext(defaultContext);

// 2. Create Provider Component
export const EmployeeProvider = ({ children }) => {
  const [employeeData, setEmployeeData] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'Info') => {
    // Coerce message safely to string
    let safeMessage = 'An unexpected error occurred';
    if (typeof message === 'string' && message.trim().length > 0) {
      safeMessage = message;
    } else if (message?.message && typeof message.message === 'string') {
      safeMessage = message.message;
    } else if (message?.error && typeof message.error === 'string') {
      safeMessage = message.error;
    }

    // Clear any pending dismissal timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToast({ visible: true, message: safeMessage, type: type || 'Info' });

    // fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // auto close after 3s
    timeoutRef.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setToast({ visible: false, message: '', type: '' }));
    }, 3000);
  }, [opacity]);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setToast({ visible: false, message: '', type: '' }));
  }, [opacity]);

  return (
    <AppContext.Provider value={{ employeeData, setEmployeeData, showToast }}>
      {children}

      {/* Toast rendered inside its own transparent Modal so it always
          appears above ANY other RN Modal/Dialog on Android */}
      <Modal
        visible={toast.visible}
        transparent
        animationType="none"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={dismissToast}
      >
        <View style={styles.toastOverlay} pointerEvents="box-none">
          <TouchableOpacity
            activeOpacity={1}
            onPress={dismissToast}
            style={styles.toastTouchable}
          >
            <Animated.View
              style={[
                styles.toast,
                {
                  opacity,
                  backgroundColor:
                    toast.type === 'Success'
                      ? '#2ecc71'
                      : toast.type === 'Warning'
                      ? '#f39c12'
                      : '#e74c3c',
                },
              ]}
            >
              {toast.type === 'Success' ? (
                <AntDesign name="checkcircleo" size={24} color="white" />
              ) : toast.type === 'Warning' ? (
                <AntDesign name="warning" size={24} color="white" />
              ) : (
                <MaterialIcons name="error-outline" size={24} color="white" />
              )}
              <Text style={styles.toastText}>{toast.message}</Text>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </Modal>
    </AppContext.Provider>
  );
};

// 3. Custom Hook for using context
export const useContextData = () => {
  const context = useContext(AppContext);
  return context || defaultContext;
};

const styles = StyleSheet.create({
  toastOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
  },
  toastTouchable: {
    width: '90%',
  },
  toast: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
});
