export type ContributionDay = { date: string; count: number; level: number; weekday: number };

export function streaks(days: ContributionDay[]) {
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0, current = 0, running = 0;
  for (const day of ordered) { running = day.count > 0 ? running + 1 : 0; longest = Math.max(longest, running); }
  for (const day of [...ordered].reverse()) { if (day.count === 0) break; current++; }
  return { current, longest };
}

export function topWeekday(days: ContributionDay[]) {
  const totals = Array.from({ length: 7 }, () => 0);
  days.forEach(day => totals[day.weekday] += day.count);
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][totals.indexOf(Math.max(...totals))];
}
