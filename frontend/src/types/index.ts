export type ChangesItem = {
  id: string;
  content: string;
  status: 0 | 1 | 2;
  type_of_edit: 0 | 1 | 2;
  description: string;
  users: { raw_user_meta_data: { username: string } };
  created_at: string;
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
