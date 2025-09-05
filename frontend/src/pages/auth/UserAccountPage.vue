<template>
  <div class="row justify-center">
    <q-page padding style="width: 80vw">
      <div class="col-1 flex items-center q-pt-lg">
        <q-btn flat icon="arrow_back" round @click="goToHome()" />
        <div class="text-h5 merriweather">Account Settings</div>
      </div>

      <div v-if="computedStep !== 0" class="q-my-lg">
        <q-stepper
          ref="stepperRef"
          v-model="step"
          color="primary"
          animated
          flat
          bordered
        >
          <q-step
            :name="1"
            title="Link your account"
            icon="link"
            active-icon="none"
            :done="step > 1"
          >
            <q-input
              v-model="emailInput"
              bg-color="white"
              dense
              outlined
              type="email"
              class="q-mb-sm"
              :rules="[
                (string) => !!string || 'Email is required',
                (string) =>
                  string.length <= 60 ||
                  'Email must contain 1 to 60 characters.',
                (string) =>
                  emailRegex.test(string) || 'Email format is invalid.',
              ]"
            >
              <template #append>
                <q-btn
                  round
                  dense
                  flat
                  icon="link"
                  :disable="!isValidEmailInput"
                  @click="linkEmail"
                />
              </template>
            </q-input>
            <q-stepper-navigation>
              <q-btn
                label="Link email"
                outline
                unelevated
                icon="link"
                :disable="!isValidEmailInput"
                @click="linkEmail"
              />
            </q-stepper-navigation>
          </q-step>

          <q-step
            :name="2"
            title="Verify your account"
            icon="hourglass_empty"
            active-icon="none"
            :done="step > 2"
          >
            Awaiting verification, Please verify your email
            <q-input
              v-model="OTPtoken"
              bg-color="white"
              type="number"
              maxlength="6"
              dense
              outlined
              class="q-mb-sm"
              label="Enter the OTP code"
              counter
              :hint="`Sent to '${changeEmail}'`"
              :rules="[
                (string) =>
                  (!!string && string.length === 6) ||
                  'OTP must be 6 characters long.',
              ]"
            />
            <q-stepper-navigation>
              <q-btn
                :disable="!isValidOTP"
                label="Verify"
                outline
                unelevated
                icon="check"
                @click="verifyOTP"
              />
              <q-btn
                flat
                color="primary"
                label="Back"
                class="q-ml-sm"
                @click="stepperRef.previous()"
              />
            </q-stepper-navigation>
          </q-step>

          <q-step
            :name="3"
            title="Set password"
            icon="lock_open"
            active-icon="none"
          >
            <UpdatePassword :prepare-new-account="prepareNewAccount" />
          </q-step>
        </q-stepper>
      </div>

      <!-- Display Name Section -->
      <div class="q-my-lg">
        <h2 class="text-h6 merriweather q-mb-xs">Display name</h2>
        <p class="text-body1">You can change your display name here.</p>

        <q-input
          v-model="nameInput"
          :readonly="!hasPassword"
          :hint="
            !hasPassword
              ? 'You can change your name once you have successfully linked your account'
              : ''
          "
          bg-color="white"
          dense
          outlined
          class="q-mb-sm"
          :rules="[
            (string) =>
              string.length <= 30 ||
              'Display Name must contain less than 30 characters.',
            (string) =>
              string !== displayName ||
              'Display Name must be different from the current one.',
          ]"
        >
          <template #append>
            <q-btn
              round
              dense
              flat
              icon="check"
              :disable="!isValidNameInput"
              @click="setDisplayName(false)"
            />
          </template>
        </q-input>
      </div>

      <!-- Profile Picture Section -->
      <div class="q-my-lg">
        <h2 class="text-h6 merriweather q-mb-xs">Profile Picture</h2>
        <div>
          <img
            :src="picture"
            style="width: 168px"
            referrerpolicy="no-referrer"
          />
          <br />
          <LoadingButton
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
          </LoadingButton>
        </div>
      </div>

      <!-- Change Password Section -->
      <div v-if="userStore?.user?.email" class="q-my-lg">
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
            <LoadingButton
              show
              close-popup
              color="negative"
              label="Delete"
              styling="width: 10em;"
              :loading="deletingAccount"
              :on-click="deleteAccount"
            >
              Deleting
            </LoadingButton>
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-page>
  </div>
