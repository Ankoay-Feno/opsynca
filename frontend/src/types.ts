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
