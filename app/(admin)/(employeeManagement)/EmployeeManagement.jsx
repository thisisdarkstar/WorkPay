import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { url } from '../../../constants/EnvValue';
import { useContextData } from "../../../context/EmployeeContext";
import { useOfficeContextData } from '../../../context/OfficeContext';
import { getApiErrorMessage, getToken } from '../../../services/ApiService';

function EmployeeManagement() {
  const router = useRouter();
  const { officeId: routeOfficeId } = useLocalSearchParams();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [employeeToStatusUpdate, setEmployeeToStatusUpdate] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const {showToast} = useContextData();
  const {officeData} = useOfficeContextData();
  const [showOfficeList, setShowOfficeList] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'INACTIVE'
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState(routeOfficeId || 'ALL');

  useEffect(() => {
    if (routeOfficeId) {
      setSelectedOfficeFilter(routeOfficeId);
    }
  }, [routeOfficeId]);

  // Reset password states
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [employeeToReset, setEmployeeToReset] = useState(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [tempPasswordModalVisible, setTempPasswordModalVisible] = useState(false);
  const [generatedPasswordData, setGeneratedPasswordData] = useState(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  
  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Form state  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email:'',
    baseSalary: '',
    overtimeRate: '',
    joinedDate: '',
    officeId: null,
    accountNumber: '',
    ifscCode: '',
  });


  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const response = await axios.get(`${url}/api/employees/getAll`,{
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Error fetching employees'), 'Error');
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  }

  const addEmployee = async () => {
    if (!validateForm()) return;
    try {
      const token = await getToken();
      if (!token) return;
      const response = await axios.post(`${url}/api/employees/add`, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        baseSalary: formData.baseSalary,
        overtimeRate: formData.overtimeRate,
        joinedDate: formData.joinedDate,
        officeId: formData.officeId,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        password: formData.phone
      }, {
        headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      showToast(response.data?.message || "Employee added successfully", "Success");
      setModalVisible(false);
      fetchEmployees();
    } catch (error) {
      showToast(getApiErrorMessage(error, "Failed to add employee"), "Error");
      console.error('Error adding employee:', error);
    }
  };

  const editEmployee = async () => {
    if (!validateForm()) return;
    try {
      const token = await getToken();
      if (!token) return;
      const response = await axios.put(`${url}/api/employees/update/${editingEmployee.id}`, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        baseSalary: formData.baseSalary,
        overtimeRate: formData.overtimeRate,
        joinedDate: formData.joinedDate,
        officeId: formData.officeId,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode
      }, {
        headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      showToast(response.data?.message || "Employee updated successfully", "Success");
      setModalVisible(false);
      fetchEmployees();
    } catch (error) {
      showToast(getApiErrorMessage(error, "Failed to update employee"), "Error");
      console.error('Error editing employee:', error);
    }
  }

  const showStatusUpdateConfirmation = (employee) => {
    setEmployeeToStatusUpdate(employee);
    setStatusModalVisible(true);
  };

  const confirmStatusUpdate = async () => {
    if (!employeeToStatusUpdate) return;
    
    try {
      const token = await getToken();
      if (!token) return;
      const response = await axios.put(`${url}/api/employees/update-status/${employeeToStatusUpdate.id}`,
      {
        status: employeeToStatusUpdate.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      }, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      showToast(response.data?.message || "Status updated", "Success");
      setStatusModalVisible(false);
      setEmployeeToStatusUpdate(null);
      fetchEmployees();
    } catch (error) {
      showToast(getApiErrorMessage(error, "Failed to update status"), "Error");
      console.error('Error updating status:', error);
    }
  };

  const cancelStatusUpdate = () => {
    setStatusModalVisible(false);
    setEmployeeToStatusUpdate(null);
  };

  const showResetPasswordConfirmation = (employee) => {
    setEmployeeToReset(employee);
    setResetModalVisible(true);
  };

  const cancelResetPassword = () => {
    if (isResettingPassword) return;
    setResetModalVisible(false);
    setEmployeeToReset(null);
  };

  const confirmResetPassword = async () => {
    if (!employeeToReset) return;
    setIsResettingPassword(true);
    try {
      const token = await getToken();
      if (!token) {
        showToast("Session expired. Please login again.", "Error");
        setIsResettingPassword(false);
        return;
      }
      const response = await axios.post(
        `${url}/api/employees/admin-reset-password/${employeeToReset.id}`,
        {},
        {
          headers: {
            authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const { temporaryPassword, employee, message } = response.data;
      setResetModalVisible(false);
      setGeneratedPasswordData({
        temporaryPassword,
        employee: employee || employeeToReset
      });
      setTempPasswordModalVisible(true);
      showToast(message || "Password reset successfully", "Success");
    } catch (error) {
      showToast(getApiErrorMessage(error, "Failed to reset password"), "Error");
      console.error('Error resetting password:', error);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!generatedPasswordData?.temporaryPassword) return;
    try {
      if (Clipboard && typeof Clipboard.setStringAsync === 'function') {
        await Clipboard.setStringAsync(generatedPasswordData.temporaryPassword);
      }
      setPasswordCopied(true);
      showToast("Password copied to clipboard!", "Success");
    } catch (error) {
      console.warn("Clipboard copy notice:", error);
      setPasswordCopied(true);
      showToast("Password copied to clipboard!", "Success");
    } finally {
      setTimeout(() => {
        setPasswordCopied(false);
      }, 2500);
    }
  };

  const handleSharePassword = async () => {
    if (!generatedPasswordData?.temporaryPassword) return;
    try {
      await Share.share({
        message: `Hello ${generatedPasswordData.employee?.name || "Employee"},\nYour temporary password for WorkPay is: ${generatedPasswordData.temporaryPassword}\n\nPlease use this to log in to the WorkPay app. You can change your password anytime from your Profile screen.`
      });
    } catch (error) {
      console.error("Error sharing password:", error);
    }
  };

  const handleEmployeeAddandEdit = (type) => {
    if (type === 'add') {
      addEmployee();
    } else if (type === 'edit') {
      editEmployee();
    }
  }

  // Date picker handlers
  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const onDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      setFormData({...formData, joinedDate: formattedDate});
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [])
  );

  // Search and filter functionality
  useEffect(() => {
    let filtered = employees;

    // Apply office filter
    if (selectedOfficeFilter && selectedOfficeFilter !== 'ALL' && selectedOfficeFilter !== 'all') {
      const targetOfficeNum = Number(selectedOfficeFilter);
      filtered = filtered.filter(employee => employee.officeId === targetOfficeNum || employee.office?.id === targetOfficeNum);
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(employee => employee.status === statusFilter);
    }

    // Apply search query
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(employee =>
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.phone.includes(searchQuery)
      );
    }

    setFilteredEmployees(filtered);
  }, [searchQuery, employees, statusFilter, selectedOfficeFilter]);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      baseSalary: '',
      overtimeRate: '',
      joinedDate: '',
      officeId: null,
      accountNumber: '',
      ifscCode: '',
    });
    setEditingEmployee(null);
    setSelectedDate(new Date());
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (employee) => {
    setFormData({
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      baseSalary: employee.baseSalary.toString(),
      overtimeRate: employee.overtimeRate.toString(),
      joinedDate: employee.joinedDate || '',
      officeId: employee.officeId,
      accountNumber: employee.accountNumber || '',
      ifscCode: employee.ifscCode || '',
    });
    
    // Set the selected date for the date picker
    if (employee.joinedDate) {
      setSelectedDate(new Date(employee.joinedDate));
    }
    
    setEditingEmployee(employee);
    setModalVisible(true);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showToast('Please enter employee name','Error');
      return false;
    }
    if (!formData.phone.trim()) {
      showToast( 'Please enter phone number','Error');
      return false;
    }

    if (formData.phone.trim().length !== 10 || !/^\d{10}$/.test(formData.phone.trim())) {
      showToast( 'Please enter valid 10-digit phone number','Error');
      return false;
    }
    if (!formData.baseSalary || isNaN(formData.baseSalary)) {
      showToast( 'Please enter valid base salary','Error');
      return false;
    }
    if (!formData.overtimeRate || isNaN(formData.overtimeRate)) {
      showToast('Please enter valid overtime rate','Error');
      return false;
    }
    if (!formData.joinedDate.trim()) {
      showToast('Please select joined date','Error');
      return false;
    }
    if (!formData.officeId) {
      showToast('Please select office','Error');
      return false;
    }
    if (!formData.accountNumber.trim()) {
      showToast('Please enter account number','Error');
      return false;
    }
    if (!/^\d{9,18}$/.test(formData.accountNumber.trim())) {
      showToast('Please enter valid account number (9-18 digits)','Error');
      return false;
    }
    if (!formData.ifscCode.trim()) {
      showToast('Please enter IFSC code','Error');
      return false;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.trim().toUpperCase())) {
      showToast('Please enter valid IFSC code','Error');
      return false;
    }
    return true;
  };

  const renderEmployeeCard = ({ item }) => (
    <View style={styles.employeeCard}>
      <View style={styles.cardContent}>
        <View style={styles.employeeInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{item?.name ? item.name.charAt(0).toUpperCase() : 'E'}</Text>
          </View>
          <View style={styles.employeeDetails}>
            <Text style={styles.employeeName}>{item?.name || 'Employee'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
              <Text style={styles.employeePhone}>{item?.phone || ''}</Text>
              {item?.office?.name && (
                <View style={styles.officeBadge}>
                  <Feather name="map-pin" size={10} color="#4A9EFF" />
                  <Text style={styles.officeBadgeText}>{item.office.name}</Text>
                </View>
              )}
            </View>
          </View>
        {statusFilter ===  "ALL" &&  <View style={{marginLeft: 'auto',borderRadius: 4,backgroundColor: item?.status === 'ACTIVE' ? '#4CAF50' : '#F97316',paddingHorizontal: 8,paddingVertical: 2,alignSelf: 'flex-start',}}>
                <Text style={[styles.employeeRole,{color:"#ffffff",fontWeight:"bold"}]}>{item?.status || 'UNKNOWN'}</Text>
          </View>}
        </View>
        
        <View style={styles.salaryInfo}>
          <Text style={styles.salaryLabel}>Base Salary</Text>
          <Text style={styles.salaryAmount}>₹{item?.baseSalary || 0}</Text>
          <Text style={styles.overtimeRate}>OT: ₹{item?.overtimeRate || 0}/hr</Text>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]} 
          onPress={() => router.push(
           { pathname:`/EmployeeDetails`,
             params: { id: item.id } 
           })}
        >
          <Feather name="eye" size={13} color="#4A90E2" />
          <Text numberOfLines={1} style={[styles.actionText, { color: '#4A90E2' }]}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => openEditModal(item)}
        >
          <Feather name="edit-2" size={13} color="#F5A623" />
          <Text numberOfLines={1} style={[styles.actionText, { color: '#F5A623' }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.resetButton]} 
          onPress={() => showResetPasswordConfirmation(item)}
        >
          <Feather name="key" size={13} color="#BA68C8" />
          <Text numberOfLines={1} style={[styles.actionText, { color: '#BA68C8' }]}>Reset</Text>
        </TouchableOpacity>

        {/* Active / Inactive button */}
        <TouchableOpacity
          style={[styles.actionButton, item.status === 'ACTIVE' ? styles.deactivateButton : styles.activateButton]}
          onPress={() => showStatusUpdateConfirmation(item)}
        >
          <Feather 
            name={item.status === 'ACTIVE' ? "pause-circle" : "play-circle"} 
            size={13} 
            color={item.status === 'ACTIVE' ? "#FB923C" : "#4CAF50"} 
          />
          <Text numberOfLines={1} style={[styles.actionText, { color: item.status === 'ACTIVE' ? '#FB923C' : '#4CAF50' }]}>
            {item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent={false} backgroundColor="#192633" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Employee Management</Text>
        </View>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <AntDesign name="plus" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Control Deck: Search, Branch Selector & Status Tabs */}
      <View style={styles.controlDeck}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Feather name="search" size={20} color="#8A9BAE" style={styles.searchIcon} />
            <TextInput 
              placeholder="Search employees..." 
              placeholderTextColor="#8A9BAE" 
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Branch / Office Filter Chips */}
        {Array.isArray(officeData) && officeData.length > 0 && (
          <View style={styles.branchChipsContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.branchChipsScroll}
            >
              <TouchableOpacity
                onPress={() => setSelectedOfficeFilter('ALL')}
                style={[
                  styles.branchChip,
                  (selectedOfficeFilter === 'ALL' || selectedOfficeFilter === 'all') && styles.branchChipActive
                ]}
              >
                <Feather 
                  name="grid" 
                  size={13} 
                  color={(selectedOfficeFilter === 'ALL' || selectedOfficeFilter === 'all') ? '#FFFFFF' : '#8A9BAE'} 
                />
                <Text style={[
                  styles.branchChipText,
                  (selectedOfficeFilter === 'ALL' || selectedOfficeFilter === 'all') && styles.branchChipTextActive
                ]}>
                  All Branches
                </Text>
              </TouchableOpacity>

              {officeData.map(office => (
                <TouchableOpacity
                  key={office.id}
                  onPress={() => setSelectedOfficeFilter(office.id)}
                  style={[
                    styles.branchChip,
                    (selectedOfficeFilter === office.id || selectedOfficeFilter === String(office.id)) && styles.branchChipActive
                  ]}
                >
                  <Feather 
                    name="map-pin" 
                    size={13} 
                    color={(selectedOfficeFilter === office.id || selectedOfficeFilter === String(office.id)) ? '#FFFFFF' : '#8A9BAE'} 
                  />
                  <Text style={[
                    styles.branchChipText,
                    (selectedOfficeFilter === office.id || selectedOfficeFilter === String(office.id)) && styles.branchChipTextActive
                  ]}>
                    {office.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterButton, statusFilter === 'ALL' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('ALL')}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'ALL' && styles.filterButtonTextActive]}>
              All ({employees.filter(e => (selectedOfficeFilter === 'ALL' || selectedOfficeFilter === 'all' || e.officeId === Number(selectedOfficeFilter) || e.office?.id === Number(selectedOfficeFilter))).length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, statusFilter === 'ACTIVE' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('ACTIVE')}
          >
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={[styles.filterButtonText, statusFilter === 'ACTIVE' && styles.filterButtonTextActive]}>
              Active ({employees.filter(e => e.status === 'ACTIVE' && (selectedOfficeFilter === 'ALL' || selectedOfficeFilter === 'all' || e.officeId === Number(selectedOfficeFilter) || e.office?.id === Number(selectedOfficeFilter))).length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, statusFilter === 'INACTIVE' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('INACTIVE')}
          >
            <View style={[styles.statusDot, { backgroundColor: '#F97316' }]} />
            <Text style={[styles.filterButtonText, statusFilter === 'INACTIVE' && styles.filterButtonTextActive]}>
              Inactive ({employees.filter(e => e.status === 'INACTIVE' && (selectedOfficeFilter === 'ALL' || selectedOfficeFilter === 'all' || e.officeId === Number(selectedOfficeFilter) || e.office?.id === Number(selectedOfficeFilter))).length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Employee List */}
      <View style={styles.listContainer}>
        <FlatList
          data={filteredEmployees}
          renderItem={renderEmployeeCard}
          keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4da6ff" />
              </View>
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Feather name="users" size={48} color="#486581" />
                <Text style={{ color: '#8A9BAE', fontSize: 16, marginTop: 12 }}>
                  {searchQuery ? 'No matching employees found' : 'No employees available'}
                </Text>
              </View>
            )
          }
        />
      </View>

      {/* Add/Edit Employee Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <AntDesign name="close" size={24} color="#8A9BAE" />
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData({...formData, name: text})}
                    placeholder="Enter full name"
                    placeholderTextColor="#8A9BAE"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(text) => setFormData({...formData, phone: text})}
                    placeholder="+91 9876543210"
                    placeholderTextColor="#8A9BAE"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(text) => setFormData({...formData, email: text})}
                    placeholder="Enter email"
                    placeholderTextColor="#8A9BAE"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Joined Date</Text>
                  <TouchableOpacity 
                    style={styles.datePickerButton} 
                    onPress={showDatePickerModal}
                  >
                    <Text style={[styles.datePickerText, !formData.joinedDate && styles.placeholderText]}>
                      {formData.joinedDate || 'Select joined date'}
                    </Text>
                    <AntDesign name="calendar" size={20} color="#8A9BAE" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Base Salary (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.baseSalary}
                    onChangeText={(text) => setFormData({...formData, baseSalary: text})}
                    placeholder="35000"
                    placeholderTextColor="#8A9BAE"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Overtime Rate (₹/hour)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.overtimeRate}
                    onChangeText={(text) => setFormData({...formData, overtimeRate: text})}
                    placeholder="250"
                    placeholderTextColor="#8A9BAE"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Account Number</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.accountNumber}
                    onChangeText={(text) => setFormData({...formData, accountNumber: text})}
                    placeholder="Enter account number"
                    placeholderTextColor="#8A9BAE"
                    keyboardType="numeric"
                    maxLength={18}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>IFSC Code</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.ifscCode}
                    onChangeText={(text) => setFormData({...formData, ifscCode: text.toUpperCase()})}
                    placeholder="Enter IFSC code"
                    placeholderTextColor="#8A9BAE"
                    autoCapitalize="characters"
                    maxLength={11}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Office Name</Text>
                  <TouchableOpacity 
                    onPress={() => setShowOfficeList(!showOfficeList)}
                  style={styles.input}>
                    <Text style={{color: formData.officeId ? '#FFFFFF' : '#8A9BAE'}}>
                      {officeData?.find(office => office.id === formData.officeId)?.name || 'Select office'}
                    </Text>
                  </TouchableOpacity>
                  {showOfficeList && <View style={{width:"100%",padding:10,backgroundColor:"#111a22",borderRadius:8,marginTop:4}}>
                    {officeData?.map(office => (
                      <TouchableOpacity 
                        key={office.id}
                        onPress={() => {
                          setFormData({...formData, officeId: office.id});
                          setShowOfficeList(false);
                        }}
                        style={{paddingVertical:8}}
                      > 
                        <Text style={{color: office.id === formData.officeId ? '#FFFFFF' : '#8A9BAE'}}>{office.name}</Text>
                      </TouchableOpacity>
                    ))}
                    </View>}
                  </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => {
                    setModalVisible(false)
                    setShowOfficeList(false);

                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={()=>{
                  handleEmployeeAddandEdit(editingEmployee ? 'edit' : 'add');
                }}>
                  <Text style={styles.saveButtonText}>
                    {editingEmployee ? 'Update' : 'Add'} Employee
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={statusModalVisible}
        onRequestClose={cancelStatusUpdate}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <View style={[styles.deleteIcon, { backgroundColor: employeeToStatusUpdate?.status === 'ACTIVE' ? '#F9731620' : '#4CAF5020' }]}>
                <Feather 
                  name={employeeToStatusUpdate?.status === 'ACTIVE' ? "user-x" : "user-check"} 
                  size={32} 
                  color={employeeToStatusUpdate?.status === 'ACTIVE' ? "#FB923C" : "#4CAF50"} 
                />
              </View>
            </View>

            <Text style={styles.deleteTitle}>
              {employeeToStatusUpdate?.status === 'ACTIVE' ? 'Deactivate Employee' : 'Activate Employee'}
            </Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to update the status of{' '}
              <Text style={styles.employeeNameHighlight}>
                {employeeToStatusUpdate?.name}
              </Text>{' '}
              from {employeeToStatusUpdate?.status === 'ACTIVE' ? (
                <Text style={{color: '#4CAF50', fontWeight: 'bold'}}>ACTIVE</Text>
              ) : (
                <Text style={{color: '#FB923C', fontWeight: 'bold'}}>INACTIVE</Text>
              )} to {employeeToStatusUpdate?.status === 'ACTIVE' ? (
                <Text style={{color: '#FB923C', fontWeight: 'bold'}}>INACTIVE</Text>
              ) : (
                <Text style={{color: '#4CAF50', fontWeight: 'bold'}}>ACTIVE</Text>
              )}?
              {employeeToStatusUpdate?.status === 'ACTIVE' && (
                '\n\nThey will be prevented from logging in or recording attendance until reactivated.'
              )}
            </Text>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity 
                style={styles.deleteCancelButton} 
                onPress={cancelStatusUpdate}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteConfirmButton, { backgroundColor: employeeToStatusUpdate?.status === 'ACTIVE' ? '#F97316' : '#4CAF50' }]} 
                onPress={confirmStatusUpdate}
              >
                <Text style={styles.deleteConfirmButtonText}>
                  {employeeToStatusUpdate?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset Password Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={resetModalVisible}
        onRequestClose={cancelResetPassword}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <View style={[styles.deleteIcon, { backgroundColor: '#9C27B020' }]}>
                <Feather name="key" size={32} color="#BA68C8" />
              </View>
            </View>

            <Text style={styles.deleteTitle}>Reset Employee Password</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to reset the password for{' '}
              <Text style={styles.employeeNameHighlight}>
                {employeeToReset?.name}
              </Text>?
              {'\n\n'}A secure random password will be generated for them to log in.
            </Text>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity 
                style={styles.deleteCancelButton} 
                onPress={cancelResetPassword}
                disabled={isResettingPassword}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteConfirmButton, { backgroundColor: '#9C27B0' }]} 
                onPress={confirmResetPassword}
                disabled={isResettingPassword}
              >
                {isResettingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>Reset</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Temporary Password Result Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={tempPasswordModalVisible}
        onRequestClose={() => {
          setTempPasswordModalVisible(false);
          setPasswordCopied(false);
        }}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.resultModalContent}>
            {/* Header Badge */}
            <View style={styles.resultIconContainer}>
              <View style={styles.resultIconBadge}>
                <Feather name="check" size={32} color="#22C55E" />
              </View>
            </View>

            <Text style={styles.resultTitle}>Password Reset Successful</Text>
            <Text style={styles.resultSubtitle}>
              Temporary password for{' '}
              <Text style={styles.employeeNameHighlight}>
                {generatedPasswordData?.employee?.name}
              </Text>:
            </Text>

            {/* Credential Card with Inline Copy Action */}
            <View style={styles.credentialCard}>
              <View style={styles.credentialHeader}>
                <Text style={styles.credentialLabel}>TEMPORARY PASSWORD</Text>
                <TouchableOpacity
                  style={[styles.copyChip, passwordCopied && styles.copyChipSuccess]}
                  onPress={handleCopyPassword}
                  activeOpacity={0.7}
                >
                  <Feather 
                    name={passwordCopied ? "check" : "copy"} 
                    size={12} 
                    color={passwordCopied ? "#22C55E" : "#38BDF8"} 
                  />
                  <Text style={[styles.copyChipText, passwordCopied && styles.copyChipTextSuccess]}>
                    {passwordCopied ? "Copied!" : "Copy"}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.passwordRow}
                onPress={handleCopyPassword}
                activeOpacity={0.8}
              >
                <Text style={styles.passwordDisplayText} selectable={true}>
                  {generatedPasswordData?.temporaryPassword}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Instruction Info Note */}
            <View style={styles.resultInfoBox}>
              <Feather name="info" size={14} color="#60A5FA" style={{ marginTop: 2 }} />
              <Text style={styles.resultInfoText}>
                Share this password with the employee. They can use it to log in and change it anytime from their Profile screen.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.resultActionRow}>
              <TouchableOpacity 
                style={styles.resultDoneButton} 
                onPress={() => {
                  setTempPasswordModalVisible(false);
                  setPasswordCopied(false);
                }}
              >
                <Text style={styles.resultDoneButtonText}>Done</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resultShareButton} 
                onPress={handleSharePassword}
                activeOpacity={0.8}
              >
                <Feather name="share-2" size={15} color="#FFFFFF" />
                <Text style={styles.resultShareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  )
}

