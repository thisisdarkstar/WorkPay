import { StyleSheet } from 'react-native';

// Styles for app/(admin)/SalaryManagement.jsx.
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

  // Month Overview
  monthOverview: {
    backgroundColor: '#192633',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  monthSubtitle: {
    fontSize: 14,
    color: '#8A9BAE',
    marginTop: 4,
  },
  monthStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#8A9BAE',
  },

  // List Content
  listContent: {
    padding: 16,
    gap: 12,
  },

  // Employee Cards
  employeeCard: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  employeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  employeeBasicInfo: {
    flex: 1,
    gap: 2,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  employeePhone: {
    fontSize: 12,
    color: '#8A9BAE',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Salary Breakdown
  salaryBreakdown: {
    backgroundColor: '#111a22',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  salaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salaryLabel: {
    fontSize: 13,
    color: '#8A9BAE',
  },
  salaryAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  finalSalaryRow: {
    borderTopWidth: 1,
    borderTopColor: '#2A3441',
    paddingTop: 8,
    marginTop: 4,
  },
  finalSalaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  finalSalaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7ED321',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  settleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7ED321',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minWidth: '100%',
  },
  settleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  advanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E220',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
  },
  advanceButtonText: {
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '600',
  },
  deductionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5A62320',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
  },
  deductionButtonText: {
    color: '#F5A623',
    fontSize: 12,
    fontWeight: '600',
  },
  bonusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B98120',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
  },
  bonusButtonText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  paidIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7ED32120',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  paidText: {
    color: '#7ED321',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#192633',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    gap: 16,
  },
  modalEmployeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalEmployeePhone: {
    fontSize: 14,
    color: '#8A9BAE',
  },
  salaryInfoModal: {
    backgroundColor: '#111a22',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  modalSalaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalSalaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalSalaryText: {
    fontSize: 13,
    color: '#8A9BAE',
  },
  modalSalaryAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  maxAdvanceRow: {
    borderTopWidth: 1,
    borderTopColor: '#2A3441',
    paddingTop: 8,
    marginTop: 4,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  advanceInput: {
    backgroundColor: '#111a22',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  descriptionInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2A3441',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8A9BAE',
    fontSize: 16,
    fontWeight: '600',
  },
  processButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  processButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Month Navigation
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },

  // Overdue Alert
  overdueAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D0021B20',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D0021B40',
  },
  overdueAlertText: {
    flex: 1,
    fontSize: 14,
    color: '#D0021B',
    fontWeight: '500',
  },

  // Details Button
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A3441',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  detailsButtonText: {
    color: '#8A9BAE',
    fontSize: 12,
    fontWeight: '500',
  },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#192633',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  branchChipActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  branchChipText: {
    fontSize: 13,
    color: '#8A9BAE',
    fontWeight: '500',
  },
  branchChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  officeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(74, 158, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  officeBadgeText: {
    fontSize: 11,
    color: '#4A9EFF',
    fontWeight: '500',
  },
});
