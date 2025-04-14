export interface Article {
  current_html_content: string;
}

export interface ChildNodeData {
  data?: string;
}

export type WikipediaSearchResult = {
  title: string;
  description?: string;
  thumbnail?: string;
};

export enum TypeOfEditDictionary {
  change = 0,
  insert = 1,
  remove = 2,
  "structural-change" = 3,
  "remove-insert" = 4,
  "comment-insert" = 5,
}

export interface ErrorResponse {
  message: string;
  stack?: string;
}

export type Account = {
  [key: string]: string;
};

export type {
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.types.ts";
