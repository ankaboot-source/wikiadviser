<script setup lang="ts">
import supabase from 'src/api/supabase';
import { QSpinnerGrid, useQuasar } from 'quasar';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { Session } from '@supabase/supabase-js';
import { deleteUser } from 'src/api/supabaseHelper';

const session = ref<Session | null>();
const email = ref('');
const picture = ref('');
const $q = useQuasar();
const articlesStore = useArticlesStore();

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
  });
});

async function revertImage() {
  await supabase.functions.invoke('user-avatar', { method: 'DELETE' });
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

    spinner: QSpinnerGrid,
    spinnerColor: 'primary',
    spinnerSize: 140,

    message: `
        <div class='text-h6'> Deleting “${email.value}”  </div></br>
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
  <q-layout view="lHh Lpr lFf">
    <app-header />
    <q-page-container>
      <q-page padding>
        <div class="flex items-center">
          <q-btn flat icon="arrow_back" round @click="goToHome()" />
          <div class="text-h5 merriweather">Account</div>
        </div>

        <!-- Remove Image Section -->
        <div style="width: 13vw">
          <h2 class="text-h6 merriweather q-mb-xs">Profile Picture</h2>
          <div>
            <img :src="picture" class="full-width" />
            <br />
            <q-btn
              no-caps
              outline
              class="text-sm full-width"
              icon="no_photography"
              label="Revert to default avatar"
              color="primary"
              unelevated
              @click="revertImage"
            />
          </div>
        </div>

        <!-- Change Password Section -->
        <div>
          <h2></h2>
          <a class="text-h6 merriweather q-mb-xs" href="/auth/update_password">
            Change Password
            <q-icon name="open_in_new" style="top: -2px" />
          </a>
        </div>

        <!-- Delete Account Section -->
        <div>
          <h2 class="text-h6 merriweather q-mb-xs">Delete Account</h2>
          <p class="text-body1">
            You can permanently delete your account including your data. You
            can't undo this action.
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
              <q-toolbar-title class="merriweather">
                Delete User
              </q-toolbar-title>
              <q-btn v-close-popup flat round dense icon="close" size="sm" />
            </q-toolbar>
            <q-card-section>
              All your personal data will be deleted. Other data will be
              anonymized.
            </q-card-section>
            <q-card-actions class="borders">
              <q-space />
              <q-btn
                v-close-popup
                no-caps
                outline
                color="primary"
                label="Cancel"
              />
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
    </q-page-container>
  </q-layout>
</template>

<style scoped>
a {
  color: var(--q-primary);
  text-decoration: none;
}
</style>
