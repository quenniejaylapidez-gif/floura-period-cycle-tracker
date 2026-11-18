import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_USER_PROFILE,
  DEFAULT_USER_SETTINGS,
  DELAY_REMINDER_COPY,
  EDUCATIONAL_ARTICLES,
  PREGNANCY_TEST_EDUCATION,
} from '../src/data/catalogs';
import {
  buildCsvExport,
  buildJsonExport,
  parseJsonBackup,
} from '../src/db/indexedDb';
import type {
  DailyLog,
  DelayReminderEvent,
  PeriodRecord,
  PersonalActivityEntry,
  UserSettings,
} from '../src/types/cycle';
import {
  calculateCycleSummary,
  calculateMenstrualHistoryStats,
  calculatePeriodDelayStatus,
  evaluatePeriodDelayReminder,
  getDayCalendarStatus,
  getPeriodDurationDays,
} from '../src/utils/cycleCalculations';
import { addDaysISO, diffDaysISO } from '../src/utils/dateUtils';

function makePeriod(
  id: string,
  startDate: string,
  endDate: string | null,
  isOngoing: boolean = false
): PeriodRecord {
  return {
    id,
    startDate,
    endDate,
    isOngoing,
    flowIntensity: 'medium',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };
}

function makeSettings(overrides?: Partial<UserSettings>): UserSettings {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...overrides,
    reminders: {
      ...DEFAULT_USER_SETTINGS.reminders,
      ...(overrides?.reminders ?? {}),
    },
    periodDelayReminder: {
      ...(DEFAULT_USER_SETTINGS.periodDelayReminder ?? {
        enabled: false,
        initialDaysAfter: 1,
        followUpDaysAfter: 7,
        time: '09:00',
      }),
      ...(overrides?.periodDelayReminder ?? {}),
    },
  };
}

test('1. Period delay calculations distinguish on-time, initial delay, and follow-up delay', () => {
  const periods = [
    makePeriod('p1', '2026-01-01', '2026-01-05'),
    makePeriod('p2', '2026-01-29', '2026-02-02'), // 28-day cycle
  ];
  const settings = makeSettings();
  // Estimated next period: 2026-02-26
  const onTimeSummary = calculateCycleSummary(periods, settings, '2026-02-26');
  const onTimeDelay = calculatePeriodDelayStatus(onTimeSummary, '2026-02-26');
  assert.equal(onTimeDelay.hasValidPrediction, true);
  assert.equal(onTimeDelay.isDelayed, false);
  assert.equal(onTimeDelay.daysPastEstimated, 0);

  const oneDayLateSummary = calculateCycleSummary(periods, settings, '2026-02-27');
  const oneDayLate = calculatePeriodDelayStatus(oneDayLateSummary, '2026-02-27');
  assert.equal(oneDayLate.hasValidPrediction, true);
  assert.equal(oneDayLate.isDelayed, true);
  assert.equal(oneDayLate.daysPastEstimated, 1);
  assert.equal(oneDayLate.canActivateReminder, true);

  const sevenDaysLateSummary = calculateCycleSummary(periods, settings, '2026-03-05');
  const sevenDaysLate = calculatePeriodDelayStatus(sevenDaysLateSummary, '2026-03-05');
  assert.equal(sevenDaysLate.daysPastEstimated, 7);
  assert.equal(sevenDaysLate.canActivateReminder, true);
});

test('2. No prediction available prevents false delay activation', () => {
  const settings = makeSettings({
    periodDelayReminder: { enabled: true, initialDaysAfter: 1, followUpDaysAfter: 7, time: '09:00' },
  });
  const emptySummary = calculateCycleSummary([], settings, '2026-03-01');
  const emptyDelay = calculatePeriodDelayStatus(emptySummary, '2026-03-01');
  assert.equal(emptyDelay.hasValidPrediction, false);
  assert.equal(emptyDelay.isDelayed, false);
  assert.equal(emptyDelay.canActivateReminder, false);

  const evalResult = evaluatePeriodDelayReminder({
    delayStatus: emptyDelay,
    settings,
    reminderHistory: [],
    todayISO: '2026-03-01',
    currentHHMM: '10:00',
  });
  assert.equal(evalResult.shouldTrigger, false);
});

