# Share Link Edge Functions

## Endpoint: share-links

### Method: POST

Creates a share link for a specified article, allowing users with "owner" permissions to share access.

```tsx
const response = await supabase.functions.invoke("share-links", {
  method: 'POST',
  body: {
    article_id: "<article_id>",
    expired_at: "<expiration_timestamp>",
  },
});
```

#### Response

- **Status 201:** Share link created successfully. Returns share link details.
- **Status 400:** Invalid request body.
- **Status 403:** Insufficient permissions.

### Method: GET

Verifies a share link based on the provided token and grants viewing permissions.

```tsx
const response = await supabase.functions.invoke("share-links/${token}", { method: 'GET'});
```

#### Response

- **Status 200:** Share link verified successfully. Returns share link details.
- **Status 403:** Share link expired.
- **Status 404:** Share link not found.
- **Status 402:** You have reached the maximum number of articles allowed.
