<script setup lang="ts">
import supabase from 'src/api/supabase';
import { Session } from '@supabase/supabase-js';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { deleteUser } from 'src/api/supabaseHelper';
import { QSpinnerGrid, useQuasar } from 'quasar';
import { useArticlesStore } from 'src/stores/useArticlesStore';

const session = ref<Session | null>();
const email = ref('');
const picture = ref('');
const router = useRouter();
const showDeleteDialog = ref(false);
const $q = useQuasar();
const articlesStore = useArticlesStore();

function removeImage() {
  // TODO: 
}

function back() {
  router.push({
    path: '/articles',
  });
}

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
    email.value = session.value?.user.email as string;
    picture.value = session.value?.user.user_metadata.picture
      ? session.value?.user.user_metadata.picture
      : `https://ui-avatars.com/api/${email.value}/300/random/fff/1`;
  });
});

async function removeUser() {
  $q.loading.show({
    boxClass: 'bg-white text-blue-grey-10 q-pa-xl',

    spinner: QSpinnerGrid,
    spinnerColor: 'primary',
    spinnerSize: 140,

    message: `
        <div class='text-h6'> Deleting “${email.value}”  </div></br>
        <div class='text-body1'>Please wait…</div>`,
    html: true,
  });
  try {
    let user = (await supabase.auth.getSession()).data.session?.user;
    await deleteUser(user?.id as string);
    $q.loading.hide();
    $q.notify({
      message: 'User deleted.',
      icon: 'check',
      color: 'positive',
    });
    document.cookie = '';
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    articlesStore.resetArticles();
    // showDeleteDialog.value = !showDeleteDialog.value;

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
  <main>
    <div style="display: flex">
      <q-btn
        unelevated
        style="font-size: 1.5rem; font-weight: 500"
        icon="arrow_back"
        @click="back"
      />
      <h2 style="font-size: 2.5rem; font-weight: 500">Settings</h2>
    </div>
    <h3 style="font-size: 1.5rem">Profile picture</h3>
    <img :src="picture" />
    <br />
    <q-btn
      unelevated
      style="
        width: 300px;
        font-size: 1.25rem;
        background-color: #c10015;
        color: #fff;
      "
      icon="no_photography"
      label="remove image"
      @click="removeImage"
    />
    <h3 style="font-size: 1.5rem">Password</h3>
    <a href="/auth/update_password">Change password link</a>
    <h3 style="font-size: 1.5rem">Delete account</h3>
    <p>
      You can permanently delete your account including your mined data. You
      can't undo this action.
    </p>
    <q-btn
      unelevated
      style="
        width: 300px;
        font-size: 1.25rem;
        background-color: #c10015;
        color: #fff;
      "
      icon="delete"
      label="delete account"
      @click="showDeleteDialog = !showDeleteDialog"
    />
    <q-dialog v-model="showDeleteDialog">
      <q-card class="column fit" style="max-width: 50vw; max-height: 20vh" flat>
        <h6 style="margin: 1.25rem 1rem">
          ⚠️ Deleting your account is permanent. You will lose all your data.
        </h6>
        <hr />
        <div
          style="display: flex; position: absolute; bottom: 1rem; right: 1rem"
        >
          <q-btn
            outline
            unelevated
            style="width: 110px; font-size: 1.25rem; margin-right: 1rem"
            label="Cancel"
            @click="showDeleteDialog = !showDeleteDialog"
          />
          <q-btn
            unelevated
            style="
              width: 110px;
              font-size: 1.25rem;
              background-color: #c10015;
              color: #fff;
            "
            label="Delete"
            @click="removeUser"
          />
        </div>
      </q-card>
    </q-dialog>
  </main>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
}

main {
  margin-top: 2rem;
  margin-left: 3rem;
}

h3 {
  margin-bottom: 0;
  padding-bottom: 0;
}
p {
  margin-bottom: 1rem;
}

img {
  width: 300px;
}
</style>
