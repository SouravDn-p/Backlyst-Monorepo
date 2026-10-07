export function getUtcWeekRange(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(d);
  weekStart.setUTCDate(d.getUTCDate() + diffToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

export function getPreviousUtcWeekStart(weekStart: Date) {
  const previous = new Date(weekStart);
  previous.setUTCDate(previous.getUTCDate() - 7);
  previous.setUTCHours(0, 0, 0, 0);
  return previous;
}