test('3. Irregular / variable cycles suppress automated triggers within natural variability window', () => {
  // Cycles: 24d and 36d -> variable (spread 12d, avg 30d)
  const periods = [
    makePeriod('p1', '2025-11-01', '2025-11-05'),
    makePeriod('p2', '2025-11-25', '2025-11-29'), // +24d
    makePeriod('p3', '2025-12-31', '2026-01-04'), // +36d -> avg 30d -> est 2026-01-30, rangeEnd +6d = 2026-02-05
  ];
  const settings = makeSettings({
    periodDelayReminder: { enabled: true, initialDaysAfter: 1, followUpDaysAfter: 7, time: '09:00' },
  });

  const withinVarSummary = calculateCycleSummary(periods, settings, '2026-02-01');
  assert.equal(withinVarSummary.regularityStatus, 'variable');
  const withinVarDelay = calculatePeriodDelayStatus(withinVarSummary, '2026-02-01');
  assert.equal(withinVarDelay.isDelayed, true);
  assert.equal(withinVarDelay.isWithinVariabilityWindow, true);
  assert.equal(withinVarDelay.canActivateReminder, false);

  const pastVarSummary = calculateCycleSummary(periods, settings, '2026-02-07');
  const pastVarDelay = calculatePeriodDelayStatus(pastVarSummary, '2026-02-07');
  assert.equal(pastVarDelay.isWithinVariabilityWindow, false);
  assert.equal(pastVarDelay.canActivateReminder, true);
});

test('4. Missing or incomplete period records never count as proof of delay', () => {
  const periods = [
    makePeriod('p1', '2026-01-01', '2026-01-05'),
    makePeriod('p2', '2026-01-29', null, false), // Incomplete: missing endDate & not ongoing
  ];
  const settings = makeSettings({
    periodDelayReminder: { enabled: true, initialDaysAfter: 1, followUpDaysAfter: 7, time: '09:00' },
  });

  const summary = calculateCycleSummary(periods, settings, '2026-03-02');
  const delayStatus = calculatePeriodDelayStatus(summary, '2026-03-02');
  assert.equal(delayStatus.hasIncompleteLatestRecord, true);
  assert.equal(delayStatus.hasValidPrediction, false);
  assert.equal(delayStatus.isDelayed, false);
  assert.equal(delayStatus.canActivateReminder, false);
});

