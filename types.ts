export interface Subtitle {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
  originalText?: string; // For translation comparison
  speaker?: string;
  confidence?: number; // 0-1
}

export interface ProjectSettings {
  maxCharsPerLine: number;
  minDuration: number; // seconds
  maxDuration: number; // seconds
  targetLanguage: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING', // Gemini VAD & Transcription
  TRANSLATING = 'TRANSLATING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ru', name: 'Russian' },
];