<template>
  <q-layout view="hHh lpR fFf">
    <app-header></app-header>

    <q-page-container>
      <q-page class="row justify-center q-pt-xl">
        <q-card class="q-pa-sm" style="background-color: #f6f8fa; height: 100%">
          <q-card-section>
            <div class="text-h5">Edit your first article</div>
          </q-card-section>
          <q-card-section class="q-pb-none">
            <q-input
              bg-color="white"
              v-model="term"
              dense
              standout
              outlined
              size="xl"
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
            <div>
              <template v-if="results">
                <app-search-results :results="results" />
              </template>
            </div>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import axios from 'axios';
import AppHeader from 'src/layouts/AppHeader.vue';
import AppSearchResults from 'src/components/search/SearchResults.vue';
import supabaseClient from 'src/api/supabase';
import { ref, computed, watch } from 'vue';

supabaseClient;
const term = ref('');
const apiSearch = computed(
  () =>
    `
    https://fr.wikipedia.org/w/api.php?action=query&format=json&generator=prefixsearch&prop=pageimages|description&ppprop=displaytitle&piprop=thumbnail&pithumbsize=60&pilimit=6&gpssearch=${term.value}&gpsnamespace=0&gpslimit=6&origin=*`
);
const results = ref(null);
watch(apiSearch, async (apiSearch) => {
  try {
    const response = await axios.get(apiSearch);
    results.value = response.data?.query?.pages;

    if (results.value) {
      results.value = Object.values(results.value);
      console.log(
        term.value,
        results.value[0].title,
        results.value[0].description,
        results.value[0]
      );
    }
  } catch (error) {
    console.error(error.response.data.error);
  }
});
</script>

<style lang="scss"></style>
