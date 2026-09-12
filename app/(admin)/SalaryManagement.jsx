import Feather from '@expo/vector-icons/Feather'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import axios from 'axios'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { url } from '../../constants/EnvValue'
import { useContextData } from "../../context/EmployeeContext"
import { getApiErrorMessage, getToken } from "../../services/ApiService"

function AdminSalaryManagement() {
  const router = useRouter()
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  // States
  const [loading, setLoading] = useState(true)
  const [advanceModalVisible, setAdvanceModalVisible] = useState(false)
  const [deductionModalVisible, setDeductionModalVisible] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [advanceAmount, setAdvanceAmount] = useState(null)
  const [deductionAmount, setDeductionAmount] = useState(null)
  const [deductionDescription, setDeductionDescription] = useState(null)
  const [processingAdvance, setProcessingAdvance] = useState(false)
  const [processingDeduction, setProcessingDeduction] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [paymentData,setPaymentData] = useState([]);
  const {showToast} = useContextData();


   const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url}/api/transactions/monthly-transactions?year=${selectedYear}&month=${selectedMonth}`, {
        headers: {
          authorization: `Bearer ${await getToken()}`,
        }
      });
      const data = response.data;
      setPaymentData(Array.isArray(data?.payments) ? data.payments : []);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to fetch payment history'),'Error');
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // Sample data - replace with API calls
  useEffect(() => {
    fetchPaymentHistory();
  }, [selectedMonth, selectedYear]);


    const calculateMonthTotals = (transactions) => {
    if (!Array.isArray(transactions)) return { overtime: 0, deduction: 0, advance: 0 };
    const overtime = transactions.reduce((acc, it) => acc + (it?.payType === "OVERTIME" ? (Number(it?.amount) || 0) : 0), 0);
    const deduction = transactions.reduce((acc, it) => acc + (it?.payType === "DEDUCTION" ? (Number(it?.amount) || 0) : 0), 0);
    const advance = transactions.reduce((acc, it) => acc + (it?.payType === "ADVANCE" ? (Number(it?.amount) || 0) : 0), 0);
    
    return { overtime, deduction, advance };
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return '#7ED321'
      case 'Pending': return '#F5A623'
      case 'Due': return '#D0021B'
      default: return '#8A9BAE'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid': return 'check-circle'
      case 'Pending': return 'clock'
      case 'Due': return 'alert-circle'
      default: return 'help-circle'
    }
  }

  // Month navigation functions
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const isNextDisabled = selectedMonth === currentMonth && selectedYear === currentYear

  const handleSettleSalary = async (employee) => {
    setSelectedEmployee(employee);
      try {
      const response = await axios.post(`${url}/api/transactions/add-transaction`, 
        {
          empId:employee.empId,
          amount:(employee.baseSalary + 
        calculateMonthTotals(employee.transactions).overtime 
        - calculateMonthTotals(employee.transactions).deduction
        -calculateMonthTotals(employee.transactions).advance
      ),
          description:`Salary payment for ${employee.name} of amount ${employee.baseSalary + 
        calculateMonthTotals(employee.transactions).overtime 
        - calculateMonthTotals(employee.transactions).deduction
        -calculateMonthTotals(employee.transactions).advance
      }`,
          type:"SALARY"
        }
        ,
        {
        headers: {
          authorization: `Bearer ${await getToken()}`,
        }
      });
      const data = response.data;
      showToast(data.message || 'Salary settled successfully', "Success");
      fetchPaymentHistory();
      console.log(data)
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to settle salary'), "Error")
      console.log(err);
    }

  }

  const handleAdvancePayment = (employee) => {
    setSelectedEmployee(employee)
    setAdvanceAmount(null)
    setAdvanceModalVisible(true)
  }

  const handleDeductionPayment = (employee) => {
    setSelectedEmployee(employee)
    setDeductionAmount(null)
    setDeductionDescription(null)
    setDeductionModalVisible(true)
  }

  const processAdvancePayment = async () => {
      if( Number(advanceAmount) > (selectedEmployee.baseSalary + 
        calculateMonthTotals(selectedEmployee.transactions).overtime 
        - calculateMonthTotals(selectedEmployee.transactions).deduction
        -calculateMonthTotals(selectedEmployee.transactions).advance
      )){
            showToast( `Advance amount cannot exceed ₹${(selectedEmployee.baseSalary + 
        calculateMonthTotals(selectedEmployee.transactions).overtime 
        - calculateMonthTotals(selectedEmployee.transactions).deduction
        -calculateMonthTotals(selectedEmployee.transactions).advance).toLocaleString()}`,'Error')
      return
      }
      try {
      setProcessingAdvance(true);
      const response = await axios.post(`${url}/api/transactions/add-transaction`, 
        {
          empId:selectedEmployee.empId,
          amount:advanceAmount,
          description:`Advance payment for ${selectedEmployee.name} of amount ${advanceAmount}`,
          type:"ADVANCE"
        }
        ,
        {
        headers: {
          authorization: `Bearer ${await getToken()}`,
        }
      });
      const data = response.data;
      if(data.message){
        showToast(data.message, "Success");
        fetchPaymentHistory();
        setAdvanceAmount(null);
        setAdvanceModalVisible(false)
      }
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to process advance payment'), "Error");
      console.log(err);
    } finally {
      setProcessingAdvance(false);
    }
      
  }

  const processDeductionTransaction = async () => {
    if(!deductionAmount || !deductionDescription) {
      showToast('Please fill all fields', 'Error');
      return;
    }

    try {
      setProcessingDeduction(true);
      const response = await axios.post(`${url}/api/transactions/add-transaction`, 
        {
          empId: selectedEmployee.empId,
          amount: deductionAmount,
          description: deductionDescription,
          type: "DEDUCTION"
        },
        {
          headers: {
            authorization: `Bearer ${await getToken()}`,
          }
        }
      );
      const data = response.data;
      if(data.message){
        showToast(data.message, "Success");
        fetchPaymentHistory();
        setDeductionAmount(null);
        setDeductionDescription(null);
        setDeductionModalVisible(false);
      }
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to process deduction'), "Error");
      console.log(err);
    } finally {
      setProcessingDeduction(false);
    }
  }

  const navigateToEmployeeDetails = (employeeId) => {
    router.push({
      pathname: '/EmployeeDetails',
      params: { id: employeeId }
    });
  }

  const renderEmployeeCard = ({ item }) => {
    const totals = calculateMonthTotals(item?.transactions);
    const base = Number(item?.baseSalary) || 0;
    const isPaid = Array.isArray(item?.transactions) && item.transactions.some(i => i?.payType === "SALARY");

    return (
      <View style={styles.employeeCard}>
        {/* Employee Header */}
        <TouchableOpacity 
          style={styles.employeeHeader}
          onPress={() => navigateToEmployeeDetails(item.empId || item.id)}
        >
          <View style={styles.employeeAvatar}>
            <Text style={styles.avatarText}>{item?.name ? item.name.charAt(0).toUpperCase() : 'E'}</Text>
          </View>
          <View style={styles.employeeBasicInfo}>
            <Text style={styles.employeeName}>{item?.name || 'Employee'}</Text>
            <Text style={styles.employeePhone}>{item?.phone || ''}</Text>
          </View>
        </TouchableOpacity>

        {/* Salary Breakdown */}
        <View style={styles.salaryBreakdown}>
          <View style={styles.salaryRow}>
            <Text style={styles.salaryLabel}>Base Salary</Text>
            <Text style={styles.salaryAmount}>₹{base.toLocaleString()}</Text>
          </View>
          
          <View style={styles.salaryRow}>
            <Text style={styles.salaryLabel}>Overtime</Text>
            <Text style={[styles.salaryAmount, { color: '#7ED321' }]}>
              + ₹{totals.overtime}
            </Text>
          </View>
          
          <View style={styles.salaryRow}>
            <Text style={styles.salaryLabel}>Deductions </Text>
            <Text style={[styles.salaryAmount, { color: '#D0021B' }]}>
              - ₹{totals.deduction}
            </Text>
          </View>
          
          <View style={styles.salaryRow}>
            <Text style={styles.salaryLabel}>Advance Payment</Text>
            <Text style={[styles.salaryAmount, { color: '#D0021B' }]}>
              - ₹{totals.advance}
            </Text>
          </View>
          
          <View style={[styles.salaryRow, styles.finalSalaryRow]}>
            <Text style={styles.finalSalaryLabel}>Final Salary</Text>
            <Text style={styles.finalSalaryAmount}>₹{base + totals.overtime - totals.deduction - totals.advance}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Current Month - Settle Salary */}
          {!isPaid && isCurrentMonth() && (
            <TouchableOpacity
              style={styles.settleButton}
              onPress={() => handleSettleSalary(item)}
            >
              <MaterialCommunityIcons name="check-circle" size={16} color="#fff" />
              <Text style={styles.settleButtonText}>Settle Salary</Text>
            </TouchableOpacity>
          )}
          
          {/* Advance Payment - Only for Current Month */}
          {!isPaid && isCurrentMonth() && (
            <TouchableOpacity
              style={styles.advanceButton}
              onPress={() => handleAdvancePayment(item)}
            >
              <MaterialCommunityIcons name="cash" size={16} color="#4A90E2" />
              <Text style={styles.advanceButtonText}>Advance</Text>
            </TouchableOpacity>
          )}

          {/* Deduction Button - Only for Current Month */}
          {!isPaid && isCurrentMonth() && (
            <TouchableOpacity
              style={styles.deductionButton}
              onPress={() => handleDeductionPayment(item)}
            >
              <MaterialCommunityIcons name="minus-circle" size={16} color="#F5A623" />
              <Text style={styles.deductionButtonText}>Deduction</Text>
            </TouchableOpacity>
          )}
          
          {/* Paid Status Indicator */}
          {isPaid && (
            <View style={styles.paidIndicator}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#7ED321" />
              <Text style={styles.paidText}>Salary Paid</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const getCurrentMonthName = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[currentMonth - 1]
  }

  const getSelectedMonthName = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[selectedMonth - 1]
  }

  const isPastMonth = () => {
    return selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth)
  }

  const isCurrentMonth = () => {
    return selectedYear === currentYear && selectedMonth === currentMonth
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4da6ff" />
        <Text style={[styles.loadingText, { marginTop: 12 }]}>Loading salary data...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#192633" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Salary Management</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Month Overview */}
      <View style={styles.monthOverview}>
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
            <Feather name="chevron-left" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.monthInfo}>
            <Text style={styles.monthTitle}>{getSelectedMonthName()} {selectedYear}</Text>
            <Text style={styles.monthSubtitle}>
              {isCurrentMonth() ? 'Current Month Salary Overview' : 
               isPastMonth() ? 'Past Month Salary Overview' : 
               'Future Month Salary Overview'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleNextMonth}
            disabled={isNextDisabled}
            style={[styles.navButton, isNextDisabled && { opacity: 0.4 }]}
          >
            <Feather name="chevron-right" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Employee List */}
      <FlatList
        data={paymentData || []}
        keyExtractor={(item) => item?.empId?.toString() || item?.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        renderItem={renderEmployeeCard}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <MaterialIcons name="payments" size={48} color="#486581" />
            <Text style={{ color: '#8A9BAE', fontSize: 16, marginTop: 12 }}>
              No salary records found for {getSelectedMonthName()} {selectedYear}
            </Text>
          </View>
        }
      />

      {/* Advance Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={advanceModalVisible}
        onRequestClose={() => setAdvanceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advance Payment</Text>
              <TouchableOpacity
                onPress={() => setAdvanceModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#8A9BAE" />
              </TouchableOpacity>
            </View>
            
            {selectedEmployee && (
              <View style={styles.modalBody}>
                <Text style={styles.modalEmployeeName}>{selectedEmployee.name}</Text>
                <Text style={styles.modalEmployeePhone}>{selectedEmployee.phone}</Text>
                
                <View style={styles.salaryInfoModal}>
                  <Text style={styles.modalSalaryLabel}>Current Month Salary Calculation:</Text>
                  <View style={styles.modalSalaryRow}>
                    <Text style={styles.modalSalaryText}>Base Salary:</Text>
                    <Text style={styles.modalSalaryAmount}>₹{selectedEmployee.baseSalary}</Text>
                  </View>
                  <View style={styles.modalSalaryRow}>
                    <Text style={styles.modalSalaryText}>Overtime:</Text>
                    <Text style={[styles.modalSalaryAmount, { color: '#7ED321' }]}>
                      + ₹{calculateMonthTotals(selectedEmployee.transactions).overtime.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.modalSalaryRow}>
                    <Text style={styles.modalSalaryText}>Deductions:</Text>
                    <Text style={[styles.modalSalaryAmount, { color: '#D0021B' }]}>
                      - ₹{calculateMonthTotals(selectedEmployee.transactions).deduction.toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.modalSalaryRow, styles.maxAdvanceRow]}>
                    <Text style={styles.modalSalaryText}>Max Advance:</Text>
                    <Text style={styles.modalSalaryAmount}>
                      ₹{(selectedEmployee.baseSalary +
                         calculateMonthTotals(selectedEmployee.transactions).overtime 
                         - calculateMonthTotals(selectedEmployee.transactions).deduction
                         -calculateMonthTotals(selectedEmployee.transactions).advance
                         ).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Advance Amount</Text>
                  <TextInput
                    style={styles.advanceInput}
                    placeholder="Enter amount"
                    placeholderTextColor="#8A9BAE"
                    value={advanceAmount}
                    onChangeText={setAdvanceAmount}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setAdvanceModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.processButton, processingAdvance && styles.disabledButton]}
                    onPress={processAdvancePayment}
                    disabled={processingAdvance}
                  >
                    {processingAdvance ? (
                      <Text style={styles.processButtonText}>Processing...</Text>
                    ) : (
                      <>
                        <MaterialCommunityIcons name="cash" size={16} color="#fff" />
                        <Text style={styles.processButtonText}>Process</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Deduction Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={deductionModalVisible}
        onRequestClose={() => setDeductionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deduction</Text>
              <TouchableOpacity
                onPress={() => setDeductionModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#8A9BAE" />
              </TouchableOpacity>
            </View>
            
            {selectedEmployee && (
              <View style={styles.modalBody}>
                <Text style={styles.modalEmployeeName}>{selectedEmployee.name}</Text>
                <Text style={styles.modalEmployeePhone}>{selectedEmployee.phone}</Text>
                
                <View style={styles.salaryInfoModal}>
                  <Text style={styles.modalSalaryLabel}>Current Month Salary Calculation:</Text>
                  <View style={styles.modalSalaryRow}>
                    <Text style={styles.modalSalaryText}>Base Salary:</Text>
                    <Text style={styles.modalSalaryAmount}>₹{selectedEmployee.baseSalary}</Text>
                  </View>
                  <View style={styles.modalSalaryRow}>
                    <Text style={styles.modalSalaryText}>Overtime:</Text>
                    <Text style={[styles.modalSalaryAmount, { color: '#7ED321' }]}>
                      + ₹{calculateMonthTotals(selectedEmployee.transactions).overtime.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.modalSalaryRow}>
                    <Text style={styles.modalSalaryText}>Current Deductions:</Text>
                    <Text style={[styles.modalSalaryAmount, { color: '#D0021B' }]}>
                      - ₹{calculateMonthTotals(selectedEmployee.transactions).deduction.toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.modalSalaryRow, styles.maxAdvanceRow]}>
                    <Text style={styles.modalSalaryText}>Current Final Salary:</Text>
                    <Text style={styles.modalSalaryAmount}>
                      ₹{(selectedEmployee.baseSalary +
                         calculateMonthTotals(selectedEmployee.transactions).overtime 
                         - calculateMonthTotals(selectedEmployee.transactions).deduction
                         -calculateMonthTotals(selectedEmployee.transactions).advance
                         ).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Deduction Amount</Text>
                  <TextInput
                    style={styles.advanceInput}
                    placeholder="Enter amount"
                    placeholderTextColor="#8A9BAE"
                    value={deductionAmount}
                    onChangeText={setDeductionAmount}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.advanceInput, styles.descriptionInput]}
                    placeholder="Enter deduction description"
                    placeholderTextColor="#8A9BAE"
                    value={deductionDescription}
                    onChangeText={setDeductionDescription}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setDeductionModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.processButton, processingDeduction && styles.disabledButton]}
                    onPress={processDeductionTransaction}
                    disabled={processingDeduction}
                  >
                    {processingDeduction ? (
                      <Text style={styles.processButtonText}>Processing...</Text>
                    ) : (
                      <>
                        <MaterialCommunityIcons name="minus-circle" size={16} color="#fff" />
                        <Text style={styles.processButtonText}>Process</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

export default AdminSalaryManagement

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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 32,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },

  // Month Overview
  monthOverview: {
    backgroundColor: '#192633',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  monthSubtitle: {
    fontSize: 14,
    color: '#8A9BAE',
    marginTop: 4,
  },
  monthStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#8A9BAE',
  },

  // List Content
  listContent: {
    padding: 16,
    gap: 12,
  },

  // Employee Cards
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
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  employeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  employeeBasicInfo: {
    flex: 1,
    gap: 2,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  employeePhone: {
    fontSize: 12,
    color: '#8A9BAE',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Salary Breakdown
  salaryBreakdown: {
    backgroundColor: '#111a22',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  salaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salaryLabel: {
    fontSize: 13,
    color: '#8A9BAE',
  },
  salaryAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  finalSalaryRow: {
    borderTopWidth: 1,
    borderTopColor: '#2A3441',
    paddingTop: 8,
    marginTop: 4,
  },
  finalSalaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  finalSalaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7ED321',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  settleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7ED321',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minWidth: '100%',
  },
  settleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  advanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E220',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  advanceButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  deductionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5A62320',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  deductionButtonText: {
    color: '#F5A623',
    fontSize: 14,
    fontWeight: '600',
  },
  paidIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7ED32120',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  paidText: {
    color: '#7ED321',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    gap: 16,
  },
  modalEmployeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalEmployeePhone: {
    fontSize: 14,
    color: '#8A9BAE',
  },
  salaryInfoModal: {
    backgroundColor: '#111a22',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  modalSalaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalSalaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalSalaryText: {
    fontSize: 13,
    color: '#8A9BAE',
  },
  modalSalaryAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  maxAdvanceRow: {
    borderTopWidth: 1,
    borderTopColor: '#2A3441',
    paddingTop: 8,
    marginTop: 4,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  advanceInput: {
    backgroundColor: '#111a22',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  descriptionInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2A3441',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8A9BAE',
    fontSize: 16,
    fontWeight: '600',
  },
  processButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  processButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Month Navigation
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },

  // Overdue Alert
  overdueAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D0021B20',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D0021B40',
  },
  overdueAlertText: {
    flex: 1,
    fontSize: 14,
    color: '#D0021B',
    fontWeight: '500',
  },

  // Details Button
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A3441',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  detailsButtonText: {
    color: '#8A9BAE',
    fontSize: 12,
    fontWeight: '500',
  },
})