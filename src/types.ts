export type ProviderId = 'openai' | 'gemini' | 'nvidia' | 'dummy';

export interface AppSettings {
  provider: ProviderId;
  model: string;
  apiKey?: string;
  rememberKey: boolean;
  theme: 'light' | 'dark' | 'system';
  panelOpen: boolean;
  panelWidth: number;
}

export interface LookupContext {
  word: string;
  sentence: string;
  paragraph: string;
  page: number;
  documentTitle: string;
  chapter?: string;
  mode: 'contextual_meaning';
}

export interface ContextAnswer {
  meaning: string;
  explanation: string;
  example: string;
}

export interface SavedWord {
  id: string;
  word: string;
  documentId: string;
  documentTitle: string;
  page: number;
  sentence: string;
  explanation: ContextAnswer;
  createdAt: number;
}

export interface Lookup extends SavedWord {
  context: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  pageCount: number;
  createdAt: number;
  currentPage?: number;
  pdfData?: ArrayBuffer;
}
