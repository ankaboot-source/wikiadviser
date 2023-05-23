export type ChangesItem = {
  id: number;
  content: string;
  status: 'Awaiting Reviewer Approval' | 'Edit Approved' | 'Edit Rejected';
  typeOfEdit: 'remove' | 'insert' | 'change';
  description?: string[];
  user: string;
  date: string;
};

export type SearchResult = {
  index: number;
  title: string;
  description?: string;
  thumbnail?: {
    source: string;
  };
};
