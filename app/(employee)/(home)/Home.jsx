import Feather from '@expo/vector-icons/Feather'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as Location from 'expo-location'
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { Modal, RefreshControl, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native"
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
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
import { useContextData } from "../../../context/EmployeeContext"
import { api, getApiErrorMessage, getToken, removeToken } from '../../../services/ApiService'
import { CacheKeys, getSWR, invalidate, TTL } from '../../../services/CacheService'
import { AnalyticsEvents, logEvent } from '../../../services/AnalyticsService'
import { calculateHoursManual, formatMinutesToHHMM } from "../../../utils/TimeUtils"
import { preloadInterstitialAd, showInterstitialAd } from '../../../services/AdService'
import { styles } from '../../../styles/HomeStyles'
import { useExitConfirmation } from '../../../hooks/useExitConfirmation'

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
  const { ExitModal } = useExitConfirmation();
  const [showMenu, setShowMenu] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  // Tracks the in-flight attendance action ('checkin' | 'checkout' | null) for
  // the full duration of the flow — location fetch, /attendances/mark call,
  // cache invalidation, and dashboard refetch. Drives the spinner + disabled
  // state so the button never appears idle while work is still happening.
  const [submitting, setSubmitting] = useState(null);
  // Synchronous re-entrancy guard: React state updates are async, so relying
  // on `submitting` alone leaves a tiny window where two rapid taps can both
  // pass the guard. The ref closes that window instantly.
  const submittingRef = useRef(false);
  const router = useRouter();
  const [dashboardDetails, setDashboardDetails] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const {setEmployeeData, showToast} = useContextData();

  // Animation values
  const spinRotation = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  const empDetails = dashboardDetails?.employeeDetails;
  const hasCheckin = !!empDetails?.checkinTime;
  const hasCheckout = !!empDetails?.checkoutTime;
  const isAbsent = empDetails?.status === 'ABSENT';
  const isLeave = empDetails?.status === 'LEAVE';
  const isOfficeFinalized = !!empDetails?.isFinalized;
  const isDayClosed = hasCheckout || isAbsent || isLeave || isOfficeFinalized;

  // Pulse and spinning loader animations
  useEffect(() => {
    // "Busy" now spans the entire attendance flow (location fetch → API call
    // → cache invalidation → dashboard refetch), not just the GPS phase, so
    // the spinner never stops mid-flow.
    const isBusy = locationLoading || submitting !== null;
    if (isBusy) {
      spinRotation.value = 0;
      spinRotation.value = withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1,
        false
      );
      // Fast radar pulse while working
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
  }, [locationLoading, submitting, dashboardDetails, isDayClosed, pulseOpacity, pulseScale, spinRotation]);

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

      return userLocation;
    } catch (error) {
      console.error('Error getting location:', error);
      showToast('Failed to get current location', 'Error');
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchDashboardDetails = useCallback(async ({ forceRefresh = false } = {}) => {
    try {
      // The dashboard payload carries live-ish attendance state, so we use a
      // short TTL: cached data paints the screen instantly (no blank load),
      // but a background revalidate always runs on focus to keep check-in
      // state fresh. The 'mark' mutation invalidates this key immediately.
      await getSWR(
        CacheKeys.employeeDashboard(),
        async () => {
          const response = await api.get('/api/employees/dashboard');
          return response.data;
        },
        {
          ttl: TTL.FIVE_MIN,
          forceRefresh,
          onData: (data) => {
            setDashboardDetails(data);
            if (data?.employeeDetails) {
              setEmployeeData(data.employeeDetails);
            }
          },
        }
      );
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to fetch dashboard details'), 'Error');
      console.error('Error fetching dashboard details:', error);
    }
  }, [setEmployeeData, showToast]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardDetails();
    }, [fetchDashboardDetails])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDashboardDetails({ forceRefresh: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardDetails]);

  useEffect(() => {
    preloadInterstitialAd();
  }, []);

  const handleAttendanceAction = async (action) => {
    // Synchronous re-entrancy guard: if the previous invocation is still
    // running, silently drop this tap. Uses a ref so it's effective in the
    // same event-loop tick, before React has had a chance to flip `disabled`.
    if (submittingRef.current) return;

    if (isDayClosed) {
      showToast('Attendance for today is closed.', 'Warning');
      return;
    }

    if (locationLoading) {
      showToast('Location is being fetched. Please wait...', 'Warning');
      return;
    }

    submittingRef.current = true;
    setSubmitting(action);
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
      const MAX_DISTANCE = Number(officeLocation?.range); // meters
      const MIN_DISTANCE = 0;   // meters

      // Guard against an unconfigured/invalid geofence radius. Without this,
      // `distance > undefined` evaluates to false and the check-in would proceed
      // regardless of location, bypassing the geofence entirely.
      if (!Number.isFinite(MAX_DISTANCE) || MAX_DISTANCE <= 0) {
        showToast('Office geofence is not configured. Please contact your administrator.', 'Error');
        return;
      }

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
      const response = await api.post('/api/attendances/mark', {
        type: action,
        location: userLocation // Send current location to backend
      });

      const data = response.data;
      if (data) {
        showToast(data.message || "Attendance marked successfully", "Success");

        // Optimistic UI update: patch the local dashboard so `hasCheckin` /
        // `hasCheckout` flip instantly. The button re-renders as the next
        // state (Check In → Check Out, or Check Out → Shift Done) without
        // waiting for the follow-up dashboard refetch to return.
        const optimisticTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setDashboardDetails((prev) => {
          if (!prev) return prev;
          const nextEmp = { ...(prev.employeeDetails || {}) };
          if (action === 'checkin') {
            nextEmp.checkinTime = nextEmp.checkinTime || optimisticTime;
          } else {
            nextEmp.checkoutTime = nextEmp.checkoutTime || optimisticTime;
          }
          return { ...prev, employeeDetails: nextEmp };
        });

        // Analytics is fire-and-forget — never let it slow the UI. The
        // AnalyticsService already swallows its own errors.
        logEvent(AnalyticsEvents.ATTENDANCE_MARK, { type: action });

        // Marking changes both the dashboard state and this month's attendance
        // history → invalidate both so any other screen refetches fresh.
        await invalidate(CacheKeys.employeeDashboard());
        {
          const now = new Date();
          await invalidate(CacheKeys.attendance(now.getFullYear(), now.getMonth() + 1));
        }
        // Sync with server-authoritative timestamps + overtime totals. Kept
        // inside the same submitting window so the spinner runs continuously
        // and no other tap can race a second /mark call before the state
        // reflects the first one.
        await fetchDashboardDetails({ forceRefresh: true });

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
    } finally {
      // Release the guard for BOTH success and failure paths, so a failed
      // check-in can be retried without a page reload.
      setSubmitting(null);
      submittingRef.current = false;
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
    // Clear cached user data so a subsequent user on this device can never
    // briefly see the previous user's PII held in context memory.
    setEmployeeData({});
    setDashboardDetails(null);
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
            accessibilityRole="button"
            accessibilityLabel="Open menu"
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
                disabled={locationLoading || submitting !== null}
                activeOpacity={1}
              >
                <Animated.View style={[styles.buttonWrapper, buttonScaleStyle]}>
                  {/* Pulse ring */}
                  <Animated.View style={[styles.pulseRing, pulseRingStyle]} />
                  <View style={[styles.checkButton, (locationLoading || submitting !== null) && styles.loadingButton]}>
                    <View style={styles.checkButtonInner}>
                      {(locationLoading || submitting !== null) ? (
                        <Animated.View style={spinStyle}>
                          <MaterialCommunityIcons name="loading" size={48} color="white" />
                        </Animated.View>
                      ) : (
                        <MaterialCommunityIcons name="fingerprint" size={48} color="white" />
                      )}
                      <Text style={styles.checkButtonText}>Check In</Text>
                      <Text style={styles.checkButtonSubtext}>
                        {locationLoading
                          ? "Getting location..."
                          : submitting === 'checkin'
                            ? "Marking check-in..."
                            : "Tap to clock in"}
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
                disabled={locationLoading || submitting !== null}
                activeOpacity={1}
              >
                <Animated.View style={[styles.buttonWrapper, buttonScaleStyle]}>
                  {/* Pulse ring */}
                  <Animated.View style={[styles.pulseRing, styles.pulseRingRed, pulseRingStyle]} />
                  <View style={[styles.checkButton, styles.checkOutButton, (locationLoading || submitting !== null) && styles.loadingButton]}>
                    <View style={styles.checkButtonInner}>
                      {(locationLoading || submitting !== null) ? (
                        <Animated.View style={spinStyle}>
                          <MaterialCommunityIcons name="loading" size={48} color="white" />
                        </Animated.View>
                      ) : (
                        <MaterialCommunityIcons name="fingerprint" size={48} color="white" />
                      )}
                      <Text style={styles.checkButtonText}>Check Out</Text>
                      <Text style={styles.checkButtonSubtext}>
                        {locationLoading
                          ? "Getting location..."
                          : submitting === 'checkout'
                            ? "Marking check-out..."
                            : "Tap to clock out"}
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
      {ExitModal}
    </SafeAreaView>
  )
}

export default Home
