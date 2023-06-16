export type User = {
  username: string;
  email: string;
  role: number;
  permissionId: string;
};

export type Change = {
  changeId: string;
  content?: string;
  status?: number;
  description?: string;
  type_of_edit?: number;
};
