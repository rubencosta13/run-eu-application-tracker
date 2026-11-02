export interface Programme {
  [key: string]: any;
  id?: string;
  name?: string;
  type?: string;
  country?: string;
  location?: string;
  ects?: number | null;
  application_deadline?: string | null;
  url?: string;
  in_person?: { start?: string | null; end?: string | null };
  verification?: { status?: string; last_checked?: string | null; notes?: string };
  tags?: string[];
}

export interface AnswerRevision {
  [key: string]: any;
  revision: number;
  created_at?: string;
  answer?: string;
  submitted?: boolean;
  submitted_at?: string;
  notes?: string;
}

export interface ApplicationQuestion {
  [key: string]: any;
  id?: string;
  order?: number;
  wording?: string;
  type?: string;
  required?: boolean;
  answer_history?: AnswerRevision[];
  current_revision?: number;
}

export interface ApplicationRecord {
  [key: string]: any;
  _file: string;
  programme: Programme;
  application: Record<string, any>;
  questions: ApplicationQuestion[];
}

export interface ParticipationEntry {
  [key: string]: any;
  name?: string;
  programme_id?: string;
  programme_type?: string;
  location?: string;
  country?: string;
  participation_period?: string;
  participation_status?: string;
  ects?: number | null;
  ects_awarded?: boolean | null;
  skills_and_learning?: string[];
}

export interface LibraryEntry {
  [key: string]: any;
  title?: string;
  topic?: string;
  content?: string;
  tags?: string[];
}

export interface AppState {
  apps: ApplicationRecord[];
  participation: { entries: ParticipationEntry[] };
  library: { entries: LibraryEntry[] };
  common: { questions: Record<string, any>[] };
  view: string;
  activeFile: string | null;
}

export const state: AppState = {
  apps: [],
  participation: { entries: [] },
  library: { entries: [] },
  common: { questions: [] },
  view: "overview",
  activeFile: null,
};