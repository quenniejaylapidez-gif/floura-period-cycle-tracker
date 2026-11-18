import { DEFAULT_USER_PROFILE, DEFAULT_USER_SETTINGS } from '../data/catalogs';
import type {
  DailyLog,
  DelayReminderEvent,
  DelayReminderKind,
  DelayReminderStatus,
  PeriodRecord,
  PersonalActivityContext,
  PersonalActivityEntry,
  UserProfile,
  UserSettings,
} from '../types/cycle';

const DB_NAME = 'floura_db';
const DB_VERSION = 4;
const STORE_PERIODS = 'periods';
const STORE_DAILY_LOGS = 'dailyLogs';
const STORE_SETTINGS = 'settings';
const STORE_PROFILE = 'profile';
const STORE_PERSONAL_ACTIVITIES = 'personalActivities';
const STORE_REMINDER_HISTORY = 'reminderHistory';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PERIODS)) {
        const periodStore = db.createObjectStore(STORE_PERIODS, { keyPath: 'id' });
        periodStore.createIndex('startDate', 'startDate', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_DAILY_LOGS)) {
        db.createObjectStore(STORE_DAILY_LOGS, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PROFILE)) {
        db.createObjectStore(STORE_PROFILE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PERSONAL_ACTIVITIES)) {
        const actStore = db.createObjectStore(STORE_PERSONAL_ACTIVITIES, { keyPath: 'id' });
        actStore.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_REMINDER_HISTORY)) {
        const remStore = db.createObjectStore(STORE_REMINDER_HISTORY, { keyPath: 'id' });
        remStore.createIndex('cycleAnchorStartDate', 'cycleAnchorStartDate', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Unable to open IndexedDB storage.'));
    };
  });

  return dbPromise;
}

function runTx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = executor(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed.'));
      })
  );
}

export async function getAllPeriods(): Promise<PeriodRecord[]> {
  const rows = await runTx<PeriodRecord[]>(STORE_PERIODS, 'readonly', (s) => s.getAll());
  return rows.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function savePeriod(period: PeriodRecord): Promise<void> {
  await runTx(STORE_PERIODS, 'readwrite', (s) => s.put(period));
}

export async function deletePeriod(id: string): Promise<void> {
  await runTx(STORE_PERIODS, 'readwrite', (s) => s.delete(id));
}

export async function getAllDailyLogs(): Promise<Record<string, DailyLog>> {
  const rows = await runTx<DailyLog[]>(STORE_DAILY_LOGS, 'readonly', (s) => s.getAll());
  const map: Record<string, DailyLog> = {};
  for (const row of rows) {
    map[row.date] = row;
  }
  return map;
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  const isEmpty =
    log.symptoms.length === 0 && log.moods.length === 0 && log.notes.trim().length === 0;
  if (isEmpty) {
    await runTx(STORE_DAILY_LOGS, 'readwrite', (s) => s.delete(log.date));
    return;
  }
  await runTx(STORE_DAILY_LOGS, 'readwrite', (s) => s.put(log));
}

export async function getAllPersonalActivities(): Promise<PersonalActivityEntry[]> {
  const rows = await runTx<PersonalActivityEntry[]>(
    STORE_PERSONAL_ACTIVITIES,
    'readonly',
    (s) => s.getAll()
  );
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

export async function savePersonalActivity(entry: PersonalActivityEntry): Promise<void> {
  await runTx(STORE_PERSONAL_ACTIVITIES, 'readwrite', (s) => s.put(entry));
}

export async function deletePersonalActivity(id: string): Promise<void> {
  await runTx(STORE_PERSONAL_ACTIVITIES, 'readwrite', (s) => s.delete(id));
}

export async function getAllReminderHistory(): Promise<DelayReminderEvent[]> {
  const rows = await runTx<DelayReminderEvent[]>(STORE_REMINDER_HISTORY, 'readonly', (s) =>
    s.getAll()
  );
  return rows.sort((a, b) => b.triggeredAt - a.triggeredAt);
}

export async function saveReminderHistoryEvent(event: DelayReminderEvent): Promise<void> {
  await runTx(STORE_REMINDER_HISTORY, 'readwrite', (s) => s.put(event));
}

export async function clearReminderHistory(): Promise<void> {
  await runTx(STORE_REMINDER_HISTORY, 'readwrite', (s) => s.clear());
}

export async function getUserSettings(): Promise<UserSettings> {
  const saved = await runTx<UserSettings | undefined>(STORE_SETTINGS, 'readonly', (s) =>
    s.get('user_settings')
  );
  if (!saved) {
    return { ...DEFAULT_USER_SETTINGS, updatedAt: Date.now() };
  }
  return {
    ...DEFAULT_USER_SETTINGS,
    ...saved,
    reminders: {
      ...DEFAULT_USER_SETTINGS.reminders,
      ...(saved.reminders ?? {}),
    },
    periodDelayReminder: {
      ...(DEFAULT_USER_SETTINGS.periodDelayReminder ?? {
        enabled: false,
        initialDaysAfter: 1,
        followUpDaysAfter: 7,
        time: '09:00',
      }),
      ...(saved.periodDelayReminder ?? {}),
    },
  };
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  await runTx(STORE_SETTINGS, 'readwrite', (s) => s.put(settings));
}

export function sanitizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 30);
}

