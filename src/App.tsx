import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Home,
  Plus,
  User,
} from 'lucide-react';
import { FlouraEmblem } from './components/BotanicalMark';
import { DailyLogModal, type DailyLogTab } from './components/DailyLogModal';
import { OfflineAndUpdateBanner } from './components/OfflineIndicator';
import { PeriodModal } from './components/PeriodModal';
import { PersonalActivityModal } from './components/PersonalActivityModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { DEFAULT_USER_PROFILE, DEFAULT_USER_SETTINGS } from './data/catalogs';
import {
  clearAllFlouraData,
  clearReminderHistory,
  deletePeriod,
  deletePersonalActivity,
  getAllDailyLogs,
  getAllPeriods,
  getAllPersonalActivities,
  getAllReminderHistory,
  getUserProfile,
  getUserSettings,
  restoreJsonBackup,
  saveDailyLog,
  savePeriod,
  savePersonalActivity,
  saveReminderHistoryEvent,
  saveUserProfile,
  saveUserSettings,
} from './db/indexedDb';
import type {
  DailyLog,
  DelayReminderEvent,
  NavTab,
  PeriodRecord,
  PersonalActivityEntry,
  UserProfile,
  UserSettings,
} from './types/cycle';
import {
  calculateCycleSummary,
  calculatePeriodDelayStatus,
  evaluatePeriodDelayReminder,
} from './utils/cycleCalculations';
import { getTodayISO } from './utils/dateUtils';
import { CalendarView } from './views/CalendarView';
import { HomeView } from './views/HomeView';
import { InsightsView } from './views/InsightsView';
import { LearnView } from './views/LearnView';
import { ProfileView } from './views/ProfileView';

