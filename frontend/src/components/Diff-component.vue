<template>
  <div v-html="data" @click="handleClick($event)"></div>
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

const handleClick = (event: MouseEvent) => {
  //Prevent visting links:
  event.preventDefault()
  let target = event.target as HTMLElement
  const rest = target
  let ancestry = 0
  while (target && !target.getAttribute('status')) {
    target = target.parentElement!
    ancestry++
  }
  if (target) {
    console.log(`Element clicked of ancestry ${ancestry}:`, target)
  } else {
    console.log('Element clicked:', rest)
  }
}
</script>

<style>
/* General */
b {
  font-weight: bold !important;
}

/* Data diff: */
/* Change */
[data-diff-action='change'],
[data-diff-action='change-insert'] {
  background-color: transparent !important;
  box-shadow: none;

  border-bottom: 3px solid rgba(109, 169, 247, 0.45);
  border-top: 3px solid rgba(109, 169, 247, 0.45);
}
[data-diff-action='change']:hover,
[data-diff-action='change-insert']:hover {
  border-bottom: 3px solid rgba(109, 169, 247, 0.65);
  border-top: 3px solid rgba(109, 169, 247, 0.65);
}

/* Remove */
[data-diff-action='remove'],
[data-diff-action='remove'] > caption,
[data-diff-action='remove'] > figcaption {
  background-color: transparent !important;
  box-shadow: none;

  border-bottom: 3px solid rgba(174, 30, 66, 0.45);
  border-top: 3px solid rgba(174, 30, 66, 0.45);
  text-decoration: line-through;
  text-decoration-color: rgba(87, 15, 33, 0.5);
  text-decoration-thickness: 3px;
}
[data-diff-action='remove']:hover,
[data-diff-action='remove']:hover > caption,
[data-diff-action='remove']:hover > figcaption :hover {
  border-bottom: 3px solid rgba(109, 18, 41, 0.5);
  border-top: 3px solid rgba(109, 18, 41, 0.5);
}

/* Insert */
[data-diff-action='insert'],
[data-diff-action='insert'] > caption,
[data-diff-action='insert'] > figcaption {
  background-color: transparent !important;
  box-shadow: none;

  border-bottom: 3px solid rgba(30, 174, 49, 0.45);
  border-top: 3px solid rgba(30, 174, 49, 0.45);
}
[data-diff-action='insert']:hover,
[data-diff-action='insert']:hover > caption,
[data-diff-action='insert']:hover > figcaption {
  border-bottom: 3px solid rgba(18, 109, 31, 0.5);
  border-top: 3px solid rgba(18, 109, 31, 0.5);
}

/* Status */
[status] {
  cursor: pointer;
}
[status='Awaiting Reviewer Approval'] {
  background-color: rgba(255, 201, 0, 0.2) !important;
}
[status='Awaiting Reviewer Approval']:hover {
  background-color: rgba(255, 201, 0, 0.3) !important;
}

[status='Edit Rejected'] {
  background-color: rgba(255, 112, 112, 0.2) !important;
}
[status='Edit Rejected']:hover {
  background-color: rgba(255, 112, 112, 0.3) !important;
}

[status='Edit Approved'] {
  background-color: rgba(16, 146, 0, 0.2) !important;
}
[status='Edit Approved']:hover {
  background-color: rgba(16, 146, 0, 0.3) !important;
}
</style>
