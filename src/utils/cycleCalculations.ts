import { DELAY_REMINDER_COPY } from '../data/catalogs';
import type {
  CompletedCycleStat,
  CyclePhaseInfo,
  CycleSummary,
  DelayReminderEvent,
  DelayReminderKind,
  EstimateSource,
  MenstrualHistoryStats,
  PeriodDelayStatus,
  PeriodRecord,
  UserSettings,
} from '../types/cycle';
import { addDaysISO, diffDaysISO, formatShortDate, getTodayISO } from './dateUtils';

const MIN_VALID_CYCLE_DAYS = 16;
const MAX_VALID_CYCLE_DAYS = 65;
const MIN_VALID_PERIOD_DAYS = 1;
const MAX_VALID_PERIOD_DAYS = 15;
const GENERAL_REFERENCE_CYCLE = 28;
const GENERAL_REFERENCE_PERIOD = 5;

export function getPeriodEffectiveEnd(period: PeriodRecord, todayISO: string): string {
  if (period.endDate && period.endDate >= period.startDate) {
    return period.endDate;
  }
  if (period.isOngoing) {
    return todayISO >= period.startDate ? todayISO : period.startDate;
  }
  // Incomplete non-ongoing record without endDate: treat as single recorded day until edited
  return period.startDate;
}

export function getPeriodDurationDays(period: PeriodRecord): number | null {
  if (!period.endDate || period.endDate < period.startDate) {
    return null;
  }
  return diffDaysISO(period.startDate, period.endDate) + 1;
}

export function findOverlappingPeriod(
  candidateStart: string,
  candidateEnd: string | null,
  candidateOngoing: boolean,
  existingPeriods: PeriodRecord[],
  excludeId?: string
): PeriodRecord | null {
  const todayISO = getTodayISO();
  const cEnd = candidateEnd ?? (candidateOngoing ? todayISO : candidateStart);

  for (const existing of existingPeriods) {
    if (excludeId && existing.id === excludeId) continue;
    const eStart = existing.startDate;
    const eEnd = getPeriodEffectiveEnd(existing, todayISO);
    if (candidateStart <= eEnd && cEnd >= eStart) {
      return existing;
    }
  }
  return null;
}

