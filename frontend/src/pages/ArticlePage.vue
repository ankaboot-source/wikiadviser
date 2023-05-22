<template>
  <q-tabs
    v-model="tab"
    dense
    class="text-grey"
    active-color="primary"
    indicator-color="primary"
    align="left"
  >
    <q-tab name="editor" label="editor" />
    <q-tab name="view" label="view" />
  </q-tabs>
  <q-tab-panels v-model="tab">
    <q-tab-panel name="editor" class="row justify-evenly">
      <mw-visual-editor
        :article="article"
        style="
          height: 85vh;
          background-color: rgb(246, 248, 250);
          border: 1px solid rgba(0, 0, 0, 0.12);
        "
        class="col-10 rounded-borders q-pa-md"
      />
    </q-tab-panel>
    <q-tab-panel name="view" class="row justify-evenly">
      <diff-card
        class="col-9 rounded-borders q-pa-md"
        style="
          height: 85vh;
          background-color: rgb(246, 248, 250);
          border: 1px solid rgba(0, 0, 0, 0.12);
        "
        bordered
      />
      <diff-list class="col-3" />
    </q-tab-panel>
  </q-tab-panels>
</template>

<script setup lang="ts">
import MwVisualEditor from 'src/components/MwVisualEditor.vue';
import DiffCard from 'src/components/DiffCard.vue';
import DiffList from 'src/components/DiffList/DiffList.vue';
import { ref } from 'vue';
import { useRoute } from 'vue-router';
const route = useRoute();
const article = ref('');
const tab = ref('');
// Access the article title parameter from the route's params object
article.value = route.params.title as string;
// Access the selected tab else 'view' tab
tab.value = route.params.tab ? (route.params.tab as string) : 'view';
</script>

<style scoped></style>
