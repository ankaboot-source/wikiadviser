export type ChangesItem = {
  id: string;
  content: string;
  status: 0 | 1 | 2;
  type_of_edit: 0 | 1 | 2 | 3;
  description: string;
  user: {
    id: string;
    email: string;
    picture: string;
  };
  created_at: string;
  comments: Comment[];
  index: number | null;
  revision_id: string;
  revision: {
    revid: number;
    summary: string;
  };
  archived: boolean;
};

export type SearchResult = {
  title: string;
  description?: string;
  thumbnail?: string;
};

export type User = {
  picture: string;
  email: string;
  role: UserRole;
  permissionId: string;
};

export type Article = {
  article_id: string;
  title: string;
  description: string;
  permission_id: string;
  role: UserRole;
  created_at: Date;
  language: string;
};

export type Comment = {
  content: string;
  created_at: Date;
  user: {
    id: string;
    email: string;
    picture: string;
  };
};

export enum UserRole {
  Owner = 'owner',
  Editor = 'editor',
  Reviewer = 'reviewer',
  Viewer = 'viewer',
}

export type Permission = {
  permissionId: string;
  role: UserRole;
};
