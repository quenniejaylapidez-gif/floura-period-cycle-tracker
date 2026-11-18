import React, { useState } from 'react';
import type { CyclePhaseId, CycleSummary } from '../types/cycle';

interface CycleRingProps {
  summary: CycleSummary;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const clampedEnd = Math.min(endAngle, startAngle + 359.2);
  const start = polarToCartesian(cx, cy, radius, clampedEnd);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = clampedEnd - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}

export const CycleRing: React.FC<CycleRingProps> = ({ summary }) => {
  const [inspectedPhase, setInspectedPhase] = useState<CyclePhaseId | null>(null);

  const totalDays = Math.max(18, summary.effectiveCycleLength);
  const { phaseSegments, currentCycleDay, isCycleOverdue, currentPhase } = summary;

  const dayToStartAngle = (day: number) => ((day - 1) / totalDays) * 360;
  const dayToEndAngle = (day: number) => (day / totalDays) * 360;

  const gapDeg = 4;

  const phases: {
    id: CyclePhaseId;
    label: string;
    startDay: number;
    endDay: number;
    color: string;
    isEstimated: boolean;
    note: string;
  }[] = [
    {
      id: 'menstrual',
      label: 'Menstrual',
      startDay: phaseSegments.menstrual.startDay,
      endDay: phaseSegments.menstrual.endDay,
      color: '#C58F98',
      isEstimated: !phaseSegments.menstrual.isConfirmed,
      note: phaseSegments.menstrual.isConfirmed
        ? 'Confirmed from your recorded bleeding days.'
        : 'Estimated period duration.',
    },
    {
      id: 'follicular',
      label: 'Follicular',
      startDay: phaseSegments.follicular.startDay,
      endDay: phaseSegments.follicular.endDay,
      color: '#D8C29C',
      isEstimated: true,
      note: 'Estimated post-menstrual phase leading toward mid-cycle.',
    },
    {
      id: 'ovulation',
      label: 'Ovulation est.',
      startDay: phaseSegments.ovulation.startDay,
      endDay: phaseSegments.ovulation.endDay,
      color: '#705264',
      isEstimated: true,
      note: 'Calendar estimate (~14 days before expected next period). Not confirmed.',
    },
    {
      id: 'luteal',
      label: 'Luteal',
      startDay: phaseSegments.luteal.startDay,
      endDay: phaseSegments.luteal.endDay,
      color: '#A4AE96',
      isEstimated: true,
      note: 'Estimated phase following mid-cycle up to next expected period.',
    },
  ];

  const activePhaseForDisplay = inspectedPhase
    ? phases.find((p) => p.id === inspectedPhase) ?? null
    : null;

  const indicatorAngle =
    summary.hasRecords && currentCycleDay !== null && !isCycleOverdue
      ? ((Math.min(currentCycleDay, totalDays) - 0.5) / totalDays) * 360
      : null;

  const indicatorPos =
    indicatorAngle !== null ? polarToCartesian(160, 160, 122, indicatorAngle) : null;

  const ovulationAngle =
    summary.hasRecords && phaseSegments.ovulation.targetDay
      ? ((phaseSegments.ovulation.targetDay - 0.5) / totalDays) * 360
      : null;
  const ovulationPos =
    ovulationAngle !== null ? polarToCartesian(160, 160, 122, ovulationAngle) : null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[310px]">
        <svg
          viewBox="0 0 320 320"
          className="h-auto w-full"
          role="img"
          aria-label={
            summary.hasRecords && currentCycleDay
              ? `Cycle progress ring: Day ${currentCycleDay} of ${totalDays}, ${currentPhase.label}`
              : 'Cycle progress ring: No period history recorded yet'
          }
        >
          {/* Subtle inner & outer botanical hairline guides */}
          <circle
            cx="160"
            cy="160"
            r="142"
            fill="none"
            className="stroke-[#342B2D]/8 dark:stroke-[#F6F0EA]/10"
            strokeWidth="1"
            strokeDasharray="2 5"
          />
          <circle
            cx="160"
            cy="160"
            r="102"
            fill="none"
            className="stroke-[#342B2D]/8 dark:stroke-[#F6F0EA]/10"
            strokeWidth="1"
          />
          <circle
            cx="160"
            cy="160"
            r="122"
            fill="none"
            className="stroke-[#F0E9E2] dark:stroke-[#231C1F]"
            strokeWidth="18"
          />

          {/* Phase arcs */}
          {phases.map((phase) => {
            if (phase.endDay < phase.startDay) return null;
            const startA = dayToStartAngle(phase.startDay) + gapDeg / 2;
            const endA = dayToEndAngle(phase.endDay) - gapDeg / 2;
            if (endA <= startA) return null;

            const isSelected =
              inspectedPhase === phase.id || (!inspectedPhase && currentPhase.id === phase.id);
            const d = describeArc(160, 160, 122, startA, endA);

            return (
              <path
                key={phase.id}
                d={d}
                fill="none"
                stroke={phase.color}
                strokeWidth={isSelected ? 20 : 15}
                strokeLinecap="round"
                opacity={
                  !summary.hasRecords
                    ? 0.45
                    : inspectedPhase && inspectedPhase !== phase.id
                      ? 0.38
                      : 0.96
                }
                className="cursor-pointer transition-all duration-200"
                onClick={() =>
                  setInspectedPhase((prev) => (prev === phase.id ? null : phase.id))
                }
              />
            );
          })}

          {/* Estimated ovulation diamond marker */}
          {ovulationPos && (
            <g transform={`translate(${ovulationPos.x}, ${ovulationPos.y})`}>
              <circle
                r="7.5"
                className="fill-[#FFFFFF] stroke-[#705264] dark:fill-[#282024] dark:stroke-[#D4B4C6]"
                strokeWidth="2"
              />
              <rect
                x="-2.5"
                y="-2.5"
                width="5"
                height="5"
                transform="rotate(45)"
                className="fill-[#705264] dark:fill-[#D4B4C6]"
              />
            </g>
          )}

          {/* Current cycle day marker */}
          {indicatorPos && (
            <g transform={`translate(${indicatorPos.x}, ${indicatorPos.y})`}>
              <circle
                r="11"
                className="fill-[#342B2D] stroke-[#F8F4EC] dark:fill-[#F6F0EA] dark:stroke-[#191416]"
                strokeWidth="3.5"
              />
            </g>
          )}
        </svg>

        {/* Center editorial readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
          {activePhaseForDisplay ? (
            <>
              <span className="font-ui text-[11px] font-medium tracking-wide text-[#6F5F5D] dark:text-[#C4B5B1]">
                {activePhaseForDisplay.isEstimated ? 'Estimated phase' : 'Recorded phase'}
              </span>
              <span className="mt-1 font-heading text-3xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                {activePhaseForDisplay.label}
              </span>
              <span className="mt-1 font-body text-xs font-medium text-[#705264] tabular-nums dark:text-[#D4B4C6]">
                Days {activePhaseForDisplay.startDay}–{activePhaseForDisplay.endDay}
              </span>
            </>
          ) : summary.hasRecords && currentCycleDay !== null ? (
            <>
              <span className="font-ui text-[11px] font-medium tracking-wide text-[#6F5F5D] dark:text-[#C4B5B1]">
                {currentPhase.isEstimated ? 'Estimated cycle status' : 'Confirmed period'}
              </span>
              <span className="mt-0.5 font-heading text-5xl font-semibold tracking-tight text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
                Day {currentCycleDay}
              </span>
              <span className="mt-1 font-editorial text-sm italic text-[#705264] dark:text-[#D9A7AF]">
                {currentPhase.label}
              </span>
              {summary.daysUntilNextPeriod !== null && !isCycleOverdue && (
                <span className="mt-1.5 font-body text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                  {summary.daysUntilNextPeriod > 0
                    ? `Next estimate in ${summary.daysUntilNextPeriod} ${
                        summary.daysUntilNextPeriod === 1 ? 'day' : 'days'
                      }`
                    : summary.daysUntilNextPeriod === 0
                      ? 'Estimated next period today'
                      : `Estimated ${Math.abs(summary.daysUntilNextPeriod)}d ago`}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="font-ui text-[11px] font-medium tracking-wide text-[#6F5F5D] dark:text-[#C4B5B1]">
                Botanical Journal
              </span>
              <span className="mt-1 font-heading text-3xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                Begin gently
              </span>
              <span className="mt-1.5 font-body text-xs leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
                Log your first period to view cycle rhythms.
              </span>
            </>
          )}
        </div>
      </div>

      {/* Interactive phase selector / legend */}
      <div className="mt-5 grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
        {phases.map((phase) => {
          const isInspected = inspectedPhase === phase.id;
          return (
            <button
              key={phase.id}
              type="button"
              onClick={() =>
                setInspectedPhase((prev) => (prev === phase.id ? null : phase.id))
              }
              aria-pressed={isInspected}
              className={`font-ui flex min-h-[46px] flex-col items-start rounded-2xl border px-3 py-2 text-left transition ${
                isInspected
                  ? 'border-[#705264] bg-[#F0E9E2] dark:border-[#D9A7AF] dark:bg-[#31272C]'
                  : 'border-[#342B2D]/10 bg-[#F8F4EC]/75 hover:bg-[#F0E9E2]/80 dark:border-[#F6F0EA]/10 dark:bg-[#231C1F] dark:hover:bg-[#31272C]'
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: phase.color }}
                />
                <span className="truncate">{phase.label}</span>
              </span>
              <span className="mt-0.5 font-body text-[11px] text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                D{phase.startDay}–{phase.endDay} · {phase.isEstimated ? 'Est.' : 'Conf.'}
              </span>
            </button>
          );
        })}
      </div>

      {activePhaseForDisplay && (
        <p className="mt-3 text-center text-xs leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
          {activePhaseForDisplay.note}{' '}
          <button
            type="button"
            onClick={() => setInspectedPhase(null)}
            className="font-ui font-medium text-[#705264] underline underline-offset-2 hover:text-[#342B2D] dark:text-[#D9A7AF] dark:hover:text-white"
          >
            Reset view
          </button>
        </p>
      )}
    </div>
  );
};
