<template>
  <q-toolbar class="q-px-none">
    <q-btn-toggle
      v-model="localButtonToggle"
      no-caps
      unelevated
      toggle-color="blue-grey-2"
      toggle-text-color="dark"
      text-color="dark"
      color="bg-secondary"
      class="borders"
      :options="toggleOptions"
      @update:model-value="$emit('update:buttonToggle', $event)"
    />
    <q-space />
    <q-btn
      v-if="$q.screen.gt.md"
      icon="open_in_new"
      outline
      class="q-mr-xs"
      no-caps
      @click="
        articlesStore.viewArticleInNewTab(article.language, article.article_id)
      "
    >
      <div class="q-ml-xs">View article</div>
    </q-btn>
    <ReviewByMira :article="article" :hide-label="$q.screen.lt.sm" />
    <q-btn
      v-if="role != 'viewer'"
      icon="o_group"
      outline
      no-caps
      :class="$q.screen.lt.sm ? '' : 'q-pr-lg'"
    >
      <div v-if="$q.screen.gt.sm" class="q-ml-xs">Share</div>
      <q-dialog v-model="shareDialog">
        <share-card :article="article" :role :users />
      </q-dialog>
    </q-btn>
  </q-toolbar>
</template>

<script setup lang="ts">
import ShareCard from 'src/components/Share/ShareCard.vue';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { Article, Enums, User } from 'src/types';
import { computed, ref, watch } from 'vue';
import ReviewByMira from 'src/components/ReviewByMira.vue';
import { useQuasar } from 'quasar';

const articlesStore = useArticlesStore();
const $q = useQuasar();

const props = defineProps<{
  article: Article;
  role: Enums<'role'>;
  editorPermission: boolean | null;
  users: User[];
  buttonToggle: string;
}>();

defineEmits<{
  'update:buttonToggle': [value: string];
}>();

const shareDialog = ref(false);

const localButtonToggle = ref(props.buttonToggle);

watch(
  () => props.buttonToggle,
  (newValue) => {
    localButtonToggle.value = newValue;
  },
);

const toggleOptions = computed(() => {
  const viewButton = {
    label: $q.screen.gt.sm ? 'Review changes' : '',
    value: 'view',
    icon: 'thumbs_up_down',
  };
  const editButton = {
    label: $q.screen.gt.sm ? 'Edit article' : '',
    value: 'edit',
    icon: 'edit',
  };

  return !(
    props.article.title &&
    props.article.permission_id &&
    props.editorPermission
  )
    ? [viewButton]
    : [viewButton, editButton];
});
</script>
Z
