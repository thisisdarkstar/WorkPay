import Feather from '@expo/vector-icons/Feather'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import axios from 'axios'
import * as Location from 'expo-location'
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { Modal, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from "react-native-safe-area-context"
import { url } from '../../../constants/EnvValue'
import { useContextData } from "../../../context/EmployeeContext"
import { getApiErrorMessage, getToken, removeToken } from '../../../services/ApiService'
import { calculateHoursManual, formatMinutesToHHMM } from "../../../utils/TimeUtils"
import { preloadInterstitialAd, showInterstitialAd } from '../../../services/AdService'

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c; // Distance in meters
  return distance;
}

function Home() {
  const [dateTime, setDateTime] = useState(new Date());
  const [showMenu, setShowMenu] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const router = useRouter();
  const [dashboardDetails, setDashboardDetails] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const {setEmployeeData, showToast} = useContextData();

  // Animation values
  const spinRotation = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const successScale = useSharedValue(0);

  const empDetails = dashboardDetails?.employeeDetails;
  const hasCheckin = !!empDetails?.checkinTime;
  const hasCheckout = !!empDetails?.checkoutTime;
  const isAbsent = empDetails?.status === 'ABSENT';
  const isLeave = empDetails?.status === 'LEAVE';
  const isOfficeFinalized = !!empDetails?.isFinalized;
  const isDayClosed = hasCheckout || isAbsent || isLeave || isOfficeFinalized;

  // Pulse and spinning loader animations
  useEffect(() => {
    if (locationLoading) {
      spinRotation.value = 0;
      spinRotation.value = withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1,
        false
      );
      // Fast radar pulse when loading location
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 600 }),
          withTiming(0.6, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(spinRotation);
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      
      // Gentle ambient breathing glow only when button is ready for interaction
      if (!isDayClosed) {
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.0, { duration: 1600, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
        pulseOpacity.value = withRepeat(
          withSequence(
            withTiming(0.4, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.12, { duration: 1600, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
      } else {
        pulseScale.value = withTiming(1, { duration: 250 });
        pulseOpacity.value = withTiming(0, { duration: 250 });
      }
    }
  }, [locationLoading, dashboardDetails, isDayClosed]);

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Get current user location similar to OfficeSettings
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      // Request location permissions first
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission to access location was denied', 'Warning');
        return null;
      }

      // Get current position
      let location = await Location.getCurrentPositionAsync({});
      
      const userLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      };

      setCurrentLocation(userLocation);
      
      return userLocation;
    } catch (error) {
      console.error('Error getting location:', error);
      showToast('Failed to get current location', 'Error');
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchDashboardDetails = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const response = await axios.get(`${url}/api/employees/dashboard`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const data = response.data;
      setDashboardDetails(data);
      if (data?.employeeDetails) {
        setEmployeeData(data.employeeDetails);
      }
      console.log('Fetched dashboard details:', data);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to fetch dashboard details'), 'Error');
      console.error('Error fetching dashboard details:', error);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchDashboardDetails();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDashboardDetails();
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    preloadInterstitialAd();
  }, []);

  const handleAttendanceAction = async (action) => {
    if (isDayClosed) {
      showToast('Attendance for today is closed.', 'Warning');
      return;
    }

    if(locationLoading){
      showToast('Location is being fetched. Please wait...','Warning');
      return;
    }

    try {
      // Get office location from dashboard details
      const officeLocation = dashboardDetails?.officeDetails;
      
      if (!officeLocation || !officeLocation.latitude || !officeLocation.longitude) {
        showToast('Office location information is not available. Please contact your administrator.', 'Error');
        return;
      }

      // Get current location
      const userLocation = await getCurrentLocation();
      if (!userLocation) {
        showToast('Unable to get current location. Please ensure location permissions are granted.', 'Error');
        return;
      }

      // Calculate distance between user and office
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        officeLocation.latitude,
        officeLocation.longitude
      );

      console.log(`Distance from office: ${distance.toFixed(2)} meters`);

      // Check if user is within allowed range
      const MAX_DISTANCE = officeLocation?.range; // meters
      const MIN_DISTANCE = 0;   // meters

      if (distance < MIN_DISTANCE || distance > MAX_DISTANCE) {
        showToast(`You must be within ${MAX_DISTANCE} meters of the office to check in. Current distance: ${Math.round(distance)} meters`, 'Warning');
        return;
      }

      const token = await getToken();
      if (!token) {
        showToast('Session expired. Please log in again.', 'Error');
        return;
      }

      // Proceed with attendance action if location is verified
      const response = await axios.post(`${url}/api/attendances/mark`, {
        type: action,
        location: userLocation // Send current location to backend
      },{
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      
      const data = response.data;
      if(data){
        showToast(data.message || "Attendance marked successfully", "Success");
        await fetchDashboardDetails();

        // If checkout completed, show compliant Interstitial Ad at natural transition point
        if (action === 'checkout') {
          showInterstitialAd().catch((adErr) => {
            console.log('[AdMob] Interstitial show error:', adErr);
          });
        }
      }
    } catch (error) {
      const errMsg = getApiErrorMessage(error, 'Error marking attendance');
      showToast(errMsg, 'Error');
      console.error('Error marking attendance:', error);
    }
  }

  const timeString = dateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const dateString = dateTime.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  // Animated styles
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinRotation.value}deg` }],
  }));

  const buttonScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handleButtonPressIn = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    buttonScale.value = withSpring(0.93, { damping: 15, stiffness: 300 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const handleLogout = async () => {
    await removeToken();
    router.replace('/');
  }


  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        style={styles.headerContainer}
      >
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Welcome back, {dashboardDetails?.employeeDetails?.name || "Employee"} </Text>
          <View style={styles.employeeIdBadge}>
            <Text style={styles.employeeIdText}>ID: {dashboardDetails?.employeeDetails?.id || "—"}</Text>
          </View>
        </View>
        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch (_) {}
              setShowMenu(!showMenu);
            }}
          >
            <Feather name="more-vertical" size={22} color="#667085" />
          </TouchableOpacity>
          
          {showMenu && (
            <>
              {/* Invisible backdrop to dismiss popup menu on tap outside */}
              <TouchableOpacity
                style={styles.menuBackdrop}
                activeOpacity={1}
                onPress={() => setShowMenu(false)}
              />
              <Animated.View 
                entering={FadeInDown.duration(200).springify()}
                exiting={FadeOutUp.duration(150)}
                style={styles.popupMenu}
              >
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    router.push({
                      pathname: "/(employee)/(home)/EmployeeProfile",
                    });
                  }}
                >
                  <Feather name="user" size={18} color="#F8FAFC" />
                  <Text style={styles.menuItemText}>Profile</Text>
                </TouchableOpacity>
                
                <View style={styles.menuDivider} />
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    handleLogout();
                  }}
                >
                  <Feather name="log-out" size={18} color="#F04438" />
                  <Text style={[styles.menuItemText, { color: '#F04438' }]}>Logout</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </View>
      </Animated.View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={() => setShowMenu(false)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A9EFF']}
            tintColor="#4A9EFF"
          />
        }
      >

        {/* Time + Check In */}
        <Animated.View 
          entering={FadeInDown.duration(450).springify()}
          style={styles.checkInOutContainer}
        >
          <View style={styles.timeDateContainer}>
            <Text style={styles.timeText}>{timeString}</Text>
            <Text style={styles.dateText}>{dateString}</Text>
          </View>
          

          {/* DAY CLOSED / COMPLETED STATES (DISABLED) */}
          {isDayClosed && (
            <Animated.View 
              entering={ZoomIn.duration(400).springify().damping(14)}
              style={[
                styles.checkButton, 
                styles.completedButton,
                isAbsent && { borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                isLeave && { borderColor: 'rgba(139, 92, 246, 0.4)', backgroundColor: 'rgba(139, 92, 246, 0.1)' },
                (!hasCheckout && !isAbsent && !isLeave && isOfficeFinalized) && { borderColor: 'rgba(100, 116, 139, 0.4)', backgroundColor: 'rgba(51, 65, 85, 0.2)' }
              ]}
            >
              <View style={styles.checkButtonInner}>
                {hasCheckout && (
                  <>
                    <Feather name="check-circle" size={44} color="#10B981" />
                    <Text style={[styles.checkButtonText, { color: '#10B981' }]}>Shift Done</Text>
                  </>
                )}
                {isAbsent && (
                  <>
                    <Feather name="x-circle" size={44} color="#EF4444" />
                    <Text style={[styles.checkButtonText, { color: '#EF4444' }]}>Absent</Text>
                  </>
                )}
                {isLeave && (
                  <>
                    <Feather name="calendar" size={44} color="#8B5CF6" />
                    <Text style={[styles.checkButtonText, { color: '#8B5CF6' }]}>On Leave</Text>
                  </>
                )}
                {!hasCheckout && !isAbsent && !isLeave && isOfficeFinalized && (
                  <>
                    <Feather name="lock" size={44} color="#94A3B8" />
                    <Text style={[styles.checkButtonText, { color: '#94A3B8' }]}>Closed</Text>
                  </>
                )}
              </View>
            </Animated.View>
          )}

          {/* CHECK IN button - only active if day is not closed and not checked in */}
          {!isDayClosed && !hasCheckin && (
            <Animated.View entering={FadeIn.duration(350)}>
              <TouchableOpacity
                onPress={() => handleAttendanceAction('checkin')}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={locationLoading}
                activeOpacity={1}
              >
                <Animated.View style={[styles.buttonWrapper, buttonScaleStyle]}>
                  {/* Pulse ring */}
                  <Animated.View style={[styles.pulseRing, pulseRingStyle]} />
                  <View style={[styles.checkButton, locationLoading && styles.loadingButton]}>
                    <View style={styles.checkButtonInner}>
                      {locationLoading ? (
                        <Animated.View style={spinStyle}>
                          <MaterialCommunityIcons name="loading" size={48} color="white" />
                        </Animated.View>
                      ) : (
                        <MaterialCommunityIcons name="fingerprint" size={48} color="white" />
                      )}
                      <Text style={styles.checkButtonText}>Check In</Text>
                      <Text style={styles.checkButtonSubtext}>
                        {locationLoading ? "Getting location..." : "Tap to clock in"}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* CHECK OUT button - only active if checked in and not checked out */}
          {!isDayClosed && hasCheckin && !hasCheckout && (
            <Animated.View entering={FadeIn.duration(350)}>
              <TouchableOpacity
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } catch (_) {}
                  setShowCheckoutModal(true);
                }}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={locationLoading}
                activeOpacity={1}
              >
                <Animated.View style={[styles.buttonWrapper, buttonScaleStyle]}>
                  {/* Pulse ring */}
                  <Animated.View style={[styles.pulseRing, styles.pulseRingRed, pulseRingStyle]} />
                  <View style={[styles.checkButton, styles.checkOutButton, locationLoading && styles.loadingButton]}>
                    <View style={styles.checkButtonInner}>
                      {locationLoading ? (
                        <Animated.View style={spinStyle}>
                          <MaterialCommunityIcons name="loading" size={48} color="white" />
                        </Animated.View>
                      ) : (
                        <MaterialCommunityIcons name="fingerprint" size={48} color="white" />
                      )}
                      <Text style={styles.checkButtonText}>Check Out</Text>
                      <Text style={styles.checkButtonSubtext}>
                        {locationLoading ? "Getting location..." : "Tap to clock out"}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>


        {/* Today's Summary */}
        <Animated.View 
          entering={FadeInDown.delay(150).duration(400)}
          style={styles.summaryHeader}
        >
          <Text style={styles.summaryTitle}>{"Today's Summary"}</Text>
        </Animated.View>

        {/* Details */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(450).springify()}
          style={styles.detailsCard}
        >
          <View style={styles.individualDetails}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
              <MaterialCommunityIcons name="login" size={22} color="#10B981" />
            </View>
            <Text style={styles.detailTime}>{dashboardDetails?.employeeDetails?.checkinTime || "-- : --"}</Text>
            <Text style={styles.detailLabel}>Check In</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.individualDetails}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
              <MaterialCommunityIcons name="logout" size={22} color="#EF4444" />
            </View>
            <Text style={styles.detailTime}>{dashboardDetails?.employeeDetails?.checkoutTime || "-- : --"}</Text>
            <Text style={styles.detailLabel}>Check Out</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.individualDetails}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.25)' }]}>
              <MaterialCommunityIcons name="clock-plus-outline" size={22} color="#F59E0B" />
            </View>
            <Text style={styles.detailTime}>
              {dashboardDetails?.employeeDetails?.overtime != null
                ? `${(Number(dashboardDetails.employeeDetails.overtime) / 60).toFixed(1)}h`
                : "0h"}
            </Text>
            <Text style={styles.detailLabel}>Overtime</Text>
          </View>
        </Animated.View>

        {/* Additional Stats Card */}
        <Animated.View 
          entering={FadeInDown.delay(280).duration(450).springify()}
          style={styles.statsCard}
        >
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{calculateHoursManual(dashboardDetails?.officeDetails?.checkin, dashboardDetails?.officeDetails?.checkout)}</Text>
            <Text style={styles.statLabel}>Regular Hours</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatMinutesToHHMM(dashboardDetails?.officeDetails?.breakTime)}</Text>
            <Text style={styles.statLabel}>Break Time</Text>
          </View>
        </Animated.View>

      </ScrollView>

      {/* Checkout Confirmation Modal */}
      <Modal
        visible={showCheckoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTouchable}
            activeOpacity={1}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch (_) {}
              setShowCheckoutModal(false);
            }}
          />
          <Animated.View
            entering={ZoomIn.duration(260).springify().damping(16)}
            style={styles.modalContent}
          >
            {/* Warning / Action Icon */}
            <View style={styles.modalIconContainer}>
              <Feather name="alert-circle" size={28} color="#EF4444" />
            </View>

            <Text style={styles.modalTitle}>Confirm Daily Check Out</Text>
            <Text style={styles.modalMessage}>
              Checking out will finalize your attendance for today. Once completed, you cannot check in again today, and your daily working hours and payout will be calculated according to this timestamp.
            </Text>

            {/* Shift Context Card */}
            <View style={styles.modalShiftCard}>
              <View style={styles.modalShiftRow}>
                <View style={styles.modalShiftCol}>
                  <Text style={styles.modalShiftLabel}>Checked In</Text>
                  <Text style={styles.modalShiftValue}>
                    {dashboardDetails?.employeeDetails?.checkinTime || "--:--"}
                  </Text>
                </View>
                <View style={styles.modalShiftDivider} />
                <View style={styles.modalShiftCol}>
                  <Text style={styles.modalShiftLabel}>Clocking Out</Text>
                  <Text style={[styles.modalShiftValue, { color: '#EF4444' }]}>
                    {timeString}
                  </Text>
                </View>
              </View>
            </View>

            {/* Warning Callout Box */}
            <View style={styles.modalWarningBox}>
              <Feather name="alert-triangle" size={16} color="#F59E0B" style={styles.modalWarningIcon} />
              <Text style={styles.modalWarningText}>
                One-time action: Your daily work duration and overtime will be locked for payroll calculation.
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                activeOpacity={0.7}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (_) {}
                  setShowCheckoutModal(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                activeOpacity={0.8}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  } catch (_) {}
                  setShowCheckoutModal(false);
                  handleAttendanceAction('checkout');
                }}
              >
                <Feather name="log-out" size={16} color="#FFFFFF" />
                <Text style={styles.modalConfirmText}>Check Out</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

export default Home

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#111a22',
  },
  headerContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
    elevation: 20,
  },
  headerTitleContainer: {
    gap: 8,
    maxWidth:"80%",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  employeeIdBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.3)',
    alignSelf: 'flex-start',
  },
  employeeIdText: {
    fontSize: 12,
    color: '#A5B4FC',
    fontWeight: '600',
  },
  logoutButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuContainer: {
    position: 'relative',
    alignSelf:"flex-start",
    zIndex: 100,
    elevation: 20,
  },
  menuButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  popupMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 140,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  scrollContent: {
    paddingBottom: 40,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  checkInOutContainer: {
    width: '100%',
    backgroundColor: '#192633',
    borderRadius: 24,
    padding: 32,
    marginTop: 20,
    alignItems: 'center',
    gap: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  timeDateContainer: {
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: -2,
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
  },
  checkButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 4,
    borderColor: 'rgba(79, 70, 229, 0.3)',
  },
  buttonWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(79, 70, 229, 0.35)',
  },
  pulseRingRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
  },
  loadingButton: {
    opacity: 0.85,
  },
  checkOutButton: {
    backgroundColor: '#EF4444',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    shadowColor: "#EF4444",
  },
  completedButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.5)',
    shadowColor: "#10B981",
    elevation: 0,
    shadowOpacity: 0,
  },
  disabledButton: {
    opacity: 0.6,
  },
  checkButtonInner: {
    alignItems: 'center',
    gap: 8,
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  checkButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  summaryHeader: {
    width: '100%',
    marginTop: 32,
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  detailsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#192633',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  individualDetails: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTime: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  statsCard: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#192633',
    borderRadius: 20,
    paddingVertical: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  menuBackdrop: {
    position: 'absolute',
    top: -100,
    bottom: -1500,
    left: -1000,
    right: -100,
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalShiftCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  modalWarningBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: 20,
  },
  modalWarningIcon: {
    marginTop: 2,
  },
  modalWarningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#FCD34D',
    fontWeight: '500',
  },
  modalShiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  modalShiftCol: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  modalShiftLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalShiftValue: {
    fontSize: 17,
    color: '#F1F5F9',
    fontWeight: '700',
  },
  modalShiftDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalCancelText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
})