<template>
  <q-card style="min-width: 30vw">
    <q-toolbar class="bg-white borders">
      <q-toolbar-title class="merriweather">Share settings</q-toolbar-title>
      <q-btn v-close-popup flat round dense icon="close" size="sm" />
    </q-toolbar>

    <q-card-section v-if="ownerPermission">
      <div class="text-h6 text-weight-regular">Share link</div>
      <div class="q-mr-sm row wrap items-center q-gutter-sm">
        <div class="col-12">
          <span v-if="shareRoleModel.value === 'editor'"
            >Anyone with this link will be able to edit, review and view this
            article.</span
          >
          <span v-else-if="shareRoleModel.value === 'reviewer'"
            >Anyone with this link will be able to review and view this
            article.</span
          >
          <span v-else-if="shareRoleModel.value === 'viewer'"
            >Anyone with this link will be able to view only this article.</span
          >
        </div>
        <q-select
          v-model="shareRoleModel"
          :options="shareRoleOptions"
          class="text-capitalize"
          dense
        />
        <q-space />
        <q-btn
          icon="content_copy"
          outline
          label="Create share link"
          no-caps
          @click="copyShareLinkToClipboard()"
        />
      </div>
    </q-card-section>
    <q-card-section>
      <div class="text-h6 text-weight-regular">Shared with</div>
      <q-list bordered separator>
        <share-user
          v-for="user in users"
          :key="user.role"
          :user="user"
          :role="role"
          @permission-emit="onPermissionChange"
        />
      </q-list>
    </q-card-section>
    <q-card-section v-if="ownerPermission">
      <q-toggle
        v-model="web_publication_toggle"
        @update:model-value="handlePublish()"
      >
        Make it public on the Web, searchable and readable for everyone.
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
import { copyToClipboard, useQuasar } from 'quasar';
import {
  createLink,
  deletePermission,
  getUsers,
  updateArticleWebPublication,
  updatePermission,
} from 'src/api/supabaseHelper';
import ENV from 'src/schema/env.schema';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';
import { Article, Enums, Permission, Profile, User } from 'src/types';
import { HOURS_IN_DAY, SHARE_LINK_DAY_LIMIT } from 'src/utils/consts';
import { onBeforeMount, ref } from 'vue';
import ShareUser from './ShareUser.vue';

const $q = useQuasar();
const articlesStore = useArticlesStore();

const shareRoleModel = ref({
  label: 'Editor',
  value: 'editor',
});
const shareRoleOptions = [
  {
    label: 'Editor',
    value: 'editor',
  },
  {
    label: 'Reviewer',
    value: 'reviewer',
  },
  {
    label: 'Viewer',
    value: 'viewer',
  },
];

const props = defineProps<{
  article: Article;
  role: Enums<'role'>;
  users?: User[];
}>();

const users = ref<User[]>(props.users ?? []);

onBeforeMount(async () => {
  if (!props.users) {
    users.value = await getUsers(props.article.article_id);
  }
});

const ownerPermission = props.role === 'owner';

type EmittedPermission = {
  permissionId: string;
  role: Enums<'role'>;
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
          `${ENV.MEDIAWIKI_ENDPOINT}/${props.article.language}/index.php?title=${props.article.article_id}`,
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
      `${ENV.MEDIAWIKI_ENDPOINT}/${props.article.language}/index.php?title=${props.article.article_id}`,
    );
    $q.notify({
      message: 'Publish link copied to clipboard',
      caption: 'Dont forget to apply changes',
      color: 'positive',
      icon: 'content_copy',
    });
  }
}

async function copyShareLinkToClipboard() {
  const token = await createLink(
    `${props.article.article_id}`,
    shareRoleModel.value.value as Enums<'role'>,
  );
  if (!token) {
    throw Error('Failed to create share link');
  }
  await copyToClipboard(`${window.location.origin}/shares/${token}`);
  $q.notify({
    message: 'Share link copied to clipboard',
    caption: `This link will expire in ${SHARE_LINK_DAY_LIMIT * HOURS_IN_DAY} hours`,
    color: 'positive',
    icon: 'content_copy',
  });
}
</script>