export function calculateCycleSummary(
  periods: PeriodRecord[],
  settings: UserSettings,
  todayISO: string = getTodayISO()
): CycleSummary {
  const sortedPeriods = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const hasRecords = sortedPeriods.length > 0;

  // Prefer periods up to today as anchor; if only future-dated period exists, fall back cleanly
  const pastOrCurrentPeriods = sortedPeriods.filter((p) => p.startDate <= todayISO);
  const latestPeriod =
    pastOrCurrentPeriods.length > 0
      ? pastOrCurrentPeriods[pastOrCurrentPeriods.length - 1]
      : sortedPeriods[sortedPeriods.length - 1] ?? null;

  const ongoingPeriod = sortedPeriods.find((p) => p.isOngoing && !p.endDate) ?? null;

  // 1. Completed cycles (consecutive period start dates)
  const completedCycles: CompletedCycleStat[] = [];
  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    const current = sortedPeriods[i];
    const next = sortedPeriods[i + 1];
    const cycleLen = diffDaysISO(current.startDate, next.startDate);
    const periodDur = getPeriodDurationDays(current);
    const isValid = cycleLen >= MIN_VALID_CYCLE_DAYS && cycleLen <= MAX_VALID_CYCLE_DAYS;
    completedCycles.push({
      id: `${current.id}_${next.id}`,
      startDate: current.startDate,
      nextStartDate: next.startDate,
      cycleLength: cycleLen,
      periodDuration: periodDur,
      isValidForAverage: isValid,
    });
  }

  const validCycles = completedCycles.filter((c) => c.isValidForAverage);
  const validCompletedCyclesCount = validCycles.length;

  const calculatedAvgCycleLength =
    validCompletedCyclesCount > 0
      ? Math.round(
          validCycles.slice(-6).reduce((sum, c) => sum + c.cycleLength, 0) /
            Math.min(validCycles.length, 6)
        )
      : null;

  // 2. Period duration stats (only completed periods with valid duration)
  const validDurations = sortedPeriods
    .map((p) => getPeriodDurationDays(p))
    .filter(
      (d): d is number => d !== null && d >= MIN_VALID_PERIOD_DAYS && d <= MAX_VALID_PERIOD_DAYS
    );

  const calculatedAvgPeriodDuration =
    validDurations.length > 0
      ? Math.round(validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length)
      : null;

  // 3. Regularity assessment
  let regularityStatus: 'consistent' | 'variable' | 'insufficient' = 'insufficient';
  let regularityLabel = 'Insufficient history';
  let regularityDetail =
    'Log at least 3 period start dates (2 completed cycles) to assess cycle variability.';
  let cycleRangeMin: number | null = null;
  let cycleRangeMax: number | null = null;

  if (validCycles.length >= 1) {
    const lengths = validCycles.map((c) => c.cycleLength);
    cycleRangeMin = Math.min(...lengths);
    cycleRangeMax = Math.max(...lengths);
  }

  if (validCycles.length >= 2 && cycleRangeMin !== null && cycleRangeMax !== null) {
    const spread = cycleRangeMax - cycleRangeMin;
    const anyOutsideTypical = validCycles.some(
      (c) => c.cycleLength < 21 || c.cycleLength > 35
    );
    if (spread <= 7 && !anyOutsideTypical) {
      regularityStatus = 'consistent';
      regularityLabel = 'Consistent pattern';
      regularityDetail = `Your ${validCycles.length} recorded cycles ranged from ${cycleRangeMin} to ${cycleRangeMax} days (variation of ${spread} days).`;
    } else {
      regularityStatus = 'variable';
      regularityLabel = 'Variable / irregular pattern';
      regularityDetail = `Your recorded cycles ranged from ${cycleRangeMin} to ${cycleRangeMax} days (variation of ${spread} days), so upcoming dates are shown as a wider range.`;
    }
  } else if (validCycles.length === 1) {
    regularityDetail =
      'One completed cycle recorded so far. Add another cycle to understand your typical variation.';
  }

  // 4. Effective baseline for predictions
  let estimateSource: EstimateSource = 'insufficient';
  let estimateSourceLabel = 'No period history yet';
  let effectiveCycleLength = settings.manualCycleLength || GENERAL_REFERENCE_CYCLE;
  let effectivePeriodDuration = settings.manualPeriodDuration || GENERAL_REFERENCE_PERIOD;

  if (settings.useManualPreferences) {
    estimateSource = 'manual';
    estimateSourceLabel = `Using manual preference (${effectiveCycleLength}d cycle · ${effectivePeriodDuration}d period)`;
  } else if (calculatedAvgCycleLength !== null) {
    estimateSource = 'personalized';
    effectiveCycleLength = calculatedAvgCycleLength;
    effectivePeriodDuration = calculatedAvgPeriodDuration ?? settings.manualPeriodDuration ?? GENERAL_REFERENCE_PERIOD;
    estimateSourceLabel = `Personalized average from ${validCompletedCyclesCount} completed ${
      validCompletedCyclesCount === 1 ? 'cycle' : 'cycles'
    }`;
  } else if (hasRecords) {
    estimateSource = 'general_reference';
    effectiveCycleLength = settings.manualCycleLength || GENERAL_REFERENCE_CYCLE;
    effectivePeriodDuration =
      calculatedAvgPeriodDuration ?? settings.manualPeriodDuration ?? GENERAL_REFERENCE_PERIOD;
    estimateSourceLabel = `General ${effectiveCycleLength}-day reference estimate (insufficient cycle history)`;
  }

  // 5. Phase bounds
  const latestConfirmedDuration = latestPeriod ? getPeriodDurationDays(latestPeriod) : null;
  const activeOrOngoingDuration =
    latestPeriod && latestPeriod.isOngoing && !latestPeriod.endDate
      ? Math.max(1, diffDaysISO(latestPeriod.startDate, todayISO) + 1)
      : latestConfirmedDuration;

  const menstrualEndDay = Math.min(
    effectiveCycleLength - 2,
    Math.max(1, activeOrOngoingDuration ?? effectivePeriodDuration)
  );

  // Ovulation estimate: ~14 days before expected next period (only sensible if cycle >= 21)
  const rawOvulationDay = effectiveCycleLength >= 21 ? effectiveCycleLength - 14 : Math.round(effectiveCycleLength / 2);
  const ovulationTargetDay = Math.max(menstrualEndDay + 2, Math.min(effectiveCycleLength - 4, rawOvulationDay));
  const ovulationWindowStartDay = Math.max(menstrualEndDay + 1, ovulationTargetDay - 1);
  const ovulationWindowEndDay = Math.min(effectiveCycleLength - 1, ovulationTargetDay + 1);

  const phaseSegments = {
    menstrual: {
      startDay: 1,
      endDay: menstrualEndDay,
      isConfirmed: Boolean(latestConfirmedDuration || latestPeriod?.isOngoing),
    },
    follicular: {
      startDay: menstrualEndDay + 1,
      endDay: Math.max(menstrualEndDay + 1, ovulationWindowStartDay - 1),
    },
    ovulation: {
      startDay: ovulationWindowStartDay,
      endDay: ovulationWindowEndDay,
      targetDay: ovulationTargetDay,
    },
    luteal: {
      startDay: Math.min(effectiveCycleLength, ovulationWindowEndDay + 1),
      endDay: effectiveCycleLength,
    },
  };

  // 6. Current cycle day & phase
  let currentCycleDay: number | null = null;
  let isCycleOverdue = false;
  let currentPhase: CyclePhaseInfo = {
    id: 'unknown',
    label: 'No active cycle data',
    isEstimated: true,
    description: 'Log your most recent period start date to view your current cycle day and phase estimate.',
    dayRangeLabel: 'Log a period to begin',
  };

  let estimatedNextPeriodStart: string | null = null;
  let estimatedNextPeriodEnd: string | null = null;
  let estimatedNextPeriodRangeStart: string | null = null;
  let estimatedNextPeriodRangeEnd: string | null = null;
  let estimatedOvulationDate: string | null = null;
  let estimatedFertileStart: string | null = null;
  let estimatedFertileEnd: string | null = null;
  let daysUntilNextPeriod: number | null = null;

  if (latestPeriod && latestPeriod.startDate <= todayISO) {
    currentCycleDay = diffDaysISO(latestPeriod.startDate, todayISO) + 1;
    estimatedNextPeriodStart = addDaysISO(latestPeriod.startDate, effectiveCycleLength);
    estimatedNextPeriodEnd = addDaysISO(estimatedNextPeriodStart, effectivePeriodDuration - 1);
    daysUntilNextPeriod = diffDaysISO(todayISO, estimatedNextPeriodStart);

    // Uncertainty range when cycles vary
    if (regularityStatus === 'variable' && cycleRangeMin !== null && cycleRangeMax !== null) {
      const halfSpread = Math.min(7, Math.ceil((cycleRangeMax - cycleRangeMin) / 2));
      estimatedNextPeriodRangeStart = addDaysISO(estimatedNextPeriodStart, -halfSpread);
      estimatedNextPeriodRangeEnd = addDaysISO(estimatedNextPeriodStart, halfSpread);
    }

    estimatedOvulationDate = addDaysISO(latestPeriod.startDate, ovulationTargetDay - 1);
    estimatedFertileStart = addDaysISO(estimatedOvulationDate, -5);
    estimatedFertileEnd = addDaysISO(estimatedOvulationDate, 1);

    // Check if cycle is significantly past expected length (>14 days late)
    if (currentCycleDay > effectiveCycleLength + 14) {
      isCycleOverdue = true;
      currentPhase = {
        id: 'unknown',
        label: 'Cycle update needed',
        isEstimated: true,
        description:
          'Your last recorded period was more than two weeks past your estimated cycle length. Log a new period if one started, or note a longer cycle.',
        dayRangeLabel: `Day ${currentCycleDay} since last recorded start`,
      };
    } else if (
      (latestPeriod.isOngoing && !latestPeriod.endDate) ||
      (latestConfirmedDuration !== null && currentCycleDay <= latestConfirmedDuration)
    ) {
      currentPhase = {
        id: 'menstrual',
        label: 'Menstrual phase',
        isEstimated: false,
        description:
          'Confirmed bleeding days from your recorded period entry. Rest, warmth, and gentle routines can support comfort.',
        dayRangeLabel: `Days 1–${phaseSegments.menstrual.endDay} · Recorded`,
      };
    } else if (currentCycleDay <= phaseSegments.menstrual.endDay && latestConfirmedDuration === null) {
      currentPhase = {
        id: 'menstrual',
        label: 'Menstrual phase (estimated)',
        isEstimated: true,
        description:
          'Within your typical period duration. Update your period end date if bleeding has finished.',
        dayRangeLabel: `Days 1–${phaseSegments.menstrual.endDay} · Estimated`,
      };
    } else if (currentCycleDay < phaseSegments.ovulation.startDay) {
      currentPhase = {
        id: 'follicular',
        label: 'Follicular phase (estimated)',
        isEstimated: true,
        description:
          'Post-menstrual phase leading up to estimated mid-cycle. Timing varies from cycle to cycle.',
        dayRangeLabel: `Days ${phaseSegments.follicular.startDay}–${phaseSegments.follicular.endDay} · Estimated`,
      };
    } else if (currentCycleDay <= phaseSegments.ovulation.endDay) {
      currentPhase = {
        id: 'ovulation',
        label: 'Estimated ovulation window',
        isEstimated: true,
        description:
          'Calendar-based mid-cycle estimate (~14 days before predicted next period). Calendar apps cannot confirm actual ovulation.',
        dayRangeLabel: `Around Day ${ovulationTargetDay} · Calendar estimate`,
      };
    } else {
      currentPhase = {
        id: 'luteal',
        label: 'Luteal phase (estimated)',
        isEstimated: true,
        description:
          'Estimated post-ovulation phase ahead of your next expected period. Pre-period symptoms may appear for some people.',
        dayRangeLabel: `Days ${phaseSegments.luteal.startDay}–${effectiveCycleLength} · Estimated`,
      };
    }
  }

  return {
    hasRecords,
    sortedPeriods,
    latestPeriod,
    ongoingPeriod,
    completedCycles,
    validCompletedCyclesCount,
    calculatedAvgCycleLength,
    calculatedAvgPeriodDuration,
    validPeriodDurationCount: validDurations.length,
    effectiveCycleLength,
    effectivePeriodDuration,
    estimateSource,
    estimateSourceLabel,
    regularityStatus,
    regularityLabel,
    regularityDetail,
    cycleRangeMin,
    cycleRangeMax,
    currentCycleDay,
    isCycleOverdue,
    currentPhase,
    estimatedNextPeriodStart,
    estimatedNextPeriodEnd,
    estimatedNextPeriodRangeStart,
    estimatedNextPeriodRangeEnd,
    estimatedOvulationDate,
    estimatedOvulationCycleDay: hasRecords ? ovulationTargetDay : null,
    estimatedFertileStart,
    estimatedFertileEnd,
    daysUntilNextPeriod,
    phaseSegments,
  };
}

