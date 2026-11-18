import React from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Droplets,
  Feather,
  Smile,
} from 'lucide-react';
import { BotanicalSprig, BotanicalStemDivider } from '../components/BotanicalMark';
import { CycleRing } from '../components/CycleRing';
import type { DailyLogTab } from '../components/DailyLogModal';
import { PeriodDelayBanner } from '../components/PeriodDelayBanner';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { DEFAULT_USER_PROFILE, EDUCATIONAL_ARTICLES, MOOD_CATALOG, SYMPTOM_CATALOG } from '../data/catalogs';
import type {
  CycleSummary,
  DailyLog,
  DelayReminderEvent,
  NavTab,
  PeriodDelayStatus,
  PeriodRecord,
  UserProfile,
  UserSettings,
} from '../types/cycle';
import { formatDisplayDate, formatShortDate } from '../utils/dateUtils';

interface HomeViewProps {
  todayISO: string;
  summary: CycleSummary;
  delayStatus: PeriodDelayStatus;
  settings: UserSettings;
  reminderHistory: DelayReminderEvent[];
  todayLog?: DailyLog;
  profile: UserProfile;
  onOpenPeriodModal: (period?: PeriodRecord | null, defaultDate?: string) => void;
  onEndOngoingPeriod: (period: PeriodRecord) => Promise<void>;
  onDismissDelayReminder: () => Promise<void>;
  onOpenDailyLog: (dateISO: string, tab: DailyLogTab) => void;
  onNavigate: (tab: NavTab, articleId?: string) => void;
}

export function getPersonalizedGreeting(profile: UserProfile, hour: number = new Date().getHours()): {
  headline: string;
  kicker: string;
} {
  const name = profile.displayName.trim() || DEFAULT_USER_PROFILE.displayName;
  const isDefaultName = name === DEFAULT_USER_PROFILE.displayName;

  const timeWord =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (profile.greetingStyle === 'welcome_back') {
    return {
      kicker: timeWord,
      headline: `Welcome back, ${name}.`,
    };
  }

  if (profile.greetingStyle === 'wellness_journey') {
    return {
      kicker: `${timeWord}, ${name}`,
      headline: 'Your wellness journey, one day at a time.',
    };
  }

  // Default: time_based
  if (isDefaultName) {
    return {
      kicker: timeWord,
      headline: `Hello, ${DEFAULT_USER_PROFILE.displayName}.`,
    };
  }

  return {
    kicker: 'Your cycle journal',
    headline: `${timeWord}, ${name}.`,
  };
}

