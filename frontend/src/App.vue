<template>
  <div>
    <h1>Data received:</h1>
    <div v-html="data"></div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'

const fetchData = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/html_diff')
    console.log('Data recieved.')
    data.value = response.data
  } catch (error) {
    console.error(error)
  }
}

const data = ref('')

onMounted(fetchData)
</script>

<style scoped></style>
