export type Change = {
  changeId: string;
  content?: string;
  status?: 0 | 1 | 2;
  description?: string;
  type_of_edit?: 0 | 1 | 2;
  index?: number | null;
};

export interface ChildNodeData extends ChildNode {
  data?: string;
}

export type WikipediaSearchResult = {
  title: string;
  description?: string;
  thumbnail?: string;
};
