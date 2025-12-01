<template>
  <div class="row justify-center">
    <q-page padding style="width: 80vw">
      <div class="col-1 flex items-center q-pt-lg">
        <q-btn flat icon="arrow_back" round @click="goToHome()" />
        <div class="text-h5 merriweather">Account Settings</div>
      </div>

      <div v-if="computedStep !== 0" class="q-my-lg">
        <h2 class="text-h6 merriweather q-mb-xs">Link your account</h2>
        <p class="text-body1 q-mb-none">
          Convert your anonymous account to a permanent user.
        </p>
        <q-stepper
          ref="stepperRef"
          v-model="step"
          color="primary"
          animated
          flat
        >
          <q-step
            :name="1"
            prefix="1"
            title="Link your email"
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
            <q-stepper-navigation class="q-pt-none flex justify-end">
              <q-btn
                label="Link email"
                unelevated
                color="primary"
                icon="link"
                :disable="!isValidEmailInput"
                @click="linkEmail"
              />
            </q-stepper-navigation>
          </q-step>

          <q-step
            :name="2"
            prefix="2"
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
            <q-stepper-navigation class="q-pt-none flex justify-end">
              <q-btn
                flat
                color="primary"
                label="Back"
                class="q-ml-sm"
                @click="stepperRef.previous()"
              />
              <q-btn
                :disable="!isValidOTP"
                label="Verify"
                unelevated
                color="primary"
                icon="check"
                @click="verifyOTP"
              />
            </q-stepper-navigation>
          </q-step>

          <q-step
            :name="3"
            prefix="3"
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
          :disable="!hasPassword"
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
      <!-- LLM Reviewer Agent Section -->
      <div class="q-my-lg">
        <h2 class="text-h6 merriweather q-mb-xs">LLM Reviewer Agent</h2>
        <p class="text-body1 q-mb-md">
          Configure your AI reviewer with OpenRouter API.
        </p>
        <!-- API Key Status & Input -->
        <div class="q-mb-md">
          <label class="text-subtitle2 q-mb-xs block">OpenRouter API Key</label>
          <!-- Key Status Banner -->
          <div v-if="!apiKey.showInput && apiKey.hasKey" class="q-mb-sm">
            <q-banner rounded class="bg-primary text-white">
              <template #avatar>
                <q-icon name="lock" />
              </template>
              Your API Key is safely stored and encrypted in our secrets vault
              <template #action>
                <q-btn
                  flat
                  dense
                  label="Update"
                  @click="apiKey.showInput = true"
                />
                <q-btn
                  flat
                  dense
                  label="Remove"
                  @click="apiKeyActions.confirmRemove"
                />
              </template>
            </q-banner>
          </div>
          <!-- Key Input -->
          <q-input
            v-if="apiKey.showInput || !apiKey.hasKey"
            v-model="apiKey.input"
            bg-color="white"
            dense
            outlined
            type="password"
            placeholder="sk-or-v1-..."
            hint="Your API Key is safely stored encrypted in our secrets vault"
            class="q-mb-sm"
            @blur="loadModelsFromAPI"
          >
          </q-input>
          <!-- Action Buttons -->
          <div
            v-if="apiKey.showInput && apiKey.hasKey"
            class="flex q-gutter-sm"
          >
            <q-btn
              flat
              size="sm"
              color="primary"
              label="Cancel"
              @click="apiKeyActions.cancel"
            />
          </div>
        </div>
        <!-- Remove API Key Confirmation Dialog -->
        <q-dialog v-model="apiKey.showRemoveDialog">
          <q-card>
            <q-toolbar class="borders">
              <q-toolbar-title class="merriweather">
                Remove API Key
              </q-toolbar-title>
              <q-btn v-close-popup flat round dense icon="close" size="sm" />
            </q-toolbar>
            <q-card-section>
              Are you sure you want to remove your API key? You'll need to enter
              it again to use AI features.
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
                label="Remove"
                :loading="apiKey.removing"
                :on-click="apiKeyActions.remove"
              >
                Removing
              </LoadingButton>
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Model Search -->
        <div class="q-mb-md">
          <label class="text-subtitle2 q-mb-xs block">AI Model</label>
          <q-select
            v-model="llmConfig.model"
            :options="filteredModelOptions"
            bg-color="white"
            dense
            outlined
            use-input
            hide-selected
            fill-input
            input-debounce="300"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            placeholder="Search for a model..."
            :loading="loadingModels"
            hint="Start typing to search models"
            @filter="filterModels"
            @popup-show="loadModelsFromAPI"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey">
                  No models found
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        <!-- Prompt Input -->
        <div class="q-mb-md">
          <label class="text-subtitle2 q-mb-xs block">Review Prompt</label>
          <q-input
            v-model="llmConfig.prompt"
            bg-color="white"
            dense
            outlined
            autogrow
            type="textarea"
            rows="4"
            placeholder="Enter your review prompt template..."
            hint="Instructions for the AI reviewer"
            counter
            maxlength="4000"
          />
        </div>

        <!-- Save Button -->
        <div class="flex justify-end">
          <LoadingButton
            :show="true"
            :loading="savingLLMConfig"
            color="primary"
            label="Save AI Settings"
            :on-click="saveLLMConfig"
          >
            Saving
          </LoadingButton>
        </div>
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

