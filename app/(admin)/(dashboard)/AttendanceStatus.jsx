import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useContextData } from '../../../context/EmployeeContext';
import { api, getApiErrorMessage } from '../../../services/ApiService';

function AttendanceStatus() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState([]);
  const { id, status, officeName } = useLocalSearchParams();
  const { showToast } = useContextData();

  const fetchEmployeesData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/attendances/getEmployeesByStatus/${id}/${status}`);
      setEmployees(response.data?.employees || []);
    } catch (error) {
      showToast(getApiErrorMessage(error, "Failed to load employee status"), "Error");
      console.error("Error loading employee status:", error);
    } finally {
      setLoading(false);
    }
  }, [id, status, showToast]);

  useEffect(() => {
    fetchEmployeesData();
  }, [fetchEmployeesData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchEmployeesData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchEmployeesData]);

  const getStatusColor = (statusVal) => {
    switch(statusVal) {
      case 'PRESENT':
        return '#00D4AA';
      case 'ABSENT':
        return '#FF6B6B';
      case 'LATE':
        return '#FFB800';
      default:
        return '#8A9BAE';
    }
  };

  const getStatusBackground = (statusVal) => {
    switch(statusVal) {
      case 'PRESENT':
        return '#00D4AA20';
      case 'ABSENT':
        return '#FF6B6B20';
      case 'LATE':
        return '#FFB80020';
      default:
        return '#8A9BAE20';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <AntDesign name="arrowleft" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{`${id === "all" ? `Total Employees`: `${officeName || 'Office'} Employees`}`}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ backgroundColor: getStatusBackground(status), marginTop: 20, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, alignSelf: "center", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: getStatusColor(status), fontWeight: "bold", fontSize: 14 }}>{status}</Text>
      </View>

      {/* Employees List */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A9EFF']}
            tintColor="#4A9EFF"
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A9EFF" />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        ) : employees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="users" size={64} color="#2A3441" />
            <Text style={styles.emptyText}>No employees found</Text>
          </View>
        ) : (
          <View style={styles.employeesContainer}>
            {employees?.map((employee, index) => (
              <View key={employee?.id || index} style={styles.employeeCard}>
                {/* Employee Avatar/Icon */}
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(employee?.name || "E").split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || "E"}
                    </Text>
                  </View>
                  <View 
                    style={[
                      styles.statusDot, 
                      { backgroundColor: getStatusColor(status) }
                    ]} 
                  />
                </View>

                {/* Employee Details */}
                <View style={styles.employeeDetails}>
                  <View style={styles.employeeHeader}>
                    <Text style={styles.employeeName}>{employee?.name || "Unknown"}</Text>
                  </View>
                  
                  <View style={styles.employeeInfo}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoText}>EmpId:  <Text style={{color:"white",fontWeight:"bold"}}>{employee?.id || "—"}</Text></Text>
                    </View>
                  </View>

                  <View style={styles.phoneRow}>
                    <Text style={styles.infoText}>Phone:  <Text style={{color:"white",fontWeight:"bold"}}>{employee?.phone || "—"}</Text></Text>
                  </View>

                  <Text style={{color:"#8A9BAE",fontWeight:"bold"}}>Office Name : <Text style={{color:"white"}}>{employee?.office?.name || "—"}</Text></Text>
                </View>

              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default AttendanceStatus;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  header: {
    padding: 20,
    backgroundColor: '#192633',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2A3441',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    maxWidth:"75%",
    textAlign:"center"
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#192633',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  countContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  countText: {
    fontSize: 14,
    color: '#8A9BAE',
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8A9BAE',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8A9BAE',
  },
  employeesContainer: {
    padding: 20,
    gap: 12,
  },
  employeeCard: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A9EFF20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4A9EFF30',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A9EFF',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#192633',
  },
  employeeDetails: {
    flex: 1,
    gap: 8,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  employeeInfo: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#8A9BAE',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  phoneText: {
    fontSize: 14,
    color: '#4A9EFF',
    fontWeight: '500',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2A3441',
  },
});