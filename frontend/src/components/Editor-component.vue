<template>
  <iframe :src="article_link" frameBorder="0"></iframe>
</template>

<script setup lang="ts">
const props = defineProps({
  article: String,
});
const article_link = `https://localhost/wiki/${props.article}?veaction=edit`;
</script>

<style scoped></style>
