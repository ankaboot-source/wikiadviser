<template>
  <q-page>
    <q-form
      ref="myform"
      class="square-card row justify-center q-pt-xl"
      @submit.prevent="handleSignin"
    >
      <q-card class="q-pa-sm bg-secondary">
        <q-card-section>
          <p class="col-12 text-h5 text-center">Sign in to WikiAdviser</p>
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
              :type="visibility"
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
                  :name="visibility == 'text' ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="changeTypeEdit()"
                ></q-icon>
              </template>
              <template v-if="!password" #hint> Enter your password. </template>
            </q-input>
            <q-btn
              label="Login"
              color="primary"
              class="full-width"
              type="submit"
            ></q-btn>
            <q-btn
              label="Create new account"
              color="green"
              class="full-width"
              @click="signUp = !signUp"
            ></q-btn>
            <q-btn
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
    <q-dialog v-model="signUp"> <signup-card /></q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import supabaseClient from 'src/api/supabase';
import SignupCard from './SignupCard.vue';
import { useQuasar } from 'quasar';
import { ref } from 'vue';

const $q = useQuasar();
const email = ref('');
const password = ref('');

const signUp = ref(false);
const signinError = ref('');

const visibility = ref('password' as 'password' | 'text');
function changeTypeEdit() {
  if (visibility.value == 'text') {
    visibility.value = 'password';
  } else {
    visibility.value = 'text';
  }
}
function isValidEmail(val: string) {
  const emailPattern =
    /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/;
  return emailPattern.test(val) || 'Invalid email format.';
}

async function handleSignin() {
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    if (error) throw error;
    $q.notify({ message: 'Signed in', icon: 'login', color: 'primary' });
  } catch (error: any) {
    console.error(error.message);
    signinError.value = error.message;
  }
}

async function handleForgotPassword() {
  return;
}
</script>

<style lang="scss"></style>
