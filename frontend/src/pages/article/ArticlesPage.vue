<template>
  <div class="col q-panel q-py-lg">
    <div class="row justify-center">
      <q-card v-if="loading" class="q-pa-lg" flat style="width: 80vw">
        <!-- Loading state content -->
      </q-card>
      <q-card v-else class="q-pa-sm column" flat style="width: 80vw">
        <q-card-section v-if="articles?.length" class="row">
          <div class="text-h5 merriweather">Articles</div>
          <q-space />
          <q-btn
            icon="note_add"
            no-caps
            outline
            unelevated
            class="q-ml-sm"
            color="primary"
            label="Create a new Article"
            @click="showCreateArticleDialog = !showCreateArticleDialog"
          />
          <q-btn
            icon="cloud_download"
            no-caps
            unelevated
            class="q-ml-sm"
            color="primary"
            label="Import Article from Wikipedia"
            @click="showImportArticleDialog = !showImportArticleDialog"
          />
        </q-card-section>

        <q-card-section>
          <q-input
            v-if="articles?.length"
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
          <q-btn
            icon="note_add"
            no-caps
            outline
            unelevated
            class="q-my-sm"
            color="primary"
            label="Create a new Article"
            @click="showCreateArticleDialog = !showCreateArticleDialog"
          />
          <br />
          <q-btn
            icon="cloud_download"
            no-caps
            unelevated
            class="q-my-sm"
            color="primary"
            label="Import Article from Wikipedia"
            @click="showImportArticleDialog = !showImportArticleDialog"
          />
        </q-card-section>
      </q-card>
    </div>
  </div>
  <template v-if="reachedLimits">
    <upgrade-account v-model="showImportArticleDialog" />
    <upgrade-account v-model="showCreateArticleDialog" />
  </template>
  <template v-else>
    <import-article v-model="showImportArticleDialog" />
    <create-article v-model="showCreateArticleDialog" />
  </template>
</template>
<script setup lang="ts">
import UpgradeAccount from 'src/components/Subscription/UpgradeAccountDialoge.vue';
import OwnedArticle from 'src/components/AddArticleCard/OwnedArticleItem.vue';
import ImportArticle from 'src/components/AddArticleCard/ImportArticleCard.vue';
import CreateArticle from 'src/components/AddArticleCard/CreateArticleCard.vue';
import { Article } from 'src/types';
import { computed, onBeforeMount, ref } from 'vue';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';

const { session, user } = useUserStore();
const articlesStore = useArticlesStore();

const term = ref('');
const loading = ref(true);
const showImportArticleDialog = ref(false);
const showCreateArticleDialog = ref(false);

const articles = computed(() => articlesStore.articles);

const reachedLimits = computed(
  () =>
    (!showImportArticleDialog.value || !showCreateArticleDialog.value) &&
    articlesStore.articles.length >= (user?.allowed_articles ?? 0),
);

onBeforeMount(async () => {
  await articlesStore.fetchArticles(session?.user.id as string);
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
