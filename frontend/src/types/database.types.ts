export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
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
      notifications: {
        Row: {
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          message: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message?: string;
          user_id?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
          role: Database['public']['Enums']['role'];
        };
        Insert: {
          article_id: string;
          expired_at?: string | null;
          id?: string;
          role?: Database['public']['Enums']['role'];
        };
        Update: {
          article_id?: string;
          expired_at?: string | null;
          id?: string;
          role?: Database['public']['Enums']['role'];
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
      [_ in never]: never;
    };
    Functions: {
      bytea_to_text: {
        Args: { data: string };
        Returns: string;
      };
      delete_user_and_anonymize_data: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      get_article_stakeholders: {
        Args: { p_article_id: string };
        Returns: {
          user_id: string;
          role: string;
        }[];
      };
      http: {
        Args: { request: Database['public']['CompositeTypes']['http_request'] };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_delete: {
        Args:
          | { uri: string }
          | { uri: string; content: string; content_type: string };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_get: {
        Args: { uri: string } | { uri: string; data: Json };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_head: {
        Args: { uri: string };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_header: {
        Args: { field: string; value: string };
        Returns: Database['public']['CompositeTypes']['http_header'];
      };
      http_list_curlopt: {
        Args: Record<PropertyKey, never>;
        Returns: {
          curlopt: string;
          value: string;
        }[];
      };
      http_patch: {
        Args: { uri: string; content: string; content_type: string };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_post: {
        Args:
          | { uri: string; content: string; content_type: string }
          | { uri: string; data: Json };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_put: {
        Args: { uri: string; content: string; content_type: string };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      http_set_curlopt: {
        Args: { curlopt: string; value: string };
        Returns: boolean;
      };
      is_article_exists: {
        Args: { article_id: string };
        Returns: string;
      };
      text_to_bytea: {
        Args: { data: string };
        Returns: string;
      };
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string };
        Returns: string;
      };
    };
    Enums: {
      role: 'owner' | 'editor' | 'reviewer' | 'viewer';
    };
    CompositeTypes: {
      http_header: {
        field: string | null;
        value: string | null;
      };
      http_request: {
        method: unknown | null;
        uri: string | null;
        headers: Database['public']['CompositeTypes']['http_header'][] | null;
        content_type: string | null;
        content: string | null;
      };
      http_response: {
        status: number | null;
        content_type: string | null;
        headers: Database['public']['CompositeTypes']['http_header'][] | null;
        content: string | null;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      role: ['owner', 'editor', 'reviewer', 'viewer'],
    },
  },
} as const;
