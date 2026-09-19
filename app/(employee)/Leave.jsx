import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useContextData } from '../../context/EmployeeContext';
import { api, getApiErrorMessage, getToken } from '../../services/ApiService';
import { formatDay } from "../../utils/TimeUtils";
import { styles } from '../../styles/LeaveStyles';

// ─── Timezone-safe date helpers ──────────────────────────────────────────────
// toISOString() converts to UTC first, which causes a -5:30 shift in IST,
// making the selected day appear as the previous calendar day.
const formatLocalDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Parse a "YYYY-MM-DD" string into a local-midnight Date without UTC conversion
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
};
// ─────────────────────────────────────────────────────────────────────────────

function Leave() {
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLeave, setIsLeave] = useState(true);
  const [holidaysData, setHolidaysData] = useState([]);
  const [rawHolidays, setRawHolidays] = useState([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [leavePreview, setLeavePreview] = useState(null);
  const [isApplyingLeave, setIsApplyingLeave] = useState(false);
  const currentYear = new Date().getFullYear();
  const {employeeData, showToast} = useContextData();

// Correct helper: always get YYYY-MM-DD in *local timezone (IST)*
const formatDateForComparison = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); 
  // "en-CA" → gives YYYY-MM-DD format
};

  // Helper function to check if a date is a holiday
  const isHoliday = (dateStr) => {
    return rawHolidays.some(holiday => 
      formatDateForComparison(holiday.date) === dateStr
    );
  };

  // Helper function to get holidays between dates (inclusive)
  const getHolidaysBetweenDates = (startDateStr, endDateStr) => {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const holidaysInRange = [];
    
    const current = new Date(start);
    while (current <= end) {
      const currentDateStr = formatDateForComparison(current);
      const holiday = rawHolidays.find(h => 
        formatDateForComparison(h.date) === currentDateStr
      );
      if (holiday) {
        holidaysInRange.push({
          date: currentDateStr,
          name: holiday.description || holiday.name
        });
      }
      current.setDate(current.getDate() + 1);
    }
    
    return holidaysInRange;
  };

  // Calculate leave preview when dates change
  const calculateLeavePreview = (startDateStr, endDateStr) => {
    if (!startDateStr) {
      setLeavePreview(null);
      return;
    }

    // If no end date, treat as single day leave
    const effectiveEndDate = endDateStr || startDateStr;

    // Check if start date is a holiday
    const startIsHoliday = isHoliday(startDateStr);
    
    // For single day leave, check if it's a holiday
    if (startDateStr === effectiveEndDate && startIsHoliday) {
      setLeavePreview({
        error: true,
        message: "Selected date is a holiday. No leave application needed.",
        type: 'single_day_holiday'
      });
      return;
    }

    // For multi-day leave, check if start or end date is a holiday
    if (startDateStr !== effectiveEndDate) {
      const endIsHoliday = isHoliday(effectiveEndDate);
      if (startIsHoliday || endIsHoliday) {
        setLeavePreview({
          error: true,
          message: startIsHoliday 
            ? "Start date is a holiday. Please select a different date."
            : "End date is a holiday. Please select a different date.",
          type: 'boundary_holiday'
        });
        return;
      }
    }

    // Calculate total days
    const start = new Date(startDateStr);
    const end = new Date(effectiveEndDate);
    const totalCalendarDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Get holidays in between
    const holidaysInRange = getHolidaysBetweenDates(startDateStr, effectiveEndDate);
    const totalLeaveDays = totalCalendarDays - holidaysInRange.length;

    // All days are holidays
    if (totalLeaveDays <= 0) {
      setLeavePreview({
        error: true,
        message: "Selected period contains only holidays. No leave application needed.",
        holidaysExcluded: holidaysInRange,
        type: 'all_holidays'
      });
      return;
    }

    const currentLeaveBal = leaveBalance != null
      ? leaveBalance
      : (Number(employeeData?.leaveBalance) || 0);

    // Valid leave period (instant local estimate for responsive UX)
    setLeavePreview({
      error: false,
      totalCalendarDays,
      totalLeaveDays,
      holidaysExcluded: holidaysInRange,
      leaveBalance: currentLeaveBal,
      paidDays: Math.min(totalLeaveDays, currentLeaveBal),
      unpaidDays: Math.max(0, totalLeaveDays - currentLeaveBal),
      isSingleDay: startDateStr === effectiveEndDate
    });

    // M-10: Reconcile with the server-authoritative preview so the numbers the
    // user sees exactly match what the backend will apply (holiday exclusions,
    // paid/unpaid split, current leave balance). The local estimate above is a
    // fast placeholder; this overwrites it once the server responds.
    reconcileLeavePreviewWithServer(startDateStr, effectiveEndDate);
  };

  // Calls the backend /api/leaves/preview endpoint and maps its authoritative
  // result into the shape the UI already consumes. Silently ignores failures
  // (the local estimate remains shown) to avoid blocking the user.
  const reconcileLeavePreviewWithServer = async (startDateStr, endDateStr) => {
    try {
      const response = await api.post('/api/leaves/preview', {
        startDate: startDateStr,
        endDate: endDateStr,
      });
      const data = response.data;
      if (!data) return;

      if (data.valid === false) {
        setLeavePreview({
          error: true,
          message: data.reason || 'This leave period is not valid.',
          holidaysExcluded: data.holidaysExcluded || [],
          type: 'server_rejected',
        });
        return;
      }

      setLeavePreview({
        error: false,
        totalCalendarDays: data.totalCalendarDays,
        totalLeaveDays: data.totalWorkingDays,
        holidaysExcluded: data.holidaysExcluded || [],
        leaveBalance: data.leaveBalance,
        paidDays: data.paidDays,
        unpaidDays: data.unpaidDays,
        isSingleDay: data.isSingleDay,
      });
    } catch {
      // Keep the local estimate on network/preview failure.
    }
  };

  const fetchHolidays = useCallback(async () => {
    try {
      setIsLoadingHolidays(true);
      const response = await api.get('/api/holidays/getAll');
      
      // Store raw holidays for validation
      const allHolidays = [];
      if (Array.isArray(response.data)) {
        response.data.forEach(monthItem => {
          if (Array.isArray(monthItem?.holidays)) {
            monthItem.holidays.forEach(holiday => {
              allHolidays.push(holiday);
            });
          }
        });
      }
      setRawHolidays(allHolidays);
      
      // Transform the response to match the frontend format
      const transformedHolidays = Array.isArray(response.data) ? response.data.map(monthItem => ({
        month: `${monthItem.month} ${currentYear}`,
        holidays: Array.isArray(monthItem?.holidays) ? monthItem.holidays.map(holiday => ({
          date: new Date(holiday.date).getDate().toString().padStart(2, "0"),
          name: holiday.description
        })) : []
      })) : [];
      
      setHolidaysData(transformedHolidays);
    } catch (error) {
      showToast(getApiErrorMessage(error, "Failed to fetch holidays"), "Error");
      console.error('Error fetching holidays:', error);
      setHolidaysData([]);
      setRawHolidays([]);
    } finally {
      setIsLoadingHolidays(false);
    }
  }, [currentYear, showToast]);

  const fetchLeavesHistory = useCallback(async () => {
    try {
      const response = await api.get('/api/leaves/employee-leaves', {
        params: { year: currentYear },
      });
      setLeaveHistory(response.data?.leaves || []);
      if (response.data?.leaveBalance != null) {
        setLeaveBalance(Number(response.data.leaveBalance));
      }
    } catch (error) {
      showToast(getApiErrorMessage(error, "Failed to fetch leave history"), 'Error');
      console.error('Error fetching Leaves History:', error);
    }
  }, [currentYear, showToast]);

  useFocusEffect(
    useCallback(() => {
      fetchHolidays();
      fetchLeavesHistory();
    }, [fetchHolidays, fetchLeavesHistory])
  ); 

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchHolidays(), fetchLeavesHistory()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchHolidays, fetchLeavesHistory]); 

  // Recalculate preview when dates or the fetched leave balance change.
  // calculateLeavePreview is a pure computation derived from the values below;
  // intentionally excluded from deps to recompute only when these inputs change.
  useEffect(() => {
    if (startDate && rawHolidays.length > 0) {
      calculateLeavePreview(startDate, endDate);
    } else {
      setLeavePreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, rawHolidays, leaveBalance]);

  const applyLeave = async () => {
    if (!startDate) {
      showToast('Please select From Date', "Warning");
      return;
    }

    if (!description.trim()) {
      showToast('Please provide reason for leave', "Warning");
      return;
    }

    // Use startDate as endDate if endDate is not provided (single day leave)
    const effectiveEndDate = endDate || startDate;

    // Frontend validation before API call
    if (leavePreview?.error) {
      showToast(leavePreview.message, "Error");
      return;
    }

    // For valid leave preview, check if totalLeaveDays > 0
    if (leavePreview && leavePreview.totalLeaveDays <= 0) {
      showToast('Invalid leave period', "Error");
      return;
    }
    
    if (isApplyingLeave) return;
    setIsApplyingLeave(true);
    try {
      const token = await getToken();
      if (!token) {
        showToast('Session expired. Please log in again.', 'Error');
        return;
      }
      const response = await api.post('/api/leaves/apply', {
        reason: description,
        startDate: startDate,
        endDate: effectiveEndDate
      });
      
      if (response.data?.message) {
        setStartDate('');
        setEndDate('');
        setDescription('');
        setLeavePreview(null);
        setModalVisible(false);
        showToast(response.data.message || 'Leave application submitted successfully', "Success");
        fetchLeavesHistory();
      }
    } catch (error) {
      showToast(getApiErrorMessage(error, "Failed to apply leave"), "Error");
      console.error('Error Applying leave:', error);
    } finally {
      setIsApplyingLeave(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return '#00E676';
      case 'PENDING': return '#FF9800';
      case 'REJECTED': return '#FF5252';
      default: return '#888';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED': return 'check-circle';
      case 'PENDING': return 'clock-outline';
      case 'REJECTED': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const resetModal = () => {
    setStartDate('');
    setEndDate('');
    setDescription('');
    setLeavePreview(null);
    setModalVisible(false);
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    return startDate && description.trim() && (!leavePreview || !leavePreview.error);
  };

  const availableLeaves = Number(employeeData?.leaveBalance) || 0;
  const usedLeaves = Array.isArray(leaveHistory)
    ? leaveHistory.filter((i) => i?.status === "APPROVED" && i?.type === "PAID").reduce((acc, i) => acc + (Number(i?.totalDays) || 0), 0)
    : 0;
  const totalLeaves = availableLeaves + usedLeaves;
  const usedPercent = totalLeaves > 0 ? Math.min(100, Math.round((usedLeaves / totalLeaves) * 100)) : 0;

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A9EFF']}
            tintColor="#4A9EFF"
          />
        }
      >

        {/* Enhanced Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Leave Management</Text>
          <Text style={styles.headerSubtext}>Manage your time off efficiently</Text>
        </View>

        {/* Enhanced Leaves Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryIconContainer}>
            <MaterialCommunityIcons name="calendar-check" size={32} color="#1e90ff" />
          </View>
          <View style={styles.summaryContent}>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalLeaves}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{usedLeaves}</Text>
                <Text style={styles.statLabel}>Used</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{availableLeaves}</Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${usedPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>{usedPercent}% used</Text>
            </View>
          </View>
        </View>

        {/* Enhanced Apply Leave Button */}
        <TouchableOpacity 
          style={styles.applyButton} 
          onPress={() => {
            if(leaveHistory.filter((i)=>i.status === "PENDING").length > 0){
                showToast("You have a pending leave application. Please wait for it to be processed before applying for a new leave.", "Warning");
            }else {
              setModalVisible(true)
            }
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#fff" />
          <Text style={styles.applyButtonText}>Apply for Leave</Text>
        </TouchableOpacity>

        {/* Enhanced Toggle and Content */}
        <View style={styles.contentContainer}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={isLeave ? styles.selectedTab : styles.unselectedTab}
              onPress={() => setIsLeave(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons 
                name="history" 
                size={18} 
                color={isLeave ? '#ffffff' : '#8a9ba8'} 
              />
              <Text style={[styles.toggleText, { color: isLeave ? '#ffffff' : '#8a9ba8' }]}>
                Leave History
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={!isLeave ? styles.selectedTab : styles.unselectedTab}
              onPress={() => setIsLeave(false)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons 
                name="calendar-star" 
                size={18} 
                color={!isLeave ? '#ffffff' : '#8a9ba8'} 
              />
              <Text style={[styles.toggleText, { color: !isLeave ? '#ffffff' : '#8a9ba8' }]}>
                Holidays
              </Text>
            </TouchableOpacity>
          </View>

          {isLeave ? (
            <View style={styles.historyContainer}>
              {leaveHistory.length > 0 ?
              leaveHistory?.map((item) => (
                <View key={item.id} style={styles.leaveCard}>
                  <View style={styles.leaveCardHeader}>
                    <View style={styles.leaveCardLeft}>
                      <MaterialCommunityIcons 
                        name="calendar-outline" 
                        size={20} 
                        color="#1e90ff" 
                      />
                      <View>
                        {item.fromDate === item.toDate ? (
                          <Text style={styles.leaveDateText}>{formatDay(item?.fromDate)}</Text>
                        ) : (
                          <Text style={styles.leaveDateText}>
                            {formatDay(item.fromDate)} - {formatDay(item.toDate)}
                          </Text>
                        )}
                        <Text style={styles.leaveDaysText}>
                          {item.totalDays} day(s)
                        </Text>
                      </View>
                    </View>

                    {/* leave type */}
                    
                    {/* <View style={styles.leaveCardRight}>
                      <View style={[styles.leaveTypeBadge, { backgroundColor: getTypeColor(item.type) }]}>
                        <Text style={styles.leaveTypeText}>{item.type}</Text>
                      </View>
                    </View> */}
                  </View>
                  
                  <Text style={styles.leaveDescription}>{item.reason}</Text>
                  
                  <View style={styles.leaveCardFooter}>
                    <View style={styles.statusContainer}>
                      <MaterialCommunityIcons 
                        name={getStatusIcon(item.status)} 
                        size={16} 
                        color={getStatusColor(item.status)} 
                      />
                      <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            :
            (<View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="calendar-remove" size={48} color="#8a9ba8" />
                  <Text style={styles.emptyText}>No Leaves available</Text>
                </View>)
            }
            </View>
          ) : (
            <View style={styles.holidaysContainer}>
              {isLoadingHolidays ? (
                <View style={styles.loadingContainer}>
                  <MaterialCommunityIcons name="loading" size={32} color="#1e90ff" />
                  <Text style={styles.loadingText}>Loading holidays...</Text>
                </View>
              ) : holidaysData.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="calendar-remove" size={48} color="#8a9ba8" />
                  <Text style={styles.emptyText}>No holidays available</Text>
                </View>
              ) : (
                holidaysData.map((monthItem, index) => (
                  <View key={index} style={styles.holidayMonthCard}>
                    <Text style={styles.holidayMonthTitle}>{monthItem.month}</Text>
                    <View style={styles.holidayGrid}>
                      {monthItem.holidays.map((holiday, idx) => (
                        <View key={idx} style={styles.holidayCard}>
                          <View style={styles.holidayDateContainer}>
                            <Text style={styles.holidayDate}>{holiday.date}</Text>
                          </View>
                          <Text style={styles.holidayName}>{holiday.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Enhanced Apply Leave Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => resetModal()}
      >
        <View style={styles.modalBackground}>
           <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ width: '100%' }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
          <ScrollView contentContainerStyle={styles.modalScrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Apply for Leave</Text>
                <TouchableOpacity 
                  onPress={() => resetModal()}
                  style={styles.closeButton}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#8a9ba8" />
                </TouchableOpacity>
              </View>
              
             {/* Start Date Picker */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>From Date</Text>
                <TouchableOpacity
                  style={[
                    styles.dateInput,
                    startDate && isHoliday(startDate) && styles.errorInput
                  ]}
                  onPress={() => setShowStartPicker(true)}
                >
                  <MaterialCommunityIcons name="calendar-outline" size={20} color="#8a9ba8" />
                  <Text style={[styles.dateText, { color: startDate ? '#fff' : '#8a9ba8' }]}>
                    {startDate || 'Select start date'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showStartPicker && (
                <DateTimePicker
                  value={startDate ? parseLocalDate(startDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowStartPicker(false);
                    if (event.type === 'set' && selectedDate) {
                      setStartDate(formatLocalDate(selectedDate));
                    }
                  }}
                  minimumDate={new Date()}
                  maximumDate={endDate ? parseLocalDate(endDate) : undefined}
                />
              )}

              {/* End Date Picker */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>To Date (Optional for single day)</Text>
                <TouchableOpacity
                  style={[
                    styles.dateInput,
                    endDate && isHoliday(endDate) && styles.errorInput
                  ]}
                  onPress={() => setShowEndPicker(true)}
                >
                  <MaterialCommunityIcons name="calendar-outline" size={20} color="#8a9ba8" />
                  <Text style={[styles.dateText, { color: endDate ? '#fff' : '#8a9ba8' }]}>
                    {endDate || 'Select end date (optional)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showEndPicker && (
                <DateTimePicker
                  value={endDate ? parseLocalDate(endDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowEndPicker(false);
                    if (event.type === 'set' && selectedDate) {
                      setEndDate(formatLocalDate(selectedDate));
                    }
                  }}
                  minimumDate={startDate ? parseLocalDate(startDate) : new Date()}
                />
              )}
              {/* Leave Preview */}
              {leavePreview && (
                <View style={[
                  styles.previewContainer, 
                  leavePreview.error ? styles.errorPreview : styles.successPreview
                ]}>
                  <View style={styles.previewHeader}>
                    <MaterialCommunityIcons 
                      name={leavePreview.error ? "alert-circle" : "information"} 
                      size={20} 
                      color={leavePreview.error ? "#FF5252" : "#1e90ff"} 
                    />
                    <Text style={[
                      styles.previewTitle,
                      { color: leavePreview.error ? "#FF5252" : "#1e90ff" }
                    ]}>
                      {leavePreview.error ? "Invalid Leave Period" : `Leave Summary ${leavePreview.isSingleDay ? '(Single Day)' : ''}`}
                    </Text>
                  </View>
                  
                  {leavePreview.error ? (
                    <Text style={styles.errorMessage}>{leavePreview.message}</Text>
                  ) : (
                    <View style={styles.previewDetails}>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Total Calendar Days:</Text>
                        <Text style={styles.previewValue}>{leavePreview.totalCalendarDays}</Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Actual Leave Days:</Text>
                        <Text style={styles.previewValue}>{leavePreview.totalLeaveDays}</Text>
                      </View>
                      {leavePreview.holidaysExcluded.length > 0 && (
                        <View style={styles.previewRow}>
                          <Text style={styles.previewLabel}>Holidays Excluded:</Text>
                          <Text style={styles.previewValue}>{leavePreview.holidaysExcluded.length}</Text>
                        </View>
                      )}
                      <View style={styles.previewDivider} />
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Paid Leave Days:</Text>
                        <Text style={[styles.previewValue, { color: '#00E676' }]}>{leavePreview.paidDays}</Text>
                      </View>
                      {leavePreview.unpaidDays > 0 && (
                        <View style={styles.previewRow}>
                          <Text style={styles.previewLabel}>Unpaid Leave Days:</Text>
                          <Text style={[styles.previewValue, { color: '#FF9800' }]}>{leavePreview.unpaidDays}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {leavePreview.holidaysExcluded && leavePreview.holidaysExcluded.length > 0 && (
                    <View style={styles.holidaysList}>
                      <Text style={styles.holidaysListTitle}>Holidays in Period:</Text>
                      {leavePreview.holidaysExcluded.map((holiday, idx) => (
                        <Text key={idx} style={styles.holidayItem}>
                          • {holiday.date}: {holiday.name}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Description Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Reason for Leave</Text>
                <TextInput
                  style={styles.descriptionInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter the reason for your leave request..."
                  placeholderTextColor="#8a9ba8"
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Single Day Leave Note */}
              {/* <View style={styles.noteContainer}>
                <Text style={styles.noteLabel}>Note:</Text>
                <Text style={styles.noteText}>
                  Leave the "To Date" empty for single day leave application. The system will automatically treat it as a single day leave using the "From Date".
                </Text>
              </View> */}

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => resetModal()}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.submitButton,
                    (!isFormValid() || isApplyingLeave) && styles.disabledButton
                  ]} 
                  onPress={applyLeave}
                  disabled={!isFormValid() || isApplyingLeave}
                >
                  {isApplyingLeave ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="send-outline" size={18} color="#fff" />
                      <Text style={styles.submitButtonText}>Submit</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default Leave;
