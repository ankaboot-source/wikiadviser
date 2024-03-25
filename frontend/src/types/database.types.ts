export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      articles: {
        Row: {
          created_at: string | null;
          current_html_content: string | null;
          description: string | null;
          id: string;
          imported: boolean | null;
          language: string | null;
          title: string | null;
          web_publication: boolean;
        };
        Insert: {
          created_at?: string | null;
          current_html_content?: string | null;
          description?: string | null;
          id?: string;
          imported?: boolean | null;
          language?: string | null;
          title?: string | null;
          web_publication?: boolean;
        };
        Update: {
          created_at?: string | null;
          current_html_content?: string | null;
          description?: string | null;
          id?: string;
          imported?: boolean | null;
          language?: string | null;
          title?: string | null;
          web_publication?: boolean;
        };
        Relationships: [];
      };
      changes: {
        Row: {
          archived: boolean;
          article_id: string | null;
          content: string | null;
          contributor_id: string | null;
          created_at: string | null;
          description: string | null;
          hidden: boolean | null;
          id: string;
          index: number | null;
          revision_id: string | null;
          status: number | null;
          type_of_edit: number | null;
        };
        Insert: {
          archived?: boolean;
          article_id?: string | null;
          content?: string | null;
          contributor_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          hidden?: boolean | null;
          id?: string;
          index?: number | null;
          revision_id?: string | null;
          status?: number | null;
          type_of_edit?: number | null;
        };
        Update: {
          archived?: boolean;
          article_id?: string | null;
          content?: string | null;
          contributor_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          hidden?: boolean | null;
          id?: string;
          index?: number | null;
          revision_id?: string | null;
          status?: number | null;
          type_of_edit?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'changes_article_id_fkey';
            columns: ['article_id'];
            isOneToOne: false;
            referencedRelation: 'articles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'changes_contributor_id_fkey';
            columns: ['contributor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'changes_revision_id_fkey';
            columns: ['revision_id'];
            isOneToOne: false;
            referencedRelation: 'revisions';
            referencedColumns: ['id'];
          },
        ];
      };
      comments: {
        Row: {
          article_id: string;
          change_id: string | null;
          commenter_id: string | null;
          content: string | null;
          created_at: string | null;
          id: string;
        };
        Insert: {
          article_id: string;
          change_id?: string | null;
          commenter_id?: string | null;
          content?: string | null;
          created_at?: string | null;
          id?: string;
        };
        Update: {
          article_id?: string;
          change_id?: string | null;
          commenter_id?: string | null;
          content?: string | null;
          created_at?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_change_id_fkey';
            columns: ['change_id'];
            isOneToOne: false;
            referencedRelation: 'changes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_commenter_id_fkey';
            columns: ['commenter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_comments_article_id';
            columns: ['article_id'];
            isOneToOne: false;
            referencedRelation: 'articles';
            referencedColumns: ['id'];
          },
        ];
      };
      permissions: {
        Row: {
          article_id: string | null;
          created_at: string | null;
          id: string;
          role: Database['public']['Enums']['role'] | null;
          user_id: string | null;
        };
        Insert: {
          article_id?: string | null;
          created_at?: string | null;
          id?: string;
          role?: Database['public']['Enums']['role'] | null;
          user_id?: string | null;
        };
        Update: {
          article_id?: string | null;
          created_at?: string | null;
          id?: string;
          role?: Database['public']['Enums']['role'] | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'permissions_article_id_fkey';
            columns: ['article_id'];
            isOneToOne: false;
            referencedRelation: 'articles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'permissions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          allowed_articles: number;
          avatar_url: string | null;
          default_avatar: boolean | null;
          email: string;
          id: string;
        };
        Insert: {
          allowed_articles: number;
          avatar_url?: string | null;
          default_avatar?: boolean | null;
          email: string;
          id: string;
        };
        Update: {
          allowed_articles?: number;
          avatar_url?: string | null;
          default_avatar?: boolean | null;
          email?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      revisions: {
        Row: {
          article_id: string | null;
          created_at: string;
          id: string;
          revid: number;
          summary: string | null;
        };
        Insert: {
          article_id?: string | null;
          created_at?: string;
          id?: string;
          revid: number;
          summary?: string | null;
        };
        Update: {
          article_id?: string | null;
          created_at?: string;
          id?: string;
          revid?: number;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'revisions_article_id_fkey';
            columns: ['article_id'];
            isOneToOne: false;
            referencedRelation: 'articles';
            referencedColumns: ['id'];
          },
        ];
      };
      share_links: {
        Row: {
          article_id: string;
          expired_at: string | null;
          id: string;
        };
        Insert: {
          article_id: string;
          expired_at?: string | null;
          id?: string;
        };
        Update: {
          article_id?: string;
          expired_at?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'share_links_article_id_fkey';
            columns: ['article_id'];
            isOneToOne: false;
            referencedRelation: 'articles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      users: {
        Row: {
          aud: string | null;
          banned_until: string | null;
          confirmation_sent_at: string | null;
          confirmation_token: string | null;
          confirmed_at: string | null;
          created_at: string | null;
          deleted_at: string | null;
          email: string | null;
          email_change: string | null;
          email_change_confirm_status: number | null;
          email_change_sent_at: string | null;
          email_change_token_current: string | null;
          email_change_token_new: string | null;
          email_confirmed_at: string | null;
          encrypted_password: string | null;
          id: string | null;
          instance_id: string | null;
          invited_at: string | null;
          is_sso_user: boolean | null;
          is_super_admin: boolean | null;
          last_sign_in_at: string | null;
          phone: string | null;
          phone_change: string | null;
          phone_change_sent_at: string | null;
          phone_change_token: string | null;
          phone_confirmed_at: string | null;
          raw_app_meta_data: Json | null;
          raw_user_meta_data: Json | null;
          reauthentication_sent_at: string | null;
          reauthentication_token: string | null;
          recovery_sent_at: string | null;
          recovery_token: string | null;
          role: string | null;
          updated_at: string | null;
        };
        Insert: {
          aud?: string | null;
          banned_until?: string | null;
          confirmation_sent_at?: string | null;
          confirmation_token?: string | null;
          confirmed_at?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          email_change?: string | null;
          email_change_confirm_status?: number | null;
          email_change_sent_at?: string | null;
          email_change_token_current?: string | null;
          email_change_token_new?: string | null;
          email_confirmed_at?: string | null;
          encrypted_password?: string | null;
          id?: string | null;
          instance_id?: string | null;
          invited_at?: string | null;
          is_sso_user?: boolean | null;
          is_super_admin?: boolean | null;
          last_sign_in_at?: string | null;
          phone?: string | null;
          phone_change?: string | null;
          phone_change_sent_at?: string | null;
          phone_change_token?: string | null;
          phone_confirmed_at?: string | null;
          raw_app_meta_data?: Json | null;
          raw_user_meta_data?: Json | null;
          reauthentication_sent_at?: string | null;
          reauthentication_token?: string | null;
          recovery_sent_at?: string | null;
          recovery_token?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Update: {
          aud?: string | null;
          banned_until?: string | null;
          confirmation_sent_at?: string | null;
          confirmation_token?: string | null;
          confirmed_at?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          email_change?: string | null;
          email_change_confirm_status?: number | null;
          email_change_sent_at?: string | null;
          email_change_token_current?: string | null;
          email_change_token_new?: string | null;
          email_confirmed_at?: string | null;
          encrypted_password?: string | null;
          id?: string | null;
          instance_id?: string | null;
          invited_at?: string | null;
          is_sso_user?: boolean | null;
          is_super_admin?: boolean | null;
          last_sign_in_at?: string | null;
          phone?: string | null;
          phone_change?: string | null;
          phone_change_sent_at?: string | null;
          phone_change_token?: string | null;
          phone_confirmed_at?: string | null;
          raw_app_meta_data?: Json | null;
          raw_user_meta_data?: Json | null;
          reauthentication_sent_at?: string | null;
          reauthentication_token?: string | null;
          recovery_sent_at?: string | null;
          recovery_token?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      add_viewer_to_article:
        | {
            Args: {
              token: string;
            };
            Returns: string;
          }
        | {
            Args: {
              user_id: string;
              token: string;
            };
            Returns: string;
          };
      delete_user_and_anonymize_data: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      delete_user_and_keep_data: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      is_article_exists: {
        Args: {
          article_id: string;
        };
        Returns: string;
      };
      read_secret: {
        Args: {
          secret_name: string;
        };
        Returns: string;
      };
    };
    Enums: {
      role: 'owner' | 'editor' | 'reviewer' | 'viewer';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'] & Database['public']['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'] &
        Database['public']['Views'])
    ? (Database['public']['Tables'] &
        Database['public']['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database['public']['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof Database['public']['Enums']
    ? Database['public']['Enums'][PublicEnumNameOrOptions]
    : never;
