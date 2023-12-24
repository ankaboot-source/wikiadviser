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

function removeImage() {
  // TODO:
}

function showWarning() {
  showDeleteModal.value = true;
}

function closeWarning() {
  showDeleteModal.value = false;
}

function goToHome() {
  $router.push('/');
}

function changePassword() {
  $router.push('/auth/update_password');
}

async function deleteAccount() {
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
    const user = (await supabase.auth.getSession()).data.session?.user;
    await deleteUser(user?.id as string);
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
          <div class="text-h4">Settings</div>
        </div>
        <h2 class="text-h6 q-mt-xs">Profile Information</h2>

        <!-- Remove Image Section -->
        <div>
          <h2 class="text-h6 q-mb-xs">Profile picture</h2>
          <div>
            <img style="width: 220px" :src="picture" />
            <br />
            <q-btn
              no-caps
              class="text-h6"
              icon="no_photography"
              label="remove image"
              color="negative"
              unelevated
              @click="removeImage"
            />
          </div>
        </div>

        <!-- Change Password Section -->
        <div>
          <h2 class="text-h6 q-mb-xs">Change Password</h2>
          <q-btn
            no-caps
            class="text-h6"
            label="Change Password"
            color="primary"
            unelevated
            @click="changePassword"
          />
        </div>

        <!-- Delete Account Section -->
        <div>
          <h2 class="text-h6 q-mb-xs">Delete Account</h2>
          <p class="text-body1">
            You can permanently delete your account including your data. You
            can't undo this action.
          </p>
          <q-btn
            no-caps
            class="text-h6"
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
            <q-card-section class="row items-center q-card-actions">
              <p class="text-h6 q-ma-none q-mr-md">
                ⚠️ Deleting your account is permanent. You will lose all your
                data.
              </p>
              <q-space />
              <div class="absolute-top-right">
                <q-btn
                  v-close-popup
                  class="q-ma-sm q-pa-sm"
                  flat
                  icon="close"
                  size="sm"
                  color="grey-7"
                ></q-btn>
              </div>
            </q-card-section>
            <q-separator />
            <!-- Buttons -->
            <q-card-actions align="right" class="q-pa-md q-pr-lg">
              <q-btn
                no-caps
                unelevated
                padding="sm md"
                class="secondary-button text-h6"
                label="Cancel"
                @click="closeWarning"
              />
              <q-btn
                no-caps
                unelevated
                padding="sm md"
                color="negative"
                class="text-h6"
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
