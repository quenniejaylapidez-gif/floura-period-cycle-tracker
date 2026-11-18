import React, { useMemo } from 'react';
import { MenstrualHistorySection } from '../components/MenstrualHistorySection';
import { MOOD_CATALOG, SYMPTOM_CATALOG } from '../data/catalogs';
import type { CycleSummary, DailyLog, PeriodRecord, UserSettings } from '../types/cycle';
import { formatShortDate } from '../utils/dateUtils';

interface InsightsViewProps {
  summary: CycleSummary;
  dailyLogs: Record<string, DailyLog>;
  settings: UserSettings;
  onOpenPeriodModal: (period?: PeriodRecord | null, defaultDate?: string) => void;
  onDeletePeriod: (id: string) => Promise<void>;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  summary,
  dailyLogs,
  settings,
  onOpenPeriodModal,
  onDeletePeriod,
}) => {
  const symptomCounts = useMemo(() => {
    const counts = new Map<string, { label: string; count: number; severeCount: number }>();
    for (const log of Object.values(dailyLogs)) {
      for (const s of log.symptoms) {
        const def = SYMPTOM_CATALOG.find((c) => c.id === s.id);
        const existing = counts.get(s.id) ?? {
          label: def?.label ?? s.id,
          count: 0,
          severeCount: 0,
        };
        existing.count += 1;
        if (s.severity === 'severe') existing.severeCount += 1;
        counts.set(s.id, existing);
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  }, [dailyLogs]);

  const moodSummary = useMemo(() => {
    const counts = new Map<string, { id: string; label: string; count: number }>();
    const recentEntries: { date: string; time: string; label: string; note?: string }[] = [];

    const logsSorted = Object.values(dailyLogs).sort((a, b) => b.date.localeCompare(a.date));
    for (const log of logsSorted) {
      for (const m of log.moods) {
        const def = MOOD_CATALOG.find((c) => c.id === m.mood);
        const label = def?.label ?? m.mood;
        const existing = counts.get(m.mood) ?? { id: m.mood, label, count: 0 };
        existing.count += 1;
        counts.set(m.mood, existing);
        if (recentEntries.length < 8) {
          recentEntries.push({
            date: log.date,
            time: m.time,
            label,
            note: m.note,
          });
        }
      }
    }

    return {
      distribution: [...counts.values()].sort((a, b) => b.count - a.count),
      recentEntries,
      totalMoods: [...counts.values()].reduce((s, i) => s + i.count, 0),
    };
  }, [dailyLogs]);

  const monthlySummaries = useMemo(() => {
    const map = new Map<
      string,
      { monthKey: string; label: string; periodDays: number; symptomDays: number; moodCount: number }
    >();

    const ensureMonth = (iso: string) => {
      const monthKey = iso.slice(0, 7);
      if (!map.has(monthKey)) {
        const [y, m] = monthKey.split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, 15, 12, 0, 0));
        const label = dt.toLocaleDateString(undefined, {
          timeZone: 'UTC',
          month: 'long',
          year: 'numeric',
        });
        map.set(monthKey, { monthKey, label, periodDays: 0, symptomDays: 0, moodCount: 0 });
      }
      return map.get(monthKey)!;
    };

    for (const p of summary.sortedPeriods) {
      if (!p.endDate || p.endDate < p.startDate) continue;
      const startMs = new Date(`${p.startDate}T12:00:00Z`).getTime();
      const endMs = new Date(`${p.endDate}T12:00:00Z`).getTime();
      const dur = Math.round((endMs - startMs) / 86_400_000) + 1;
      const entry = ensureMonth(p.startDate);
      entry.periodDays += dur;
    }

    for (const log of Object.values(dailyLogs)) {
      if (log.symptoms.length === 0 && log.moods.length === 0) continue;
      const entry = ensureMonth(log.date);
      if (log.symptoms.length > 0) entry.symptomDays += 1;
      entry.moodCount += log.moods.length;
    }

    return [...map.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [summary.sortedPeriods, dailyLogs]);

  const maxSymptomCount = symptomCounts[0]?.count ?? 1;

  return (
    <div className="floura-fade-in space-y-8">
      <div className="border-b border-[#342B2D]/10 pb-5 dark:border-[#F6F0EA]/12">
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-[#342B2D] dark:text-[#F6F0EA]">
          Wellness &amp; Cycle Insights
        </h1>
        <p className="mt-1 text-sm text-[#6F5F5D] dark:text-[#C4B5B1]">
          Patterns derived strictly from your recorded history. Estimates never imply medical certainty.
        </p>
      </div>

      {/* Editorial Statistical Summary */}
      <section
        aria-label="Key cycle statistics"
        className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 sm:p-7 dark:border-[#F6F0EA]/10 dark:bg-[#282024]"
      >
        <dl className="grid grid-cols-1 divide-y divide-[#342B2D]/10 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 dark:divide-[#F6F0EA]/10">
          <div className="py-3 sm:pr-5 lg:border-r lg:border-[#342B2D]/10 dark:lg:border-[#F6F0EA]/10">
            <dt className="font-ui text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              Calculated avg cycle length
            </dt>
            <dd className="mt-1 font-heading text-3xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
              {summary.calculatedAvgCycleLength !== null
                ? `${summary.calculatedAvgCycleLength} days`
                : 'No completed cycles'}
            </dd>
            <dd className="mt-1 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              {settings.useManualPreferences
                ? `Manual baseline active: ${settings.manualCycleLength}d`
                : `From ${summary.validCompletedCyclesCount} valid completed ${
                    summary.validCompletedCyclesCount === 1 ? 'cycle' : 'cycles'
                  }`}
            </dd>
          </div>

          <div className="py-3 sm:pl-5 lg:border-r lg:border-[#342B2D]/10 lg:pr-5 dark:lg:border-[#F6F0EA]/10">
            <dt className="font-ui text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              Calculated avg period duration
            </dt>
            <dd className="mt-1 font-heading text-3xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
              {summary.calculatedAvgPeriodDuration !== null
                ? `${summary.calculatedAvgPeriodDuration} days`
                : 'Insufficient data'}
            </dd>
            <dd className="mt-1 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              {`From ${summary.validPeriodDurationCount} completed ${
                summary.validPeriodDurationCount === 1 ? 'period' : 'periods'
              }`}
            </dd>
          </div>

          <div className="py-3 sm:pr-5 lg:border-r lg:border-[#342B2D]/10 lg:pl-5 dark:lg:border-[#F6F0EA]/10">
            <dt className="font-ui text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              Cycle regularity
            </dt>
            <dd className="mt-1 font-heading text-3xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
              {summary.regularityLabel}
            </dd>
            <dd className="mt-1 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              {summary.cycleRangeMin !== null && summary.cycleRangeMax !== null
                ? `Range: ${summary.cycleRangeMin}–${summary.cycleRangeMax} days`
                : 'Needs 2+ completed cycles'}
            </dd>
          </div>

          <div className="py-3 sm:pl-5">
            <dt className="font-ui text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              Total recorded entries
            </dt>
            <dd className="mt-1 font-heading text-3xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
              {summary.sortedPeriods.length} periods
            </dd>
            <dd className="mt-1 text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
              {Object.keys(dailyLogs).length} daily journal days
            </dd>
          </div>
        </dl>

        <p className="mt-4 border-t border-[#342B2D]/10 pt-4 text-xs leading-relaxed text-[#6F5F5D] dark:border-[#F6F0EA]/10 dark:text-[#C4B5B1]">
          {summary.regularityDetail}
        </p>
      </section>

      {/* Dedicated Menstrual Duration History (BarChart, Trend LineChart, 7 Metrics, Monthly & Detailed Record Management) */}
      <MenstrualHistorySection
        summary={summary}
        dailyLogs={dailyLogs}
        onOpenPeriodModal={onOpenPeriodModal}
        onDeletePeriod={onDeletePeriod}
      />

      {/* Symptom Frequency & Mood History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 dark:border-[#F6F0EA]/10 dark:bg-[#282024]">
          <h2 className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
            Symptom Frequency
          </h2>
          <p className="mt-0.5 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
            Most frequently recorded physical, emotional, and vitality entries.
          </p>

          {symptomCounts.length === 0 ? (
            <p className="mt-6 text-sm text-[#6F5F5D] dark:text-[#C4B5B1]">
              No symptoms logged yet. Record daily check-ins from Home or Calendar.
            </p>
          ) : (
            <ul className="mt-5 space-y-3.5">
              {symptomCounts.slice(0, 8).map((item) => (
                <li key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[#342B2D] dark:text-[#F6F0EA]">
                      {item.label}
                    </span>
                    <span className="text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                      {item.count} {item.count === 1 ? 'day' : 'days'}
                      {item.severeCount > 0 ? ` (${item.severeCount} severe)` : ''}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#F0E9E2] dark:bg-[#191416]">
                    <div
                      className="h-full rounded-full bg-[#C58F98]"
                      style={{ width: `${Math.round((item.count / maxSymptomCount) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 dark:border-[#F6F0EA]/10 dark:bg-[#282024]">
          <h2 className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
            Mood History &amp; Reflections
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
            Mood patterns reflect rest, stress, life context, and health—never assumed to be driven solely by hormones.
          </p>

          {moodSummary.totalMoods === 0 ? (
            <p className="mt-6 text-sm text-[#6F5F5D] dark:text-[#C4B5B1]">
              No mood entries logged yet.
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              <ul className="space-y-2.5">
                {moodSummary.distribution.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-[#342B2D] dark:text-[#F6F0EA]">
                      {m.label}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-[#F0E9E2] dark:bg-[#191416]">
                        <div
                          className="h-full rounded-full bg-[#A4AE96]"
                          style={{
                            width: `${Math.round((m.count / moodSummary.totalMoods) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                        {m.count}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="border-t border-[#342B2D]/10 pt-4 dark:border-[#F6F0EA]/10">
                <h3 className="font-ui text-xs font-semibold text-[#6F5F5D] dark:text-[#C4B5B1]">
                  Recent mood check-ins
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs text-[#342B2D] dark:text-[#F6F0EA]">
                  {moodSummary.recentEntries.slice(0, 5).map((entry, idx) => (
                    <li key={`${entry.date}_${entry.time}_${idx}`}>
                      <span className="text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                        {formatShortDate(entry.date)} {entry.time}
                      </span>{' '}
                      · <span className="font-medium">{entry.label}</span>
                      {entry.note ? ` — ${entry.note}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Monthly Summaries Table */}
      <section className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 dark:border-[#F6F0EA]/10 dark:bg-[#282024]">
        <h2 className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
          Monthly Journal Summaries
        </h2>
        {monthlySummaries.length === 0 ? (
          <p className="mt-3 text-sm text-[#6F5F5D] dark:text-[#C4B5B1]">
            Monthly summaries will appear here once you log period or daily entries.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#342B2D]/12 text-xs text-[#6F5F5D] dark:border-[#F6F0EA]/12 dark:text-[#C4B5B1]">
                  <th className="py-2.5 pr-4 font-medium">Month</th>
                  <th className="px-4 py-2.5 text-right font-medium">Recorded Period Days</th>
                  <th className="px-4 py-2.5 text-right font-medium">Symptom Check-In Days</th>
                  <th className="py-2.5 pl-4 text-right font-medium">Mood Entries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#342B2D]/8 dark:divide-[#F6F0EA]/10">
                {monthlySummaries.map((row) => (
                  <tr key={row.monthKey}>
                    <td className="py-3 pr-4 font-medium text-[#342B2D] dark:text-[#F6F0EA]">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-right text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                      {row.periodDays}
                    </td>
                    <td className="px-4 py-3 text-right text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                      {row.symptomDays}
                    </td>
                    <td className="py-3 pl-4 text-right text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                      {row.moodCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
