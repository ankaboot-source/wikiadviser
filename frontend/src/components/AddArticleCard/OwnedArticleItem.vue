<template>
  <q-item
    class="q-pa-sm q-mb-sm borders rounded-borders text-dark"
    clickable
    @click="gotoArticle(article.article_id)"
  >
    <q-item-section>
      <div class="row items-center q-gutter-sm">
        <div class="col q-pl-sm" style="width: 50vw">
          <div class="text-weight-bold ellipsis">
            <q-icon
              v-if="props.article.web_publication"
              name="public"
              class="q-mr-xs"
            >
              <q-tooltip>This article is published on the Web</q-tooltip>
            </q-icon>
            {{ article.title }}
          </div>
          <div v-if="article.description" class="ellipsis">
            {{ article.description }}
          </div>
          <div class="row">
            <q-badge
              text-color="info"
              color="light-blue-1"
              class="q-mr-sm text-capitalize"
              :label="article.role"
            />
            <q-badge
              text-color="info"
              color="light-blue-1"
              class="text-capitalize"
              icon="translate"
            >
              <q-icon name="translate" class="q-mr-xs" />
              {{ language }}
            </q-badge>
            <div
              v-if="article.latest_change.created_at"
              :class="
                $q.screen.lt.sm
                  ? 'text-weight-light'
                  : 'text-weight-light on-right'
              "
            >
              Last edited by
              <span>
                {{ article.latest_change.name }}
              </span>
              on
              {{
                $q.screen.lt.md
                  ? shortDateString(article.latest_change.created_at)
                  : longDateString(article.latest_change.created_at)
              }}
            </div>
            <div
              v-else
              :class="
                $q.screen.lt.sm
                  ? 'text-weight-light'
                  : 'text-weight-light on-right'
              "
            >
              <span v-if="article.imported">Imported on</span>
              <span v-else>Created the</span>
              {{
                $q.screen.lt.md
                  ? shortDateString(article.created_at)
                  : longDateString(article.created_at)
              }}
            </div>
          </div>
        </div>

        <q-btn-dropdown
          round
          dense
          flat
          dropdown-icon="more_vert"
          no-icon-animation
          content-class="no-shadow"
          @click.stop
        >
          <q-list bordered separator>
            <q-item
              v-close-popup
              clickable
              @click="gotoArticle(article.article_id)"
            >
              <q-item-section>
                <q-item-label class="flex items-center">
                  <q-icon name="edit" class="q-mr-xs" size="xs" />
                  <span>Edit Article</span>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              v-close-popup
              clickable
              @click="
                articlesStore.viewArticleInNewTab(
                  article.language,
                  article.article_id,
                )
              "
            >
              <q-item-section>
                <q-item-label class="flex items-center">
                  <q-icon name="open_in_new" class="q-mr-xs" size="xs" />
                  <span>View Article</span>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              v-if="article.role != 'viewer'"
              v-close-popup
              clickable
              @click="shareDialog = !shareDialog"
            >
              <q-item-section>
                <q-item-label class="flex items-center">
                  <q-icon name="o_group" class="q-mr-xs" size="xs" />
                  <span>Share Article</span>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              v-if="article.role === 'owner'"
              v-close-popup
              clickable
              @click="deleteArticleDialog = true"
            >
              <q-item-section>
                <q-item-label class="flex items-center">
                  <q-icon name="delete" class="q-mr-xs" size="xs" />
                  <span>Delete Article</span>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-dialog v-model="shareDialog">
          <share-card :article="article" :role="article.role" />
        </q-dialog>

        <q-dialog v-model="deleteArticleDialog">
          <q-card>
            <q-toolbar class="borders">
              <q-toolbar-title class="merriweather">
                Delete Article “{{ article.title }}”
              </q-toolbar-title>
              <q-btn v-close-popup flat round dense icon="close" size="sm" />
            </q-toolbar>
            <q-card-section>
              Are you sure you want to delete this article and permanently lose
              all of your changes?
            </q-card-section>
            <q-card-actions class="borders">
              <q-space />
              <q-btn
                v-if="!deletingArticle"
                v-close-popup
                no-caps
                outline
                color="primary"
                label="Cancel"
              />
              <q-btn
                :v-close-popup="!deletingArticle"
                unelevated
                color="negative"
                icon="delete"
                no-caps
                label="Delete"
                :loading="deletingArticle"
                @click="removeArticle(article.article_id)"
              >
                <template #loading>
                  <q-spinner class="on-left" />
                  Delete
                </template>
              </q-btn>
            </q-card-actions>
          </q-card>
        </q-dialog>
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { deleteArticle } from 'src/api/supabaseHelper';
import ShareCard from 'src/components/Share/ShareCard.vue';
import { wikiadviserLanguages } from 'src/data/wikiadviserLanguages';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';
import { Article, Profile } from 'src/types';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{
  article: Article;
}>();

const $q = useQuasar();
const router = useRouter();
const deleteArticleDialog = ref(false);
const deletingArticle = ref(false);
const shareDialog = ref(false);
const articlesStore = useArticlesStore();

const userLocale = navigator.language || navigator.languages[0];

// Create an Intl.DateTimeFormat object for the user's locale
const dateTimeFormat = new Intl.DateTimeFormat(userLocale, { hour: 'numeric' });

// Check if the locale prefers 12-hour format based on hourCycle
const hourCycle = dateTimeFormat.resolvedOptions().hourCycle;
const user12H = hourCycle === 'h12' || hourCycle === 'h11';

function gotoArticle(articleId: string) {
  router.push({
    name: 'article',
    params: {
      articleId,
    },
  });
}

async function removeArticle(articleId: string) {
  deletingArticle.value = true;
  try {
    await deleteArticle(articleId);
    deletingArticle.value = false;
    $q.notify({
      message: 'Article deleted',
      icon: 'check',
      color: 'positive',
    });

    const user = useUserStore().user as Profile;

    await articlesStore.fetchArticles(user.id);
  } catch (error) {
    deletingArticle.value = false;
    deleteArticleDialog.value = false;
    throw error;
  }
}

const language = computed(
  () =>
    wikiadviserLanguages.find(
      (option) => props.article.language === option.lang,
    )?.label,
);

function shortDateString(date: Date) {
  return date.toLocaleString(userLocale, {
    year: 'numeric',
    month: '2-digit',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: user12H,
  });
}

function longDateString(date: Date) {
  return date.toLocaleString(userLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: user12H,
  });
}
</script>
