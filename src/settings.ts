export type Settings = {
  paper: '58' | '80';
  header: string;
  footer: string;
  autoPrint: boolean;
  copies: number;
};

export const DEFAULT_SETTINGS: Settings = {
  paper: '58',
  header: 'SWEETNATION\nHappiness is HOMEMADE',
  footer: 'Terima kasih 🙏',
  autoPrint: false,
  copies: 1,
};

const KEY = 'sweetnation.settings';

export const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const saved = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      paper: saved.paper === '80' ? '80' : '58',
      copies: Math.min(3, Math.max(1, Number(saved.copies) || 1)),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (s: Settings) => {
  localStorage.setItem(KEY, JSON.stringify(s));
};
