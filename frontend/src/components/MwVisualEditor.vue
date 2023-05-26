<template>
  <iframe :src="article_link" frameBorder="0"></iframe>
</template>

<script setup lang="ts">
const props = defineProps({
  article: { type: String, required: true },
  permissionId: { type: String, required: true },
});
const article_link = `https://localhost/wiki/${props.article}?veaction=edit&permissionid=${props.permissionId}`;
console.log(article_link);
</script>

<style scoped></style>
