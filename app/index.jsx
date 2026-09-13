import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { url } from "../constants/EnvValue";
import { useContextData } from "../context/EmployeeContext";
import { getActiveSession, getApiErrorMessage, storeToken } from '../services/ApiService';
import { AdBanner } from '../components/ads/AdBanner';

function IndexScreen() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isEmployee, setIsEmployee] = useState(true);
  const [employeeLogin, setEmployeeLogin] = useState({ phone: '', password: '' });
  const [adminLogin, setAdminLogin] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useContextData();

  // Check for active, unexpired session on app startup
  useEffect(() => {
    let isMounted = true;

    const checkExistingSession = async () => {
      try {
        const session = await getActiveSession();
        if (!isMounted) return;

        if (session && session.token) {
          if (session.role === 'admin') {
            router.replace('/(admin)/(dashboard)/Dashboard');
            return;
          } else {
            router.replace('/(employee)/(home)/Home');
            return;
          }
        }
      } catch (err) {
        console.warn('[IndexScreen] Session check error:', err);
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, []);

    // Clear errors when switching tabs
  const clearErrors = () => {
    setErrors({});
  };

  // Login handlers
  const handleEmployeeLogin = async () => {
    clearErrors();
    
    // Validation
    const newErrors = {};
    
    if (!employeeLogin.phone.toString().trim()) {
      newErrors.phone = 'Please enter your phone number';
    } else if (employeeLogin.phone.toString().length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!employeeLogin.password.trim()) {
      newErrors.password = 'Please enter your password';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${url}/api/employees/login`, {
        phone: employeeLogin.phone,
        password: employeeLogin.password,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data?.token) {
        await storeToken(response.data.token, 'employee');
        showToast(response?.data?.message || "Login successful", "Success");
        router.replace('/(employee)/(home)/Home');
      }
    } catch (error) {
      const errMsg = getApiErrorMessage(error, "Login failed. Please check your credentials.");
      showToast(errMsg, "Error");
      setErrors({ login: errMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    clearErrors();
    
    // Validation
    const newErrors = {};
    
    if (!adminLogin.email.trim()) {
      newErrors.email = 'Please enter your email address';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminLogin.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!adminLogin.password.trim()) {
      newErrors.password = 'Please enter your password';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${url}/api/admins/login`, {
        email: adminLogin.email,
        password: adminLogin.password,
      });
      
      if (response.data?.token) {
        await storeToken(response.data.token, 'admin');
        showToast(response?.data?.message || "Login successful", "Success");
        router.replace('/(admin)/(dashboard)/Dashboard');
      }
    } catch (error) {
      const errMsg = getApiErrorMessage(error, "Invalid email or password");
      showToast(errMsg, "Error");
      setErrors({ login: errMsg });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <View style={styles.splashLoadingContainer}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.splashLoadingLogo}
          contentFit="contain"
        />
        <ActivityIndicator size="large" color="#4da6ff" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Background gradient effect */}
        <View style={styles.backgroundGradient} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image source={require('../assets/images/icon.png')} style={styles.logo} contentFit="contain" />
            </View>
            <Text style={styles.title}>WorkPay</Text>
            <Text style={styles.subtitle}>by SANGHARSH GROUP</Text>
          </View>

      {/* Main Card */}
      <View style={styles.mainCard}>
        {/* Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.tab, isEmployee && styles.selectedTab]}
            onPress={() => setIsEmployee(true)}
          >
            <MaterialCommunityIcons 
              name="account" 
              size={20} 
              color={isEmployee ? "#4da6ff" : "#666"} 
            />
            <Text style={[styles.toggleText, isEmployee && styles.selectedToggleText]}>
              Employee
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !isEmployee && styles.selectedTab]}
            onPress={() => setIsEmployee(false)}
          >
            <MaterialCommunityIcons 
              name="shield-account" 
              size={20} 
              color={!isEmployee ? "#4da6ff" : "#666"} 
            />
            <Text style={[styles.toggleText, !isEmployee && styles.selectedToggleText]}>
              Admin
            </Text>
          </TouchableOpacity>
        </View>

        {/* Forms */}
        <View style={styles.formContainer}>
          {isEmployee ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={[styles.inputContainer,errors.phone && styles.inputError]}>
                  <MaterialCommunityIcons name="phone" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    value={employeeLogin.phone}
                   onChangeText={(text) => {
                      setEmployeeLogin({ ...employeeLogin, phone: text });
                      if (errors.phone) {
                        setErrors(prev => ({ ...prev, phone: null }));
                      }
                    }}
                    style={styles.input}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#666"
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
                 {errors.phone && (
                  <Text style={styles.errorText}>{errors.phone}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                  <MaterialCommunityIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    value={employeeLogin.password}
                    onChangeText={(text) => {
                      setEmployeeLogin({ ...employeeLogin, password: text });
                      if (errors.password) {
                        setErrors(prev => ({ ...prev, password: null }));
                      }
                    }}
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#666"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <MaterialCommunityIcons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>

              <TouchableOpacity
                onPress={handleEmployeeLogin}
                style={[styles.loginButton, isLoading && styles.disabledButton]}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="login" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Sign In</Text>
                  </>
                )}
              </TouchableOpacity>

              {errors.login && (
                <Text style={styles.loginErrorText}>{errors.login}</Text>
              )}
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                  <MaterialCommunityIcons name="email" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    value={adminLogin.email}
                    onChangeText={(text) => {
                      setAdminLogin({ ...adminLogin, email: text });
                      if (errors.email) {
                        setErrors(prev => ({ ...prev, email: null }));
                      }
                    }}
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#666"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                  <MaterialCommunityIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    value={adminLogin.password}
                    onChangeText={(text) => {
                      setAdminLogin({ ...adminLogin, password: text });
                      if (errors.password) {
                        setErrors(prev => ({ ...prev, password: null }));
                      }
                    }}
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#666"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <MaterialCommunityIcons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
                 {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>

               <TouchableOpacity 
                onPress={handleAdminLogin}
                style={[styles.loginButton, isLoading && styles.disabledButton]}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="shield-check" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Admin Access</Text>
                  </>
                )}
              </TouchableOpacity>

              {errors.login && (
                <Text style={styles.loginErrorText}>{errors.login}</Text>
              )}
            </>
          )}

          {/* forgot password button */}
          {/* <TouchableOpacity 
                onPress={() => router.push({ 
                pathname: '/ForgotPassword', 
                params: { isEmployee: isEmployee } 
              })}
 style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Secure • Reliable • Easy</Text>
      </View>

      {/* AdMob Banner for easy verification */}
      <AdBanner style={{ marginTop: 24, marginBottom: 12 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

export default IndexScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(77, 166, 255, 0.05)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  mainCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1a2128',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleContainer: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#0f1419',
    borderRadius: 12,
    padding: 4,
    marginBottom: 30,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  selectedTab: {
    backgroundColor: '#1a2128',
    shadowColor: '#4da6ff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  toggleText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedToggleText: {
    color: '#4da6ff',
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1419',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: '#4da6ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#4da6ff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotPasswordText: {
    color: '#4da6ff',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
   disabledButton: {
    backgroundColor: '#666',
    shadowOpacity: 0,
  },
    errorText: {
    color: '#ff4757',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  loginErrorText: {
    color: '#ff4757',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
   inputError: {
    borderColor: '#ff4757',
    borderWidth: 1,
  },
  logo: {
    width: 88,
    height: 88,
  },
  splashLoadingContainer: {
    flex: 1,
    backgroundColor: '#0f1419',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLoadingLogo: {
    width: 96,
    height: 96,
  },
});