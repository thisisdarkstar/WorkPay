import { StyleSheet, Text, View } from "react-native";
import { calculateTotalHours, convertOvertime, formatDay, formatTime } from "../../utils/TimeUtils";





function DataCard({ data }) {

  return (
    <View style={styles.card}>
      {/* first row */}
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.title}>Day</Text>
          <Text style={styles.content}>{formatDay(data.date)}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.title}>Check In</Text>
          <Text style={styles.content}>{formatTime(data.checkInTime)}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.title}>Check Out</Text>
          <Text style={styles.content}>{formatTime(data.checkOutTime)}</Text>
        </View>
      </View>

      {/* second row */}
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.title}>Status</Text>
          <Text
            style={[
              styles.content,
              { color: data.status === "ABSENT" ? "#ff6b6b" : data.status === "PRESENT" ? "#4caf50" : "#ff9800", fontWeight: "bold", fontSize: 16 },
            ]}
          >
            {data.status}
          </Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.title}>Total Hours</Text>
          <Text style={styles.content}>{calculateTotalHours(data.checkInTime, data.checkOutTime)}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.title}>OverTime</Text>
          <Text style={styles.content}>{convertOvertime(data.overTime ?? data.overtime ?? 0)}</Text>
        </View>
      </View>
    </View>
  );
}

export default DataCard;

const styles = StyleSheet.create({
  card: {
    width: "90%",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
    padding: 10,
    gap: 20,
    backgroundColor: "#192633",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  col: {
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    color: "#fff",
  },
});
