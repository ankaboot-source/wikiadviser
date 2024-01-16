export type SupabaseArticle = {
  id: string;
  created_at: Date | null;
  title: string | null;
  description: string | null;
  current_html_content: string | null;
  language: string | null;
  web_publication: boolean;
};

export type SupabaseChange = {
  id: string;
  created_at: string;
  status: number;
  type_of_edit: number;
  description: string;
  content: string;
  article_id: string;
  contributor_id: string;
  index: number;
  archived: boolean;
  revision_id: string;
  hidden: boolean;
};

export interface ChangeItem extends SupabaseChange {
  user: {
    id: string;
    email: string;
    picture: string;
  };
  comments: Comment[];
  revision: {
    revid: number;
    summary: string;
  };
}

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
  web_publication: boolean;
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

export enum Status {
  AwaitingReviewerApproval = 0,
  EditApproved = 1,
  EditRejected = 2,
}
export interface Revision {
  revid: number;
  index: number;
  summary: string;
  items: ChangeItem[];
  isRecent: boolean;
}