</template>
<script setup lang="ts">
import { useQuasar } from 'quasar';
import supabaseClient from 'src/api/supabase';
import { deleteUser } from 'src/api/supabaseHelper';
import UpdatePassword from 'src/components/Auth/UpdatePassword.vue';
import LoadingButton from 'src/components/LoadingButton.vue';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';
import { computed, onBeforeMount, ref } from 'vue';
import { useRouter } from 'vue-router';

const $q = useQuasar();
const $router = useRouter();
const userStore = useUserStore();
const articlesStore = useArticlesStore();

const revertingImage = ref(false);
const deletingAccount = ref(false);
const showDeleteModal = ref(false);

const picture = computed(() => userStore.user?.avatar_url);
const defaultAvatar = computed(() => userStore.user?.default_avatar);
const displayName = computed(() => userStore.user?.display_name);

const isAnon = computed(() => !Boolean(userStore.user?.email));
const changeEmail = computed(() => userStore.user?.email_change);
const isUninitializedUser = computed(
  () => isAnon.value && !Boolean(changeEmail.value),
);
const hasPassword = computed(() => Boolean(userStore.user?.has_password));
const hasEmailProvider = computed(() => userStore.user?.has_email_provider);

const stepperRef = ref();
const computedStep = computed(() => {
  if (isUninitializedUser.value) return 1;
  else if (isAnon.value) return 2;
  else if (!hasPassword.value && hasEmailProvider.value) return 3;
  else return 0;
});
const step = ref();

function updateStepper() {
  step.value = computedStep.value;
}

const nameInput = ref(displayName.value);
const isValidNameInput = computed(
  () =>
    nameInput.value !== undefined &&
    nameInput.value !== null &&
    nameInput.value.length <= 30 &&
    nameInput.value !== displayName.value,
);

async function revertImage() {
  revertingImage.value = true;
  await supabaseClient.functions.invoke('user/avatar', { method: 'POST' });
  await userStore.fetchProfile();
  $q.notify({
    message: 'Reverted to default avatar picture',
    icon: 'check',
    color: 'positive',
  });
  revertingImage.value = false;
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
    const { error } = await supabaseClient.auth.signOut();
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
    showDeleteModal.value = false;
    deletingAccount.value = false;
    throw error;
  } finally {
    deletingAccount.value = false;
  }
}

const emailInput = ref();
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const isValidEmailInput = computed(
  () =>
    emailInput.value &&
    emailInput.value.length > 0 &&
    emailInput.value.length <= 30 &&
    emailRegex.test(emailInput.value),
);

async function linkEmail() {
  const { error } = await supabaseClient.auth.updateUser({
    email: emailInput.value,
  });

  if (error) {
    $q.notify({
      message: 'Error linking email',
      caption: error.message,
      icon: 'error',
      color: 'negative',
    });
    return;
  }
  $q.notify({
    message: 'A confirmation email has been sent to your email address',
    icon: 'check',
  });

  await userStore.fetchProfile();
  updateStepper();
}
const OTPtoken = ref('');
const isValidOTP = computed(() => OTPtoken.value.length === 6);
async function verifyOTP() {
  if (!userStore.user?.email_change) return;
  const { error } = await supabaseClient.auth.verifyOtp({
    email: userStore.user.email_change,
    token: OTPtoken.value,
    type: 'email_change',
  });
  if (error) {
    $q.notify({
      message: 'Error verifying OTP',
      caption: error.message,
      icon: 'error',
      color: 'negative',
    });
    return;
  }
  $q.notify({
    message: 'Email successfully verified',
    caption: 'Please set your password',
    icon: 'check',
  });
  await userStore.fetchProfile();
  updateStepper();
}
async function setDisplayName(remove?: boolean) {
  const { error } = await supabaseClient.auth.updateUser({
    data: { display_name: remove ? null : nameInput.value },
  });
  if (error) {
    $q.notify({
      message: 'Error setting name',
      caption: error.message,
      icon: 'error',
      color: 'negative',
    });
    return;
  }
  if (defaultAvatar.value)
    await supabaseClient.functions.invoke('user/avatar', { method: 'POST' });
  $q.notify({
    message: 'Successfully updated display name',
    icon: 'check',
  });
  await userStore.fetchProfile();
  nameInput.value = userStore.user?.display_name || '';
}

async function prepareNewAccount() {
  await setDisplayName(true);
  await userStore.fetchProfile();
}

onBeforeMount(async () => {
  await userStore.fetchProfile();
  updateStepper();
  emailInput.value = userStore.user?.email_change || '';
});
</script>

<style scoped>
a {
  color: var(--q-primary);
  text-decoration: none;
}
</style>
