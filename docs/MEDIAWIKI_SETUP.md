# Wikiadviser

## Pre-requisites

### Setup MediaWiki

- <details>
   <summary>You need to have a running mediawiki instance. Self hosting it on a server require some services to be installed as follow (We will be setting 2 environments: Dev and Demo).</summary>
   
    - Install Caddy
    - Install Apache2
    - Install PHP, PHP mmodule and additional PHP packages required by MediaWiki ```apt install php libapache2-mod-php php-mbstring php-mysql php-xml```
    - If you are willing to use local database, install one of these supported DataBase systems: `MariaDB`, `PostgreSQL`, `SQLite` or `MySQL`, it's recommended to use managed Database for better security and performance.
    - Don't forget to start all the services above!
    - Configure your databases (you need to create separate databases as many as your wiki instances): 
   
    - Login ```sudo mariadb -u root```: 
      
    ``` 
      CREATE DATABASE my_wiki;
      CREATE USER 'wikiuser'@'localhost' IDENTIFIED BY 'password';
      GRANT ALL PRIVILEGES ON my_wiki.* TO 'wikiuser'@'localhost' WITH GRANT OPTION;
    ```
   
    - Configure Apache2 to listen on port 8080 for demo instance, 8081 for dev instance by adding the following lines to ```/etc/apache2/ports.conf``` :

  ```
    Listen 127.0.0.1:8080
    Listen 127.0.0.1:8081
  ```

  - Next, create two folders wiki-dev and wiki-demo under `/var/www` and add new sites configuration file under `/etc/apache2/sites-available/wiki-dev.conf`

  ```
  <VirtualHost *:8081>
         ServerAdmin webmaster@localhost
         DocumentRoot /var/www/wiki-dev
               <Directory /var/www/wiki-dev>
                        Options FollowSymLinks
                        AllowOverride All
                        Require all granted
               </Directory>
               ErrorLog ${APACHE_LOG_DIR}/error.dev.log
         CustomLog ${APACHE_LOG_DIR}/access.dev.log combined
  </VirtualHost>
  ```

  - `/etc/apache2/sites-available/wiki-demo.conf`

  ```
  <VirtualHost *:8080>
         ServerAdmin webmaster@localhost
         DocumentRoot /var/www/wiki-demo
               <Directory /var/www/wiki-demo>
                        Options FollowSymLinks
                        AllowOverride All
                        Require all granted
               </Directory>
               ErrorLog ${APACHE_LOG_DIR}/error.demo.log
         CustomLog ${APACHE_LOG_DIR}/access.demo.log combined
  </VirtualHost>
  ```

  - Run the following commands: `a2ensite wiki-dev.conf` `a2ensite wiki-demo.conf`
  - Restart Apache2 service !
  - Install MediaWiki from the [official download page](https://www.mediawiki.org/wiki/Download)
  - Extract the file in the following paths `/var/www/wiki-dev` and `/var/www/wiki-demo`
  - Rename the mediawiki folder to `en` and `fr` inside both wiki-demo and wiki-dev (if you need another wiki with different language do the same previous steps within the same folders)
  - Setup Caddy by editing `/etc/caddy/Caddyfile`:

  ```
  https://wiki-dev.wikiadviser.io {
          log {
            output file /var/log/caddy/access-dev.log {
                roll_size 10MiB
                roll_keep 10
                roll_keep_for 24h
            }
          }
          rewrite /robots.txt ./robots.txt # Disable search engine indexing
          reverse_proxy localhost:8081
   }
   #### for Demo/Prod
   https://wiki-demo.wikiadviser.io {
          log {
            output file /var/log/caddy/access-demo.log {
                roll_size 10MiB
                roll_keep 10
                roll_keep_for 24h
            }
          }

  	   	  @publicip {
            not client_ip private_ranges
            not client_ip WIKI_ADVISER_BACKEND_IP
          }
          forward_auth @publicip https://api.wikiadviser.io {
            header_up Host {upstream_hostport}
            header_up X-Real-IP {remote_host}
            uri /authenticate
            copy_headers X-User X-Client-IP X-Forwarded-Uri
          }

          rewrite /robots.txt ./robots.txt # Disable search engine indexing
          reverse_proxy localhost:8080
  }

  ```

  - Add <code>robots.txt</code> to <code>/etc/caddy</code>, will be called in the above Caddyfile.

  ```
    User-agent: *
    Disallow: /
  ```

  - Retsart Caddy service !
  - Open your mediawiki url, first setup will generate you a LocalSettings.php file, add it to the root of your mediawiki installation directory.
  </details>

- You also need to have `MyVisualEditor` and other extensions such us `Wikibase` etc..., in the extensions folder of mediawiki (for example `/var/www/wiki-dev/en/extensions`), each extension has its official install documentation provided by mediawiki, please follow it to install your required extension.

- <details>
    <summary>Add these settings at the end of <code>LocalSettings.php</code> in the root folder of your mediawiki instance</summary>

  ```
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

  wfLoadExtension( 'WikibaseRepository', "$IP/extensions/Wikibase/extension-repo.json" );
  require_once "$IP/extensions/Wikibase/repo/ExampleSettings.php";

  wfLoadExtension( 'WikibaseClient', "$IP/extensions/Wikibase/extension-client.json" );
  require_once "$IP/extensions/Wikibase/client/ExampleSettings.php";

  $wgWBRepoSettings['allowEntityImport'] = true;

  $wgShowExceptionDetails = true;
  $wgExternalLinkTarget = '_blank';

  $wgRawHtml = true;
  ```

  - Rename the composer.local.json-sample file in the root of MediaWiki install directory (en/fr) to composer.local.json, [for more info check](https://www.mediawiki.org/wiki/Wikibase/Installation).
  - If composer.lock exists delete it and run `composer install --no-dev`
  - Finally, run the following maintenance scripts:

    ```
    php maintenance/run.php ./maintenance/update.php
    php maintenance/run.php ./extensions/Wikibase/lib/maintenance/populateSitesTable.php
    php maintenance/run.php ./extensions/Wikibase/repo/maintenance/rebuildItemsPerSite.php
    php maintenance/run.php ./maintenance/populateInterwiki.php
    ```

  </details>

- <details>
    <summary>Modify settings of <code>default.vcl</code></summary>

  ```
    .first_byte_timeout = 600s;
  ```

  </details>

- Export/Import the CSS & JS from the source wiki depeding on language

  - https://(language).wikipedia.org/wiki/MediaWiki:Common.css
    - Add CSS rules:
    ```css
    /* to hide the discussion tab */
    #ca-talk { display:none!important; }

    /* to hide the "View History" tab */
    #ca-history { display:none!important; }

    /* to hide the "Add languages" menu. */
    .vector-menu.vector-dropdown.vector-menu-dropdown.mw-portlet.mw-portlet-lang { display:none!important; }

    /* to hide "Notice" button */
    .oo-ui-widget.oo-ui-widget-enabled.oo-ui-iconElement.oo-ui-tool-with-icon.oo-ui-tool.oo-ui-tool-name-notices.oo-ui-popupTool.ve-ui-mwPopupTool { display:none!important; }

    /* to hide 'Notice" popup */
    .oo-ui-widget.oo-ui-widget-enabled.oo-ui-labelElement.oo-ui-floatableElement-floatable.oo-ui-popupWidget-anchored.oo-ui-popupWidget.oo-ui-popupTool-popup.oo-ui-popupWidget-anchored-top:nth-child(2) { display:none!important; }

    /* to hide "Read the user guide & Leave feedback about this software" list items */
    .oo-ui-widget.oo-ui-widget-enabled.oo-ui-buttonElement.oo-ui-buttonElement-frameless.oo-ui-iconElement.oo-ui-labelElement.oo-ui-buttonWidget:nth-child(1), .oo-ui-widget.oo-ui-widget-enabled.oo-ui-buttonElement.oo-ui-buttonElement-frameless.oo-ui-iconElement.oo-ui-labelElement.oo-ui-buttonWidget:nth-child(3) { display:none!important; }

    /* to hide "Warning to log in" in edit source */
    .mw-message-box-warning.mw-anon-edit-warning.mw-message-box { display:none!important; }

    /* to hide "Search bar" in edit source */
    .vector-search-box-vue.vector-search-box-collapses.vector-search-box-show-thumbnail.vector-search-box-auto-expand-width.vector-search-box { display:none!important; }

    /* to hide footer */
    .mw-footer-container { display:none!important; }
    ```

  - https://(language).wikipedia.org/wiki/MediaWiki:Common.js

  Into your MediaWiki instance `http://localhost/(language)/index.php/MediaWiki`: Common.css and Common.js

- Create a Bot user on `http://localhost/w/index.php/Special:BotPasswords`
- In some cases VisualEditor fails to open due to large article size, to fix that increase the `timeout` in the following file: `mediawiki/resources/src/mediawiki.api/index.js`

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

