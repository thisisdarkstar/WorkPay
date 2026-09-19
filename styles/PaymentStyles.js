import { StyleSheet } from 'react-native';

// Styles for app/(employee)/Payment.jsx.
// Kept outside the app/ directory so Expo Router does not treat it as a route.
export const styles = StyleSheet.create({
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
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  }
});
