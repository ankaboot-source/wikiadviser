<template>
  <iframe class="flex-item m-auto" :src="article_link" frameBorder="0"></iframe>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const article = ref('Main_Page')
const article_link = ref(`https://localhost/wiki/${article.value}?veaction=edit`)
</script>

<style scoped></style>