export function normalizeUserProfile(candidate?: Partial<UserProfile> | null): UserProfile {
  const trimmedName = candidate?.displayName ? sanitizeDisplayName(candidate.displayName) : '';
  const trimmedDesc = candidate?.description ? candidate.description.trim().slice(0, 120) : '';
  const validAvatars = new Set(['minimalist', 'botanical', 'floral', 'pastel', 'custom']);
  const validGreetings = new Set(['time_based', 'welcome_back', 'wellness_journey']);

  const avatarType =
    candidate?.avatarType && validAvatars.has(candidate.avatarType)
      ? candidate.avatarType
      : DEFAULT_USER_PROFILE.avatarType;

  const customAvatarDataUrl =
    typeof candidate?.customAvatarDataUrl === 'string' &&
    candidate.customAvatarDataUrl.startsWith('data:image/')
      ? candidate.customAvatarDataUrl
      : null;

  return {
    id: 'user_profile',
    displayName: trimmedName.length > 0 ? trimmedName : DEFAULT_USER_PROFILE.displayName,
    description: trimmedDesc.length > 0 ? trimmedDesc : DEFAULT_USER_PROFILE.description,
    avatarType: avatarType === 'custom' && !customAvatarDataUrl ? 'minimalist' : avatarType,
    customAvatarDataUrl,
    greetingStyle:
      candidate?.greetingStyle && validGreetings.has(candidate.greetingStyle)
        ? candidate.greetingStyle
        : DEFAULT_USER_PROFILE.greetingStyle,
    updatedAt: typeof candidate?.updatedAt === 'number' ? candidate.updatedAt : Date.now(),
  };
}

export async function getUserProfile(): Promise<UserProfile> {
  const saved = await runTx<UserProfile | undefined>(STORE_PROFILE, 'readonly', (s) =>
    s.get('user_profile')
  );
  if (!saved) {
    const initial: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      updatedAt: Date.now(),
    };
    await runTx(STORE_PROFILE, 'readwrite', (s) => s.put(initial));
    return initial;
  }
  return normalizeUserProfile(saved);
}

export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  const normalized = normalizeUserProfile({ ...profile, updatedAt: Date.now() });
  await runTx(STORE_PROFILE, 'readwrite', (s) => s.put(normalized));
  return normalized;
}

export async function clearAllFlouraData(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
      [
        STORE_PERIODS,
        STORE_DAILY_LOGS,
        STORE_SETTINGS,
        STORE_PROFILE,
        STORE_PERSONAL_ACTIVITIES,
        STORE_REMINDER_HISTORY,
      ],
      'readwrite'
    );
    tx.objectStore(STORE_PERIODS).clear();
    tx.objectStore(STORE_DAILY_LOGS).clear();
    tx.objectStore(STORE_SETTINGS).clear();
    tx.objectStore(STORE_PROFILE).clear();
    tx.objectStore(STORE_PERSONAL_ACTIVITIES).clear();
    tx.objectStore(STORE_REMINDER_HISTORY).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to clear IndexedDB stores.'));
  });
}

export function buildJsonExport(
  periods: PeriodRecord[],
  dailyLogs: Record<string, DailyLog>,
  settings: UserSettings,
  profile?: UserProfile,
  personalActivities?: PersonalActivityEntry[],
  includePersonalActivity: boolean = false,
  reminderHistory?: DelayReminderEvent[]
): string {
  const payload: Record<string, unknown> = {
    application: 'FLOURA – Period & Cycle Tracker',
    exportedAt: new Date().toISOString(),
    schemaVersion: 4,
    profile: profile ?? { ...DEFAULT_USER_PROFILE, updatedAt: Date.now() },
    periods,
    dailyLogs: Object.values(dailyLogs).sort((a, b) => a.date.localeCompare(b.date)),
    settings,
    reminderHistory: reminderHistory ?? [],
  };

  if (includePersonalActivity && personalActivities) {
    payload.personalActivities = personalActivities;
  }

  return JSON.stringify(payload, null, 2);
}

