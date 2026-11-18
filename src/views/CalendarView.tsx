import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Diamond,
  Droplets,
  Edit3,
  Eye,
  EyeOff,
  Heart,
  Plus,
  Trash2,
} from 'lucide-react';
import type { DailyLogTab } from '../components/DailyLogModal';
import { PeriodDelayBanner } from '../components/PeriodDelayBanner';
import {
  MOOD_CATALOG,
  PERSONAL_ACTIVITY_CONTEXTS,
  SYMPTOM_CATALOG,
} from '../data/catalogs';
import type {
  CycleSummary,
  DailyLog,
  DelayReminderEvent,
  PeriodDelayStatus,
  PeriodRecord,
  PersonalActivityEntry,
  UserSettings,
} from '../types/cycle';
import { getDayCalendarStatus, getPeriodDurationDays } from '../utils/cycleCalculations';
import {
  formatDisplayDate,
  formatMonthYear,
  getMonthGridDays,
} from '../utils/dateUtils';

interface CalendarViewProps {
  todayISO: string;
  summary: CycleSummary;
  delayStatus: PeriodDelayStatus;
  settings: UserSettings;
  reminderHistory: DelayReminderEvent[];
  dailyLogs: Record<string, DailyLog>;
  personalActivities: PersonalActivityEntry[];
  hidePersonalActivityIndicators: boolean;
  onToggleHideActivityIndicators: () => Promise<void>;
  onDismissDelayReminder: () => Promise<void>;
  onOpenMenstrualHistory: () => void;
  onOpenEducationArticle?: () => void;
  onOpenPeriodModal: (period?: PeriodRecord | null, defaultDate?: string) => void;
  onOpenDailyLog: (dateISO: string, tab: DailyLogTab) => void;
  onOpenPersonalActivityModal: (
    entry?: PersonalActivityEntry | null,
    defaultDate?: string
  ) => void;
  onDeletePersonalActivity: (id: string) => Promise<void>;
}