interface ModelOption {
  id: string;
  name: string;
  context: number;
}

interface OpenRouterModel {
  id: string;
  context_length: number;
}

const DEFAULT_PROMPT = `**Prompt for Mira (Wikipedia Editing Assistant):**

You are Mira, a Wikipedia editing assistant. You will receive one paragraph at a time (in MediaWiki markup). Your role is to review the **content only**, focusing on three aspects:

1. **Readability** - clarity, grammar, logical flow.
2. **Eloquence** - concise, neutral, and smooth phrasing.
3. **Wikipedia Eligibility Criteria** -

   * **Neutral Point of View (NPOV):** No bias, promotion, or subjective judgments.
   * **Verifiability:** Wording must allow support by reliable, published sources.
   * **Encyclopedic Style:** Formal, factual, impersonal tone.

**Response format:** Always reply in JSON with two fields:

\`\`\`json
{
  "comment": "A brief and kind note on whether a change helps or not.",
  "proposed_change": "The smallest necessary modification to the paragraph, or 'No changes needed.'"
}
\`\`\`

Guidelines:

* Keep comments **very short and supportive**.
* Always suggest the **minimalist change** needed, never over-edit.
* If the paragraph is fine, still return JSON with a positive comment and "No changes needed."
* **Less is more. Stay concise. Focus on meaning, not formatting.**

If no change is needed, Mira must still return this JSON format with a positive comment and "No changes needed." Less is more, be as concise as possible`;

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
    emailInput.value.length <= 60 &&
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

const llmConfig = ref({
  prompt: '',
  model: '',
});

const apiKey = ref({
  input: '',
  hasKey: false,
  showInput: false,
  removing: false,
  showRemoveDialog: false,
});

const allModelOptions = ref<ModelOption[]>([]);
const filteredModelOptions = ref<ModelOption[]>([]);
const loadingModels = ref(false);
const savingLLMConfig = ref(false);

async function updateLLMConfigInDB(updates: {
  has_api_key?: boolean;
  model?: string | null;
}) {
  const userId = userStore.user?.id;
  if (!userId) return;

  const { error } = await supabaseClient
    .from('profiles')
    .update({
      llm_reviewer_config: {
        prompt: llmConfig.value.prompt || null,
        model: updates.model ?? llmConfig.value.model,
        has_api_key: updates.has_api_key ?? apiKey.value.hasKey,
      },
    })
    .eq('id', userId);

  if (error) throw error;
}
const apiKeyActions = {
  async saveToVault() {
    if (!apiKey.value.input) return;

    const userId = userStore.user?.id;
    if (!userId) return;

    const { error } = await supabaseClient.rpc('upsert_user_api_key', {
      user_id_param: userId,
      api_key_value: apiKey.value.input,
    });
    if (error) throw error;

    apiKey.value.hasKey = true;
    apiKey.value.showInput = false;
    apiKey.value.input = '';
  },

  async remove() {
    const userId = userStore.user?.id;
    if (!userId) return;

    apiKey.value.removing = true;
    try {
      const { error: vaultError } = await supabaseClient.rpc(
        'delete_user_api_key',
        {
          user_id_param: userId,
        },
      );
      if (vaultError) throw vaultError;

      await updateLLMConfigInDB({ has_api_key: false, model: null });

      apiKey.value.hasKey = false;
      apiKey.value.showInput = false;
      apiKey.value.showRemoveDialog = false;
      llmConfig.value.model = '';
      allModelOptions.value = [];
      filteredModelOptions.value = [];

      $q.notify({
        message: 'API key removed successfully',
        icon: 'check',
        color: 'positive',
      });

      await userStore.fetchProfile();
    } catch (error) {
      console.error('Error removing API key:', error);
      $q.notify({
        message: 'Error removing API key',
        icon: 'error',
        color: 'negative',
      });
    } finally {
      apiKey.value.removing = false;
    }
  },

  cancel() {
    apiKey.value.showInput = false;
    apiKey.value.input = '';
  },

  confirmRemove() {
    apiKey.value.showRemoveDialog = true;
  },
};

