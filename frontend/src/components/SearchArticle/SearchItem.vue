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
import { useRouter } from 'vue-router';
const router = useRouter();
const props = defineProps({
  item: Object,
});

async function itemOnClick() {
  try {
    // Fetch wikitext of local article to check if it exists
    const url = `https://localhost/w/api.php?action=query&formatversion=2&prop=revisions&rvprop=content&rvslots=%2A&titles=${
      props.item!.title
    }&format=json&origin=*`;
    const response = await axios.get(url, { data: { https: false } }); // Disable HTTPS verification
    const articleExists =
      response.data?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
    console.log(articleExists);
    if (articleExists) {
      console.log('article exists');
      // GOTO ARTICLE PAGE
      router.push({
        name: 'article',
        params: { title: props!.item!.title },
      });
    } else {
      console.log("article doesn't exist");

      //NEW ARTICLE
      const response = await axios.post(
        'http://localhost:3000/api/new_article',
        {
          title: props!.item!.title,
        }
      );
      console.log('Data sent.', response);

      // GOTO ARTICLE PAGE, EDIT TAB
      router.push({
        name: 'article',
        params: { title: props!.item!.title, tab: 'editor' },
      });
    }
  } catch (error: any) {
    console.error('Error sending data:', error);
  }
}
</script>
