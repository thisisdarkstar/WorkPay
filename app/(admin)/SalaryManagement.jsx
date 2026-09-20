import Feather from '@expo/vector-icons/Feather'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useContextData } from "../../context/EmployeeContext"
import { useOfficeContextData } from "../../context/OfficeContext"
import { styles } from '../../styles/SalaryManagementStyles'
import { api, getApiErrorMessage } from "../../services/ApiService"

function AdminSalaryManagement() {
  const router = useRouter()
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  // States
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [advanceModalVisible, setAdvanceModalVisible] = useState(false)
  const [deductionModalVisible, setDeductionModalVisible] = useState(false)
  const [bonusModalVisible, setBonusModalVisible] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [advanceAmount, setAdvanceAmount] = useState(null)
  const [deductionAmount, setDeductionAmount] = useState(null)
  const [deductionDescription, setDeductionDescription] = useState(null)
  const [bonusAmount, setBonusAmount] = useState(null)
  const [bonusDescription, setBonusDescription] = useState(null)
  const [processingAdvance, setProcessingAdvance] = useState(false)
  const [processingDeduction, setProcessingDeduction] = useState(false)
  const [processingBonus, setProcessingBonus] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [paymentData,setPaymentData] = useState([]);
  const {showToast} = useContextData();
  const {officeData, refreshOffices} = useOfficeContextData();
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');


   const fetchPaymentHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/transactions/monthly-transactions', {
        params: { year: selectedYear, month: selectedMonth },
      });
      const data = response.data;
      setPaymentData(Array.isArray(data?.payments) ? data.payments : []);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to fetch payment history'),'Error');
      console.log(err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, showToast]);

  // Sample data - replace with API calls
  useFocusEffect(
    useCallback(() => {
      fetchPaymentHistory();
      refreshOffices();
    }, [fetchPaymentHistory, refreshOffices])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPaymentHistory();
    } finally {
      setRefreshing(false);
    }
  }, [fetchPaymentHistory]);


    const calculateMonthTotals = (transactions) => {
    if (!Array.isArray(transactions)) return { overtime: 0, deduction: 0, advance: 0, bonus: 0 };
    const overtime = transactions.reduce((acc, it) => acc + (it?.payType === "OVERTIME" ? (Number(it?.amount) || 0) : 0), 0);
    const deduction = transactions.reduce((acc, it) => acc + (it?.payType === "DEDUCTION" ? (Number(it?.amount) || 0) : 0), 0);
    const advance = transactions.reduce((acc, it) => acc + (it?.payType === "ADVANCE" ? (Number(it?.amount) || 0) : 0), 0);
    const bonus = transactions.reduce((acc, it) => acc + (it?.payType === "BONUS" ? (Number(it?.amount) || 0) : 0), 0);
    
    return { overtime, deduction, advance, bonus };
  };


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

  // Settle / revert salary confirmation modal state
  const [salaryConfirmVisible, setSalaryConfirmVisible] = useState(false);
  const [salaryConfirmMode, setSalaryConfirmMode] = useState('settle'); // 'settle' | 'revert'
  const [salaryConfirmEmployee, setSalaryConfirmEmployee] = useState(null);
  const [processingSalary, setProcessingSalary] = useState(false);

  // Opens the confirmation modal before settling salary (prevents accidental clicks).
  const promptSettleSalary = (employee) => {
    const targetEmpId = Number(employee?.empId || employee?.id);
    if (!targetEmpId) {
      showToast('Employee information is missing', 'Error');
      return;
    }
    setSalaryConfirmEmployee(employee);
    setSalaryConfirmMode('settle');
    setSalaryConfirmVisible(true);
  };

  // Opens the confirmation modal before reverting a settled salary.
  const promptRevertSalary = (employee) => {
    const targetEmpId = Number(employee?.empId || employee?.id);
    if (!targetEmpId) {
      showToast('Employee information is missing', 'Error');
      return;
    }
    setSalaryConfirmEmployee(employee);
    setSalaryConfirmMode('revert');
    setSalaryConfirmVisible(true);
  };

  // Runs the confirmed action (settle or revert).
  const confirmSalaryAction = async () => {
    if (!salaryConfirmEmployee || processingSalary) return;
    if (salaryConfirmMode === 'settle') {
      await handleSettleSalary(salaryConfirmEmployee);
    } else {
      await handleRevertSalary(salaryConfirmEmployee);
    }
  };

  const handleSettleSalary = async (employee) => {
    const targetEmpId = Number(employee?.empId || employee?.id);
    if (!targetEmpId) {
      showToast('Employee information is missing', 'Error');
      return;
    }
    setSelectedEmployee(employee);
    const totals = calculateMonthTotals(employee.transactions);
    const finalAmount = Number(employee.baseSalary || 0) + totals.overtime + totals.bonus - totals.deduction - totals.advance;
    try {
      setProcessingSalary(true);
      const response = await api.post('/api/transactions/add-transaction', 
        {
          empId: targetEmpId,
          amount: finalAmount,
          description: `Salary payment for ${employee.name} of amount ₹${finalAmount.toLocaleString()}`,
          type: "SALARY",
          month: selectedMonth,
          year: selectedYear
        }
      );
      const data = response.data;
      showToast(data.message || 'Salary settled successfully', "Success");
      setSalaryConfirmVisible(false);
      setSalaryConfirmEmployee(null);
      fetchPaymentHistory();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to settle salary'), "Error");
    } finally {
      setProcessingSalary(false);
    }
  };

  // Reverts an accidentally-settled salary by deleting the SALARY transaction.
  const handleRevertSalary = async (employee) => {
    const targetEmpId = Number(employee?.empId || employee?.id);
    if (!targetEmpId) {
      showToast('Employee information is missing', 'Error');
      return;
    }
    try {
      setProcessingSalary(true);
      const response = await api.post('/api/transactions/revert-salary', {
        empId: targetEmpId,
        month: selectedMonth,
        year: selectedYear,
      });
      showToast(response.data?.message || 'Salary settlement reverted', "Success");
      setSalaryConfirmVisible(false);
      setSalaryConfirmEmployee(null);
      fetchPaymentHistory();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to revert salary'), "Error");
    } finally {
      setProcessingSalary(false);
    }
  };

  const handleAdvancePayment = (employee) => {
    setSelectedEmployee(employee);
    setAdvanceAmount(null);
    setAdvanceModalVisible(true);
  };

  const handleDeductionPayment = (employee) => {
    setSelectedEmployee(employee);
    setDeductionAmount(null);
    setDeductionDescription(null);
    setDeductionModalVisible(true);
  };

  const handleBonusPayment = (employee) => {
    setSelectedEmployee(employee);
    setBonusAmount(null);
    setBonusDescription(null);
    setBonusModalVisible(true);
  };

  const processAdvancePayment = async () => {
    const targetEmpId = Number(selectedEmployee?.empId || selectedEmployee?.id);
    if (!targetEmpId) {
      showToast('Employee information is missing', 'Error');
      return;
    }
    const totals = calculateMonthTotals(selectedEmployee?.transactions);
    const maxAdvance = Number(selectedEmployee?.baseSalary || 0) + totals.overtime + totals.bonus - totals.deduction - totals.advance;
    if (Number(advanceAmount) > maxAdvance) {
      showToast(`Advance amount cannot exceed ₹${maxAdvance.toLocaleString()}`, 'Error');
      return;
    }
    try {
      setProcessingAdvance(true);
      const response = await api.post('/api/transactions/add-transaction', 
        {
          empId: targetEmpId,
          amount: advanceAmount,
          description: `Advance payment for ${selectedEmployee?.name || 'Employee'} of amount ${advanceAmount}`,
          type: "ADVANCE",
          month: selectedMonth,
          year: selectedYear
        }
      );
      const data = response.data;
      if (data.message) {
        showToast(data.message, "Success");
        fetchPaymentHistory();
        setAdvanceAmount(null);
        setAdvanceModalVisible(false);
      }
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to process advance payment'), "Error");
      console.log(err);
    } finally {
      setProcessingAdvance(false);
    }
  };

  const processBonusPayment = async () => {
    const targetEmpId = Number(selectedEmployee?.empId || selectedEmployee?.id);
    if (!targetEmpId) {
      showToast('Employee information is missing', 'Error');
      return;
    }
    if (!bonusAmount || isNaN(Number(bonusAmount)) || Number(bonusAmount) <= 0) {
      showToast('Please enter a valid bonus amount', 'Warning');
      return;
    }
    try {
      setProcessingBonus(true);
      const response = await api.post('/api/transactions/add-transaction',
        {
          empId: targetEmpId,
          amount: Number(bonusAmount),
          description: bonusDescription?.trim() ? bonusDescription.trim() : `Bonus payment for ${selectedEmployee?.name || 'Employee'}`,
          type: "BONUS",
          month: selectedMonth,
          year: selectedYear
        }
      );
      const data = response.data;
      if (data.message) {
        showToast(data.message, "Success");
        fetchPaymentHistory();
        setBonusAmount(null);
        setBonusDescription(null);
        setBonusModalVisible(false);
      }
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to process bonus'), "Error");
      console.log(err);
    } finally {
      setProcessingBonus(false);
    }
  };

  const processDeductionTransaction = async () => {
    const targetEmpId = Number(selectedEmployee?.empId || selectedEmployee?.id);
    if (!targetEmpId) {
      showToast('Employee information is missing', 'Error');
      return;
    }
    if(!deductionAmount || !deductionDescription) {
      showToast('Please fill all fields', 'Error');
      return;
    }

    try {
      setProcessingDeduction(true);
      const response = await api.post('/api/transactions/add-transaction', 
        {
          empId: targetEmpId,
          amount: deductionAmount,
          description: deductionDescription,
          type: "DEDUCTION",
          month: selectedMonth,
          year: selectedYear
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
    const isPaid = item?.isPaid !== undefined 
      ? !!item.isPaid 
      : (Array.isArray(item?.transactions) && item.transactions.some(i => i?.payType === "SALARY"));

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
              <Text style={styles.employeePhone}>{item?.phone || ''}</Text>
              {item?.officeName && (
                <View style={styles.officeBadge}>
                  <Feather name="map-pin" size={10} color="#4A9EFF" />
                  <Text style={styles.officeBadgeText}>{item.officeName}</Text>
                </View>
              )}
              {item?.joinedDate && (
                <View style={[styles.officeBadge, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}>
                  <Feather name="calendar" size={10} color="#8A9BAE" />
                  <Text style={[styles.officeBadgeText, { color: '#8A9BAE' }]}>Joined: {item.joinedDate}</Text>
                </View>
              )}
            </View>
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
            <Text style={styles.salaryLabel}>Bonus</Text>
            <Text style={[styles.salaryAmount, { color: '#10B981' }]}>
              + ₹{totals.bonus}
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
            <Text style={styles.finalSalaryAmount}>₹{base + totals.overtime + totals.bonus - totals.deduction - totals.advance}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Settle Salary button - available when not yet paid */}
          {!isPaid && (
            <TouchableOpacity
              style={styles.settleButton}
              onPress={() => promptSettleSalary(item)}
            >
              <MaterialCommunityIcons name="check-circle" size={16} color="#fff" />
              <Text style={styles.settleButtonText}>Settle Salary</Text>
            </TouchableOpacity>
          )}
          
          {/* Advance, Deduction & Bonus - In the same row */}
          {!isPaid && (
            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity
                style={styles.advanceButton}
                onPress={() => handleAdvancePayment(item)}
              >
                <MaterialCommunityIcons name="cash" size={14} color="#4A90E2" />
                <Text style={styles.advanceButtonText}>Advance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deductionButton}
                onPress={() => handleDeductionPayment(item)}
              >
                <MaterialCommunityIcons name="minus-circle" size={14} color="#F5A623" />
                <Text style={styles.deductionButtonText}>Deduction</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bonusButton}
                onPress={() => handleBonusPayment(item)}
              >
                <MaterialCommunityIcons name="gift" size={14} color="#10B981" />
                <Text style={styles.bonusButtonText}>Bonus</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Paid Status Indicator + Revert option (stacked, full width) */}
          {isPaid && (
            <View style={confirmStyles.paidColumn}>
              <View style={styles.paidIndicator}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#7ED321" />
                <Text style={styles.paidText}>Salary Paid</Text>
              </View>
              <TouchableOpacity
                style={confirmStyles.revertButton}
                onPress={() => promptRevertSalary(item)}
              >
                <MaterialCommunityIcons name="undo-variant" size={18} color="#F5A623" />
                <Text style={confirmStyles.revertButtonText}>Revert Salary</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
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

      {/* Branch / Office Filter Chips */}
      {Array.isArray(officeData) && officeData.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
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

      {/* Sticky search bar (stays fixed above the scrolling list) */}
      <View style={searchStyles.stickyContainer}>
        <View style={searchStyles.wrapper}>
          <Feather name="search" size={18} color="#8A9BAE" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by name or phone..."
            placeholderTextColor="#8A9BAE"
            style={searchStyles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={18} color="#8A9BAE" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Employee List */}
      <FlatList
        style={{ flex: 1 }}
        data={
          Array.isArray(paymentData)
            ? paymentData.filter(item => {
                // Office filter
                if (selectedOfficeFilter && selectedOfficeFilter !== 'ALL' && selectedOfficeFilter !== 'all') {
                  if (item.officeId !== Number(selectedOfficeFilter)) return false;
                }
                // Search filter (name or phone)
                const q = searchQuery.trim().toLowerCase();
                if (q) {
                  const name = (item?.name || '').toLowerCase();
                  const phone = (item?.phone || '').toString();
                  if (!name.includes(q) && !phone.includes(q)) return false;
                }
                return true;
              })
            : []
        }
        keyExtractor={(item) => item?.empId?.toString() || item?.id?.toString() || Math.random().toString()}
        contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A9EFF']}
            tintColor="#4A9EFF"
          />
        }
        renderItem={renderEmployeeCard}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <MaterialIcons name="payments" size={48} color="#486581" />
            <Text style={{ color: '#8A9BAE', fontSize: 16, marginTop: 12 }}>
              {searchQuery.trim()
                ? `No employees match "${searchQuery.trim()}"`
                : `No salary records found for ${getSelectedMonthName()} ${selectedYear}`}
            </Text>
          </View>
        }
      />

      {/* Salary Settle / Revert Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={salaryConfirmVisible}
        onRequestClose={() => !processingSalary && setSalaryConfirmVisible(false)}
      >
        <View style={confirmStyles.overlay}>
          <View style={confirmStyles.card}>
            <View
              style={[
                confirmStyles.iconCircle,
                { backgroundColor: salaryConfirmMode === 'settle' ? 'rgba(126,211,33,0.12)' : 'rgba(245,166,35,0.12)' },
              ]}
            >
              <MaterialCommunityIcons
                name={salaryConfirmMode === 'settle' ? 'check-decagram' : 'undo-variant'}
                size={30}
                color={salaryConfirmMode === 'settle' ? '#7ED321' : '#F5A623'}
              />
            </View>

            <Text style={confirmStyles.title}>
              {salaryConfirmMode === 'settle' ? 'Settle Salary?' : 'Revert Salary?'}
            </Text>

            <Text style={confirmStyles.message}>
              {salaryConfirmMode === 'settle' ? (
                <>
                  Settle salary for{' '}
                  <Text style={confirmStyles.highlight}>{salaryConfirmEmployee?.name || 'this employee'}</Text>
                  {' '}for {getSelectedMonthName()} {selectedYear}?{'\n'}
                  Final payout:{' '}
                  <Text style={confirmStyles.highlight}>
                    ₹{(() => {
                      const t = calculateMonthTotals(salaryConfirmEmployee?.transactions);
                      const b = Number(salaryConfirmEmployee?.baseSalary || 0);
                      return (b + t.overtime + t.bonus - t.deduction - t.advance).toLocaleString();
                    })()}
                  </Text>
                </>
              ) : (
                <>
                  This will undo the salary settlement for{' '}
                  <Text style={confirmStyles.highlight}>{salaryConfirmEmployee?.name || 'this employee'}</Text>
                  {' '}for {getSelectedMonthName()} {selectedYear}. Other transactions (advance, deduction, bonus, overtime) are not affected.
                </>
              )}
            </Text>

            <View style={confirmStyles.buttonRow}>
              <TouchableOpacity
                style={confirmStyles.cancelButton}
                onPress={() => setSalaryConfirmVisible(false)}
                disabled={processingSalary}
              >
                <Text style={confirmStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  confirmStyles.confirmButton,
                  { backgroundColor: salaryConfirmMode === 'settle' ? '#2E7D32' : '#B7791F' },
                  processingSalary && { opacity: 0.6 },
                ]}
                onPress={confirmSalaryAction}
                disabled={processingSalary}
              >
                {processingSalary ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={confirmStyles.confirmText}>
                    {salaryConfirmMode === 'settle' ? 'Settle' : 'Revert'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                    <Text style={styles.modalSalaryText}>Bonus:</Text>
                    <Text style={[styles.modalSalaryAmount, { color: '#10B981' }]}>
                      + ₹{calculateMonthTotals(selectedEmployee.transactions).bonus.toLocaleString()}
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
                      ₹{(Number(selectedEmployee.baseSalary || 0) +
                         calculateMonthTotals(selectedEmployee.transactions).overtime +
                         calculateMonthTotals(selectedEmployee.transactions).bonus
                         - calculateMonthTotals(selectedEmployee.transactions).deduction
                         - calculateMonthTotals(selectedEmployee.transactions).advance
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
                    <Text style={styles.modalSalaryText}>Bonus:</Text>
                    <Text style={[styles.modalSalaryAmount, { color: '#10B981' }]}>
                      + ₹{calculateMonthTotals(selectedEmployee.transactions).bonus.toLocaleString()}
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
                      ₹{(Number(selectedEmployee.baseSalary || 0) +
                         calculateMonthTotals(selectedEmployee.transactions).overtime +
                         calculateMonthTotals(selectedEmployee.transactions).bonus
                         - calculateMonthTotals(selectedEmployee.transactions).deduction
                         - calculateMonthTotals(selectedEmployee.transactions).advance
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

      {/* Bonus Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={bonusModalVisible}
        onRequestClose={() => setBonusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Bonus</Text>
              <TouchableOpacity
                onPress={() => setBonusModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#8A9BAE" />
              </TouchableOpacity>
            </View>
            
            {selectedEmployee && (
              <View style={styles.modalBody}>
                <Text style={styles.modalEmployeeName}>{selectedEmployee.name}</Text>
                <Text style={styles.modalEmployeePhone}>{selectedEmployee.phone}</Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Bonus Amount</Text>
                  <TextInput
                    style={styles.advanceInput}
                    placeholder="Enter bonus amount"
                    placeholderTextColor="#8A9BAE"
                    value={bonusAmount}
                    onChangeText={setBonusAmount}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description / Reason (Optional)</Text>
                  <TextInput
                    style={[styles.advanceInput, styles.descriptionInput]}
                    placeholder="e.g. Festival bonus, Performance incentive"
                    placeholderTextColor="#8A9BAE"
                    value={bonusDescription}
                    onChangeText={setBonusDescription}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setBonusModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.processButton, { backgroundColor: '#10B981' }, processingBonus && styles.disabledButton]}
                    onPress={processBonusPayment}
                    disabled={processingBonus}
                  >
                    {processingBonus ? (
                      <Text style={styles.processButtonText}>Processing...</Text>
                    ) : (
                      <>
                        <MaterialCommunityIcons name="gift" size={16} color="#fff" />
                        <Text style={styles.processButtonText}>Add Bonus</Text>
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

// Search bar styles (shared visual style used across list screens).
const searchStyles = StyleSheet.create({
  stickyContainer: {
    backgroundColor: '#111a22',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441',
    // Elevation/shadow so it reads as a layer floating above the scroll content.
    zIndex: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#192633',
    borderWidth: 1,
    borderColor: '#2A3441',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    padding: 0,
  },
});

// Local styles for the settle/revert confirmation modal and the paid-row layout.
const confirmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
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
  },
  highlight: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  cancelText: {
    color: '#8A9BAE',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  paidColumn: {
    width: '100%',
    gap: 8,
  },
  revertButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    backgroundColor: 'rgba(245,166,35,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.5)',
  },
  revertButtonText: {
    color: '#F5A623',
    fontSize: 15,
    fontWeight: '700',
  },
});