export default EmployeeManagement

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111a22',
  },
  header: {
    padding: 16,
    backgroundColor: '#192633',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlDeck: {
    backgroundColor: '#192633',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111a22',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  branchChipsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  branchChipsScroll: {
    gap: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#111a22',
    borderWidth: 1,
    borderColor: '#2A3441',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8A9BAE',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  employeeCard: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    marginBottom: 12,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  employeePhone: {
    fontSize: 14,
    color: '#8A9BAE',
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 12,
    color: '#4A90E2',
    backgroundColor: '#4A90E215',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  salaryInfo: {
    backgroundColor: '#111a22',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salaryLabel: {
    fontSize: 12,
    color: '#8A9BAE',
  },
  salaryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  overtimeRate: {
    fontSize: 16,
    color: '#8A9BAE',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 3,
  },
  viewButton: {
    backgroundColor: '#4A90E218',
  },
  editButton: {
    backgroundColor: '#F5A62318',
  },
  resetButton: {
    backgroundColor: '#BA68C818',
  },
  deactivateButton: {
    backgroundColor: '#F9731618',
  },
  activateButton: {
    backgroundColor: '#4CAF5018',
  },
  deleteButton: {
    backgroundColor: '#F9731618',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#192633',
    borderRadius: 12,
    width: '100%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formContainer: {
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#111a22',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3441',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8A9BAE',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Date Picker Styles
  datePickerButton: {
    backgroundColor: '#111a22',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2A3441',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  placeholderText: {
    color: '#8A9BAE',
  },

  // Custom Delete Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#192633',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteIconContainer: {
    marginBottom: 20,
  },
  deleteIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#58d31115',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#58d31130',
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteMessage: {
    fontSize: 16,
    color: '#8A9BAE',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  employeeNameHighlight: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deleteModalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3441',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  deleteCancelButtonText: {
    color: '#8A9BAE',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#0dc025ff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#0dc025ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordDisplayBox: {
    backgroundColor: '#111a22',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    width: '100%',
  },
  passwordDisplayText: {
    color: '#38BDF8',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  passwordHintText: {
    fontSize: 12,
    color: '#8A9BAE',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  // Redesigned Temporary Password Result Modal Styles
  resultModalContent: {
    backgroundColor: '#192633',
    borderRadius: 18,
    padding: 24,
    width: '92%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  resultIconContainer: {
    marginBottom: 14,
  },
  resultIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.28)',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#8A9BAE',
    textAlign: 'center',
    marginBottom: 16,
  },
  credentialCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#38BDF835',
    padding: 14,
    width: '100%',
    marginBottom: 12,
  },
  credentialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  credentialLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
  },
  copyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  copyChipSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  copyChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  copyChipTextSuccess: {
    color: '#22C55E',
  },
  passwordRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  resultInfoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.18)',
    marginBottom: 20,
    width: '100%',
  },
  resultInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  resultActionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  resultDoneButton: {
    flex: 1,
    backgroundColor: '#223344',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultDoneButtonText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  resultShareButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  resultShareButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#111a22',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  branchChipActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  branchChipText: {
    fontSize: 13,
    color: '#8A9BAE',
    fontWeight: '500',
  },
  branchChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  officeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(74, 158, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  officeBadgeText: {
    fontSize: 11,
    color: '#4A9EFF',
    fontWeight: '500',
  },
});