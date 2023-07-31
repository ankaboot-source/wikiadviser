<template>
  <q-card-section>
    <div class="text-h5 merriweather">Articles</div>
  </q-card-section>
  <q-card-section class="q-pb-none">
    <q-input
      v-model="term"
      bg-color="white"
      dense
      standout
      outlined
      style="width: 40vw"
      debounce="700"
      placeholder="Search wikipedia"
    >
      <template #append>
        <q-icon name="search" />
      </template>
    </q-input>
  </q-card-section>
  <q-card-section class="q-pt-none q-pb-lg">
    <q-list padding>
      <q-item
        v-for="article in articles"
        :key="article.article_id"
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
                  </q-card-actions> </q-card
              ></q-dialog>
            </div>
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </q-card-section>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { UserRole } from 'src/types';
import { deleteArticle, getArticles } from 'src/api/supabaseHelper';
import supabase from 'src/api/supabase';

const $q = useQuasar();
const router = useRouter();
const articles = ref(JSON.parse($q.localStorage.getItem('articles')!));
const term = ref('');
const deleteArticleDialog = ref(false);

async function removeArticle(articleId: string) {
  try {
    await deleteArticle(articleId);
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
    articles.value = JSON.parse($q.localStorage.getItem('articles')!);
  } catch (error: any) {
    $q.notify({
      message: error.message,
      color: 'negative',
    });
  }
}
</script>
