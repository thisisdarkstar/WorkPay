import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useContextData } from "../../../context/EmployeeContext";
import { api, getApiErrorMessage } from "../../../services/ApiService";
import { CacheKeys, getSWR, invalidate, TTL } from "../../../services/CacheService";

function HolidayManagement() {
  const currentYear = new Date().getFullYear();
  const [holidays, setHolidays] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState(null);
  const [holidayDate, setHolidayDate] = useState(null);
  const [holidayName, setHolidayName] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const {showToast} = useContextData()

  // Transforms the raw /holidays/getAll payload into the grouped shape the UI
  // renders. Kept pure so it can run on both cached and fresh data.
  const transformHolidays = useCallback((raw) => {
    const list = Array.isArray(raw) ? raw : [];
    return list.map(monthItem => ({
      month: `${monthItem?.month || ''} ${currentYear}`,
      holidays: Array.isArray(monthItem?.holidays) ? monthItem.holidays.map(holiday => ({
        id: holiday?.id,
        date: holiday?.date ? new Date(holiday.date).getDate().toString().padStart(2, "0") : '--',
        name: holiday?.description || 'Holiday',
        fullDate: holiday?.date
      })) : []
    }));
  }, [currentYear]);

  // Holidays change only a few times a year, so we cache the raw payload with a
  // 1-day TTL and serve it instantly (stale-while-revalidate). The add/delete
  // mutations invalidate this key, guaranteeing the next read refetches.
  const fetchHolidays = useCallback(async ({ forceRefresh = false } = {}) => {
    try {
      setIsLoading(true);
      await getSWR(
        CacheKeys.holidays(currentYear),
        async () => {
          const response = await api.get('/api/holidays/getAll');
          return Array.isArray(response.data) ? response.data : [];
        },
        {
          ttl: TTL.DAY,
          forceRefresh,
          onData: (raw) => setHolidays(transformHolidays(raw)),
        }
      );
    } catch (error) {
      console.error('Error fetching holidays:', error);
      showToast(getApiErrorMessage(error, 'Failed to fetch holidays'),'Error');
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, showToast, transformHolidays]);

  const addHoliday = async () => {
    if (!holidayDate || !holidayName.trim()) {
      showToast('Please select a date and enter holiday name','Error');
      return;
    }

    try {
      setIsLoading(true);
      const y = holidayDate.getFullYear();
      const m = String(holidayDate.getMonth() + 1).padStart(2, '0');
      const d = String(holidayDate.getDate()).padStart(2, '0');
      const formattedDateString = `${y}-${m}-${d}`;

      const response = await api.post('/api/holidays/add', {
        description: holidayName,
        date: formattedDateString
      });

      // F-8 (frontend companion): When the backend reconciles existing
      // attendance rows (e.g. same-day / late-declared holiday), surface
      // how many rows were overwritten and how many absence deductions
      // were refunded so the admin sees the side effects, not just
      // "Holiday added".
      const overwrote = Number(response?.data?.attendanceOverwritten) || 0;
      const refunded = Number(response?.data?.absenceDeductionsRefunded) || 0;
      const extras = [];
      if (overwrote > 0) extras.push(`${overwrote} attendance record${overwrote === 1 ? '' : 's'} converted to HOLIDAY`);
      if (refunded > 0) extras.push(`${refunded} absence deduction${refunded === 1 ? '' : 's'} refunded`);
      const successMsg = extras.length > 0
        ? `Holiday added successfully! (${extras.join(', ')})`
        : 'Holiday added successfully!';

      showToast(successMsg, 'Success');
      setHolidayDate(null);
      setHolidayName("");
      setModalVisible(false);

      // Data changed on the server → drop the cache and refetch fresh so the
      // Leave screen (and this one) never shows a stale holiday list.
      await invalidate(CacheKeys.holidays(currentYear));
      await fetchHolidays({ forceRefresh: true });
    } catch (error) {
      console.error('Error adding holiday:', error);
      showToast(getApiErrorMessage(error, 'Failed to add holiday'),'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const showDeleteConfirmation = (holidayId, holidayName) => {
    setHolidayToDelete({ id: holidayId, name: holidayName });
    setDeleteModalVisible(true);
  };

  const confirmDeleteHoliday = async () => {
    if (!holidayToDelete) return;

    try {
      setIsLoading(true);
      await api.delete(`/api/holidays/delete/${holidayToDelete.id}`);

      showToast('Holiday deleted successfully!','Success');
      setDeleteModalVisible(false);
      setHolidayToDelete(null);

      // Data changed on the server → drop the cache and refetch fresh.
      await invalidate(CacheKeys.holidays(currentYear));
      await fetchHolidays({ forceRefresh: true });
    } catch (error) {
      console.error('Error deleting holiday:', error);
      showToast(getApiErrorMessage(error, 'Failed to delete holiday'),'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setHolidayToDelete(null);
  };

  useFocusEffect(
    useCallback(() => {
      fetchHolidays();
    }, [fetchHolidays])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchHolidays({ forceRefresh: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchHolidays]);

  const getTotalHolidays = () => {
    return holidays.reduce((acc, m) => acc + (Array.isArray(m?.holidays) ? m.holidays.length : 0), 0);
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A9EFF']}
            tintColor="#4A9EFF"
          />
        }
      >
        {/* Header */}
        <View style={{width: "100%", alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 20}}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Holiday Management</Text>
          <View/>
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <MaterialCommunityIcons
            name="calendar-star"
            size={50}
            color="#1e90ff"
          />
          <Text style={styles.summaryHeader}>
            {getTotalHolidays()}
          </Text>
          <Text style={{ color: "#fff" }}>Total Holidays in {currentYear}</Text>
        </View>

        {/* Add Holiday Button */}
        <TouchableOpacity
          style={[styles.applyButton, { opacity: isLoading ? 0.6 : 1 }]}
          onPress={() => setModalVisible(true)}
          disabled={isLoading}
        >
          <Text style={styles.applyButtonText}>
            {isLoading ? 'Loading...' : 'Add Holiday'}
          </Text>
        </TouchableOpacity>

        {/* Holiday List */}
        <View style={styles.historyContainer}>
          <View style={{ width: "100%", gap: 15 }}>
            {holidays.length === 0 && !isLoading ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="calendar-remove"
                  size={60}
                  color="#666"
                />
                <Text style={{ color: "#666", fontSize: 16, textAlign: 'center', marginTop: 10 }}>
                  No holidays added yet
                </Text>
              </View>
            ) : (
              holidays.map((monthItem, index) => (
                <View key={index} style={styles.holidayMonth}>
                  <Text style={styles.holidayMonthText}>{monthItem.month}</Text>
                  <View style={styles.holidayList}>
                    {monthItem.holidays.map((holiday, idx) => (
                      <View key={holiday.id || idx} style={styles.holidayItem}>
                        <View style={styles.holidayContent}>
                          <Text style={styles.holidayDate}>{holiday.date}</Text>
                          <Text style={styles.holidayName}>{holiday.name}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => showDeleteConfirmation(holiday.id, holiday.name)}
                          disabled={isLoading}
                        >
                          <Feather name="trash-2" size={16} color="#ff4d6d" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Holiday Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Holiday</Text>

            {/* Date Picker */}
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: holidayDate ? "#fff" : "#888" }}>
                {holidayDate
                  ? `${holidayDate.getFullYear()}-${String(holidayDate.getMonth() + 1).padStart(2, '0')}-${String(holidayDate.getDate()).padStart(2, '0')}`
                  : "Select Date"}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={holidayDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setHolidayDate(selectedDate);
                }}
                minimumDate={new Date(currentYear, 0, 1)}
                maximumDate={new Date(currentYear, 11, 31)}
              />
            )}

            {/* Holiday Name */}
            <TextInput
              style={styles.input}
              placeholder="Enter Holiday Name"
              placeholderTextColor="#888"
              value={holidayName}
              onChangeText={setHolidayName}
            />

            {/* Buttons */}
            <TouchableOpacity 
              style={[styles.modalButton, { opacity: isLoading ? 0.6 : 1 }]} 
              onPress={addHoliday}
              disabled={isLoading}
            >
              <Text style={styles.modalButtonText}>
                {isLoading ? 'Adding...' : 'Submit'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: "#ff4d6d", marginTop: 10 },
              ]}
              onPress={() => {
                setHolidayDate(null);
                setHolidayName("");
                setModalVisible(false);
              }}
              disabled={isLoading}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={cancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <View style={styles.deleteIcon}>
                <MaterialCommunityIcons name="calendar-remove" size={32} color="#ff4d6d" />
              </View>
            </View>
            
            <Text style={styles.deleteTitle}>Delete Holiday</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to delete{' '}
              <Text style={styles.holidayNameHighlight}>
                &quot;{holidayToDelete?.name}&quot;
              </Text>
              ? This action cannot be undone.
            </Text>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity 
                style={styles.deleteCancelButton} 
                onPress={cancelDelete}
                disabled={isLoading}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteConfirmButton, { opacity: isLoading ? 0.6 : 1 }]} 
                onPress={confirmDeleteHoliday}
                disabled={isLoading}
              >
                <Text style={styles.deleteConfirmButtonText}>
                  {isLoading ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default HolidayManagement;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#111a22",
  },
  container: {
    padding: 20,
    alignItems: "center",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  backButton: {
    padding: 8,
  },
  summaryContainer: {
    width: "95%",
    padding: 20,
    backgroundColor: "#1e262f",
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  summaryHeader: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  applyButton: {
    width: "95%",
    padding: 15,
    backgroundColor: "#1e90ff",
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  historyContainer: {
    width: "95%",
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  holidayMonth: {
    gap: 10,
    paddingHorizontal: 10,
  },
  holidayList: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  holidayItem: {
    width: "48%",
    padding: 10,
    backgroundColor: "#2a323d",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  holidayContent: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  holidayMonthText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
  },
  holidayDate: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
  },
  holidayName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 77, 109, 0.1)",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    padding: 20,
    backgroundColor: "#1e262f",
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: 15,
    backgroundColor: "#111a22",
    color: "#fff",
    borderRadius: 8,
    marginBottom: 20,
  },
  modalButton: {
    width: "100%",
    padding: 15,
    backgroundColor: "#1e90ff",
    borderRadius: 10,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
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
    backgroundColor: '#1e262f',
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
    backgroundColor: 'rgba(255, 77, 109, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 77, 109, 0.3)',
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
  holidayNameHighlight: {
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
    backgroundColor: '#ff4d6d',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#ff4d6d',
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
});