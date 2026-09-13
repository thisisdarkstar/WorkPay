import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { url } from '../../constants/EnvValue'
import { useContextData } from '../../context/EmployeeContext'
import { getApiErrorMessage, getToken } from '../../services/ApiService'


const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

function Payment() {
  const today = new Date();
  const currentMonth = months[today.getMonth()];
  const currentYear = today.getFullYear();


  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [paymentData, setPaymentData] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {showToast} = useContextData();

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

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

  // Helper function to determine payment status
  const getPaymentStatus = (monthTransactions, baseSalary) => {
    return Array.isArray(monthTransactions) && monthTransactions.length > 0 ? "Paid" : "Pending";
  };

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const response = await axios.get(`${url}/api/transactions/employee?year=${selectedYear}`, {
        headers: {
          authorization: `Bearer ${token}`,
        }
      });
      const data = response.data;
      setPaymentData(data);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to fetch payment history'), 'Error');
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentHistory();
  }, [selectedYear]);

  // Current month calculations
  const currentMonthTransactions = paymentData?.currentTransaction?.transactions || [];
  const currentMonthTotals = calculateMonthTotals(currentMonthTransactions);
  const currentMonthTotal = (paymentData?.baseSalary || 0) + currentMonthTotals.overtime + currentMonthTotals.bonus - currentMonthTotals.deduction - currentMonthTotals.advance;

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        
        {/* salary overview */}
        <View style={styles.salaryOverviewContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>
              {currentMonth} {currentYear} Salary Overview
            </Text>
            <Text style={styles.headerSubText}>
              This is a summary of your salary for the month of {currentMonth} {currentYear}.
            </Text>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Text style={styles.detailText}>Base Salary :</Text>
              <Text style={styles.detailAmount}>Rs {paymentData?.baseSalary || 0}</Text>
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
              <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#cce6ff" />
              <Text style={styles.alertText}>Salary will be credited on the last day of the month.</Text>
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
                  const status = getPaymentStatus(monthData.transactions, monthData.baseSalary);
                  const itemId = `${monthData.month}- ${selectedYear}- ${index}`;
                  const isOpen = expanded === index;

                  return (
                    <View style={styles.historyCard} key={index}>
                      <TouchableOpacity 
                        style={styles.historyCardHeader}
                        onPress={() => setExpanded(isOpen ? null : index)}
                      >
                        <Text style={styles.historyCardTitle}>{monthData.month} {selectedYear}</Text>

                        {/* hide status for now */}
                        {/* <Text style={[styles.status, {color: status === "Paid" ? "#4dff91" : "#ffcc00"}]}>
                          {status}
                        </Text> */}
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

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#111a22',
  },
  salaryOverviewContainer: {
    backgroundColor: '#192633',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    width: '90%',
    alignSelf: "center",
    gap: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  detailsContainer:{
    width:"100%",
    gap:10
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 16,
    color: '#fff',
  },
  detailAmount: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  alert: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(77, 166, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(77, 166, 255, 0.3)",
    marginTop: 12,
    gap: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: "#cce6ff",
  },
  historyContainer: {
    backgroundColor: '#192633',
    borderRadius: 8,
    padding: 16,
    width: '90%',
    alignSelf: "center",
    gap:15
  },
  historyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  historySubText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 10,
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2a323d",
    padding: 12,
    borderRadius: 6,
  },
  dropdownButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  dropdownList: {
    backgroundColor: "#2a323d",
    marginTop: 6,
    borderRadius: 6,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  dropdownItemText: {
    color: "#fff",
    fontSize: 16,
  },
  historyCard: {
    backgroundColor: "#2a323d",
    borderRadius: 8,
    overflow: "hidden",
  },
  historyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  historyCardTitle: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
  },
  historyCardAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 10,
  },
  status: {
    fontSize: 14,
    marginHorizontal: 10,
  },
  historyCardDetails: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#ccc',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  }
})