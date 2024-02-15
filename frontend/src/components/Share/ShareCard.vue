<template>
  <q-card style="min-width: 30vw">
    <q-toolbar class="bg-white borders">
      <q-toolbar-title class="merriweather">Share settings</q-toolbar-title>
      <q-btn v-close-popup flat round dense icon="close" size="sm" />
    </q-toolbar>

    <q-card-section>
      <q-list bordered separator>
        <share-user
          v-for="user in users"
          :key="user.email"
          :user="user"
          :role="role"
          @permission-emit="onPermissionChange"
        ></share-user>
      </q-list>
    </q-card-section>

    <q-card-section v-if="ownerPermission">
      <q-toggle
        v-model="web_publication_toggle"
        @update:model-value="handlePublish()"
      >
        Publish this article on the Web and make it readable to everyone
        <q-icon name="public" size="xs" class="q-ml-xs">
          <q-tooltip>This article is published on the Web</q-tooltip>
        </q-icon>
      </q-toggle>
    </q-card-section>

    <q-card-actions v-if="ownerPermission" class="borders">
      <q-space />
      <q-btn
        v-close-popup
        class="q-mr-xs"
        color="primary"
        outline
        no-caps
        label="Cancel"
      />
      <q-btn
        v-close-popup
        color="primary"
        unelevated
        no-caps
        label="Apply"
        @click="handleApplyChanges()"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { User, UserRole, Permission, Article, Profile } from 'src/types';
import ShareUser from './ShareUser.vue';
import {
  deletePermission,
  getUsers,
  updateArticleWebPublication,
  updatePermission,
} from 'src/api/supabaseHelper';
import { copyToClipboard, useQuasar } from 'quasar';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';

const $q = useQuasar();
const articlesStore = useArticlesStore();

const props = defineProps<{
  article: Article;
  role: UserRole;
}>();
const users = ref<User[]>();

const ownerPermission = props.role === UserRole.Owner;

onMounted(async () => {
  users.value = await getUsers(props.article.article_id);
});

type EmittedPermission = {
  permissionId: string;
  role: UserRole;
  duplicate?: boolean;
  remove?: boolean;
};
const permissionsToUpdate = ref<Permission[]>([]);
const permissionsToDelete = ref<string[]>([]);
const web_publication_toggle = ref(props.article.web_publication);

const onPermissionChange = (permission: EmittedPermission) => {
  const { permissionId, duplicate, remove } = permission;

  if (remove) {
    permissionsToDelete.value?.push(permissionId);
    return;
  }
  const existingPermissionIndex = permissionsToUpdate.value?.findIndex(
    (perm) => perm.permissionId === permissionId,
  );

  if (existingPermissionIndex !== -1) {
    // If the permission already exists
    if (duplicate) {
      // Remove it
      permissionsToUpdate.value?.splice(existingPermissionIndex, 1);
    } else {
      // Change it
      permissionsToUpdate.value[existingPermissionIndex] = permission;
    }
  } else {
    // If the permission doesn't exist, Add it
    permissionsToUpdate.value?.push(permission);
  }
};

async function handleApplyChanges() {
  try {
    if (permissionsToDelete.value.length) {
      for (const permission of permissionsToDelete.value) {
        await deletePermission(permission);
      }
      $q.notify({
        message: 'Permission updated',
        icon: 'check',
        color: 'positive',
      });
      permissionsToDelete.value = [];
    }

    if (permissionsToUpdate.value.length) {
      await updatePermission(permissionsToUpdate.value);
      $q.notify({
        message: 'Permission updated',
        icon: 'check',
        color: 'positive',
      });
      users.value = await getUsers(props.article.article_id);
      permissionsToUpdate.value = [];
    }

    // Publish Article
    if (web_publication_toggle.value !== props.article.web_publication) {
      await updateArticleWebPublication(
        web_publication_toggle.value,
        props.article.article_id,
      );
      if (!web_publication_toggle.value) {
        $q.notify({
          message: 'Article set to private',
          color: 'positive',
          icon: 'public_off',
        });
      } else {
        copyToClipboard(
          `${process.env.MEDIAWIKI_ENDPOINT}/${props.article.language}/index.php?title=${props.article.article_id}`,
        );
        $q.notify({
          message: 'Published on the web',
          caption: 'Publish link copied to clipboard',
          color: 'positive',
          icon: 'public',
        });
      }
      const user = useUserStore().user as Profile;
      await articlesStore.fetchArticles(user.id);
    }
  } catch (error) {
    $q.loading.hide();
    throw error;
  }
}

function handlePublish() {
  if (web_publication_toggle.value) {
    copyToClipboard(
      `${process.env.MEDIAWIKI_ENDPOINT}/${props.article.language}/index.php?title=${props.article.article_id}`,
    );
    $q.notify({
      message: 'Publish link copied to clipboard',
      caption: 'Dont forget to apply changes',
      color: 'positive',
      icon: 'content_copy',
    });
  }
}
</script>
