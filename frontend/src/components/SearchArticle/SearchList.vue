<template>
  <q-list padding class="q-mx-md q-my-xs">
    <search-item v-for="item in props.results" :key="item.title" :item="item" />
  </q-list>
</template>

<script setup lang="ts">
import SearchItem from './SearchItem.vue';
import { SearchResult } from 'src/types';

const props = defineProps<{
  results: SearchResult[];
}>();
</script>
<style lang="css">
.doc-token {
  display: inline-block;
  padding: 4px 6px;
  line-height: 16px;
  vertical-align: baseline;
}

.app-search {
  padding: 0 12px 4px;
}
.app-search__result {
  background-color: white;
  padding: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  font-size: 14px;
}

.app-search__result + .app-search__result {
  margin-top: 6px !important;
}
.app-search__result-title {
  color: #009bdd;
  word-break: break-word;
}

.app-search__result-title .doc-token {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.7px;
  border-radius: 4px;
}

.app-search__result-content {
  padding-top: 8px;
  line-height: 1.3em;
}

body.desktop .doc-search__icon {
  display: none;
}

.doc-search {
  width: 400px;
  height: 43px;
}

.doc-search__results {
  max-height: 80vh;
  top: 45px;
  left: 0;
  right: 0;
  transform: scale3d(1, 0, 1);
  transform-origin: top;
  transition: transform 0.14s ease-in-out, box-shadow 0.28s ease-in-out;
}

.doc-search--focused .doc-search__results--active {
  transform: scaleZ(1);
}

.doc-search--focused .doc-search__icon {
  display: inline-block !important;
}
</style>
