import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { api, getApiErrorMessage } from '../../services/ApiService';
import { useContextData } from '../../context/EmployeeContext';
import { useOfficeContextData } from '../../context/OfficeContext';
import {
  calculateTotalHours,
  convertOvertime,
  formatDay,
  formatTime,
} from '../../utils/TimeUtils';

const monthsList = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper: Format Date object to YYYY-MM-DD
const toISODate = (d) => {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Format Date to human friendly string
const formatDisplayDate = (d) => {
  if (!d) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Quick Date Range helpers
const getToday = () => new Date();
const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
};
const getWeekStart = () => {
  const d = new Date();
  const day = d.getDay(); // 0 is Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

export default function History() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useContextData();
  const { officeData, refreshOffices } = useOfficeContextData();

  // Active Segment: 'attendance' or 'leave'
  const [activeSegment, setActiveSegment] = useState(
    params.tab === 'leave' ? 'leave' : 'attendance'
  );

  // Common filters
  const [selectedOffice, setSelectedOffice] = useState(params.officeId || 'all');
  const [showOfficePicker, setShowOfficePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ---------------- Attendance Filters ----------------
  // 'today' | 'yesterday' | 'week' | 'month' | 'single' | 'range'
  const [dateMode, setDateMode] = useState('today');
  const [singleDate, setSingleDate] = useState(getToday());
  const [startDate, setStartDate] = useState(getWeekStart());
  const [endDate, setEndDate] = useState(getToday());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceStatus, setAttendanceStatus] = useState(params.status || 'ALL');

  // ---------------- Leave Filters ----------------
  const [leaveStatus, setLeaveStatus] = useState('ALL');
  const [leaveType, setLeaveType] = useState('ALL');
  const [leaveYear, setLeaveYear] = useState(new Date().getFullYear());

  // Picker modals
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('single'); // 'single', 'start', 'end'

  // Data states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [processingLeaveId, setProcessingLeaveId] = useState(null);

  // Leave action modal
  const [leaveActionModal, setLeaveActionModal] = useState({
    visible: false,
    leave: null,
    action: null, // 'APPROVED' or 'REJECTED'
  });

  // Load Offices
  useEffect(() => {
    refreshOffices();
  }, [refreshOffices]);

  // Sync params if passed when navigating
  useEffect(() => {
    if (params.tab === 'leave') setActiveSegment('leave');
    if (params.status) setAttendanceStatus(params.status);
    if (params.officeId) setSelectedOffice(params.officeId);
  }, [params.tab, params.status, params.officeId]);

  // ---------------- FETCH ATTENDANCE HISTORY ----------------
  const fetchAttendanceHistory = useCallback(async () => {
    try {
      setLoading(true);

      let queryParams = {
        officeId: selectedOffice !== 'all' ? selectedOffice : undefined,
        status: attendanceStatus !== 'ALL' ? attendanceStatus : undefined,
        search: searchQuery.trim() || undefined,
      };

      if (dateMode === 'today') {
        queryParams.date = toISODate(getToday());
      } else if (dateMode === 'yesterday') {
        queryParams.date = toISODate(getYesterday());
      } else if (dateMode === 'single') {
        queryParams.date = toISODate(singleDate);
      } else if (dateMode === 'week') {
        queryParams.startDate = toISODate(startDate);
        queryParams.endDate = toISODate(endDate);
      } else if (dateMode === 'range') {
        queryParams.startDate = toISODate(startDate);
        queryParams.endDate = toISODate(endDate);
      } else if (dateMode === 'month') {
        queryParams.month = selectedMonth;
        queryParams.year = selectedYear;
      }

      // 1. Primary: Call dedicated backend history endpoint (live on Vercel)
      try {
        const response = await api.get('/api/attendances/history', { params: queryParams });
        if (response.data && Array.isArray(response.data.records)) {
          let recs = response.data.records;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            recs = recs.filter(
              (r) =>
                (r.employee?.name || '').toLowerCase().includes(q) ||
                (r.employee?.phone || '').includes(q)
            );
          }
          setAttendanceRecords(recs);
          return;
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          throw err;
        }
      }

      // 2. Fallback: Aggregation of live endpoints
      const isTargetToday =
        dateMode === 'today' ||
        (dateMode === 'single' && toISODate(singleDate) === toISODate(getToday()));

      if (isTargetToday) {
        const officeTarget = selectedOffice || 'all';
        const res = await api.get(`/api/attendances/getTodayAttendance/${officeTarget}`);
        const todayData = res.data;

        let aggregated = [];
        const statuses = ['PRESENT', 'LATE', 'ABSENT', 'LEAVE'];
        const fetchPromises = statuses.map((st) =>
          api
            .get(`/api/attendances/getEmployeesByStatus/${officeTarget}/${st}`)
            .then((r) => ({
              status: st,
              employees: r.data?.employees || [],
            }))
            .catch(() => ({ status: st, employees: [] }))
        );

        const results = await Promise.all(fetchPromises);
        results.forEach(({ status: st, employees }) => {
          employees.forEach((emp) => {
            aggregated.push({
              id: emp.id,
              empId: emp.id,
              date: toISODate(getToday()),
              status: emp.attendance?.status || st,
              checkInTime: emp.attendance?.checkInTime || null,
              checkOutTime: emp.attendance?.checkOutTime || null,
              overTime: emp.attendance?.overTime || 0,
              employee: {
                id: emp.id,
                name: emp.name,
                phone: emp.phone,
                office: emp.office || (todayData.offices || []).find((o) => o.id === emp.officeId),
              },
            });
          });
        });

        if (attendanceStatus !== 'ALL') {
          aggregated = aggregated.filter((r) => r.status === attendanceStatus);
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          aggregated = aggregated.filter(
            (r) =>
              (r.employee?.name || '').toLowerCase().includes(q) ||
              (r.employee?.phone || '').includes(q)
          );
        }

        setAttendanceRecords(aggregated);
      } else {
        // Compute target month/year pairs needed
        let monthYearPairs = [];
        if (dateMode === 'month') {
          monthYearPairs.push({ month: selectedMonth, year: selectedYear });
        } else if (dateMode === 'single') {
          monthYearPairs.push({ month: singleDate.getMonth() + 1, year: singleDate.getFullYear() });
        } else if (dateMode === 'yesterday') {
          const y = getYesterday();
          monthYearPairs.push({ month: y.getMonth() + 1, year: y.getFullYear() });
        } else if (dateMode === 'week') {
          const wStart = getWeekStart();
          const wEnd = getToday();
          monthYearPairs.push({ month: wStart.getMonth() + 1, year: wStart.getFullYear() });
          if (wStart.getMonth() !== wEnd.getMonth()) {
            monthYearPairs.push({ month: wEnd.getMonth() + 1, year: wEnd.getFullYear() });
          }
        } else if (dateMode === 'range') {
          const m1 = startDate.getMonth() + 1;
          const y1 = startDate.getFullYear();
          const m2 = endDate.getMonth() + 1;
          const y2 = endDate.getFullYear();
          monthYearPairs.push({ month: m1, year: y1 });
          if (m1 !== m2 || y1 !== y2) {
            monthYearPairs.push({ month: m2, year: y2 });
          }
        }

        const empRes = await api.get('/api/employees/getAll');
        const rawEmployees = Array.isArray(empRes.data)
          ? empRes.data
          : (empRes.data?.data || empRes.data?.employees || []);

        let employees = rawEmployees;
        if (selectedOffice !== 'all') {
          employees = employees.filter((e) => e.officeId === Number(selectedOffice));
        }

        const fetchTasks = [];
        for (const emp of employees) {
          for (const my of monthYearPairs) {
            fetchTasks.push(
              api
                .get('/api/attendances/getEmployeeAttendance', {
                  params: { empId: emp.id, month: my.month, year: my.year },
                })
                .then((r) => {
                  const recs = r.data?.attendanceRecords || [];
                  return recs.map((rec) => ({
                    ...rec,
                    employee: {
                      id: emp.id,
                      name: emp.name,
                      phone: emp.phone,
                      office: emp.office || (officeData || []).find((o) => o.id === emp.officeId),
                    },
                  }));
                })
                .catch(() => [])
            );
          }
        }

        const nestedResults = await Promise.all(fetchTasks);
        let allRecords = nestedResults.flat();

        if (dateMode === 'single') {
          const targetStr = toISODate(singleDate);
          allRecords = allRecords.filter((r) => (r.date || '').startsWith(targetStr));
        } else if (dateMode === 'yesterday') {
          const yStr = toISODate(getYesterday());
          allRecords = allRecords.filter((r) => (r.date || '').startsWith(yStr));
        } else if (dateMode === 'week') {
          const startStr = toISODate(startDate);
          const endStr = toISODate(endDate);
          allRecords = allRecords.filter((r) => {
            const d = (r.date || '').slice(0, 10);
            return d >= startStr && d <= endStr;
          });
        } else if (dateMode === 'range') {
          const startStr = toISODate(startDate);
          const endStr = toISODate(endDate);
          allRecords = allRecords.filter((r) => {
            const d = (r.date || '').slice(0, 10);
            return d >= startStr && d <= endStr;
          });
        }

        if (attendanceStatus !== 'ALL') {
          allRecords = allRecords.filter((r) => r.status === attendanceStatus);
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          allRecords = allRecords.filter(
            (r) =>
              (r.employee?.name || '').toLowerCase().includes(q) ||
              (r.employee?.phone || '').includes(q)
          );
        }

        allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAttendanceRecords(allRecords);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      showToast(getApiErrorMessage(error, 'Failed to load attendance history'), 'Error');
    } finally {
      setLoading(false);
    }
  }, [
    selectedOffice,
    attendanceStatus,
    searchQuery,
    dateMode,
    singleDate,
    startDate,
    endDate,
    selectedMonth,
    selectedYear,
    officeData,
    showToast,
  ]);

  // ---------------- FETCH LEAVE HISTORY ----------------
  const fetchLeaveHistory = useCallback(async () => {
    try {
      setLoading(true);

      const queryParams = {
        officeId: selectedOffice !== 'all' ? selectedOffice : undefined,
        status: leaveStatus !== 'ALL' ? leaveStatus : undefined,
        type: leaveType !== 'ALL' ? leaveType : undefined,
        year: leaveYear,
        search: searchQuery.trim() || undefined,
      };

      // 1. Primary: Dedicated endpoint (live on Vercel)
      try {
        const response = await api.get('/api/leaves/history', { params: queryParams });
        if (response.data && Array.isArray(response.data.leaves)) {
          let recs = response.data.leaves;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            recs = recs.filter(
              (l) =>
                (l.employee?.name || '').toLowerCase().includes(q) ||
                (l.reason || '').toLowerCase().includes(q)
            );
          }
          setLeaveRecords(recs);
          return;
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          throw err;
        }
      }

      // 2. Fallback: Query summary endpoint
      const summaryUrl =
        selectedOffice && selectedOffice !== 'all'
          ? `/api/leaves/summary/${selectedOffice}`
          : '/api/leaves/summary';

      const response = await api.get(summaryUrl);
      const resData = response.data || {};

      let combined = [
        ...(resData.pendingLeaves || []).map((l) => ({ ...l, status: 'PENDING' })),
        ...(resData.approvedLeaves || []).map((l) => ({ ...l, status: 'APPROVED' })),
        ...(resData.rejectedLeaves || []).map((l) => ({ ...l, status: 'REJECTED' })),
      ];

      // Filter by year
      combined = combined.filter((l) => {
        const yr = new Date(l.fromDate || l.applyDate).getFullYear();
        return isNaN(yr) || yr === leaveYear;
      });

      if (leaveStatus !== 'ALL') {
        combined = combined.filter((l) => l.status === leaveStatus);
      }

      if (leaveType !== 'ALL') {
        combined = combined.filter((l) => l.type === leaveType);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        combined = combined.filter(
          (l) =>
            (l.employee?.name || '').toLowerCase().includes(q) ||
            (l.reason || '').toLowerCase().includes(q)
        );
      }

      combined.sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate));
      setLeaveRecords(combined);
    } catch (error) {
      console.error('Error fetching leave history:', error);
      showToast(getApiErrorMessage(error, 'Failed to load leave history'), 'Error');
    } finally {
      setLoading(false);
    }
  }, [selectedOffice, leaveStatus, leaveType, leaveYear, searchQuery, showToast]);

  // REACTIVE EFFECT: Refetch whenever any filter changes!
  useEffect(() => {
    if (activeSegment === 'attendance') {
      fetchAttendanceHistory();
    } else {
      fetchLeaveHistory();
    }
  }, [
    activeSegment,
    dateMode,
    singleDate,
    startDate,
    endDate,
    selectedMonth,
    selectedYear,
    selectedOffice,
    attendanceStatus,
    leaveStatus,
    leaveType,
    leaveYear,
    searchQuery,
    fetchAttendanceHistory,
    fetchLeaveHistory,
  ]);

  // Screen Focus trigger
  useFocusEffect(
    useCallback(() => {
      if (activeSegment === 'attendance') {
        fetchAttendanceHistory();
      } else {
        fetchLeaveHistory();
      }
    }, [activeSegment, fetchAttendanceHistory, fetchLeaveHistory])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeSegment === 'attendance') {
        await fetchAttendanceHistory();
      } else {
        await fetchLeaveHistory();
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeSegment, fetchAttendanceHistory, fetchLeaveHistory]);

  // ---------------- LEAVE APPROVE / REJECT ACTION ----------------
  const handleLeaveDecision = async (leaveId, decision) => {
    if (!leaveId || processingLeaveId) return;
    try {
      setProcessingLeaveId(leaveId);
      const res = await api.post('/api/leaves/update-status', {
        leaveId,
        status: decision,
      });
      showToast(res.data?.message || `Leave ${decision.toLowerCase()}`, 'Success');
      setLeaveActionModal({ visible: false, leave: null, action: null });
      fetchLeaveHistory();
    } catch (err) {
      showToast(getApiErrorMessage(err, `Failed to update leave to ${decision}`), 'Error');
    } finally {
      setProcessingLeaveId(null);
    }
  };

  // ---------------- DATE PICKER CONTROLS ----------------
  const onDatePicked = (event, selected) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed' || !selected) return;

    if (pickerTarget === 'single') {
      setSingleDate(selected);
      setDateMode('single');
    } else if (pickerTarget === 'start') {
      setStartDate(selected);
      setDateMode('range');
    } else if (pickerTarget === 'end') {
      setEndDate(selected);
      setDateMode('range');
    }
  };

  const handleStepDay = (step) => {
    const nextDate = new Date(singleDate);
    nextDate.setDate(nextDate.getDate() + step);
    setSingleDate(nextDate);
    setDateMode('single');
  };

  const handleStepMonth = (step) => {
    let newM = selectedMonth + step;
    let newY = selectedYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    } else if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setSelectedMonth(newM);
    setSelectedYear(newY);
    setDateMode('month');
  };

  const handleSelectDateMode = (modeId) => {
    setDateMode(modeId);
    if (modeId === 'today') {
      setSingleDate(getToday());
    } else if (modeId === 'yesterday') {
      setSingleDate(getYesterday());
    } else if (modeId === 'week') {
      setStartDate(getWeekStart());
      setEndDate(getToday());
    } else if (modeId === 'month') {
      setSelectedMonth(new Date().getMonth() + 1);
      setSelectedYear(new Date().getFullYear());
    } else if (modeId === 'single') {
      setPickerTarget('single');
      setShowDatePicker(true);
    } else if (modeId === 'range') {
      setPickerTarget('start');
      setShowDatePicker(true);
    }
  };

  // ---------------- KPI SUMMARY CALCULATIONS ----------------
  const attendanceKPIs = useMemo(() => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE'
    ).length;
    const late = attendanceRecords.filter((r) => r.status === 'LATE').length;
    const absent = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
    const leave = attendanceRecords.filter((r) => r.status === 'LEAVE').length;
    return { total, present, late, absent, leave };
  }, [attendanceRecords]);

  const leaveKPIs = useMemo(() => {
    const total = leaveRecords.length;
    const pending = leaveRecords.filter((l) => l.status === 'PENDING').length;
    const approved = leaveRecords.filter((l) => l.status === 'APPROVED').length;
    const rejected = leaveRecords.filter((l) => l.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [leaveRecords]);

  // Color mappings
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'PRESENT':
        return { bg: '#00D4AA20', text: '#00D4AA', border: '#00D4AA50' };
      case 'LATE':
        return { bg: '#FFB80020', text: '#FFB800', border: '#FFB80050' };
      case 'ABSENT':
        return { bg: '#FF6B6B20', text: '#FF6B6B', border: '#FF6B6B50' };
      case 'LEAVE':
        return { bg: '#A78BFA20', text: '#A78BFA', border: '#A78BFA50' };
      case 'HOLIDAY':
        return { bg: '#38BDF820', text: '#38BDF8', border: '#38BDF850' };
      case 'APPROVED':
        return { bg: '#00D4AA20', text: '#00D4AA', border: '#00D4AA50' };
      case 'PENDING':
        return { bg: '#FFB80020', text: '#FFB800', border: '#FFB80050' };
      case 'REJECTED':
        return { bg: '#FF6B6B20', text: '#FF6B6B', border: '#FF6B6B50' };
      default:
        return { bg: '#8A9BAE20', text: '#8A9BAE', border: '#8A9BAE50' };
    }
  };

  // ---------------- RENDER ATTENDANCE CARD ----------------
  const renderAttendanceItem = ({ item }) => {
    const badge = getStatusBadgeStyle(item.status);
    const officeName =
      item.employee?.office?.name ||
      officeData?.find((o) => o.id === item.employee?.officeId)?.name ||
      'Branch';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (item.employee?.id) {
            router.push({
              pathname: '/(admin)/(employeeManagement)/EmployeeDetails',
              params: { id: item.employee.id },
            });
          }
        }}
        style={styles.card}
      >
        {/* Top Row: Employee & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.employeeInfo}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(item.employee?.name || 'E').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.employeeName} numberOfLines={1}>
                {item.employee?.name || `Employee #${item.empId}`}
              </Text>
              <View style={styles.officeBadgeRow}>
                <MaterialIcons name="business" size={12} color="#4A9EFF" />
                <Text style={styles.officeBadgeText}>{officeName}</Text>
                {item.employee?.phone ? (
                  <>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.phoneText}>{item.employee.phone}</Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.statusText, { color: badge.text }]}>{item.status}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Bottom Details Grid */}
        <View style={styles.cardGrid}>
          <View style={styles.gridCol}>
            <Text style={styles.gridLabel}>Date</Text>
            <Text style={styles.gridValue}>{formatDay(item.date)}</Text>
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.gridLabel}>Check In</Text>
            <Text style={styles.gridValue}>{formatTime(item.checkInTime)}</Text>
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.gridLabel}>Check Out</Text>
            <Text style={styles.gridValue}>{formatTime(item.checkOutTime)}</Text>
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.gridLabel}>Hours</Text>
            <Text style={styles.gridValue}>
              {calculateTotalHours(item.checkInTime, item.checkOutTime)}
            </Text>
          </View>
        </View>

        {/* Overtime Tag if applicable */}
        {Number(item.overTime) > 0 && (
          <View style={styles.overtimeTag}>
            <Feather name="zap" size={12} color="#FFB800" />
            <Text style={styles.overtimeText}>
              Overtime: {convertOvertime(item.overTime)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ---------------- RENDER LEAVE CARD ----------------
  const renderLeaveItem = ({ item }) => {
    const statusBadge = getStatusBadgeStyle(item.status);
    const officeName =
      item.employee?.office?.name ||
      officeData?.find((o) => o.id === item.employee?.officeId)?.name ||
      'Branch';

    return (
      <View style={styles.card}>
        {/* Top Row: Employee & Badges */}
        <View style={styles.cardHeader}>
          <View style={styles.employeeInfo}>
            <View style={[styles.avatarCircle, { backgroundColor: '#7C3AED20' }]}>
              <Text style={[styles.avatarText, { color: '#A78BFA' }]}>
                {(item.employee?.name || 'E').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.employeeName} numberOfLines={1}>
                {item.employee?.name || `Employee #${item.empId}`}
              </Text>
              <View style={styles.officeBadgeRow}>
                <MaterialIcons name="business" size={12} color="#4A9EFF" />
                <Text style={styles.officeBadgeText}>{officeName}</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {item.type && (
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: item.type === 'PAID' ? 'rgba(74, 158, 255, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                    borderColor: item.type === 'PAID' ? '#4A9EFF40' : '#94A3B840',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: item.type === 'PAID' ? '#4A9EFF' : '#94A3B8' },
                  ]}
                >
                  {item.type}
                </Text>
              </View>
            )}

            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg, borderColor: statusBadge.border }]}>
              <Text style={[styles.statusText, { color: statusBadge.text }]}>{item.status}</Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Leave Duration Details */}
        <View style={styles.leaveDurationRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Feather name="calendar" size={14} color="#4A9EFF" />
            <Text style={styles.leaveDatesText}>
              {formatDay(item.fromDate)} ➔ {formatDay(item.toDate)}
            </Text>
          </View>
          <View style={styles.leaveDaysPill}>
            <Text style={styles.leaveDaysText}>
              {item.totalDays || 1} {item.totalDays === 1 ? 'Day' : 'Days'}
            </Text>
          </View>
        </View>

        {/* Reason */}
        {item.reason ? (
          <View style={styles.leaveReasonBox}>
            <Text style={styles.leaveReasonLabel}>Reason:</Text>
            <Text style={styles.leaveReasonText}>{item.reason}</Text>
          </View>
        ) : null}

        {/* Applied date */}
        <View style={styles.appliedRow}>
          <Text style={styles.appliedText}>Applied on: {formatDay(item.applyDate || item.fromDate)}</Text>
        </View>

        {/* Pending Actions */}
        {item.status === 'PENDING' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() =>
                setLeaveActionModal({
                  visible: true,
                  leave: item,
                  action: 'REJECTED',
                })
              }
              style={[styles.decisionButton, styles.rejectButton]}
              disabled={processingLeaveId === item.id}
            >
              <Feather name="x" size={14} color="#EF4444" />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                setLeaveActionModal({
                  visible: true,
                  leave: item,
                  action: 'APPROVED',
                })
              }
              style={[styles.decisionButton, styles.approveButton]}
              disabled={processingLeaveId === item.id}
            >
              {processingLeaveId === item.id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check" size={14} color="#FFFFFF" />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Logs & History</Text>
          <Text style={styles.headerSubtitle}>Comprehensive attendance & leave logs</Text>
        </View>

        {/* Office Branch Selector Trigger */}
        <TouchableOpacity
          onPress={() => setShowOfficePicker(true)}
          style={styles.officeTriggerBtn}
        >
          <MaterialIcons name="business" size={18} color="#4A9EFF" />
          <Text style={styles.officeTriggerText} numberOfLines={1}>
            {selectedOffice === 'all'
              ? 'All Branches'
              : officeData?.find((o) => o.id === Number(selectedOffice))?.name || 'Branch'}
          </Text>
          <AntDesign name="down" size={12} color="#4A9EFF" />
        </TouchableOpacity>
      </View>

      {/* ================= SEGMENT SWITCHER ================= */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          onPress={() => setActiveSegment('attendance')}
          style={[styles.segmentBtn, activeSegment === 'attendance' && styles.segmentBtnActive]}
        >
          <Ionicons
            name="calendar"
            size={16}
            color={activeSegment === 'attendance' ? '#FFFFFF' : '#8A9BAE'}
          />
          <Text
            style={[
              styles.segmentText,
              activeSegment === 'attendance' && styles.segmentTextActive,
            ]}
          >
            Attendance Logs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSegment('leave')}
          style={[styles.segmentBtn, activeSegment === 'leave' && styles.segmentBtnActive]}
        >
          <Ionicons
            name="document-text"
            size={16}
            color={activeSegment === 'leave' ? '#FFFFFF' : '#8A9BAE'}
          />
          <Text
            style={[
              styles.segmentText,
              activeSegment === 'leave' && styles.segmentTextActive,
            ]}
          >
            Leave History
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================= SEARCH BAR ================= */}
      <View style={styles.searchBarWrapper}>
        <Feather name="search" size={18} color="#8A9BAE" style={{ marginLeft: 12 }} />
        <TextInput
          placeholder="Search by employee name or phone..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 8 }}>
            <Feather name="x" size={16} color="#8A9BAE" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ================= ATTENDANCE FILTER BAR ================= */}
      {activeSegment === 'attendance' && (
        <View style={styles.filterSection}>
          {/* Quick Date Chips */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'single', label: 'Custom Day' },
              { id: 'range', label: 'Date Range' },
            ]}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.chipsScroll}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelectDateMode(item.id)}
                style={[
                  styles.filterChip,
                  dateMode === item.id && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    dateMode === item.id && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />

          {/* Date Selector Row if Single Day */}
          {(dateMode === 'single' || dateMode === 'yesterday' || dateMode === 'today') && (
            <View style={styles.dateControlRow}>
              <TouchableOpacity onPress={() => handleStepDay(-1)} style={styles.stepDayBtn}>
                <Feather name="chevron-left" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setPickerTarget('single');
                  setShowDatePicker(true);
                }}
                style={styles.datePickerBtn}
              >
                <Feather name="calendar" size={14} color="#4A9EFF" />
                <Text style={styles.datePickerText}>{formatDisplayDate(singleDate)}</Text>
                <Feather name="edit-2" size={12} color="#8A9BAE" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleStepDay(1)} style={styles.stepDayBtn}>
                <Feather name="chevron-right" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Date Selector Row if Month */}
          {dateMode === 'month' && (
            <View style={styles.dateControlRow}>
              <TouchableOpacity onPress={() => handleStepMonth(-1)} style={styles.stepDayBtn}>
                <Feather name="chevron-left" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.datePickerBtn}>
                <Feather name="calendar" size={14} color="#4A9EFF" />
                <Text style={styles.datePickerText}>
                  {monthsList[selectedMonth - 1]} {selectedYear}
                </Text>
              </View>

              <TouchableOpacity onPress={() => handleStepMonth(1)} style={styles.stepDayBtn}>
                <Feather name="chevron-right" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Date Selector Row if Range or Week */}
          {(dateMode === 'range' || dateMode === 'week') && (
            <View style={styles.dateControlRow}>
              <TouchableOpacity
                onPress={() => {
                  setPickerTarget('start');
                  setShowDatePicker(true);
                }}
                style={[styles.datePickerBtn, { flex: 1 }]}
              >
                <Text style={styles.rangeLabel}>From:</Text>
                <Text style={styles.datePickerText}>{formatDisplayDate(startDate)}</Text>
              </TouchableOpacity>

              <Text style={{ color: '#8A9BAE', fontSize: 14 }}>➔</Text>

              <TouchableOpacity
                onPress={() => {
                  setPickerTarget('end');
                  setShowDatePicker(true);
                }}
                style={[styles.datePickerBtn, { flex: 1 }]}
              >
                <Text style={styles.rangeLabel}>To:</Text>
                <Text style={styles.datePickerText}>{formatDisplayDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Status Chips */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['ALL', 'PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'HOLIDAY']}
            keyExtractor={(i) => i}
            contentContainerStyle={styles.statusChipsScroll}
            renderItem={({ item }) => {
              const active = attendanceStatus === item;
              return (
                <TouchableOpacity
                  onPress={() => setAttendanceStatus(item)}
                  style={[
                    styles.statusFilterChip,
                    active && styles.statusFilterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusFilterChipText,
                      active && styles.statusFilterChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* ================= LEAVE FILTER BAR ================= */}
      {activeSegment === 'leave' && (
        <View style={styles.filterSection}>
          {/* Status Chips */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['ALL', 'PENDING', 'APPROVED', 'REJECTED']}
            keyExtractor={(i) => i}
            contentContainerStyle={styles.chipsScroll}
            renderItem={({ item }) => {
              const active = leaveStatus === item;
              return (
                <TouchableOpacity
                  onPress={() => setLeaveStatus(item)}
                  style={[styles.statusFilterChip, active && styles.statusFilterChipActive]}
                >
                  <Text
                    style={[
                      styles.statusFilterChipText,
                      active && styles.statusFilterChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* Type Chips & Year Selector */}
          <View style={styles.leaveTypeRow}>
            <Text style={styles.filterInlineLabel}>Type:</Text>
            {['ALL', 'PAID', 'UNPAID'].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setLeaveType(t)}
                style={[styles.typePill, leaveType === t && styles.typePillActive]}
              >
                <Text style={[styles.typePillText, leaveType === t && styles.typePillTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={{ flex: 1 }} />

            {/* Year Selector */}
            <View style={styles.yearRow}>
              <TouchableOpacity
                onPress={() => setLeaveYear((y) => y - 1)}
                style={styles.yearStepBtn}
              >
                <Feather name="chevron-left" size={14} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.yearText}>{leaveYear}</Text>
              <TouchableOpacity
                onPress={() => setLeaveYear((y) => y + 1)}
                style={styles.yearStepBtn}
              >
                <Feather name="chevron-right" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ================= KPI STATS BAR ================= */}
      <View style={styles.kpiContainer}>
        {activeSegment === 'attendance' ? (
          <>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiValue}>{attendanceKPIs.total}</Text>
              <Text style={styles.kpiLabel}>Total</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#00D4AA' }]}>{attendanceKPIs.present}</Text>
              <Text style={styles.kpiLabel}>Present</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#FFB800' }]}>{attendanceKPIs.late}</Text>
              <Text style={styles.kpiLabel}>Late</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#FF6B6B' }]}>{attendanceKPIs.absent}</Text>
              <Text style={styles.kpiLabel}>Absent</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#A78BFA' }]}>{attendanceKPIs.leave}</Text>
              <Text style={styles.kpiLabel}>Leave</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiValue}>{leaveKPIs.total}</Text>
              <Text style={styles.kpiLabel}>Total</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#FFB800' }]}>{leaveKPIs.pending}</Text>
              <Text style={styles.kpiLabel}>Pending</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#00D4AA' }]}>{leaveKPIs.approved}</Text>
              <Text style={styles.kpiLabel}>Approved</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiValue, { color: '#FF6B6B' }]}>{leaveKPIs.rejected}</Text>
              <Text style={styles.kpiLabel}>Rejected</Text>
            </View>
          </>
        )}
      </View>

      {/* ================= RECORDS LIST ================= */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#4A9EFF" />
          <Text style={styles.loadingText}>Fetching records...</Text>
        </View>
      ) : activeSegment === 'attendance' ? (
        <FlatList
          data={attendanceRecords}
          keyExtractor={(item, index) => `${item.id || item.empId}-${item.date}-${index}`}
          renderItem={renderAttendanceItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A9EFF']} tintColor="#4A9EFF" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#475569" />
              <Text style={styles.emptyTitle}>No Attendance Records Found</Text>
              <Text style={styles.emptySubtitle}>
                No records match the current filter selection ({dateMode}). Try changing the date, branch or status.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setDateMode('today');
                  setSingleDate(getToday());
                  setAttendanceStatus('ALL');
                  setSelectedOffice('all');
                  setSearchQuery('');
                }}
                style={styles.resetFiltersBtn}
              >
                <Text style={styles.resetFiltersText}>Reset to All Branches & Today</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={leaveRecords}
          keyExtractor={(item, index) => `${item.id || index}`}
          renderItem={renderLeaveItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A9EFF']} tintColor="#4A9EFF" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#475569" />
              <Text style={styles.emptyTitle}>No Leave Records Found</Text>
              <Text style={styles.emptySubtitle}>
                There are no leave requests matching the chosen status or search term.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setLeaveStatus('ALL');
                  setLeaveType('ALL');
                  setSelectedOffice('all');
                  setSearchQuery('');
                }}
                style={styles.resetFiltersBtn}
              >
                <Text style={styles.resetFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ================= DATE PICKER MODAL (Android) ================= */}
      {showDatePicker && (
        <DateTimePicker
          value={
            pickerTarget === 'single'
              ? singleDate
              : pickerTarget === 'start'
              ? startDate
              : endDate
          }
          mode="date"
          display={Platform.OS === 'android' ? 'default' : 'spinner'}
          onChange={onDatePicked}
        />
      )}

      {/* ================= OFFICE SELECTION MODAL ================= */}
      <Modal
        visible={showOfficePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOfficePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOfficePicker(false)}
        >
          <View style={styles.officePickerModal}>
            <View style={styles.officeModalHeader}>
              <Text style={styles.officeModalTitle}>Filter by Branch</Text>
              <TouchableOpacity onPress={() => setShowOfficePicker(false)}>
                <Feather name="x" size={20} color="#8A9BAE" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setSelectedOffice('all');
                setShowOfficePicker(false);
              }}
              style={[
                styles.officeOptionItem,
                selectedOffice === 'all' && styles.officeOptionItemActive,
              ]}
            >
              <MaterialIcons name="apps" size={18} color={selectedOffice === 'all' ? '#4A9EFF' : '#8A9BAE'} />
              <Text
                style={[
                  styles.officeOptionText,
                  selectedOffice === 'all' && styles.officeOptionTextActive,
                ]}
              >
                All Branches
              </Text>
            </TouchableOpacity>

            {(officeData || []).map((off) => (
              <TouchableOpacity
                key={off.id}
                onPress={() => {
                  setSelectedOffice(off.id);
                  setShowOfficePicker(false);
                }}
                style={[
                  styles.officeOptionItem,
                  selectedOffice === off.id && styles.officeOptionItemActive,
                ]}
              >
                <MaterialIcons
                  name="location-city"
                  size={18}
                  color={selectedOffice === off.id ? '#4A9EFF' : '#8A9BAE'}
                />
                <Text
                  style={[
                    styles.officeOptionText,
                    selectedOffice === off.id && styles.officeOptionTextActive,
                  ]}
                >
                  {off.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= LEAVE DECISION MODAL ================= */}
      <Modal
        visible={leaveActionModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setLeaveActionModal({ visible: false, leave: null, action: null })
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <View
              style={[
                styles.confirmIconCircle,
                {
                  backgroundColor:
                    leaveActionModal.action === 'APPROVED' ? 'rgba(0, 212, 170, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                },
              ]}
            >
              <Feather
                name={leaveActionModal.action === 'APPROVED' ? 'check' : 'x'}
                size={24}
                color={leaveActionModal.action === 'APPROVED' ? '#00D4AA' : '#EF4444'}
              />
            </View>

            <Text style={styles.confirmTitle}>
              {leaveActionModal.action === 'APPROVED' ? 'Approve Leave Request?' : 'Reject Leave Request?'}
            </Text>

            <Text style={styles.confirmMessage}>
              Are you sure you want to {leaveActionModal.action?.toLowerCase()} the leave for{' '}
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                {leaveActionModal.leave?.employee?.name || 'this employee'}
              </Text>
              ?
            </Text>

            <View style={styles.confirmButtonRow}>
              <TouchableOpacity
                onPress={() =>
                  setLeaveActionModal({ visible: false, leave: null, action: null })
                }
                style={styles.confirmCancelBtn}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  handleLeaveDecision(
                    leaveActionModal.leave?.id,
                    leaveActionModal.action
                  )
                }
                style={[
                  styles.confirmActionBtn,
                  {
                    backgroundColor:
                      leaveActionModal.action === 'APPROVED' ? '#10B981' : '#EF4444',
                  },
                ]}
              >
                <Text style={styles.confirmActionText}>
                  {leaveActionModal.action === 'APPROVED' ? 'Yes, Approve' : 'Yes, Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111a22',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8A9BAE',
    marginTop: 2,
  },
  officeTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#192633',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3441',
    maxWidth: 160,
  },
  officeTriggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A9EFF',
    maxWidth: 100,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#192633',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#4A9EFF',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A9BAE',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#192633',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  filterSection: {
    marginTop: 10,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#192633',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  filterChipActive: {
    backgroundColor: '#4A9EFF',
    borderColor: '#4A9EFF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8A9BAE',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 10,
  },
  stepDayBtn: {
    backgroundColor: '#192633',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#192633',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  datePickerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  rangeLabel: {
    color: '#8A9BAE',
    fontSize: 11,
  },
  statusChipsScroll: {
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#192633',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  statusFilterChipActive: {
    borderColor: '#4A9EFF',
    backgroundColor: '#4A9EFF20',
  },
  statusFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A9BAE',
  },
  statusFilterChipTextActive: {
    color: '#4A9EFF',
  },
  leaveTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  filterInlineLabel: {
    color: '#8A9BAE',
    fontSize: 12,
    fontWeight: '600',
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#192633',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  typePillActive: {
    backgroundColor: '#4A9EFF',
    borderColor: '#4A9EFF',
  },
  typePillText: {
    fontSize: 11,
    color: '#8A9BAE',
    fontWeight: '600',
  },
  typePillTextActive: {
    color: '#FFFFFF',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#192633',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  yearStepBtn: {
    padding: 2,
  },
  yearText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  kpiContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: '#192633',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#2A3441',
    justifyContent: 'space-around',
  },
  kpiBox: {
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#8A9BAE',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4A9EFF20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A9EFF',
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  officeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  officeBadgeText: {
    fontSize: 12,
    color: '#8A9BAE',
  },
  dotSeparator: {
    color: '#475569',
    fontSize: 12,
  },
  phoneText: {
    fontSize: 11,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#2A3441',
    marginVertical: 10,
  },
  cardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 11,
    color: '#8A9BAE',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  overtimeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FFB80015',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  overtimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFB800',
  },
  leaveDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaveDatesText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  leaveDaysPill: {
    backgroundColor: '#4A9EFF20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  leaveDaysText: {
    color: '#4A9EFF',
    fontSize: 11,
    fontWeight: '700',
  },
  leaveReasonBox: {
    marginTop: 8,
    backgroundColor: '#111a22',
    padding: 10,
    borderRadius: 8,
  },
  leaveReasonLabel: {
    fontSize: 11,
    color: '#8A9BAE',
    marginBottom: 2,
  },
  leaveReasonText: {
    fontSize: 13,
    color: '#E2E8F0',
  },
  appliedRow: {
    marginTop: 6,
  },
  appliedText: {
    fontSize: 11,
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  decisionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectButton: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF444450',
  },
  rejectButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#8A9BAE',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8A9BAE',
    textAlign: 'center',
    lineHeight: 18,
  },
  resetFiltersBtn: {
    marginTop: 12,
    backgroundColor: '#4A9EFF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  resetFiltersText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  officePickerModal: {
    width: '100%',
    backgroundColor: '#192633',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  officeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441',
  },
  officeModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  officeOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  officeOptionItemActive: {
    backgroundColor: '#4A9EFF20',
  },
  officeOptionText: {
    color: '#8A9BAE',
    fontSize: 14,
  },
  officeOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  confirmCard: {
    width: '100%',
    backgroundColor: '#192633',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  confirmIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  confirmButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: '#2A3441',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmCancelText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 13,
  },
  confirmActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
