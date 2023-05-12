<template>
  <div>
    <table>
      <thead>
        <tr>
          <th>Id</th>
          <th>Status</th>
          <th>Type of Edit</th>
          <th>Description</th>
          <th>Date</th>
          <th>User</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in diffItems" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.status }}</td>
          <td>{{ item.typeOfEdit }}</td>
          <td>
            <ul v-if="item.description?.[0]?.length">
              <li v-for="description in item.description" :key="description">{{ description }}</li>
            </ul>
          </td>
          <td>{{ item.date }}</td>
          <td>{{ item.user }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref, computed } from 'vue'
const data = ref('')

const fetchData = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/html_diff')
    data.value = response.data
  } catch (error) {
    console.error(error)
  } finally {
    // Call fetchData again after the request completes to implement long polling
    setTimeout(() => fetchData(), 1000)
  }
}
onMounted(fetchData)

const diffItems = computed(() => {
  // Parse the HTML string to create a DOM element
  const parser = new DOMParser()
  const doc = parser.parseFromString(data.value, 'text/html')
  // Use the DOM API to get elements with the desired attribute
  const elements = doc.querySelectorAll('[data-status]')
  // Convert the NodeList to an array and map each element to an object with its data
  const items = Array.from(elements).map((element, index) => ({
    id: index,
    status: element.getAttribute('data-status'),
    description: element.getAttribute('data-description')?.split('<|>'),
    typeOfEdit: element.getAttribute('data-type-of-edit'),
    user: element.getAttribute('data-user'),
    date: element.getAttribute('data-date')
  }))
  return items
})
</script>
<style scoped>
table {
  border-collapse: collapse;
  text-align: left;
  width: 100%;
  border-left: 1px solid;
}
table tr {
  border-bottom: 1px solid;
}
table th,
table td {
  padding: 10px 20px;
}
th {
  background-color: white;
  position: sticky;
  top: 0;
  z-index: 1;
}
</style>
