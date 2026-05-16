export type IndexedDocument = {
  document_id: string;
  filename: string | null;
  content_type: string | null;
  chunks: number;
};

export type IndexResponse = {
  message: string;
  document_id: string;
  filename: string;
  content_type: string | null;
  extension: string;
  chunks: number;
  cleaned_content: string;
  warnings: string[];
};

export type ChatSource = {
  document_id: string | null;
  filename: string | null;
  chunk_index: number | null;
  score: number | null;
  text: string;
};

export type WebSource = {
  uri: string;
  title: string | null;
};

export type ChatResponse = {
  answer: string;
  sources: ChatSource[];
  web_sources: WebSource[];
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