async function loadModelsFromAPI() {
  const userId = userStore.user?.id;
  if (!userId) return;

  loadingModels.value = true;
  try {
    let apiKeyValue = '';
    if (apiKey.value.input) {
      apiKeyValue = apiKey.value.input;
    } else if (apiKey.value.hasKey) {
      const { data, error: keyError } = await supabaseClient.rpc(
        'get_user_api_key',
        { user_id_param: userId },
      );
      if (keyError) throw keyError;
      apiKeyValue = data as string;
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKeyValue}`,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch models');

    const data = await response.json();

    allModelOptions.value = data.data
      .map((model: OpenRouterModel) => ({
        id: model.id,
        name: `${model.id} (${model.context_length} tokens)`,
        context: model.context_length,
      }))
      .sort((a: ModelOption, b: ModelOption) => b.context - a.context);

    filteredModelOptions.value = allModelOptions.value.slice(0, 50);
  } catch (error) {
    console.error('Error fetching models:', error);
  } finally {
    loadingModels.value = false;
  }
}

function filterModels(val: string, update: (fn: () => void) => void) {
  if (allModelOptions.value.length === 0) {
    loadModelsFromAPI();
  }

  update(() => {
    if (val === '') {
      filteredModelOptions.value = allModelOptions.value.slice(0, 50);
    } else {
      const needle = val.toLowerCase();
      filteredModelOptions.value = allModelOptions.value
        .filter((model: ModelOption) => model.id.toLowerCase().includes(needle))
        .slice(0, 50);
    }
  });
}

async function saveLLMConfig() {
  const userId = userStore.user?.id;
  if (!userId) return;

  savingLLMConfig.value = true;
  try {
    if (apiKey.value.input) {
      await apiKeyActions.saveToVault();
      await updateLLMConfigInDB({ has_api_key: true });
    } else {
      await updateLLMConfigInDB({});
    }

    $q.notify({
      message: 'AI settings saved successfully',
      icon: 'check',
      color: 'positive',
    });

    await userStore.fetchProfile();
    if (apiKey.value.hasKey) await loadModelsFromAPI();
  } catch (error) {
    console.error('Error saving AI settings:', error);
    $q.notify({
      message: 'Error saving AI settings',
      icon: 'error',
      color: 'negative',
    });
  } finally {
    savingLLMConfig.value = false;
  }
}
async function loadLLMConfig() {
  const config = userStore.user?.llm_reviewer_config;
  if (config) {
    llmConfig.value = {
      prompt: config.prompt || DEFAULT_PROMPT,
      model: config.model || '',
    };
    apiKey.value.hasKey = config.has_api_key || false;

    if (apiKey.value.hasKey) {
      await loadModelsFromAPI();
    }
  } else {
    llmConfig.value.prompt = DEFAULT_PROMPT;
  }
}

onBeforeMount(async () => {
  await userStore.fetchProfile();
  updateStepper();
  emailInput.value = userStore.user?.email_change || '';
  await loadLLMConfig();
});
</script>

<style>
a {
  color: var(--q-primary);
  text-decoration: none;
}

.q-stepper__step-inner {
  padding: 0 !important;
}
</style>
