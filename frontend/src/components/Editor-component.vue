<template>
  <iframe class="flex-item m-auto" :src="article_link_new" frameBorder="0"></iframe>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const article = ref('Hedi_Slimane')
const article_new = ref('New_Article')

const article_link = ref(`https://localhost/wiki/${article.value}?veaction=edit`)
const article_link_new = ref(`https://localhost/wiki/${article_new.value}?action=edit`)
</script>

<style scoped></style>
