import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Enter details, 2: Verify OTP, 3: Reset password
  const params = useLocalSearchParams();
  const isEmployee = params.isEmployee === 'true' || params.isEmployee === true; // Handle string/boolean
  const [contactInfo, setContactInfo] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSendOTP = () => {
    if (!contactInfo.trim()) {
      Alert.alert('Error', `Please enter your ${isEmployee ? 'phone number' : 'email address'}`);
      return;
    }
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 1500);
  };

  const handleVerifyOTP = () => {
    if (!otp.trim() || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
    }, 1500);
  };

  const handleResetPassword = () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert('Success', 'Password reset successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }, 1500);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <View style={styles.stepHeader}>
              <MaterialCommunityIcons name="lock-reset" size={60} color="#4da6ff" />
              <Text style={styles.stepTitle}>Forgot Password?</Text>
              <Text style={styles.stepSubtitle}>
                {"Don't worry! Enter your "} {isEmployee ? 'phone number' : 'email address'} {" and we'll send you a verification code."}
              </Text>
            </View>

            <View style={styles.userTypeIndicator}>
              <MaterialCommunityIcons 
                name={isEmployee ? "account" : "shield-account"} 
                size={24} 
                color="#4da6ff" 
              />
              <Text style={styles.userTypeText}>
                {isEmployee ? 'Employee' : 'Admin'} Password Recovery
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isEmployee ? 'Phone Number' : 'Email Address'}
              </Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons 
                  name={isEmployee ? "phone" : "email"} 
                  size={20} 
                  color="#666" 
                  style={styles.inputIcon} 
                />
                <TextInput
                  value={contactInfo}
                  onChangeText={setContactInfo}
                  style={styles.input}
                  placeholder={isEmployee ? 'Enter your phone number' : 'Enter your email address'}
                  placeholderTextColor="#666"
                  keyboardType={isEmployee ? "phone-pad" : "email-address"}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSendOTP}
              style={[styles.actionButton, isLoading && styles.disabledButton]}
              disabled={isLoading}
            >
              {isLoading ? (
                <MaterialCommunityIcons name="loading" size={20} color="#fff" />
              ) : (
                <MaterialCommunityIcons name="send" size={20} color="#fff" />
              )}
              <Text style={styles.buttonText}>
                {isLoading ? 'Sending...' : 'Send Verification Code'}
              </Text>
            </TouchableOpacity>
          </>
        );

      case 2:
        return (
          <>
            <View style={styles.stepHeader}>
              <MaterialCommunityIcons name="message-text" size={60} color="#4da6ff" />
              <Text style={styles.stepTitle}>Verify Code</Text>
              <Text style={styles.stepSubtitle}>
                {"We've sent a 6-digit verification code to your "} {isEmployee ? 'phone' : 'email'}
              </Text>
              <Text style={styles.contactDisplay}>{contactInfo}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="security" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  style={styles.input}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleVerifyOTP}
              style={[styles.actionButton, isLoading && styles.disabledButton]}
              disabled={isLoading}
            >
              {isLoading ? (
                <MaterialCommunityIcons name="loading" size={20} color="#fff" />
              ) : (
                <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
              )}
              <Text style={styles.buttonText}>
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendButton}>
              <Text style={styles.resendText}>{"Didn't receive code? Resend"}</Text>
            </TouchableOpacity>
          </>
        );

      case 3:
        return (
          <>
            <View style={styles.stepHeader}>
              <MaterialCommunityIcons name="key-variant" size={60} color="#4da6ff" />
              <Text style={styles.stepTitle}>Reset Password</Text>
              <Text style={styles.stepSubtitle}>
                Create a new secure password for your account
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  style={styles.input}
                  placeholder="Enter new password"
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
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-check" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#666"
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialCommunityIcons 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleResetPassword}
              style={[styles.actionButton, isLoading && styles.disabledButton]}
              disabled={isLoading}
            >
              {isLoading ? (
                <MaterialCommunityIcons name="loading" size={20} color="#fff" />
              ) : (
                <MaterialCommunityIcons name="check-bold" size={20} color="#fff" />
              )}
              <Text style={styles.buttonText}>
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Text>
            </TouchableOpacity>
          </>
        );

      default:
        return null;
    }
  };

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
          {/* Header with back button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => step > 1 ? setStep(step - 1) : router.back()}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#4da6ff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Password Recovery</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressStep}>
              <View style={[
                styles.progressDot, 
                step >= 1 && styles.activeProgressDot
              ]}>
                {step > 1 ? (
                  <MaterialCommunityIcons name="check" size={12} color="#fff" />
                ) : (
                  <Text style={[styles.progressNumber, step >= 1 && styles.activeProgressNumber]}>
                    1
                  </Text>
                )}
              </View>
              <View style={[styles.progressLine, step > 1 && styles.activeProgressLine]} />
            </View>
            
            <View style={styles.progressStep}>
              <View style={[
                styles.progressDot, 
                step >= 2 && styles.activeProgressDot
              ]}>
                {step > 2 ? (
                  <MaterialCommunityIcons name="check" size={12} color="#fff" />
                ) : (
                  <Text style={[styles.progressNumber, step >= 2 && styles.activeProgressNumber]}>
                    2
                  </Text>
                )}
              </View>
              <View style={[styles.progressLine, step > 2 && styles.activeProgressLine]} />
            </View>
            
            <View style={styles.progressStep}>
              <View style={[
                styles.progressDot, 
                step >= 3 && styles.activeProgressDot
              ]}>
                <Text style={[styles.progressNumber, step >= 3 && styles.activeProgressNumber]}>
                  3
                </Text>
              </View>
            </View>
          </View>

          {/* Main Card */}
          <View style={styles.mainCard}>
            {renderStepContent()}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Need help? Contact support</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

export default ForgotPassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(77, 166, 255, 0.1)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(77, 166, 255, 0.3)',
  },
  headerTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
    paddingHorizontal: 20,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a323d',
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeProgressDot: {
    backgroundColor: '#4da6ff',
    borderColor: '#4da6ff',
  },
  progressNumber: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  activeProgressNumber: {
    color: '#fff',
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: '#444',
    marginHorizontal: 8,
  },
  activeProgressLine: {
    backgroundColor: '#4da6ff',
  },
  mainCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1a2128',
    borderRadius: 20,
    padding: 24,
    alignSelf: 'center',
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
  stepHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  contactDisplay: {
    fontSize: 16,
    color: '#4da6ff',
    fontWeight: '600',
    marginTop: 8,
  },
  userTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(77, 166, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(77, 166, 255, 0.3)',
    gap: 8,
  },
  userTypeText: {
    color: '#4da6ff',
    fontSize: 16,
    fontWeight: '600',
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
  actionButton: {
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
  disabledButton: {
    backgroundColor: '#666',
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    color: '#4da6ff',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 40,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
});