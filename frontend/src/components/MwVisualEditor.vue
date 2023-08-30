<template>
  <iframe :src="articleLink" frameBorder="0" />
</template>

<script setup lang="ts">
import { Article } from 'src/types';

const props = defineProps({
  article: { type: Object as () => Article, required: true },
});

const articleLink = `${process.env.MEDIAWIKI_HOST}/wiki/${props.article.article_id}?veaction=edit&permissionid=${props.article.permission_id}&expectedTitle=${props.article.title}`;
</script>
