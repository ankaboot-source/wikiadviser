<template>
  <q-page>
    <q-form
      class="square-card row justify-center q-pt-xl"
      @submit.prevent="handleSignin"
    >
      <q-card class="q-pa-sm bg-secondary">
        <q-card-section>
          <p class="col-12 text-h5 text-center merriweather">
            Sign in to WikiAdviser
          </p>
        </q-card-section>
        <q-card-section>
          <div class="col-md-4 col-sm-6 col-xs-10 q-gutter-y-md">
            <q-input
              v-model="email"
              autofocus
              bg-color="white"
              outlined
              bottom-slots
              label="Email"
              type="email"
              lazy-rules
              :error="!!signinError"
              :rules="[
                (val) => (val && val.length > 0) || 'Enter your email.',
                isValidEmail,
              ]"
            >
              <template #prepend>
                <q-icon name="email" />
              </template>
              <template v-if="!email" #hint> Enter your email. </template>
            </q-input>
            <q-input
              v-model="password"
              bg-color="white"
              outlined
              bottom-slots
              label="Password"
              counter
              :type="passwordInputVisibility"
              lazy-rules
              :rules="[
                (val) => (val && val.length > 0) || 'Enter your password.',
              ]"
              :error="!!signinError"
              :error-message="signinError"
            >
              <template #prepend>
                <q-icon name="lock" />
              </template>

              <template #append>
                <q-icon
                  :name="
                    passwordInputVisibility == 'text'
                      ? 'visibility_off'
                      : 'visibility'
                  "
                  class="cursor-pointer"
                  @click="changeTypeEdit()"
                ></q-icon>
              </template>
              <template v-if="!password" #hint> Enter your password. </template>
            </q-input>
            <q-btn
              unelevated
              :loading="isLoading"
              label="Login"
              color="primary"
              class="full-width"
              type="submit"
            ></q-btn>
            <q-btn
              unelevated
              label="Create new account"
              color="green"
              class="full-width"
              @click="showSignUpDialog = !showSignUpDialog"
            >
              <q-dialog v-model="showSignUpDialog"> <signup-card /></q-dialog>
            </q-btn>
            <q-btn
              unelevated
              label="Forgot password?"
              color="primary"
              class="full-width"
              outline
              @click="handleForgotPassword"
            ></q-btn>
          </div>
        </q-card-section>
      </q-card>
    </q-form>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import supabaseClient from 'src/api/supabase';
import { ref } from 'vue';
import SignupCard from './SignupCard.vue';

const $q = useQuasar();

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const showSignUpDialog = ref(false);
const signinError = ref('');

const passwordInputVisibility = ref<'password' | 'text'>('password');

function changeTypeEdit() {
  if (passwordInputVisibility.value === 'text') {
    passwordInputVisibility.value = 'password';
  } else {
    passwordInputVisibility.value = 'text';
  }
}
function isValidEmail(val: string) {
  const emailPattern =
    /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/;
  return emailPattern.test(val) || 'Invalid email format.';
}

async function handleSignin() {
  isLoading.value = true;
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    if (error) throw error;
    $q.notify({ message: 'Signed in', icon: 'login', color: 'primary' });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      signinError.value = error.message;
    } else {
      signinError.value = 'Oops, something went wrong';
    }
  } finally {
    isLoading.value = false;
  }
}

async function handleForgotPassword() {
  return;
}
</script>

<style lang="scss"></style>
