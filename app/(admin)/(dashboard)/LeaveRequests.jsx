import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useContextData } from '../../../context/EmployeeContext';
import { api, getApiErrorMessage } from '../../../services/ApiService';
import { formatDay } from "../../../utils/TimeUtils";


function LeaveRequests() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('pendingLeaves');
  const [data,setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingLeaveId, setProcessingLeaveId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const {showToast} = useContextData();
  const {id} = useLocalSearchParams();

  const fetchLeaveRequest = useCallback(async () => {
    try {
      const apiUrl = id ? `/api/leaves/summary/${id}` : '/api/leaves/summary';
      const response = await api.get(apiUrl);
      setData(response.data);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Error fetching leave requests'), 'Error');
      console.error("Error fetching leaves request", error);
    }
  }, [id, showToast]);

  const handleAcceptReject = async (leaveId, type) => {
    if (processingLeaveId) return;
    try {
      setProcessingLeaveId(leaveId);
      const response = await api.post('/api/leaves/update-status', {
        leaveId,
        status: type
      });
      const resData = response.data;
      if (resData?.message) {
        showToast(resData.message, "Success");
        fetchLeaveRequest();
      }
    } catch (error) {
      showToast(getApiErrorMessage(error, "Failed to update leave status"), "Error");
      console.error("Error updating leave status", error);
    } finally {
      setProcessingLeaveId(null);
    }
  }


  useFocusEffect(
    useCallback(() => {
      fetchLeaveRequest();
    }, [fetchLeaveRequest])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchLeaveRequest();
    } finally {
      setRefreshing(false);
    }
  }, [fetchLeaveRequest]);



  const tabs = [
    { key: 'pendingLeaves', label: 'Pending Leaves', count: data?.pendingLeaves?.length || 0 },
    { key: 'approvedLeaves', label: 'Approved Leaves', count: data?.approvedLeaves?.length || 0 },
    { key: 'rejectedLeaves', label: 'Rejected Leaves', count: data?.rejectedLeaves?.length || 0 },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'pendingLeaves': return '#FFB800';
      case 'approvedLeaves': return '#1b947cff';
      case 'rejectedLeaves': return '#a51212ff';
      default: return '#FFB800';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'pendingLeaves': return 'Pending';
      case 'approvedLeaves': return 'Accepted';
      case 'rejectedLeaves': return 'Rejected';
      default: return 'Pending';
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <AntDesign name="left" size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leave Requests</Text>
          {/* placeholder */}
          <View/>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search bar (sticky above the scrolling list) */}
      <View style={leaveSearchStyles.stickyContainer}>
        <View style={leaveSearchStyles.wrapper}>
          <Feather name="search" size={18} color="#8A9BAE" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by employee name..."
            placeholderTextColor="#8A9BAE"
            style={leaveSearchStyles.input}
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

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A9EFF']}
            tintColor="#4A9EFF"
          />
        }
      >
        <View style={styles.requestsContainer}>
         {(() => {
           const list = Array.isArray(data?.[activeTab]) ? data[activeTab] : [];
           const q = searchQuery.trim().toLowerCase();
           const shown = q
             ? list.filter(r => (r?.employee?.name || '').toLowerCase().includes(q))
             : list;
           return shown.length > 0 ? shown.map((request, index) => (
            <View key={request?.id || index} style={styles.requestItem}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{request?.employee?.name || "Employee"}</Text>
                <Text style={styles.requestType}>{request?.type || "LEAVE"}</Text>
                <Text style={styles.requestDates}>{formatDay(request?.fromDate)} - {formatDay(request?.toDate)}</Text>
                <Text style={styles.requestReason}>{request?.reason || "No reason provided"}</Text>
              </View>
              
              <View style={styles.requestActions}>
                {activeTab === 'pendingLeaves' ? (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.acceptButton, processingLeaveId === request.id && { opacity: 0.6 }]}
                      onPress={() => handleAcceptReject(request.id,"APPROVED")}
                      disabled={!!processingLeaveId}
                    >
                      {processingLeaveId === request.id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <AntDesign name="check" size={16} color="#ffffff" />
                          <Text style={styles.actionButtonText}>Accept</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.rejectButton, processingLeaveId === request.id && { opacity: 0.6 }]}
                      onPress={() => handleAcceptReject(request.id,"REJECTED")}
                      disabled={!!processingLeaveId}
                    >
                      <AntDesign name="close" size={16} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activeTab) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(activeTab)}</Text>
                  </View>
                )}
              </View>
            </View>
          )) : (
            <View style={{alignItems:'center',marginTop:50}}>
              <Text style={{color:'#8A9BAE',fontSize:16}}>
                {q
                  ? `No results match "${searchQuery.trim()}"`
                  : `No ${tabs.find(tab => tab.key === activeTab)?.label} found.`}
              </Text>
            </View>
          );
         })()}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default LeaveRequests

const leaveSearchStyles = StyleSheet.create({
  stickyContainer: {
    backgroundColor: '#0F1419',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441',
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2A3441',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#192633',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2A3441',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#4A9EFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A9BAE',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  requestsContainer: {
    padding: 20,
    gap: 12,
  },
  requestItem: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  requestInfo: {
    marginBottom: 12,
    gap: 4,
  },
  requestName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  requestType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A9EFF',
  },
  requestDates: {
    fontSize: 14,
    color: '#8A9BAE',
  },
  requestReason: {
    fontSize: 13,
    color: '#8A9BAE',
    fontStyle: 'italic',
  },
  requestActions: {
    alignItems: 'flex-end',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButton: {
    backgroundColor: '#00D4AA',
  },
  rejectButton: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});