export function calculatePeriodDelayStatus(
  summary: CycleSummary,
  todayISO: string = getTodayISO()
): PeriodDelayStatus {
  if (!summary.hasRecords || !summary.latestPeriod || !summary.estimatedNextPeriodStart) {
    return {
      hasValidPrediction: false,
      canActivateReminder: false,
      isDelayed: false,
      isWithinVariabilityWindow: false,
      estimatedDate: null,
      estimatedRangeEnd: null,
      daysPastEstimated: 0,
      anchorStartDate: null,
      hasOngoingPeriod: false,
      hasIncompleteLatestRecord: false,
      statusLabel: 'No cycle prediction yet',
      detailMessage: 'Log a completed period to view cycle estimates.',
    };
  }

  if (summary.ongoingPeriod) {
    return {
      hasValidPrediction: false,
      canActivateReminder: false,
      isDelayed: false,
      isWithinVariabilityWindow: false,
      estimatedDate: summary.estimatedNextPeriodStart,
      estimatedRangeEnd: summary.estimatedNextPeriodRangeEnd,
      daysPastEstimated: 0,
      anchorStartDate: summary.latestPeriod.startDate,
      hasOngoingPeriod: true,
      hasIncompleteLatestRecord: false,
      statusLabel: 'Ongoing period recorded',
      detailMessage: 'An active period is currently recorded.',
    };
  }

  const latest = summary.latestPeriod;
  const hasIncompleteLatestRecord = !latest.isOngoing && !latest.endDate;
  if (hasIncompleteLatestRecord) {
    return {
      hasValidPrediction: false,
      canActivateReminder: false,
      isDelayed: false,
      isWithinVariabilityWindow: false,
      estimatedDate: summary.estimatedNextPeriodStart,
      estimatedRangeEnd: summary.estimatedNextPeriodRangeEnd,
      daysPastEstimated: 0,
      anchorStartDate: latest.startDate,
      hasOngoingPeriod: false,
      hasIncompleteLatestRecord: true,
      statusLabel: 'Latest period record incomplete',
      detailMessage:
        'Add an end date to your most recent period record before treating upcoming dates as a confirmed delay.',
    };
  }

  if (latest.startDate > todayISO) {
    return {
      hasValidPrediction: false,
      canActivateReminder: false,
      isDelayed: false,
      isWithinVariabilityWindow: false,
      estimatedDate: null,
      estimatedRangeEnd: null,
      daysPastEstimated: 0,
      anchorStartDate: latest.startDate,
      hasOngoingPeriod: false,
      hasIncompleteLatestRecord: false,
      statusLabel: 'No active prediction',
      detailMessage: 'A valid past or current period record is needed for cycle estimates.',
    };
  }

  const estimatedDate = summary.estimatedNextPeriodStart;
  const estimatedRangeEnd = summary.estimatedNextPeriodRangeEnd;
  const rawDiff = diffDaysISO(estimatedDate, todayISO);
  const daysPastEstimated = Math.max(0, rawDiff);
  const isDelayed = daysPastEstimated >= 1;

  const isWithinVariabilityWindow =
    isDelayed &&
    summary.regularityStatus === 'variable' &&
    estimatedRangeEnd !== null &&
    todayISO <= estimatedRangeEnd;

  const canActivateReminder = isDelayed && !isWithinVariabilityWindow;

  let statusLabel = 'Within estimated cycle timeline';
  let detailMessage = `Estimated next period window starts ${formatShortDate(estimatedDate)}.`;

  if (isDelayed) {
    const dayWord = daysPastEstimated === 1 ? 'day' : 'days';
    if (isWithinVariabilityWindow && estimatedRangeEnd) {
      statusLabel = `${daysPastEstimated} ${dayWord} past midpoint (within variable range)`;
      detailMessage = `Today is ${daysPastEstimated} ${dayWord} past the estimated midpoint (${formatShortDate(estimatedDate)}), still within your variable cycle range through ${formatShortDate(estimatedRangeEnd)}.`;
    } else {
      statusLabel = `${daysPastEstimated} ${dayWord} past estimated date`;
      detailMessage = `Today is ${daysPastEstimated} ${dayWord} past your estimated period date (${formatShortDate(estimatedDate)}). Cycle predictions are estimates and natural timing can shift.`;
    }
  }

  return {
    hasValidPrediction: true,
    canActivateReminder,
    isDelayed,
    isWithinVariabilityWindow,
    estimatedDate,
    estimatedRangeEnd,
    daysPastEstimated,
    anchorStartDate: latest.startDate,
    hasOngoingPeriod: false,
    hasIncompleteLatestRecord: false,
    statusLabel,
    detailMessage,
  };
}

