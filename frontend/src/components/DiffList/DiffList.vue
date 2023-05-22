<template>
  <q-scroll-area style="max-width: 450px; height: 85vh">
    <q-list
      bordered
      class="rounded-borders q-pa-md"
      style="background-color: rgb(246, 248, 250)"
    >
      <diff-item
        v-for="item in diffItems"
        :key="item.id"
        :item="item"
      ></diff-item>
    </q-list>
  </q-scroll-area>
</template>

<script setup lang="ts">
import axios from 'axios';
import { onMounted, ref, computed } from 'vue';
import DiffItem from './DiffItem.vue';
const data = ref('');

const fetchData = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/html_diff');
    data.value = response.data;
  } catch (error) {
    console.error(error);
  } finally {
    // Call fetchData again after the request completes to implement long polling
    setTimeout(() => fetchData(), 1000);
  }
};
onMounted(fetchData);

const diffItems = computed(() => {
  // Parse the HTML string to create a DOM element
  const parser = new DOMParser();
  const doc = parser.parseFromString(data.value, 'text/html');
  // Use the DOM API to get elements with the desired attribute
  const elements = doc.querySelectorAll('[data-status]');
  // Convert the NodeList to an array and map each element to an object with its data
  const items = Array.from(elements).map((element, index) => ({
    id: index,
    content: element.outerHTML,
    status: element.getAttribute('data-status'),
    typeOfEdit: element.getAttribute('data-type-of-edit'),
    description: element.getAttribute('data-description')?.split('<|>'),
    user: element.getAttribute('data-user'),
    date: element.getAttribute('data-date'),
  }));
  return items;
});
</script>
<style scoped></style>
