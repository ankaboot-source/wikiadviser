<template>
  <iframe
    class="flex-item m-auto"
    :src="`https://localhost/wiki/${article}?veaction=edit`"
  ></iframe>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const article = ref('Main_Page')
</script>

<style scoped></style>
