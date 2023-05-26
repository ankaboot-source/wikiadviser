import express from 'express';
import { load } from 'cheerio';
import cors from 'cors';
import logger from './logger';
import 'dotenv/config';
import setupNewArticle from './helpers/puppeteerHelper';
import getArticleWikiText from './helpers/wikipediaApiHelper';
import {
  insertArticle,
  getUsersWithPermissions,
  getArticles,
  createNewPermission,
  updatePermission
} from './helpers/supabaseHelper';

const app = express();
const port = 3000;
const data = { html: '' };

app.use(express.json({ limit: '300kb' }));
app.use(
  cors({
    origin: '*'
  })
);

// POST and GET the html diff of the local mediawiki
app.post('/api/html_diff', (req, res) => {
  const { html, permissionId } = req.body;
  logger.info('Data received:', { size: Buffer.byteLength(html, 'utf8') });
  // post permissionId
  logger.info(permissionId);
  let id = 0;
  let changeid = -1;
  const userId = 'User1';
  const date = new Date().toLocaleString('fr');

  const $ = load(html);

  // Go through elements that have the attribute data-diff-action
  $("[data-diff-action]:not([data-diff-action='none'])").each(
    (index, element) => {
      const $element = $(element);
      const diffAction = $element.data('diff-action');

      // Create the wrap element with the wanted metadata
      const $wrapElement = $('<span>');
      $wrapElement.attr('data-status', 'Awaiting Reviewer Approval');
      $wrapElement.attr('data-description', '');

      // Append a clone of the element to the wrap element
      $wrapElement.append($element.clone());

      let typeOfEdit: any = diffAction;

      // Wrapping related changes: Check if next node is an element (Not a text node) AND if the current element has "change-remove" diff
      const node: any = $element[0].next;
      if (!node?.data?.trim() && diffAction === 'change-remove') {
        const $nextElement = $element.next();
        // Check if the next element has "change-insert" diff action
        if ($nextElement.data('diff-action') === 'change-insert') {
          // Append the next element to the wrap element
          $wrapElement.append($nextElement.clone());

          // change-remove is always succeeded by a change-insert
          typeOfEdit = 'change';
          // Add description attribute
          const list: any[] = [];
          const listItems = $('.ve-ui-diffElement-sidebar >')
            .children()
            .eq((changeid += 1))
            .children()
            .children();
          listItems.each((i, elem) => {
            list.push($(elem).text());
          });
          // Delimiter <|> since it is unlikely to be present in any of the array elements
          $wrapElement.attr('data-description', list.join('<|>'));

          // Remove the last element
          $nextElement.remove();
        }
      }
      $wrapElement.attr('data-type-of-edit', typeOfEdit);
      $element.replaceWith($wrapElement);
    }
  );

  // Remove sidebar
  $('.ve-ui-diffElement-sidebar').remove();
  $('.ve-ui-diffElement-hasDescriptions').removeClass(
    've-ui-diffElement-hasDescriptions'
  );

  // Add more data
  $('[data-status]').each((index, element) => {
    const $element = $(element);
    $element.attr('data-id', `${(id += 1)}`);
    $element.attr('data-user', userId);
    $element.attr('data-date', date);
  });
  data.html = $.html();
  res.status(201).json({ message: 'Diff HTML created.' });
});

app.get('/api/html_diff', (_req, res) => {
  res.send(data.html);
});

// New Article
app.post('/api/article', async (req, res) => {
  try {
    const { title, userId, description } = req.body;
    logger.info(
      {
        title,
        userId,
        description
      },
      'New article title received'
    );
    // Insert into supabase: Articles, Permissions.
    const articleId = await insertArticle(title, userId, description);

    // The wikitext of the Wikipedia article
    const wpArticleWikitext = await getArticleWikiText(title);

    // The article in our Mediawiki
    const mwArticleUrl = `https://localhost/wiki/${title}?action=edit`;

    // Automate setting up the new article using puppeteer
    await setupNewArticle(mwArticleUrl, wpArticleWikitext);

    res
      .status(201)
      .json({ message: 'Creating new article succeeded.', articleId });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Creating new article failed.' });
  }
});

// Check Users with Permission of an articleId
app.get('/api/users', async (req, res) => {
  try {
    const articleId = req.query.articleId as string;
    const users = await getUsersWithPermissions(articleId);
    logger.info(
      {
        articleId,
        users
      },
      'Users with permissions'
    );
    res
      .status(200)
      .json({ message: 'Fetching users with permissions succeeded.', users });
  } catch (error: any) {
    logger.error(error.message);
    res
      .status(500)
      .json({ message: 'Fetching users with permissions failed.' });
  }
});

// Fetch Articles owned by a user
app.get('/api/articles', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const articles = await getArticles(userId);

    logger.info(
      {
        articles
      },
      'Get articles'
    );
    res
      .status(200)
      .json({ message: 'Checking article existence succeeded.', articles });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Checking article existence failed.' });
  }
});

// New permission
app.post('/api/permission', async (req, res) => {
  try {
    const { articleId, userId } = req.body;
    logger.info(
      {
        articleId,
        userId
      },
      'New Permission request'
    );
    // Insert a new permission request.
    await createNewPermission(articleId, userId);

    res
      .status(201)
      .json({ message: 'Creating new article succeeded.', articleId });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Creating new article failed.' });
  }
});

// Update permission
app.put('/api/permission', async (req, res) => {
  try {
    const { permissionId, role } = req.body;
    logger.info(
      {
        permissionId,
        role
      },
      'New Permission request'
    );
    // Insert a new permission request.
    await updatePermission(permissionId, role);

    res.status(201).json({ message: 'Updating permission article succeeded.' });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Creating new article failed.' });
  }
});

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
