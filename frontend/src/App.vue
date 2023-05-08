<template>
  <div>
    <h1>Data received:</h1>
    <div>
      <iframe
        style="width: 50vw; height: 80vh"
        src="https://localhost/wiki/Main_Page?veaction=edit"
      ></iframe>
    </div>
    <div>
      <DiffComponentVue />
    </div>
  </div>
</template>

<script setup lang="ts">
import DiffComponentVue from './components/Diff-component.vue'
</script>

<style scoped></style>
