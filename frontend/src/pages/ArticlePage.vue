<template>
  <q-layout view="hHh lpR fFf" style="min-height: 100%">
    <app-header> </app-header>
    <q-page-container>
      <div class="row text-center q-pb-md q-pt-md">
        <div class="col text-h5">Edit</div>
        <div class="col text-h5">Suggestions</div>
        <div class="col text-h5">Suggestions List</div>
      </div>
      <div
        class="row justify-around"
        style="height: 80vh; border-top: 1px solid #ddd"
      >
        <editor-component class="col-4" :article="article" />
        <diff-component class="col-4" style="border-right: 1px solid #ddd" />
        <diff-list class="col-3" />
      </div>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import EditorComponent from 'src/components/Editor-component.vue';
import DiffComponent from 'src/components/Diff-component.vue';
import DiffList from 'src/components/diff_list/DiffList.vue';
import AppHeader from 'src/layouts/AppHeader.vue';
import { ref } from 'vue';
import { useRoute } from 'vue-router';
const article = ref('');
// Access the title parameter from the route's params object
const route = useRoute();
article.value = route.params.title as string;
</script>

<style scoped></style>
