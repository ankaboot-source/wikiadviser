# Notes

## Known proxy limitations

- Exporting xml dump: missing `</base>` tag at line 5.
- Searching articles: missing image's src URL host.
  - Example: ~~missing URL proxy host~~/media/wikipedia/...

## Dev environment notes

- In `MyVisualEditor`
  - Our custom code is marked by `/* Custom WikiAdviser */` comments.
  - Change `const wikiadviserApiHost = "https://api.wikiadviser.io";` to your local wikiadviser Api Host (backend).
- In `./backend/.env` use the `service_role` key from <b>supabase</b> for `SUPABASE_SECRET_PROJECT_TOKEN`

- Don't forget to copy and paste the email templates from `email-templates` to <b>supabase</b> templates.

- Don't forget to create a user in supabase with email `contact@wikiadviser.io`.

## Important links and references

- [Mediawiki API documentation](https://www.mediawiki.org/wiki/API:Main_page)
