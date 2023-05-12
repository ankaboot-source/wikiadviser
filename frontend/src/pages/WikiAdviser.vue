<template>
  <div>
    <h1>&nbsp;WikiAdviser</h1>
    <div style="display: flex; text-align: center">
      <h2 style="flex: 1">Mediawiki</h2>
      <h2 style="flex: 1">Differences</h2>
      <h2 style="flex: 1">Differences List</h2>
    </div>

    <div style="display: flex">
      <EditorComponentVue class="flex-item m-auto" />
      <DiffComponentVue class="flex-item m-auto" />
      <DiffListComponent class="flex-item m-auto" />
    </div>
  </div>
</template>

<script setup lang="ts">
import DiffListComponent from 'src/components/Diff-List-component.vue';
import DiffComponentVue from 'src/components/Diff-component.vue';
import EditorComponentVue from 'src/components/Editor-component.vue';
</script>

<style scoped>
.m-auto {
  margin: auto;
}
.flex-item {
  flex: 1;
  height: 80vh;
  overflow-y: scroll;
}
</style>
