<template>
  <q-tabs
    v-model="tab"
    dense
    class="q-px-md"
    active-color="primary"
    indicator-color="primary"
    align="left"
  >
    <q-tab v-if="articles" name="ownedArticles" label="View Articles" />
    <q-tab name="wikipediaArticles" label="Create new article" />
  </q-tabs>
  <q-tab-panels v-model="tab">
    <q-tab-panel name="wikipediaArticles" class="row justify-center">
      <q-card class="q-pa-sm bg-secondary">
        <search-article></search-article>
      </q-card>
    </q-tab-panel>
    <q-tab-panel name="ownedArticles" class="row justify-center">
      <q-card class="q-pa-sm bg-secondary">
        <owned-articles></owned-articles>
      </q-card>
    </q-tab-panel>
  </q-tab-panels>
</template>

<script setup lang="ts">
import SearchArticle from 'src/components/SearchArticle/SearchArticle.vue';
import OwnedArticles from 'src/components/OwnedArticles.vue';

import { ref, onBeforeMount } from 'vue';
import supabase from 'src/api/supabase';
import { getArticles } from 'src/api/supabaseHelper';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const tab = ref('');
const articles = ref();

onBeforeMount(async () => {
  const { data } = await supabase.auth.getSession();
  articles.value = await getArticles(data.session!.user.id);
  $q.localStorage.set('articles', JSON.stringify(articles.value));
  tab.value = articles.value ? 'ownedArticles' : 'wikipediaArticles';
});
</script>
