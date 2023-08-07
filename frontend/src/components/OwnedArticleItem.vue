<template>
  <q-item
    class="app-search__result"
    clickable
    @click="
      router.push({
        name: 'article',
        params: {
          articleId: article.article_id,
        },
      })
    "
  >
    <q-item-section>
      <div class="app-search__result-title row items-center q-gutter-sm">
        <div class="col">
          <div class="doc-token">{{ article.title }}</div>
          <div v-if="article.description" class="q-pl-sm">
            {{ article.description }}
          </div>
          <q-badge
            text-color="light-blue-10"
            color="light-blue-1"
            class="q-ml-sm q-mt-sm"
            :label="UserRole[article.role]"
          />
        </div>
        <div v-if="article.role === UserRole.Owner" class="col-auto">
          <q-btn
            round
            flat
            size="sm"
            icon="delete"
            @click.stop="deleteArticleDialog = true"
          />
          <q-tooltip>Delete article</q-tooltip>
          <q-dialog v-model="deleteArticleDialog">
            <q-card>
              <q-toolbar class="bg-white borders">
                <q-toolbar-title class="merriweather"
                  >Delete Article '{{ article.title }}'
                </q-toolbar-title>
                <q-btn v-close-popup flat round dense icon="close" size="sm" />
              </q-toolbar>
              <q-card-section>
                Are you sure you want to delete the article '{{
                  article.title
                }}' ?
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
        </div>
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { QSpinnerGears, useQuasar } from 'quasar';
import { UserRole } from 'src/types';
import { deleteArticle, getArticles } from 'src/api/supabaseHelper';
import supabase from 'src/api/supabase';

defineProps<{
  article: any;
}>();
const emit = defineEmits(['updateArticlesEmit']);

const $q = useQuasar();
const router = useRouter();
const deleteArticleDialog = ref(false);

async function removeArticle(articleId: string) {
  const deletingNotif = $q.notify({
    message: 'Deleting article.',
    spinner: QSpinnerGears,
    timeout: 0,
  });
  try {
    await deleteArticle(articleId);
    deletingNotif();
    $q.notify({
      message: 'Article deleted.',
      icon: 'check',
      color: 'positive',
    });
    const { data } = await supabase.auth.getSession();
    $q.localStorage.set(
      'articles',
      JSON.stringify(await getArticles(data.session!.user.id))
    );
    emit('updateArticlesEmit');
  } catch (error: any) {
    deletingNotif();
    $q.notify({
      message: error.message,
      color: 'negative',
    });
  }
}
</script>
