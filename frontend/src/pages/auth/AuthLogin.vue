<template>
  <q-layout view="hHh lpR fFf">
    <app-header></app-header>
    <q-page-container>
      <q-page>
        <q-form
          class="square-card row justify-center q-pt-xl"
          @submit.prevent="handleSignin"
          ref="myform"
        >
          <q-card class="q-pa-sm" style="background-color: #f6f8fa">
            <q-card-section>
              <p class="col-12 text-h5 text-center">Sign in to WikiAdviser</p>
            </q-card-section>
            <q-card-section>
              <div class="col-md-4 col-sm-6 col-xs-10 q-gutter-y-md">
                <q-input
                  bg-color="white"
                  outlined
                  bottom-slots
                  v-model="form.email"
                  label="Email"
                  type="email"
                  lazy-rules
                  :rules="[
                    (val) => (val && val.length > 0) || 'Enter your email.',
                    isValidEmail,
                  ]"
                >
                  <template v-slot:prepend>
                    <q-icon name="email" />
                  </template>
                  <template v-slot:hint v-if="!form.email">
                    Enter your email.
                  </template>
                </q-input>
                <q-input
                  bg-color="white"
                  outlined
                  bottom-slots
                  v-model="form.password"
                  label="Password"
                  counter
                  :type="visibility"
                  lazy-rules
                  :rules="[
                    (val) => (val && val.length > 0) || 'Enter your password.',
                  ]"
                >
                  <template v-slot:prepend>
                    <q-icon name="lock" />
                  </template>

                  <template v-slot:append>
                    <q-icon
                      :name="
                        visibility == 'text' ? 'visibility_off' : 'visibility'
                      "
                      @click="changeTypeEdit()"
                      class="cursor-pointer"
                    ></q-icon>
                  </template>
                  <template v-slot:hint v-if="!form.password">
                    Enter your password.
                  </template>
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
                  @click="handleSignup"
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
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import supabaseClient from 'src/api/supabase';
import AppHeader from 'src/layouts/AppHeader.vue';
import { ref } from 'vue';

supabaseClient;

const form = ref({
  email: '',
  password: '',
});

const visibility = ref('password' as 'password' | 'text');
function changeTypeEdit() {
  if (visibility.value == 'text') {
    visibility.value = 'password';
  } else {
    visibility.value = 'text';
  }
}
function isValidEmail(val: any) {
  const emailPattern =
    /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/;
  return emailPattern.test(val) || 'Invalid email format.';
}

const handleSignin = async () => {
  try {
    // Use the Supabase provided method to handle the signin
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: form.value.email,
      password: form.value.password,
    });
    if (error) throw error;
    else console.log('SignedIn');
  } catch (error) {
    console.error(error);
  }
};

const handleSignup = async () => {
  try {
    // Use the Supabase provided method to handle the signin
    const { error } = await supabaseClient.auth.signUp({
      email: form.value.email,
      password: form.value.password,
    });

    if (error) throw error;
    else console.log('SignedUp');
  } catch (error) {
    console.log(error);
  }
};

const handleForgotPassword = async () => {
  return;
};
</script>

<style lang="scss"></style>
