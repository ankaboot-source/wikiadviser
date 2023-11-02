export type Change = {
  id?: string;
  content?: string;
  status?: 0 | 1 | 2;
  description?: string;
  type_of_edit?: 0 | 1 | 2;
  index?: number | null;
  article_id?: string;
  contributor_id?: string;
  created_at?: string;
};

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
  remove = 2
}

export type WikiAdviserJWTcookie = {
  name: 'WikiAdviserJWTcookie';
  value: string;
  url?: string;
};
