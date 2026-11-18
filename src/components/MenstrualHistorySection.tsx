import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarDays,
  ChevronRight,
  Edit3,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { CycleSummary, DailyLog, PeriodRecord } from '../types/cycle';
import {
  calculateMenstrualHistoryStats,
  getPeriodDurationDays,
} from '../utils/cycleCalculations';
import { formatDisplayDate, formatShortDate } from '../utils/dateUtils';

interface MenstrualHistorySectionProps {
  summary: CycleSummary;
  dailyLogs: Record<string, DailyLog>;
  onOpenPeriodModal: (period?: PeriodRecord | null, defaultDate?: string) => void;
  onDeletePeriod: (id: string) => Promise<void>;
}

type HistoryViewMode = 'records' | 'monthly';

export const MenstrualHistorySection: React.FC<MenstrualHistorySectionProps> = ({
  summary,
  dailyLogs,
  onOpenPeriodModal,
  onDeletePeriod,
}) => {
  const [viewMode, setViewMode] = useState<HistoryViewMode>('records');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const stats = useMemo(() => calculateMenstrualHistoryStats(summary), [summary]);

  const sortedPeriodsDesc = useMemo(
    () => [...summary.sortedPeriods].reverse(),
    [summary.sortedPeriods]
  );

  const periodRows = useMemo(() => {
    return sortedPeriodsDesc.map((period) => {
      const duration = getPeriodDurationDays(period);
      const cycleMatch = summary.completedCycles.find((c) => c.id.startsWith(`${period.id}_`));
      const status: 'Completed' | 'Ongoing' | 'Incomplete' =
        duration !== null
          ? 'Completed'
          : period.isOngoing && !period.endDate
            ? 'Ongoing'
            : 'Incomplete';

      return {
        period,
        duration,
        cycleLength: cycleMatch?.cycleLength ?? null,
        nextStartDate: cycleMatch?.nextStartDate ?? null,
        status,
      };
    });
  }, [sortedPeriodsDesc, summary.completedCycles]);

  const durationBarData = useMemo(
    () =>
      summary.sortedPeriods
        .map((p) => {
          const days = getPeriodDurationDays(p);
          return days !== null
            ? {
                label: formatShortDate(p.startDate),
                duration: days,
              }
            : null;
        })
        .filter((d): d is { label: string; duration: number } => d !== null),
    [summary.sortedPeriods]
  );

  const cycleTrendData = useMemo(
    () =>
      summary.completedCycles.map((c) => ({
        label: formatShortDate(c.startDate),
        cycleLength: c.cycleLength,
      })),
    [summary.completedCycles]
  );

  const monthlyGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        monthKey: string;
        monthLabel: string;
        items: typeof periodRows;
        totalBleedingDays: number;
      }
    >();

    for (const row of periodRows) {
      const monthKey = row.period.startDate.slice(0, 7);
      if (!groups.has(monthKey)) {
        const [y, m] = monthKey.split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, 15, 12, 0, 0));
        const monthLabel = dt.toLocaleDateString(undefined, {
          timeZone: 'UTC',
          month: 'long',
          year: 'numeric',
        });
        groups.set(monthKey, {
          monthKey,
          monthLabel,
          items: [],
          totalBleedingDays: 0,
        });
      }
      const group = groups.get(monthKey)!;
      group.items.push(row);
      if (row.duration !== null) {
        group.totalBleedingDays += row.duration;
      }
    }

    return [...groups.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [periodRows]);

  const selectedRow = useMemo(
    () => periodRows.find((r) => r.period.id === selectedPeriodId) ?? null,
    [periodRows, selectedPeriodId]
  );

  const selectedPeriodLogCount = useMemo(() => {
    if (!selectedRow) return 0;
    const start = selectedRow.period.startDate;
    const end = selectedRow.period.endDate ?? start;
    return Object.values(dailyLogs).filter(
      (l) =>
        l.date >= start &&
        l.date <= end &&
        (l.symptoms.length > 0 || l.moods.length > 0 || l.notes.trim().length > 0)
    ).length;
  }, [selectedRow, dailyLogs]);

  const handleDeleteConfirm = async (id: string) => {
    setIsDeleting(true);
    try {
      await onDeletePeriod(id);
      if (selectedPeriodId === id) {
        setSelectedPeriodId(null);
      }
      setConfirmDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section
      id="menstrual-duration-history"
      aria-labelledby="menstrual-history-title"
      className="space-y-6 rounded-3xl border border-[#342B2D]/10 bg-white p-6 sm:p-7 dark:border-[#F6F0EA]/10 dark:bg-[#282024]"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-[#342B2D]/10 pb-5 sm:flex-row sm:items-end dark:border-[#F6F0EA]/10">
        <div>
          <span className="font-ui text-xs font-semibold text-[#705264] dark:text-[#D9A7AF]">
            Menstrual Duration &amp; Cycle History
          </span>
          <h2
            id="menstrual-history-title"
            className="mt-1 font-heading text-3xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]"
          >
            Period Duration &amp; Records
          </h2>
          <p className="mt-1 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
            Duration averages use completed records only. Incomplete or ongoing entries stay separate until closed.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenPeriodModal(null)}
          className="font-ui inline-flex min-h-[44px] items-center gap-2 self-start rounded-xl bg-[#705264] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#5E4354] sm:self-auto dark:bg-[#D9A7AF] dark:text-[#191416] dark:hover:bg-[#E4B9C0]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Period Record</span>
        </button>
      </div>

      {/* 7-Metric Menstrual History Statistics Grid */}
      <dl className="grid grid-cols-2 divide-y divide-[#342B2D]/10 rounded-2xl border border-[#342B2D]/10 bg-[#F8F4EC]/75 sm:grid-cols-3 lg:grid-cols-7 lg:divide-x lg:divide-y-0 dark:divide-[#F6F0EA]/10 dark:border-[#F6F0EA]/10 dark:bg-[#191416]">
        <div className="p-4">
          <dt className="font-ui text-[11px] text-[#6F5F5D] dark:text-[#C4B5B1]">
            Avg period duration
          </dt>
          <dd className="mt-1 font-heading text-2xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
            {stats.averagePeriodDuration !== null ? `${stats.averagePeriodDuration}d` : '—'}
          </dd>
        </div>

        <div className="p-4">
          <dt className="font-ui text-[11px] text-[#6F5F5D] dark:text-[#C4B5B1]">
            Shortest period
          </dt>
          <dd className="mt-1 font-heading text-2xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
            {stats.shortestPeriodDuration !== null ? `${stats.shortestPeriodDuration}d` : '—'}
          </dd>
        </div>

        <div className="p-4">
          <dt className="font-ui text-[11px] text-[#6F5F5D] dark:text-[#C4B5B1]">
            Longest period
          </dt>
          <dd className="mt-1 font-heading text-2xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
            {stats.longestPeriodDuration !== null ? `${stats.longestPeriodDuration}d` : '—'}
          </dd>
        </div>

        <div className="p-4">
          <dt className="font-ui text-[11px] text-[#6F5F5D] dark:text-[#C4B5B1]">
            Avg cycle length
          </dt>
          <dd className="mt-1 font-heading text-2xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
            {stats.averageCycleLength !== null ? `${stats.averageCycleLength}d` : '—'}
          </dd>
        </div>

        <div className="p-4">
          <dt className="font-ui text-[11px] text-[#6F5F5D] dark:text-[#C4B5B1]">
            Shortest cycle
          </dt>
          <dd className="mt-1 font-heading text-2xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
            {stats.shortestCycleLength !== null ? `${stats.shortestCycleLength}d` : '—'}
          </dd>
        </div>

        <div className="p-4">
          <dt className="font-ui text-[11px] text-[#6F5F5D] dark:text-[#C4B5B1]">
            Longest cycle
          </dt>
          <dd className="mt-1 font-heading text-2xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
            {stats.longestCycleLength !== null ? `${stats.longestCycleLength}d` : '—'}
          </dd>
        </div>

        <div className="col-span-2 p-4 sm:col-span-1">
          <dt className="font-ui text-[11px] text-[#6F5F5D] dark:text-[#C4B5B1]">
            Cycle variability
          </dt>
          <dd className="mt-1 font-heading text-2xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
            {stats.cycleVariabilityDays !== null ? `${stats.cycleVariabilityDays}d spread` : '—'}
          </dd>
        </div>
      </dl>

      {/* Dual Charts: Period Duration BarChart & Cycle Length Trend LineChart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#342B2D]/10 bg-[#F0E9E2]/45 p-5 dark:border-[#F6F0EA]/10 dark:bg-[#231C1F]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                Period Duration Bar Chart
              </h3>
              <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                Inclusive bleeding days across completed period entries.
              </p>
            </div>
            <span className="font-ui text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
              {stats.completedPeriodsCount} completed
            </span>
          </div>

          {durationBarData.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[#342B2D]/18 bg-white/70 p-6 text-center dark:border-[#F6F0EA]/18 dark:bg-[#191416]">
              <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                Record both start and end dates on a period to view duration bars.
              </p>
            </div>
          ) : (
            <div className="mt-4 h-56 w-full" aria-label="Period duration bar chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationBarData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(112, 82, 100, 0.14)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#806F6D" />
                  <YAxis domain={[0, 'dataMax + 2']} tick={{ fontSize: 11 }} stroke="#806F6D" />
                  <Tooltip
                    formatter={(val) => [`${val ?? ''} days`, 'Bleeding duration']}
                    contentStyle={{
                      borderRadius: '14px',
                      border: '1px solid rgba(52,43,45,0.12)',
                      backgroundColor: '#FFFFFF',
                      color: '#342B2D',
                      fontSize: '12px',
                    }}
                  />
                  {stats.averagePeriodDuration && (
                    <ReferenceLine
                      y={stats.averagePeriodDuration}
                      stroke="#8F7448"
                      strokeDasharray="4 4"
                      label={{
                        value: `Avg ${stats.averagePeriodDuration}d`,
                        position: 'insideTopRight',
                        fill: '#8F7448',
                        fontSize: 11,
                      }}
                    />
                  )}
                  <Bar
                    dataKey="duration"
                    fill="#C58F98"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#342B2D]/10 bg-[#F0E9E2]/45 p-5 dark:border-[#F6F0EA]/10 dark:bg-[#231C1F]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                Cycle Length Trend
              </h3>
              <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                Calendar days between consecutive period start dates.
              </p>
            </div>
            <span className="font-ui text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
              {summary.validCompletedCyclesCount} valid
            </span>
          </div>

          {cycleTrendData.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[#342B2D]/18 bg-white/70 p-6 text-center dark:border-[#F6F0EA]/18 dark:bg-[#191416]">
              <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                Log at least two period start dates to view cycle length trends.
              </p>
            </div>
          ) : (
            <div className="mt-4 h-56 w-full" aria-label="Cycle length trend chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cycleTrendData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(112, 82, 100, 0.14)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#806F6D" />
                  <YAxis domain={['dataMin - 4', 'dataMax + 4']} tick={{ fontSize: 11 }} stroke="#806F6D" />
                  <Tooltip
                    formatter={(val) => [`${val ?? ''} days`, 'Cycle length']}
                    contentStyle={{
                      borderRadius: '14px',
                      border: '1px solid rgba(52,43,45,0.12)',
                      backgroundColor: '#FFFFFF',
                      color: '#342B2D',
                      fontSize: '12px',
                    }}
                  />
                  {stats.averageCycleLength && (
                    <ReferenceLine
                      y={stats.averageCycleLength}
                      stroke="#68755A"
                      strokeDasharray="4 4"
                      label={{
                        value: `Avg ${stats.averageCycleLength}d`,
                        position: 'insideTopRight',
                        fill: '#68755A',
                        fontSize: 11,
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="cycleLength"
                    stroke="#705264"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#C58F98', stroke: '#705264', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#705264' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* View Mode Tabs + Detailed Record Inspector Split */}
      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div
            role="tablist"
            aria-label="History view mode"
            className="inline-flex items-center gap-1 self-start rounded-2xl bg-[#F0E9E2] p-1 dark:bg-[#231C1F]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'records'}
              onClick={() => setViewMode('records')}
              className={`font-ui min-h-[40px] rounded-xl px-4 py-1.5 text-xs font-semibold transition ${
                viewMode === 'records'
                  ? 'bg-white text-[#342B2D] shadow-xs dark:bg-[#282024] dark:text-[#F6F0EA]'
                  : 'text-[#6F5F5D] hover:text-[#342B2D] dark:text-[#C4B5B1] dark:hover:text-[#F6F0EA]'
              }`}
            >
              All Records ({periodRows.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'monthly'}
              onClick={() => setViewMode('monthly')}
              className={`font-ui min-h-[40px] rounded-xl px-4 py-1.5 text-xs font-semibold transition ${
                viewMode === 'monthly'
                  ? 'bg-white text-[#342B2D] shadow-xs dark:bg-[#282024] dark:text-[#F6F0EA]'
                  : 'text-[#6F5F5D] hover:text-[#342B2D] dark:text-[#C4B5B1] dark:hover:text-[#F6F0EA]'
              }`}
            >
              Monthly History ({monthlyGroups.length})
            </button>
          </div>

          <span className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
            Select any row to inspect details, edit dates, or delete.
          </span>
        </div>

        {periodRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#342B2D]/18 p-8 text-center dark:border-[#F6F0EA]/18">
            <p className="text-sm text-[#6F5F5D] dark:text-[#C4B5B1]">
              No period records logged yet. Add your first period to start building your duration history.
            </p>
            <button
              type="button"
              onClick={() => onOpenPeriodModal(null)}
              className="font-ui mt-3 min-h-[44px] rounded-xl bg-[#705264] px-5 py-2 text-sm font-medium text-white hover:bg-[#5E4354] dark:bg-[#D9A7AF] dark:text-[#191416]"
            >
              Log First Period
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* List Area */}
            <div className={selectedRow ? 'lg:col-span-7' : 'lg:col-span-12'}>
              {viewMode === 'records' ? (
                <div className="divide-y divide-[#342B2D]/10 rounded-2xl border border-[#342B2D]/10 dark:divide-[#F6F0EA]/10 dark:border-[#F6F0EA]/10">
                  {periodRows.map((row) => {
                    const isSelected = selectedPeriodId === row.period.id;
                    return (
                      <div
                        key={row.period.id}
                        className={`flex flex-col justify-between gap-3 p-4 transition sm:flex-row sm:items-center ${
                          isSelected
                            ? 'bg-[#F0E9E2]/70 dark:bg-[#231C1F]'
                            : 'hover:bg-[#F8F4EC]/80 dark:hover:bg-[#191416]/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPeriodId(isSelected ? null : row.period.id)
                          }
                          aria-expanded={isSelected}
                          className="flex flex-1 items-center justify-between gap-3 text-left"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                                {formatDisplayDate(row.period.startDate)}
                                {row.period.endDate
                                  ? ` – ${formatDisplayDate(row.period.endDate)}`
                                  : row.status === 'Ongoing'
                                    ? ' – Ongoing'
                                    : ' (End date not set)'}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                              <span
                                className={`font-semibold ${
                                  row.status === 'Ongoing'
                                    ? 'text-[#705264] dark:text-[#D9A7AF]'
                                    : row.status === 'Incomplete'
                                      ? 'text-[#8F7448] dark:text-[#E0CCA7]'
                                      : 'text-[#68755A] dark:text-[#B3BDAA]'
                                }`}
                              >
                                {row.status}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {row.duration !== null
                                  ? `${row.duration} bleeding ${row.duration === 1 ? 'day' : 'days'}`
                                  : row.status === 'Ongoing'
                                    ? 'In progress'
                                    : 'Duration pending'}
                              </span>
                              {row.cycleLength !== null && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{row.cycleLength}-day cycle</span>
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight
                            className={`h-4 w-4 shrink-0 text-[#6F5F5D] transition-transform dark:text-[#C4B5B1] ${
                              isSelected ? 'rotate-90 text-[#705264] dark:text-[#D9A7AF]' : ''
                            }`}
                            aria-hidden="true"
                          />
                        </button>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => onOpenPeriodModal(row.period)}
                            className="font-ui inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#342B2D]/14 bg-white px-3 py-1.5 text-xs font-medium text-[#342B2D] hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/14 dark:bg-[#282024] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
                          >
                            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyGroups.map((group) => (
                    <div
                      key={group.monthKey}
                      className="rounded-2xl border border-[#342B2D]/10 dark:border-[#F6F0EA]/10"
                    >
                      <div className="flex items-center justify-between border-b border-[#342B2D]/10 bg-[#F0E9E2]/55 px-4 py-3 dark:border-[#F6F0EA]/10 dark:bg-[#231C1F]">
                        <span className="font-heading text-lg font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                          {group.monthLabel}
                        </span>
                        <span className="text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                          {group.items.length} {group.items.length === 1 ? 'record' : 'records'}
                          {group.totalBleedingDays > 0
                            ? ` · ${group.totalBleedingDays} completed bleeding days`
                            : ''}
                        </span>
                      </div>
                      <div className="divide-y divide-[#342B2D]/8 dark:divide-[#F6F0EA]/8">
                        {group.items.map((row) => (
                          <button
                            key={row.period.id}
                            type="button"
                            onClick={() => setSelectedPeriodId(row.period.id)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#F8F4EC]/75 dark:hover:bg-[#191416]"
                          >
                            <div>
                              <p className="text-sm font-medium text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                                {formatDisplayDate(row.period.startDate)}
                                {row.period.endDate
                                  ? ` – ${formatDisplayDate(row.period.endDate)}`
                                  : row.status === 'Ongoing'
                                    ? ' – Ongoing'
                                    : ''}
                              </p>
                              <p className="mt-0.5 text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                                {row.status}
                                {row.duration !== null ? ` · ${row.duration} days` : ''}
                                {row.cycleLength !== null ? ` · ${row.cycleLength}d cycle` : ''}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-[#6F5F5D] dark:text-[#C4B5B1]" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detailed Record View Panel */}
            {selectedRow && (
              <aside
                aria-label="Detailed period record view"
                className="h-fit rounded-2xl border border-[#342B2D]/12 bg-[#F8F4EC]/85 p-5 lg:col-span-5 dark:border-[#F6F0EA]/12 dark:bg-[#191416]"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[#342B2D]/10 pb-3 dark:border-[#F6F0EA]/10">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#705264] dark:text-[#D9A7AF]">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Detailed Period Record</span>
                    </div>
                    <h3 className="mt-1 font-heading text-2xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                      {formatDisplayDate(selectedRow.period.startDate)}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPeriodId(null);
                      setConfirmDeleteId(null);
                    }}
                    aria-label="Close detailed record view"
                    className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#6F5F5D] hover:bg-[#F0E9E2] dark:text-[#C4B5B1] dark:hover:bg-[#31272C]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">Record status</dt>
                    <dd className="font-medium text-[#342B2D] dark:text-[#F6F0EA]">
                      {selectedRow.status}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">Start date</dt>
                    <dd className="font-medium text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                      {formatDisplayDate(selectedRow.period.startDate)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">End date</dt>
                    <dd className="font-medium text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                      {selectedRow.period.endDate
                        ? formatDisplayDate(selectedRow.period.endDate)
                        : selectedRow.status === 'Ongoing'
                          ? 'Currently ongoing'
                          : 'Not recorded'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                      Total bleeding duration
                    </dt>
                    <dd className="font-medium text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                      {selectedRow.duration !== null
                        ? `${selectedRow.duration} ${selectedRow.duration === 1 ? 'day' : 'days'}`
                        : 'Incomplete / ongoing'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">Cycle length</dt>
                    <dd className="font-medium text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                      {selectedRow.cycleLength !== null
                        ? `${selectedRow.cycleLength} days`
                        : 'Next period not yet logged'}
                    </dd>
                  </div>
                  {selectedRow.period.flowIntensity && (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">Typical flow</dt>
                      <dd className="capitalize font-medium text-[#342B2D] dark:text-[#F6F0EA]">
                        {selectedRow.period.flowIntensity}
                      </dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                      Daily check-in days during period
                    </dt>
                    <dd className="font-medium text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                      {selectedPeriodLogCount}
                    </dd>
                  </div>
                </dl>

                {selectedRow.period.notes && (
                  <div className="mt-4 rounded-xl border border-[#342B2D]/10 bg-white p-3 dark:border-[#F6F0EA]/10 dark:bg-[#282024]">
                    <p className="text-[11px] font-medium text-[#6F5F5D] dark:text-[#C4B5B1]">
                      Period notes
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#342B2D] dark:text-[#F6F0EA]">
                      {selectedRow.period.notes}
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-[#342B2D]/10 pt-4 dark:border-[#F6F0EA]/10">
                  <button
                    type="button"
                    onClick={() => onOpenPeriodModal(selectedRow.period)}
                    className="font-ui inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#705264] px-4 py-2 text-xs font-medium text-white hover:bg-[#5E4354] dark:bg-[#D9A7AF] dark:text-[#191416]"
                  >
                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edit Dates / Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDeleteId(
                        confirmDeleteId === selectedRow.period.id ? null : selectedRow.period.id
                      )
                    }
                    className="font-ui inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#A84857]/35 px-3.5 py-2 text-xs font-medium text-[#8C3343] hover:bg-[#C58F98]/15 dark:border-[#D9A7AF]/35 dark:text-[#D9A7AF]"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </div>

                {confirmDeleteId === selectedRow.period.id && (
                  <div className="mt-3 rounded-xl border border-[#A84857]/35 bg-[#C58F98]/15 p-3.5 dark:border-[#D9A7AF]/35 dark:bg-[#D9A7AF]/12">
                    <p className="text-xs font-medium text-[#782A37] dark:text-[#FADCE1]">
                      Delete this period record? Dependent cycle &amp; duration statistics will recalculate automatically.
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDeleteConfirm(selectedRow.period.id)}
                        className="font-ui min-h-[38px] rounded-lg bg-[#8C3343] px-3 py-1.5 text-xs font-medium text-white"
                      >
                        {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="font-ui min-h-[38px] rounded-lg border border-[#342B2D]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#342B2D] dark:border-[#F6F0EA]/15 dark:bg-[#282024] dark:text-[#F6F0EA]"
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                )}
              </aside>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