const NAV_ITEMS: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [learnArticleId, setLearnArticleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  const [periods, setPeriods] = useState<PeriodRecord[]>([]);
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const [personalActivities, setPersonalActivities] = useState<PersonalActivityEntry[]>([]);
  const [reminderHistory, setReminderHistory] = useState<DelayReminderEvent[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);

  const [periodModalState, setPeriodModalState] = useState<{
    isOpen: boolean;
    period?: PeriodRecord | null;
    defaultDate?: string;
  }>({ isOpen: false });

  const [dailyLogModalState, setDailyLogModalState] = useState<{
    isOpen: boolean;
    dateISO: string;
    tab: DailyLogTab;
  }>({ isOpen: false, dateISO: getTodayISO(), tab: 'symptoms' });

  const [personalActivityModalState, setPersonalActivityModalState] = useState<{
    isOpen: boolean;
    entry?: PersonalActivityEntry | null;
    defaultDate: string;
  }>({ isOpen: false, defaultDate: getTodayISO() });

  const todayISO = getTodayISO();

  const hydrateFromDB = useCallback(async () => {
    try {
      const [
        loadedPeriods,
        loadedLogs,
        loadedActivities,
        loadedReminders,
        loadedSettings,
        loadedProfile,
      ] = await Promise.all([
        getAllPeriods(),
        getAllDailyLogs(),
        getAllPersonalActivities(),
        getAllReminderHistory(),
        getUserSettings(),
        getUserProfile(),
      ]);
      setPeriods(loadedPeriods);
      setDailyLogs(loadedLogs);
      setPersonalActivities(loadedActivities);
      setReminderHistory(loadedReminders);
      setSettings(loadedSettings);
      setProfile(loadedProfile);
      setStorageError(null);
    } catch {
      setStorageError('Unable to access local browser storage. Changes may not persist across sessions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrateFromDB();
  }, [hydrateFromDB]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const useDark =
        settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      root.classList.toggle('dark', useDark);
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) {
        themeMeta.setAttribute('content', useDark ? '#191416' : '#F8F4EC');
      }
    };

    applyTheme();
    media.addEventListener('change', applyTheme);

    root.classList.toggle('reduce-motion', settings.reducedMotion);
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('large-text', settings.largeText);

    return () => media.removeEventListener('change', applyTheme);
  }, [settings]);

  const summary = useMemo(
    () => calculateCycleSummary(periods, settings, todayISO),
    [periods, settings, todayISO]
  );

  const delayStatus = useMemo(
    () => calculatePeriodDelayStatus(summary, todayISO),
    [summary, todayISO]
  );

  useEffect(() => {
    if (isLoading) return;

    const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window;
    const permissionGranted = notificationsSupported && Notification.permission === 'granted';

    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    // 1. Period Delay Reminder evaluation (prevents duplicates via reminderHistory)
    const delayEval = evaluatePeriodDelayReminder({
      delayStatus,
      settings,
      reminderHistory,
      todayISO,
      currentHHMM,
    });

    if (delayEval.shouldTrigger && delayEval.kind && delayStatus.anchorStartDate) {
      let dispatched = false;
      if (permissionGranted) {
        new Notification(delayEval.title, {
          body: settings.privacySafeNotifications ? delayEval.privacySafeBody : delayEval.body,
          icon: '/pwa-192x192.png',
        });
        dispatched = true;
      }

      const event: DelayReminderEvent = {
        id: `delay_${delayStatus.anchorStartDate}_${delayEval.kind}_${todayISO}`,
        cycleAnchorStartDate: delayStatus.anchorStartDate,
        estimatedDate: delayStatus.estimatedDate ?? '',
        kind: delayEval.kind,
        daysPastEstimated: delayEval.daysPastEstimated,
        triggeredAt: Date.now(),
        triggeredDate: todayISO,
        status: 'triggered',
        notificationDispatched: dispatched,
      };
      setReminderHistory((prev) => [event, ...prev.filter((e) => e.id !== event.id)]);
      saveReminderHistoryEvent(event).catch(() => {});
    }

    // 2. General daily/upcoming notifications (permission-gated)
    if (!permissionGranted) return;
    if (settings.lastReminderCheckedDate === todayISO) return;

    const anyEnabled =
      settings.reminders.upcomingPeriod.enabled ||
      settings.reminders.periodLogging.enabled ||
      settings.reminders.dailySymptoms.enabled ||
      settings.reminders.personalNotes.enabled;

    if (!anyEnabled) return;

    const messages: string[] = [];

    if (
      settings.reminders.upcomingPeriod.enabled &&
      summary.daysUntilNextPeriod !== null &&
      summary.daysUntilNextPeriod >= 0 &&
      summary.daysUntilNextPeriod <= (settings.reminders.upcomingPeriod.daysBefore ?? 2) &&
      currentHHMM >= settings.reminders.upcomingPeriod.time
    ) {
      messages.push(
        settings.privacySafeNotifications
          ? 'Your upcoming calendar reminder is ready.'
          : `Estimated cycle window begins in ${summary.daysUntilNextPeriod} day(s).`
      );
    }

    if (
      settings.reminders.dailySymptoms.enabled &&
      !dailyLogs[todayISO]?.symptoms.length &&
      currentHHMM >= settings.reminders.dailySymptoms.time
    ) {
      messages.push(
        settings.privacySafeNotifications
          ? 'Your daily wellness check-in is ready.'
          : 'Daily symptom check-in reminder.'
      );
    }

    if (messages.length > 0) {
      new Notification('FLOURA', {
        body: messages[0],
        icon: '/pwa-192x192.png',
      });
      const updated = { ...settings, lastReminderCheckedDate: todayISO, updatedAt: Date.now() };
      setSettings(updated);
      saveUserSettings(updated).catch(() => {});
    }
  }, [
    isLoading,
    settings,
    summary.daysUntilNextPeriod,
    delayStatus,
    reminderHistory,
    dailyLogs,
    todayISO,
  ]);

  const handleSavePeriod = async (record: PeriodRecord) => {
    const previousAnchor = delayStatus.anchorStartDate;
    const updatedPeriods = [...periods];
    if (record.isOngoing) {
      for (let i = 0; i < updatedPeriods.length; i++) {
        const p = updatedPeriods[i];
        if (p.id !== record.id && p.isOngoing && !p.endDate) {
          const closed: PeriodRecord = {
            ...p,
            isOngoing: false,
            endDate: p.startDate,
            updatedAt: Date.now(),
          };
          await savePeriod(closed);
          updatedPeriods[i] = closed;
        }
      }
    }
    await savePeriod(record);

    // Automatically cancel pending delay reminders when a new period is recorded
    if (previousAnchor && record.startDate > previousAnchor) {
      const cancelEvent: DelayReminderEvent = {
        id: `delay_cancel_${previousAnchor}_${Date.now()}`,
        cycleAnchorStartDate: previousAnchor,
        estimatedDate: delayStatus.estimatedDate ?? '',
        kind: 'initial',
        daysPastEstimated: delayStatus.daysPastEstimated,
        triggeredAt: Date.now(),
        triggeredDate: todayISO,
        status: 'cancelled_period_logged',
        notificationDispatched: false,
      };
      await saveReminderHistoryEvent(cancelEvent);
    }

    const [nextPeriods, nextReminders] = await Promise.all([
      getAllPeriods(),
      getAllReminderHistory(),
    ]);
    setPeriods(nextPeriods);
    setReminderHistory(nextReminders);
  };

  const handleDeletePeriod = async (id: string) => {
    await deletePeriod(id);
    const next = await getAllPeriods();
    setPeriods(next);
  };

  const handleEndOngoingPeriodToday = async (ongoing: PeriodRecord) => {
    const ended: PeriodRecord = {
      ...ongoing,
      isOngoing: false,
      endDate: todayISO >= ongoing.startDate ? todayISO : ongoing.startDate,
      updatedAt: Date.now(),
    };
    await savePeriod(ended);
    const next = await getAllPeriods();
    setPeriods(next);
  };

  const handleSaveDailyLog = async (log: DailyLog) => {
    await saveDailyLog(log);
    const next = await getAllDailyLogs();
    setDailyLogs(next);
  };

  const handleSavePersonalActivity = async (entry: PersonalActivityEntry) => {
    await savePersonalActivity(entry);
    const next = await getAllPersonalActivities();
    setPersonalActivities(next);
  };

  const handleDeletePersonalActivity = async (id: string) => {
    await deletePersonalActivity(id);
    const next = await getAllPersonalActivities();
    setPersonalActivities(next);
  };

  const handleUpdateSettings = async (next: UserSettings) => {
    setSettings(next);
    await saveUserSettings(next);
  };

  const handleToggleHideActivityIndicators = async () => {
    await handleUpdateSettings({
      ...settings,
      hidePersonalActivityIndicators: !settings.hidePersonalActivityIndicators,
      updatedAt: Date.now(),
    });
  };

  const handleUpdateProfile = async (next: UserProfile) => {
    const saved = await saveUserProfile(next);
    setProfile(saved);
  };

  const handleDismissDelayReminder = async () => {
    if (!delayStatus.anchorStartDate) return;
    const event: DelayReminderEvent = {
      id: `delay_dismiss_${delayStatus.anchorStartDate}_${Date.now()}`,
      cycleAnchorStartDate: delayStatus.anchorStartDate,
      estimatedDate: delayStatus.estimatedDate ?? '',
      kind: 'initial',
      daysPastEstimated: delayStatus.daysPastEstimated,
      triggeredAt: Date.now(),
      triggeredDate: todayISO,
      status: 'dismissed',
      notificationDispatched: false,
    };
    await saveReminderHistoryEvent(event);
    const next = await getAllReminderHistory();
    setReminderHistory(next);
  };

  const handleClearReminderHistory = async () => {
    await clearReminderHistory();
    setReminderHistory([]);
  };

  const handleImportJsonBackup = async (rawJson: string) => {
    const restored = await restoreJsonBackup(rawJson);
    setPeriods(restored.periods);
    setDailyLogs(restored.dailyLogs);
    setPersonalActivities(restored.personalActivities);
    setReminderHistory(restored.reminderHistory);
    setSettings(restored.settings);
    setProfile(restored.profile);
  };

  const handleDeleteAllData = async () => {
    await clearAllFlouraData();
    const freshSettings: UserSettings = { ...DEFAULT_USER_SETTINGS, updatedAt: Date.now() };
    const freshProfile: UserProfile = { ...DEFAULT_USER_PROFILE, updatedAt: Date.now() };
    await Promise.all([saveUserSettings(freshSettings), saveUserProfile(freshProfile)]);
    setPeriods([]);
    setDailyLogs({});
    setPersonalActivities([]);
    setReminderHistory([]);
    setSettings(freshSettings);
    setProfile(freshProfile);
  };

  const handleNavigate = (tab: NavTab, articleId?: string) => {
    setActiveTab(tab);
    if (tab === 'learn') {
      setLearnArticleId(articleId ?? null);
    }
    window.scrollTo({ top: 0, behavior: settings.reducedMotion ? 'auto' : 'smooth' });
  };

  const handleOpenMenstrualHistory = () => {
    setActiveTab('insights');
    window.setTimeout(() => {
      const target = document.getElementById('menstrual-duration-history');
      if (target) {
        target.scrollIntoView({ behavior: settings.reducedMotion ? 'auto' : 'smooth' });
      }
    }, 60);
  };

  return (
    <div className="min-h-screen bg-[#F8F4EC] text-[#342B2D] dark:bg-[#191416] dark:text-[#F6F0EA]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-[#705264] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      {/* Editorial Top Header */}
      <header className="border-b border-[#342B2D]/10 bg-[#F8F4EC]/95 backdrop-blur-md lg:sticky lg:top-0 lg:z-30 dark:border-[#F6F0EA]/10 dark:bg-[#191416]/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => handleNavigate('home')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
          >
            <FlouraEmblem className="h-8 w-8" />
            <span className="font-heading text-2xl font-semibold tracking-wider text-[#342B2D] dark:text-[#F6F0EA]">
              FLOURA
            </span>
          </button>

          <nav aria-label="Primary navigation" className="hidden items-center gap-7 lg:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`font-ui min-h-[42px] border-b-2 px-1 text-sm font-medium transition whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'border-[#705264] text-[#342B2D] dark:border-[#D9A7AF] dark:text-[#F6F0EA]'
                      : 'border-transparent text-[#6F5F5D] hover:text-[#342B2D] dark:text-[#C4B5B1] dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:block">
              <PWAInstallButton variant="compact" />
            </div>
            <button
              type="button"
              onClick={() =>
                setPeriodModalState({
                  isOpen: true,
                  period: summary.ongoingPeriod ?? null,
                  defaultDate: todayISO,
                })
              }
              className="font-ui inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#705264] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5E4354] active:scale-[0.99] whitespace-nowrap shrink-0 dark:bg-[#D9A7AF] dark:text-[#191416] dark:hover:bg-[#E4B9C0]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{summary.ongoingPeriod ? 'Edit Period' : 'Log Period'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main
        id="main-content"
        className="mx-auto max-w-6xl px-4 pt-6 pb-26 sm:px-6 sm:pt-9 lg:pb-16"
      >
        {storageError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-[#A84857]/35 bg-[#C58F98]/15 px-4 py-3 text-sm text-[#782A37] dark:border-[#D9A7AF]/35 dark:text-[#FADCE1]"
          >
            {storageError}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6" aria-busy="true" aria-label="Loading your wellness journal">
            <div className="h-10 w-60 animate-pulse rounded-2xl bg-[#F0E9E2] dark:bg-[#282024]" />
            <div className="h-84 w-full animate-pulse rounded-3xl bg-[#F0E9E2] dark:bg-[#282024]" />
          </div>
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeView
                todayISO={todayISO}
                summary={summary}
                delayStatus={delayStatus}
                settings={settings}
                reminderHistory={reminderHistory}
                todayLog={dailyLogs[todayISO]}
                profile={profile}
                onOpenPeriodModal={(period, defaultDate) =>
                  setPeriodModalState({ isOpen: true, period, defaultDate })
                }
                onEndOngoingPeriod={handleEndOngoingPeriodToday}
                onDismissDelayReminder={handleDismissDelayReminder}
                onOpenDailyLog={(dateISO, tab) =>
                  setDailyLogModalState({ isOpen: true, dateISO, tab })
                }
                onNavigate={handleNavigate}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarView
                todayISO={todayISO}
                summary={summary}
                delayStatus={delayStatus}
                settings={settings}
                reminderHistory={reminderHistory}
                dailyLogs={dailyLogs}
                personalActivities={personalActivities}
                hidePersonalActivityIndicators={Boolean(settings.hidePersonalActivityIndicators)}
                onToggleHideActivityIndicators={handleToggleHideActivityIndicators}
                onDismissDelayReminder={handleDismissDelayReminder}
                onOpenMenstrualHistory={handleOpenMenstrualHistory}
                onOpenEducationArticle={() =>
                  handleNavigate('learn', 'late-period-and-pregnancy-testing')
                }
                onOpenPeriodModal={(period, defaultDate) =>
                  setPeriodModalState({ isOpen: true, period, defaultDate })
                }
                onOpenDailyLog={(dateISO, tab) =>
                  setDailyLogModalState({ isOpen: true, dateISO, tab })
                }
                onOpenPersonalActivityModal={(entry, defaultDate) =>
                  setPersonalActivityModalState({
                    isOpen: true,
                    entry: entry ?? null,
                    defaultDate: defaultDate ?? todayISO,
                  })
                }
                onDeletePersonalActivity={handleDeletePersonalActivity}
              />
            )}

            {activeTab === 'insights' && (
              <InsightsView
                summary={summary}
                dailyLogs={dailyLogs}
                settings={settings}
                onOpenPeriodModal={(period) =>
                  setPeriodModalState({ isOpen: true, period, defaultDate: todayISO })
                }
                onDeletePeriod={handleDeletePeriod}
              />
            )}

            {activeTab === 'learn' && <LearnView initialArticleId={learnArticleId} />}

            {activeTab === 'profile' && (
              <ProfileView
                profile={profile}
                settings={settings}
                summary={summary}
                periods={periods}
                dailyLogs={dailyLogs}
                personalActivities={personalActivities}
                reminderHistory={reminderHistory}
                onUpdateProfile={handleUpdateProfile}
                onUpdateSettings={handleUpdateSettings}
                onClearReminderHistory={handleClearReminderHistory}
                onImportJsonBackup={handleImportJsonBackup}
                onDeleteAllData={handleDeleteAllData}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile & Tablet Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Bottom navigation"
        className="fixed right-0 bottom-0 left-0 z-40 border-t border-[#342B2D]/10 bg-[#F8F4EC]/95 backdrop-blur-md lg:hidden dark:border-[#F6F0EA]/10 dark:bg-[#191416]/95"
      >
        <div className="mx-auto grid h-16 max-w-xl grid-cols-5 items-center pb-safe">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`font-ui relative flex min-h-[48px] flex-col items-center justify-center gap-1 px-1 transition ${
                  isActive
                    ? 'text-[#705264] dark:text-[#D9A7AF]'
                    : 'text-[#6F5F5D] hover:text-[#342B2D] dark:text-[#C4B5B1] dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-[#705264] dark:bg-[#D9A7AF]"
                  />
                )}
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.7]'}`} />
                <span className="text-[11px] font-medium tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      <PeriodModal
        isOpen={periodModalState.isOpen}
        initialPeriod={periodModalState.period}
        defaultStartDate={periodModalState.defaultDate}
        existingPeriods={periods}
        onClose={() => setPeriodModalState({ isOpen: false })}
        onSave={handleSavePeriod}
        onDelete={handleDeletePeriod}
      />

      <DailyLogModal
        isOpen={dailyLogModalState.isOpen}
        dateISO={dailyLogModalState.dateISO}
        initialTab={dailyLogModalState.tab}
        existingLog={dailyLogs[dailyLogModalState.dateISO]}
        onClose={() => setDailyLogModalState((s) => ({ ...s, isOpen: false }))}
        onSave={handleSaveDailyLog}
      />

      <PersonalActivityModal
        isOpen={personalActivityModalState.isOpen}
        initialEntry={personalActivityModalState.entry}
        defaultDate={personalActivityModalState.defaultDate}
        onClose={() =>
          setPersonalActivityModalState((s) => ({ ...s, isOpen: false, entry: null }))
        }
        onSave={handleSavePersonalActivity}
        onDelete={handleDeletePersonalActivity}
      />

      <OfflineAndUpdateBanner />
    </div>
  );
}
