# Notes

## Known proxy limitations

- Exporting xml dump: missing `</base>` tag at line 5.
- Searching articles: missing image's src URL host.
  - Example: ~~missing URL proxy host~~/media/wikipedia/...

## Dev environment notes

- In `MyVisualEditor`
  - Our custom code is marked by `/* Custom WikiAdviser */` comments.

- Don't forget to copy and paste the email templates from `email-templates` to <b>supabase</b> templates.

- When deleting a user, their contributions are reassigned to `deleted-user@wikiadviser.io` and the articles they own are deleted.

## Important links and references

- [Mediawiki API documentation](https://www.mediawiki.org/wiki/API:Main_page)
