<template>
  <q-list padding class="q-mx-md q-my-xs">
    <search-item
      v-for="item in props.searchResults"
      :key="item.title"
      :item="item"
      :article-language="props.articleLanguage"
    />
  </q-list>
</template>

<script setup lang="ts">
import { wikipediaLanguage } from 'src/data/wikipediaLanguages';
import SearchItem from './SearchItem.vue';
import { SearchResult } from 'src/types';

const props = defineProps<{
  searchResults: SearchResult[];
  articleLanguage: wikipediaLanguage;
}>();
</script>
