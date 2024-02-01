<script setup lang="ts">
import supabase from 'src/api/supabase';
import Button from 'src/components/LoadingButton.vue';
import { useQuasar } from 'quasar';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { deleteUser } from 'src/api/supabaseHelper';
import { useUserStore } from 'src/stores/userStore';

const $q = useQuasar();
const $router = useRouter();
const userStore = useUserStore();
const articlesStore = useArticlesStore();

const revertingImage = ref(false);
const deletingAccount = ref(false);
const showDeleteModal = ref(false);

const picture = computed(() => userStore.user?.avatar_url);
const defaultAvatar = computed(() => userStore.user?.default_avatar);

async function revertImage() {
  revertingImage.value = true;
  try {
    await supabase.functions.invoke('user-avatar', { method: 'DELETE' });
    await userStore.fetchProfile();
    $q.notify({
      message: 'Reverted to default avatar picture',
      icon: 'check',
      color: 'positive',
    });
    revertingImage.value = false;
  } catch (error) {
    let message = 'Whoops, something went wrong while reverting picture';

    if (error instanceof Error) {
      message = error.message;
    }

    $q.notify({ message, color: 'negative' });
  }
}

function showWarning() {
  showDeleteModal.value = true;
}

function goToHome() {
  $router.push('/');
}

async function deleteAccount() {
  deletingAccount.value = true;
  try {
    await deleteUser();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    userStore.$resetUser();
    articlesStore.resetArticles();
    $router.push('/auth');
    $q.notify({
      message: 'Your account is successfully deleted',
      icon: 'check',
      color: 'positive',
    });
  } catch (error) {
    let message = 'Whoops, something went wrong while deleting article';

    if (error instanceof Error) {
      message = error.message;
    }

    $q.notify({ message, color: 'negative' });
  }
}
</script>

<template>
  <div class="row justify-center">
    <q-page padding style="width: 80vw">
      <div class="col-1 flex items-center q-pt-lg">
        <q-btn flat icon="arrow_back" round @click="goToHome()" />
        <div class="text-h5 merriweather">Account</div>
      </div>

      <!-- Remove Image Section -->
      <div class="q-my-lg">
        <h2 class="text-h6 merriweather q-mb-xs">Profile Picture</h2>
        <div>
          <img
            :src="picture"
            style="width: 168px"
            referrerpolicy="no-referrer"
          />
          <br />
          <Button
            :show="!defaultAvatar"
            :loading="revertingImage"
            outline
            class-name="text-sm q-mt-xs"
            icon="no_photography"
            color="primary"
            label="Revert to default avatar"
            :on-click="revertImage"
          >
            Reverting to default avatar
          </Button>
        </div>
      </div>

      <!-- Change Password Section -->
      <div class="q-my-lg">
        <a class="text-h6 merriweather q-mb-xs" href="/auth/update-password">
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
            <Button
              show
              close-popup
              color="negative"
              label="Delete"
              styling="width: 10em;"
              :loading="deletingAccount"
              :on-click="deleteAccount"
            >
              Deleting
            </Button>
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-page>
  </div>
</template>

<style scoped>
a {
  color: var(--q-primary);
  text-decoration: none;
}
</style>
