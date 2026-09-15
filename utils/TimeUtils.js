

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


export function calculateHoursManual(checkin, checkout) {
    if (!checkin || !checkout) return "00:00"; // fallback when data not ready

    function parseTime(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return 0;
        const parts = timeStr.trim().split(' ');
        if (parts.length < 2) return 0;
        const [time, period] = parts;
        const [hours, minutes] = time.split(':').map(Number);
        
        let hour24 = hours || 0;
        if (period && period.toLowerCase() === 'pm' && hours !== 12) {
            hour24 += 12;
        } else if (period && period.toLowerCase() === 'am' && hours === 12) {
            hour24 = 0;
        }
        
        return hour24 * 60 + (minutes || 0); // total minutes
    }
    
    const checkinMinutes = parseTime(checkin);
    const checkoutMinutes = parseTime(checkout);

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