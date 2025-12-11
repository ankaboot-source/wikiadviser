/**
* Keep code in MediaWiki:Common.js to a minimum as it is unconditionally
* loaded for all users on every wiki page. If possible create a gadget that is
* enabled by default instead of adding it here (since gadgets are fully
* optimized ResourceLoader modules with possibility to add dependencies etc.)
*
* Since Common.js isn't a gadget, there is no place to declare its
* dependencies, so we have to lazy load them with mw.loader.using on demand and
* then execute the rest in the callback. In most cases these dependencies will
* be loaded (or loading) already and the callback will not be delayed. In case a
* dependency hasn't arrived yet it'll make sure those are loaded before this.
*/

/* global mw, $ */
/* jshint strict:false, browser:true */

mw.loader.using( [ 'mediawiki.util' ] ).done( function () {
  /* Begin of mw.loader.using callback */

  /**
  * Map addPortletLink to mw.util
  * @deprecated: Use mw.util.addPortletLink instead.
  */
  mw.log.deprecate( window, 'addPortletLink', mw.util.addPortletLink, 'Use mw.util.addPortletLink instead' );

  /**
  * Test if an element has a certain class
  * @deprecated:  Use $(element).hasClass() instead.
  */
  mw.log.deprecate( window, 'hasClass', function ( element, className ) {
    return $( element ).hasClass( className );
  }, 'Use jQuery.hasClass() instead' );

  /**
  * @source www.mediawiki.org/wiki/Snippets/Load_JS_and_CSS_by_URL
  * @rev 6
  */
  var extraCSS = mw.util.getParamValue( 'withCSS' ),
    extraJS = mw.util.getParamValue( 'withJS' );

  if ( extraCSS ) {
    if ( extraCSS.match( /^MediaWiki:[^&<>=%#]*\.css$/ ) ) {
      mw.loader.load( '/w/index.php?title=' + extraCSS + '&action=raw&ctype=text/css', 'text/css' );
    } else {
      mw.notify( 'Only pages from the MediaWiki namespace are allowed.', { title: 'Invalid withCSS value' } );
    }
  }

  if ( extraJS ) {
    if ( extraJS.match( /^MediaWiki:[^&<>=%#]*\.js$/ ) ) {
      mw.loader.load( '/w/index.php?title=' + extraJS + '&action=raw&ctype=text/javascript' );
    } else {
      mw.notify( 'Only pages from the MediaWiki namespace are allowed.', { title: 'Invalid withJS value' } );
    }
  }

  /**
  * WikiMiniAtlas
  *
  * Description: WikiMiniAtlas is a popup click and drag world map.
  *              This script causes all of our coordinate links to display the WikiMiniAtlas popup button.
  *              The script itself is located on the Meta-Wiki because it is used by many projects.
  *              See [[Meta:WikiMiniAtlas]] for more information.
  * Note - use of this service is recommended to be replaced with mw:Help:Extension:Kartographer
  */
  $( function () {
    var requireWikiminiatlas = $( 'a.external.text[href*="geohack"]' ).length || $( 'div.kmldata' ).length;
    if ( requireWikiminiatlas ) {
      mw.loader.load( '//meta.wikimedia.org/w/index.php?title=MediaWiki:Wikiminiatlas.js&action=raw&ctype=text/javascript' );
    }
  } );

  /**
  * Collapsible tables; reimplemented with mw-collapsible
  * Styling is also in place to avoid FOUC
  *
  * Allows tables to be collapsed, showing only the header. See [[Help:Collapsing]].
  * @version 3.0.0 (2018-05-20)
  * @source https://www.mediawiki.org/wiki/MediaWiki:Gadget-collapsibleTables.js
  * @author [[User:R. Koot]]
  * @author [[User:Krinkle]]
  * @author [[User:TheDJ]]
  * @deprecated Since MediaWiki 1.20: Use class="mw-collapsible" instead which
  * is supported in MediaWiki core. Shimmable since MediaWiki 1.32
  *
  * @param {jQuery} $content
  */
  function makeCollapsibleMwCollapsible( $content ) {
    var $tables = $content
      .find( 'table.collapsible:not(.mw-collapsible)' )
      .addClass( 'mw-collapsible' );

    $.each( $tables, function ( index, table ) {
      // mw.log.warn( 'This page is using the deprecated class collapsible. Please replace it with mw-collapsible.');
      if ( $( table ).hasClass( 'collapsed' ) ) {
        $( table ).addClass( 'mw-collapsed' );
        // mw.log.warn( 'This page is using the deprecated class collapsed. Please replace it with mw-collapsed.');
      }
    } );
    if ( $tables.length > 0 ) {
      mw.loader.using( 'jquery.makeCollapsible' ).then( function () {
        $tables.makeCollapsible();
      } );
    }
  }
  mw.hook( 'wikipage.content' ).add( makeCollapsibleMwCollapsible );

  /**
  * Add support to mw-collapsible for autocollapse, innercollapse and outercollapse
  *
  * Maintainers: TheDJ
  */
  function mwCollapsibleSetup( $collapsibleContent ) {
    var $element,
      $toggle,
      autoCollapseThreshold = 2;
    $.each( $collapsibleContent, function ( index, element ) {
      $element = $( element );
      if ( $element.hasClass( 'collapsible' ) ) {
        $element.find( 'tr:first > th:first' ).prepend( $element.find( 'tr:first > * > .mw-collapsible-toggle' ) );
      }
      if ( $collapsibleContent.length >= autoCollapseThreshold && $element.hasClass( 'autocollapse' ) ) {
        $element.data( 'mw-collapsible' ).collapse();
      } else if ( $element.hasClass( 'innercollapse' ) ) {
        if ( $element.parents( '.outercollapse' ).length > 0 ) {
          $element.data( 'mw-collapsible' ).collapse();
        }
      }
      // because of colored backgrounds, style the link in the text color
      // to ensure accessible contrast
      $toggle = $element.find( '.mw-collapsible-toggle' );
      if ( $toggle.length ) {
        // Make the toggle inherit text color (Updated for T333357 2023-04-29)
        if ( $toggle.parent()[ 0 ].style.color ) {
          $toggle.css( 'color', 'inherit' );
          $toggle.find( '.mw-collapsible-text' ).css( 'color', 'inherit' );
        }
      }
    } );
  }

  mw.hook( 'wikipage.collapsibleContent' ).add( mwCollapsibleSetup );

  /**
  * Magic editintros ****************************************************
  *
  * Description: Adds editintros on disambiguation pages and BLP pages.
  * Maintainers: [[User:RockMFR]]
  *
  * @param {string} name
  */
  function addEditIntro( name ) {
    $( '.mw-editsection, #ca-edit, #ca-ve-edit' ).find( 'a' ).each( function ( i, el ) {
      el.href = $( this ).attr( 'href' ) + '&editintro=' + name;
    } );
  }

  if ( mw.config.get( 'wgNamespaceNumber' ) === 0 ) {
    $( function () {
      if ( document.getElementById( 'disambigbox' ) ) {
        addEditIntro( 'Template:Disambig_editintro' );
      }
    } );

    $( function () {
      var cats = mw.config.get( 'wgCategories' );
      if ( !cats ) {
        return;
      }
      if ( $.inArray( 'Living people', cats ) !== -1 || $.inArray( 'Possibly living people', cats ) !== -1 ) {
        addEditIntro( 'Template:BLP_editintro' );
      }
    } );
  }
  /* End of mw.loader.using callback */

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

      mw.hook('ve.activationStart').add(function () {
        try {
          // Make inner page full width and hide left bar (TOC)
          var elements = document.querySelectorAll('.mw-page-container-inner, .mw-body');
          for (var i = 0; i < elements.length; i++) {
            elements[i].removeAttribute('class');
          }
        } catch (error) {
          console.error('An error occurred while trying to hide non-editor distractions', error.message);
        }
      });

      // On "Save Changes", go to diffUrl
      mw.hook('ve.activationComplete').add(function () {
        const originalSaveComplete =
          ve.init.mw.ArticleTarget.prototype.saveComplete;
        ve.init.mw.ArticleTarget.prototype.saveComplete = function (data) {
          originalSaveComplete.apply(this, arguments);

          const articleId = this.getPageName();
          window.parent.postMessage(
            {
              type: 'saved-changes',
              articleId: articleId,
            },
            '*'
          );
          mw.wikiadviser
            .getDiffUrl(articleId)
            .then(function (diffUrl) {
              console.log('Redirecting to diff:', diffUrl);
              window.location.replace(diffUrl);
            })
            .catch(function (error) {
              console.error('Failed to redirect to diff:', error);
            });
        };
      });
      
} );

// Source Editor Save Handling
$(function() {
  if (!isIframe) return;
  
  const wgAction = mw.config.get('wgAction');
  
  if (wgAction === 'edit' || wgAction === 'submit') {
    var editForm = document.getElementById('editform');
    if (editForm) {
      editForm.addEventListener('submit', function() {
        try {
          sessionStorage.setItem('wikiadviser_source_saved', 'true');
          sessionStorage.setItem('wikiadviser_article_id', mw.config.get('wgPageName'));
        } catch (error) {
          console.error('Failed to set session storage items:', error);
        }
      });
    }
  }
  
  if (wgAction === 'view') {
    try {
      var savedFlag = sessionStorage.getItem('wikiadviser_source_saved');
      var savedArticleId = sessionStorage.getItem('wikiadviser_article_id');
      
      if (savedFlag === 'true' && savedArticleId) {
        sessionStorage.removeItem('wikiadviser_source_saved');
        sessionStorage.removeItem('wikiadviser_article_id');
        
        if (isIframe) {
          window.parent.postMessage(
            {
              type: 'saved-changes',
              articleId: savedArticleId,
            },
            '*'
          );
        }
        mw.wikiadviser.getDiffUrl(savedArticleId).then(function(diffUrl) {
          window.location.replace(diffUrl);
        });
      }
    } catch (error) {
      console.error('Error handling source editor save redirection:', error);
    }
  }
});
/* DO NOT ADD CODE BELOW THIS LINE */
