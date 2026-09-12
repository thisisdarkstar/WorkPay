import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { url } from '../../../constants/EnvValue';
import { useContextData } from '../../../context/EmployeeContext';
import { getApiErrorMessage, getToken } from '../../../services/ApiService';
import {
  calculateTotalHours,
  calculateTotalOvertime,
  convertOvertime,
  countAbsentDays,
  countPresentDays,
  formatDay,
  formatTime,
  getTotalDaysInMonth
} from "../../../utils/TimeUtils";


const months = [
  { number: 1, name: "January" },
  { number: 2, name: "February" },
  { number: 3, name: "March" },
  { number: 4, name: "April" },
  { number: 5, name: "May" },
  { number: 6, name: "June" },
  { number: 7, name: "July" },
  { number: 8, name: "August" },
  { number: 9, name: "September" },
  { number: 10, name: "October" },
  { number: 11, name: "November" },
  { number: 12, name: "December" },
];

 const calculateMonthTotals = (transactions) => {
    if (!Array.isArray(transactions)) return { overtime: 0, deduction: 0, advance: 0 };
    const overtime = transactions.reduce((acc, it) => acc + (it?.payType === "OVERTIME" ? (Number(it?.amount) || 0) : 0), 0);
    const deduction = transactions.reduce((acc, it) => acc + (it?.payType === "DEDUCTION" ? (Number(it?.amount) || 0) : 0), 0);
    const advance = transactions.reduce((acc, it) => acc + (it?.payType === "ADVANCE" ? (Number(it?.amount) || 0) : 0), 0);
    
    return { overtime, deduction, advance };
  };

function EmployeeDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  // Get today's month/year
  const today = new Date();
  const thisMonth = today.getMonth() + 1;
  const thisYear = today.getFullYear();

  // States
  const [currentMonth, setCurrentMonth] = useState(thisMonth);
  const [currentYear, setCurrentYear] = useState(thisYear);
  const [selectedPaymentYear, setSelectedPaymentYear] = useState(thisYear);
  const [selectedLeaveYear, setSelectedLeaveYear] = useState(thisYear);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [leaveYearDropdownOpen, setLeaveYearDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance'); // attendance, payment, leave
  const [employee, setEmployee] = useState(null);
  const [attendanceData,setAttendanceData] = useState([]);
  const [leavesData,setLeavesData] = useState([]);
  const [paymentsData,setPaymentsData]=  useState(null);
    const {showToast} = useContextData();

    const fetchEmployeeDetails = async () => {
    try {
      const response = await axios.get(`${url}/api/employees/get/${id}`, {
        headers: {
          authorization: `Bearer ${await getToken()}`
        }
      });
      setEmployee(response.data.data);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to fetch employee details'),'Error');
    }
  }

    const fetchAttendanceData = async () => {
    try{
      const response = await axios.get(`${url}/api/attendances/getEmployeeAttendance?empId=${id}&month=${currentMonth}&year=${currentYear}`
        ,{
          headers: {
            Authorization: `Bearer ${await getToken()}`,
        }
      }
      );
      const data = response.data;
      setAttendanceData(data);
    }catch(error){
      showToast(getApiErrorMessage(error, 'Failed to fetch attendance data'),'Error');
    }
  };

  // Sample employee data - replace with API call
  useEffect(() => {
    fetchEmployeeDetails();
  }, [id]);

  useEffect(()=>{
 fetchAttendanceData()
  },[currentMonth,currentYear])


const fetchLeavesData = async ()=>{
  try{
      const response = await axios.get(`${url}/api/leaves/get/employee-leaves?empId=${id}&year=${selectedLeaveYear}`
        ,{
          headers: {
            Authorization: `Bearer ${await getToken()}`,
        }
      }
      );
      const data = response.data;
      setLeavesData(data)
    }catch(error){
      showToast(getApiErrorMessage(error, 'Failed to fetch leaves data'),'Error');
    }
}

useEffect(()=>{
  fetchLeavesData();
},[id,selectedLeaveYear])


const fetchPaymentsData = async ()=>{
    try{
      const response = await axios.get(`${url}/api/transactions/get/monthly-transactions?empId=${id}&year=${selectedPaymentYear}`
        ,{
          headers: {
            Authorization: `Bearer ${await getToken()}`,
        }
      }
      );
      const data = response.data;
      setPaymentsData(data)
    }catch(error){
      showToast(getApiErrorMessage(error, 'Failed to fetch payment history'),'Error');
    }
}

useEffect(()=>{
  fetchPaymentsData();
},[id,selectedPaymentYear])
  

  // Generate years for dropdown (current year and 4 previous years)
  const availableYears = Array.from({ length: 5 }, (_, i) => thisYear - i);


  // Handle month navigation
  const handlePrev = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNext = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isNextDisabled = currentMonth === thisMonth && currentYear === thisYear;

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT': return '#7ED321';
      case 'ABSENT': return '#D0021B';
      case 'LATE': return '#F5A623';
      case 'APPROVED': return '#7ED321';
      case 'PENDING': return '#F5A623';
      case 'REJECTED': return '#D0021B';
      case 'PAID': return '#7ED321';
      default: return '#8A9BAE';
    }
  };

  const renderAttendanceCard = ({ item }) => (
    <View style={styles.dataCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.dayText}>{formatDay(item.date)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.timeRow}>
          <View style={styles.timeItem}>
            <Feather name="log-in" size={16} color="#8A9BAE" />
            <Text style={styles.timeLabel}>Check In</Text>
            <Text style={styles.timeValue}>{formatTime(item.checkInTime)}</Text>
          </View>
          <View style={styles.timeItem}>
            <Feather name="log-out" size={16} color="#8A9BAE" />
            <Text style={styles.timeLabel}>Check Out</Text>
            <Text style={styles.timeValue}>{formatTime(item.checkOutTime)}</Text>
          </View>
        </View>
        
        <View style={styles.hoursRow}>
          <View style={styles.hoursItem}>
            <Text style={styles.hoursLabel}>Total Hours</Text>
            <Text style={styles.hoursValue}>{calculateTotalHours(item.checkInTime, item.checkOutTime)}</Text>
          </View>
          <View style={styles.hoursItem}>
            <Text style={styles.hoursLabel}>Overtime</Text>
            <Text style={[styles.hoursValue, { color: '#F5A623' }]}>{convertOvertime(item.overtime)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPaymentCard = ({ item }) => {
    const totals = calculateMonthTotals(item?.transactions || []);
    const baseSalary = Number(paymentsData?.baseSalary) || 0;
    const netSalary = baseSalary + totals.overtime - totals.deduction - totals.advance;
    const salaryTx = Array.isArray(item?.transactions) ? item.transactions.find(i => i?.payType === "SALARY") : null;

    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <Text style={styles.paymentMonth}>{item?.month} {paymentsData?.year || ''}</Text>
        </View>
        
        <View style={styles.paymentDetails}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Base Salary</Text>
            <Text style={styles.paymentAmount}>₹{baseSalary.toLocaleString()}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Overtime</Text>
            <Text style={[styles.paymentAmount, { color: '#7ED321' }]}>+ ₹{totals.overtime}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Deductions</Text>
            <Text style={[styles.paymentAmount, { color: '#D0021B' }]}>- ₹{totals.deduction}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Advance</Text>
            <Text style={[styles.paymentAmount, { color: '#D0021B' }]}>- ₹{totals.advance}</Text>
          </View>
          <View style={[styles.paymentRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Net Salary</Text>
            <Text style={styles.totalAmount}>₹{netSalary}</Text>
          </View>
          {salaryTx?.date && (
            <Text style={styles.paidDate}>Paid on: {salaryTx.date}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderLeaveCard = ({ item }) => (
    <View style={styles.leaveCard}>
      <View style={styles.leaveHeader}>
        <View style={styles.leaveDateContainer}>
          <MaterialCommunityIcons name="calendar-outline" size={20} color="#4A90E2" />
          <View style={styles.leaveDates}>
            {item.fromDate === item.toDate ? (
              <Text style={styles.leaveDate}>Leave On: {item.fromDate ? formatDay(item.fromDate) : ''} {item.fromDate?.split('-')[0] || ''}</Text>
            ) : (
              <View>
                <Text style={styles.leaveDate}>From: {item.fromDate ? formatDay(item.fromDate) : ''} {item.fromDate?.split('-')[0] || ''}</Text>
                <Text style={styles.leaveDate}>To: {item.toDate ? formatDay(item.toDate) : ''} {item.toDate?.split('-')[0] || ''}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.leaveStatus}>
          <View style={[styles.leaveTypeBadge, { backgroundColor: item.type === 'PAID' ? '#4A90E220' : '#F5A62320' }]}>
            <Text style={[styles.leaveTypeText, { color: item.type === 'PAID' ? '#4A90E2' : '#F5A623' }]}>
              {item.type}
            </Text>
          </View>
          <View style={[styles.leaveStatusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.leaveStatusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.leaveReason}>Reason: {item.reason || 'No reason provided'}</Text>
    </View>
  );

  if (!employee) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4da6ff" />
        <Text style={[styles.loadingText, { marginTop: 12 }]}>Loading employee details...</Text>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#192633" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Employee Info Card */}
      <View style={styles.employeeInfoCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{employee?.name ? employee.name.charAt(0).toUpperCase() : 'E'}</Text>
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{employee?.name || 'Employee'}</Text>
          <Text style={styles.employeePhone}>{employee?.phone || ''}</Text>
          {employee?.email ? <Text style={styles.employeePhone}>{employee.email}</Text> : null}
          <View style={styles.employeeMeta}>
            <Text style={styles.employeeJoinDate}>Joined: {employee?.joinedDate ? formatDay(employee.joinedDate):""} {employee?.joinedDate?.split('-')[0] || ''}</Text>
          </View>
          <View style={styles.salaryInfo}>
            <Text style={styles.salaryText}>Base: ₹{(Number(employee?.baseSalary) || 0).toLocaleString()}</Text>
            <Text style={styles.overtimeText}>OT: ₹{employee?.overtimeRate || 0}/hr</Text>
          </View>
          <Text style={{fontWeight:"bold",color:"white"}}>Account No: {employee?.accountNumber || 'N/A'}</Text>
          <Text style={{fontWeight:"bold",color:"white"}}>IFSC Code: {employee?.ifscCode || 'N/A'}</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'attendance' && styles.activeTab]}
          onPress={() => setActiveTab('attendance')}
        >
          <MaterialCommunityIcons 
            name="calendar-clock" 
            size={20} 
            color={activeTab === 'attendance' ? '#ffffff' : '#8A9BAE'} 
          />
          <Text style={[styles.tabText, activeTab === 'attendance' && styles.activeTabText]}>
            Attendance
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payment' && styles.activeTab]}
          onPress={() => setActiveTab('payment')}
        >
          <MaterialCommunityIcons 
            name="currency-inr" 
            size={20} 
            color={activeTab === 'payment' ? '#ffffff' : '#8A9BAE'} 
          />
          <Text style={[styles.tabText, activeTab === 'payment' && styles.activeTabText]}>
            Payments
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leave' && styles.activeTab]}
          onPress={() => setActiveTab('leave')}
        >
          <MaterialCommunityIcons 
            name="calendar-remove" 
            size={20} 
            color={activeTab === 'leave' ? '#ffffff' : '#8A9BAE'} 
          />
          <Text style={[styles.tabText, activeTab === 'leave' && styles.activeTabText]}>
            Leaves
          </Text>
        </TouchableOpacity>
      </View>

      {/* Month/Year Navigation (for attendance only) */}
      {activeTab === 'attendance' && (
        <View style={styles.monthContainer}>
          <TouchableOpacity onPress={handlePrev} style={styles.navButton}>
            <Feather name="chevron-left" size={24} color="white" />
          </TouchableOpacity>

          <Text style={styles.monthText}>
            {months.find((m) => m.number === currentMonth)?.name} {currentYear}
          </Text>

          <TouchableOpacity
            onPress={handleNext}
            disabled={isNextDisabled}
            style={[styles.navButton, isNextDisabled && { opacity: 0.4 }]}
          >
            <Feather name="chevron-right" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Year Selection (for payment only) */}
      {activeTab === 'payment' && (
        <View style={styles.yearContainer}>
          <Text style={styles.yearLabel}>Payment History</Text>
          <TouchableOpacity
            style={styles.yearDropdownButton}
            onPress={() => setYearDropdownOpen(!yearDropdownOpen)}
          >
            <Text style={styles.yearDropdownText}>{selectedPaymentYear}</Text>
            <MaterialCommunityIcons 
              name={yearDropdownOpen ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#fff" 
            />
          </TouchableOpacity>

          {yearDropdownOpen && (
            <View style={styles.yearDropdownList}>
              {availableYears.map(year => (
                <TouchableOpacity
                  key={year}
                  style={styles.yearDropdownItem}
                  onPress={() => {
                    setSelectedPaymentYear(year);
                    setYearDropdownOpen(false);
                  }}
                >
                  <Text style={styles.yearDropdownItemText}>{year}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Year Selection (for leave only) */}
      {activeTab === 'leave' && (
        <View style={styles.yearContainer}>
          <Text style={styles.yearLabel}>Leave History</Text>
          <TouchableOpacity
            style={styles.yearDropdownButton}
            onPress={() => setLeaveYearDropdownOpen(!leaveYearDropdownOpen)}
          >
            <Text style={styles.yearDropdownText}>{selectedLeaveYear}</Text>
            <MaterialCommunityIcons 
              name={leaveYearDropdownOpen ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#fff" 
            />
          </TouchableOpacity>

          {leaveYearDropdownOpen && (
            <View style={styles.yearDropdownList}>
              {availableYears.map(year => (
                <TouchableOpacity
                  key={year}
                  style={styles.yearDropdownItem}
                  onPress={() => {
                    setSelectedLeaveYear(year);
                    setLeaveYearDropdownOpen(false);
                  }}
                >
                  <Text style={styles.yearDropdownItemText}>{year}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Content based on active tab */}
      <View style={styles.contentContainer}>
        {activeTab === 'attendance' && (
          <FlatList
            data={attendanceData?.attendanceRecords || []}
            keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Monthly Summary</Text>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{getTotalDaysInMonth(currentMonth, currentYear)}</Text>
                    <Text style={styles.summaryLabel}>Working Days</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#7ED321' }]}>{countPresentDays(attendanceData?.attendanceRecords)}</Text>
                    <Text style={styles.summaryLabel}>Present</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#D0021B' }]}>{countAbsentDays(attendanceData?.attendanceRecords)}</Text>
                    <Text style={styles.summaryLabel}>Absent</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#F5A623' }]}>{calculateTotalOvertime(attendanceData?.attendanceRecords)}</Text>
                    <Text style={styles.summaryLabel}>Overtime</Text>
                  </View>
                </View>
              </View>
            }
            renderItem={renderAttendanceCard}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center' }}>
                <MaterialCommunityIcons name="calendar-clock" size={48} color="#486581" />
                <Text style={{ color: '#8A9BAE', fontSize: 16, marginTop: 12 }}>
                  No attendance records found for this month
                </Text>
              </View>
            }
          />
        )}

        {activeTab === 'payment' && (
          <FlatList
            data={paymentsData?.transactionsData || []}
            keyExtractor={(item,index) => item?.id?.toString() || index.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={renderPaymentCard}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Feather name="credit-card" size={48} color="#486581" />
                <Text style={{ color: '#8A9BAE', fontSize: 16, marginTop: 12 }}>
                  No payment history found for {selectedPaymentYear}
                </Text>
              </View>
            }
          />
        )}

        {activeTab === 'leave' && (
          <FlatList
            data={leavesData?.leaves || []}
            keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.leaveSummaryCard}>
                <Text style={styles.summaryTitle}>Leave Summary ({selectedLeaveYear})</Text>
                <View style={styles.leaveSummaryGrid}>
                  <View style={styles.leaveSummaryItem}>
                    <Text style={styles.summaryValue}>
                      {(Number(employee?.leaveBalance) || 0) + (Array.isArray(leavesData?.leaves) ? leavesData.leaves.filter((i)=>i?.status === "APPROVED" && i?.type === "PAID").reduce((acc,i)=>acc+(Number(i?.totalDays) || 0),0) : 0)}
                    </Text>
                    <Text style={styles.summaryLabel}>Total Allocated</Text>
                  </View>
                  <View style={styles.leaveSummaryItem}>
                    <Text style={[styles.summaryValue, { color: '#4A90E2' }]}>
                      {Array.isArray(leavesData?.leaves) ? leavesData.leaves.filter((i)=>i?.status === "APPROVED" && i?.type === "PAID").reduce((acc,i)=>acc+(Number(i?.totalDays) || 0),0) : 0}
                    </Text>
                    <Text style={styles.summaryLabel}>Used</Text>
                  </View>
                  <View style={styles.leaveSummaryItem}>
                    <Text style={[styles.summaryValue, { color: '#7ED321' }]}>{employee?.leaveBalance ?? 0}</Text>
                    <Text style={styles.summaryLabel}>Remaining</Text>
                  </View>
                </View>
              </View>
            }
            renderItem={renderLeaveCard}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Feather name="calendar" size={48} color="#486581" />
                <Text style={{ color: '#8A9BAE', fontSize: 16, marginTop: 12 }}>
                  No leave records found for {selectedLeaveYear}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  )
}

export default EmployeeDetails

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
  
  // Employee Info Card
  employeeInfoCard: {
    backgroundColor: '#192633',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf:"flex-start"
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  employeeInfo: {
    flex: 1,
    gap: 4,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  employeePhone: {
    fontSize: 14,
    color: '#8A9BAE',
  },
  employeeMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  employeeRole: {
    fontSize: 12,
    color: '#4A90E2',
    backgroundColor: '#4A90E220',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  employeeJoinDate: {
    fontSize: 12,
    color: '#8A9BAE',
  },
  salaryInfo: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  salaryText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  overtimeText: {
    fontSize: 14,
    color: '#F5A623',
    fontWeight: '500',
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#192633',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A9BAE',
  },
  activeTabText: {
    color: '#ffffff',
  },

  // Month Navigation
  monthContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Content Container
  contentContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },

  // Summary Cards
  summaryCard: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8A9BAE',
  },

  // Attendance Cards
  dataCard: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  timeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeLabel: {
    fontSize: 12,
    color: '#8A9BAE',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 'auto',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111a22',
    padding: 12,
    borderRadius: 8,
  },
  hoursItem: {
    alignItems: 'center',
    gap: 4,
  },
  hoursLabel: {
    fontSize: 12,
    color: '#8A9BAE',
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Payment Cards
  paymentCard: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentMonth: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentDetails: {
    gap: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#8A9BAE',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#2A3441',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7ED321',
  },
  paidDate: {
    fontSize: 12,
    color: '#8A9BAE',
    textAlign: 'right',
    marginTop: 8,
  },

  // Leave Cards
  leaveSummaryCard: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  leaveSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  leaveSummaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  leaveCard: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leaveDateContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  leaveDates: {
    flex: 1,
  },
  leaveDate: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  leaveStatus: {
    alignItems: 'flex-end',
    gap: 6,
  },
  leaveTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leaveTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  leaveStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leaveStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  leaveReason: {
    fontSize: 13,
    color: '#8A9BAE',
    marginTop: 4,
  },
  yearContainer: {
  marginHorizontal: 16,
  marginTop: 12,
  marginBottom: 4,
  backgroundColor: '#192633',
  borderRadius: 10,
  padding: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,
},
yearLabel: {
  color: '#8A9BAE',
  fontSize: 14,
  fontWeight: '600',
  marginBottom: 8,
},
yearDropdownButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#111a22',
  borderRadius: 8,
  paddingVertical: 10,
  paddingHorizontal: 16,
  marginBottom: 4,
  borderWidth: 1,
  borderColor: '#222c3a',
},
yearDropdownText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
},
yearDropdownList: {
  backgroundColor: '#111a22',
  borderRadius: 8,
  marginTop: 4,
  borderWidth: 1,
  borderColor: '#222c3a',
  overflow: 'hidden',
},
yearDropdownItem: {
  paddingVertical: 12,
  paddingHorizontal: 16,
},
yearDropdownItemText: {
  color: '#fff',
  fontSize: 15,
},
  
});