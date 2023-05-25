<template>
  <q-card-section>
    <div class="text-h5" style="font-family: serif">
      Edit your first article
    </div>
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
      :loading="isSearching"
    >
      <template #append>
        <q-icon name="search" />
      </template>
    </q-input>
  </q-card-section>
  <q-card-section class="q-pt-none q-pb-lg">
    <div>
      <template v-if="results">
        <search-list :results="results" />
      </template>
    </div>
  </q-card-section>
</template>
<script setup lang="ts">
import axios from 'axios';
import SearchList from './SearchList.vue';
import { ref, computed, watch } from 'vue';
import { SearchResult } from 'src/types';

const term = ref('');
const isSearching = ref(false);
const apiSearch = computed(
  () =>
    `
    https://en.wikipedia.org/w/api.php?action=query&format=json&generator=prefixsearch&prop=pageimages|description&ppprop=displaytitle&piprop=thumbnail&pithumbsize=60&pilimit=6&gpssearch=${term.value}&gpsnamespace=0&gpslimit=6&origin=*`
);
const results = ref<SearchResult[]>();

watch(apiSearch, async (apiSearch) => {
  isSearching.value = true;
  try {
    const response = await axios.get(apiSearch);
    results.value = response.data?.query?.pages;
    if (results.value) {
      results.value = Object.values(results.value);
    }
  } catch (error) {
    console.error(error);
  }
  isSearching.value = false;
});
</script>
