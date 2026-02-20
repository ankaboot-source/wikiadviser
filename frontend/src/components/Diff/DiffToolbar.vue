<template>
  <q-toolbar class="q-px-none">
    <q-btn-toggle
      v-model="activeViewStore.modeToggle"
      :options="toggleOptions"
      no-caps
      unelevated
      toggle-color="blue-grey-2"
      toggle-text-color="dark"
      text-color="dark"
      color="bg-secondary"
      class="borders"
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
    <ReviewByMira
      v-if="USE_MIRA"
      :article="article"
      :hide-label="$q.screen.lt.sm"
      :revision-improvements="revisionImprovements"
      @review-complete="handleReviewComplete"
    />
    <q-btn
      v-if="role != 'viewer'"
      icon="o_group"
      outline
      no-caps
      class="q-px-md"
      @click="shareDialog = !shareDialog"
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
import { useActiveViewStore } from 'src/stores/useActiveViewStore';
import { useMiraReviewStore } from 'src/stores/useMiraReviewStore';
import { Article, ChangeItem, Enums, User } from 'src/types';
import { computed, ref } from 'vue';
import ReviewByMira from 'src/components/ReviewByMira.vue';
import { useQuasar } from 'quasar';
import ENV from 'src/schema/env.schema';

const articlesStore = useArticlesStore();
const activeViewStore = useActiveViewStore();
const miraStore = useMiraReviewStore();
const $q = useQuasar();

const USE_MIRA = ENV.USE_MIRA;

const props = defineProps<{
  article: Article;
  role: Enums<'role'>;
  editorPermission: boolean | null;
  users: User[];
  changesList: ChangeItem[];
}>();

const shareDialog = ref(false);

const toggleOptions = computed(() => {
  function getLabel(value: string, text: string) {
    return $q.screen.gt.sm || activeViewStore.modeToggle === value ? text : '';
  }
  const viewButton = {
    label: getLabel('view', 'Review changes'),
    value: 'view',
    icon: 'thumbs_up_down',
  };
  const editButton = {
    label: getLabel('edit', 'Edit article'),
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

const revisionImprovements = computed(() =>
  miraStore.revisionImprovements.map((imp) => ({
    change_id: imp.change_id,
    prompt: imp.prompt,
    content: '',
  })),
);

function handleReviewComplete() {
  miraStore.clearPendingPrompts();
}
</script>
