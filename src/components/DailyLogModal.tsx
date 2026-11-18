import React, { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  Coffee,
  Feather,
  Heart,
  Moon,
  Plus,
  Smile,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { MOOD_CATALOG, SYMPTOM_CATALOG } from '../data/catalogs';
import type {
  DailyLog,
  LoggedSymptom,
  MoodEntry,
  MoodId,
  SymptomCategory,
  SymptomSeverity,
} from '../types/cycle';
import { formatDisplayDate } from '../utils/dateUtils';

export type DailyLogTab = 'symptoms' | 'mood' | 'notes';

interface DailyLogModalProps {
  isOpen: boolean;
  dateISO: string;
  initialTab?: DailyLogTab;
  existingLog?: DailyLog;
  onClose: () => void;
  onSave: (log: DailyLog) => Promise<void>;
}

const SEVERITY_OPTIONS: { value: SymptomSeverity; label: string }[] = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

const CATEGORY_META: {
  id: SymptomCategory;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'physical',
    title: 'Physical',
    subtitle: 'Bodily comfort and physical sensations',
    icon: Activity,
  },
  {
    id: 'emotional',
    title: 'Emotional',
    subtitle: 'Emotional tone and mental load',
    icon: Heart,
  },
  {
    id: 'other',
    title: 'Rest & Vitality',
    subtitle: 'Sleep, appetite, and daily energy',
    icon: Feather,
  },
];

const MOOD_ICONS: Record<MoodId, React.ComponentType<{ className?: string }>> = {
  happy: Sun,
  calm: Feather,
  energetic: Sparkles,
  neutral: Coffee,
  tired: Moon,
  stressed: Activity,
  sad: Heart,
  irritable: Smile,
};

function getCurrentHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export const DailyLogModal: React.FC<DailyLogModalProps> = ({
  isOpen,
  dateISO,
  initialTab = 'symptoms',
  existingLog,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<DailyLogTab>(initialTab);
  const [symptoms, setSymptoms] = useState<LoggedSymptom[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [notes, setNotes] = useState('');

  const [selectedMood, setSelectedMood] = useState<MoodId>('calm');
  const [moodTime, setMoodTime] = useState(getCurrentHHMM());
  const [moodNote, setMoodNote] = useState('');
  const [editingMoodId, setEditingMoodId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setSymptoms(existingLog?.symptoms ? [...existingLog.symptoms] : []);
    setMoods(existingLog?.moods ? [...existingLog.moods] : []);
    setNotes(existingLog?.notes ?? '');
    setSelectedMood('calm');
    setMoodTime(getCurrentHHMM());
    setMoodNote('');
    setEditingMoodId(null);
    setIsSaving(false);
  }, [isOpen, initialTab, existingLog, dateISO]);

  if (!isOpen) return null;

  const toggleSymptom = (id: string) => {
    setSymptoms((prev) => {
      const exists = prev.find((s) => s.id === id);
      if (exists) {
        return prev.filter((s) => s.id !== id);
      }
      return [...prev, { id, severity: 'mild' }];
    });
  };

  const setSymptomSeverity = (id: string, severity: SymptomSeverity) => {
    setSymptoms((prev) => prev.map((s) => (s.id === id ? { ...s, severity } : s)));
  };

  const handleAddOrUpdateMood = () => {
    const now = Date.now();
    if (editingMoodId) {
      setMoods((prev) =>
        prev.map((m) =>
          m.id === editingMoodId
            ? { ...m, mood: selectedMood, time: moodTime || getCurrentHHMM(), note: moodNote.trim() }
            : m
        )
      );
      setEditingMoodId(null);
    } else {
      const entry: MoodEntry = {
        id: `mood_${now}_${Math.random().toString(36).slice(2, 6)}`,
        mood: selectedMood,
        time: moodTime || getCurrentHHMM(),
        note: moodNote.trim() || undefined,
        createdAt: now,
      };
      setMoods((prev) => [...prev, entry]);
    }
    setMoodNote('');
    setMoodTime(getCurrentHHMM());
  };

  const startEditMood = (entry: MoodEntry) => {
    setEditingMoodId(entry.id);
    setSelectedMood(entry.mood);
    setMoodTime(entry.time);
    setMoodNote(entry.note ?? '');
  };

  const removeMood = (id: string) => {
    setMoods((prev) => prev.filter((m) => m.id !== id));
    if (editingMoodId === id) {
      setEditingMoodId(null);
      setMoodNote('');
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSave({
        date: dateISO,
        symptoms,
        moods,
        notes: notes.trim(),
        updatedAt: Date.now(),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-log-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#191416]/55 p-0 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[#342B2D]/12 bg-white shadow-2xl sm:rounded-3xl dark:border-[#F6F0EA]/12 dark:bg-[#282024]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#342B2D]/10 px-6 py-4 dark:border-[#F6F0EA]/10">
          <div>
            <h2
              id="daily-log-title"
              className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]"
            >
              Daily Wellness Journal
            </h2>
            <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              {formatDisplayDate(dateISO, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close daily check-in"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#6F5F5D] hover:bg-[#F0E9E2] dark:text-[#C4B5B1] dark:hover:bg-[#31272C]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Segmented tabs */}
        <div className="border-b border-[#342B2D]/10 px-6 py-3 dark:border-[#F6F0EA]/10">
          <div
            role="tablist"
            aria-label="Check-in sections"
            className="grid grid-cols-3 gap-1 rounded-2xl bg-[#F0E9E2] p-1 dark:bg-[#191416]"
          >
            {(
              [
                { id: 'symptoms', label: `Symptoms (${symptoms.length})` },
                { id: 'mood', label: `Mood (${moods.length})` },
                { id: 'notes', label: 'Journal Notes' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`font-ui min-h-[40px] rounded-xl px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-[#342B2D] shadow-xs dark:bg-[#282024] dark:text-[#F6F0EA]'
                    : 'text-[#6F5F5D] hover:text-[#342B2D] dark:text-[#C4B5B1] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'symptoms' && (
            <div className="space-y-6">
              {CATEGORY_META.map((cat) => {
                const items = SYMPTOM_CATALOG.filter((s) => s.category === cat.id);
                const CatIcon = cat.icon;
                return (
                  <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
                    <div className="flex items-center gap-2">
                      <CatIcon
                        className="h-4 w-4 text-[#705264] dark:text-[#D9A7AF]"
                        aria-hidden="true"
                      />
                      <h3
                        id={`cat-${cat.id}`}
                        className="font-heading text-xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]"
                      >
                        {cat.title}
                      </h3>
                    </div>
                    <p className="mt-0.5 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                      {cat.subtitle}
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {items.map((item) => {
                        const logged = symptoms.find((s) => s.id === item.id);
                        return (
                          <div
                            key={item.id}
                            className={`rounded-2xl border p-3.5 transition ${
                              logged
                                ? 'border-[#C58F98] bg-[#F8F4EC] shadow-xs dark:border-[#D9A7AF]/60 dark:bg-[#31272C]'
                                : 'border-[#342B2D]/10 bg-[#F8F4EC]/50 hover:bg-[#F0E9E2]/60 dark:border-[#F6F0EA]/10 dark:bg-[#191416] dark:hover:bg-[#231C1F]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleSymptom(item.id)}
                              aria-pressed={!!logged}
                              className="flex min-h-[36px] w-full items-center justify-between text-left text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
                            >
                              <span>{item.label}</span>
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
                                  logged
                                    ? 'border-[#705264] bg-[#705264] text-white dark:border-[#D9A7AF] dark:bg-[#D9A7AF] dark:text-[#191416]'
                                    : 'border-[#342B2D]/25 dark:border-[#F6F0EA]/25'
                                }`}
                              >
                                {logged && <Check className="h-3.5 w-3.5" />}
                              </span>
                            </button>

                            {logged && (
                              <div className="mt-3 flex items-center gap-1.5 border-t border-[#342B2D]/10 pt-2.5 dark:border-[#F6F0EA]/10">
                                <span className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                                  Severity:
                                </span>
                                {SEVERITY_OPTIONS.map((sev) => (
                                  <button
                                    key={sev.value}
                                    type="button"
                                    onClick={() => setSymptomSeverity(item.id, sev.value)}
                                    aria-pressed={logged.severity === sev.value}
                                    className={`font-ui min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                                      logged.severity === sev.value
                                        ? 'bg-[#705264] text-white dark:bg-[#D9A7AF] dark:text-[#191416]'
                                        : 'bg-white text-[#6F5F5D] hover:text-[#342B2D] dark:bg-[#231C1F] dark:text-[#C4B5B1]'
                                    }`}
                                  >
                                    {sev.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {activeTab === 'mood' && (
            <div className="space-y-6">
              <p className="text-xs leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
                Record how you feel once or multiple times today. Mood reflects daily life, sleep, stress, and personal experiences—not cycle phases alone.
              </p>

              <div>
                <span className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]">
                  {editingMoodId ? 'Edit mood check-in' : 'Select a mood'}
                </span>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {MOOD_CATALOG.map((m) => {
                    const active = selectedMood === m.id;
                    const MoodIcon = MOOD_ICONS[m.id];
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMood(m.id)}
                        aria-pressed={active}
                        className={`font-ui flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                          active
                            ? 'border-[#705264] bg-[#705264] text-white shadow-xs dark:border-[#D9A7AF] dark:bg-[#D9A7AF] dark:text-[#191416]'
                            : 'border-[#342B2D]/12 bg-[#F8F4EC] text-[#342B2D] hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/12 dark:bg-[#191416] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]'
                        }`}
                      >
                        <MoodIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="mood-time-input"
                      className="font-ui block text-xs font-medium text-[#6F5F5D] dark:text-[#C4B5B1]"
                    >
                      Time
                    </label>
                    <input
                      id="mood-time-input"
                      type="time"
                      value={moodTime}
                      onChange={(e) => setMoodTime(e.target.value)}
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-3 py-2 text-sm text-[#342B2D] tabular-nums dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="mood-note-input"
                      className="font-ui block text-xs font-medium text-[#6F5F5D] dark:text-[#C4B5B1]"
                    >
                      Context note (optional)
                    </label>
                    <input
                      id="mood-note-input"
                      type="text"
                      value={moodNote}
                      onChange={(e) => setMoodNote(e.target.value)}
                      placeholder="e.g., Quiet morning tea, restful walk..."
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-3 py-2 text-sm text-[#342B2D] placeholder:text-[#806F6D]/70 dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA]"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddOrUpdateMood}
                    className="font-ui inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#C58F98]/50 bg-[#C58F98]/22 px-4 py-2 text-sm font-medium text-[#342B2D] transition hover:bg-[#C58F98]/35 dark:border-[#D9A7AF]/40 dark:bg-[#D9A7AF]/20 dark:text-[#F6F0EA] dark:hover:bg-[#D9A7AF]/30"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>{editingMoodId ? 'Update Mood Entry' : 'Add Mood Entry'}</span>
                  </button>
                  {editingMoodId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMoodId(null);
                        setMoodNote('');
                      }}
                      className="font-ui min-h-[44px] rounded-xl px-3 py-2 text-sm text-[#6F5F5D] hover:text-[#342B2D] dark:text-[#C4B5B1]"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>

              {moods.length > 0 && (
                <div className="border-t border-[#342B2D]/10 pt-4 dark:border-[#F6F0EA]/10">
                  <h3 className="font-heading text-lg font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                    Recorded moods for this day
                  </h3>
                  <ul className="mt-2.5 divide-y divide-[#342B2D]/8 dark:divide-[#F6F0EA]/10">
                    {moods.map((entry) => {
                      const def = MOOD_CATALOG.find((m) => m.id === entry.mood);
                      return (
                        <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]">
                              <span>{def?.label ?? entry.mood}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                                {entry.time}
                              </span>
                            </div>
                            {entry.note && (
                              <p className="mt-0.5 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                                {entry.note}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditMood(entry)}
                              className="font-ui min-h-[36px] rounded-lg px-2.5 py-1 text-xs font-medium text-[#705264] hover:bg-[#F0E9E2] dark:text-[#D9A7AF] dark:hover:bg-[#31272C]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMood(entry.id)}
                              aria-label={`Remove ${def?.label ?? entry.mood} entry`}
                              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-[#8C3343] hover:bg-[#C58F98]/15 dark:text-[#D9A7AF]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              <label
                htmlFor="daily-personal-notes"
                className="font-heading block text-xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]"
              >
                Personal daily journal
              </label>
              <p className="text-xs leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
                Reflect on rest, nourishment, energy, movement, or anything helpful to revisit later.
              </p>
              <textarea
                id="daily-personal-notes"
                rows={7}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write a calm reflection for today..."
                className="w-full rounded-2xl border border-[#342B2D]/15 bg-[#F8F4EC] p-4 text-sm leading-relaxed text-[#342B2D] placeholder:text-[#806F6D]/70 dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA]"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#342B2D]/10 px-6 py-4 dark:border-[#F6F0EA]/10">
          <span className="text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
            {symptoms.length} symptoms · {moods.length} moods
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="font-ui min-h-[44px] rounded-xl border border-[#342B2D]/15 px-4 py-2 text-sm font-medium text-[#342B2D] hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/15 dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="font-ui min-h-[44px] rounded-xl bg-[#705264] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#5E4354] active:scale-[0.99] disabled:opacity-60 dark:bg-[#D9A7AF] dark:text-[#191416] dark:hover:bg-[#E4B9C0]"
            >
              {isSaving ? 'Saving...' : 'Save Check-In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
