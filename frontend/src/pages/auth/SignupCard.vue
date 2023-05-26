<template>
  <q-card style="min-width: 25vw" class="q-pa-md q-mb-xl bg-secondary">
    <q-card-section>
      <p class="text-h5 text-center">Create new account</p>
    </q-card-section>
    <q-card-section>
      <q-form ref="myform" @submit.prevent="handleSignup">
        <q-input
          v-model="username"
          class="q-mb-md"
          bg-color="white"
          outlined
          bottom-slots
          label="Username"
          lazy-rules
          :rules="[(val) => (val && val.length > 0) || 'Enter your username.']"
          :error="!!signupError"
        >
          <template #prepend>
            <q-icon name="person" />
          </template>
          <template v-if="!username" #hint> Enter your username. </template>
        </q-input>
        <q-input
          v-model="email"
          class="q-mb-md"
          bg-color="white"
          outlined
          bottom-slots
          label="Email"
          type="email"
          lazy-rules
          :rules="[
            (val) => (val && val.length > 0) || 'Enter your email.',
            isValidEmail,
          ]"
          :error="!!signupError"
        >
          <template #prepend>
            <q-icon name="email" />
          </template>
          <template v-if="!email" #hint> Enter your email. </template>
        </q-input>
        <q-input
          v-model="password"
          class="q-mb-md"
          bg-color="white"
          outlined
          bottom-slots
          label="Password"
          counter
          :type="visibility"
          lazy-rules
          :rules="[(val) => (val && val.length > 0) || 'Enter your password.']"
          :error="!!signupError"
          :error-message="signupError"
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
          label="Sign Up"
          color="green"
          class="full-width q-mt-md"
          type="submit"
        >
        </q-btn>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import supabaseClient from 'src/api/supabase';
import { ref } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const email = ref('');
const password = ref('');
const username = ref('');

const signupError = ref('');

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

async function handleSignup() {
  try {
    // Use the Supabase provided method to handle the signup
    const { error } = await supabaseClient.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          username: username.value,
        },
      },
    });
    if (error) throw error;
    $q.notify({ message: 'Signed up', icon: 'login', color: 'primary' });
  } catch (error: any) {
    console.error(error.message);
    signupError.value = error.message;
  }
}
</script>

<style scoped lang="scss"></style>
