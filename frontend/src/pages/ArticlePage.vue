<template>
  <q-tabs
    v-model="tab"
    dense
    class="q-px-md"
    active-color="primary"
    indicator-color="primary"
    align="left"
  >
    <q-tab v-if="editPermission" name="editor" label="editor" />
    <q-tab name="view" label="view" />
    <q-space />
    <q-btn
      icon="link"
      color="primary"
      outline
      label="share"
      @click="share = !share"
    ></q-btn>
    <q-dialog v-model="share">
      <share-card :article-id="articleId" :role="role"
    /></q-dialog>
  </q-tabs>
  <q-tab-panels v-model="tab">
    <q-tab-panel name="editor" class="row justify-evenly">
      <mw-visual-editor
        v-if="title && permissionId"
        :article="title"
        :permission-id="permissionId"
        style="height: 85vh"
        class="col-10 rounded-borders q-pa-md bg-secondary borders"
      />
    </q-tab-panel>
    <q-tab-panel name="view" class="row justify-evenly">
      <diff-card
        class="col-9 rounded-borders q-pa-md bg-secondary borders"
        style="height: 85vh"
        bordered
      />
      <diff-list :edit-permission="editPermission" class="col-3" />
    </q-tab-panel>
  </q-tab-panels>
</template>

<script setup lang="ts">
import MwVisualEditor from 'src/components/MwVisualEditor.vue';
import DiffCard from 'src/components/DiffCard.vue';
import DiffList from 'src/components/DiffList/DiffList.vue';
import ShareCard from 'src/components/ShareCard.vue';
import { onBeforeMount, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';
import {
  createNewPermissionRequest,
  getArticles,
} from 'src/api/supabaseHelper';
import supabase from 'src/api/supabase';

const route = useRoute();

const router = useRouter();
const tab = ref('');
const articleId = ref('');
const permissionId = ref('');
const share = ref(false);

const title = ref('');
const role = ref(null);
const editPermission = ref(false);

onBeforeMount(async () => {
  const { data } = await supabase.auth.getSession();

  // Access the article title parameter from the route's params object
  articleId.value = route.params.articleId as string;
  // Access the selected tab else 'view' tab
  tab.value = route.params.tab ? (route.params.tab as string) : 'view';

  const articles = await getArticles(data.session!.user.id);
  localStorage.setItem('articles', JSON.stringify(articles));
  if (articles) {
    const article = articles.find((article: any) => {
      return article.article_id === articleId.value;
    });
    if (article) {
      role.value = article.role;
      title.value = article.title;
      editPermission.value = role.value == 0 || role.value == 1;
      permissionId.value = article.permission_id;
      console.log(
        role.value,
        title.value,
        editPermission.value,
        permissionId.value
      );
    }
  }
  if (role.value == null) {
    //In case this article exists, a permission request will be sent to the Owner.
    await createNewPermissionRequest(articleId.value, data.session!.user.id);
    router.push({
      name: 'ArticleNotFound',
    });
  }
  console.log(role.value);
});
</script>

<style scoped></style>
