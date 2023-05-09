<template>
  <div v-html="data"></div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'

import '../assets/styles/index.css'
import '../assets/styles/ve.css'
import '../assets/styles/diff.css'

const fetchData = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/html_diff')
    console.log('Data recieved.')
    data.value = response.data
  } catch (error) {
    console.error(error)
  } finally {
    // Call fetchData again after the request completes to implement long polling
    setTimeout(() => fetchData(), 1000)
  }
}

const data = ref('')

onMounted(fetchData)
</script>

<style scoped></style>