type InspectorSectionKey = 'period' | 'symptoms' | 'mood' | 'activity' | 'notes';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  todayISO,
  summary,
  delayStatus,
  settings,
  reminderHistory,
  dailyLogs,
  personalActivities,
  hidePersonalActivityIndicators,
  onToggleHideActivityIndicators,
  onDismissDelayReminder,
  onOpenMenstrualHistory,
  onOpenEducationArticle,
  onOpenPeriodModal,
  onOpenDailyLog,
  onOpenPersonalActivityModal,
  onDeletePersonalActivity,
}) => {
  const [todayYear, todayMonth] = useMemo(() => {
    const [y, m] = todayISO.split('-').map(Number);
    return [y, m - 1];
  }, [todayISO]);

  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [confirmDeleteActivityId, setConfirmDeleteActivityId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<InspectorSectionKey, boolean>>({
    period: true,
    symptoms: true,
    mood: true,
    activity: true,
    notes: true,
  });

  const cells = useMemo(() => getMonthGridDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const activitiesByDate = useMemo(() => {
    const map: Record<string, PersonalActivityEntry[]> = {};
    for (const entry of personalActivities) {
      if (!map[entry.date]) {
        map[entry.date] = [];
      }
      map[entry.date].push(entry);
    }
    return map;
  }, [personalActivities]);

  const toggleSection = (key: InspectorSectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectDate = (iso: string) => {
    setSelectedDate(iso);
    setConfirmDeleteActivityId(null);
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setViewYear(todayYear);
    setViewMonth(todayMonth);
    handleSelectDate(todayISO);
  };

  const selectedStatus = getDayCalendarStatus(selectedDate, summary, todayISO);
  const selectedLog = dailyLogs[selectedDate];
  const selectedActivities = activitiesByDate[selectedDate] ?? [];
  const sortedPeriodsDesc = [...summary.sortedPeriods].reverse();

  return (
    <div className="floura-fade-in space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#342B2D]/10 pb-5 sm:flex-row sm:items-end dark:border-[#F6F0EA]/12">
        <div>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-[#342B2D] dark:text-[#F6F0EA]">
            Cycle Calendar
          </h1>
          <p className="mt-1 text-sm text-[#6F5F5D] dark:text-[#C4B5B1]">
            Select any date to inspect period logs, symptoms, moods, personal activity, or notes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={onOpenMenstrualHistory}
            className="font-ui inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#342B2D]/15 bg-white px-4 py-2 text-sm font-medium text-[#342B2D] transition hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/15 dark:bg-[#282024] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
          >
            <span>Menstrual History</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenPeriodModal(null, selectedDate <= todayISO ? selectedDate : todayISO)}
            className="font-ui inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#705264] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5E4354] dark:bg-[#D9A7AF] dark:text-[#191416] dark:hover:bg-[#E4B9C0]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Log Period</span>
          </button>
        </div>
      </div>

      {/* Period Delay Estimate Callout (Estimate Only, Never Auto-Converts to Period) */}
      <PeriodDelayBanner
        delayStatus={delayStatus}
        settings={settings}
        reminderHistory={reminderHistory}
        onLogPeriod={() => onOpenPeriodModal(null, todayISO)}
        onDismiss={onDismissDelayReminder}
        onOpenEducationArticle={onOpenEducationArticle}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Minimal Editorial Calendar Grid */}
        <section
          aria-label="Monthly cycle calendar"
          className="rounded-3xl border border-[#342B2D]/10 bg-white p-5 sm:p-7 lg:col-span-7 dark:border-[#F6F0EA]/10 dark:bg-[#282024]"
        >
          <div className="flex items-center justify-between gap-2 pb-5">
            <h2 className="font-editorial text-2xl font-medium text-[#342B2D] dark:text-[#F6F0EA]">
              {formatMonthYear(viewYear, viewMonth)}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goPrevMonth}
                aria-label="Previous month"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#342B2D]/12 text-[#342B2D] transition hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/12 dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goToToday}
                className="font-ui min-h-[44px] rounded-xl border border-[#342B2D]/12 px-3.5 py-2 text-xs font-medium text-[#342B2D] transition hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/12 dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={goNextMonth}
                aria-label="Next month"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#342B2D]/12 text-[#342B2D] transition hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/12 dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 pb-2 text-center font-ui text-xs font-medium text-[#6F5F5D] dark:text-[#C4B5B1]">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div
            role="grid"
            aria-label={formatMonthYear(viewYear, viewMonth)}
            className="grid grid-cols-7 gap-1.5"
          >
            {cells.map((cell) => {
              const status = getDayCalendarStatus(cell.iso, summary, todayISO);
              const log = dailyLogs[cell.iso];
              const dayActivities = activitiesByDate[cell.iso] ?? [];
              const hasSymptoms = Boolean(log && log.symptoms.length > 0);
              const hasMoods = Boolean(log && log.moods.length > 0);
              const hasNotes = Boolean(log && log.notes.trim().length > 0);
              const showActivityHeart =
                dayActivities.length > 0 && !hidePersonalActivityIndicators;
              const isSelected = selectedDate === cell.iso;
              const isToday = cell.iso === todayISO;

              const ariaParts = [formatDisplayDate(cell.iso)];
              if (status.isRecordedPeriod) ariaParts.push('Recorded period day');
              else if (status.isPastEstimatedWindow) ariaParts.push('Past estimated period window, unconfirmed');
              else if (status.isEstimatedPeriod) ariaParts.push('Estimated upcoming period');
              if (status.isEstimatedOvulation) ariaParts.push('Estimated ovulation day, not confirmed');
              else if (status.isEstimatedFertile) ariaParts.push('Estimated fertile window');
              if (hasSymptoms) ariaParts.push(`${log.symptoms.length} symptoms logged`);
              if (hasMoods) ariaParts.push(`${log.moods.length} moods logged`);
              if (hasNotes) ariaParts.push('Daily note logged');
              if (showActivityHeart) {
                ariaParts.push(
                  `${dayActivities.length} personal activity ${
                    dayActivities.length === 1 ? 'entry' : 'entries'
                  }`
                );
              }

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => handleSelectDate(cell.iso)}
                  aria-label={ariaParts.join(', ')}
                  aria-pressed={isSelected}
                  className={`relative flex min-h-[54px] flex-col items-center justify-between rounded-2xl border p-1.5 transition sm:min-h-[64px] sm:p-2 ${
                    !cell.inCurrentMonth ? 'opacity-35' : ''
                  } ${
                    status.isRecordedPeriod
                      ? 'border-[#C58F98] bg-[#C58F98]/26 text-[#342B2D] dark:border-[#D9A7AF] dark:bg-[#D9A7AF]/22 dark:text-[#F6F0EA]'
                      : status.isPastEstimatedWindow
                        ? 'border-dashed border-[#705264]/55 bg-[#F0E9E2]/80 text-[#342B2D] dark:border-[#D9A7AF]/55 dark:bg-[#231C1F] dark:text-[#F6F0EA]'
                        : status.isEstimatedPeriod
                          ? 'border-dashed border-[#C58F98] bg-[#C58F98]/10 text-[#342B2D] dark:border-[#D9A7AF]/70 dark:bg-[#D9A7AF]/10 dark:text-[#F6F0EA]'
                          : status.isEstimatedOvulation
                            ? 'border-[#D8C29C] bg-[#D8C29C]/25 text-[#342B2D] dark:border-[#E0CCA7]/75 dark:bg-[#E0CCA7]/18 dark:text-[#F6F0EA]'
                            : status.isEstimatedFertile
                              ? 'border-dotted border-[#A4AE96] bg-[#A4AE96]/14 text-[#342B2D] dark:border-[#B3BDAA]/60 dark:bg-[#B3BDAA]/12 dark:text-[#F6F0EA]'
                              : 'border-[#342B2D]/8 bg-[#F8F4EC]/65 text-[#342B2D] hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/8 dark:bg-[#191416] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]'
                  } ${
                    isSelected
                      ? 'ring-2 ring-[#705264] ring-offset-1 dark:ring-[#D9A7AF] dark:ring-offset-[#282024]'
                      : ''
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-0.5">
                    <span
                      className={`text-xs font-semibold tabular-nums sm:text-sm ${
                        isToday
                          ? 'underline decoration-[#705264] decoration-2 underline-offset-2 dark:decoration-[#D9A7AF]'
                          : ''
                      }`}
                    >
                      {cell.dayOfMonth}
                    </span>

                    {status.isRecordedPeriod ? (
                      <Droplets
                        className="h-3 w-3 shrink-0 text-[#705264] dark:text-[#D9A7AF]"
                        aria-hidden="true"
                      />
                    ) : status.isEstimatedOvulation ? (
                      <Diamond
                        className="h-3 w-3 shrink-0 text-[#705264] dark:text-[#E0CCA7]"
                        aria-hidden="true"
                      />
                    ) : status.isPastEstimatedWindow || status.isEstimatedPeriod ? (
                      <span className="text-[9px] font-semibold text-[#705264] dark:text-[#D9A7AF]">
                        Est
                      </span>
                    ) : null}
                  </div>

                  {/* Color-independent compact markers for symptoms, moods, notes & personal activity */}
                  <div className="flex h-3 w-full items-center justify-center gap-1 pt-0.5">
                    {hasSymptoms && (
                      <span
                        title="Symptoms logged"
                        className="h-1.5 w-1.5 shrink-0 rounded-none bg-[#705264] dark:bg-[#D9A7AF]"
                      />
                    )}
                    {hasMoods && (
                      <span
                        title="Mood logged"
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#68755A] dark:bg-[#B3BDAA]"
                      />
                    )}
                    {hasNotes && (
                      <span
                        title="Daily note"
                        className="h-1 w-2 shrink-0 rounded-xs bg-[#8F7448] dark:bg-[#E0CCA7]"
                      />
                    )}
                    {showActivityHeart && (
                      <Heart
                        className="h-2.5 w-2.5 shrink-0 fill-[#C58F98] text-[#705264] dark:fill-[#D9A7AF] dark:text-[#D9A7AF]"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Accessible Color-Independent Legend + Discreet Indicator Toggle */}
          <div className="mt-5 border-t border-[#342B2D]/10 pt-4 dark:border-[#F6F0EA]/10">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs text-[#6F5F5D] sm:grid-cols-4 dark:text-[#C4B5B1]">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#C58F98] bg-[#C58F98]/26">
                  <Droplets className="h-3 w-3 text-[#705264] dark:text-[#D9A7AF]" aria-hidden="true" />
                </span>
                <span>Recorded period</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-dashed border-[#C58F98] bg-[#C58F98]/10 text-[8px] font-bold text-[#705264] dark:text-[#D9A7AF]">
                  Est
                </span>
                <span>Estimated period</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#D8C29C] bg-[#D8C29C]/25">
                  <Diamond className="h-3 w-3 text-[#705264] dark:text-[#E0CCA7]" aria-hidden="true" />
                </span>
                <span>Ovulation (est.)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 shrink-0 rounded-md border border-dotted border-[#A4AE96] bg-[#A4AE96]/14" />
                <span>Fertile window</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-none bg-[#705264] dark:bg-[#D9A7AF]" />
                </span>
                <span>Symptom</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#68755A] dark:bg-[#B3BDAA]" />
                </span>
                <span>Mood</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <span className="h-1.5 w-3 rounded-xs bg-[#8F7448] dark:bg-[#E0CCA7]" />
                </span>
                <span>Daily note</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <Heart
                    className="h-3.5 w-3.5 fill-[#C58F98] text-[#705264] dark:fill-[#D9A7AF] dark:text-[#D9A7AF]"
                    aria-hidden="true"
                  />
                </span>
                <span>{hidePersonalActivityIndicators ? 'Activity (hidden)' : 'Personal activity'}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={onToggleHideActivityIndicators}
                aria-pressed={hidePersonalActivityIndicators}
                className="font-ui inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#342B2D]/12 px-3 py-1.5 text-xs font-medium text-[#6F5F5D] transition hover:bg-[#F0E9E2] hover:text-[#342B2D] dark:border-[#F6F0EA]/12 dark:text-[#C4B5B1] dark:hover:bg-[#31272C] dark:hover:text-[#F6F0EA]"
              >
                {hidePersonalActivityIndicators ? (
                  <>
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Show activity icons</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Hide activity icons</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Daily Date Inspector with 5 Expandable Sections */}
        <aside
          aria-label="Selected date details"
          className="space-y-5 rounded-3xl border border-[#342B2D]/10 bg-white p-6 lg:col-span-5 dark:border-[#F6F0EA]/10 dark:bg-[#282024]"
        >
          <div className="border-b border-[#342B2D]/10 pb-4 dark:border-[#F6F0EA]/10">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              {selectedStatus.cycleDay !== null && (
                <>
                  <span className="font-semibold text-[#705264] tabular-nums dark:text-[#D9A7AF]">
                    Cycle Day {selectedStatus.cycleDay}
                  </span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>
                {selectedStatus.isRecordedPeriod
                  ? selectedStatus.isOngoingPeriodDay
                    ? 'Ongoing recorded period'
                    : 'Confirmed period day'
                  : selectedStatus.isPastEstimatedWindow
                    ? 'Past estimated window (estimate only · not recorded)'
                    : selectedStatus.isEstimatedPeriod
                      ? 'Estimated upcoming period'
                      : selectedStatus.isEstimatedOvulation
                        ? 'Estimated ovulation (not confirmed)'
                        : selectedStatus.isEstimatedFertile
                          ? 'Estimated fertile window (uncertain)'
                          : 'No period record'}
              </span>
            </div>
            <h2 className="mt-1.5 font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
              {formatDisplayDate(selectedDate, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h2>
          </div>

          <div className="divide-y divide-[#342B2D]/10 dark:divide-[#F6F0EA]/10">
            {/* 1. Period Information */}
            <section className="pb-3.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleSection('period')}
                  aria-expanded={openSections.period}
                  aria-controls="inspector-section-period"
                  className="font-ui flex min-h-[44px] flex-1 items-center justify-between gap-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Droplets
                      className="h-4 w-4 shrink-0 text-[#C58F98] dark:text-[#D9A7AF]"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                      Period Information
                    </span>
                    {selectedStatus.recordedPeriod && (
                      <span className="text-xs text-[#705264] dark:text-[#D9A7AF]">
                        · Recorded
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#6F5F5D] transition-transform dark:text-[#C4B5B1] ${
                      openSections.period ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {selectedDate <= todayISO && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenPeriodModal(selectedStatus.recordedPeriod ?? null, selectedDate)
                    }
                    className="font-ui min-h-[38px] shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold text-[#705264] hover:bg-[#F0E9E2] dark:text-[#D9A7AF] dark:hover:bg-[#31272C]"
                  >
                    {selectedStatus.recordedPeriod ? 'Edit' : 'Add Entry'}
                  </button>
                )}
              </div>

              {openSections.period && (
                <div id="inspector-section-period" className="mt-2 rounded-2xl bg-[#F0E9E2]/60 p-3.5 dark:bg-[#231C1F]">
                  {selectedStatus.recordedPeriod ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                        Started {formatDisplayDate(selectedStatus.recordedPeriod.startDate)}
                        {selectedStatus.recordedPeriod.isOngoing &&
                        !selectedStatus.recordedPeriod.endDate
                          ? ' (Ongoing)'
                          : selectedStatus.recordedPeriod.endDate
                            ? ` – ${formatDisplayDate(selectedStatus.recordedPeriod.endDate)}`
                            : ''}
                      </p>
                      {(selectedStatus.recordedPeriod.flowIntensity ||
                        selectedStatus.recordedPeriod.notes) && (
                        <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                          {selectedStatus.recordedPeriod.flowIntensity
                            ? `${selectedStatus.recordedPeriod.flowIntensity} flow`
                            : ''}
                          {selectedStatus.recordedPeriod.flowIntensity &&
                          selectedStatus.recordedPeriod.notes
                            ? ' · '
                            : ''}
                          {selectedStatus.recordedPeriod.notes ?? ''}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                      {selectedDate > todayISO
                        ? 'Future date — estimates only. Periods can be logged up to today.'
                        : 'No period recorded for this date. Estimated dates never auto-convert to logs.'}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* 2. Symptoms */}
            <section className="py-3.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleSection('symptoms')}
                  aria-expanded={openSections.symptoms}
                  aria-controls="inspector-section-symptoms"
                  className="font-ui flex min-h-[44px] flex-1 items-center justify-between gap-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-none bg-[#705264] dark:bg-[#D9A7AF]"
                    />
                    <span className="text-sm font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                      Symptoms
                    </span>
                    {selectedLog && selectedLog.symptoms.length > 0 && (
                      <span className="text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                        ({selectedLog.symptoms.length})
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#6F5F5D] transition-transform dark:text-[#C4B5B1] ${
                      openSections.symptoms ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDailyLog(selectedDate, 'symptoms')}
                  className="font-ui min-h-[38px] shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold text-[#705264] hover:bg-[#F0E9E2] dark:text-[#D9A7AF] dark:hover:bg-[#31272C]"
                >
                  {selectedLog?.symptoms.length ? 'Edit' : 'Add Entry'}
                </button>
              </div>

              {openSections.symptoms && (
                <div id="inspector-section-symptoms" className="mt-1.5">
                  {selectedLog && selectedLog.symptoms.length > 0 ? (
                    <p className="text-sm text-[#342B2D] dark:text-[#F6F0EA]">
                      {selectedLog.symptoms
                        .map((s) => {
                          const def = SYMPTOM_CATALOG.find((c) => c.id === s.id);
                          return `${def?.label ?? s.id} (${s.severity})`;
                        })
                        .join(' · ')}
                    </p>
                  ) : (
                    <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                      No symptoms recorded for this date.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* 3. Mood */}
            <section className="py-3.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleSection('mood')}
                  aria-expanded={openSections.mood}
                  aria-controls="inspector-section-mood"
                  className="font-ui flex min-h-[44px] flex-1 items-center justify-between gap-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#68755A] dark:bg-[#B3BDAA]"
                    />
                    <span className="text-sm font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                      Mood
                    </span>
                    {selectedLog && selectedLog.moods.length > 0 && (
                      <span className="text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                        ({selectedLog.moods.length})
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#6F5F5D] transition-transform dark:text-[#C4B5B1] ${
                      openSections.mood ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDailyLog(selectedDate, 'mood')}
                  className="font-ui min-h-[38px] shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold text-[#705264] hover:bg-[#F0E9E2] dark:text-[#D9A7AF] dark:hover:bg-[#31272C]"
                >
                  {selectedLog?.moods.length ? 'Edit' : 'Add Entry'}
                </button>
              </div>

              {openSections.mood && (
                <div id="inspector-section-mood" className="mt-1.5">
                  {selectedLog && selectedLog.moods.length > 0 ? (
                    <ul className="space-y-1 text-sm text-[#342B2D] dark:text-[#F6F0EA]">
                      {selectedLog.moods.map((m) => {
                        const def = MOOD_CATALOG.find((c) => c.id === m.mood);
                        return (
                          <li key={m.id}>
                            <span className="font-medium">{def?.label ?? m.mood}</span> ·{' '}
                            <span className="text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                              {m.time}
                            </span>
                            {m.note ? ` — ${m.note}` : ''}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                      No mood entries recorded for this date.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* 4. Personal Activity (Optional, Discreet, Nonjudgmental) */}
            <section className="py-3.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleSection('activity')}
                  aria-expanded={openSections.activity}
                  aria-controls="inspector-section-activity"
                  className="font-ui flex min-h-[44px] flex-1 items-center justify-between gap-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Heart
                      className="h-3.5 w-3.5 shrink-0 fill-[#C58F98] text-[#705264] dark:fill-[#D9A7AF] dark:text-[#D9A7AF]"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                      Personal Activity
                    </span>
                    {selectedActivities.length > 0 && (
                      <span className="text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                        ({selectedActivities.length})
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#6F5F5D] transition-transform dark:text-[#C4B5B1] ${
                      openSections.activity ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenPersonalActivityModal(null, selectedDate)}
                  className="font-ui min-h-[38px] shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold text-[#705264] hover:bg-[#F0E9E2] dark:text-[#D9A7AF] dark:hover:bg-[#31272C]"
                >
                  Add Entry
                </button>
              </div>

              {openSections.activity && (
                <div id="inspector-section-activity" className="mt-2 space-y-2.5">
                  {selectedActivities.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedActivities.map((entry) => {
                        const contextDef = PERSONAL_ACTIVITY_CONTEXTS.find(
                          (c) => c.id === entry.context
                        );
                        const isConfirming = confirmDeleteActivityId === entry.id;
                        return (
                          <li
                            key={entry.id}
                            className="rounded-2xl border border-[#342B2D]/10 bg-[#F8F4EC]/75 p-3 dark:border-[#F6F0EA]/10 dark:bg-[#191416]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]">
                                  {contextDef?.label ?? 'Recorded'}
                                </p>
                                {entry.notes && (
                                  <p className="mt-1 text-xs leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
                                    {entry.notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onOpenPersonalActivityModal(entry)}
                                  aria-label="Edit personal activity entry"
                                  className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-[#705264] transition hover:bg-[#F0E9E2] dark:text-[#D9A7AF] dark:hover:bg-[#31272C]"
                                >
                                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmDeleteActivityId(isConfirming ? null : entry.id)
                                  }
                                  aria-label="Delete personal activity entry"
                                  className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-[#8C3343] transition hover:bg-[#C58F98]/15 dark:text-[#D9A7AF] dark:hover:bg-[#D9A7AF]/15"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </div>

                            {isConfirming && (
                              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#342B2D]/10 pt-2.5 dark:border-[#F6F0EA]/10">
                                <span className="text-xs text-[#782A37] dark:text-[#FADCE1]">
                                  Remove this entry?
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await onDeletePersonalActivity(entry.id);
                                      setConfirmDeleteActivityId(null);
                                    }}
                                    className="font-ui min-h-[34px] rounded-lg bg-[#8C3343] px-2.5 py-1 text-xs font-medium text-white"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteActivityId(null)}
                                    className="font-ui min-h-[34px] rounded-lg border border-[#342B2D]/15 px-2.5 py-1 text-xs font-medium text-[#342B2D] dark:border-[#F6F0EA]/15 dark:text-[#F6F0EA]"
                                  >
                                    Keep
                                  </button>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                      No personal activity logged for this date. Optional and stored only on this device.
                    </p>
                  )}

                  {hidePersonalActivityIndicators && selectedActivities.length > 0 && (
                    <p className="text-[11px] text-[#6F5F5D] dark:text-[#C4B5B1]">
                      Calendar heart icons are hidden; entries remain saved locally.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* 5. Daily Notes */}
            <section className="pt-3.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleSection('notes')}
                  aria-expanded={openSections.notes}
                  aria-controls="inspector-section-notes"
                  className="font-ui flex min-h-[44px] flex-1 items-center justify-between gap-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-3 shrink-0 rounded-xs bg-[#8F7448] dark:bg-[#E0CCA7]"
                    />
                    <span className="text-sm font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                      Daily Notes
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#6F5F5D] transition-transform dark:text-[#C4B5B1] ${
                      openSections.notes ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDailyLog(selectedDate, 'notes')}
                  className="font-ui min-h-[38px] shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold text-[#705264] hover:bg-[#F0E9E2] dark:text-[#D9A7AF] dark:hover:bg-[#31272C]"
                >
                  {selectedLog?.notes ? 'Edit' : 'Add Entry'}
                </button>
              </div>

              {openSections.notes && (
                <div id="inspector-section-notes" className="mt-1.5">
                  <p className="text-sm leading-relaxed text-[#342B2D] dark:text-[#F6F0EA]">
                    {selectedLog?.notes ? (
                      selectedLog.notes
                    ) : (
                      <span className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                        No notes recorded for this date.
                      </span>
                    )}
                  </p>
                </div>
              )}
            </section>
          </div>
        </aside>
      </div>

      {/* Period History List */}
      <section
        aria-labelledby="period-history-heading"
        className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 sm:p-7 dark:border-[#F6F0EA]/10 dark:bg-[#282024]"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2
              id="period-history-heading"
              className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]"
            >
              Recorded Period History
            </h2>
            <p className="mt-0.5 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              Edit or remove any previous entry. All cycle lengths recalculate automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenMenstrualHistory}
            className="font-ui inline-flex min-h-[42px] items-center gap-1.5 self-start rounded-xl border border-[#342B2D]/14 px-3.5 py-2 text-xs font-medium text-[#705264] transition hover:bg-[#F0E9E2] sm:self-auto dark:border-[#F6F0EA]/14 dark:text-[#D9A7AF] dark:hover:bg-[#31272C]"
          >
            <span>View Charts &amp; Full Duration History</span>
          </button>
        </div>

        {sortedPeriodsDesc.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#342B2D]/18 p-8 text-center dark:border-[#F6F0EA]/18">
            <p className="text-sm text-[#6F5F5D] dark:text-[#C4B5B1]">
              No period records logged yet.
            </p>
            <button
              type="button"
              onClick={() => onOpenPeriodModal(null, todayISO)}
              className="font-ui mt-3 min-h-[44px] rounded-xl bg-[#705264] px-5 py-2 text-sm font-medium text-white hover:bg-[#5E4354] dark:bg-[#D9A7AF] dark:text-[#191416]"
            >
              Log First Period
            </button>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#342B2D]/10 dark:divide-[#F6F0EA]/10">
            {sortedPeriodsDesc.map((p) => {
              const duration = getPeriodDurationDays(p);
              const cycleMatch = summary.completedCycles.find((c) =>
                c.id.startsWith(`${p.id}_`)
              );
              return (
                <div
                  key={p.id}
                  className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                      {formatDisplayDate(p.startDate)}
                      {p.isOngoing && !p.endDate
                        ? ' – Ongoing'
                        : p.endDate
                          ? ` – ${formatDisplayDate(p.endDate)}`
                          : ' (Start date only)'}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                      {duration !== null
                        ? `${duration} bleeding ${duration === 1 ? 'day' : 'days'}`
                        : p.isOngoing
                          ? 'In progress'
                          : 'End date not set'}
                      {cycleMatch ? ` · ${cycleMatch.cycleLength}-day cycle` : ''}
                      {p.flowIntensity ? ` · ${p.flowIntensity} flow` : ''}
                      {p.notes ? ` · ${p.notes}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenPeriodModal(p)}
                    className="font-ui inline-flex min-h-[44px] items-center gap-1.5 self-start rounded-xl border border-[#342B2D]/14 px-3.5 py-2 text-xs font-medium text-[#342B2D] hover:bg-[#F0E9E2] sm:self-auto dark:border-[#F6F0EA]/14 dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
                  >
                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edit / Delete</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
