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
          <q-badge
            text-color="light-blue-10"
            color="light-blue-1"
            class="q-mt-sm"
            :label="UserRole[article.role]"
          />
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
                    @click="removeArticle(article.article_id)"
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
import { Article, UserRole } from 'src/types';
import { deleteArticle, getArticles } from 'src/api/supabaseHelper';
import supabase from 'src/api/supabase';

defineProps<{
  article: Article;
}>();

const emit = defineEmits(['updateArticlesEmit']);

const $q = useQuasar();
const router = useRouter();
const deleteArticleDialog = ref(false);

function gotoArticle(articleId: string) {
  router.push({
    name: 'article',
    params: {
      articleId,
    },
  });
}
async function removeArticle(articleId: string) {
  $q.loading.show({
    backgroundColor: 'secondary',

    spinner: QSpinnerGrid,
    spinnerColor: 'primary',
    spinnerSize: 140,

    message: "<div class='text-h6'>Deleting article. Please wait...</div>",
    html: true,
    messageColor: 'black',
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
    const articles = await getArticles(data.session!.user.id);
    $q.localStorage.set('articles', JSON.stringify(articles));
    emit('updateArticlesEmit');
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
