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
            <div v-if="article.created_at" class="text-weight-light on-right">
              <span v-if="article.imported">Imported on</span>
              <span v-else>Created the</span>
              {{
                article.created_at.toLocaleString(userLocale, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: user12H,
                })
              }}
            </div>
          </div>
        </div>
        <div v-if="article.role === UserRole.Owner" class="col-auto">
          <q-btn
            round
            flat
            color="negative"
            dense
            icon="delete"
            @click.stop="deleteArticleDialog = true"
          >
            <q-tooltip>Delete article</q-tooltip>
            <q-dialog v-model="deleteArticleDialog">
              <q-card>
                <q-toolbar class="borders">
                  <q-toolbar-title class="merriweather">
                    Delete Article “{{ article.title }}”
                  </q-toolbar-title>
                  <q-btn
                    v-close-popup
                    flat
                    round
                    dense
                    icon="close"
                    size="sm"
                  />
                </q-toolbar>
                <q-card-section>
                  Are you sure you want to delete “
                  <span
                    class="ellipsis"
                    style="
                      max-width: -webkit-fill-available;
                      display: inline-block;
                    "
                    >{{ article.title }}</span
                  >
                  ” and permanently lose all of your changes?
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
          </q-btn>
        </div>
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { Article, UserRole, Profile } from 'src/types';
import { deleteArticle } from 'src/api/supabaseHelper';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { wikiadviserLanguages } from 'src/data/wikiadviserLanguages';
import { useUserStore } from 'src/stores/userStore';

const props = defineProps<{
  article: Article;
}>();

const $q = useQuasar();
const router = useRouter();
const deleteArticleDialog = ref(false);
const deletingArticle = ref(false);
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
</script>
