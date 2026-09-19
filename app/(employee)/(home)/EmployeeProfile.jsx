import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useContextData } from "../../../context/EmployeeContext";
import { api, getApiErrorMessage } from "../../../services/ApiService";

function Profile() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingBank, setIsUpdatingBank] = useState(false);
  const {employeeData, showToast, setEmployeeData} = useContextData();

  // Bank details state
  const [showBankEditSection, setShowBankEditSection] = useState(false);
  const [accountNumber, setAccountNumber] = useState(employeeData?.accountNumber || "");
  const [ifscCode, setIfscCode] = useState(employeeData?.ifscCode || "");

  useEffect(() => {
    if (employeeData) {
      if (employeeData.accountNumber) setAccountNumber(employeeData.accountNumber);
      if (employeeData.ifscCode) setIfscCode(employeeData.ifscCode);
    }
  }, [employeeData]);

  const fetchDashboardDetails = useCallback(async () => {
    try {
      const response = await api.get('/api/employees/dashboard');
      const data = response.data;
      if (data?.employeeDetails) {
        setEmployeeData(data.employeeDetails);
      }
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Error fetching profile details'), 'Error');
      console.error('Error fetching dashboard details:', error);
    }
  }, [setEmployeeData, showToast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDashboardDetails();
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardDetails]);

  const handlePasswordUpdate = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast("Please fill in all password fields", "Warning");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "Warning");
      return;
    }
    
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters long", "Warning");
      return;
    }

    if (newPassword === oldPassword) {
      showToast("New Password cannot be same as Old Password", "Error");
      return;
    }

    if (isUpdatingPassword) return;
    setIsUpdatingPassword(true);
    try {
      const response = await api.post('/api/employees/update-password', {
        currentPassword: oldPassword,
        newPassword: newPassword
      });
      if (response.data?.message) {
        showToast(response.data.message, "Success");
        setShowPasswordSection(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      showToast(getApiErrorMessage(error, "Failed to update password"), "Error");
      console.error('Error Updating Password:', error);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const cancelPasswordUpdate = () => {
    setShowPasswordSection(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleBankDetailsUpdate = async () => {
    if (!accountNumber || !ifscCode) {
      showToast("Please fill in all bank details fields", "Warning");
      return;
    }

    if (accountNumber.length < 9 || accountNumber.length > 18) {
      showToast("Account number must be between 9 and 18 digits", "Warning");
      return;
    }

    if (ifscCode.length !== 11) {
      showToast("IFSC code must be 11 characters", "Warning");
      return;
    }

    if (isUpdatingBank) return;
    setIsUpdatingBank(true);
    try {
      const response = await api.put('/api/employees/update-bank', {
        accountNumber: accountNumber,
        ifscCode: ifscCode
      });
      if (response.data?.message) {
        showToast("Bank details updated successfully", "Success");
        setShowBankEditSection(false);
        fetchDashboardDetails();
      }
    } catch (error) {
      showToast(getApiErrorMessage(error, "Failed to update bank details"), "Error");
      console.error('Error Updating Bank Details:', error);
    } finally {
      setIsUpdatingBank(false);
    }
  };

  const cancelBankDetailsUpdate = () => {
    setShowBankEditSection(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A9EFF']}
            tintColor="#4A9EFF"
          />
        }
      >
        
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBackground}>
              <Text style={styles.avatarText}>{employeeData?.name ? employeeData.name.charAt(0).toUpperCase() : "E"}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{employeeData?.name || "Employee"}</Text>
          <View style={styles.idBadge}>
            <Text style={styles.idText}>Employee ID: {employeeData?.id || "—"}</Text>
          </View>
        </View>

        {/* Employee Details Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="account-details" size={24} color="#4da6ff" />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>
          
          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Feather name="user" size={18} color="#4da6ff" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <Text style={styles.detailValue}>{employeeData?.name || "—"}</Text>
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Feather name="phone" size={18} color="#4da6ff" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Phone Number</Text>
                <Text style={styles.detailValue}>{employeeData?.phone || "—"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Salary Details Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="cash-multiple" size={24} color="#ffcc66" />
            <Text style={styles.cardTitle}>Salary Information</Text>
          </View>
          
          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <MaterialCommunityIcons name="cash" size={18} color="#ffcc66" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Base Salary</Text>
                <Text style={styles.detailValue}>
                  {employeeData?.baseSalary != null ? `₹${Number(employeeData.baseSalary).toLocaleString()}` : "—"}
                </Text>
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <MaterialCommunityIcons name="clock-plus-outline" size={18} color="#ffcc66" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Overtime Rate</Text>
                <Text style={styles.detailValue}>
                  {employeeData?.overtimeRate != null ? `₹${employeeData.overtimeRate}/hr` : "—"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bank Details Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="bank" size={24} color="#66ff99" />
            <Text style={styles.cardTitle}>Bank Details</Text>
          </View>
          
          {!showBankEditSection ? (
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialCommunityIcons name="credit-card-outline" size={18} color="#66ff99" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Account Number</Text>
                  <Text style={styles.detailValue}>{employeeData?.accountNumber || "Not Set"}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialCommunityIcons name="bank-outline" size={18} color="#66ff99" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>IFSC Code</Text>
                  <Text style={styles.detailValue}>{employeeData?.ifscCode || "Not Set"}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => setShowBankEditSection(true)}
                >
                  <Feather name="edit-2" size={16} color="#4da6ff" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Animated.View 
              entering={FadeInDown.duration(280).springify()}
              style={styles.passwordForm}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Number</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="Enter account number"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={18}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>IFSC Code</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={ifscCode}
                    onChangeText={(text) => setIfscCode(text.toUpperCase())}
                    placeholder="Enter IFSC code"
                    placeholderTextColor="#666"
                    autoCapitalize="characters"
                    maxLength={11}
                  />
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={cancelBankDetailsUpdate}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.updateButton, isUpdatingBank && styles.disabledButton]}
                  onPress={handleBankDetailsUpdate}
                  disabled={isUpdatingBank}
                >
                  {isUpdatingBank ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.updateButtonText}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>

        {/* Security Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="shield-account" size={24} color="#ff6666" />
            <Text style={styles.cardTitle}>Security Settings</Text>
          </View>
          
          {!showPasswordSection ? (
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Feather name="lock" size={18} color="#ff6666" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Password</Text>
                  <Text style={styles.detailValue}>••••••••</Text>
                </View>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => setShowPasswordSection(true)}
                >
                  <Feather name="edit-2" size={16} color="#4da6ff" />
                  <Text style={styles.editButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Animated.View 
              entering={FadeInDown.duration(280).springify()}
              style={styles.passwordForm}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    secureTextEntry={!showOldPassword}
                    placeholder="Enter current password"
                    placeholderTextColor="#666"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowOldPassword(!showOldPassword)}
                    style={styles.eyeButton}
                    accessibilityRole="button"
                    accessibilityLabel={showOldPassword ? "Hide current password" : "Show current password"}
                  >
                    <Feather 
                      name={showOldPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#ccc" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor="#666"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeButton}
                    accessibilityRole="button"
                    accessibilityLabel={showNewPassword ? "Hide new password" : "Show new password"}
                  >
                    <Feather 
                      name={showNewPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#ccc" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor="#666"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    <Feather 
                      name={showConfirmPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#ccc" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={cancelPasswordUpdate}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.updateButton, isUpdatingPassword && styles.disabledButton]}
                  onPress={handlePasswordUpdate}
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.updateButtonText}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111a22",
  },
  header: {
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 5,
    paddingBottom: 40,
  },

  profileHeader: {
    alignItems: 'center',
    marginVertical: 30,
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatarBackground: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#233648',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4da6ff',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4da6ff',
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  idBadge: {
    backgroundColor: 'rgba(77, 166, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(77, 166, 255, 0.3)',
  },
  idText: {
    fontSize: 13,
    color: '#4da6ff',
    fontWeight: 'bold',
  },

  infoCard: {
    width: '92%',
    backgroundColor: '#192633',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  detailsList: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(77, 166, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
    gap: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 51,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(77, 166, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(77, 166, 255, 0.3)',
  },
  editButtonText: {
    color: '#4da6ff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  passwordForm: {
    gap: 20,
    marginTop: 10,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 102, 102, 0.1)',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 102, 102, 0.3)',
  },
  cancelButtonText: {
    color: '#ff6666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  updateButton: {
    flex: 1,
    backgroundColor: '#4da6ff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center"
  },
  disabledButton: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});