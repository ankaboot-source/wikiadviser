<template>
  <iframe class="flex-item m-auto" :src="article_link" frameBorder="0"></iframe>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const article = ref('Hedi_Slimane');
const article_link = ref(
  `https://localhost/wiki/${article.value}?veaction=edit`
);
/* //New Article Example
const article_new = ref('Example_Article')
const article_link_new = ref(`https://localhost/wiki/${article_new.value}?action=edit`)
*/
</script>

<style scoped></style>
