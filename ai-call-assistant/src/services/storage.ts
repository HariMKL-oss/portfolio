import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  AppSettings,
  InterviewSession,
  LLMProvider,
  STTProvider,
} from '../types';

const KEYS = {
  SETTINGS: '@interview_copilot_settings',
  RESUME: '@interview_copilot_resume',
  JOB_DESCRIPTION: '@interview_copilot_jd',
  SESSIONS: '@interview_copilot_sessions',
  LAST_ROLE: '@interview_copilot_last_role',
};

const SECRET_KEYS = {
  OPENAI: 'interview_copilot.openai_api_key',
  DEEPGRAM: 'interview_copilot.deepgram_api_key',
  GEMINI: 'interview_copilot.gemini_api_key',
};

const DEFAULT_SETTINGS: AppSettings = {
  openaiApiKey: '',
  deepgramApiKey: '',
  geminiApiKey: '',
  sttProvider: 'openai_whisper',
  llmProvider: 'openai',
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function hasSecureStorage(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function readSecret(key: string): Promise<string> {
  if (await hasSecureStorage()) {
    return (await SecureStore.getItemAsync(key)) || '';
  }

  // Web fallback. Native Android/iOS builds always use encrypted SecureStore.
  return (await AsyncStorage.getItem(`@secure_fallback:${key}`)) || '';
}

async function writeSecret(key: string, value: string): Promise<void> {
  const normalizedValue = value.trim();

  if (await hasSecureStorage()) {
    if (normalizedValue) {
      await SecureStore.setItemAsync(key, normalizedValue);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
    return;
  }

  const fallbackKey = `@secure_fallback:${key}`;
  if (normalizedValue) {
    await AsyncStorage.setItem(fallbackKey, normalizedValue);
  } else {
    await AsyncStorage.removeItem(fallbackKey);
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const existing = await getSettings();
  const merged = { ...existing, ...settings };

  await Promise.all([
    AsyncStorage.setItem(
      KEYS.SETTINGS,
      JSON.stringify({
        sttProvider: merged.sttProvider,
        llmProvider: merged.llmProvider,
      })
    ),
    writeSecret(SECRET_KEYS.OPENAI, merged.openaiApiKey),
    writeSecret(SECRET_KEYS.DEEPGRAM, merged.deepgramApiKey),
    writeSecret(SECRET_KEYS.GEMINI, merged.geminiApiKey),
  ]);
}

export async function getSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  const stored = parseJson<Partial<AppSettings>>(raw, {});

  const sttProvider: STTProvider =
    stored.sttProvider === 'deepgram' ? 'deepgram' : 'openai_whisper';
  const llmProvider: LLMProvider =
    stored.llmProvider === 'gemini' ? 'gemini' : 'openai';

  let [openaiApiKey, deepgramApiKey, geminiApiKey] = await Promise.all([
    readSecret(SECRET_KEYS.OPENAI),
    readSecret(SECRET_KEYS.DEEPGRAM),
    readSecret(SECRET_KEYS.GEMINI),
  ]);

  // One-time migration from older versions that stored keys in AsyncStorage.
  openaiApiKey ||= typeof stored.openaiApiKey === 'string' ? stored.openaiApiKey : '';
  deepgramApiKey ||=
    typeof stored.deepgramApiKey === 'string' ? stored.deepgramApiKey : '';
  geminiApiKey ||= typeof stored.geminiApiKey === 'string' ? stored.geminiApiKey : '';

  const containsLegacySecrets =
    'openaiApiKey' in stored || 'deepgramApiKey' in stored || 'geminiApiKey' in stored;

  if (containsLegacySecrets) {
    await Promise.all([
      writeSecret(SECRET_KEYS.OPENAI, openaiApiKey),
      writeSecret(SECRET_KEYS.DEEPGRAM, deepgramApiKey),
      writeSecret(SECRET_KEYS.GEMINI, geminiApiKey),
      AsyncStorage.setItem(
        KEYS.SETTINGS,
        JSON.stringify({ sttProvider, llmProvider })
      ),
    ]);
  }

  return {
    ...DEFAULT_SETTINGS,
    sttProvider,
    llmProvider,
    openaiApiKey,
    deepgramApiKey,
    geminiApiKey,
  };
}

export async function saveResume(text: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.RESUME, text);
}

export async function getResume(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.RESUME)) || '';
}

export async function saveJobDescription(text: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.JOB_DESCRIPTION, text);
}

export async function getJobDescription(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.JOB_DESCRIPTION)) || '';
}

export async function saveLastRole(role: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.LAST_ROLE, role);
}

export async function getLastRole(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.LAST_ROLE)) || 'software_engineer';
}

export async function saveSession(session: InterviewSession): Promise<void> {
  const sessions = await getSessions();
  const index = sessions.findIndex((item) => item.id === session.id);

  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }

  await AsyncStorage.setItem(
    KEYS.SESSIONS,
    JSON.stringify(sessions.slice(0, 50))
  );
}

export async function getSessions(): Promise<InterviewSession[]> {
  const sessions = parseJson<unknown>(
    await AsyncStorage.getItem(KEYS.SESSIONS),
    []
  );
  return Array.isArray(sessions) ? (sessions as InterviewSession[]) : [];
}

export async function deleteSession(sessionId: string): Promise<void> {
  const sessions = await getSessions();
  await AsyncStorage.setItem(
    KEYS.SESSIONS,
    JSON.stringify(sessions.filter((session) => session.id !== sessionId))
  );
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    AsyncStorage.multiRemove([
      ...Object.values(KEYS),
      ...Object.values(SECRET_KEYS).map((key) => `@secure_fallback:${key}`),
    ]),
    ...Object.values(SECRET_KEYS).map(async (key) => {
      if (await hasSecureStorage()) {
        await SecureStore.deleteItemAsync(key);
      }
    }),
  ]);
}
