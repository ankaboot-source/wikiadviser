<template>
  <div class="column">
    <div class="text-h6 q-pb-sm">Validate Changes</div>
    <q-scroll-area v-if="data.length" class="col-grow">
      <q-list>
        <diff-item
          v-for="item in data"
          :key="item.id"
          :item="item"
          :role="role"
        />
      </q-list>
    </q-scroll-area>
    <template v-else>
      <div class="q-py-sm text-body1 text-weight-medium">
        There are currently no changes
      </div>
      <div class="q-pb-sm text-body2">
        Easily navigate through changes using the changes tab once the article
        is edited.
      </div>
      <div v-if="editorPermission" class="q-pb-sm">
        <router-link :to="{ name: 'article', params: { tab: 'editor' } }">
          <q-btn no-caps unelevated color="primary" label="Edit your article" />
        </router-link>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import DiffItem from './DiffItem.vue';
import { getChanges } from 'src/api/supabaseHelper';
import { ChangesItem, UserRole } from 'src/types';

const props = defineProps<{
  role: UserRole;
  articleId: string;
}>();
const data = ref<ChangesItem[]>([]);
const editorPermission =
  props.role === UserRole.Editor || props.role === UserRole.Owner;
const fetchData = async () => {
  try {
    data.value = await getChanges(props.articleId);
  } catch (error) {
    console.error(error);
  } finally {
    // Call fetchData again after the request completes to implement long polling
    setTimeout(() => fetchData(), 2000);
  }
};
onMounted(fetchData);
</script>