test('5 & 6 & 7. Reminder scheduling rules, exact copy, duplicate prevention, and cancellation after logging', () => {
  const periods = [
    makePeriod('p1', '2026-01-01', '2026-01-05'),
    makePeriod('p2', '2026-01-29', '2026-02-02'), // est next: 2026-02-26
  ];
  const settings = makeSettings({
    periodDelayReminder: { enabled: true, initialDaysAfter: 1, followUpDaysAfter: 7, time: '09:00' },
  });

  // Before configured time
  const summary1 = calculateCycleSummary(periods, settings, '2026-02-27');
  const delay1 = calculatePeriodDelayStatus(summary1, '2026-02-27');
  const tooEarly = evaluatePeriodDelayReminder({
    delayStatus: delay1,
    settings,
    reminderHistory: [],
    todayISO: '2026-02-27',
    currentHHMM: '08:30',
  });
  assert.equal(tooEarly.shouldTrigger, false);

  // Initial trigger at 1 day past
  const initialEval = evaluatePeriodDelayReminder({
    delayStatus: delay1,
    settings,
    reminderHistory: [],
    todayISO: '2026-02-27',
    currentHHMM: '09:15',
  });
  assert.equal(initialEval.shouldTrigger, true);
  assert.equal(initialEval.kind, 'initial');
  assert.equal(initialEval.body, DELAY_REMINDER_COPY.initial);
  assert.equal(initialEval.privacySafeBody, DELAY_REMINDER_COPY.privacySafeLockScreen);

  const initialRecorded: DelayReminderEvent = {
    id: 'delay_2026-01-29_initial_2026-02-27',
    cycleAnchorStartDate: '2026-01-29',
    estimatedDate: '2026-02-26',
    kind: 'initial',
    daysPastEstimated: 1,
    triggeredAt: Date.now(),
    triggeredDate: '2026-02-27',
    status: 'triggered',
    notificationDispatched: true,
  };

  // Duplicate prevention on initial
  const duplicateEval = evaluatePeriodDelayReminder({
    delayStatus: delay1,
    settings,
    reminderHistory: [initialRecorded],
    todayISO: '2026-02-27',
    currentHHMM: '10:00',
  });
  assert.equal(duplicateEval.shouldTrigger, false);

  // Follow-up trigger at 7 days past
  const summary7 = calculateCycleSummary(periods, settings, '2026-03-05');
  const delay7 = calculatePeriodDelayStatus(summary7, '2026-03-05');
  const followUpEval = evaluatePeriodDelayReminder({
    delayStatus: delay7,
    settings,
    reminderHistory: [initialRecorded],
    todayISO: '2026-03-05',
    currentHHMM: '09:05',
  });
  assert.equal(followUpEval.shouldTrigger, true);
  assert.equal(followUpEval.kind, 'follow_up');
  assert.equal(followUpEval.body, DELAY_REMINDER_COPY.follow_up);

  // Cancellation when period is logged or dismissed
  const cancelledEvent: DelayReminderEvent = {
    ...initialRecorded,
    id: 'cancel_1',
    status: 'cancelled_period_logged',
  };
  const afterCancel = evaluatePeriodDelayReminder({
    delayStatus: delay7,
    settings,
    reminderHistory: [initialRecorded, cancelledEvent],
    todayISO: '2026-03-05',
    currentHHMM: '09:05',
  });
  assert.equal(afterCancel.shouldTrigger, false);
});

test('8, 9, 10 & 11. Period duration, cycle length, stats excluding incomplete/ongoing, and ongoing handling', () => {
  assert.equal(getPeriodDurationDays(makePeriod('a', '2026-02-01', '2026-02-01')), 1);
  assert.equal(getPeriodDurationDays(makePeriod('b', '2026-02-01', '2026-02-05')), 5);
  assert.equal(getPeriodDurationDays(makePeriod('c', '2026-02-01', null, true)), null);

  const periods = [
    makePeriod('p1', '2026-01-01', '2026-01-04'), // 4d
    makePeriod('p2', '2026-01-29', '2026-02-03'), // 6d (cycle 28d)
    makePeriod('p3', '2026-02-28', null, false),  // incomplete (cycle 30d)
    makePeriod('p4', '2026-03-28', null, true),   // ongoing (cycle 28d)
  ];
  const summary = calculateCycleSummary(periods, makeSettings(), '2026-03-30');
  const stats = calculateMenstrualHistoryStats(summary);

  assert.equal(stats.completedPeriodsCount, 2);
  assert.equal(stats.incompletePeriodsCount, 1);
  assert.equal(stats.ongoingPeriodsCount, 1);
  assert.equal(stats.averagePeriodDuration, 5); // (4 + 6) / 2, excluding incomplete & ongoing
  assert.equal(stats.shortestPeriodDuration, 4);
  assert.equal(stats.longestPeriodDuration, 6);
  assert.equal(stats.averageCycleLength, 29); // round((28 + 30 + 28)/3) = 29
  assert.equal(stats.shortestCycleLength, 28);
  assert.equal(stats.longestCycleLength, 30);
  assert.equal(stats.cycleVariabilityDays, 2);

  // Ongoing period suppresses delay trigger & marks today as recorded ongoing day
  const delayStatus = calculatePeriodDelayStatus(summary, '2026-03-30');
  assert.equal(delayStatus.hasOngoingPeriod, true);
  assert.equal(delayStatus.hasValidPrediction, false);

  const todayCal = getDayCalendarStatus('2026-03-30', summary, '2026-03-30');
  assert.equal(todayCal.isRecordedPeriod, true);
  assert.equal(todayCal.isOngoingPeriodDay, true);
  assert.equal(todayCal.isPastEstimatedWindow, false);
});

