export type User = {
  username: string;
  email: string;
  role: 0 | 1 | 2;
  permissionId: string;
};

export type Change = {
  changeId: string;
  content?: string;
  status?: 0 | 1 | 2;
  description?: string;
  type_of_edit?: 0 | 1 | 2;
};

export type Article = {
  article_id: string;
  title: string;
  description: string;
  permission_id: string;
  role: 0 | 1 | 2 | null;
};

export interface ChildNodeData extends ChildNode {
  data?: string;
}
