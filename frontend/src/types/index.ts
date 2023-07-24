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
  role: UserRole[];
  permissionId: string;
};

export type Article = {
  article_id: string;
  title: string;
  description: string;
  permission_id: string;
  role: UserRole | null;
};

export type Comment = {
  content: string;
  created_at: Date;
  users: { raw_user_meta_data: { username: string } };
};

export enum UserRole {
  Owner = 0,
  Contributor = 1,
  Reviewer = 2,
}

export type Permission = {
  permissionId: string;
  roles: UserRole[] | null;
};
