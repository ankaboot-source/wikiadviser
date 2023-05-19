<template>
  <q-item class="app-search__result" clickable @click="itemOnClick">
    <q-item-section>
      <div class="app-search__result-title row items-center q-gutter-sm">
        <div class="col-auto">
          <q-avatar
            rounded
            size="4rem"
            style="border: 1px solid rgba(0, 0, 0, 0.12)"
          >
            <img
              v-if="!!props.item?.thumbnail?.source"
              :src="props.item.thumbnail.source"
            />
            <q-icon name="description" size="4rem" color="grey" />
          </q-avatar>
        </div>
        <div class="col">
          <div class="doc-token">{{ props.item!.title }}</div>
          <div class="q-pl-sm" v-if="props.item!.description">
            {{ props.item!.description }}
          </div>
        </div>
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import axios from 'axios';
import { useRouter } from 'vue-router'; // <- import useRoute here
const router = useRouter();
const props = defineProps({
  item: Object,
});

async function itemOnClick() {
  // Fetch wikitext of local article to check if it exists
  const url = `https://localhost/w/api.php?action=query&formatversion=2&prop=revisions&rvprop=content&rvslots=%2A&titles=${
    props.item!.title
  }&format=json&origin=*`;
  await axios
    .get(url, { data: { https: false } }) // Disable HTTPS verification
    .then((response) => {
      try {
        // Article already exists
        response.data.query.pages[0].revisions[0].slots.main.content;
        console.log('article exists');

        // GOTO ARTICLE PAGE, EDIT TAB
        router.push({
          name: 'article',
          params: { title: props!.item!.title },
        });
      } catch (error) {
        // Article doesn't exist
        console.log("err | article doesn't exist");

        /* NEW ARTICLE
          // Fetch the wikitext of a Wikipedia Article.
            const article_wikipedia = `https://wikipedia.org/w/api.php?action=query&formatversion=2&prop=revisions&rvprop=content&rvslots=%2A&titles=${title.value}&format=json`;
          // Insert it into our Mediawiki
            const article_mediawiki = `https://localhost/wiki/${title.value}?action=edit`;
          // GOTO ARTICLE PAGE, EDIT TAB
        */
      }
    })
    .catch((error) => {
      console.log(error.response.data.error);
    });
}
</script>
