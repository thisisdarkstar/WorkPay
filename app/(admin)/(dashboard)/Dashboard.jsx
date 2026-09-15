import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { url } from '../../../constants/EnvValue';
import { useContextData } from '../../../context/EmployeeContext';
import { useOfficeContextData } from '../../../context/OfficeContext';
import { getApiErrorMessage, getToken, removeToken } from '../../../services/ApiService';
import { formatDay } from "../../../utils/TimeUtils";


function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAttendanceFinalized, setIsAttendanceFinalized] = useState(false);
  const {showToast} = useContextData();
  const {setOfficeData} = useOfficeContextData();
  const [currentOffice,setCurrentOffice] = useState('all');  
  const [showOfficeList,setShowOfficeList] = useState(false);
  const [isEmployeesAvailable,setIsEmployeesAvailable] = useState(false);

  const [autoFinalizeDisplay, setAutoFinalizeDisplay] = useState(null);

  // Modified dashboardDetails to accept officeId parameter
  const dashboardDetails = async (officeId) => {
    try {
      const token = await getToken();
      if (!token) return null;
      let apiUrl = `${url}/api/attendances/getTodayAttendance/${officeId}`;
        
      const response = await axios.get(apiUrl, {
        headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      const resData = response.data;
      setData(resData);
      if (resData?.offices) setOfficeData(resData.offices);
      if (resData?.office?.id) setCurrentOffice(resData.office.id);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Error fetching dashboard details'), 'Error');
      console.error('Error fetching dashboard details:', error);
      return null;
    }
  }

  const handleFinalizeAttendance = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      let apiUrl = `${url}/api/attendances/finalizeAttendance/${currentOffice}`;

      const response = await axios.post(apiUrl, {}, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
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

  const checkAttendanceFinalization = async (officeId) => {
    if (!officeId || officeId === 'all') {
      setAutoFinalizeDisplay(null);
      return;
    }
    try {
      const token = await getToken();
      if (!token) return;
      let apiUrl = `${url}/api/attendances/checkBulkAttendanceStatus/${officeId}`;

      const response = await axios.get(apiUrl, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      setIsAttendanceFinalized(!!response.data?.isBulkMarkingCompleted);
      setIsEmployeesAvailable((response.data?.totalEmployees || 0) > 0);
      setAutoFinalizeDisplay(response.data?.autoFinalizeDisplay || null);
    } catch (error) {
      console.error('Error checking attendance finalization:', error);
    }
  }

  // Modified office selection handler
  const handleOfficeSelect = (officeId) => {
    setCurrentOffice(officeId);
    setShowOfficeList(false);
    dashboardDetails(officeId); // Immediately fetch data for selected office
    if (officeId !== "all") {
      checkAttendanceFinalization(officeId);
    } else {
      setAutoFinalizeDisplay(null);
      setIsAttendanceFinalized(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      dashboardDetails(currentOffice);
      if (currentOffice !== 'all') {
        checkAttendanceFinalization(currentOffice);
      }
    }, [currentOffice])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dashboardDetails(currentOffice);
      if (currentOffice !== 'all') {
        await checkAttendanceFinalization(currentOffice);
      }
    } finally {
      setRefreshing(false);
    }
  }, [currentOffice]);
  
  const stats = [
    { icon: 'user', iconSet: 'AntDesign', color: '#4A9EFF', label: 'Total Employees',field:"totalEmployees" },
    { icon: 'user-check', iconSet: 'Feather', color: '#00D4AA', label: 'Present Today',field:"totalPresent" ,status:"PRESENT"},
    { icon: 'user-x', iconSet: 'Feather', color: '#FF6B6B', label: 'Absent Today',field:"totalAbsent",status:"ABSENT" },
    { icon: 'timer-outline', iconSet: 'Ionicons', color: '#FFB800', label: 'Late Arrivals',field:"totalLate",status:"LATE" },
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

  const handleLogout =async ()=>{
     await removeToken();
      router.replace('/')
  }

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

          {/* Quick alert banner for pending leaves */}
          {Array.isArray(data?.pendingLeaves) && data.pendingLeaves.length > 0 && (
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
                  handleFinalizeAttendance()
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
                    <Text style={styles.cardCount}>{stat.field === "totalPresent" ? ((data?.["totalLate"] || 0) + (data?.["totalPresent"] || 0)) : (data?.[stat.field] ?? 0)}</Text>
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
                    <Text style={styles.cardCount}>{stat.field === "totalPresent" ? ((data?.["totalPresent"] || 0) + (data?.["totalLate"] || 0)) : (data?.[stat.field] ?? 0)}</Text>
                    <Text style={styles.cardLabel}>{stat.label}</Text>
                  </View>
                </View>
                <View style={[styles.cardAccent, { backgroundColor: stat.color }]} />
              </TouchableOpacity>
              )
            ))}
          </View>
        </View>

        {/* Absent List */}
       {Array.isArray(data?.absentList) && data.absentList.length > 0 && <View style={styles.sectionContainer}>
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
              {Array.isArray(data?.pendingLeaves) && data.pendingLeaves.length > 0 && (
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
          {Array.isArray(data?.pendingLeaves) && data.pendingLeaves.length > 0 ? (
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
    </SafeAreaView>
  )
}

export default Dashboard

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