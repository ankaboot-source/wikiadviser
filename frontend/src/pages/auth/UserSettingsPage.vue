<script setup lang="ts">
import supabase from 'src/api/supabase';
import { QSpinner, useQuasar } from 'quasar';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { Session } from '@supabase/supabase-js';
import { deleteUser } from 'src/api/supabaseHelper';
import { DEFAULT_AVATAR_URL } from 'src/utils/consts';

const session = ref<Session | null>();
const email = ref('');
const picture = ref('');
const $q = useQuasar();
const articlesStore = useArticlesStore();
const defaultImage = ref(false);

const $router = useRouter();

const isLoading = ref(false);

const showDeleteModal = ref(false);

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
    email.value = session.value?.user.email as string;
    picture.value = session.value?.user.user_metadata.picture;
    defaultImage.value = picture.value.indexOf(DEFAULT_AVATAR_URL) !== -1;
  });
});

async function revertImage() {
  $q.loading.show({
    boxClass: 'bg-white text-blue-grey-10 q-pa-xl',

    spinner: QSpinner,
    spinnerColor: 'primary',
    spinnerSize: 140,

    message: `
      <div class='text-h6'>Reverting picture</div>
      </br>
      <div class='text-body1'>Please wait…</div>
    `,
    html: true,
  });
  try {
    await supabase.functions.invoke('user-avatar', { method: 'DELETE' });
    $q.loading.hide();
    $q.notify({
      message: 'Reverted to default avatar picture.',
      icon: 'check',
      color: 'positive',
    });
    defaultImage.value = true;
  } catch (error) {
    $q.loading.hide();
    if (error instanceof Error) {
      console.error(error.message);
      $q.notify({
        message: error.message,
        color: 'negative',
      });
    } else {
      console.error(error);
      $q.notify({
        message: 'Whoops, something went wrong while reverting picture',
        color: 'negative',
      });
    }
  }
}

function showWarning() {
  showDeleteModal.value = true;
}

function goToHome() {
  $router.push('/');
}

async function deleteAccount() {
  $q.loading.show({
    boxClass: 'bg-white text-dark q-pa-xl',

    spinner: QSpinner,
    spinnerColor: 'primary',
    spinnerSize: 140,

    message: `
        <div class='text-h6'>Deleting “${email.value}”  </div></br>
        <div class='text-body1'>Please wait…</div>`,
    html: true,
  });
  try {
    await deleteUser();
    $q.loading.hide();
    $q.notify({
      message: 'User deleted.',
      icon: 'check',
      color: 'positive',
    });
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    articlesStore.resetArticles();

    document.location.href = '/';
  } catch (error) {
    $q.loading.hide();
    if (error instanceof Error) {
      console.error(error.message);
      $q.notify({
        message: error.message,
        color: 'negative',
      });
    } else {
      console.error(error);
      $q.notify({
        message: 'Whoops, something went wrong while deleting article',
        color: 'negative',
      });
    }
  }
}
</script>

<template>
  <div class="col q-panel q-py-lg">
    <div class="row justify-center">
      <q-page padding style="width: 80vw">
        <div class="col-1 flex items-center">
          <q-btn flat icon="arrow_back" round @click="goToHome()" />
          <div class="text-h5 merriweather">Account</div>
        </div>

        <!-- Remove Image Section -->
        <div class="q-my-lg">
          <h2 class="text-h6 merriweather q-mb-xs">Profile Picture</h2>
          <div>
            <img :src="picture" style="width: 168px;"/>
            <br />
            <q-btn
              v-if="!defaultImage"
              no-caps
              outline
              class="text-sm"
              icon="no_photography"
              label="Revert to default avatar"
              color="primary"
              unelevated
              @click="revertImage"
            />
          </div>
        </div>

        <!-- Change Password Section -->
        <div class="q-my-lg">
          <a class="text-h6 merriweather q-mb-xs" href="/auth/update_password">
            Change Password
            <q-icon name="open_in_new" style="top: -2px" />
          </a>
        </div>

        <!-- Delete Account Section -->
        <div class="q-my-lg">
          <h2 class="text-h6 merriweather q-mb-xs">Delete Account</h2>
          <p class="text-body1">
            You can permanently delete your account including your data. You can't
            undo this action.
          </p>
          <q-btn
            no-caps
            outline
            class="text-sm"
            icon="delete"
            label="Delete my account"
            color="negative"
            unelevated
            @click="showWarning"
          />
        </div>

        <!-- Warning model Section -->
        <q-dialog v-model="showDeleteModal">
          <q-card>
            <q-toolbar class="borders">
              <q-toolbar-title class="merriweather"> Delete User </q-toolbar-title>
              <q-btn v-close-popup flat round dense icon="close" size="sm" />
            </q-toolbar>
            <q-card-section>
              All your personal data will be deleted. Other data will be anonymized.
            </q-card-section>
            <q-card-actions class="borders">
              <q-space />
              <q-btn v-close-popup no-caps outline color="primary" label="Cancel" />
              <q-btn
                v-close-popup
                unelevated
                color="negative"
                no-caps
                label="Delete"
                :loading="isLoading"
                @click="deleteAccount"
              />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </q-page>
    </div>
  </div>
</template>

<style scoped>
a {
  color: var(--q-primary);
  text-decoration: none;
}
</style>
