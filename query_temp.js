// Simulate the notification service logic
const sqlite3 = require('better-sqlite3');
const db = new sqlite3('dev.db');

const userId = 'cmqmqvid30004pourvp8byv4c';
const now = new Date(2026, 6, 4); // July 4, 2026 local time
const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
const endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 7));
const daysAhead = 7;

console.log('Today (UTC):', today.toISOString());
console.log('End date (UTC):', endDate.toISOString());

// Compute months between
function monthsBetween(start, end) {
  const months = [];
  const cursor = new Date(Date.UTC(start.getFullYear(), start.getMonth(), 1));
  const last = new Date(Date.UTC(end.getFullYear(), end.getMonth(), 1));
  while (cursor.getTime() <= last.getTime()) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

const months = monthsBetween(today, endDate);
console.log('Window months:', months);

// Simulate notification query
const invoices = db.prepare(`SELECT id, month, dueDate, status, amount FROM CardInvoice WHERE userId = ? AND status = 'PENDING' AND month IN (${months.map(() => '?').join(',')}) AND dueDate <= ?`).all(userId, ...months, endDate.toISOString());
console.log('\nInvoices in window:', JSON.stringify(invoices, null, 2));

const occurrences = db.prepare(`SELECT fco.id, fco.month, fco.status, fco.amount, fco.fixedCostId, fc.dueDay, fc.name, fc.type FROM FixedCostOccurrence fco JOIN FixedCost fc ON fc.id = fco.fixedCostId WHERE fco.userId = ? AND fco.month IN (${months.map(() => '?').join(',')}) AND fco.status = 'PENDING' AND fco.deletedAt IS NULL AND fc.dueDay IS NOT NULL AND fc.type = 'EXPENSE'`).all(userId, ...months);
console.log('\nExpense occurrences in window:', JSON.stringify(occurrences, null, 2));

function fixedCostDueDate(month, dueDay) {
  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();
  const d = new Date(year, monthIndex - 1, Math.min(dueDay, lastDay));
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

for (const occ of occurrences) {
  const dueDate = fixedCostDueDate(occ.month, occ.dueDay);
  const withinWindow = dueDate.getTime() <= endDate.getTime();
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
  console.log(`${occ.name} (dueDay=${occ.dueDay}): computed due=${dueDate.toISOString()}, withinWindow=${withinWindow}, daysUntilDue=${diffDays}`);
}

db.close();
