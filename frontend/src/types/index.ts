import { Tables } from './database.types';

export interface ChangeItem extends Tables<'changes'> {
  user: Profile;
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
  imported: boolean;
};

export type Comment = {
  id: string;
  created_at: Date;
  user: Profile;
  content: string | null;
  commenter_id: string;
  change_id: string;
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

export interface Profile {
  id: string;
  email: string;
  default_avatar: boolean;
  avatar_url?: string;
  allowed_articles: number;
}

export type {
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from './database.types';
