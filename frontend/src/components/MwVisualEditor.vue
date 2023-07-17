<template>
  <iframe :src="articleLink" frameBorder="0"></iframe>
</template>

<script setup lang="ts">
const props = defineProps({
  articleId: { type: String, required: true },
  permissionId: { type: String, required: true },
  title: { type: String, required: true },
});

const articleLink = `https://localhost/wiki/${props.articleId}?veaction=edit&permissionid=${props.permissionId}&expectedTitle=${props.title}`;
</script>
