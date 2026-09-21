import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useContextData } from '../../../context/EmployeeContext';
import { useOfficeContextData } from '../../../context/OfficeContext';
import { api, getApiErrorMessage, removeToken } from '../../../services/ApiService';
import { formatDay } from "../../../utils/TimeUtils";
import { useExitConfirmation } from "../../../hooks/useExitConfirmation";


function Dashboard() {
  const router = useRouter();
  const { ExitModal } = useExitConfirmation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  // Distinct from `loading` (which covers the finalize action). `statsLoading`
  // is true while an office-switch fetch is in flight, so the UI can suppress
  // the previous office's numbers/lists instead of flashing them under the
  // newly-selected office's header. Eliminates the "old totals briefly show
  // for the new branch" glitch.
  const [statsLoading, setStatsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAttendanceFinalized, setIsAttendanceFinalized] = useState(false);
  const {showToast, setEmployeeData} = useContextData();
  const {setOfficeData} = useOfficeContextData();
  const [currentOffice,setCurrentOffice] = useState('all');  
  const [showOfficeList,setShowOfficeList] = useState(false);
  const [isEmployeesAvailable,setIsEmployeesAvailable] = useState(false);

  const [autoFinalizeDisplay, setAutoFinalizeDisplay] = useState(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  // Tracks the LATEST office selection the user has made. Every in-flight
  // fetch compares its target officeId against this ref before committing
  // state, so a slow response for a previously-selected office can never
  // stomp the currently-selected office's data (fixes the "cursor jumps
  // back" symptom when the admin taps offices rapidly).
  const latestOfficeReqRef = useRef('all');

  // Modified dashboardDetails to accept officeId parameter
  const dashboardDetails = useCallback(async (officeId) => {
    // Mark this call as the latest and enter loading state so the UI switches
    // to `···` placeholders rather than showing the previous office's numbers.
    latestOfficeReqRef.current = officeId;
    setStatsLoading(true);
    try {
      const response = await api.get(`/api/attendances/getTodayAttendance/${officeId}`);
      // Stale-response guard: another switch happened while we were awaiting
      // this response. Drop it silently so the newer selection's data isn't
      // overwritten by a late-arriving reply for a previously-selected office.
      if (latestOfficeReqRef.current !== officeId) return;

      const resData = response.data;
      setData(resData);
      if (resData?.offices) {
        setOfficeData(resData.offices);
        if (officeId !== 'all' && !resData.offices.some(o => o.id === Number(officeId))) {
          // Office no longer exists (e.g., deleted from another session).
          // Snap the selector back to All Branches so the header/stats stay
          // coherent instead of orphaning on a dead officeId.
          setCurrentOffice('all');
        }
      }
      // NOTE: We intentionally do NOT `setCurrentOffice(resData.office.id)`
      // here. The client selection is authoritative; letting the server
      // echo-back drive state caused a "cursor jumps back" flicker when a
      // stale response arrived after the admin had already moved on to a
      // different office.
    } catch (error) {
      // Only surface the error if this is still the active request. Errors
      // for superseded requests would be misleading toast noise.
      if (latestOfficeReqRef.current !== officeId) return;
      showToast(getApiErrorMessage(error, 'Error fetching dashboard details'), 'Error');
      console.error('Error fetching dashboard details:', error);
      return null;
    } finally {
      // Only clear the loading gate if this is still the active request.
      // Otherwise the newer in-flight fetch will clear it when it settles.
      if (latestOfficeReqRef.current === officeId) {
        setStatsLoading(false);
      }
    }
  }, [setOfficeData, showToast]);

  const handleFinalizeAttendance = async () => {
    try {
      setLoading(true);
      setShowFinalizeConfirm(false);
      const response = await api.post(`/api/attendances/finalizeAttendance/${currentOffice}`, {});
      showToast(response.data?.message || "Attendance finalized", "Success");
      await dashboardDetails(currentOffice); // refresh stats after finalization
      await checkAttendanceFinalization(currentOffice); // update finalization status
    } catch (error) {
      showToast(getApiErrorMessage(error, "Failed to finalize attendance"), "Error");
      console.error("Error finalizing attendance:", error);
    } finally {
      setLoading(false);
    }
  }

  const checkAttendanceFinalization = useCallback(async (officeId) => {
    // Reset up-front so the finalize button and auto-finalize banner briefly
    // clear when switching, rather than showing the PREVIOUS office's
    // "Finalized" state until this call returns. A blank state is a much
    // better UX than a stale "Finalized" tag on the wrong office.
    setIsAttendanceFinalized(false);
    setIsEmployeesAvailable(false);
    setAutoFinalizeDisplay(null);

    if (!officeId || officeId === 'all') {
      // Nothing to check for the aggregate view.
      return;
    }
    try {
      const response = await api.get(`/api/attendances/checkBulkAttendanceStatus/${officeId}`);
      // Stale-response guard — same rationale as in dashboardDetails.
      if (latestOfficeReqRef.current !== officeId) return;
      setIsAttendanceFinalized(!!response.data?.isBulkMarkingCompleted);
      setIsEmployeesAvailable((response.data?.totalEmployees || 0) > 0);
      setAutoFinalizeDisplay(response.data?.autoFinalizeDisplay || null);
    } catch (error) {
      console.error('Error checking attendance finalization:', error);
    }
  }, []);

  // Simplified: only update the selected office and close the dropdown.
  // The single fetch source (useFocusEffect below) picks up the change and
  // fires exactly ONE dashboardDetails + ONE checkAttendanceFinalization,
  // eliminating the duplicate-fetch storm that previously fired here plus
  // in the focus effect (two rounds of setState → visible flicker).
  const handleOfficeSelect = (officeId) => {
    setCurrentOffice(officeId);
    setShowOfficeList(false);
  }

  useFocusEffect(
    useCallback(() => {
      // Single source of truth for both fetches. Runs on initial focus AND
      // whenever `currentOffice` changes (via handleOfficeSelect), because
      // the callback identity changes and useFocusEffect re-runs its
      // internal useEffect. This replaces the old pattern that also called
      // these directly from handleOfficeSelect (which caused each fetch to
      // fire twice per switch).
      dashboardDetails(currentOffice);
      checkAttendanceFinalization(currentOffice);
    }, [currentOffice, dashboardDetails, checkAttendanceFinalization])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dashboardDetails(currentOffice),
        checkAttendanceFinalization(currentOffice),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [currentOffice, dashboardDetails, checkAttendanceFinalization]);
  
  const stats = [
    { icon: 'user', iconSet: 'AntDesign', color: '#4A9EFF', label: 'Total Employees',field:"totalEmployees" },
    { icon: 'user-check', iconSet: 'Feather', color: '#00D4AA', label: 'Present Today',field:"totalPresent" ,status:"PRESENT"},
    { icon: 'user-x', iconSet: 'Feather', color: '#FF6B6B', label: 'Absent Today',field:"totalAbsent",status:"ABSENT" },
    { icon: 'timer-outline', iconSet: 'Ionicons', color: '#FFB800', label: 'Late Arrivals',field:"totalLate",status:"LATE" },
    { icon: 'calendar-outline', iconSet: 'Ionicons', color: '#A78BFA', label: 'On Leave Today',field:"totalLeave",status:"LEAVE" },
  ];

  const renderIcon = (iconName, iconSet, color, size = 28) => {
    switch(iconSet) {
      case 'AntDesign':
        return <AntDesign name={iconName} size={size} color={color} />;
      case 'Feather':
        return <Feather name={iconName} size={size} color={color} />;
      case 'Ionicons':
        return <Ionicons name={iconName} size={size} color={color} />;
      default:
        return null;
    }
  };

  const handleLogout = async () => {
    setOfficeData([]);
    setData(null);
    setEmployeeData({});
    await removeToken();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>

        {/* header */}
        <View style={styles.header}>
                <Text style={styles.headerTitle}>Welcome Admin</Text>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <MaterialIcons name="logout" size={24} color="#ffffff" />
                </TouchableOpacity>
        </View>

        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4A9EFF']}
              tintColor="#4A9EFF"
            />
          }
        >
        
        {/* Overview Section */}
        <View style={styles.sectionContainer}>

          {/* office selector */}
          <View style={{marginBottom:16,width:'100%',gap:8}}>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => setShowOfficeList(!showOfficeList)}
                  style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:'#2A3441',padding:12,borderRadius:10,backgroundColor:'#192633'}}
                >
                    <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
                      <MaterialIcons name="business" size={22} color="#4A9EFF" />
                      <Text style={{color:'#FFFFFF',fontSize:17,fontWeight:'600'}}>
                        {currentOffice !== "all" ? data?.offices?.find(office => office.id === currentOffice)?.name : "All Branches"}
                      </Text>
                    </View>
                    <AntDesign name={showOfficeList ? "up" : "down"} size={18} color="#4A9EFF" />
                </TouchableOpacity>

                {
                  showOfficeList && <View style={{backgroundColor:'#192633',borderRadius:10,borderWidth:1,borderColor:'#2A3441',overflow:'hidden',padding:4}}>
                    <TouchableOpacity 
                        onPress={() => handleOfficeSelect('all')}
                        style={{padding:12,backgroundColor: 'all' === currentOffice ? '#4A9EFF' : 'transparent',borderRadius:8,flexDirection:'row',alignItems:'center',gap:8}}
                      > 
                        <MaterialIcons name="apps" size={18} color="#FFFFFF" />
                        <Text style={{color:'#FFFFFF',fontSize:15,fontWeight:'600'}}>All Branches</Text>
                      </TouchableOpacity>
                    {data?.offices?.map((office)=>(
                      <TouchableOpacity 
                        key={office.id}
                        onPress={() => handleOfficeSelect(office.id)}
                        style={{padding:12,backgroundColor: office.id === currentOffice ? '#4A9EFF' : 'transparent',borderRadius:8,flexDirection:'row',alignItems:'center',gap:8,marginTop:2}}
                      > 
                        <MaterialIcons name="location-city" size={18} color={office.id === currentOffice ? "#FFFFFF" : "#8A9BAE"} />
                        <Text style={{color:'#FFFFFF',fontSize:15,fontWeight:'500'}}>{office.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                }
          </View>

          {/* Auto-finalize safety info row */}
          {currentOffice !== "all" && autoFinalizeDisplay && (
            <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:16,backgroundColor:'#1A2E3B',paddingHorizontal:12,paddingVertical:8,borderRadius:8,borderWidth:1,borderColor:'rgba(74, 158, 255, 0.2)'}}>
              <Feather name="clock" size={14} color="#60A5FA" />
              <Text style={{color:'#94A3B8',fontSize:12,flex:1}}>
                Auto-finalize: <Text style={{color:'#60A5FA',fontWeight:'600'}}>{autoFinalizeDisplay}</Text>
              </Text>
            </View>
          )}

          {/* Quick alert banner for pending leaves — suppressed while a
              switch is in flight so the previous office's count doesn't
              flash under the newly-selected office header. */}
          {!statsLoading && Array.isArray(data?.pendingLeaves) && data.pendingLeaves.length > 0 && (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/LeaveRequests', params: { id: currentOffice } })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(255, 184, 0, 0.12)',
                borderWidth: 1,
                borderColor: '#FFB800',
                padding: 12,
                borderRadius: 10,
                marginBottom: 16
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <MaterialIcons name="notification-important" size={24} color="#FFB800" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                    {data.pendingLeaves.length} Pending Leave Request{data.pendingLeaves.length > 1 ? 's' : ''}
                  </Text>
                  <Text style={{ color: '#E2E8F0', fontSize: 13, marginTop: 2 }}>
                    Action required to approve or reject
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#FFB800', fontSize: 13, fontWeight: '600' }}>Review</Text>
                <AntDesign name="right" size={14} color="#FFB800" />
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Overview</Text>
            {currentOffice !== "all" &&
            <TouchableOpacity 
              onPress={()=>{
                if(!isAttendanceFinalized){
                  setShowFinalizeConfirm(true)
                }else if (!isEmployeesAvailable && isAttendanceFinalized) {
                  showToast("No Employees Available","Warning")
                }
                else {
                  showToast("Attendance already finalized for today","Warning")
                }
              }} 
              disabled={loading}
              style={[
                styles.viewAllButton,
                {
                  backgroundColor: isAttendanceFinalized ? '#10B98120' : '#4A9EFF',
                  borderWidth: isAttendanceFinalized ? 1 : 0,
                  borderColor: '#10B98150',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : isAttendanceFinalized ? (
                <>
                  <Feather name="check" size={14} color="#10B981" />
                  <Text style={[styles.viewAllText,{color:'#10B981'}]}>Finalized</Text>
                </>
              ) : (
                <Text style={[styles.viewAllText,{color:'#fff'}]}>Finalize Attendance</Text>
              )}
            </TouchableOpacity> }
          </View>
          <View style={styles.overview}>
            {stats.map((stat, index) => (
             currentOffice === "all" ? ( stat.field !== "totalLate" &&  <TouchableOpacity
               onPress={() =>{
                if(stat.field === "totalEmployees") {
                  router.push({ pathname: '/(admin)/(employeeManagement)/EmployeeManagement', params: { officeId: currentOffice } });
                } else {
                  router.push({ pathname: '/AttendanceStatus', params: { id: currentOffice, status: stat.status, officeName: currentOffice === 'all' ? 'All Branches' : (data?.offices?.find(office => office?.id === currentOffice)?.name || 'Office') } });
                }
               }
              }
              key={index} style={styles.card}>

              <AntDesign name="right" size={16}  style={{position:"absolute",top:5,right:10}}  color="#4A9EFF" />

                <View style={styles.cardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
                    {renderIcon(stat.icon, stat.iconSet, stat.color)}
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardCount}>{statsLoading ? '···' : (stat.field === "totalPresent" ? ((data?.["totalLate"] || 0) + (data?.["totalPresent"] || 0)) : (data?.[stat.field] ?? 0))}</Text>
                    <Text style={styles.cardLabel}>{stat.label}</Text>
                  </View>
                </View>
                <View style={[styles.cardAccent, { backgroundColor: stat.color }]} />
              </TouchableOpacity> ) : (
                 <TouchableOpacity
                  onPress={() =>{
                    if(stat.field === "totalEmployees") {
                      router.push({ pathname: '/(admin)/(employeeManagement)/EmployeeManagement', params: { officeId: currentOffice } });
                    } else {
                      router.push({ pathname: '/AttendanceStatus', params: { id: currentOffice, status: stat.status, officeName: data?.offices?.find(office => office?.id === currentOffice)?.name || 'Office' } });
                    }
                  }
                  }
                  key={index} style={styles.card}>
                  <AntDesign name="right" size={16} style={{position:"absolute",top:5,right:10}} color="#4A9EFF" />

                <View style={styles.cardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
                    {renderIcon(stat.icon, stat.iconSet, stat.color)}
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardCount}>{statsLoading ? '···' : (stat.field === "totalPresent" ? ((data?.["totalPresent"] || 0) + (data?.["totalLate"] || 0)) : (data?.[stat.field] ?? 0))}</Text>
                    <Text style={styles.cardLabel}>{stat.label}</Text>
                  </View>
                </View>
                <View style={[styles.cardAccent, { backgroundColor: stat.color }]} />
              </TouchableOpacity>
              )
            ))}
          </View>
        </View>

        {/* Absent List — hidden during an office switch so the previous
            office's absentees don't briefly render under the new header. */}
       {!statsLoading && Array.isArray(data?.absentList) && data.absentList.length > 0 && <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Absent Today</Text>
          <View style={styles.recentActivityContainer}>
            {data.absentList.map((employee, index) => (
              <View key={employee?.id || index} style={styles.recentActivityItem}>
                <View style={{gap:5}}>
                  <Text style={{color:'#FFFFFF',fontSize:18}}>{employee?.name || "Unknown"}</Text>
                  <Text style={{color:'#8A9BAE',fontSize:14}}>ID: {employee?.id || "—"}</Text>
                </View>
                <View style={{paddingHorizontal:10,paddingVertical:5,borderRadius:8,backgroundColor:'#a51212ff',alignItems:'center',justifyContent:'center'}}>
                  <Text style={{color:'#ffffff',fontSize:14,fontWeight:'600'}}>Absent</Text>
                </View>
              </View>
            ))}
          </View>
        </View>}

        {/* Leave Requests Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.sectionTitle}>Leave Requests</Text>
              {!statsLoading && Array.isArray(data?.pendingLeaves) && data.pendingLeaves.length > 0 && (
                <View style={{ backgroundColor: '#FFB800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                  <Text style={{ color: '#111827', fontSize: 12, fontWeight: '700' }}>{data.pendingLeaves.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity 
              onPress={() => router.push({ pathname: '/LeaveRequests', params: { id: currentOffice } })}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <AntDesign name="right" size={16} color="#4A9EFF" />
            </TouchableOpacity>
          </View>
          {statsLoading ? (
            // Placeholder while the switch fetch is in flight. Prevents
            // showing the previous office's pending-leave list under the
            // newly-selected office header.
            <View style={{ padding: 18, backgroundColor: '#192633', borderRadius: 10, alignItems: 'center', marginTop: 8 }}>
              <ActivityIndicator size="small" color="#4A9EFF" />
            </View>
          ) : Array.isArray(data?.pendingLeaves) && data.pendingLeaves.length > 0 ? (
            <View style={styles.recentActivityContainer}>
              {data.pendingLeaves.map((request, index) => (
                <View key={request.id || index} style={styles.recentActivityItem}>
                  <View style={{gap:5, flex: 1}}>
                    <Text style={{color:'#FFFFFF',fontSize:18}}>{request.employee?.name || "Employee"}</Text>
                    <Text style={{color:'#8A9BAE',fontSize:14}}>{request.type} • {formatDay(request.fromDate)} - {formatDay(request.toDate)}</Text>
                  </View>
                  <View style={{paddingHorizontal:10,paddingVertical:5,borderRadius:8,backgroundColor:'#FFB800',alignItems:'center',justifyContent:'center'}}>
                    <Text style={{color:'#ffffff',fontSize:14,fontWeight:'600'}}>Pending</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ padding: 18, backgroundColor: '#192633', borderRadius: 10, alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: '#8A9BAE', fontSize: 14 }}>No pending leave requests</Text>
            </View>
          )}
        </View>

        </ScrollView>

        {/* Bulk Finalize Confirmation (hard-to-reverse action) */}
        <Modal
          visible={showFinalizeConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFinalizeConfirm(false)}
        >
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconCircle}>
                <MaterialIcons name="notification-important" size={26} color="#FFB800" />
              </View>
              <Text style={styles.confirmTitle}>Finalize Attendance?</Text>
              <Text style={styles.confirmMessage}>
                This marks all employees who haven&apos;t checked in today as ABSENT and locks
                today&apos;s attendance for this office. This action cannot be undone.
              </Text>
              <View style={styles.confirmButtonRow}>
                <TouchableOpacity
                  style={styles.confirmCancelButton}
                  onPress={() => setShowFinalizeConfirm(false)}
                  disabled={loading}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmProceedButton, loading && { opacity: 0.6 }]}
                  onPress={handleFinalizeAttendance}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmProceedText}>Finalize</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {ExitModal}
    </SafeAreaView>
  )
}

export default Dashboard

const styles = StyleSheet.create({
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#192633',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3441',
    padding: 22,
    alignItems: 'center',
  },
  confirmIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 13.5,
    color: '#8A9BAE',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  confirmButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#111a22',
    borderWidth: 1,
    borderColor: '#2A3441',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    color: '#8A9BAE',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmProceedButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4A9EFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmProceedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
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
  sectionContainer: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2A3441',
  },
  viewAllText: {
    color: '#4A9EFF',
    fontSize: 14,
    fontWeight: '600',
  },
  overview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 0,
    width: '48%',
    minHeight: 100,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  cardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8A9BAE',
    lineHeight: 16,
  },
  cardAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  recentActivityContainer:{
    width: '100%',
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  recentActivityItem:{
    width: '100%',
    backgroundColor: '#2A3441',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  }
});