import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

function ForgotPassword() {
  const params = useLocalSearchParams();
  const isEmployee = params.isEmployee === 'true' || params.isEmployee === true; // Handle string/boolean
  const router = useRouter();

  const renderContent = () => {
    if (isEmployee) {
      return (
        <>
          <View style={styles.stepHeader}>
            <MaterialCommunityIcons name="shield-key-outline" size={64} color="#4da6ff" />
            <Text style={styles.stepTitle}>Forgot Password?</Text>
            <Text style={styles.stepSubtitle}>
              For security, employee passwords are reset directly by your company administrator.
            </Text>
          </View>

          <View style={styles.userTypeIndicator}>
            <MaterialCommunityIcons name="account" size={24} color="#4da6ff" />
            <Text style={styles.userTypeText}>Employee Password Recovery</Text>
          </View>

          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>How to recover your account:</Text>
            
            <View style={styles.instructionRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Contact your Company Administrator / Employer.
              </Text>
            </View>

            <View style={styles.instructionRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Your Admin will generate a secure temporary password for your account from the Admin Portal.
              </Text>
            </View>

            <View style={styles.instructionRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Log in using that temporary password. You can change it anytime from your Profile screen.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.actionButton, { marginTop: 24 }]}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        <View style={styles.stepHeader}>
          <MaterialCommunityIcons name="shield-account" size={60} color="#4da6ff" />
          <Text style={styles.stepTitle}>Admin Password Help</Text>
          <Text style={styles.stepSubtitle}>
            Please contact technical support or your super administrator to reset your organization credentials.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.actionButton, { marginTop: 24 }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
          <Text style={styles.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </>
    );
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
              onPress={() => router.back()}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#4da6ff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Password Recovery</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Main Card */}
          <View style={styles.mainCard}>
            {renderContent()}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>WorkPay Security & Access Control</Text>
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
  instructionCard: {
    backgroundColor: '#192633',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3B4D',
    padding: 18,
    marginVertical: 12,
  },
  instructionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4da6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    color: '#BDC8D4',
    fontSize: 14,
    lineHeight: 20,
  },
});