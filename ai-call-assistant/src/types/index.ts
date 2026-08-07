// ─── Interview Copilot Types ───

export interface QAPair {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
  duration: number; // recording duration in seconds
}

export interface InterviewSession {
  id: string;
  resume: string;
  jobDescription: string;
  role: RoleType;
  companyName: string;
  qaPairs: QAPair[];
  startedAt: number;
  endedAt?: number;
}

export interface AppSettings {
  openaiApiKey: string;
  deepgramApiKey: string;
  geminiApiKey: string;
  sttProvider: STTProvider;
  llmProvider: LLMProvider;
}

export type STTProvider = 'openai_whisper' | 'deepgram';
export type LLMProvider = 'openai' | 'gemini';

export type RecordingState = 'idle' | 'recording' | 'processing';

export type RootStackParamList = {
  Setup: undefined;
  Interview: {
    resume: string;
    jobDescription: string;
    role: RoleType;
  };
  Settings: undefined;
};

export type RoleType =
  | 'software_engineer'
  | 'frontend_developer'
  | 'backend_developer'
  | 'fullstack_developer'
  | 'devops_engineer'
  | 'data_engineer'
  | 'ml_engineer'
  | 'mobile_developer'
  | 'cloud_architect';

export const ROLE_LABELS: Record<RoleType, string> = {
  software_engineer: 'Software Engineer',
  frontend_developer: 'Frontend Developer',
  backend_developer: 'Backend Developer',
  fullstack_developer: 'Full Stack Developer',
  devops_engineer: 'DevOps Engineer',
  data_engineer: 'Data Engineer',
  ml_engineer: 'ML Engineer',
  mobile_developer: 'Mobile Developer',
  cloud_architect: 'Cloud Architect',
};

// ─── Design System Colors ───

export const COLORS = {
  background: '#0B0F1A',
  surface: '#141B2D',
  surfaceElevated: '#1C2538',
  surfaceLight: '#243049',
  primary: '#4F8EF7',
  primaryDim: 'rgba(79, 142, 247, 0.15)',
  secondary: '#7C5CFC',
  success: '#10B981',
  successDim: 'rgba(16, 185, 129, 0.12)',
  danger: '#EF4444',
  dangerDim: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B',
  warningDim: 'rgba(245, 158, 11, 0.12)',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  glass: 'rgba(20, 27, 45, 0.85)',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  hero: 36,
};