export interface DelayReminderEvaluation {
  shouldTrigger: boolean;
  kind: DelayReminderKind | null;
  daysPastEstimated: number;
  title: string;
  body: string;
  privacySafeBody: string;
  reason: string;
}

export function evaluatePeriodDelayReminder(params: {
  delayStatus: PeriodDelayStatus;
  settings: UserSettings;
  reminderHistory: DelayReminderEvent[];
  todayISO: string;
  currentHHMM?: string;
}): DelayReminderEvaluation {
  const { delayStatus, settings, reminderHistory, todayISO, currentHHMM } = params;
  const delayConfig = settings.periodDelayReminder ?? {
    enabled: false,
    initialDaysAfter: 1,
    followUpDaysAfter: 7,
    time: '09:00',
  };

  const empty = (reason: string): DelayReminderEvaluation => ({
    shouldTrigger: false,
    kind: null,
    daysPastEstimated: delayStatus.daysPastEstimated,
    title: 'FLOURA',
    body: '',
    privacySafeBody: DELAY_REMINDER_COPY.privacySafeLockScreen,
    reason,
  });

  if (!delayConfig.enabled) {
    return empty('Period delay reminders are turned off.');
  }

  if (!delayStatus.hasValidPrediction || !delayStatus.isDelayed || !delayStatus.anchorStartDate) {
    return empty('No valid delayed period estimate.');
  }

  if (!delayStatus.canActivateReminder) {
    return empty('Currently within natural cycle variability window.');
  }

  const anchor = delayStatus.anchorStartDate;
  const cycleEvents = reminderHistory.filter((e) => e.cycleAnchorStartDate === anchor);

  // If dismissed or cancelled for this cycle anchor, do not re-trigger
  if (cycleEvents.some((e) => e.status === 'dismissed' || e.status === 'cancelled_period_logged')) {
    return empty('Reminder already dismissed or resolved for this cycle.');
  }

  const initialThreshold = Math.max(1, delayConfig.initialDaysAfter || 1);
  const followUpThreshold = Math.max(
    initialThreshold + 1,
    delayConfig.followUpDaysAfter || 7
  );

  let targetKind: DelayReminderKind | null = null;
  if (delayStatus.daysPastEstimated >= followUpThreshold) {
    const followUpAlreadySent = cycleEvents.some(
      (e) => e.kind === 'follow_up' && e.status === 'triggered'
    );
    if (!followUpAlreadySent) {
      targetKind = 'follow_up';
    }
  } else if (delayStatus.daysPastEstimated >= initialThreshold) {
    const initialAlreadySent = cycleEvents.some(
      (e) => e.kind === 'initial' && e.status === 'triggered'
    );
    if (!initialAlreadySent) {
      targetKind = 'initial';
    }
  }

  if (!targetKind) {
    return empty('Reminder for this stage was already sent or threshold not yet reached.');
  }

  // Prevent firing multiple delay notifications on the exact same local calendar date
  if (cycleEvents.some((e) => e.triggeredDate === todayISO && e.status === 'triggered')) {
    return empty('A delay reminder was already recorded today.');
  }

  if (currentHHMM && currentHHMM < (delayConfig.time || '09:00')) {
    return empty('Configured reminder time has not arrived yet today.');
  }

  const body =
    targetKind === 'follow_up' ? DELAY_REMINDER_COPY.follow_up : DELAY_REMINDER_COPY.initial;

  return {
    shouldTrigger: true,
    kind: targetKind,
    daysPastEstimated: delayStatus.daysPastEstimated,
    title: 'FLOURA',
    body,
    privacySafeBody: DELAY_REMINDER_COPY.privacySafeLockScreen,
    reason: `Due for ${targetKind} reminder (${delayStatus.daysPastEstimated} days past estimated date).`,
  };
}

