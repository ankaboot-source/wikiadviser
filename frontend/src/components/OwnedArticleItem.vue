<template>
  <q-item
    class="q-pa-sm q-mb-sm borders rounded-borders text-blue-grey-10"
    clickable
    @click="gotoArticle(article.article_id)"
  >
    <q-item-section>
      <div class="row items-center q-gutter-sm">
        <div class="col q-pl-sm">
          <div class="text-weight-bold">
            {{ article.title }}
          </div>
          <div v-if="article.description">
            {{ article.description }}
          </div>
          <div class="row">
            <q-badge
              text-color="light-blue-10"
              color="light-blue-1"
              class="q-mt-s"
              :label="UserRoleLabels.get(article.role)"
            />
            <div v-if="article.created_at" class="text-weight-light on-right">
              Imported on
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
                  Are you sure you want to delete “{{ article.title }}” and
                  permanently lose all of your changes?
                </q-card-section>
                <q-card-actions class="borders">
                  <q-space />
                  <q-btn
                    v-close-popup
                    no-caps
                    outline
                    color="primary"
                    label="Cancel"
                  />
                  <q-btn
                    v-close-popup
                    unelevated
                    color="negative"
                    no-caps
                    label="Delete"
                    @click="removeArticle(article.article_id, article.title)"
                  />
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { QSpinnerGrid, useQuasar } from 'quasar';
import { Article, UserRole, UserRoleLabels } from 'src/types';
import { deleteArticle } from 'src/api/supabaseHelper';
import supabase from 'src/api/supabase';
import { useArticlesStore } from 'src/stores/useArticlesStore';

defineProps<{
  article: Article;
}>();

const $q = useQuasar();
const router = useRouter();
const deleteArticleDialog = ref(false);
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
async function removeArticle(articleId: string, articleTitle: string) {
  $q.loading.show({
    boxClass: 'bg-white text-blue-grey-10 q-pa-xl',

    spinner: QSpinnerGrid,
    spinnerColor: 'primary',
    spinnerSize: 140,

    message: `
        <div class='text-h6'> Deleting “${articleTitle}”  </div></br>
        <div class='text-body1'>Please wait…</div>`,
    html: true,
  });
  try {
    await deleteArticle(articleId);
    $q.loading.hide();
    $q.notify({
      message: 'Article deleted.',
      icon: 'check',
      color: 'positive',
    });
    const { data } = await supabase.auth.getSession();
    await articlesStore.fetchArticles(data.session!.user.id);
  } catch (error) {
    $q.loading.hide();
    if (error instanceof Error) {
      console.error(error.message);
      $q.notify({
        message: error.message,
        color: 'negative',
      });
    } else {
      console.error(error);
      $q.notify({
        message: 'Whoops, something went wrong while deleting article',
        color: 'negative',
      });
    }
  }
}
</script>
