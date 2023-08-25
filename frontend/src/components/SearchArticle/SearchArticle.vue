<template>
  <q-card class="q-pa-sm bg-secondary column">
    <q-card-section>
      <div class="text-h5 merriweather">
        {{ title }}
      </div>
    </q-card-section>
    <q-card-section class="q-pb-none">
      <q-input
        v-model="term"
        bg-color="white"
        dense
        outlined
        style="width: 40vw"
        debounce="700"
        placeholder="Search Wikipedia"
        :loading="isSearching"
      >
        <template #append>
          <q-select
            v-model="articleLanguage"
            :option-label="(item) => item.value.toLocaleUpperCase()"
            :options="wikipediaLanguages"
            filled
            dense
            options-dense
          >
            <q-tooltip anchor="top middle" self="center middle">
              {{ articleLanguage?.label }}
            </q-tooltip>
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>
                    {{ scope.opt.description }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <q-icon name="search" />
        </template>
      </q-input>
    </q-card-section>
    <q-scroll-area v-if="searchResults" class="col-grow q-pt-none q-pb-lg">
      <search-list
        :search-results="searchResults"
        :article-language="articleLanguage.value"
      />
    </q-scroll-area>
  </q-card>
</template>
<script setup lang="ts">
import SearchList from './SearchList.vue';
import { onBeforeMount, ref, watch } from 'vue';
import { SearchResult } from 'src/types';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';
import wikipediaLanguages from 'src/data/wikipediaLanguages';

const $q = useQuasar();
const term = ref('');
const title = ref('');
const isSearching = ref(false);
const searchResults = ref<SearchResult[]>();

const defaultArticleLanguage = wikipediaLanguages.find(
  (option) => window.navigator.language.split('-')[0] === option.lang
) || {
  label: 'English',
  value: 'en',
  description: 'English',
};
const articleLanguage = ref(defaultArticleLanguage);

watch(term, async (term) => {
  if (!term.trim()) {
    searchResults.value = [];
    return;
  }
  try {
    isSearching.value = true;
    const response = await api.get<{
      message: string;
      searchResults: SearchResult[];
    }>('wikipedia/articles', {
      params: {
        term,
        language: articleLanguage.value.value,
      },
    });
    searchResults.value = response.data.searchResults;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      $q.notify({
        message: error.message,
        color: 'negative',
      });
    } else {
      console.error(error);
      $q.notify({
        message: 'Whoops, something went wrong while searching for articles',
        color: 'negative',
      });
    }
  } finally {
    isSearching.value = false;
  }
});

onBeforeMount(() => {
  title.value = $q.localStorage.getItem('articles')
    ? 'Edit a new article'
    : 'Edit your first article';
});
</script>
