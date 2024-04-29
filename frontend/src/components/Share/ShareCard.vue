<template>
  <q-card style="min-width: 30vw">
    <q-toolbar class="bg-white borders">
      <q-toolbar-title class="merriweather">Share settings</q-toolbar-title>
      <q-btn v-close-popup flat round dense icon="close" size="sm" />
    </q-toolbar>

    <q-card-section v-if="ownerPermission">
      <div class="text-h6 text-weight-regular">Share link</div>
      <div class="q-mr-sm row no-wrap items-center">
        Anyone with this link will be a
        <q-select
          v-model="shareRoleModel"
          :options="shareRoleOptions"
          class="q-ml-sm text-capitalize"
          dense
        />
        <q-space />
        <q-btn
          icon="content_copy"
          outline
          label="Create share link"
          no-caps
          class="q-mr-xs"
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
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import { copyToClipboard, useQuasar } from 'quasar';
import supabase from 'src/api/supabase';
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
import { Article, Enums, Permission, Profile, Tables, User } from 'src/types';
import { EXPIRATION_DAYS, HOURS_IN_DAY } from 'src/utils/consts';
import { onBeforeMount, onBeforeUnmount, ref } from 'vue';
import ShareUser from './ShareUser.vue';

const $q = useQuasar();
const articlesStore = useArticlesStore();

const shareRoleModel = ref({
  label: 'Reviewer',
  value: 'reviewer',
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
}>();
const users = ref<User[]>();

const ownerPermission = props.role === 'owner';

const realtimeChannel: RealtimeChannel = supabase.channel('db-changes');

async function handlePermissionsRealtime(
  payload: RealtimePostgresChangesPayload<Tables<'permissions'>>,
) {
  if (payload.eventType === 'UPDATE') {
    const updatedPermission = payload.new as Tables<'permissions'>;
    const userToUpdate = users.value!.find(
      (user) => user.permissionId === updatedPermission.id,
    );
    if (userToUpdate) {
      userToUpdate.role = updatedPermission.role!;
    }
  }

  if (payload.eventType === 'INSERT') {
    {
      users.value = await getUsers(props.article.article_id);
    }
  }

  if (payload.eventType === 'DELETE') {
    users.value = users.value!.filter(
      (user) => user.permissionId !== payload.old.id,
    );
  }
}

onBeforeMount(async () => {
  users.value = await getUsers(props.article.article_id);
  realtimeChannel
    .on<Tables<'permissions'>>(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'permissions',
        filter: `article_id=eq.${props.article.article_id}`,
      },
      handlePermissionsRealtime,
    )
    .subscribe();
});

onBeforeUnmount(() => {
  realtimeChannel.unsubscribe();
});

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
    caption: `This link will expire in ${EXPIRATION_DAYS * HOURS_IN_DAY} hours`,
    color: 'positive',
    icon: 'content_copy',
  });
}
</script>
