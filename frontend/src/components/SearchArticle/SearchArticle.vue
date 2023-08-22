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
        placeholder="Search wikipedia"
        :loading="isSearching"
      >
        <template #append>
          <q-select
            v-model="languageModel"
            :option-label="(item) => item.value.toLocaleUpperCase()"
            :options="languageOptions"
            filled
            dense
            options-dense
          >
            <q-tooltip anchor="top middle" self="center middle">
              {{ languageModel?.label }}
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
    <q-scroll-area v-if="results" class="col-grow q-pt-none q-pb-lg">
      <search-list :results="results" :language="languageModel.value" />
    </q-scroll-area>
  </q-card>
</template>
<script setup lang="ts">
import SearchList from './SearchList.vue';
import { onBeforeMount, ref, watch } from 'vue';
import { SearchResult } from 'src/types';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';
import languageOptions from 'src/data/wikipediaLanguages.js';

const $q = useQuasar();
const term = ref('');
const title = ref('');
const isSearching = ref(false);
const results = ref<SearchResult[]>();

const defaultOption = languageOptions.find(
  (option) => window.navigator.language.split('-')[0] === option.lang
) || {
  label: 'English',
  value: 'en',
  description: 'English',
};
const languageModel = ref(defaultOption);

watch(term, async (term) => {
  if (!term.trim()) {
    results.value = [];
    return;
  }
  try {
    isSearching.value = true;
    const response = await api.get<{
      message: string;
      results: SearchResult[];
    }>('wikipedia/articles', {
      params: {
        term,
        language: languageModel.value.value,
      },
    });
    results.value = response.data.results;
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
