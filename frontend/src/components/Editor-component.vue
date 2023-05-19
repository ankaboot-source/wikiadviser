<template>
  <iframe :src="article_link" frameBorder="0"></iframe>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const article = ref('Hedi_Slimane');
const article_link = ref(
  `https://localhost/wiki/${article.value}?veaction=edit`
);
</script>

<style scoped></style>
