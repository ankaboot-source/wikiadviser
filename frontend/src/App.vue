<template>
  <div>
    <h1>&nbsp;WikiAdviser</h1>
    <div style="display: flex">
      <EditorComponentVue class="flex-item m-auto" />
      <DiffComponentVue class="flex-item m-auto" />
    </div>
  </div>
</template>

<script setup lang="ts">
import DiffComponentVue from './components/Diff-component.vue'
import EditorComponentVue from './components/Editor-component.vue'
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