export interface ImportedFlouraBackup {
  periods: PeriodRecord[];
  dailyLogs: Record<string, DailyLog>;
  settings: UserSettings;
  profile: UserProfile;
  personalActivities: PersonalActivityEntry[];
  reminderHistory: DelayReminderEvent[];
}

const VALID_CONTEXTS = new Set<PersonalActivityContext>([
  'unspecified',
  'protected',
  'unprotected',
  'intimacy_other',
]);

const VALID_REMINDER_KINDS = new Set<DelayReminderKind>(['initial', 'follow_up']);
const VALID_REMINDER_STATUSES = new Set<DelayReminderStatus>([
  'triggered',
  'dismissed',
  'cancelled_period_logged',
]);

export function parseJsonBackup(rawJson: string): ImportedFlouraBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid FLOURA backup structure.');
  }

  const data = parsed as Record<string, unknown>;

  if (!Array.isArray(data.periods)) {
    throw new Error('Backup file is missing valid period records.');
  }

  const periods: PeriodRecord[] = data.periods
    .filter((p): p is PeriodRecord => {
      if (!p || typeof p !== 'object') return false;
      const rec = p as Record<string, unknown>;
      return typeof rec.id === 'string' && typeof rec.startDate === 'string';
    })
    .map((p) => ({
      ...p,
      endDate: typeof p.endDate === 'string' ? p.endDate : null,
      isOngoing: Boolean(p.isOngoing),
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
      updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
    }));

  const dailyLogsMap: Record<string, DailyLog> = {};
  const rawLogs = Array.isArray(data.dailyLogs)
    ? data.dailyLogs
    : data.dailyLogs && typeof data.dailyLogs === 'object'
      ? Object.values(data.dailyLogs as Record<string, unknown>)
      : [];

  for (const item of rawLogs) {
    if (!item || typeof item !== 'object') continue;
    const log = item as Record<string, unknown>;
    if (typeof log.date !== 'string') continue;
    dailyLogsMap[log.date] = {
      date: log.date,
      symptoms: Array.isArray(log.symptoms) ? log.symptoms : [],
      moods: Array.isArray(log.moods) ? log.moods : [],
      notes: typeof log.notes === 'string' ? log.notes : '',
      updatedAt: typeof log.updatedAt === 'number' ? log.updatedAt : Date.now(),
    };
  }

  const personalActivities: PersonalActivityEntry[] = Array.isArray(data.personalActivities)
    ? data.personalActivities
        .filter((a): a is PersonalActivityEntry => {
          if (!a || typeof a !== 'object') return false;
          const rec = a as Record<string, unknown>;
          return typeof rec.id === 'string' && typeof rec.date === 'string';
        })
        .map((a) => ({
          id: a.id,
          date: a.date,
          context: VALID_CONTEXTS.has(a.context) ? a.context : 'unspecified',
          notes: typeof a.notes === 'string' ? a.notes : undefined,
          createdAt: typeof a.createdAt === 'number' ? a.createdAt : Date.now(),
          updatedAt: typeof a.updatedAt === 'number' ? a.updatedAt : Date.now(),
        }))
    : [];

  const reminderHistory: DelayReminderEvent[] = Array.isArray(data.reminderHistory)
    ? data.reminderHistory
        .filter((r): r is DelayReminderEvent => {
          if (!r || typeof r !== 'object') return false;
          const rec = r as Record<string, unknown>;
          return typeof rec.id === 'string' && typeof rec.cycleAnchorStartDate === 'string';
        })
        .map((r) => ({
          id: r.id,
          cycleAnchorStartDate: r.cycleAnchorStartDate,
          estimatedDate: typeof r.estimatedDate === 'string' ? r.estimatedDate : '',
          kind: VALID_REMINDER_KINDS.has(r.kind) ? r.kind : 'initial',
          daysPastEstimated: typeof r.daysPastEstimated === 'number' ? r.daysPastEstimated : 1,
          triggeredAt: typeof r.triggeredAt === 'number' ? r.triggeredAt : Date.now(),
          triggeredDate:
            typeof r.triggeredDate === 'string'
              ? r.triggeredDate
              : new Date().toISOString().slice(0, 10),
          status: VALID_REMINDER_STATUSES.has(r.status) ? r.status : 'triggered',
          notificationDispatched: Boolean(r.notificationDispatched),
        }))
    : [];

  const rawSettings =
    data.settings && typeof data.settings === 'object'
      ? (data.settings as Partial<UserSettings>)
      : {};
  const settings: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    ...rawSettings,
    id: 'user_settings',
    reminders: {
      ...DEFAULT_USER_SETTINGS.reminders,
      ...(rawSettings.reminders ?? {}),
    },
    periodDelayReminder: {
      ...(DEFAULT_USER_SETTINGS.periodDelayReminder ?? {
        enabled: false,
        initialDaysAfter: 1,
        followUpDaysAfter: 7,
        time: '09:00',
      }),
      ...(rawSettings.periodDelayReminder ?? {}),
    },
    updatedAt: Date.now(),
  };

  const rawProfile =
    data.profile && typeof data.profile === 'object'
      ? (data.profile as Partial<UserProfile>)
      : null;
  const profile = normalizeUserProfile(rawProfile);

  return {
    periods,
    dailyLogs: dailyLogsMap,
    settings,
    profile,
    personalActivities,
    reminderHistory,
  };
}

