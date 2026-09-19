import { StyleSheet } from 'react-native';

// Styles for app/(admin)/(employeeManagement)/EmployeeDetails.jsx.
// Kept outside the app/ directory so Expo Router does not treat it as a route.
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111a22',
  },
  header: {
    padding: 16,
    backgroundColor: '#192633',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 32,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },

  // Employee Info Card
  employeeInfoCard: {
    backgroundColor: '#192633',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf:"flex-start"
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  employeeInfo: {
    flex: 1,
    gap: 4,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  employeePhone: {
    fontSize: 14,
    color: '#8A9BAE',
  },
  employeeMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  employeeRole: {
    fontSize: 12,
    color: '#4A90E2',
    backgroundColor: '#4A90E220',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  employeeJoinDate: {
    fontSize: 12,
    color: '#8A9BAE',
  },
  salaryInfo: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  salaryText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  overtimeText: {
    fontSize: 14,
    color: '#F5A623',
    fontWeight: '500',
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#192633',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A9BAE',
  },
  activeTabText: {
    color: '#ffffff',
  },

  // Month Navigation
  monthContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Content Container
  contentContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },

  // Summary Cards
  summaryCard: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8A9BAE',
  },

  // Attendance Cards
  dataCard: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  timeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeLabel: {
    fontSize: 12,
    color: '#8A9BAE',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 'auto',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111a22',
    padding: 12,
    borderRadius: 8,
  },
  hoursItem: {
    alignItems: 'center',
    gap: 4,
  },
  hoursLabel: {
    fontSize: 12,
    color: '#8A9BAE',
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Payment Cards
  paymentCard: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentMonth: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentDetails: {
    gap: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#8A9BAE',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#2A3441',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7ED321',
  },
  paidDate: {
    fontSize: 12,
    color: '#8A9BAE',
    textAlign: 'right',
    marginTop: 8,
  },

  // Leave Cards
  leaveSummaryCard: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  leaveSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  leaveSummaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  leaveCard: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leaveDateContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  leaveDates: {
    flex: 1,
  },
  leaveDate: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  leaveStatus: {
    alignItems: 'flex-end',
    gap: 6,
  },
  leaveTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leaveTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  leaveStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leaveStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  leaveReason: {
    fontSize: 13,
    color: '#8A9BAE',
    marginTop: 4,
  },
  yearContainer: {
  marginHorizontal: 16,
  marginTop: 12,
  marginBottom: 4,
  backgroundColor: '#192633',
  borderRadius: 10,
  padding: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,
},
yearLabel: {
  color: '#8A9BAE',
  fontSize: 14,
  fontWeight: '600',
  marginBottom: 8,
},
yearDropdownButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#111a22',
  borderRadius: 8,
  paddingVertical: 10,
  paddingHorizontal: 16,
  marginBottom: 4,
  borderWidth: 1,
  borderColor: '#222c3a',
},
yearDropdownText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
},
yearDropdownList: {
  backgroundColor: '#111a22',
  borderRadius: 8,
  marginTop: 4,
  borderWidth: 1,
  borderColor: '#222c3a',
  overflow: 'hidden',
},
yearDropdownItem: {
  paddingVertical: 12,
  paddingHorizontal: 16,
},
yearDropdownItemText: {
  color: '#fff',
  fontSize: 15,
},

});
