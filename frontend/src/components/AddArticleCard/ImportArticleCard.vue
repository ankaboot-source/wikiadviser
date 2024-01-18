<template>
  <q-card class="column fit" style="max-width: 60vw; max-height: 80vh" flat>
    <q-toolbar class="borders">
      <q-toolbar-title class="merriweather">
        Import an article from Wikipedia
      </q-toolbar-title>
      <q-btn v-close-popup flat round dense icon="close" size="sm" />
    </q-toolbar>
    <q-card-section>
      <q-input
        v-model="term"
        class="q-mt-sm q-mx-sm"
        bg-color="white"
        dense
        outlined
        debounce="700"
        placeholder="Search Wikipedia"
        :loading="isSearching"
      >
        <template #append>
          <q-select
            v-model="articleLanguage"
            :option-label="(item) => item.value.toLocaleUpperCase()"
            :options="wikiadviserLanguages"
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
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <q-icon name="search" />
        </template>
      </q-input>
    </q-card-section>

    <q-scroll-area
      v-if="searchResults?.length"
      class="col-grow q-pt-none q-pb-lg q-mx-sm"
    >
      <q-list class="q-mx-md">
        <search-item
          v-for="item in searchResults"
          :key="item.title"
          :item="item"
          :article-language="articleLanguage.value"
        />
      </q-list>
    </q-scroll-area>

    <q-card-section
      v-if="!searchResults?.length && term && !isSearching"
      padding
      class="q-mx-md q-my-xs"
    >
      <div class="text-center q-gutter-sm">
        <q-icon name="search_off" size="xl" />

        <div class="col">
          <div class="text-weight-bold">Could not find any results</div>
          <div class="q-pl-sm">Try another term</div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';
import { wikiadviserLanguages } from 'src/data/wikiadviserLanguages';
import { SearchResult } from 'src/types';
import { ref, watch } from 'vue';
import SearchItem from './SearchItem.vue';

const $q = useQuasar();
const term = ref('');
const isSearching = ref(false);
const searchResults = ref<SearchResult[]>();

const defaultArticleLanguage =
  wikiadviserLanguages.find(
    (option) => window.navigator.language.split('-')[0] === option.lang
  ) || wikiadviserLanguages[0];

const articleLanguage = ref(defaultArticleLanguage);

watch([term, articleLanguage], async ([term]) => {
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
</script>
