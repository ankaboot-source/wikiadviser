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

- Copy this [folder](./docs/icons) into mediawiki's `(mediawiki root folder)/resources/assets` to set our icon in the mediawiki instance (Automated).

- Replace <code>LocalSettings.php</code> in the root folder of your mediawiki instance with [LocalSettings.php](./LocalSettings.php)

- <details>
    <summary>Modify settings of <code>default.vcl</code></summary>

  ```
    .first_byte_timeout = 600s;
  ```

  </details>

- Export/Import the CSS & JS from the source wiki depeding on language

  - https://(language).wikipedia.org/wiki/MediaWiki:Common.css

    - <details> <summary> Add CSS rules: </summary>

      ```css
      /* hide the discussion tab */
      #ca-talk {
        display: none !important;
      }
      /* hide the "View History" tab */
      #ca-history {
        display: none !important;
      }
      /* hide "Notice" popup */
      .oo-ui-widget.oo-ui-widget-enabled.oo-ui-labelElement.oo-ui-floatableElement-floatable.oo-ui-popupWidget-anchored.oo-ui-popupWidget.oo-ui-popupTool-popup.oo-ui-popupWidget-anchored-top {
        display: none !important;
      }
      /* hide "Notice" button in toolbar */
      .ve-ui-toolbar-group-notices {
        display: none !important;
      }
      /* hide "Warning to log in" in edit source */
      .mw-message-box-warning.mw-anon-edit-warning.mw-message-box {
        display: none !important;
      }
      /* hide "Search bar" in edit source */
      .vector-search-box-vue.vector-search-box-collapses.vector-search-box-show-thumbnail.vector-search-box-auto-expand-width.vector-search-box {
        display: none !important;
      }
      /* hide footer-places */
      #footer-places {
        display: none !important;
      }
      /* hide left side header */
      .vector-header-end {
        display: none !important;
      }
      /* hide Menu */
      .vector-main-menu-landmark {
        display: none !important;
      }
      /* hide right bar (Tools) */
      .vector-column-end {
        display: none !important;
      }
      /* hide "Add Languages" button */
      #p-lang-btn {
        display: none !important;
      }
      /* hide Watch star */
      .mw-watchlink.mw-list-item {
        display: none !important;
      }
      /* hide tools: special pages */
      #t-specialpages {
        display: none !important;
      }
      /* hide fullscreen button */
      #p-dock-bottom {
        display: none !important;
      }
      /* Hide save dialog's licence */
      .ve-ui-mwSaveDialog-foot {
        display: none !important;
      }
      /* Show "Comment" Label */
      a[title="Comment"] {
        padding-top: 11px !important;
      }
      a[title="Comment"] > .oo-ui-tool-title {
        display: block !important;
        padding-bottom: 11px !important;
        padding-right: 11px !important;
      }
      /* Hide Tools */
      .vector-page-tools-landmark {
        display: none !important;
      }
      /* Hide user guide & feedback in "?" */
      .oo-ui-tool-name-mwFeedbackDialog.oo-ui-tool-name-mwUserGuide {
        display: none !important;
      }
      /* Hide "Edit Source" until #552 is resolved */
      #ca-edit,
      .ve-ui-toolbar-group-editMode {
        display: none !important;
      }
      /* Hide some of "Help" elements */
      .oo-ui-tool-name-mwUserGuide,
      .oo-ui-tool-name-mwFeedbackDialog {
        display: none !important;
      }
      /* Hide Edit section that is next to each paragraph title */
      .mw-editsection {
        display: none !important;
      }
      /* Hide left-navigation like 'Article' & 'Talk' */
      [aria-label="Namespaces"] {
        display: none !important;
      }
      /* Hide Read/Edit toolbar (Show it when edit) */
      .vector-page-toolbar {
        display: none !important;
      }
      ```

      </details>

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
