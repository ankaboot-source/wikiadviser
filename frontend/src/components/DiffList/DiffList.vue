<template>
  <q-scroll-area style="max-width: 450px; height: 85vh">
    <q-list bordered class="rounded-borders q-pa-md bg-secondary">
      <diff-item
        v-for="item in data"
        :key="item.created_at"
        :item="item"
        :edit-permission="props.editPermission"
      ></diff-item>
    </q-list>
  </q-scroll-area>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import DiffItem from './DiffItem.vue';

import { getChanges } from 'src/api/supabaseHelper';
import { ChangesItem } from 'src/types';
const props = defineProps<{
  editPermission: boolean;
  articleId: string;
}>();
const data = ref<ChangesItem[]>([]);

const fetchData = async () => {
  try {
    data.value = (await getChanges(props.articleId)) as ChangesItem[];
    console.log(data.value);
  } catch (error) {
    console.error(error);
  } finally {
    // Call fetchData again after the request completes to implement long polling
    setTimeout(() => fetchData(), 2000);
  }
};
onMounted(fetchData);
</script>
<style scoped></style>
