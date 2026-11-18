import React, { useState } from 'react';
import { BookOpen, CalendarPlus, ChevronDown, Clock, X } from 'lucide-react';
import { DELAY_REMINDER_COPY, PREGNANCY_TEST_EDUCATION } from '../data/catalogs';
import type { DelayReminderEvent, PeriodDelayStatus, UserSettings } from '../types/cycle';
import { formatDisplayDate } from '../utils/dateUtils';

interface PeriodDelayBannerProps {
  delayStatus: PeriodDelayStatus;
  settings: UserSettings;
  reminderHistory: DelayReminderEvent[];
  onLogPeriod: () => void;
  onDismiss: () => Promise<void>;
  onOpenEducationArticle?: () => void;
}

export const PeriodDelayBanner: React.FC<PeriodDelayBannerProps> = ({
  delayStatus,
  settings,
  reminderHistory,
  onLogPeriod,
  onDismiss,
  onOpenEducationArticle,
}) => {
  const [showEducation, setShowEducation] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  if (!delayStatus.hasValidPrediction || !delayStatus.isDelayed || !delayStatus.anchorStartDate) {
    return null;
  }

  const isDismissedOrResolved = reminderHistory.some(
    (e) =>
      e.cycleAnchorStartDate === delayStatus.anchorStartDate &&
      (e.status === 'dismissed' || e.status === 'cancelled_period_logged')
  );

  if (isDismissedOrResolved) {
    return null;
  }

  const delayConfig = settings.periodDelayReminder ?? {
    enabled: false,
    initialDaysAfter: 1,
    followUpDaysAfter: 7,
    time: '09:00',
  };

  const followUpThreshold = Math.max(
    (delayConfig.initialDaysAfter || 1) + 1,
    delayConfig.followUpDaysAfter || 7
  );

  const primaryMessage = delayStatus.isWithinVariabilityWindow
    ? delayStatus.detailMessage
    : delayStatus.daysPastEstimated >= followUpThreshold
      ? DELAY_REMINDER_COPY.follow_up
      : DELAY_REMINDER_COPY.initial;

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await onDismiss();
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <section
      aria-label="Estimated cycle update"
      className="rounded-3xl border border-[#C58F98]/45 bg-[#F0E9E2]/80 p-5 sm:p-6 dark:border-[#D9A7AF]/30 dark:bg-[#231C1F]"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#705264] dark:text-[#D9A7AF]">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-ui font-semibold">{delayStatus.statusLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#6F5F5D] dark:text-[#C4B5B1]">
              Estimate only · Est. {delayStatus.estimatedDate ? formatDisplayDate(delayStatus.estimatedDate) : ''}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-[#342B2D] dark:text-[#F6F0EA]">
            {primaryMessage}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          disabled={isDismissing}
          aria-label="Dismiss cycle delay update for this cycle"
          className="font-ui inline-flex min-h-[40px] shrink-0 items-center gap-1.5 self-start rounded-xl border border-[#342B2D]/12 bg-white px-3 py-1.5 text-xs font-medium text-[#6F5F5D] transition hover:bg-[#F8F4EC] hover:text-[#342B2D] dark:border-[#F6F0EA]/12 dark:bg-[#282024] dark:text-[#C4B5B1] dark:hover:text-[#F6F0EA]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Dismiss</span>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onLogPeriod}
          className="font-ui inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#705264] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#5E4354] dark:bg-[#D9A7AF] dark:text-[#191416] dark:hover:bg-[#E4B9C0]"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          <span>Log Period Start</span>
        </button>

        <button
          type="button"
          onClick={() => setShowEducation((prev) => !prev)}
          aria-expanded={showEducation}
          className="font-ui inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#342B2D]/14 bg-white px-3.5 py-2 text-xs font-medium text-[#342B2D] transition hover:bg-[#F8F4EC] dark:border-[#F6F0EA]/14 dark:bg-[#282024] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
        >
          <span>Pregnancy Test Timing &amp; Causes</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${showEducation ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {showEducation && (
        <div className="mt-4 rounded-2xl border border-[#342B2D]/10 bg-white p-4 sm:p-5 dark:border-[#F6F0EA]/10 dark:bg-[#282024]">
          <h3 className="font-heading text-lg font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
            {PREGNANCY_TEST_EDUCATION.title}
          </h3>
          <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-[#342B2D]/90 dark:text-[#F6F0EA]/90">
            {PREGNANCY_TEST_EDUCATION.points.map((pt) => (
              <li key={pt}>• {pt}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#342B2D]/10 pt-3 dark:border-[#F6F0EA]/10">
            <p className="text-[11px] text-[#6F5F5D] dark:text-[#C4B5B1]">
              {PREGNANCY_TEST_EDUCATION.disclaimer}
            </p>
            {onOpenEducationArticle && (
              <button
                type="button"
                onClick={onOpenEducationArticle}
                className="font-ui inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-[#705264] hover:underline dark:text-[#D9A7AF]"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Read guide</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
