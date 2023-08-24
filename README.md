# Wikiadviser

## Pre-requisites

- You need to have a running mediawiki instance. We recommend to use the canasta distribution for ease of configuration. You can follow [these steps](https://canasta.wiki/setup/#create-new-wiki) for a fast setup. You also need to have `MyVisualEditor` in the extensions folder of mediawiki (Either through a volume mount or a copy).

- You need to have a supabase instance (In the cloud or locally hosted):
  - If using a cloud instance, you need to run the migrations manually.
  * If you're planning on using the local version, you can just run `npm i` in the root folder of this repository and then `npx supabase start`.

## Important changes to do with the mediawiki instance

- <details>
    <summary>Add these settings to add at the end of <code>LocalSettings.php</code></summary>
  
    ```
      $wgDefaultSkin = "vector-2022";
      
      wfLoadExtension( 'MyVisualEditor' );
      
      $wgDefaultRobotPolicy = 'noindex,nofollow'; // To avoid indexing the wiki by search engines.
      
      // Templates & Modules:
      // https://www.mediawiki.org/wiki/Manual:Importing_Wikipedia_infoboxes_tutorial
      // https://www.mediawiki.org/wiki/Help:Templates
      
      wfLoadExtension( 'ParserFunctions' );
      $wgPFEnableStringFunctions = true;
      
      wfLoadExtension( 'Scribunto' );
      $wgScribuntoDefaultEngine = 'luastandalone';
      
      wfLoadExtension( 'TemplateStyles' );
      wfLoadExtension( 'InputBox' );
      wfLoadExtension( 'TemplateData' );
      wfLoadExtension( 'JsonConfig' );
      $wgUseInstantCommons = true;
      
      wfLoadExtension( 'Cite' );
      wfLoadExtension( 'PageForms' );
  ```
  
  </details>
- Import CSS/JS from source wiki.
  - https://en.wikipedia.org/wiki/MediaWiki:Common.css
  - https://en.wikipedia.org/wiki/MediaWiki:Common.js
- Add robots.txt to and configure Caddy to use it:

```txt
User-agent: *
Disallow: /
```

```caddy
# Caddyfile
rewrite /robots.txt ./robots.txt # Disable search engine indexing
```

## Run using docker

- Make sure you have setup all the necessary pre-requisits.
- Copy `.env.example` to `.env` and update the missing env variables accordingly.
- Start wikiadviser services:

```sh
docker-compose -f docker-compose.prod.yml -f docker-compose.dev.yml up --build --force-recreate -d
```
