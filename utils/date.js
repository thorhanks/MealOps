function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function formatDate(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekSunday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - dayOfWeek);
  return d.getTime();
}

function addDays(ts, days) {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export { startOfDay, endOfDay, formatDate, getWeekSunday, addDays };
