import React, { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { FlowIntensity, PeriodRecord } from '../types/cycle';
import { findOverlappingPeriod } from '../utils/cycleCalculations';
import { formatDisplayDate, getTodayISO } from '../utils/dateUtils';

interface PeriodModalProps {
  isOpen: boolean;
  initialPeriod?: PeriodRecord | null;
  defaultStartDate?: string;
  existingPeriods: PeriodRecord[];
  onClose: () => void;
  onSave: (record: PeriodRecord) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const FLOW_OPTIONS: { value: FlowIntensity; label: string }[] = [
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

export const PeriodModal: React.FC<PeriodModalProps> = ({
  isOpen,
  initialPeriod,
  defaultStartDate,
  existingPeriods,
  onClose,
  onSave,
  onDelete,
}) => {
  const todayISO = getTodayISO();
  const [startDate, setStartDate] = useState(defaultStartDate ?? todayISO);
  const [isOngoing, setIsOngoing] = useState(false);
  const [endDate, setEndDate] = useState(defaultStartDate ?? todayISO);
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity>('medium');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialPeriod) {
      setStartDate(initialPeriod.startDate);
      setIsOngoing(initialPeriod.isOngoing);
      setEndDate(initialPeriod.endDate ?? initialPeriod.startDate);
      setFlowIntensity(initialPeriod.flowIntensity ?? 'medium');
      setNotes(initialPeriod.notes ?? '');
    } else {
      const baseDate = defaultStartDate ?? todayISO;
      setStartDate(baseDate);
      setIsOngoing(baseDate === todayISO);
      setEndDate(baseDate);
      setFlowIntensity('medium');
      setNotes('');
    }
    setError(null);
    setConfirmingDelete(false);
    setIsSubmitting(false);
  }, [isOpen, initialPeriod, defaultStartDate, todayISO]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startDate) {
      setError('Please select a period start date.');
      return;
    }

    if (startDate > todayISO) {
      setError('A recorded period start date cannot be in the future.');
      return;
    }

    const finalEndDate = isOngoing ? null : endDate || startDate;

    if (finalEndDate && finalEndDate < startDate) {
      setError('End date cannot be earlier than the start date.');
      return;
    }

    if (finalEndDate && finalEndDate > todayISO) {
      setError('Recorded end date cannot be in the future. Mark the period as ongoing instead.');
      return;
    }

    const overlap = findOverlappingPeriod(
      startDate,
      finalEndDate,
      isOngoing,
      existingPeriods,
      initialPeriod?.id
    );
    if (overlap) {
      setError(
        `These dates overlap with an existing period (${formatDisplayDate(overlap.startDate)}). Edit that record instead.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const now = Date.now();
      const record: PeriodRecord = {
        id: initialPeriod?.id ?? `period_${now}_${Math.random().toString(36).slice(2, 7)}`,
        startDate,
        endDate: finalEndDate,
        isOngoing,
        flowIntensity,
        notes: notes.trim(),
        createdAt: initialPeriod?.createdAt ?? now,
        updatedAt: now,
      };
      await onSave(record);
      onClose();
    } catch {
      setError('Could not save this period record locally. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialPeriod || !onDelete) return;
    setIsSubmitting(true);
    try {
      await onDelete(initialPeriod.id);
      onClose();
    } catch {
      setError('Could not delete this period record.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="period-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#191416]/55 p-0 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#342B2D]/12 bg-white p-6 shadow-2xl sm:rounded-3xl dark:border-[#F6F0EA]/12 dark:bg-[#282024]">
        <div className="flex items-center justify-between gap-4 border-b border-[#342B2D]/10 pb-4 dark:border-[#F6F0EA]/10">
          <div>
            <h2
              id="period-modal-title"
              className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]"
            >
              {initialPeriod ? 'Edit Period Entry' : 'Log Period'}
            </h2>
            <p className="mt-0.5 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              Stored privately on this device only.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close period dialog"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#6F5F5D] transition hover:bg-[#F0E9E2] dark:text-[#C4B5B1] dark:hover:bg-[#31272C]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-[#A84857]/35 bg-[#C58F98]/15 px-4 py-3 text-sm text-[#782A37] dark:border-[#D9A7AF]/35 dark:bg-[#D9A7AF]/15 dark:text-[#FADCE1]"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="period-start-date"
              className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
            >
              Period start date
            </label>
            <input
              id="period-start-date"
              type="date"
              max={todayISO}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (!isOngoing && endDate < e.target.value) {
                  setEndDate(e.target.value);
                }
              }}
              required
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-3.5 py-2 text-sm text-[#342B2D] tabular-nums dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA]"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#342B2D]/10 bg-[#F0E9E2]/65 px-4 py-3 dark:border-[#F6F0EA]/10 dark:bg-[#231C1F]">
            <div>
              <label
                htmlFor="period-ongoing-toggle"
                className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
              >
                Period is currently ongoing
              </label>
              <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                Leave end date open until bleeding finishes.
              </p>
            </div>
            <input
              id="period-ongoing-toggle"
              type="checkbox"
              checked={isOngoing}
              onChange={(e) => setIsOngoing(e.target.checked)}
              className="h-5 w-5 accent-[#705264] dark:accent-[#D9A7AF]"
            />
          </div>

          {!isOngoing && (
            <div>
              <label
                htmlFor="period-end-date"
                className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
              >
                Period end date
              </label>
              <input
                id="period-end-date"
                type="date"
                min={startDate}
                max={todayISO}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-3.5 py-2 text-sm text-[#342B2D] tabular-nums dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA]"
              />
            </div>
          )}

          <fieldset>
            <legend className="font-ui text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]">
              Typical flow (optional)
            </legend>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {FLOW_OPTIONS.map((opt) => {
                const selected = flowIntensity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFlowIntensity(opt.value)}
                    aria-pressed={selected}
                    className={`font-ui min-h-[44px] rounded-xl border px-2 py-2 text-xs font-medium transition whitespace-nowrap ${
                      selected
                        ? 'border-[#705264] bg-[#705264] text-white dark:border-[#D9A7AF] dark:bg-[#D9A7AF] dark:text-[#191416]'
                        : 'border-[#342B2D]/12 bg-[#F8F4EC] text-[#342B2D] hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/12 dark:bg-[#191416] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="period-notes"
              className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
            >
              Journal notes for this period (optional)
            </label>
            <textarea
              id="period-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reflections, comfort notes, or cycle context..."
              className="mt-1.5 w-full rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-3.5 py-2.5 text-sm text-[#342B2D] placeholder:text-[#806F6D]/75 dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA] dark:placeholder:text-[#C4B5B1]/60"
            />
          </div>

          {initialPeriod && onDelete && (
            <div className="border-t border-[#342B2D]/10 pt-4 dark:border-[#F6F0EA]/10">
              {!confirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="font-ui inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#8C3343] transition hover:bg-[#C58F98]/15 dark:text-[#D9A7AF] dark:hover:bg-[#D9A7AF]/15"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span>Delete this period record</span>
                </button>
              ) : (
                <div className="rounded-2xl border border-[#A84857]/35 bg-[#C58F98]/15 p-4 dark:border-[#D9A7AF]/35 dark:bg-[#D9A7AF]/12">
                  <p className="text-sm font-medium text-[#782A37] dark:text-[#FADCE1]">
                    Confirm deletion of period starting {formatDisplayDate(initialPeriod.startDate)}?
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="font-ui min-h-[44px] rounded-xl bg-[#8C3343] px-4 py-2 text-sm font-medium text-white hover:bg-[#732735]"
                    >
                      Yes, Delete Record
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="font-ui min-h-[44px] rounded-xl border border-[#342B2D]/15 bg-white px-4 py-2 text-sm font-medium text-[#342B2D] dark:border-[#F6F0EA]/15 dark:bg-[#282024] dark:text-[#F6F0EA]"
                    >
                      Keep Record
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="font-ui min-h-[44px] rounded-xl border border-[#342B2D]/15 px-5 py-2 text-sm font-medium text-[#342B2D] transition hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/15 dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="font-ui min-h-[44px] rounded-xl bg-[#705264] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#5E4354] active:scale-[0.99] disabled:opacity-60 dark:bg-[#D9A7AF] dark:text-[#191416] dark:hover:bg-[#E4B9C0]"
            >
              {isSubmitting ? 'Saving...' : initialPeriod ? 'Save Changes' : 'Save Period'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
