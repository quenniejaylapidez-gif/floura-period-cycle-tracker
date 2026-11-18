import React, { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { PERSONAL_ACTIVITY_CONTEXTS } from '../data/catalogs';
import type { PersonalActivityContext, PersonalActivityEntry } from '../types/cycle';
import { formatDisplayDate, getTodayISO } from '../utils/dateUtils';

interface PersonalActivityModalProps {
  isOpen: boolean;
  initialEntry?: PersonalActivityEntry | null;
  defaultDate: string;
  onClose: () => void;
  onSave: (entry: PersonalActivityEntry) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const PersonalActivityModal: React.FC<PersonalActivityModalProps> = ({
  isOpen,
  initialEntry,
  defaultDate,
  onClose,
  onSave,
  onDelete,
}) => {
  const todayISO = getTodayISO();
  const [date, setDate] = useState(defaultDate);
  const [context, setContext] = useState<PersonalActivityContext>('unspecified');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialEntry) {
      setDate(initialEntry.date);
      setContext(initialEntry.context);
      setNotes(initialEntry.notes ?? '');
    } else {
      setDate(defaultDate <= todayISO ? defaultDate : todayISO);
      setContext('unspecified');
      setNotes('');
    }
    setError(null);
    setConfirmingDelete(false);
    setIsSubmitting(false);
  }, [isOpen, initialEntry, defaultDate, todayISO]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError('Please select a date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = Date.now();
      const entry: PersonalActivityEntry = {
        id: initialEntry?.id ?? `act_${now}_${Math.random().toString(36).slice(2, 7)}`,
        date,
        context,
        notes: notes.trim() || undefined,
        createdAt: initialEntry?.createdAt ?? now,
        updatedAt: now,
      };
      await onSave(entry);
      onClose();
    } catch {
      setError('Could not save this entry locally. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialEntry || !onDelete) return;
    setIsSubmitting(true);
    try {
      await onDelete(initialEntry.id);
      onClose();
    } catch {
      setError('Could not delete this entry.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="personal-activity-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#191416]/55 p-0 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#342B2D]/12 bg-white p-6 shadow-2xl sm:rounded-3xl dark:border-[#F6F0EA]/12 dark:bg-[#282024]">
        <div className="flex items-center justify-between gap-4 border-b border-[#342B2D]/10 pb-4 dark:border-[#F6F0EA]/10">
          <div>
            <h2
              id="personal-activity-modal-title"
              className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]"
            >
              {initialEntry ? 'Edit Personal Activity' : 'Log Personal Activity'}
            </h2>
            <p className="mt-0.5 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              Optional, discreet, and stored only on this device. Never affects cycle predictions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close personal activity dialog"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#6F5F5D] transition hover:bg-[#F0E9E2] dark:text-[#C4B5B1] dark:hover:bg-[#31272C]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-[#A84857]/35 bg-[#C58F98]/15 px-4 py-3 text-sm text-[#782A37] dark:border-[#D9A7AF]/35 dark:text-[#FADCE1]"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="activity-date-input"
              className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
            >
              Date
            </label>
            <input
              id="activity-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-3.5 py-2 text-sm text-[#342B2D] tabular-nums dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA]"
            />
          </div>

          <fieldset>
            <legend className="font-ui text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]">
              Context (optional)
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PERSONAL_ACTIVITY_CONTEXTS.map((opt) => {
                const selected = context === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setContext(opt.id)}
                    aria-pressed={selected}
                    className={`font-ui min-h-[44px] rounded-xl border px-3 py-2 text-xs font-medium transition ${
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
              htmlFor="activity-private-notes"
              className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
            >
              Private notes (optional)
            </label>
            <textarea
              id="activity-private-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional personal note..."
              className="mt-1.5 w-full rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-3.5 py-2.5 text-sm text-[#342B2D] placeholder:text-[#806F6D]/75 dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA]"
            />
          </div>

          {initialEntry && onDelete && (
            <div className="border-t border-[#342B2D]/10 pt-4 dark:border-[#F6F0EA]/10">
              {!confirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="font-ui inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#8C3343] transition hover:bg-[#C58F98]/15 dark:text-[#D9A7AF] dark:hover:bg-[#D9A7AF]/15"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span>Delete this entry</span>
                </button>
              ) : (
                <div className="rounded-2xl border border-[#A84857]/35 bg-[#C58F98]/15 p-4 dark:border-[#D9A7AF]/35 dark:bg-[#D9A7AF]/12">
                  <p className="text-sm font-medium text-[#782A37] dark:text-[#FADCE1]">
                    Remove personal activity entry on {formatDisplayDate(initialEntry.date)}?
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="font-ui min-h-[44px] rounded-xl bg-[#8C3343] px-4 py-2 text-sm font-medium text-white"
                    >
                      Delete Entry
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="font-ui min-h-[44px] rounded-xl border border-[#342B2D]/15 bg-white px-4 py-2 text-sm font-medium text-[#342B2D] dark:border-[#F6F0EA]/15 dark:bg-[#282024] dark:text-[#F6F0EA]"
                    >
                      Keep Entry
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
              className="font-ui min-h-[44px] rounded-xl border border-[#342B2D]/15 px-5 py-2 text-sm font-medium text-[#342B2D] hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/15 dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="font-ui min-h-[44px] rounded-xl bg-[#705264] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#5E4354] disabled:opacity-60 dark:bg-[#D9A7AF] dark:text-[#191416]"
            >
              {isSubmitting ? 'Saving...' : initialEntry ? 'Save Changes' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
