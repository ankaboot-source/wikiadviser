export type ChangesItem = {
  id: string;
  content: string;
  status: 0 | 1 | 2;
  type_of_edit: 0 | 1 | 2;
  description: string;
  users: { raw_user_meta_data: { username: string } };
  created_at: string;
  comments: Comment[];
};

export type SearchResult = {
  index: number;
  title: string;
  description?: string;
  thumbnail?: {
    source: string;
  };
};

export type User = {
  username: string;
  email: string;
  role: number;
  permissionId: string;
};

export type Article = {
  article_id: string;
  title: string;
  description: string;
  permission_id: string;
  role: 0 | 1 | 2 | null;
};

export type Comment = {
  content: string;
  created_at: Date;
  users: { raw_user_meta_data: { username: string } };
};
