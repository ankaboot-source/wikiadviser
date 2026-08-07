import { Session } from '@supabase/supabase-js';

/**
 * Mock Supabase client used for UI verification (screenshots) when
 * `USE_MOCK_BACKEND=true`. Returns a dummy authenticated session plus dummy
 * article/change/profile data so the app renders its real pages without a
 * live Supabase backend. Write operations and realtime are no-ops.
 *
 * This is NOT a full Supabase implementation — it covers only the surface the
 * frontend actually calls. Keep the dummy data shapes in sync with the edge
 * functions they stand in for (see `supabase/functions/get/handlers/*`).
 */

const DUMMY_USER_ID = 'dummy-user-id';
const DUMMY_EMAIL = 'dummy@wikiadviser.io';

const dummySession: Session = {
  access_token: 'dummy-access-token',
  refresh_token: 'dummy-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: {
    id: DUMMY_USER_ID,
    email: DUMMY_EMAIL,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
};

const dummyProfile = {
  id: DUMMY_USER_ID,
  email: DUMMY_EMAIL,
  name: 'Dummy User',
  default_avatar: true,
  allowed_articles: 5,
  display_name: 'Dummy User',
  has_password: true,
  email_verified: true,
  has_email_provider: false,
};

// Shape mirrors the `get/articles` edge function response.
const dummyArticles = [
  {
    id: 'permission-1',
    article_id: 'Sample_Article',
    role: 'editor',
    articles: {
      title: 'Sample Article',
      description: 'A sample article used for UI verification.',
      created_at: '2024-01-01T00:00:00Z',
      language: 'en',
      web_publication: false,
      imported: false,
      pending_diff: true,
      changes: [
        {
          created_at: '2024-01-02T00:00:00Z',
          profiles_view: { display_name: 'Dummy User', email: DUMMY_EMAIL },
        },
      ],
    },
  },
  {
    id: 'permission-2',
    article_id: 'Second_Article',
    role: 'viewer',
    articles: {
      title: 'Second Article',
      description: 'Another sample article for UI verification.',
      created_at: '2024-01-03T00:00:00Z',
      language: 'en',
      web_publication: true,
      imported: false,
      pending_diff: false,
      changes: [
        {
          created_at: '2024-01-04T00:00:00Z',
          profiles_view: { display_name: 'Dummy User', email: DUMMY_EMAIL },
        },
      ],
    },
  },
];

// Shape mirrors the `get/changes` edge function response.
const dummyChanges = [
  {
    id: 'change-1',
    content:
      '<p data-diff-action="add">This is a newly added paragraph rendered for UI verification.</p>',
    created_at: '2024-01-02T00:00:00Z',
    description: null,
    status: 0,
    type_of_edit: 'add',
    index: 0,
    article_id: 'Sample_Article',
    contributor_id: DUMMY_USER_ID,
    revision_id: 'revision-1',
    archived: false,
    hidden: false,
    user: {
      id: DUMMY_USER_ID,
      email: DUMMY_EMAIL,
      avatar_url: null,
      display_name: 'Dummy User',
    },
    comments: [],
    revision: { id: 'revision-1', summary: 'Initial revision', revid: 123 },
  },
];

// Article HTML returned by `from('articles').select('current_html_content')`.
// Elements with `data-id` are annotated by `parseArticleHtml` using the
// changes list, so the diff renders on the article page.
const dummyArticleHtml = `
<h1>Sample Article</h1>
<p data-id="change-1">This is a newly added paragraph for the article.</p>
<p>This is existing article content that stays unchanged.</p>
`;

// Minimal chainable query builder covering the `.from()` usage in the app.
function createMockQueryBuilder(table: string) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    match: () => builder,
    order: () => builder,
    limit: () => builder,
    single: async () => {
      if (table === 'changes') return { data: dummyChanges[0], error: null };
      if (table === 'articles')
        return {
          data: { current_html_content: dummyArticleHtml },
          error: null,
        };
      return { data: null, error: null };
    },
    update: async () => ({ data: null, error: null }),
    insert: async () => ({ data: null, error: null }),
    delete: async () => ({ data: null, error: null }),
  };
  return builder;
}

export function createMockSupabaseClient() {
  return {
    auth: {
      getSession: async () => ({
        data: { session: dummySession },
        error: null,
      }),
      getUser: async () => ({ data: { user: dummySession.user }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
        error: null,
      }),
      updateUser: async () => ({
        data: { user: dummySession.user },
        error: null,
      }),
      verifyOtp: async () => ({ data: { session: dummySession }, error: null }),
      signInAnonymously: async () => ({
        data: { session: dummySession },
        error: null,
      }),
    },
    functions: {
      invoke: async (name: string) => {
        switch (name) {
          case 'get/articles':
            return { data: dummyArticles, error: null };
          case 'get/changes':
            return {
              data: { changes: dummyChanges, revisionComments: [] },
              error: null,
            };
          case 'get/profile':
            return { data: { profile: dummyProfile }, error: null };
          case 'get/users':
            return { data: [], error: null };
          default:
            return { data: null, error: null };
        }
      },
    },
    rpc: async (name: string) => {
      if (name === 'is_article_exists') return { data: true, error: null };
      return { data: null, error: null };
    },
    from: (table: string) => createMockQueryBuilder(table),
    channel: () => {
      const channel = {
        on: () => channel,
        subscribe: () => ({ unsubscribe: () => {} }),
      };
      return channel;
    },
  };
}
