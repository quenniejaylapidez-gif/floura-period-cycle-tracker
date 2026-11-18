import React, { useEffect, useRef, useState } from 'react';
import {
  Accessibility,
  Bell,
  CalendarHeart,
  Check,
  Clock,
  Database,
  Download,
  Edit3,
  HeartHandshake,
  Info,
  Palette,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { PWAInstallButton } from '../components/PWAInstallButton';
import {
  AVATAR_OPTIONS,
  DEFAULT_USER_PROFILE,
  DEFAULT_USER_SETTINGS,
  DELAY_REMINDER_COPY,
  PREGNANCY_TEST_EDUCATION,
} from '../data/catalogs';
import {
  buildCsvExport,
  buildJsonExport,
  sanitizeDisplayName,
} from '../db/indexedDb';
import type {
  AvatarOptionId,
  CycleSummary,
  DailyLog,
  DelayReminderEvent,
  GreetingStyle,
  PeriodDelayReminderSettings,
  PeriodRecord,
  PersonalActivityEntry,
  UserProfile,
  UserSettings,
} from '../types/cycle';

interface ProfileViewProps {
  profile: UserProfile;
  settings: UserSettings;
  summary: CycleSummary;
  periods: PeriodRecord[];
  dailyLogs: Record<string, DailyLog>;
  personalActivities: PersonalActivityEntry[];
  reminderHistory: DelayReminderEvent[];
  onUpdateProfile: (next: UserProfile) => Promise<void>;
  onUpdateSettings: (next: UserSettings) => Promise<void>;
  onClearReminderHistory: () => Promise<void>;
  onImportJsonBackup: (rawJson: string) => Promise<void>;
  onDeleteAllData: () => Promise<void>;
}

const GREETING_OPTIONS: { id: GreetingStyle; label: string; example: (name: string) => string }[] = [
  {
    id: 'time_based',
    label: 'Natural time of day',
    example: (name) =>
      name === DEFAULT_USER_PROFILE.displayName ? `Hello, ${name}.` : `Good morning, ${name}.`,
  },
  {
    id: 'welcome_back',
    label: 'Warm welcome',
    example: (name) => `Welcome back, ${name}.`,
  },
  {
    id: 'wellness_journey',
    label: 'Wellness reflection',
    example: () => 'Your wellness journey, one day at a time.',
  },
];

async function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image format.'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas image processing unavailable.'));
          return;
        }
        // Center-crop square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  settings,
  summary,
  periods,
  dailyLogs,
  personalActivities,
  reminderHistory,
  onUpdateProfile,
  onUpdateSettings,
  onClearReminderHistory,
  onImportJsonBackup,
  onDeleteAllData,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState(profile.displayName);
  const [draftDescription, setDraftDescription] = useState(profile.description);
  const [draftAvatarType, setDraftAvatarType] = useState<AvatarOptionId>(profile.avatarType);
  const [draftCustomImage, setDraftCustomImage] = useState<string | null>(
    profile.customAvatarDataUrl
  );
  const [draftGreeting, setDraftGreeting] = useState<GreetingStyle>(profile.greetingStyle);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [notifStatus, setNotifStatus] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);
  const [confirmClearReminderHistory, setConfirmClearReminderHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [includeActivityInExport, setIncludeActivityInExport] = useState(false);

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const backupFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftName(profile.displayName);
    setDraftDescription(profile.description);
    setDraftAvatarType(profile.avatarType);
    setDraftCustomImage(profile.customAvatarDataUrl);
    setDraftGreeting(profile.greetingStyle);
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    const cleaned = sanitizeDisplayName(draftName);
    if (!cleaned) {
      setProfileError('Please enter a display name (up to 30 characters).');
      return;
    }

    // Allow letters (including unicode), numbers, spaces, apostrophes, hyphens, periods, commas, ampersands
    if (!/^[\p{L}\p{N}\s'.,&-]+$/u.test(cleaned)) {
      setProfileError(
        'Display name may include letters, numbers, spaces, and common punctuation (\' . , - &).'
      );
      return;
    }

    setIsSavingProfile(true);
    try {
      await onUpdateProfile({
        ...profile,
        displayName: cleaned,
        description: draftDescription.trim().slice(0, 120) || DEFAULT_USER_PROFILE.description,
        avatarType:
          draftAvatarType === 'custom' && !draftCustomImage ? 'minimalist' : draftAvatarType,
        customAvatarDataUrl: draftCustomImage,
        greetingStyle: draftGreeting,
        updatedAt: Date.now(),
      });
      setIsEditingProfile(false);
      setStatusMessage('Personal profile saved locally.');
    } catch {
      setProfileError('Could not save your profile changes.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setProfileError(null);
    if (!file.type.startsWith('image/')) {
      setProfileError('Please select a valid image file (PNG, JPG, or WebP).');
      return;
    }

    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setDraftCustomImage(dataUrl);
      setDraftAvatarType('custom');
      if (!isEditingProfile) {
        await onUpdateProfile({
          ...profile,
          avatarType: 'custom',
          customAvatarDataUrl: dataUrl,
          updatedAt: Date.now(),
        });
        setStatusMessage('Profile picture saved locally in IndexedDB.');
      }
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  const handleRemoveCustomPicture = async () => {
    setDraftCustomImage(null);
    setDraftAvatarType('minimalist');
    if (!isEditingProfile) {
      await onUpdateProfile({
        ...profile,
        avatarType: 'minimalist',
        customAvatarDataUrl: null,
        updatedAt: Date.now(),
      });
      setStatusMessage('Custom picture removed and minimalist avatar restored.');
    }
  };

  const updatePartial = async (patch: Partial<UserSettings>) => {
    await onUpdateSettings({
      ...settings,
      ...patch,
      updatedAt: Date.now(),
    });
  };

  const updateReminder = async (
    key: keyof UserSettings['reminders'],
    patch: Partial<UserSettings['reminders']['upcomingPeriod']>
  ) => {
    await onUpdateSettings({
      ...settings,
      reminders: {
        ...settings.reminders,
        [key]: {
          ...settings.reminders[key],
          ...patch,
        },
      },
      updatedAt: Date.now(),
    });
  };

  const delayReminderConfig: PeriodDelayReminderSettings = settings.periodDelayReminder ??
    DEFAULT_USER_SETTINGS.periodDelayReminder ?? {
      enabled: false,
      initialDaysAfter: 1,
      followUpDaysAfter: 7,
      time: '09:00',
    };

  const updatePeriodDelayReminder = async (patch: Partial<PeriodDelayReminderSettings>) => {
    const merged: PeriodDelayReminderSettings = {
      ...delayReminderConfig,
      ...patch,
    };
    const safeInitial = Math.max(1, Math.min(14, merged.initialDaysAfter || 1));
    const safeFollowUp = Math.max(safeInitial + 1, Math.min(30, merged.followUpDaysAfter || 7));

    await onUpdateSettings({
      ...settings,
      periodDelayReminder: {
        ...merged,
        initialDaysAfter: safeInitial,
        followUpDaysAfter: safeFollowUp,
      },
      updatedAt: Date.now(),
    });
  };

  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('unsupported');
      return;
    }
    const result = await Notification.requestPermission();
    setNotifStatus(result);
    if (result === 'granted') {
      setNotifFeedback('Permission granted. Reminders remain private and optional.');
    } else if (result === 'denied') {
      setNotifFeedback('Notifications are blocked in your browser settings.');
    }
  };

  const handleSendTestNotification = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const body = settings.privacySafeNotifications
      ? 'Your daily wellness check-in is ready.'
      : 'FLOURA reminder: Log your daily symptoms or notes.';
    new Notification('FLOURA', {
      body,
      icon: '/pwa-192x192.png',
    });
    setNotifFeedback('Sent a privacy-conscious test notification.');
  };

  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage(`Downloaded ${filename}.`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportError(null);
    setStatusMessage(null);
    try {
      const text = await file.text();
      await onImportJsonBackup(text);
      setStatusMessage('JSON backup restored cleanly to local storage.');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Unable to import JSON backup.');
    }
  };

  const handleConfirmDeleteAll = async () => {
    if (deleteTyped.trim().toUpperCase() !== 'DELETE') return;
    await onDeleteAllData();
    setShowDeleteConfirm(false);
    setDeleteTyped('');
    setIsEditingProfile(false);
    setStatusMessage(
      'All personal period, symptom, mood, personal activity, and custom preferences have been erased, and your default profile has been restored.'
    );
  };

  return (
    <div className="floura-fade-in space-y-7">
      {/* Elegant Profile Header Card */}
      <section
        aria-label="Personal profile summary"
        className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 shadow-[0_8px_30px_rgba(52,43,45,0.04)] sm:p-8 dark:border-[#F6F0EA]/10 dark:bg-[#282024] dark:shadow-none"
      >
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-5">
            <ProfileAvatar
              avatarType={isEditingProfile ? draftAvatarType : profile.avatarType}
              customImageUrl={isEditingProfile ? draftCustomImage : profile.customAvatarDataUrl}
              displayName={isEditingProfile ? draftName || profile.displayName : profile.displayName}
              size="xl"
            />
            <div>
              <span className="font-ui text-xs font-medium text-[#705264] dark:text-[#D9A7AF]">
                Personal Profile · Stored Locally
              </span>
              <h1 className="mt-0.5 font-heading text-3xl font-semibold tracking-tight text-[#342B2D] sm:text-4xl dark:text-[#F6F0EA]">
                {profile.displayName}
              </h1>
              <p className="mt-1 text-sm text-[#6F5F5D] dark:text-[#C4B5B1]">
                {profile.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setProfileError(null);
                setIsEditingProfile((v) => !v);
              }}
              className="font-ui inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-4 py-2 text-sm font-medium text-[#342B2D] transition hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
            >
              {isEditingProfile ? (
                <>
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span>Close Editor</span>
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 text-[#705264] dark:text-[#D9A7AF]" aria-hidden="true" />
                  <span>Edit Profile</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Inline Edit Profile Form */}
        {isEditingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-6 space-y-6 border-t border-[#342B2D]/10 pt-6 dark:border-[#F6F0EA]/10"
          >
            {profileError && (
              <div
                role="alert"
                className="rounded-2xl border border-[#A84857]/35 bg-[#C58F98]/15 px-4 py-3 text-sm text-[#782A37] dark:border-[#D9A7AF]/35 dark:text-[#FADCE1]"
              >
                {profileError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="profile-display-name"
                    className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
                  >
                    Display name
                  </label>
                  <span className="text-xs text-[#6F5F5D] tabular-nums dark:text-[#C4B5B1]">
                    {draftName.trim().length}/30
                  </span>
                </div>
                <input
                  id="profile-display-name"
                  type="text"
                  maxLength={30}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Beautiful Soul"
                  required
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-3.5 py-2 text-sm text-[#342B2D] dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA]"
                />
                <p className="mt-1 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                  Shown on your Home greeting. Letters, spaces, and common punctuation supported.
                </p>
              </div>

              <div>
                <label
                  htmlFor="profile-description"
                  className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
                >
                  Short personal note
                </label>
                <input
                  id="profile-description"
                  type="text"
                  maxLength={120}
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  placeholder="Your personal wellness space."
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-3.5 py-2 text-sm text-[#342B2D] dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA]"
                />
              </div>
            </div>

            {/* Avatar Selector */}
            <div>
              <span className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]">
                Choose avatar
              </span>
              <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {AVATAR_OPTIONS.map((opt) => {
                  const selected = draftAvatarType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraftAvatarType(opt.id)}
                      aria-pressed={selected}
                      className={`flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition ${
                        selected
                          ? 'border-[#705264] bg-[#F0E9E2] dark:border-[#D9A7AF] dark:bg-[#31272C]'
                          : 'border-[#342B2D]/12 bg-[#F8F4EC]/70 hover:bg-[#F0E9E2]/60 dark:border-[#F6F0EA]/12 dark:bg-[#191416] dark:hover:bg-[#231C1F]'
                      }`}
                    >
                      <ProfileAvatar avatarType={opt.id} size="md" displayName={opt.label} />
                      <span className="font-ui text-xs font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}

                {/* Custom Uploaded Photo Option */}
                <div
                  className={`flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition ${
                    draftAvatarType === 'custom' && draftCustomImage
                      ? 'border-[#705264] bg-[#F0E9E2] dark:border-[#D9A7AF] dark:bg-[#31272C]'
                      : 'border-dashed border-[#342B2D]/20 bg-[#F8F4EC]/50 dark:border-[#F6F0EA]/20 dark:bg-[#191416]'
                  }`}
                >
                  {draftCustomImage ? (
                    <button
                      type="button"
                      onClick={() => setDraftAvatarType('custom')}
                      aria-pressed={draftAvatarType === 'custom'}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <ProfileAvatar
                        avatarType="custom"
                        customImageUrl={draftCustomImage}
                        size="md"
                        displayName="Uploaded photo"
                      />
                      <span className="font-ui text-xs font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                        Custom Photo
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => avatarFileRef.current?.click()}
                      className="font-ui flex flex-col items-center gap-1.5 text-xs font-medium text-[#705264] dark:text-[#D9A7AF]"
                    >
                      <Upload className="h-5 w-5" aria-hidden="true" />
                      <span>Upload Photo</span>
                    </button>
                  )}
                </div>
              </div>

              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelected}
                className="sr-only"
                aria-label="Upload local profile picture"
              />

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  className="font-ui min-h-[38px] rounded-xl border border-[#342B2D]/15 px-3 py-1.5 text-xs font-medium text-[#342B2D] hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/15 dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
                >
                  {draftCustomImage ? 'Replace Photo' : 'Select Local Picture'}
                </button>
                {draftCustomImage && (
                  <button
                    type="button"
                    onClick={handleRemoveCustomPicture}
                    className="font-ui min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-medium text-[#8C3343] hover:bg-[#C58F98]/15 dark:text-[#D9A7AF]"
                  >
                    Remove Picture
                  </button>
                )}
              </div>
            </div>

            {/* Greeting Preference */}
            <div>
              <span className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]">
                Dashboard greeting style
              </span>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {GREETING_OPTIONS.map((opt) => {
                  const active = draftGreeting === opt.id;
                  const previewName = sanitizeDisplayName(draftName) || DEFAULT_USER_PROFILE.displayName;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraftGreeting(opt.id)}
                      aria-pressed={active}
                      className={`rounded-2xl border p-3.5 text-left transition ${
                        active
                          ? 'border-[#705264] bg-[#F0E9E2] dark:border-[#D9A7AF] dark:bg-[#31272C]'
                          : 'border-[#342B2D]/12 bg-[#F8F4EC]/70 hover:bg-[#F0E9E2]/60 dark:border-[#F6F0EA]/12 dark:bg-[#191416]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-ui text-xs font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                          {opt.label}
                        </span>
                        {active && (
                          <Check className="h-3.5 w-3.5 text-[#705264] dark:text-[#D9A7AF]" />
                        )}
                      </div>
                      <p className="mt-1 font-editorial text-xs italic text-[#6F5F5D] dark:text-[#C4B5B1]">
                        &ldquo;{opt.example(previewName)}&rdquo;
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDraftName(DEFAULT_USER_PROFILE.displayName);
                  setDraftDescription(DEFAULT_USER_PROFILE.description);
                  setDraftAvatarType('minimalist');
                  setDraftCustomImage(null);
                  setDraftGreeting('time_based');
                }}
                className="font-ui min-h-[44px] rounded-xl px-3 py-2 text-xs font-medium text-[#6F5F5D] hover:text-[#342B2D] dark:text-[#C4B5B1]"
              >
                Reset to Default Profile
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="font-ui min-h-[44px] rounded-xl border border-[#342B2D]/15 px-4 py-2 text-sm font-medium text-[#342B2D] hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/15 dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="font-ui min-h-[44px] rounded-xl bg-[#705264] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#5E4354] disabled:opacity-60 dark:bg-[#D9A7AF] dark:text-[#191416]"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {statusMessage && (
        <div
          role="status"
          className="rounded-2xl border border-[#A4AE96]/55 bg-[#F0E9E2] px-4 py-3 text-sm text-[#342B2D] dark:border-[#B3BDAA]/35 dark:bg-[#231C1F] dark:text-[#F6F0EA]"
        >
          {statusMessage}
        </div>
      )}

      {/* Appearance & Accessibility */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 sm:p-7 dark:border-[#F6F0EA]/10 dark:bg-[#282024]">
          <div className="flex items-center gap-2.5">
            <Palette className="h-5 w-5 text-[#9C8153] dark:text-[#E0CCA7]" aria-hidden="true" />
            <h2 className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
              Appearance
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
            Choose between Warm Ivory light mode and Deep Espresso dark mode.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {(
              [
                { id: 'light', label: 'Warm Ivory' },
                { id: 'dark', label: 'Espresso Dark' },
                { id: 'system', label: 'System' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => updatePartial({ theme: opt.id })}
                aria-pressed={settings.theme === opt.id}
                className={`font-ui min-h-[46px] rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  settings.theme === opt.id
                    ? 'border-[#705264] bg-[#705264] text-white dark:border-[#D9A7AF] dark:bg-[#D9A7AF] dark:text-[#191416]'
                    : 'border-[#342B2D]/12 bg-[#F8F4EC] text-[#342B2D] hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/12 dark:bg-[#191416] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 sm:p-7 dark:border-[#F6F0EA]/10 dark:bg-[#282024]">
          <div className="flex items-center gap-2.5">
            <Accessibility className="h-5 w-5 text-[#68755A] dark:text-[#B3BDAA]" aria-hidden="true" />
            <h2 className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
              Accessibility
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
            Adjust motion, contrast, and text scaling to suit your reading comfort.
          </p>

          <div className="mt-4 divide-y divide-[#342B2D]/10 dark:divide-[#F6F0EA]/10">
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <label
                  htmlFor="a11y-reduced-motion"
                  className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
                >
                  Reduced motion
                </label>
                <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                  Minimizes transitions across all views.
                </p>
              </div>
              <input
                id="a11y-reduced-motion"
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => updatePartial({ reducedMotion: e.target.checked })}
                className="h-5 w-5 accent-[#705264] dark:accent-[#D9A7AF]"
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <label
                  htmlFor="a11y-high-contrast"
                  className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
                >
                  Enhanced contrast
                </label>
                <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                  Sharpens foreground contrast for daylight reading.
                </p>
              </div>
              <input
                id="a11y-high-contrast"
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => updatePartial({ highContrast: e.target.checked })}
                className="h-5 w-5 accent-[#705264] dark:accent-[#D9A7AF]"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-3">
              <div>
                <label
                  htmlFor="a11y-large-text"
                  className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
                >
                  Larger interface text
                </label>
                <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                  Increases reading scale smoothly.
                </p>
              </div>
              <input
                id="a11y-large-text"
                type="checkbox"
                checked={settings.largeText}
                onChange={(e) => updatePartial({ largeText: e.target.checked })}
                className="h-5 w-5 accent-[#705264] dark:accent-[#D9A7AF]"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Cycle Preferences */}
      <section className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 sm:p-7 dark:border-[#F6F0EA]/10 dark:bg-[#282024]">
        <div className="flex items-center gap-2.5">
          <CalendarHeart className="h-5 w-5 text-[#C58F98] dark:text-[#D9A7AF]" aria-hidden="true" />
          <h2 className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
            Cycle Preferences
          </h2>
        </div>
        <p className="mt-1 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
          Manually configured baselines are kept strictly separate from your calculated historical averages.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl border border-[#342B2D]/10 bg-[#F0E9E2]/70 p-4 sm:grid-cols-2 dark:border-[#F6F0EA]/10 dark:bg-[#231C1F]">
          <div>
            <span className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              Calculated historical cycle average
            </span>
            <p className="mt-0.5 font-heading text-xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
              {summary.calculatedAvgCycleLength !== null
                ? `${summary.calculatedAvgCycleLength} days (${summary.validCompletedCyclesCount} cycles)`
                : 'Not enough completed cycles yet'}
            </p>
          </div>
          <div>
            <span className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              Calculated historical period duration
            </span>
            <p className="mt-0.5 font-heading text-xl font-semibold text-[#342B2D] tabular-nums dark:text-[#F6F0EA]">
              {summary.calculatedAvgPeriodDuration !== null
                ? `${summary.calculatedAvgPeriodDuration} days (${summary.validPeriodDurationCount} periods)`
                : 'Not enough completed periods yet'}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <label
                htmlFor="manual-pref-toggle"
                className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
              >
                Use manual baseline instead of calculated average
              </label>
              <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                When off, FLOURA automatically prioritizes your valid recorded cycle history.
              </p>
            </div>
            <input
              id="manual-pref-toggle"
              type="checkbox"
              checked={settings.useManualPreferences}
              onChange={(e) => updatePartial({ useManualPreferences: e.target.checked })}
              className="h-5 w-5 accent-[#705264] dark:accent-[#D9A7AF]"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="manual-cycle-length"
                className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
              >
                Manual cycle length (days)
              </label>
              <input
                id="manual-cycle-length"
                type="number"
                min={18}
                max={60}
                value={settings.manualCycleLength}
                onChange={(e) => {
                  const v = Math.max(18, Math.min(60, Number(e.target.value) || 28));
                  updatePartial({ manualCycleLength: v });
                }}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-3.5 py-2 text-sm text-[#342B2D] tabular-nums dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA]"
              />
            </div>

            <div>
              <label
                htmlFor="manual-period-duration"
                className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
              >
                Manual period duration (days)
              </label>
              <input
                id="manual-period-duration"
                type="number"
                min={1}
                max={14}
                value={settings.manualPeriodDuration}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(14, Number(e.target.value) || 5));
                  updatePartial({ manualPeriodDuration: v });
                }}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-3.5 py-2 text-sm text-[#342B2D] tabular-nums dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 sm:p-7 dark:border-[#F6F0EA]/10 dark:bg-[#282024]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <Bell className="h-5 w-5 text-[#705264] dark:text-[#D9A7AF]" aria-hidden="true" />
              <h2 className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                Notification Preferences
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              Never sent without permission and phrased discreetly by default.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {notifStatus !== 'granted' && notifStatus !== 'unsupported' && (
              <button
                type="button"
                onClick={handleRequestNotifications}
                className="font-ui inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#705264] px-4 py-2 text-xs font-medium text-white hover:bg-[#5E4354] dark:bg-[#D9A7AF] dark:text-[#191416]"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                <span>Enable Notifications</span>
              </button>
            )}
            {notifStatus === 'granted' && (
              <button
                type="button"
                onClick={handleSendTestNotification}
                className="font-ui inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#342B2D]/15 px-3.5 py-2 text-xs font-medium text-[#342B2D] hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/15 dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
              >
                <span>Send Test Notification</span>
              </button>
            )}
          </div>
        </div>

        {notifFeedback && (
          <p className="mt-3 text-xs text-[#705264] dark:text-[#D9A7AF]">{notifFeedback}</p>
        )}

        {notifStatus === 'unsupported' && (
          <div className="mt-4 rounded-2xl border border-[#D8C29C]/45 bg-[#D8C29C]/12 px-4 py-3 text-xs leading-relaxed text-[#342B2D] dark:border-[#E0CCA7]/30 dark:bg-[#231C1F] dark:text-[#F6F0EA]">
            System browser notifications are unavailable in this environment. You can still use optional in-app reminders when FLOURA is open.
          </div>
        )}

        {notifStatus === 'denied' && (
          <div className="mt-4 rounded-2xl border border-[#A84857]/30 bg-[#C58F98]/12 px-4 py-3 text-xs leading-relaxed text-[#342B2D] dark:border-[#D9A7AF]/30 dark:bg-[#231C1F] dark:text-[#F6F0EA]">
            Browser notification permission is currently blocked. Enable permission in your browser site settings if you want system notifications; gentle in-app banners remain available without permission.
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-[#342B2D]/10 bg-[#F0E9E2]/65 px-4 py-3 dark:border-[#F6F0EA]/10 dark:bg-[#231C1F]">
          <div>
            <label
              htmlFor="privacy-safe-notif"
              className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
            >
              Discreet lock-screen wording (recommended)
            </label>
            <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              Preview: &ldquo;
              {settings.privacySafeNotifications
                ? DELAY_REMINDER_COPY.privacySafeLockScreen
                : 'FLOURA: Estimated period or cycle update reminder.'}
              &rdquo;
            </p>
          </div>
          <input
            id="privacy-safe-notif"
            type="checkbox"
            checked={settings.privacySafeNotifications}
            onChange={(e) => updatePartial({ privacySafeNotifications: e.target.checked })}
            className="h-5 w-5 accent-[#705264] dark:accent-[#D9A7AF]"
          />
        </div>

        <div className="mt-5 divide-y divide-[#342B2D]/10 dark:divide-[#F6F0EA]/10">
          {(
            [
              {
                key: 'upcomingPeriod',
                title: 'Estimated upcoming period',
                desc: 'Gentle reminder ahead of your estimated cycle window.',
                hasDaysBefore: true,
              },
              {
                key: 'periodLogging',
                title: 'Period logging reminder',
                desc: 'Prompt to record start or end dates when needed.',
              },
              {
                key: 'dailySymptoms',
                title: 'Daily symptom tracking',
                desc: 'Optional evening check-in for physical and emotional notes.',
              },
              {
                key: 'personalNotes',
                title: 'Personal journal notes',
                desc: 'Quiet prompt to record daily reflections.',
              },
            ] as const
          ).map((item) => {
            const rule = settings.reminders[item.key];
            return (
              <div
                key={item.key}
                className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
              >
                <div>
                  <label
                    htmlFor={`rem-${item.key}`}
                    className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
                  >
                    {item.title}
                  </label>
                  <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">{item.desc}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {'hasDaysBefore' in item && item.hasDaysBefore && rule.enabled && (
                    <label className="flex items-center gap-1.5 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                      <span>Days before:</span>
                      <input
                        type="number"
                        min={1}
                        max={7}
                        value={rule.daysBefore ?? 2}
                        onChange={(e) =>
                          updateReminder(item.key, {
                            daysBefore: Math.max(1, Math.min(7, Number(e.target.value) || 2)),
                          })
                        }
                        className="min-h-[38px] w-14 rounded-lg border border-[#342B2D]/15 bg-[#F8F4EC] px-2 text-center text-xs text-[#342B2D] tabular-nums dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA]"
                      />
                    </label>
                  )}

                  <input
                    type="time"
                    aria-label={`${item.title} time`}
                    value={rule.time}
                    disabled={!rule.enabled}
                    onChange={(e) => updateReminder(item.key, { time: e.target.value })}
                    className="min-h-[40px] rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-2.5 text-xs text-[#342B2D] tabular-nums disabled:opacity-45 dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA]"
                  />

                  <input
                    id={`rem-${item.key}`}
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => updateReminder(item.key, { enabled: e.target.checked })}
                    className="h-5 w-5 accent-[#705264] dark:accent-[#D9A7AF]"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Period Delay Reminders (Optional & Permission-Gated) */}
        <div className="mt-6 rounded-2xl border border-[#705264]/18 bg-[#F8F4EC]/75 p-5 dark:border-[#D9A7AF]/20 dark:bg-[#191416]">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#705264] dark:text-[#D9A7AF]" aria-hidden="true" />
                <label
                  htmlFor="rem-period-delay-enabled"
                  className="font-ui text-sm font-semibold text-[#342B2D] dark:text-[#F6F0EA]"
                >
                  Period Delay Reminders (Optional)
                </label>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
                Gentle, neutral alerts when a valid cycle estimate has passed without a new period recorded. Never sends duplicates and automatically cancels once a period is logged.
              </p>
            </div>
            <input
              id="rem-period-delay-enabled"
              type="checkbox"
              checked={delayReminderConfig.enabled}
              onChange={(e) => updatePeriodDelayReminder({ enabled: e.target.checked })}
              className="h-5 w-5 shrink-0 accent-[#705264] dark:accent-[#D9A7AF]"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              <span className="font-ui block font-medium text-[#342B2D] dark:text-[#F6F0EA]">
                Initial reminder (days after est.)
              </span>
              <input
                type="number"
                min={1}
                max={14}
                disabled={!delayReminderConfig.enabled}
                value={delayReminderConfig.initialDaysAfter}
                onChange={(e) =>
                  updatePeriodDelayReminder({
                    initialDaysAfter: Math.max(1, Math.min(14, Number(e.target.value) || 1)),
                  })
                }
                className="mt-1.5 min-h-[40px] w-full rounded-xl border border-[#342B2D]/15 bg-white px-3 text-xs text-[#342B2D] tabular-nums disabled:opacity-45 dark:border-[#F6F0EA]/15 dark:bg-[#282024] dark:text-[#F6F0EA]"
              />
            </label>

            <label className="block text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              <span className="font-ui block font-medium text-[#342B2D] dark:text-[#F6F0EA]">
                Follow-up reminder (days after est.)
              </span>
              <input
                type="number"
                min={delayReminderConfig.initialDaysAfter + 1}
                max={30}
                disabled={!delayReminderConfig.enabled}
                value={delayReminderConfig.followUpDaysAfter}
                onChange={(e) =>
                  updatePeriodDelayReminder({
                    followUpDaysAfter: Math.max(
                      delayReminderConfig.initialDaysAfter + 1,
                      Math.min(30, Number(e.target.value) || 7)
                    ),
                  })
                }
                className="mt-1.5 min-h-[40px] w-full rounded-xl border border-[#342B2D]/15 bg-white px-3 text-xs text-[#342B2D] tabular-nums disabled:opacity-45 dark:border-[#F6F0EA]/15 dark:bg-[#282024] dark:text-[#F6F0EA]"
              />
            </label>

            <label className="block text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              <span className="font-ui block font-medium text-[#342B2D] dark:text-[#F6F0EA]">
                Preferred reminder time
              </span>
              <input
                type="time"
                disabled={!delayReminderConfig.enabled}
                value={delayReminderConfig.time}
                onChange={(e) => updatePeriodDelayReminder({ time: e.target.value })}
                className="mt-1.5 min-h-[40px] w-full rounded-xl border border-[#342B2D]/15 bg-white px-3 text-xs text-[#342B2D] tabular-nums disabled:opacity-45 dark:border-[#F6F0EA]/15 dark:bg-[#282024] dark:text-[#F6F0EA]"
              />
            </label>
          </div>

          {/* Exact Wording Preview & PWA Limitation Note */}
          <div className="mt-4 space-y-2 rounded-xl border border-[#342B2D]/10 bg-white/80 p-3.5 text-xs text-[#6F5F5D] dark:border-[#F6F0EA]/10 dark:bg-[#282024] dark:text-[#C4B5B1]">
            <p>
              <strong className="text-[#342B2D] dark:text-[#F6F0EA]">In-app initial message:</strong>{' '}
              &ldquo;{DELAY_REMINDER_COPY.initial}&rdquo;
            </p>
            <p>
              <strong className="text-[#342B2D] dark:text-[#F6F0EA]">In-app follow-up message:</strong>{' '}
              &ldquo;{DELAY_REMINDER_COPY.follow_up}&rdquo;
            </p>
            <p className="flex items-start gap-2 pt-1 text-[11px] leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#705264] dark:text-[#D9A7AF]" aria-hidden="true" />
              <span>{PREGNANCY_TEST_EDUCATION.pwaLimitationNote}</span>
            </p>
          </div>

          {/* Local Reminder History & Delete Control */}
          <div className="mt-4 border-t border-[#342B2D]/10 pt-4 dark:border-[#F6F0EA]/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-ui text-xs font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
                Reminder History ({reminderHistory.length})
              </span>
              {reminderHistory.length > 0 && !confirmClearReminderHistory && (
                <button
                  type="button"
                  onClick={() => setConfirmClearReminderHistory(true)}
                  className="font-ui min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-medium text-[#8C3343] hover:bg-[#C58F98]/15 dark:text-[#D9A7AF]"
                >
                  Delete Reminder History
                </button>
              )}
            </div>

            {confirmClearReminderHistory && (
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#A84857]/30 bg-[#C58F98]/12 px-3.5 py-2.5 text-xs">
                <span className="text-[#782A37] dark:text-[#FADCE1]">
                  Clear all local delay reminder history entries?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await onClearReminderHistory();
                      setConfirmClearReminderHistory(false);
                      setStatusMessage('Delay reminder history cleared from local storage.');
                    }}
                    className="font-ui min-h-[34px] rounded-lg bg-[#8C3343] px-3 py-1 font-medium text-white"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearReminderHistory(false)}
                    className="font-ui min-h-[34px] rounded-lg border border-[#342B2D]/15 bg-white px-3 py-1 font-medium text-[#342B2D] dark:border-[#F6F0EA]/15 dark:bg-[#282024] dark:text-[#F6F0EA]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {reminderHistory.length === 0 ? (
              <p className="mt-1.5 text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                No period delay reminder events recorded yet.
              </p>
            ) : (
              <ul className="mt-2.5 max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {reminderHistory.slice(0, 10).map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#342B2D]/8 bg-white px-3 py-2 text-xs dark:border-[#F6F0EA]/8 dark:bg-[#282024]"
                  >
                    <span className="text-[#342B2D] dark:text-[#F6F0EA]">
                      {ev.kind === 'follow_up' ? 'Follow-up' : 'Initial'} ·{' '}
                      <span className="tabular-nums">{ev.triggeredDate}</span>{' '}
                      <span className="text-[#6F5F5D] dark:text-[#C4B5B1]">
                        ({ev.daysPastEstimated}d past est. {ev.estimatedDate || '—'})
                      </span>
                    </span>
                    <span className="font-ui rounded-md bg-[#F0E9E2] px-2 py-0.5 text-[11px] font-medium text-[#705264] dark:bg-[#31272C] dark:text-[#D9A7AF]">
                      {ev.status === 'cancelled_period_logged'
                        ? 'Resolved (period logged)'
                        : ev.status === 'dismissed'
                          ? 'Dismissed'
                          : 'Recorded'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Privacy & Data Management */}
      <section className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 sm:p-7 dark:border-[#F6F0EA]/10 dark:bg-[#282024]">
        <div className="flex items-center gap-2.5">
          <Database className="h-5 w-5 text-[#705264] dark:text-[#D9A7AF]" aria-hidden="true" />
          <h2 className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
            Privacy &amp; Data Management
          </h2>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
          Your profile, periods, symptoms, and notes live exclusively in local IndexedDB storage. JSON exports include your personal profile, and you can restore a backup anytime.
        </p>

        <div className="mt-4 flex flex-col justify-between gap-4 rounded-2xl border border-[#342B2D]/10 bg-[#F8F4EC] p-4 sm:flex-row sm:items-center dark:border-[#F6F0EA]/10 dark:bg-[#191416]">
          <div>
            <p className="font-ui text-sm font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
              Standalone App Mode (PWA)
            </p>
            <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
              Install FLOURA on Android, iOS, or desktop for seamless offline access.
            </p>
          </div>
          <PWAInstallButton variant="card" />
        </div>

        {importError && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-[#A84857]/35 bg-[#C58F98]/15 px-4 py-3 text-sm text-[#782A37] dark:border-[#D9A7AF]/35 dark:text-[#FADCE1]"
          >
            {importError}
          </div>
        )}

        <div className="mt-4 divide-y divide-[#342B2D]/10 rounded-2xl border border-[#342B2D]/10 bg-[#F0E9E2]/55 px-4 dark:divide-[#F6F0EA]/10 dark:border-[#F6F0EA]/10 dark:bg-[#231C1F]">
          <div className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <label
                htmlFor="privacy-hide-activity-icons"
                className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
              >
                Hide personal activity heart icons on calendar
              </label>
              <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                Hides heart indicators on the monthly calendar without deleting your saved entries.
              </p>
            </div>
            <input
              id="privacy-hide-activity-icons"
              type="checkbox"
              checked={Boolean(settings.hidePersonalActivityIndicators)}
              onChange={(e) =>
                updatePartial({ hidePersonalActivityIndicators: e.target.checked })
              }
              className="h-5 w-5 shrink-0 accent-[#705264] dark:accent-[#D9A7AF]"
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <label
                htmlFor="privacy-export-activity"
                className="font-ui block text-sm font-medium text-[#342B2D] dark:text-[#F6F0EA]"
              >
                Include Personal Activity entries in private JSON/CSV exports
              </label>
              <p className="text-xs text-[#6F5F5D] dark:text-[#C4B5B1]">
                Excluded by default for privacy. Never included in notifications or public calendar exports.
              </p>
            </div>
            <input
              id="privacy-export-activity"
              type="checkbox"
              checked={includeActivityInExport}
              onChange={(e) => setIncludeActivityInExport(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-[#705264] dark:accent-[#D9A7AF]"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              triggerDownload(
                buildJsonExport(
                  periods,
                  dailyLogs,
                  settings,
                  profile,
                  personalActivities,
                  includeActivityInExport,
                  reminderHistory
                ),
                `floura-export-${new Date().toISOString().slice(0, 10)}.json`,
                'application/json'
              )
            }
            className="font-ui inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-4 py-2 text-sm font-medium text-[#342B2D] hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={() =>
              triggerDownload(
                buildCsvExport(
                  periods,
                  dailyLogs,
                  personalActivities,
                  includeActivityInExport,
                  reminderHistory
                ),
                `floura-export-${new Date().toISOString().slice(0, 10)}.csv`,
                'text/csv;charset=utf-8'
              )
            }
            className="font-ui inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-4 py-2 text-sm font-medium text-[#342B2D] hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => backupFileRef.current?.click()}
            className="font-ui inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-4 py-2 text-sm font-medium text-[#342B2D] hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>Import JSON Backup</span>
          </button>

          <input
            ref={backupFileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="sr-only"
            aria-label="Import FLOURA JSON backup file"
          />

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="font-ui inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#A84857]/35 px-4 py-2 text-sm font-medium text-[#8C3343] hover:bg-[#C58F98]/15 dark:border-[#D9A7AF]/35 dark:text-[#D9A7AF] dark:hover:bg-[#D9A7AF]/15"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Delete All Personal Data</span>
          </button>
        </div>

        {showDeleteConfirm && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-all-title"
            className="mt-5 rounded-2xl border border-[#A84857]/35 bg-[#C58F98]/15 p-5 dark:border-[#D9A7AF]/35 dark:bg-[#D9A7AF]/12"
          >
            <h3
              id="delete-all-title"
              className="font-heading text-xl font-semibold text-[#782A37] dark:text-[#FADCE1]"
            >
              Permanently delete all local data?
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#342B2D] dark:text-[#F6F0EA]">
              This immediately erases all recorded periods, symptoms, moods, daily notes, personal activity entries, and custom preferences from this device, and restores the default local profile. Export a backup first if you wish to keep a copy.
            </p>
            <div className="mt-3">
              <label
                htmlFor="confirm-delete-input"
                className="font-ui block text-xs font-medium text-[#342B2D] dark:text-[#F6F0EA]"
              >
                Type DELETE to confirm
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={deleteTyped}
                onChange={(e) => setDeleteTyped(e.target.value)}
                placeholder="DELETE"
                className="mt-1 min-h-[44px] w-full max-w-xs rounded-xl border border-[#A84857]/35 bg-white px-3 text-sm text-[#342B2D] dark:bg-[#191416] dark:text-[#F6F0EA]"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={deleteTyped.trim().toUpperCase() !== 'DELETE'}
                onClick={handleConfirmDeleteAll}
                className="font-ui min-h-[44px] rounded-xl bg-[#8C3343] px-4 py-2 text-sm font-medium text-white disabled:opacity-45"
              >
                Permanently Erase Data
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTyped('');
                }}
                className="font-ui min-h-[44px] rounded-xl border border-[#342B2D]/15 bg-white px-4 py-2 text-sm font-medium text-[#342B2D] dark:border-[#F6F0EA]/15 dark:text-[#F6F0EA] dark:bg-[#282024]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* About FLOURA */}
      <section className="rounded-3xl border border-[#342B2D]/10 bg-white p-6 sm:p-7 dark:border-[#F6F0EA]/10 dark:bg-[#282024]">
        <div className="flex items-center gap-2.5">
          <HeartHandshake className="h-5 w-5 text-[#68755A] dark:text-[#B3BDAA]" aria-hidden="true" />
          <h2 className="font-heading text-2xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]">
            About FLOURA
          </h2>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
          <p className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#705264] dark:text-[#D9A7AF]" aria-hidden="true" />
            <span>
              <strong className="text-[#342B2D] dark:text-[#F6F0EA]">Privacy Policy:</strong>{' '}
              FLOURA requires no account, collects no personally identifying information, includes zero advertising SDKs or third-party analytics, and never transmits your profile, cycle, symptom, or mood records over the network.
            </span>
          </p>
          <p>
            <strong className="text-[#342B2D] dark:text-[#F6F0EA]">Medically Responsible Care:</strong>{' '}
            Cycle phase indicators, upcoming period windows, and calendar ovulation estimates are informational approximations derived from your logged dates. They do not confirm ovulation, diagnose health conditions, or prevent pregnancy.
          </p>
        </div>
      </section>
    </div>
  );
};
