import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import DataCard from "../../components/Attendance/DataCard";
import { useContextData } from "../../context/EmployeeContext";
import { api, getApiErrorMessage } from "../../services/ApiService";
import { CacheKeys, getSWR, TTL } from "../../services/CacheService";
import { calculateTotalOvertime, countAbsentDays, countPresentDays, getTotalDaysInMonth } from "../../utils/TimeUtils";

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

function Attendance() {
  // Get today's month/year
  const today = new Date();
  const thisMonth = today.getMonth() + 1; // 1-12
  const thisYear = today.getFullYear();

  // States
  const [currentMonth, setCurrentMonth] = useState(thisMonth);
  const [currentYear, setCurrentYear] = useState(thisYear);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useContextData();

  // Handle left arrow (previous month)
  const handlePrev = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // Handle right arrow (next month)
  const handleNext = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const fetchAttendanceData = useCallback(async ({ forceRefresh = false } = {}) => {
    try {
      setLoading(true);
      // A completed (past) month's attendance never changes → cache for a day.
      // The current month still changes as the user checks in/out, so use a
      // short TTL + SWR. The 'mark' action in Home invalidates the current
      // month's key, so new check-ins appear immediately here too.
      const isPastMonth =
        currentYear < thisYear ||
        (currentYear === thisYear && currentMonth < thisMonth);
      await getSWR(
        CacheKeys.attendance(currentYear, currentMonth),
        async () => {
          const response = await api.get('/api/attendances/getAttendance', {
            params: { month: currentMonth, year: currentYear },
          });
          return response.data;
        },
        {
          ttl: isPastMonth ? TTL.DAY : TTL.FIVE_MIN,
          forceRefresh,
          onData: (data) => setAttendanceData(data),
        }
      );
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Error fetching attendance data'), 'Error');
      console.error("Error fetching attendance data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear, thisMonth, thisYear, showToast]);

  useFocusEffect(
    useCallback(() => {
      fetchAttendanceData();
    }, [fetchAttendanceData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAttendanceData({ forceRefresh: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchAttendanceData]);

  // Disable right arrow if at today's month/year
  const isNextDisabled =
    currentMonth === thisMonth && currentYear === thisYear;

  const records = attendanceData?.attendanceRecords || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <Text style={styles.title}>Attendance History</Text>
      </View>

      {/* month container */}
      <View style={styles.monthContainer}>
        <TouchableOpacity onPress={handlePrev}>
          <Feather name="chevron-left" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.monthText}>
          {months.find((m) => m.number === currentMonth)?.name} {currentYear}
        </Text>

        <TouchableOpacity
          onPress={handleNext}
          disabled={isNextDisabled}
          style={isNextDisabled && { opacity: 0.4 }}
        >
          <Feather name="chevron-right" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4da6ff" />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4A9EFF']}
              tintColor="#4A9EFF"
            />
          }
          ListHeaderComponent={
            <View style={styles.overViewContainer}>
              <Animated.View 
                entering={FadeInDown.duration(350).springify()}
                style={styles.overViewCard}
              >
                <View style={styles.row}>
                  <Text style={styles.label}>Total Working Days</Text>
                  <Text style={styles.value}>{getTotalDaysInMonth(currentMonth, currentYear)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Total Present Days</Text>
                  <Text style={styles.value}>{countPresentDays(records)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Total Absent Days</Text>
                  <Text style={styles.value}>{countAbsentDays(records)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Total Overtime Hours</Text>
                  <Text style={styles.value}>{(calculateTotalOvertime(records) || 0).toFixed(2)} hr</Text>
                </View>
              </Animated.View>
            </View>
          }
          ListEmptyComponent={
            <Animated.View 
              entering={FadeIn.duration(300)}
              style={styles.emptyContainer}
            >
              <Feather name="calendar" size={48} color="#475569" />
              <Text style={styles.emptyTitle}>No Attendance Records</Text>
              <Text style={styles.emptySubtitle}>No entries logged for this month</Text>
            </Animated.View>
          }
          renderItem={({ item, index }) => (
            <Animated.View 
              entering={FadeInDown.delay(Math.min(index * 30, 240)).duration(280).springify()}
              style={styles.cardWrapper}
            >
              <DataCard data={item} />
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

export default Attendance;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111a22",
  },
  header: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    position: "relative",
    paddingVertical: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  monthContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    alignItems: "center",
  },
  monthText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  cardWrapper: {
    alignItems: "center",
    marginTop: 20,
  },
  overViewContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  overViewCard: {
    width: "92%",
    backgroundColor: "#192633",
    borderRadius: 10,
    padding: 15,
    gap: 15,
    marginVertical: 10,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  value: {
    color: "#fff",
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtitle: {
    color: "#94A3B8",
    fontSize: 14,
  },
});
