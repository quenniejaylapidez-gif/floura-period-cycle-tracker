import type {
  AvatarOptionId,
  MoodDefinition,
  PersonalActivityContext,
  SymptomDefinition,
  UserProfile,
  UserSettings,
} from '../types/cycle';

export const PERSONAL_ACTIVITY_CONTEXTS: {
  id: PersonalActivityContext;
  label: string;
}[] = [
  { id: 'unspecified', label: 'Prefer not to specify' },
  { id: 'protected', label: 'Protected' },
  { id: 'unprotected', label: 'Unprotected' },
  { id: 'intimacy_other', label: 'Affection / other' },
];

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'user_profile',
  displayName: 'Beautiful Soul',
  description: 'Your personal wellness space.',
  avatarType: 'minimalist',
  customAvatarDataUrl: null,
  greetingStyle: 'time_based',
  updatedAt: 0,
};

export const AVATAR_OPTIONS: {
  id: Exclude<AvatarOptionId, 'custom'>;
  label: string;
  caption: string;
}[] = [
  { id: 'minimalist', label: 'Minimalist', caption: 'Default serene silhouette' },
  { id: 'botanical', label: 'Botanical', caption: 'Sage sprig motif' },
  { id: 'floral', label: 'Floral', caption: 'Dusty rose bloom' },
  { id: 'pastel', label: 'Abstract', caption: 'Warm organic arches' },
];

export const SYMPTOM_CATALOG: SymptomDefinition[] = [
  // Physical
  { id: 'cramps', label: 'Cramps', category: 'physical' },
  { id: 'headache', label: 'Headache', category: 'physical' },
  { id: 'bloating', label: 'Bloating', category: 'physical' },
  { id: 'breast_tenderness', label: 'Breast tenderness', category: 'physical' },
  { id: 'fatigue', label: 'Fatigue', category: 'physical' },
  { id: 'acne', label: 'Acne', category: 'physical' },
  { id: 'back_pain', label: 'Back pain', category: 'physical' },
  { id: 'nausea', label: 'Nausea', category: 'physical' },
  // Emotional
  { id: 'mood_changes', label: 'Mood changes', category: 'emotional' },
  { id: 'irritability', label: 'Irritability', category: 'emotional' },
  { id: 'stress', label: 'Stress', category: 'emotional' },
  { id: 'anxiety', label: 'Anxiety', category: 'emotional' },
  { id: 'feeling_emotional', label: 'Feeling emotional', category: 'emotional' },
  // Other
  { id: 'sleep_quality', label: 'Sleep quality', category: 'other' },
  { id: 'energy_level', label: 'Energy level', category: 'other' },
  { id: 'appetite', label: 'Appetite', category: 'other' },
  { id: 'general_wellbeing', label: 'General well-being', category: 'other' },
];

export const MOOD_CATALOG: MoodDefinition[] = [
  { id: 'happy', label: 'Happy', tone: 'positive' },
  { id: 'calm', label: 'Calm', tone: 'positive' },
  { id: 'energetic', label: 'Energetic', tone: 'positive' },
  { id: 'neutral', label: 'Neutral', tone: 'neutral' },
  { id: 'tired', label: 'Tired', tone: 'low' },
  { id: 'stressed', label: 'Stressed', tone: 'low' },
  { id: 'sad', label: 'Sad', tone: 'low' },
  { id: 'irritable', label: 'Irritable', tone: 'low' },
];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  id: 'user_settings',
  useManualPreferences: false,
  manualCycleLength: 28,
  manualPeriodDuration: 5,
  theme: 'light',
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  privacySafeNotifications: true,
  hidePersonalActivityIndicators: false,
  reminders: {
    upcomingPeriod: { enabled: false, time: '09:00', daysBefore: 2 },
    periodLogging: { enabled: false, time: '20:00' },
    dailySymptoms: { enabled: false, time: '21:00' },
    personalNotes: { enabled: false, time: '21:30' },
  },
  periodDelayReminder: {
    enabled: false,
    initialDaysAfter: 1,
    followUpDaysAfter: 7,
    time: '09:00',
  },
  lastReminderCheckedDate: null,
  updatedAt: 0,
};

