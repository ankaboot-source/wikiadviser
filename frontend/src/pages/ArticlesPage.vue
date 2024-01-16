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
            icon="add"
            no-caps
            unelevated
            color="primary"
            label="Add a new article"
            @click="showNewArticleDialog = !showNewArticleDialog"
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
            <owned-article-item
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
                  @click="showNewArticleDialog = !showNewArticleDialog"
                >
                  add a new article
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
            icon="add"
            no-caps
            unelevated
            color="primary"
            label="Add a new article"
            @click="showNewArticleDialog = !showNewArticleDialog"
          />
        </q-card-section>
      </q-card>
    </div>
  </div>
  <q-dialog v-model="showNewArticleDialog">
    <add-article-card />
  </q-dialog>
</template>
<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue';
import OwnedArticleItem from 'src/components/OwnedArticleItem.vue';
import AddArticleCard from 'src/components/AddArticleCard/AddArticleCard.vue';
import { Article } from 'src/types';
import supabase from 'src/api/supabase';
import { useArticlesStore } from 'src/stores/useArticlesStore';

const articlesStore = useArticlesStore();

const term = ref('');
const loading = ref(true);
const showNewArticleDialog = ref(false);

const articles = computed(() => articlesStore.articles);

onBeforeMount(async () => {
  const { data } = await supabase.auth.getSession();
  await articlesStore.fetchArticles(data.session!.user.id);
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
