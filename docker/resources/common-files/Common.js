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
mw.loader.using(["mediawiki.util"], function () {
  mw.hook("wikipage.diff").add(function ($diff) {
    // Has param "wikiadviser"
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has("wikiadviser")) return;

    elementReady(".ve-init-mw-diffPage-diff").then(function (diffEl) {
      const diffHtml = diffEl.outerHTML;
      const articleId = mw.config.get("wgPageName");
      if (isIframe) {
        window.parent.postMessage(
          {
            type: "diff-change",
            articleId: articleId,
            diffHtml: diffHtml,
          },
          "*"
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
      subtree: true,
    });
  });
}

// Listen for messages from parent (wikiadviser)
window.addEventListener("message", function (event) {
  if (event.data && event.data.type === "wikiadviser") {
    console.log("Received Wikiadviser event:", event.data);
    if (event.data.data === "diff") {
      mw.wikiadviser
        .getDiffUrl(event.data.articleId)
        .then(function (diffUrl) {
          console.log("Redirecting to diff:", diffUrl);
          window.location.replace(diffUrl);
        })
        .catch(function (error) {
          console.error("Failed to redirect to diff:", error);
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
  getDiffUrl: function (articleId) {
    const self = this;
    const mediawikiBaseURL =
      mw.config.get("wgServer") + mw.config.get("wgScriptPath");

    return Promise.all([
      self.getRevisionData(articleId, "newer"),
      self.getRevisionData(articleId, "older"),
    ]).then(function (results) {
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
  getRevisionData: function (articleId, sort) {
    const api = new mw.Api();
    return api
      .get({
        action: "query",
        prop: "revisions",
        titles: articleId,
        rvlimit: 1,
        rvdir: sort,
        formatversion: 2,
      })
      .then(function (data) {
        return data.query.pages[0].revisions[0];
      });
  },
};

mw.hook("ve.activationStart").add(function () {
  try {
    // Make inner page full width and hide left bar (TOC)
    var elements = document.querySelectorAll(
      ".mw-page-container-inner, .mw-body"
    );
    for (var i = 0; i < elements.length; i++) {
      elements[i].removeAttribute("class");
    }
  } catch (error) {
    console.error(
      "An error occurred while trying to hide non-editor distractions",
      error.message
    );
  }
});

// On "Save Changes", go to diffUrl
mw.hook("ve.activationComplete").add(function () {
  const originalSaveComplete = ve.init.mw.ArticleTarget.prototype.saveComplete;
  ve.init.mw.ArticleTarget.prototype.saveComplete = function (data) {
    originalSaveComplete.apply(this, arguments);

    const articleId = this.getPageName();
    window.parent.postMessage(
      {
        type: "saved-changes",
        articleId: articleId,
      },
      "*"
    );
    mw.wikiadviser
      .getDiffUrl(articleId)
      .then(function (diffUrl) {
        console.log("Redirecting to diff:", diffUrl);
        window.location.replace(diffUrl);
      })
      .catch(function (error) {
        console.error("Failed to redirect to diff:", error);
      });
  };
});

// Source Editor Save Handling
$(function() {
  if (!isIframe) return;
  
  const wgAction = mw.config.get('wgAction');
  
  if (wgAction === 'edit') {
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