export const DELAY_REMINDER_COPY = {
  initial:
    'Your period is later than estimated. If pregnancy is possible, you may consider taking a pregnancy test. Remember, cycle predictions are estimates.',
  follow_up:
    "Your period hasn't been recorded yet. If pregnancy is possible, consider taking a pregnancy test or seeking advice from a healthcare professional.",
  privacySafeLockScreen:
    'FLOURA: A gentle cycle calendar update is ready to view inside the app.',
} as const;

export const PREGNANCY_TEST_EDUCATION = {
  title: 'Understanding Late Periods & Pregnancy Testing',
  points: [
    'Home pregnancy tests are generally most reliable from the first day of a missed period.',
    'If the expected period date is unknown, testing at least 21 days after unprotected sex is recommended.',
    'If a test is negative but the period still does not arrive, consider repeating the test after a few days and seeking advice from a healthcare professional.',
    'A late period can have many causes other than pregnancy—including stress, travel, illness, sleep changes, significant shifts in exercise or weight, and natural cycle variability.',
  ],
  disclaimer:
    'FLOURA estimates are informational only and never diagnose pregnancy or medical conditions.',
  pwaLimitationNote:
    'Browser PWA notice: Local reminders and notification checks run while FLOURA is open or active in a supported browser. Standard web timers cannot guarantee delivery when the browser or app is completely closed.',
} as const;

export interface EducationalArticle {
  id: string;
  category: 'Fundamentals' | 'Phases' | 'Symptoms & Care' | 'Medical Guidance';
  title: string;
  readTime: string;
  summary: string;
  keyPoints: string[];
  sections: { heading: string; body: string }[];
}

