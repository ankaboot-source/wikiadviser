<template>
  <q-dialog v-if="!reachedLimits">
    <q-card
      class="column fit"
      :style="
        $q.screen.lt.md
          ? 'max-width: 95vw; max-height: 85vh'
          : 'max-width: 60vw; max-height: 80vh'
      "
      flat
    >
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
          <q-item
            v-for="item in searchResults"
            :key="item.title"
            class="q-pa-sm q-mb-sm borders rounded-borders"
            clickable
            :item="item"
            @click="importSelectedArticle(item)"
          >
            <q-item-section>
              <div class="row items-center q-gutter-sm">
                <div class="col-auto">
                  <q-avatar rounded size="4rem" class="borders">
                    <img v-if="!!item?.thumbnail" :src="item.thumbnail" />
                    <q-icon
                      v-else
                      name="description"
                      size="4rem"
                      color="grey"
                    />
                  </q-avatar>
                </div>
                <div class="col">
                  <div class="text-weight-bold">{{ item!.title }}</div>
                  <div v-if="item!.description">
                    {{ item!.description }}
                  </div>
                </div>
              </div>
            </q-item-section>
          </q-item>
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
  </q-dialog>
  <upgrade-account v-else />
</template>

<script setup lang="ts">
import { FunctionsHttpError } from '@supabase/supabase-js';
import { QSpinnerGrid, useQuasar } from 'quasar';
import supabaseClient from 'src/api/supabase';
import { importArticle } from 'src/api/supabaseHelper';
import { wikiadviserLanguages } from 'src/data/wikiadviserLanguages';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';
import { Profile, SearchResult } from 'src/types';
import { getDefaultUserLanguage } from 'src/utils/language';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import UpgradeAccount from '../Subscription/UpgradeAccountDialoge.vue';

const $q = useQuasar();
const router = useRouter();

const articlesStore = useArticlesStore();
const userStore = useUserStore();

const term = ref('');
const isSearching = ref(false);
const hasReachedLimits = ref(false);
const creatingArticle = ref(false);
const user = computed(() => useUserStore().user as Profile);
const reachedLimits = computed(
  () =>
    (articlesStore.articles.length >= (user.value?.allowed_articles ?? 0) ||
      hasReachedLimits.value) &&
    !creatingArticle.value,
);

const searchResults = ref<SearchResult[]>();
const articleLanguage = ref(getDefaultUserLanguage());

watch([term, articleLanguage], async ([term]) => {
  if (!term.trim()) {
    searchResults.value = [];
    return;
  }
  try {
    isSearching.value = true;
    const response = await supabaseClient.functions.invoke(
      `wikipedia/articles?term=${term}&language=${articleLanguage.value.value}`,
      {
        method: 'GET',
      },
    );
    searchResults.value = response.data.searchResults;
  } catch (error) {
    isSearching.value = false;
    throw error;
  } finally {
    isSearching.value = false;
  }
});

async function importSelectedArticle(searchedArticle: SearchResult) {
  try {
    creatingArticle.value = true;
    const user = userStore.user as Profile;
    const currentLanguage = articleLanguage.value.lang;

    $q.loading.show({
      boxClass: 'bg-white text-dark q-pa-xl',

      spinner: QSpinnerGrid,
      spinnerColor: 'primary',
      spinnerSize: 140,

      message: `
      <div class='text-h6'>Importing “${searchedArticle.title}” from Wikipedia. </div></br>
      <div class='text-body1'>Please wait…</div>`,
      html: true,
    });

    const articleId = await importArticle(
      searchedArticle.title,
      user.id,
      currentLanguage,
      searchedArticle.description,
    );

    await articlesStore.fetchArticles(user.id);

    $q.loading.hide();
    $q.notify({
      message: 'Article successfully imported',
      icon: 'check',
      color: 'positive',
    });

    // GOTO ARTICLE PAGE, EDIT TAB
    await router.push({
      name: 'article',
      params: {
        articleId,
      },
    });
  } catch (error) {
    creatingArticle.value = false;
    $q.loading.hide();

    if (error instanceof FunctionsHttpError) {
      hasReachedLimits.value = error.context?.status === 402;
    }

    throw error;
  }
}
</script>
