

const months = [
  { number: 1, name: "January" },
  { number: 2, name: "February" },
  { number: 3, name: "March" },
  { number: 4, name: "April" },
  { number: 5, name: "May" },
  { number: 6, name: "June" },
  { number: 7, name: "July" },
  { number: 8, name: "August" },
  { number: 9, name: "September" },
  { number: 10, name: "October" },
  { number: 11, name: "November" },
  { number: 12, name: "December" },
];

export  const getTotalDaysInMonth = (month, year) => {
  return new Date(year, month, 0).getDate();
};

export const countPresentDays = (data) => {
  return data?.filter(item => item.status === "PRESENT" || item.status === "LATE")?.length || 0;
};

export const countAbsentDays = (data) => {
  return data?.filter(item => item.status === "ABSENT")?.length || 0;
};

export const calculateTotalOvertime = (data) => {
  if (!Array.isArray(data)) return 0;
  return data.reduce((total, item) => total + (Number(item?.overTime) || 0), 0) / 60;
};


export function formatMinutesToHHMM(totalMinutes) {
    if (!totalMinutes || isNaN(totalMinutes)) return "00:00";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}


/**
 * Robustly parse a clock-time string into minutes-since-midnight.
 * Accepts:
 *   - 12-hour with meridiem, with or without a space: "9:05 AM", "09:05AM", "12:00 pm"
 *   - 24-hour: "09:05", "23:45"
 * Returns null when the input cannot be parsed so callers can detect failure
 * instead of silently treating a bad value as midnight (00:00).
 */
export function parseClockTimeToMinutes(timeStr) {
    if (typeof timeStr !== 'string') return null;
    const str = timeStr.trim();
    if (!str) return null;

    // Match "H:MM" or "HH:MM" optionally followed by AM/PM (any spacing/case).
    const match = str.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3] ? match[3].toLowerCase() : null;

    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (minutes < 0 || minutes > 59) return null;

    if (meridiem) {
        // 12-hour clock: valid hours are 1..12
        if (hours < 1 || hours > 12) return null;
        if (meridiem === 'pm' && hours !== 12) hours += 12;
        else if (meridiem === 'am' && hours === 12) hours = 0;
    } else {
        // 24-hour clock: valid hours are 0..23
        if (hours < 0 || hours > 23) return null;
    }

    return hours * 60 + minutes;
}

export function calculateHoursManual(checkin, checkout) {
    if (!checkin || !checkout) return "00:00"; // fallback when data not ready

    const checkinMinutes = parseClockTimeToMinutes(checkin);
    const checkoutMinutes = parseClockTimeToMinutes(checkout);

    // If either value can't be parsed, don't fabricate a misleading duration.
    if (checkinMinutes === null || checkoutMinutes === null) return "00:00";

    let diffMinutes = checkoutMinutes - checkinMinutes;

    if (diffMinutes < 0) diffMinutes += 24 * 60; // overnight shift

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}



export function formatDay(dateString) {
  if (!dateString) return "—";
  // If it's a plain "YYYY-MM-DD" string, parse directly to avoid UTC→local shift
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [y, m, d] = dateString.split('-').map(Number);
    const month = months[m - 1]?.name || "";
    return `${d} ${month}`;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  const day = date.getDate();
  const month = months[date.getMonth()]?.name || "";
  return `${day} ${month}`;
}

export function formatTime(dateString) {
  if (!dateString) return "—";

  let str = dateString;
  if (typeof str !== 'string') {
    if (str instanceof Date) {
      str = str.toISOString();
    } else {
      return "—";
    }
  }

  // Remove Z so JS doesn’t convert
  const localString = str.replace("Z", "");
  const date = new Date(localString);
  if (isNaN(date.getTime())) return "—";

  const hours = date.getHours();
  const minutes = date.getMinutes();

  let h = hours % 12 || 12;
  let m = minutes.toString().padStart(2, "0");
  const ampm = hours < 12 ? "AM" : "PM";

  return `${h}:${m} ${ampm}`;
}

export function calculateTotalHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "0h";
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffMs = end - start;
  if (diffMs <= 0 || isNaN(diffMs)) return "0h";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export function convertOvertime(minutes) {
  const num = Number(minutes);
  if (!num || isNaN(num) || num <= 0) return "0h";
  const hrs = Math.floor(num / 60);
  const mins = Math.floor(num % 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}