export async function restoreJsonBackup(rawJson: string): Promise<ImportedFlouraBackup> {
  const bundle = parseJsonBackup(rawJson);
  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
      [
        STORE_PERIODS,
        STORE_DAILY_LOGS,
        STORE_SETTINGS,
        STORE_PROFILE,
        STORE_PERSONAL_ACTIVITIES,
        STORE_REMINDER_HISTORY,
      ],
      'readwrite'
    );
    const periodStore = tx.objectStore(STORE_PERIODS);
    const logStore = tx.objectStore(STORE_DAILY_LOGS);
    const settingsStore = tx.objectStore(STORE_SETTINGS);
    const profileStore = tx.objectStore(STORE_PROFILE);
    const actStore = tx.objectStore(STORE_PERSONAL_ACTIVITIES);
    const remStore = tx.objectStore(STORE_REMINDER_HISTORY);

    periodStore.clear();
    logStore.clear();
    settingsStore.clear();
    profileStore.clear();
    actStore.clear();
    remStore.clear();

    for (const p of bundle.periods) {
      periodStore.put(p);
    }
    for (const l of Object.values(bundle.dailyLogs)) {
      logStore.put(l);
    }
    for (const a of bundle.personalActivities) {
      actStore.put(a);
    }
    for (const r of bundle.reminderHistory) {
      remStore.put(r);
    }
    settingsStore.put(bundle.settings);
    profileStore.put(bundle.profile);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to restore backup into IndexedDB.'));
  });

  return bundle;
}

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvExport(
  periods: PeriodRecord[],
  dailyLogs: Record<string, DailyLog>,
  personalActivities?: PersonalActivityEntry[],
  includePersonalActivity: boolean = false,
  reminderHistory?: DelayReminderEvent[]
): string {
  const lines: string[] = [];
  lines.push('RECORD_TYPE,DATE_OR_START,END_DATE,IS_ONGOING,FLOW_INTENSITY,SYMPTOMS,MOODS,NOTES');

  const sortedPeriods = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (const p of sortedPeriods) {
    lines.push(
      [
        'PERIOD',
        escapeCsv(p.startDate),
        escapeCsv(p.endDate ?? ''),
        escapeCsv(p.isOngoing),
        escapeCsv(p.flowIntensity ?? ''),
        '',
        '',
        escapeCsv(p.notes ?? ''),
      ].join(',')
    );
  }

  const sortedLogs = Object.values(dailyLogs).sort((a, b) => a.date.localeCompare(b.date));
  for (const log of sortedLogs) {
    const symptomsStr = log.symptoms.map((s) => `${s.id} (${s.severity})`).join('; ');
    const moodsStr = log.moods
      .map((m) => `${m.mood} @ ${m.time}${m.note ? ` (${m.note})` : ''}`)
      .join('; ');
    lines.push(
      [
        'DAILY_LOG',
        escapeCsv(log.date),
        '',
        '',
        '',
        escapeCsv(symptomsStr),
        escapeCsv(moodsStr),
        escapeCsv(log.notes),
      ].join(',')
    );
  }

  if (includePersonalActivity && personalActivities) {
    const sortedActs = [...personalActivities].sort((a, b) => a.date.localeCompare(b.date));
    for (const act of sortedActs) {
      lines.push(
        [
          'PERSONAL_ACTIVITY',
          escapeCsv(act.date),
          '',
          '',
          escapeCsv(act.context),
          '',
          '',
          escapeCsv(act.notes ?? ''),
        ].join(',')
      );
    }
  }

  if (reminderHistory && reminderHistory.length > 0) {
    const sortedReminders = [...reminderHistory].sort((a, b) => a.triggeredAt - b.triggeredAt);
    for (const r of sortedReminders) {
      lines.push(
        [
          'DELAY_REMINDER',
          escapeCsv(r.triggeredDate),
          escapeCsv(r.estimatedDate),
          '',
          escapeCsv(`${r.kind}:${r.status}`),
          '',
          '',
          escapeCsv(`Anchor ${r.cycleAnchorStartDate} (${r.daysPastEstimated}d past est.)`),
        ].join(',')
      );
    }
  }

  return lines.join('\n');
}