test('12. Month, year, and leap-year date boundaries + calendar past-estimate transparency', () => {
  // Leap year 2024 vs non-leap 2025
  assert.equal(addDaysISO('2024-02-28', 2), '2024-03-01');
  assert.equal(addDaysISO('2025-02-28', 2), '2025-03-02');
  assert.equal(diffDaysISO('2025-12-30', '2026-01-02'), 3);

  const periods = [makePeriod('p1', '2025-12-20', '2025-12-24')];
  const settings = makeSettings({ manualCycleLength: 28, useManualPreferences: true });
  const summary = calculateCycleSummary(periods, settings, '2026-01-20');
  // Estimated next period: 2026-01-17; today is 2026-01-20 -> 3 days past
  const pastEstDay = getDayCalendarStatus('2026-01-18', summary, '2026-01-20');
  assert.equal(pastEstDay.isRecordedPeriod, false);
  assert.equal(pastEstDay.isPastEstimatedWindow, true);
});

test('13 & 14. Backup JSON/CSV persistence round-trip, privacy defaults, and PWA limitation / education copy', () => {
  const periods = [makePeriod('p1', '2026-02-01', '2026-02-05')];
  const logs: Record<string, DailyLog> = {
    '2026-02-01': {
      date: '2026-02-01',
      symptoms: [{ id: 'cramps', severity: 'mild' }],
      moods: [],
      notes: 'Rest day',
      updatedAt: 1700000000000,
    },
  };
  const activities: PersonalActivityEntry[] = [
    {
      id: 'act1',
      date: '2026-02-10',
      context: 'unspecified',
      notes: 'Private note',
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
  ];
  const reminders: DelayReminderEvent[] = [
    {
      id: 'rem1',
      cycleAnchorStartDate: '2026-02-01',
      estimatedDate: '2026-03-01',
      kind: 'initial',
      daysPastEstimated: 1,
      triggeredAt: 1700000000000,
      triggeredDate: '2026-03-02',
      status: 'triggered',
      notificationDispatched: false,
    },
  ];
  const settings = makeSettings({
    periodDelayReminder: { enabled: true, initialDaysAfter: 2, followUpDaysAfter: 8, time: '10:00' },
  });

  // Default export omits personalActivities, includes reminderHistory
  const defaultJson = buildJsonExport(
    periods,
    logs,
    settings,
    DEFAULT_USER_PROFILE,
    activities,
    false,
    reminders
  );
  const parsedDefault = parseJsonBackup(defaultJson);
  assert.equal(parsedDefault.periods.length, 1);
  assert.equal(parsedDefault.personalActivities.length, 0);
  assert.equal(parsedDefault.reminderHistory.length, 1);
  assert.equal(parsedDefault.settings.periodDelayReminder?.initialDaysAfter, 2);

  // Opt-in export includes personalActivities + CSV includes DELAY_REMINDER row
  const csv = buildCsvExport(periods, logs, activities, true, reminders);
  assert.match(csv, /PERIOD,2026-02-01,2026-02-05/);
  assert.match(csv, /PERSONAL_ACTIVITY,2026-02-10/);
  assert.match(csv, /DELAY_REMINDER,2026-03-02,2026-03-01/);

  // Verify educational article & PWA limitation disclosures exist
  assert.ok(PREGNANCY_TEST_EDUCATION.pwaLimitationNote.includes('completely closed'));
  assert.ok(
    EDUCATIONAL_ARTICLES.some((a) => a.id === 'late-period-and-pregnancy-testing')
  );
});
