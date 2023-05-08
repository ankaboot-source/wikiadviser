<template>
  <div>
    <h1>&nbsp;WikiAdviser</h1>
    <div style="display: flex">
      <iframe
        class="flex-item m-auto"
        src="https://localhost/wiki/Main_Page?veaction=edit"
      ></iframe>

      <DiffComponentVue class="flex-item m-auto" />
    </div>
  </div>
</template>

<script setup lang="ts">
import DiffComponentVue from './components/Diff-component.vue'
</script>

<style scoped>
.m-auto {
  margin: auto;
}
.flex-item {
  width: 47vw;
  height: 80vh;
}
</style>