export function calculateMenstrualHistoryStats(summary: CycleSummary): MenstrualHistoryStats {
  let completedPeriodsCount = 0;
  let ongoingPeriodsCount = 0;
  let incompletePeriodsCount = 0;
  const validDurations: number[] = [];

  for (const p of summary.sortedPeriods) {
    const dur = getPeriodDurationDays(p);
    if (dur !== null && dur >= MIN_VALID_PERIOD_DAYS && dur <= MAX_VALID_PERIOD_DAYS) {
      completedPeriodsCount += 1;
      validDurations.push(dur);
    } else if (p.isOngoing && !p.endDate) {
      ongoingPeriodsCount += 1;
    } else {
      incompletePeriodsCount += 1;
    }
  }

  const averagePeriodDuration =
    validDurations.length > 0
      ? Math.round(validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length)
      : null;
  const shortestPeriodDuration = validDurations.length > 0 ? Math.min(...validDurations) : null;
  const longestPeriodDuration = validDurations.length > 0 ? Math.max(...validDurations) : null;

  const validCycleLengths = summary.completedCycles
    .filter((c) => c.isValidForAverage)
    .map((c) => c.cycleLength);

  const shortestCycleLength =
    validCycleLengths.length > 0 ? Math.min(...validCycleLengths) : null;
  const longestCycleLength =
    validCycleLengths.length > 0 ? Math.max(...validCycleLengths) : null;
  const cycleVariabilityDays =
    shortestCycleLength !== null && longestCycleLength !== null && validCycleLengths.length >= 2
      ? longestCycleLength - shortestCycleLength
      : null;

  return {
    completedPeriodsCount,
    ongoingPeriodsCount,
    incompletePeriodsCount,
    averagePeriodDuration,
    shortestPeriodDuration,
    longestPeriodDuration,
    averageCycleLength: summary.calculatedAvgCycleLength,
    shortestCycleLength,
    longestCycleLength,
    cycleVariabilityDays,
  };
}

