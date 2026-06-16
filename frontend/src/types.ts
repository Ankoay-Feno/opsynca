export type WebSource = {
  uri: string;
  title: string | null;
};

export type ChatSource = {
  documentId: string | null;
  filename: string | null;
  chunkIndex: number | null;
  text: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  webSources?: WebSource[];
};

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ContextChunkInput = {
  filename: string | null;
  chunk_index: number | null;
  text: string;
};

export type ExtractResponse = {
  filename: string;
  content_type: string | null;
  extension: string;
  text: string;
  warnings: string[];
};

export type AnswerResponse = {
  answer: string;
  used_context_indices: number[];
  web_sources: WebSource[];
};

export type Job = {
  id: string;
  titre: string;
  entreprise: string | null;
  lieu: string | null;
  remote: boolean;
  source: string;
  lien: string;
  date: string | null;
  description: string | null;
  match: number | null;
};

export type JobSearchResponse = {
  count: number;
  jobs: Job[];
};

export type JobFilters = {
  madagascar: boolean;
  remote: boolean;
};

export type CvJobSearchResponse = {
  metier: string | null;
  mots_cles: string[];
  count: number;
  jobs: Job[];
};
