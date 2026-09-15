import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { url } from '../../constants/EnvValue';
import { useContextData } from '../../context/EmployeeContext';
import { getApiErrorMessage, getToken } from '../../services/ApiService';
import { formatDay } from "../../utils/TimeUtils";

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
  const [modalVisible, setModalVisible] = useState(false);
  const [isLeave, setIsLeave] = useState(true);
  const [holidaysData, setHolidaysData] = useState([]);
  const [rawHolidays, setRawHolidays] = useState([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [leavePreview, setLeavePreview] = useState(null);
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

    const currentLeaveBal = Number(employeeData?.leaveBalance) || 0;

    // Valid leave period
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
  };

  const fetchHolidays = async () => {
    try {
      setIsLoadingHolidays(true);
      const token = await getToken();
      if (!token) return;
      const response = await axios.get(`${url}/api/holidays/getAll`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      
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
  };

  const fetchLeavesHistory = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const response = await axios.get(`${url}/api/leaves/employee-leaves?year=${currentYear}`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      setLeaveHistory(response.data?.leaves || []);
    } catch (error) {
      showToast(getApiErrorMessage(error, "Failed to fetch leave history"), 'Error');
      console.error('Error fetching Leaves History:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHolidays();
      fetchLeavesHistory();
    }, [currentYear])
  ); 

  // Recalculate preview when dates change
  useEffect(() => {
    if (startDate && rawHolidays.length > 0) {
      calculateLeavePreview(startDate, endDate);
    } else {
      setLeavePreview(null);
    }
  }, [startDate, endDate, rawHolidays]);

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
    
    try {
      const token = await getToken();
      if (!token) {
        showToast('Session expired. Please log in again.', 'Error');
        return;
      }
      const response = await axios.post(`${url}/api/leaves/apply`, {
        reason: description,
        startDate: startDate,
        endDate: effectiveEndDate
      }, {
        headers: {
          authorization: `Bearer ${token}`,
        }
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

  const getTypeColor = (type) => {
    return type === 'PAID' ? '#1e90ff' : '#ff6b35';
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
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

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
                    !isFormValid() && styles.disabledButton
                  ]} 
                  onPress={applyLeave}
                  disabled={!isFormValid()}
                >
                  <MaterialCommunityIcons name="send-outline" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit</Text>
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

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  container: {
    padding: 20,
    paddingBottom: 30,
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtext: {
    fontSize: 14,
    color: '#8a9ba8',
    fontWeight: '400',
  },
  summaryContainer: {
    backgroundColor: '#192633',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
  },
  summaryIconContainer: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  summaryContent: {
    gap: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#8a9ba8',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(138, 155, 168, 0.3)',
  },
  progressBarContainer: {
    gap: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1e90ff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#8a9ba8',
    textAlign: 'center',
    fontWeight: '500',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e90ff',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 8,
    shadowColor: '#1e90ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  applyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  contentContainer: {
    flex: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#192633',
    borderRadius: 16,
    padding: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a3441',
  },
  selectedTab: {
    flex: 1,
    backgroundColor: '#1e90ff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#1e90ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  unselectedTab: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  historyContainer: {
    gap: 12,
  },
  leaveCard: {
    backgroundColor: '#192633',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a3441',
  },
  leaveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leaveCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  leaveCardRight: {
    alignItems: 'flex-end',
  },
  leaveDateText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  leaveDaysText: {
    color: '#8a9ba8',
    fontSize: 12,
    fontWeight: '500',
  },
  leaveDescription: {
    color: '#b8c5d1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  leaveCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  leaveTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  leaveTypeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  holidaysContainer: {
    gap: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: '#8a9ba8',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: '#8a9ba8',
    fontSize: 16,
    fontWeight: '500',
  },
  holidayMonthCard: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a3441',
  },
  holidayMonthTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  holidayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  holidayCard: {
    width: '48%',
    backgroundColor: 'rgba(30, 144, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
  },
  holidayDateContainer: {
    backgroundColor: '#1e90ff',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  holidayDate: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  holidayName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(15, 20, 25, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#1a2332',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2a3441',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1419',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2a3441',
    gap: 12,
  },
  errorInput: {
    borderColor: '#FF5252',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
  },
  dateText: {
    fontSize: 15,
    flex: 1,
  },
  descriptionInput: {
    backgroundColor: '#0f1419',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2a3441',
    color: '#ffffff',
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  previewContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    width:"100%"
  },
  successPreview: {
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    borderColor: 'rgba(30, 144, 255, 0.3)',
  },
  errorPreview: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  errorMessage: {
    color: '#FF5252',
    fontSize: 14,
    lineHeight: 20,
  },
  previewDetails: {
    gap: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    color: '#8a9ba8',
    fontSize: 14,
    fontWeight: '500',
  },
  previewValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  previewDivider: {
    height: 1,
    backgroundColor: 'rgba(138, 155, 168, 0.3)',
    marginVertical: 8,
  },
  holidaysList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(138, 155, 168, 0.2)',
  },
  holidaysListTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  holidayItem: {
    color: '#8a9ba8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  noteContainer: {
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    borderColor: 'rgba(30, 144, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  noteLabel: {
    color: '#60A5FA',
    fontWeight: '600',
    marginBottom: 6,
    fontSize: 14,
  },
  noteText: {
    color: '#60A5FA',
    fontSize: 13,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#8a9ba8',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#1e90ff',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#1e90ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#4a5568',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});