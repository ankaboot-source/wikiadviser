export type Change = {
  id?: string;
  content?: string;
  status?: 0 | 1 | 2;
  description?: string;
  type_of_edit?: TypeOfEditDictionary;
  index?: number | null;
  article_id?: string;
  contributor_id?: string;
  created_at?: string;
  revision_id?: string;
};

export interface Article {
  current_html_content: string;
}

export interface ChildNodeData extends ChildNode {
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
  'structural-change' = 3,
  'remove-insert' = 4
}

export interface ErrorResponse {
  message: string;
}

export type Articles = {
  title: string;
  description: string;
  created_at: Date;
  language: string;
};

type Role = 'owner' | 'editor' | 'reviewer' | 'viewer';

export type Permission = {
  id: string;
  created_at: string;
  article_id: string;
  role: Role;
  articles: Articles;
};

export type ArticleData = {
  article_id: string;
  title: string;
  description: string;
  permission_id: string;
  role: Role;
  language: string;
  created_at: Date;
};
