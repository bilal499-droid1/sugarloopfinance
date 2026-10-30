import cron from 'node-cron';
import LedgerPeriod from '../models/LedgerPeriod.js';
import { createPeriodSnapshot } from './snapshotService.js';

// Runs every minute. If the active period has a scheduledEndDate in the past,
// close it and open the next one automatically.
async function checkPeriodRollover() {
  const now = new Date();
  const active = await LedgerPeriod.findOne({ endDate: null, scheduledEndDate: { $ne: null } });
  if (!active) return;
  if (active.scheduledEndDate > now) return; // not yet time

  active.endDate = active.scheduledEndDate;
  await active.save();

  // Safety snapshot before opening the next period.
  await createPeriodSnapshot(active).catch((err) => console.error('[snapshot] Failed:', err.message));

  const label = active.nextPeriodLabel || formatMonthLabel(active.nextPeriodStartDate || active.scheduledEndDate);
  const startDate = active.nextPeriodStartDate || addOneSecond(active.scheduledEndDate);

  await LedgerPeriod.create({ label, startDate });
  console.log(`[periods] Auto-rolled: closed "${active.label}", opened "${label}"`);
}

function formatMonthLabel(date) {
  return new Date(date).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function addOneSecond(date) {
  return new Date(new Date(date).getTime() + 1000);
}

export function startPeriodScheduler() {
  // Run every minute to catch the rollover within a minute of the scheduled time.
  cron.schedule('* * * * *', () => {
    checkPeriodRollover().catch((err) => console.error('[periods] Rollover error:', err.message));
  });
  console.log('[periods] Scheduler started');
}