export const HomeView: React.FC<HomeViewProps> = ({
  todayISO,
  summary,
  delayStatus,
  settings,
  reminderHistory,
  todayLog,
  profile,
  onOpenPeriodModal,
  onEndOngoingPeriod,
  onDismissDelayReminder,
  onOpenDailyLog,
  onNavigate,
}) => {
  const {
    hasRecords,
    latestPeriod,
    ongoingPeriod,
    currentCycleDay,
    currentPhase,
    estimatedNextPeriodStart,
    estimatedNextPeriodRangeStart,
    estimatedNextPeriodRangeEnd,
    calculatedAvgCycleLength,
    calculatedAvgPeriodDuration,
    validCompletedCyclesCount,
    validPeriodDurationCount,
    effectiveCycleLength,
    effectivePeriodDuration,
    estimateSource,
    estimateSourceLabel,
  } = summary;

  const recommendedArticle =
    currentPhase.id === 'menstrual'
      ? EDUCATIONAL_ARTICLES.find((a) => a.id === 'during-menstruation') ?? EDUCATIONAL_ARTICLES[0]
      : currentPhase.id === 'ovulation'
        ? EDUCATIONAL_ARTICLES.find((a) => a.id === 'understanding-ovulation') ?? EDUCATIONAL_ARTICLES[0]
        : currentPhase.id === 'luteal'
          ? EDUCATIONAL_ARTICLES.find((a) => a.id === 'common-symptoms') ?? EDUCATIONAL_ARTICLES[0]
          : summary.regularityStatus === 'variable'
            ? EDUCATIONAL_ARTICLES.find((a) => a.id === 'irregular-periods') ?? EDUCATIONAL_ARTICLES[0]
            : EDUCATIONAL_ARTICLES.find((a) => a.id === 'four-phases') ?? EDUCATIONAL_ARTICLES[0];

  const greeting = getPersonalizedGreeting(profile);

  return (
    <div className="floura-fade-in space-y-9">
      {/* Editorial Masthead & Personalized Greeting */}
      <header className="flex flex-col justify-between gap-5 border-b border-[#342B2D]/10 pb-6 sm:flex-row sm:items-end dark:border-[#F6F0EA]/12">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            aria-label={`Open personal profile for ${profile.displayName}`}
            className="mt-0.5 rounded-full transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#705264]"
          >
            <ProfileAvatar
              avatarType={profile.avatarType}
              customImageUrl={profile.customAvatarDataUrl}
              displayName={profile.displayName}
              size="md"
            />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#6F5F5D] dark:text-[#C4B5B1]">
              <span className="font-ui">{greeting.kicker}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {formatDisplayDate(todayISO, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance text-[#342B2D] sm:text-5xl dark:text-[#F6F0EA]">
                {greeting.headline}
              </h1>
              <BotanicalSprig className="hidden h-7 w-14 shrink-0 text-[#A4AE96] sm:block dark:text-[#B3BDAA]" />
            </div>
          </div>
        </div>

        {ongoingPeriod && (
          <button
            type="button"
            onClick={() => onEndOngoingPeriod(ongoingPeriod)}
            className="font-ui inline-flex min-h-[44px] items-center gap-2 self-start rounded-2xl border border-[#C58F98]/55 bg-[#F0E9E2] px-4 py-2.5 text-sm font-medium text-[#342B2D] transition hover:bg-[#E7DDD4] sm:self-auto dark:border-[#D9A7AF]/40 dark:bg-[#282024] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
          >
            <CheckCircle2 className="h-4 w-4 text-[#705264] dark:text-[#D9A7AF]" aria-hidden="true" />
            <span>Mark Period Ended Today</span>
          </button>
        )}
      </header>

      {/* Optional Discreet Period Delay Check-In (Estimate Only) */}
      <PeriodDelayBanner
        delayStatus={delayStatus}
        settings={settings}
        reminderHistory={reminderHistory}
        onLogPeriod={() => onOpenPeriodModal(null, todayISO)}
        onDismiss={onDismissDelayReminder}
        onOpenEducationArticle={() =>
          onNavigate('learn', 'late-period-and-pregnancy-testing')
        }
      />

      {/* Centerpiece: Cycle Overview Card */}
      <section
        aria-label="Cycle overview and phase visualization"
        className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 shadow-[0_8px_30px_rgba(52,43,45,0.04)] sm:p-9 dark:border-[#F6F0EA]/10 dark:bg-[#282024] dark:shadow-none"
      >
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          {/* Circular Cycle Visualization */}
          <div className="lg:col-span-6">
            <CycleRing summary={summary} />
          </div>

          {/* Editorial Narrative & Key Cycle Statistics */}
          <div className="space-y-6 lg:col-span-6">
            <div>
              <p className="font-ui text-xs font-semibold tracking-wide text-[#705264] dark:text-[#D9A7AF]">
                {currentPhase.dayRangeLabel}
              </p>
              <h2 className="mt-1.5 font-editorial text-2xl font-medium text-balance text-[#342B2D] sm:text-3xl dark:text-[#F6F0EA]">
                {hasRecords ? currentPhase.label : 'A quiet space for your cycle'}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
                {currentPhase.description}
              </p>
            </div>

            <dl className="grid grid-cols-1 divide-y divide-[#342B2D]/10 border-t border-b border-[#342B2D]/10 sm:grid-cols-2 sm:divide-y-0 dark:divide-[#F6F0EA]/10 dark:border-[#F6F0EA]/10">
              <div className="py-4 sm:border-b sm:border-r sm:border-[#342B2D]/10 sm:pr-5 dark:sm:border-[#F6F0EA]/10">
                <dt className="font-ui text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                  Current cycle day
                </dt>
                <dd className="mt-1 font-heading text-2xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                  {currentCycleDay !== null ? `Day ${currentCycleDay}` : 'Not started'}
                </dd>
                <dd className="mt-0.5 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                  {hasRecords
                    ? ongoingPeriod
                      ? 'Ongoing period recorded'
                      : 'Counted from last start date'
                    : 'Log a period to begin'}
                </dd>
              </div>

              <div className="py-4 sm:border-b sm:border-[#342B2D]/10 sm:pl-5 dark:sm:border-[#F6F0EA]/10">
                <dt className="font-ui text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                  Estimated next period
                </dt>
                <dd className="mt-1 font-heading text-2xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                  {estimatedNextPeriodRangeStart && estimatedNextPeriodRangeEnd
                    ? `${formatShortDate(estimatedNextPeriodRangeStart)} – ${formatShortDate(
                        estimatedNextPeriodRangeEnd
                      )}`
                    : estimatedNextPeriodStart
                      ? formatDisplayDate(estimatedNextPeriodStart)
                      : 'Unknown'}
                </dd>
                <dd className="mt-0.5 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                  {hasRecords ? estimateSourceLabel : 'Estimate only · Not confirmed'}
                </dd>
              </div>

              <div className="py-4 sm:border-r sm:border-[#342B2D]/10 sm:pr-5 dark:sm:border-[#F6F0EA]/10">
                <dt className="font-ui text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                  Last recorded period
                </dt>
                <dd className="mt-1 font-heading text-2xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                  {latestPeriod ? formatDisplayDate(latestPeriod.startDate) : 'None yet'}
                </dd>
                <dd className="mt-0.5 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                  {latestPeriod
                    ? latestPeriod.isOngoing && !latestPeriod.endDate
                      ? 'Marked as ongoing'
                      : latestPeriod.endDate
                        ? `Ended ${formatShortDate(latestPeriod.endDate)}`
                        : 'Start date logged'
                    : 'Record your first entry'}
                </dd>
              </div>

              <div className="py-4 sm:pl-5">
                <dt className="font-ui text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                  Cycle &amp; period averages
                </dt>
                <dd className="mt-1 font-heading text-2xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                  {calculatedAvgCycleLength !== null
                    ? `${calculatedAvgCycleLength}d`
                    : `${effectiveCycleLength}d*`}
                  <span className="mx-1.5 font-body text-sm font-normal text-[#806F6D] dark:text-[#C4B5B1]">
                    /
                  </span>
                  {calculatedAvgPeriodDuration !== null
                    ? `${calculatedAvgPeriodDuration}d`
                    : `${effectivePeriodDuration}d*`}
                </dd>
                <dd className="mt-0.5 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                  {validCompletedCyclesCount > 0
                    ? `From ${validCompletedCyclesCount} ${
                        validCompletedCyclesCount === 1 ? 'cycle' : 'cycles'
                      } · ${validPeriodDurationCount} ${
                        validPeriodDurationCount === 1 ? 'period' : 'periods'
                      }`
                    : estimateSource === 'manual'
                      ? '*Manual baseline (no completed history)'
                      : '*General reference until 2+ cycles logged'}
                </dd>
              </div>
            </dl>

            <p className="text-xs leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
              Confirmed records are always distinguished from calendar estimates. Ovulation and upcoming dates are informational approximations, never medical certainty.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Action Cards */}
      <section aria-labelledby="quick-actions-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="quick-actions-heading"
            className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]"
          >
            Daily Check-In
          </h2>
          <span className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
            Saved locally on this device
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => onOpenPeriodModal(ongoingPeriod ?? null, todayISO)}
            className="font-ui group flex min-h-[72px] flex-col justify-between rounded-2xl border border-[#705264] bg-[#705264] p-4 text-left text-white shadow-xs transition hover:-translate-y-0.5 hover:bg-[#5E4354] active:translate-y-0 dark:border-[#D9A7AF] dark:bg-[#D9A7AF] dark:text-[#191416] dark:hover:bg-[#E4B9C0]"
          >
            <Droplets className="h-5 w-5" aria-hidden="true" />
            <span className="mt-2 text-sm font-semibold">
              {ongoingPeriod ? 'Edit Period' : 'Log Period'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDailyLog(todayISO, 'symptoms')}
            className="font-ui group flex min-h-[72px] flex-col justify-between rounded-2xl border border-[#342B2D]/10 bg-white p-4 text-left text-[#342B2D] transition hover:-translate-y-0.5 hover:border-[#C58F98] hover:bg-[#F0E9E2]/45 dark:border-[#F6F0EA]/10 dark:bg-[#282024] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
          >
            <Activity className="h-5 w-5 text-[#C58F98] dark:text-[#D9A7AF]" aria-hidden="true" />
            <span className="mt-2 text-sm font-semibold">Log Symptoms</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDailyLog(todayISO, 'mood')}
            className="font-ui group flex min-h-[72px] flex-col justify-between rounded-2xl border border-[#342B2D]/10 bg-white p-4 text-left text-[#342B2D] transition hover:-translate-y-0.5 hover:border-[#A4AE96] hover:bg-[#F0E9E2]/45 dark:border-[#F6F0EA]/10 dark:bg-[#282024] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
          >
            <Smile className="h-5 w-5 text-[#7B886D] dark:text-[#B3BDAA]" aria-hidden="true" />
            <span className="mt-2 text-sm font-semibold">Record Mood</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDailyLog(todayISO, 'notes')}
            className="font-ui group flex min-h-[72px] flex-col justify-between rounded-2xl border border-[#342B2D]/10 bg-white p-4 text-left text-[#342B2D] transition hover:-translate-y-0.5 hover:border-[#D8C29C] hover:bg-[#F0E9E2]/45 dark:border-[#F6F0EA]/10 dark:bg-[#282024] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
          >
            <Feather className="h-5 w-5 text-[#9C8153] dark:text-[#E0CCA7]" aria-hidden="true" />
            <span className="mt-2 text-sm font-semibold">Journal Note</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            className="font-ui group col-span-2 flex min-h-[72px] flex-col justify-between rounded-2xl border border-[#342B2D]/10 bg-[#F0E9E2]/70 p-4 text-left text-[#342B2D] transition hover:-translate-y-0.5 hover:bg-[#F0E9E2] sm:col-span-1 dark:border-[#F6F0EA]/10 dark:bg-[#231C1F] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
          >
            <CalendarDays className="h-5 w-5 text-[#705264] dark:text-[#D4B4C6]" aria-hidden="true" />
            <span className="mt-2 text-sm font-semibold">View Calendar</span>
          </button>
        </div>
      </section>

      <BotanicalStemDivider />

      {/* Today's Symptom & Mood Overview + Daily Wellness Journal + Editorial Guide */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Today's Symptoms & Moods */}
        <section
          aria-labelledby="today-overview-heading"
          className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 sm:p-7 lg:col-span-7 dark:border-[#F6F0EA]/10 dark:bg-[#282024]"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2
                id="today-overview-heading"
                className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]"
              >
                Today&apos;s Symptoms &amp; Mood
              </h2>
              <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                {formatDisplayDate(todayISO)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenDailyLog(todayISO, 'symptoms')}
              className="font-ui min-h-[44px] rounded-xl px-3.5 py-2 text-xs font-semibold text-[#705264] hover:bg-[#F0E9E2] dark:text-[#D9A7AF] dark:hover:bg-[#31272C]"
            >
              {todayLog ? 'Edit Today' : 'Add Entry'}
            </button>
          </div>

          <div className="mt-5 divide-y divide-[#342B2D]/10 dark:divide-[#F6F0EA]/10">
            <div className="pb-4">
              <h3 className="font-ui text-xs font-medium text-[#6F5F5D] dark:text-[#C4B5B1]">
                Symptoms
              </h3>
              {todayLog && todayLog.symptoms.length > 0 ? (
                <p className="mt-1.5 text-sm leading-relaxed text-[#342B2D] dark:text-[#F6F0EA]">
                  {todayLog.symptoms
                    .map((s) => {
                      const def = SYMPTOM_CATALOG.find((c) => c.id === s.id);
                      return `${def?.label ?? s.id} (${s.severity})`;
                    })
                    .join(' · ')}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-[#6F5F5D] dark:text-[#C4B5B1]">
                  Nothing logged yet today.
                </p>
              )}
            </div>

            <div className="py-4">
              <h3 className="font-ui text-xs font-medium text-[#6F5F5D] dark:text-[#C4B5B1]">
                Mood Check-Ins
              </h3>
              {todayLog && todayLog.moods.length > 0 ? (
                <ul className="mt-1.5 space-y-1.5">
                  {todayLog.moods.map((m) => {
                    const def = MOOD_CATALOG.find((c) => c.id === m.mood);
                    return (
                      <li key={m.id} className="text-sm text-[#342B2D] dark:text-[#F6F0EA]">
                        <span className="font-medium">{def?.label ?? m.mood}</span>
                        <span className="mx-1.5 text-[#806F6D]" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                          {m.time}
                        </span>
                        {m.note ? ` — ${m.note}` : ''}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-1.5 text-sm text-[#6F5F5D] dark:text-[#C4B5B1]">
                  No moods recorded today.
                </p>
              )}
            </div>

            {/* Daily Wellness Journal Excerpt */}
            <div className="pt-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-ui text-xs font-medium text-[#6F5F5D] dark:text-[#C4B5B1]">
                  Daily Wellness Journal
                </h3>
                <button
                  type="button"
                  onClick={() => onOpenDailyLog(todayISO, 'notes')}
                  className="font-ui min-h-[36px] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#705264] hover:bg-[#F0E9E2] dark:text-[#D9A7AF] dark:hover:bg-[#31272C]"
                >
                  {todayLog?.notes ? 'Edit Note' : 'Write Note'}
                </button>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#342B2D] dark:text-[#F6F0EA]">
                {todayLog?.notes ? (
                  <span className="font-editorial italic">&ldquo;{todayLog.notes}&rdquo;</span>
                ) : (
                  <span className="text-[#6F5F5D] dark:text-[#C4B5B1]">
                    Capture how you slept, rested, or felt today in your private journal.
                  </span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Editorial Reading Excerpt */}
        <section
          aria-labelledby="edu-highlight-heading"
          className="flex flex-col justify-between rounded-3xl border border-[#342B2D]/10 bg-[#F0E9E2]/75 p-6 sm:p-7 lg:col-span-5 dark:border-[#F6F0EA]/10 dark:bg-[#231C1F]"
        >
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-[#705264] dark:text-[#D9A7AF]">
              <span className="font-ui inline-flex items-center gap-1.5 font-semibold">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Editorial Guide · {recommendedArticle.category}</span>
              </span>
              <span>{recommendedArticle.readTime}</span>
            </div>
            <h2
              id="edu-highlight-heading"
              className="mt-3 font-editorial text-2xl font-medium text-balance text-[#342B2D] dark:text-[#F6F0EA]"
            >
              {recommendedArticle.title}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
              {recommendedArticle.summary}
            </p>
            <ul className="mt-4 space-y-2 border-t border-[#342B2D]/10 pt-4 text-xs leading-relaxed text-[#342B2D] dark:border-[#F6F0EA]/10 dark:text-[#F6F0EA]">
              {recommendedArticle.keyPoints.slice(0, 2).map((pt) => (
                <li key={pt}>• {pt}</li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => onNavigate('learn', recommendedArticle.id)}
              className="font-ui inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#342B2D]/15 bg-white px-4 py-2 text-sm font-medium text-[#342B2D] transition hover:bg-[#F8F4EC] dark:border-[#F6F0EA]/15 dark:bg-[#282024] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
            >
              <span>Read Full Article</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
