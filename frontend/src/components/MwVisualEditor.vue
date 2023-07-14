<template>
  <iframe :src="article_link" frameBorder="0"></iframe>
</template>

<script setup lang="ts">
const props = defineProps({
  articleId: { type: String, required: true },
  permissionId: { type: String, required: true },
  title: { type: String, required: true },
});

const article_link = `https://localhost/wiki/${props.articleId}?veaction=edit&permissionid=${props.permissionId}&title=${props.title}`;
</script>
