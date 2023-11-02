# Wikiadviser

## Pre-requisites

### Setup MediaWiki / Canasta

- You need to have a running mediawiki instance. We recommend to use the canasta distribution for ease of configuration. You can follow [these steps](https://canasta.wiki/setup/#create-new-wiki) for a fast setup.

- You also need to have `MyVisualEditor` in the extensions folder of mediawiki (Either through a volume mount or a copy).

- <details>
    <summary>Add these settings at the end of <code>LocalSettings.php</code></summary>

  ```php
    $wgDefaultSkin = "vector-2022";

    wfLoadExtension( 'MyVisualEditor' );

    $wgDefaultRobotPolicy = 'noindex,nofollow'; // To avoid indexing the wiki by search engines.

    wfLoadExtension( 'UniversalLanguageSelector' );

    /* Templates & Modules */
    // https://www.mediawiki.org/wiki/Manual:Importing_Wikipedia_infoboxes_tutorial
    // https://www.mediawiki.org/wiki/Help:Templates

    wfLoadExtension( 'ParserFunctions' );
    $wgPFEnableStringFunctions = true;

    wfLoadExtension( 'Scribunto' );
    $wgScribuntoDefaultEngine = 'luastandalone';
    $wgScribuntoEngineConf['luastandalone']['cpuLimit'] = 60; // 1 minute
    $wgScribuntoEngineConf['luastandalone']['memoryLimit'] = 838860800; // 800M
    $wgMemoryLimit = '800M';
    $wgMaxShellFileSize = 838860800; // 800M
    $wgMaxShellTime = 10 * 60 * 1000; // 10 minutes

    wfLoadExtension( 'TemplateStyles' );
    wfLoadExtension( 'InputBox' );
    wfLoadExtension( 'TemplateData' );
    wfLoadExtension( 'SyntaxHighlight_GeSHi' );

    $wgUseInstantCommons = true;

    wfLoadExtension( 'Cite' );
    wfLoadExtension( 'PageForms' );

    /* Mediawiki Performance tuning */
    // https://www.mediawiki.org/wiki/Manual:Performance_tuning
    // https://www.mediawiki.org/wiki/User:Ilmari_Karonen/Performance_tuning

    // Cache & Lifetime (2 years)
    $wgMainCacheType = CACHE_ACCEL;
    $wgMessageCacheType = CACHE_ACCEL;
    $wgParserCacheType = CACHE_DB;

    $wgParserCacheExpireTime = 63072000;
    $wgRevisionCacheExpiry = 63072000;
    $wgResourceLoaderMaxage = [
      'versioned' => 63072000,
      'unversioned' => 63072000
    ];
  ```

  </details>

- <details>
    <summary>Modify settings of <code>default.vcl</code></summary>

  ```
    .first_byte_timeout = 600s;
  ```

  </details>

- Export/Import the CSS & JS from the source wiki

  - https://en.wikipedia.org/wiki/MediaWiki:Common.css
  - https://en.wikipedia.org/wiki/MediaWiki:Common.js

  Into your MediaWiki instance http://localhost/wiki/MediaWiki: Common.css and Common.js

- Create a Bot user on `http://localhost/wiki/Special:BotPasswords`

```caddy
# Caddyfile
{$MW_SITE_FQDN} {
    log {
          output file /var/log/caddy/access.log {
              roll_size 10MiB
              roll_keep 10
              roll_keep_for 24h
          }
    }

    forward_auth https://api.wikiadviser.io {
        header_up Host {upstream_hostport}
        header_up X-Real-IP {remote_host}
        uri /authenticate
        copy_headers X-User X-Client-IP X-Forwarded-Uri
    }

    rewrite /robots.txt ./robots.txt # Disable search engine indexing
    reverse_proxy varnish:80
}
```

```txt
User-agent: *
Disallow: /
```

```caddy
# Caddyfile
rewrite /robots.txt ./robots.txt # Disable search engine indexing
```

### Supabase

You need to have a supabase instance (In the cloud or locally hosted):

- If using a cloud instance, you need to run the migrations manually.

* If you're planning on using the local version, you can just run `npm i` in the root folder of this repository and then `npx supabase start`.

## Running the Project

Make sure you have setup all the necessary pre-requisits.

### Using Node

<b>
In both `/frontend` and `/backend` directory
</b>

- Copy `.env.example` to `.env` and update the missing variables accordingly.
- Install dependencies via` npm i`
- Run each of the projects via`npm run dev`

### Using Docker

- Copy `.env.example` to `.env` and update the missing variables accordingly.
- Start wikiadviser services:

```sh
docker-compose -f docker-compose.prod.yml -f docker-compose.dev.yml up --build --force-recreate -d
```

## Known proxy limitations

- Exporting xml dump: missing `</base>` tag at line 5.
- Searching articles: missing image's src URL host.
  - Example: ~~missing URL proxy host~~/media/wikipedia/...

## Dev environment notes

- In `MyVisualEditor`
  - Our custom code is marked by `/* Custom WikiAdviser */` comments.
  - Change `const wikiadviserApiHost = "https://api.wikiadviser.io";` to your local wikiadviser Api Host (backend).
- In `./backend/.env` use the `service_role` key from <b>supabase</b> for `SUPABASE_SECRET_PROJECT_TOKEN`

## Important links and references

- [Canasta official documentation](https://canasta.wiki/)
- [Mediawiki API documentation](https://www.mediawiki.org/wiki/API:Main_page)
