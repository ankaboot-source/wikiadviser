## Supabase Edge Functions: User Avatar Management

Supabase Edge Function to handle user avatars, by either assigning a new avatar or deleting an existing one. Various avatar generation methods are supported, such as Gravatar or generating avatars with custom background colors.

## Prerequisites

Before utilizing the Function, ensure the following:

- The environment variable `WIKIADVISER_BACKGROUND_COLORS` is set, containing a string of comma-separated hex colors.

## How to Interact:

Users can interact with the function through direct HTTP requests or by leveraging the Supabase JavaScript client.

#### Endpoint:

```bash
https://your-supabase-project.supabase.app/functions/v1/user-avatar
```

#### Headers:

- `Authorization`: Your Supabase JWT-token

#### Supported Actions:

- **POST**: Generate a new avatar to the user.
- **DELETE**: Sets user avatar to default.

### HTTP Request:

```bash
curl --request POST 'http://localhost:54321/functions/v1/user-avatar' \
  --header 'Authorization: Bearer SUPABASE_ANON_KEY OR USER_TOKEN' \
  --header 'Content-Type: application/json'
```

### Supabase JavaScript Client:

```js
// Generate a new avatar to the user.
await supabase.rpc('user-avatar', { method: 'POST' });

// Sets user avatar to default.
await supabase.rpc('user-avatar', { method: 'DELETE' });
```