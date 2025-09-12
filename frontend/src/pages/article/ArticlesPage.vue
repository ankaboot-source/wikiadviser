<template>
  <div class="col q-panel q-py-lg">
    <div class="row justify-center">
      <q-card v-if="loading" class="q-pa-lg" flat style="width: 80vw">
        <!-- Loading state content -->
      </q-card>
      <q-card v-else class="q-pa-sm column" flat style="width: 80vw">
        <q-card-section v-if="articles?.length" class="row items-center">
          <div class="text-h5 merriweather">Articles</div>
          <q-space />
          <div
            class="q-gutter-sm"
            :class="{ row: $q.screen.gt.sm, column: $q.screen.lt.md }"

            :style="$q.screen.lt.md ? 'width: 100%' : ''"
          >
            <q-btn
              icon="note_add"
              no-caps
              outline
              unelevated
              color="primary"
              label="Create a new Article"
              :class="$q.screen.lt.md ? 'full-width' : ''"
              @click="showCreateArticleDialog = !showCreateArticleDialog"
            />
            <q-btn
              icon="cloud_download"
              no-caps
              unelevated
              color="primary"
              label="Import Article from Wikipedia"
              :class="$q.screen.lt.md ? 'full-width' : ''"
              @click="showImportArticleDialog = !showImportArticleDialog"
            />
          </div>
        </q-card-section>

        <q-card-section v-if="articles?.length">
          <q-input
            v-model="term"
            bg-color="white"
            dense
            outlined
            placeholder="Find your articles"
          >
            <template #append>
              <q-icon name="search" />
            </template>
          </q-input>
        </q-card-section>

        <q-scroll-area
          v-if="articlesFiltered?.length"
          class="col-grow q-pt-none q-pb-lg"
        >
          <q-list class="q-mx-md">
            <owned-article
              v-for="article in articlesFiltered"
              :key="article.article_id"
              :article="article"
            />
          </q-list>
        </q-scroll-area>
        <q-card-section
          v-if="!articlesFiltered?.length && articles?.length"
          padding
          class="q-mx-md q-my-xs"
        >
          <div class="text-center q-gutter-sm">
            <q-icon name="search_off" size="xl" />

            <div class="col">
              <div class="text-weight-bold">Could not find any results</div>
              <div class="q-pl-sm">
                Try another term or
                <span
                  style="color: #0645ad; cursor: pointer"
                  @click="showImportArticleDialog = !showImportArticleDialog"
                >
                  import a new article
                </span>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-section v-if="!articles?.length" class="text-center" padding>
          <q-img
            src="images/Empty_State_Image.svg"
            spinner-color="white"
            alt="Empty state image"
            height="17vh"
            fit="contain"
            class="q-mb-lg"
          />
          <div class="text-h6">There are currently no articles</div>
          <div class="text-body2 q-mt-md q-mb-lg">
            Add a new article to get started
          </div>
          <div
            class="q-gutter-sm"
            :class="{ row: $q.screen.gt.sm, column: $q.screen.lt.md }"

            :style="$q.screen.lt.md ? 'width: 100%' : ''"
          >
            <q-btn
              icon="note_add"
              no-caps
              outline
              unelevated
              color="primary"
              label="Create a new Article"
              :class="$q.screen.lt.md ? 'full-width self-center' : ''"
              @click="showCreateArticleDialog = !showCreateArticleDialog"
            />
            <q-btn
              icon="cloud_download"
              no-caps
              unelevated
              color="primary"
              label="Import Article from Wikipedia"
              :class="$q.screen.lt.md ? 'full-width self-center' : ''"
              @click="showImportArticleDialog = !showImportArticleDialog"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>

  <import-article v-model="showImportArticleDialog" />
  <create-article v-model="showCreateArticleDialog" />
</template>

<script setup lang="ts">
import CreateArticle from 'src/components/AddArticleCard/CreateArticleCard.vue';
import ImportArticle from 'src/components/AddArticleCard/ImportArticleCard.vue';
import OwnedArticle from 'src/components/AddArticleCard/OwnedArticleItem.vue';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';
import { Article, Profile } from 'src/types';
import { computed, onBeforeMount, ref } from 'vue';

const user = computed(() => useUserStore().user as Profile);
const articlesStore = useArticlesStore();
const userStore = useUserStore();
const term = ref('');
const loading = ref(true);
const showImportArticleDialog = ref(false);
const showCreateArticleDialog = ref(false);

const articles = computed(() => articlesStore.articles);

onBeforeMount(async () => {
  await userStore.fetchProfile();
  await articlesStore.fetchArticles(user.value.id);
  loading.value = false;
});

const articlesFiltered = computed(() => {
  const trimmedTerm = term.value.trim();
  if (!trimmedTerm) {
    return articles.value;
  } else {
    return articles.value?.filter((article: Article) =>
      article.title.toLowerCase().includes(trimmedTerm.toLowerCase()),
    );
  }
});
</script>