export interface DayCalendarStatus {
  isRecordedPeriod: boolean;
  recordedPeriod?: PeriodRecord;
  isOngoingPeriodDay: boolean;
  isEstimatedPeriod: boolean;
  isPastEstimatedWindow: boolean;
  isEstimatedOvulation: boolean;
  isEstimatedFertile: boolean;
  cycleDay: number | null;
}

export function getDayCalendarStatus(
  iso: string,
  summary: CycleSummary,
  todayISO: string = getTodayISO()
): DayCalendarStatus {
  let isRecordedPeriod = false;
  let recordedPeriod: PeriodRecord | undefined;
  let isOngoingPeriodDay = false;

  for (const p of summary.sortedPeriods) {
    const end = getPeriodEffectiveEnd(p, todayISO);
    if (iso >= p.startDate && iso <= end) {
      isRecordedPeriod = true;
      recordedPeriod = p;
      isOngoingPeriodDay = Boolean(p.isOngoing && !p.endDate);
      break;
    }
  }

  let isEstimatedPeriod = false;
  let isPastEstimatedWindow = false;
  let isEstimatedOvulation = false;
  let isEstimatedFertile = false;
  let cycleDay: number | null = null;

  if (summary.latestPeriod && iso >= summary.latestPeriod.startDate) {
    const diff = diffDaysISO(summary.latestPeriod.startDate, iso) + 1;
    if (diff >= 1 && diff <= summary.effectiveCycleLength + 14) {
      cycleDay = diff;
    }
  }

  // Also check historical cycle day if date falls inside an earlier recorded cycle
  if (cycleDay === null && summary.sortedPeriods.length > 0) {
    for (let i = summary.sortedPeriods.length - 1; i >= 0; i--) {
      const p = summary.sortedPeriods[i];
      if (iso >= p.startDate) {
        const next = summary.sortedPeriods[i + 1];
        if (!next || iso < next.startDate) {
          const d = diffDaysISO(p.startDate, iso) + 1;
          if (d <= 65) cycleDay = d;
          break;
        }
      }
    }
  }

  // Future predictions (never overwrite actual recorded period days)
  if (!isRecordedPeriod && summary.estimatedNextPeriodStart && summary.estimatedNextPeriodEnd) {
    const latest = summary.latestPeriod;
    const latestComplete = Boolean(latest && !latest.isOngoing && latest.endDate);

    // Mark past-due unlogged days between estimatedNextPeriodStart and todayISO as estimate-only
    if (
      latestComplete &&
      !summary.ongoingPeriod &&
      todayISO > summary.estimatedNextPeriodStart &&
      iso >= summary.estimatedNextPeriodStart &&
      iso <= todayISO
    ) {
      isPastEstimatedWindow = true;
    }

    // Project up to 3 upcoming cycles so navigating forward 1–2 months shows estimates transparently
    for (let cycleOffset = 0; cycleOffset < 3; cycleOffset++) {
      const shift = cycleOffset * summary.effectiveCycleLength;
      const projStart = addDaysISO(summary.estimatedNextPeriodStart, shift);
      const projEnd = addDaysISO(summary.estimatedNextPeriodEnd, shift);
      if (iso >= projStart && iso <= projEnd) {
        isEstimatedPeriod = true;
      }

      if (summary.estimatedOvulationDate) {
        const projOv = addDaysISO(summary.estimatedOvulationDate, shift);
        if (iso === projOv) {
          isEstimatedOvulation = true;
        }
      }
      if (summary.estimatedFertileStart && summary.estimatedFertileEnd) {
        const projFStart = addDaysISO(summary.estimatedFertileStart, shift);
        const projFEnd = addDaysISO(summary.estimatedFertileEnd, shift);
        if (iso >= projFStart && iso <= projFEnd) {
          isEstimatedFertile = true;
        }
      }
    }
  }

  return {
    isRecordedPeriod,
    recordedPeriod,
    isOngoingPeriodDay,
    isEstimatedPeriod,
    isPastEstimatedWindow,
    isEstimatedOvulation,
    isEstimatedFertile,
    cycleDay,
  };
}
