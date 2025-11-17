<template>
  <q-dialog v-if="!reachedLimits">
    <q-card
      class="column"
      :style="
        $q.screen.lt.md
          ? 'width: 95vw; max-height: 60vh'
          : 'width: 60vw; max-height: 60vh'
      "
      flat
    >
      <q-toolbar class="borders">
        <q-toolbar-title class="merriweather">
          Create a new article
        </q-toolbar-title>
        <q-btn v-close-popup flat round dense icon="close" size="sm" />
      </q-toolbar>
      <q-form @submit="addArticle">
        <q-card-section>
          Title
          <q-input
            v-model="newArticle.title"
            bg-color="white"
            dense
            outlined
            class="q-mb-sm"
            :rules="[
              (title) => !!title || 'Title is required',
              (title) =>
                title.length <= 256 ||
                'Title must contain 1 to 256 characters.',
            ]"
          />
          <div class="row">
            <div>Description</div>
            <q-space />
            <div class="text-grey-7">Optional</div>
          </div>
          <q-input
            v-model="newArticle.description"
            bg-color="white"
            dense
            outlined
            class="q-mb-sm"
          />
        </q-card-section>
        <q-card-actions class="borders">
          <q-btn v-close-popup no-caps outline color="primary" label="Cancel" />
          <q-space />
          <q-btn
            no-caps
            unelevated
            type="submit"
            color="primary"
            label="Create"
            :icon="!loadingCreation ? 'note_add' : ''"
            :loading="loadingCreation"
          >
            <template #loading>
              <q-spinner class="on-left" />
              Create
            </template>
          </q-btn>
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
  <upgrade-account v-else />
</template>

<script setup lang="ts">
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useQuasar } from 'quasar';
import { createArticle } from 'src/api/supabaseHelper';
import UpgradeAccount from 'src/components/Subscription/UpgradeAccountDialoge.vue';
import { wikiadviserLanguages } from 'src/data/wikiadviserLanguages';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';
import { Profile } from 'src/types';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

const $q = useQuasar();
const router = useRouter();
const articlesStore = useArticlesStore();
const userStore = useUserStore();

const articleLang =
  wikiadviserLanguages.find(
    (option) => window.navigator.language.split('-')[0] === option.lang,
  ) || wikiadviserLanguages[0];

const articleId = ref('');
const newArticle = ref({ title: '', description: '', language: articleLang });

const loadingCreation = ref(false);
const hasReachedLimits = ref(false);
const creatingArticle = ref(false);
const user = computed(() => useUserStore().user as Profile);
const reachedLimits = computed(
  () =>
    (articlesStore.articles.length >= (user.value?.allowed_articles ?? 0) ||
      hasReachedLimits.value) &&
    !creatingArticle.value,
);

async function addArticle() {
  try {
    loadingCreation.value = true;
    creatingArticle.value = true;
    const user = userStore.user as Profile;

    //NEW ARTICLE
    articleId.value = await createArticle(
      newArticle.value.title,
      user.id,
      newArticle.value.language.value,
      newArticle.value.description,
    );
    await articlesStore.fetchArticles(user.id);

    loadingCreation.value = false;

    $q.notify({
      message: 'Article successfully created',
      icon: 'check',
      color: 'positive',
    });

    // GOTO ARTICLE PAGE, EDIT TAB
    return router.push({
      name: 'article',
      params: {
        articleId: articleId.value,
      },
    });
  } catch (error) {
    loadingCreation.value = false;
    creatingArticle.value = false;

    if (error instanceof FunctionsHttpError) {
      hasReachedLimits.value = error.context?.status === 402;
    }

    throw error;
  }
}
</script>
