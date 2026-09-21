import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useContextData } from '../../context/EmployeeContext'
import { api, getApiErrorMessage } from '../../services/ApiService'
import { CacheKeys, getSWR, TTL } from '../../services/CacheService'
import { styles } from '../../styles/PaymentStyles'


const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const getJoinedYear = (date) => {
  if (!date) return null;
  const match = String(date).match(/^(\d{4})/);
  if (match) {
    const yr = parseInt(match[1], 10);
    if (!isNaN(yr)) return yr;
  }
  const d = new Date(date);
  if (!isNaN(d.getFullYear())) {
    return d.getFullYear();
  }
  return null;
};

function Payment() {
  const today = new Date();
  const currentMonth = months[today.getMonth()];
  const currentYear = today.getFullYear();


  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [paymentData, setPaymentData] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast, employeeData } = useContextData();

  const joinedDate = paymentData?.joinedDate || employeeData?.joinedDate;
  const joinedYear = getJoinedYear(joinedDate);
  const startYear = (joinedYear && joinedYear <= currentYear) ? joinedYear : currentYear;
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (selectedYear < startYear || selectedYear > currentYear) {
      setSelectedYear(currentYear);
    }
  }, [startYear, currentYear, selectedYear]);

  const [expanded, setExpanded] = useState(null);

  // Helper function to calculate totals for a month's transactions
  const calculateMonthTotals = (transactions) => {
    if (!Array.isArray(transactions)) return { overtime: 0, deduction: 0, advance: 0, bonus: 0 };
    const overtime = transactions.reduce((acc, it) => acc + (it.payType === "OVERTIME" ? (Number(it.amount) || 0) : 0), 0);
    const deduction = transactions.reduce((acc, it) => acc + (it.payType === "DEDUCTION" ? (Number(it.amount) || 0) : 0), 0);
    const advance = transactions.reduce((acc, it) => acc + (it.payType === "ADVANCE" ? (Number(it.amount) || 0) : 0), 0);
    const bonus = transactions.reduce((acc, it) => acc + (it.payType === "BONUS" ? (Number(it.amount) || 0) : 0), 0);
    
    return { overtime, deduction, advance, bonus };
  };

  // Helper function to determine payment status.
  // The backend is the single source of truth: it sets `isPaid` when a SALARY
  // transaction exists for the month. We trust that flag rather than
  // re-deriving it on the client (which risked disagreeing with the server).
  const getPaymentStatus = (monthData) => {
    return monthData?.isPaid
      ? { text: "PAID", isPaid: true }
      : { text: "PENDING", isPaid: false };
  };

  const getSalaryPaidDate = (monthData) => {
    const transactions = monthData?.transactions || [];
    const salaryTx = transactions.find(t => t.payType === "SALARY");
    return salaryTx?.date || null;
  };

  const fetchPaymentHistory = useCallback(async ({ forceRefresh = false } = {}) => {
    try {
      setLoading(true);
      // Past years are immutable → cache for a day. The current year can still
      // change (admin adds transactions), so use a short TTL + SWR: the screen
      // paints from cache instantly and revalidates in the background on focus.
      const isPastYear = selectedYear < currentYear;
      await getSWR(
        CacheKeys.transactionsEmployee(selectedYear),
        async () => {
          const response = await api.get('/api/transactions/employee', {
            params: { year: selectedYear },
          });
          return response.data;
        },
        {
          ttl: isPastYear ? TTL.DAY : TTL.FIVE_MIN,
          forceRefresh,
          onData: (data) => setPaymentData(data),
        }
      );
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to fetch payment history'), 'Error');
      console.log(err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, currentYear, showToast]);

  useFocusEffect(
    useCallback(() => {
      fetchPaymentHistory();
    }, [fetchPaymentHistory])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPaymentHistory({ forceRefresh: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchPaymentHistory]);

  // Current month calculations
  const isBeforeJoining = paymentData?.currentTransaction?.isBeforeJoining;
  const currentMonthTransactions = paymentData?.currentTransaction?.transactions || [];
  const currentMonthTotals = calculateMonthTotals(currentMonthTransactions);
  const currentMonthTotal = isBeforeJoining 
    ? 0 
    : (paymentData?.baseSalary || 0) + currentMonthTotals.overtime + currentMonthTotals.bonus - currentMonthTotals.deduction - currentMonthTotals.advance;
  const currentMonthStatus = isBeforeJoining 
    ? { text: "UPCOMING", isPaid: false } 
    : getPaymentStatus(paymentData?.currentTransaction);
  const currentSalaryPaidDate = getSalaryPaidDate(paymentData?.currentTransaction);

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 30, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A9EFF']}
            tintColor="#4A9EFF"
          />
        }
      >
        
        {/* salary overview */}
        <View style={styles.salaryOverviewContainer}>
          <View style={styles.headerContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Text style={styles.headerText}>
                {currentMonth} {currentYear} Salary Overview
              </Text>
              <View style={[styles.statusBadge, { 
                backgroundColor: isBeforeJoining 
                  ? 'rgba(74, 158, 255, 0.15)' 
                  : (currentMonthStatus.isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 184, 0, 0.15)'), 
                borderColor: isBeforeJoining 
                  ? '#4A9EFF' 
                  : (currentMonthStatus.isPaid ? '#10B981' : '#FFB800') 
              }]}>
                <MaterialCommunityIcons 
                  name={isBeforeJoining ? "calendar-clock" : (currentMonthStatus.isPaid ? "check-circle" : "clock-outline")} 
                  size={13} 
                  color={isBeforeJoining ? '#4A9EFF' : (currentMonthStatus.isPaid ? '#10B981' : '#FFB800')} 
                />
                <Text style={[styles.statusBadgeText, { color: isBeforeJoining ? '#4A9EFF' : (currentMonthStatus.isPaid ? '#10B981' : '#FFB800') }]}>
                  {currentMonthStatus.text}
                </Text>
              </View>
            </View>
            <Text style={styles.headerSubText}>
              {isBeforeJoining 
                ? `Official joining date: ${joinedDate || 'Upcoming'}. Payroll will commence for your active employment period.`
                : currentMonthStatus.isPaid && currentSalaryPaidDate 
                  ? `Salary disbursed on ${currentSalaryPaidDate}.`
                  : `This is a summary of your salary for the month of ${currentMonth} ${currentYear}.`
              }
            </Text>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Text style={styles.detailText}>Base Salary :</Text>
              <Text style={styles.detailAmount}>Rs {isBeforeJoining ? 0 : (paymentData?.baseSalary || 0)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailText}>OverTime :</Text>
              <Text style={styles.detailAmount}>+ Rs {currentMonthTotals.overtime}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailText}>Bonus :</Text>
              <Text style={[styles.detailAmount, { color: '#10B981' }]}>+ Rs {currentMonthTotals.bonus}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailText}>Deduction :</Text>
              <Text style={styles.detailAmount}>- Rs {currentMonthTotals.deduction}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailText}>Advance Payment :</Text>
              <Text style={styles.detailAmount}>- Rs {currentMonthTotals.advance}</Text>
            </View>
            <View style={[styles.detailItem,{borderTopWidth: 1, borderTopColor: '#ccc',paddingTop:10, marginTop:10}]}>
              <Text style={styles.detailText}>Total :</Text>
              <Text style={styles.detailAmount}>Rs {currentMonthTotal}</Text>
            </View>

            <View style={styles.alert}>
              <MaterialCommunityIcons 
                name={isBeforeJoining ? "information-outline" : "alert-circle-outline"} 
                size={24} 
                color={isBeforeJoining ? "#4A9EFF" : "#cce6ff"} 
              />
              <Text style={styles.alertText}>
                {isBeforeJoining 
                  ? "Employment has not commenced for this pay period. No salary is due."
                  : "Salary will be credited on the last day of the month."}
              </Text>
            </View>
          </View>
        </View>

        {/* history */}
        <View style={styles.historyContainer}>
          <Text style={styles.historyText}>Payment history</Text>

          <View>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setOpen(!open)}
            >
              <Text style={styles.dropdownButtonText}>{selectedYear}</Text>
              <MaterialCommunityIcons 
                name={open ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>

            {open && (
              <View style={styles.dropdownList}>
                {years.map(item => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedYear(item)
                      setOpen(false)
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.historySubText}>
            Showing payments of {selectedYear}
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <>
              {paymentData?.previousTransaction && paymentData.previousTransaction.length > 0 ? (
                paymentData.previousTransaction.map((monthData, index) => {
                  const monthTotals = calculateMonthTotals(monthData.transactions);
                  const monthTotal = (monthData.baseSalary || 0) + monthTotals.overtime + monthTotals.bonus - monthTotals.deduction - monthTotals.advance;
                  const statusInfo = getPaymentStatus(monthData);
                  const salaryDate = getSalaryPaidDate(monthData);
                  // Stable id per month so the correct card stays expanded even if
                  // the list order changes (BUG-005). Falls back to index if month missing.
                  const itemKey = monthData.month ? `${monthData.month}-${selectedYear}` : `row-${index}`;
                  const isOpen = expanded === itemKey;

                  return (
                    <View style={styles.historyCard} key={itemKey}>
                      <TouchableOpacity 
                        style={styles.historyCardHeader}
                        onPress={() => setExpanded(isOpen ? null : itemKey)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.historyCardTitle}>{monthData.month} {selectedYear}</Text>
                          <View style={[styles.statusBadge, { 
                            backgroundColor: statusInfo.isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 184, 0, 0.15)', 
                            borderColor: statusInfo.isPaid ? '#10B981' : '#FFB800' 
                          }]}>
                            <Text style={[styles.statusBadgeText, { color: statusInfo.isPaid ? '#10B981' : '#FFB800' }]}>
                              {statusInfo.text}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.historyCardAmount}>Rs {monthTotal}</Text>
                        <MaterialCommunityIcons 
                          name={isOpen ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color="#fff" 
                          style={{ marginLeft: 10 }}
                        />
                      </TouchableOpacity>

                      {isOpen && (
                        <View style={styles.historyCardDetails}>
                          {statusInfo.isPaid && salaryDate && (
                            <View style={[styles.detailItem, { backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: 8, borderRadius: 6 }]}>
                              <Text style={[styles.detailText, { color: '#10B981', fontSize: 13 }]}>Disbursed on:</Text>
                              <Text style={[styles.detailAmount, { color: '#10B981', fontSize: 13 }]}>{salaryDate}</Text>
                            </View>
                          )}
                          <View style={styles.detailItem}>
                            <Text style={styles.detailText}>Base Salary :</Text>
                            <Text style={styles.detailAmount}>Rs {monthData.baseSalary}</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailText}>OverTime :</Text>
                            <Text style={styles.detailAmount}>+ Rs {monthTotals.overtime}</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailText}>Bonus :</Text>
                            <Text style={[styles.detailAmount, { color: '#10B981' }]}>+ Rs {monthTotals.bonus}</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailText}>Deduction :</Text>
                            <Text style={styles.detailAmount}>- Rs {monthTotals.deduction}</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailText}>Advance Payment :</Text>
                            <Text style={styles.detailAmount}>- Rs {monthTotals.advance}</Text>
                          </View>
                          <View style={[styles.detailItem,{borderTopWidth: 1, borderTopColor: '#ccc',paddingTop:10, marginTop:10}]}>
                            <Text style={styles.detailText}>Total :</Text>
                            <Text style={styles.detailAmount}>Rs {monthTotal}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={48} color="#666" />
                  <Text style={styles.emptyText}>No payment history found for {selectedYear}</Text>
                  <Text style={styles.emptySubText}>Payment records will appear here once transactions are made.</Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Payment
