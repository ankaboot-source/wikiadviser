<template>
  <q-card-section>
    <div class="text-h5" style="font-family: serif">Articles</div>
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
    >
      <template #append>
        <q-icon name="search" />
      </template>
    </q-input>
  </q-card-section>
  <q-card-section class="q-pt-none q-pb-lg">
    <q-list padding>
      <q-item
        v-for="article in articles"
        :key="article.article_id"
        class="app-search__result"
        clickable
        @click="
          router.push({
            name: 'article',
            params: {
              articleId: article.article_id,
            },
          })
        "
      >
        <q-item-section>
          <div class="app-search__result-title row items-center q-gutter-sm">
            <div class="col-auto"></div>
            <div class="col">
              <div class="doc-token">{{ article.title }}</div>
              <div v-if="article.description" class="q-pl-sm">
                {{ article.description }}
              </div>
              <div v-if="article.description" class="text-black q-pl-sm">
                {{ roles[article.role] }}
              </div>
            </div>
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </q-card-section>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const articles = JSON.parse(localStorage.getItem('articles')!);
const term = ref('');
const roles: { [key: number]: string } = {
  0: 'Owner',
  1: 'Contributor',
  2: 'Reviewer',
};
</script>