export const EDUCATIONAL_ARTICLES: EducationalArticle[] = [
  {
    id: 'understanding-cycle',
    category: 'Fundamentals',
    title: 'Understanding the menstrual cycle',
    readTime: '4 min read',
    summary:
      'How a menstrual cycle is counted, why cycle length varies naturally from person to person, and what patterns look like over time.',
    keyPoints: [
      'Day 1 of a menstrual cycle is the first day of active menstrual bleeding, not the day bleeding stops.',
      'Typical adult cycle lengths commonly range from 21 to 35 days; 28 days is only a population average, not a rule.',
      'Stress, travel, illness, sleep shifts, and life stages can temporarily shift cycle timing.',
    ],
    sections: [
      {
        heading: 'How cycle length is measured',
        body: 'A menstrual cycle begins on the first day of your period (Day 1) and ends the day before your next period begins. Tracking start dates consistently over several months gives you a personal baseline rather than relying on a textbook 28-day assumption.',
      },
      {
        heading: 'Why cycles vary between individuals',
        body: 'Healthy cycles do not follow an identical clock. Two people can both have healthy cycles while one averages 24 days and another averages 33 days. Even within the same person, shifting by a few days from month to month is common.',
      },
    ],
  },
  {
    id: 'four-phases',
    category: 'Phases',
    title: 'The four menstrual cycle phases',
    readTime: '5 min read',
    summary:
      'An overview of the menstrual, follicular, ovulation, and luteal phases and how hormonal signaling coordinates each stage.',
    keyPoints: [
      'Menstrual phase: shedding of the uterine lining (endometrium) when pregnancy has not occurred.',
      'Follicular phase: overlaps with menstruation and continues until ovulation as ovarian follicles mature.',
      'Ovulation: release of an egg mid-cycle, typically driven by a brief luteinizing hormone (LH) surge.',
      'Luteal phase: follows ovulation and prepares the uterine lining before either pregnancy or the next period.',
    ],
    sections: [
      {
        heading: 'Menstrual and follicular phases',
        body: 'During the menstrual phase, estrogen and progesterone are low, signaling the uterus to shed its lining. At the same time, follicle-stimulating hormone (FSH) encourages follicles in the ovaries to grow. As a dominant follicle matures, rising estrogen thickens a fresh uterine lining.',
      },
      {
        heading: 'Ovulation and luteal phases',
        body: 'A rapid rise in luteinizing hormone triggers ovulation, releasing a mature egg. Afterward, the empty follicle transforms into the corpus luteum, producing progesterone during the luteal phase. The luteal phase is often around 12 to 14 days, whereas follicular length varies much more widely.',
      },
    ],
  },
  {
    id: 'during-menstruation',
    category: 'Fundamentals',
    title: 'What happens during menstruation',
    readTime: '3 min read',
    summary:
      'What menstrual fluid contains, typical bleeding durations, and normal variations in flow volume and color.',
    keyPoints: [
      'Menstrual bleeding commonly lasts 2 to 7 days, often heaviest in the first two days.',
      'Menstrual fluid includes blood, cervical mucus, vaginal secretions, and endometrial tissue.',
      'Color changes from bright red to dark brown or rust are normal as flow speed changes.',
    ],
    sections: [
      {
        heading: 'Normal flow and appearance',
        body: 'Fresh flow tends to look bright or deep red, while slower flow exposed to oxygen turns brown or dark red—especially at the start or end of a period. Small clots occasionally appear on heavier days as the body’s natural anticoagulants keep pace with heavier shedding.',
      },
      {
        heading: 'Why uterine cramps happen',
        body: 'Hormone-like compounds called prostaglandins help the uterus contract gently to release its lining. Higher prostaglandin levels can cause stronger cramping or lower back discomfort, particularly in the first 24 to 48 hours of bleeding.',
      },
    ],
  },
  {
    id: 'understanding-ovulation',
    category: 'Phases',
    title: 'Understanding ovulation',
    readTime: '4 min read',
    summary:
      'Why calendar-based apps can only estimate ovulation, and what biological signs actually reflect ovulation timing.',
    keyPoints: [
      'Calendar estimates subtract roughly 14 days from a predicted next period—they cannot confirm whether or when ovulation occurred.',
      'Ovulation timing can shift earlier or later in any given cycle, even in people with regular periods.',
      'Calendar estimates should never be relied upon alone to prevent or plan pregnancy.',
    ],
    sections: [
      {
        heading: 'Calendar estimates versus biological confirmation',
        body: 'Because the luteal phase is often—though not always—around 14 days, trackers estimate ovulation by counting backward from your expected next period. However, stress, illness, or natural hormone variation can delay ovulation, which pushes the next period back too.',
      },
      {
        heading: 'Observable biological signs',
        body: 'Clinical confirmation of ovulation requires tools such as basal body temperature tracking (which rises slightly after ovulation), urinary LH test strips, or medical ultrasound and hormone labs. Calendar dates remain useful for personal awareness, not clinical certainty.',
      },
    ],
  },
  {
    id: 'common-symptoms',
    category: 'Symptoms & Care',
    title: 'Common menstrual symptoms',
    readTime: '4 min read',
    summary:
      'Recognizing common physical and emotional patterns across the cycle without assuming every feeling is hormone-driven.',
    keyPoints: [
      'Mild to moderate cramps, bloating, breast tenderness, fatigue, and headaches are frequently reported.',
      'Mood and energy are shaped by sleep, nutrition, workload, and life circumstances alongside physical comfort.',
      'Logging symptoms over 2 to 3 cycles helps reveal personal patterns you can discuss with a clinician.',
    ],
    sections: [
      {
        heading: 'Physical changes before and during bleeding',
        body: 'Fluid retention can cause temporary bloating or breast tenderness in the days preceding a period. Prostaglandins can also affect the digestive tract, leading to temporary changes in bowel habits or mild nausea during menstruation.',
      },
      {
        heading: 'Context matters for emotional well-being',
        body: 'While hormonal shifts can influence sensitivity or sleep quality for some people, everyday mood fluctuations also reflect stress, rest, social support, and mental health. Tracking mood alongside sleep and daily notes helps build a complete, nonjudgmental picture.',
      },
    ],
  },
  {
    id: 'healthy-habits',
    category: 'Symptoms & Care',
    title: 'Healthy menstrual habits',
    readTime: '4 min read',
    summary:
      'Practical, evidence-based self-care habits for period comfort, hygiene, and overall cycle support.',
    keyPoints: [
      'Change disposable pads or tampons every 4–8 hours (and empty/wash menstrual cups per manufacturer guidance).',
      'Applying warmth to the lower abdomen and gentle movement (such as walking or stretching) can ease mild cramps.',
      'Staying hydrated, eating iron-rich foods, and prioritizing consistent sleep support energy throughout your cycle.',
    ],
    sections: [
      {
        heading: 'Comfort and daily routines',
        body: 'Heat therapy—such as a warm heating pad on the lower abdomen—helps relax uterine muscles and can meaningfully reduce mild cramping. Light physical activity releases endorphins that support comfort and rest.',
      },
      {
        heading: 'Safe menstrual product practices',
        body: 'Wash hands before and after changing menstrual products, choose the lowest absorbency tampon needed for your flow, and avoid scented washes or douching, which can disrupt natural vaginal flora.',
      },
    ],
  },
  {
    id: 'when-to-seek-advice',
    category: 'Medical Guidance',
    title: 'When to seek medical advice',
    readTime: '4 min read',
    summary:
      'Clear signs that warrant evaluation by a qualified healthcare professional rather than self-monitoring alone.',
    keyPoints: [
      'Soaking through one or more pads or tampons every hour for two consecutive hours.',
      'Periods lasting longer than 7–8 days, or bleeding between periods / after sex.',
      'Severe pain that interferes with daily activities or does not respond to standard over-the-counter relief.',
      'Sudden absence of periods for 3 months or more (when not pregnant or using continuous hormonal contraception).',
    ],
    sections: [
      {
        heading: 'Recognizing symptoms beyond typical variation',
        body: 'Menstrual care should never normalize debilitating pain or exhausting blood loss. Signs like passing clots larger than a quarter repeatedly, feeling dizzy or short of breath during your period, or sudden major shifts in cycle pattern deserve prompt medical evaluation.',
      },
      {
        heading: 'Bringing your log to an appointment',
        body: 'Exporting a summary of your recorded start dates, period durations, and symptom severity gives a clinician concrete timeline information so you can get tailored answers faster.',
      },
    ],
  },
  {
    id: 'irregular-periods',
    category: 'Medical Guidance',
    title: 'Understanding irregular periods',
    readTime: '4 min read',
    summary:
      'What counts as cycle irregularity, common everyday and medical reasons for variable timing, and why estimates widen.',
    keyPoints: [
      'Cycles that routinely vary by more than 7–9 days from month to month, or fall outside 21–35 days in adults, are considered irregular.',
      'Irregularity is common during the first few years after menarche and during perimenopause.',
      'Significant weight changes, intense endurance training, high stress, thyroid shifts, or PCOS can also affect regularity.',
    ],
    sections: [
      {
        heading: 'Why predictions become ranges with irregular cycles',
        body: 'When cycle lengths vary widely, pointing to one exact future date creates false precision. FLOURA widens the estimated window whenever your recorded cycle history shows high variability—and clearly marks when history is variable.',
      },
      {
        heading: 'Supportive next steps',
        body: 'If your cycles are consistently unpredictable, unusually short (< 21 days), or unusually long (> 35–45 days), sharing several months of tracked dates with a healthcare provider can help identify underlying factors.',
      },
    ],
  },
  {
    id: 'late-period-and-pregnancy-testing',
    category: 'Medical Guidance',
    title: 'Late periods and pregnancy test timing',
    readTime: '4 min read',
    summary:
      'Understanding why a period may arrive past an estimated date, when home pregnancy tests are most accurate, and when to repeat a test or consult a clinician.',
    keyPoints: [
      'Home pregnancy tests are generally most reliable from the first day of a missed period.',
      'If the expected period date is unknown, testing at least 21 days after unprotected sex is recommended.',
      'If a test is negative and your period still does not arrive, repeat the test after a few days and consider seeking professional advice.',
      'Many everyday and physiological factors besides pregnancy—such as stress, illness, travel, or natural ovulation shifts—can delay a period.',
    ],
    sections: [
      {
        heading: 'Estimated dates vs. confirmed cycle shifts',
        body: 'Because calendar predictions estimate when ovulation and menstruation might occur based on past averages, a natural shift of a few days in ovulation immediately shifts when your next period begins. A missed or later-than-estimated date on a calendar is never a diagnosis.',
      },
      {
        heading: 'When to consider taking a pregnancy test',
        body: 'If pregnancy is possible, home urine pregnancy tests are generally most reliable starting from the first day of a missed period. When your expected period date is uncertain or cycles are irregular, testing at least 21 days after unprotected sex provides clearer accuracy. If a result is negative and bleeding still has not started, repeating a test a few days later or speaking with a healthcare professional can help clarify next steps.',
      },
    ],
  },
];
