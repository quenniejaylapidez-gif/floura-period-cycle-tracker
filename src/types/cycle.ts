export type NavTab = 'home' | 'calendar' | 'insights' | 'learn' | 'profile';

export type FlowIntensity = 'light' | 'medium' | 'heavy' | 'spotting';

export interface PeriodRecord {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD or null if ongoing
  isOngoing: boolean;
  flowIntensity?: FlowIntensity;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type SymptomCategory = 'physical' | 'emotional' | 'other';
export type SymptomSeverity = 'mild' | 'moderate' | 'severe';

export interface SymptomDefinition {
  id: string;
  label: string;
  category: SymptomCategory;
}

export interface LoggedSymptom {
  id: string;
  severity: SymptomSeverity;
}

export type MoodId =
  | 'happy'
  | 'calm'
  | 'energetic'
  | 'neutral'
  | 'tired'
  | 'stressed'
  | 'sad'
  | 'irritable';

export interface MoodDefinition {
  id: MoodId;
  label: string;
  tone: 'positive' | 'neutral' | 'low';
}

export interface MoodEntry {
  id: string;
  mood: MoodId;
  time: string; // HH:mm
  note?: string;
  createdAt: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD (primary key)
  symptoms: LoggedSymptom[];
  moods: MoodEntry[];
  notes: string;
  updatedAt: number;
}

export interface ReminderRule {
  enabled: boolean;
  time: string; // HH:mm
  daysBefore?: number;
}

export interface PeriodDelayReminderSettings {
  enabled: boolean;
  initialDaysAfter: number; // default 1
  followUpDaysAfter: number; // default 7
  time: string; // HH:mm default '09:00'
}

export type DelayReminderKind = 'initial' | 'follow_up';

export type DelayReminderStatus =
  | 'triggered'
  | 'dismissed'
  | 'cancelled_period_logged';

export interface DelayReminderEvent {
  id: string;
  cycleAnchorStartDate: string; // YYYY-MM-DD of latest period anchor
  estimatedDate: string; // YYYY-MM-DD estimated next period start
  kind: DelayReminderKind;
  daysPastEstimated: number;
  triggeredAt: number;
  triggeredDate: string; // YYYY-MM-DD local date
  status: DelayReminderStatus;
  notificationDispatched: boolean;
}

export interface PeriodDelayStatus {
  hasValidPrediction: boolean;
  canActivateReminder: boolean;
  isDelayed: boolean;
  isWithinVariabilityWindow: boolean;
  estimatedDate: string | null;
  estimatedRangeEnd: string | null;
  daysPastEstimated: number;
  anchorStartDate: string | null;
  hasOngoingPeriod: boolean;
  hasIncompleteLatestRecord: boolean;
  statusLabel: string;
  detailMessage: string;
}

export interface MenstrualHistoryStats {
  completedPeriodsCount: number;
  ongoingPeriodsCount: number;
  incompletePeriodsCount: number;
  averagePeriodDuration: number | null;
  shortestPeriodDuration: number | null;
  longestPeriodDuration: number | null;
  averageCycleLength: number | null;
  shortestCycleLength: number | null;
  longestCycleLength: number | null;
  cycleVariabilityDays: number | null;
}

export interface UserSettings {
  id: 'user_settings';
  useManualPreferences: boolean;
  manualCycleLength: number; // default 28
  manualPeriodDuration: number; // default 5
  theme: 'light' | 'dark' | 'system';
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  privacySafeNotifications: boolean;
  reminders: {
    upcomingPeriod: ReminderRule;
    periodLogging: ReminderRule;
    dailySymptoms: ReminderRule;
    personalNotes: ReminderRule;
  };
  periodDelayReminder?: PeriodDelayReminderSettings;
  lastReminderCheckedDate: string | null;
  hidePersonalActivityIndicators?: boolean;
  updatedAt: number;
}

export type PersonalActivityContext =
  | 'unspecified'
  | 'protected'
  | 'unprotected'
  | 'intimacy_other';

export interface PersonalActivityEntry {
  id: string;
  date: string; // YYYY-MM-DD
  context: PersonalActivityContext;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type AvatarOptionId = 'minimalist' | 'botanical' | 'floral' | 'pastel' | 'custom';

export type GreetingStyle = 'time_based' | 'welcome_back' | 'wellness_journey';

export interface UserProfile {
  id: 'user_profile';
  displayName: string;
  description: string;
  avatarType: AvatarOptionId;
  customAvatarDataUrl: string | null;
  greetingStyle: GreetingStyle;
  updatedAt: number;
}

export type CyclePhaseId = 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'unknown';

export type EstimateSource = 'personalized' | 'manual' | 'general_reference' | 'insufficient';

export interface CompletedCycleStat {
  id: string;
  startDate: string;
  nextStartDate: string;
  cycleLength: number;
  periodDuration: number | null;
  isValidForAverage: boolean;
}

export interface CyclePhaseInfo {
  id: CyclePhaseId;
  label: string;
  isEstimated: boolean;
  description: string;
  dayRangeLabel: string;
}

export interface CycleSummary {
  hasRecords: boolean;
  sortedPeriods: PeriodRecord[];
  latestPeriod: PeriodRecord | null;
  ongoingPeriod: PeriodRecord | null;
  completedCycles: CompletedCycleStat[];
  validCompletedCyclesCount: number;
  calculatedAvgCycleLength: number | null;
  calculatedAvgPeriodDuration: number | null;
  validPeriodDurationCount: number;
  effectiveCycleLength: number;
  effectivePeriodDuration: number;
  estimateSource: EstimateSource;
  estimateSourceLabel: string;
  regularityStatus: 'consistent' | 'variable' | 'insufficient';
  regularityLabel: string;
  regularityDetail: string;
  cycleRangeMin: number | null;
  cycleRangeMax: number | null;
  currentCycleDay: number | null;
  isCycleOverdue: boolean;
  currentPhase: CyclePhaseInfo;
  estimatedNextPeriodStart: string | null;
  estimatedNextPeriodEnd: string | null;
  estimatedNextPeriodRangeStart: string | null;
  estimatedNextPeriodRangeEnd: string | null;
  estimatedOvulationDate: string | null;
  estimatedOvulationCycleDay: number | null;
  estimatedFertileStart: string | null;
  estimatedFertileEnd: string | null;
  daysUntilNextPeriod: number | null;
  phaseSegments: {
    menstrual: { startDay: number; endDay: number; isConfirmed: boolean };
    follicular: { startDay: number; endDay: number };
    ovulation: { startDay: number; endDay: number; targetDay: number };
    luteal: { startDay: number; endDay: number };
  };
}
