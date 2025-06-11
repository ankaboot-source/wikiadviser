# Wikiadviser

## Pre-requisites

### Setup MediaWiki

- <details>
  <summary>First of all, you need to have a running MediaWiki instance...</summary>
   
  ## How to install?
	
  - After a lot of work and tests, we made installing MediaWiki as simple as running a single bash [script](https://github.com/ankaboot-source/wikiadviser/blob/main/mediawiki-setup/mediawiki-setup.sh), all you need to do is :
  
    	1. git clone https://github.com/ankaboot-source/wikiadviser.git
    	2. cd wikiadviser/mediawiki-setup
        3. tmux new -s mediawiki (it is recommended to run the script in an unbreakable session, as the script take a while to finish we don't want your terminal session to crush in the middle of the setup)
    	4. bash mediawiki-setup.sh
        5. tmux attach -t mediawiki (if you got out of the session and want to get back)
    
  - **Note!** Currently the script is targeted to Debian based systems.

  ## How it works?
  ### Script overview :
  Our Bash script is designed to install or upgrade a multilingual MediaWiki project (default: en, fr) with a ready to go database dumps, extension support, and Apache/PHP/MariaDB setup.
  
  During the script run, a user interaction is required (you will be asked to enter the database name, user and password, will be used to create the database for each instance and setup Localsettings.php)
  
  ### Key features:
  - --upgrade: Used to upgrade MediaWiki, it creates database dump, core code backup, fetch latest MediaWiki version, and restores configs. (dont forget to upgrade the VisualEditor too using `prepare_VisualEditor_upgrade.sh`)

  - Default (no flag): triggers a fresh install, including packages, MariaDB, Apache, PHP, MediaWiki, and loading SQL dumps.
 
  ### What it installs?

  - MediaWiki (latest from Wikipedia's Special:Version page) (Language-specific setups in /var/www/mediawiki/wiki/{lang})

  - Apache2 & PHP with required modules

  - MariaDB (v11.4)

  - Composer
 
  ### Ready to Go database

  - The Init dumps are necessary to avoid the manual MediaWiki setup where you have to generate manually a LocalSettings.php file. 
  - Instead we made two instances (fr, en), we went through the manual setup, then we exported the database dump of each instance which we will use with our ready to go [Localsetting.php file](https://github.com/ankaboot-source/wikiadviser/blob/main/mediawiki-setup/LocalSettings.php) for the automated setup.
  - The Init dump contain tables and data about MediaWiki including a pre-defined admin user and password, the admin credentials are as follow :
    - FR, EN instance:
       - User: Admin
       - Password: admin#2025
     
  - **YOU MUST UPDATE YOUR ADMIN CREDENTIALS ONCE YOU FINISH INSTALLING MEDIAWIKI! [GO HERE FOR FRENCH INSTANCE](http://localhost:8080/wiki/fr/index.php/Sp%C3%A9cial:ChangeCredentials/MediaWiki%5CAuth%5CPasswordAuthenticationRequest) [GO HERE FOR ENGLISH INSTANCE](http://localhost:8080/wiki/en/index.php?title=Special:ChangeCredentials/MediaWiki%5CAuth%5CPasswordAuthenticationRequest)**
 
  ### How to access your MediaWiki?

  - Apache is configured to serve MediaWiki instance locally on port 8080 (Update it accordingly).
  - You can access MediaWiki by going to http://localhost:8080/wiki/fr/index.php http://localhost:8080/wiki/en/index.php

  </details>
  

- Export/Import the CSS & JS from the source wiki depeding on language

  - https://(language).wikipedia.org/wiki/MediaWiki:Common.css

    - <details> <summary> Add CSS rules: </summary>

      ```css
      /* Hide "Notice" popup */
      .oo-ui-widget.oo-ui-widget-enabled.oo-ui-labelElement.oo-ui-floatableElement-floatable.oo-ui-popupWidget-anchored.oo-ui-popupWidget.oo-ui-popupTool-popup.oo-ui-popupWidget-anchored-top {
        display: none !important;
      }
      /* Hide "Notice" button in toolbar */
      .ve-ui-toolbar-group-notices {
        display: none !important;
      }
      /* Hide "Warning to log in" in edit source */
      .mw-message-box-warning.mw-anon-edit-warning.mw-message-box {
        display: none !important;
      }
      /* Hide "Search bar" in edit source */
      .vector-search-box-vue.vector-search-box-collapses.vector-search-box-show-thumbnail.vector-search-box-auto-expand-width.vector-search-box {
        display: none !important;
      }
      /* Hide footer-places */
      #footer-places {
        display: none !important;
      }
      /* Hide header */
      .mw-header {
        display: none !important;
      }
      /* Keep sticky header's title & TOC */
      .vector-sticky-header-end,
      .vector-sticky-header-start > :not(.vector-sticky-header-context-bar) {
        display: none !important;
      }
      .vector-sticky-header-context-bar {
        border-left: none !important;
      }
      /* Hide Menu */
      .vector-main-menu-landmark {
        display: none !important;
      }
      /* Hide right bar (Tools) */
      .vector-column-end {
        display: none !important;
      }
      /* Hide "Add Languages" button */
      #p-lang-btn {
        display: none !important;
      }
      /* Hide fullscreen button */
      #p-dock-bottom {
        display: none !important;
      }
      /* Hide save dialog's licence */
      .ve-ui-mwSaveDialog-foot {
        display: none !important;
      }
      /* Keep "Comment" Label */
      .oo-ui-tool-name-comment > a {
        padding-top: 11px !important;
      }
      .oo-ui-tool-name-comment > a > .oo-ui-tool-title {
        display: block !important;
        padding-bottom: 11px !important;
        padding-right: 11px !important;
      }
      /* Hide user guide & feedback in "?" */
      .oo-ui-tool-name-mwFeedbackDialog.oo-ui-tool-name-mwUserGuide {
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
      /* Hide toolbar */
      .vector-page-toolbar {
        display: none !important;
      }
      ```

      </details>

  - https://(language).wikipedia.org/wiki/MediaWiki:Common.js

    - <details> <summary> Add JS: right above the last <code>} );</code> </summary>

      ```js
      // Add a stylesheet rule when Iframe (Editor)
      const isIframe = window.location !== window.parent.location;
      var iframeCssRules = mw.util.addCSS(
        `/*  Hide Header when Iframe / Editor. */
        .vector-column-start,
        .vector-page-titlebar {
          display: none !important;
        }`
      );
      iframeCssRules.disabled = !isIframe;

      /**
      * Gets diffHtml
      */
      mw.loader.using(['mediawiki.util'], function () {
        mw.hook('wikipage.diff').add(function ($diff) {
          // Has param "wikiadviser"
          const urlParams = new URLSearchParams(window.location.search);
          if (!urlParams.has('wikiadviser')) return;

          elementReady('.ve-init-mw-diffPage-diff').then(function (diffEl) {
            const diffHtml = diffEl.outerHTML;
            const articleId = mw.config.get('wgPageName');
            if (isIframe){
              window.parent.postMessage(
                {
                  type: 'diff-change',
                  articleId: articleId,
                  diffHtml: diffHtml
                },
                '*'
              );
            }
          });
        });
      });

      /**
      * Waits for a selector to appear in document.documentElement,
      * resolving with the element once it's in the DOM.
      * Uses MutationObserver under the hood.
      *
      * @param {string} selector
      * @returns {Promise<Element>}
      */
      function elementReady(selector) {
        return new Promise(function (resolve) {
          var el = document.querySelector(selector);
          if (el) {
            resolve(el);
            return;
          }
          var observer = new MutationObserver(function (mutationRecords, obs) {
            var found = document.querySelector(selector);
            if (found) {
              obs.disconnect();
              resolve(found);
            }
          });
          // Watch for additions anywhere in the document
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true
          });
        });
      }

      // Listen for messages from parent (wikiadviser)
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'wikiadviser') {
          console.log('Received Wikiadviser event:', event.data);
          if (event.data.data === 'diff') {
            mw.wikiadviser.getDiffUrl(event.data.articleId)
                .then(function(diffUrl) {
                    console.log('Redirecting to diff:', diffUrl);
                    window.location.replace(diffUrl);
                })
                .catch(function(error) {
			            console.error('Failed to redirect to diff:', error);
                });
          }
        }
      });

      // Define wikiadviser utilities on mw object
      mw.wikiadviser = {
          /**
          * Get diff URL between oldest and newest revisions
          * @param {string} articleId Page title
          * @returns {Promise<string>} Promise resolving to diff URL
          */
          getDiffUrl: function(articleId) {
              const self = this;
              const mediawikiBaseURL = mw.config.get("wgServer") + mw.config.get("wgScriptPath");
              
              return Promise.all([
                  self.getRevisionData(articleId, 'newer'),
                  self.getRevisionData(articleId, 'older')
              ]).then(function(results) {
                  const originalRevid = results[0].revid;
                  const latestRevid = results[1].revid;
                  return `${mediawikiBaseURL}/index.php?title=${articleId}&diff=${latestRevid}&oldid=${originalRevid}&diffmode=visual&diffonly=1&wikiadviser`;
              });
          },

          /**
          * Fetch revision data from API
          * @param {string} articleId Page title
          * @param {string} sort 'newer' or 'older'
          * @returns {Promise<Object>} Promise resolving to revision data
          */
          getRevisionData: function(articleId, sort) {
              const api = new mw.Api();
              return api.get({
                  action: 'query',
                  prop: 'revisions',
                  titles: articleId,
                  rvlimit: 1,
                  rvdir: sort,
                  formatversion: 2
              }).then(function(data) {
                  return data.query.pages[0].revisions[0];
              });
          }
      };
      ```

      </details>

- Into your MediaWiki instance add `http://localhost:8080/wiki/(language)/index.php/MediaWiki`: Common.css and Common.js
- Create a Bot user on `http://localhost:8080/wiki/(language)/index.php/Special:BotPasswords`: Add it to [.env.example](https://github.com/ankaboot-source/wikiadviser/blob/main/.env.example)
- In some cases VisualEditor fails to open due to large article size, to fix that increase the `timeout` in the following file: `mediawiki/resources/src/mediawiki.api/index.js`
- Final step of setting up MediaWiki is to run the job queue separately for better performance using cron job (user `www-data`), [more informations](https://www.mediawiki.org/wiki/Manual:Job_queue#:~:text=touch%20uploaded%20files.-,Cron,-You%20could%20use)

### Citoid
To add the advanced reference button into VisualEditor toolbar you need to add the following configuration files from wikipedia into your 
  Mediawiki instance `http://localhost:8080/wiki/(language)/index.php/MediaWiki:Cite-tool-definition.json`, More configurations below:
  - Mediawiki:Cite-tool-definition.json, Mediawiki:Citoid-template-type-map.json, Mediawiki:Visualeditor-template-tools-definition.json, Mediawiki:Visualeditor-cite-tool-name-chapter

Templates `http://localhost:8080/wiki/(language)/index.php/Template:Cite_book`, More templates below:
  - Template:Cite_book, Template:Cite_web, Template:Cite_news, Template:Cite_journal

Each template has its own documentation template, make sure to import it as well, it is recommended to export templates by category (citoid category for example) and import them all at once. [More Informations](https://www.mediawiki.org/wiki/Citoid)

### Supabase

You need to have a supabase instance (locally hosted):

- To use the local version, you can just run `pnpm i` in the root folder of this repository and then `pnpx supabase start`.

- If you have MediaWiki installed locally and have enabled firewall, make sure to allow the MediaWiki port (Allows Supabase Edge Functions to access the local MediaWiki instance):
  ```sh
  sudo ufw allow 8080 # 8080 being the MediaWiki port
  ```

## Running the Project

Make sure you have setup all the necessary pre-requisits.

### Using Node

**In both `./wikiadviser/frontend` and `./wikiadviser/supabase/functions` directory**

- Copy `.env.example` to `.env` and update the missing variables accordingly.
- Install dependencies via` pnpm i`
- Run each of the projects via`npm run dev`

### Using Docker

- Copy `.env.example.docker` (in ./wikiadviser folder) to `.env` and update the missing variables accordingly.
- Start wikiadviser services:

```sh
docker compose -f docker-compose.dev.yml up --build --force-recreate -d
```
