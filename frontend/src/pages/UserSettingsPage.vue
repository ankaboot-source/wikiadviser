
<script setup lang="ts">
  import supabase from 'src/api/supabase';
  import { Session } from '@supabase/supabase-js';
  import { ref, onMounted } from 'vue';

  const session = ref<Session | null>();
  const email = ref('');
  const firstName = ref('');
  const lastName = ref('');
  const password = ref('');
  const passwordConfirm = ref('');

  onMounted(async () => {
    const { data } = await supabase.auth.getSession();
    session.value = data.session;
    supabase.auth.onAuthStateChange((_, _session) => {
      session.value = _session;
      email.value = session.value?.user.email as string;
    });
  });

  const save = () => {
    const user = {
      email: email.value,
      firstName: firstName.value,
      lastName: lastName.value,
      password: password.value,
      passwordConfirm: passwordConfirm.value
    }

    console.log(user);
    console.error(password.value === passwordConfirm.value);
  }
</script>

<template>
  <div class="q-panel scroll col">
    <div class="row justify-evenly q-pa-sm">
      <diff-list class="col q-mr-md rounded-borders q-pa-md q-mt-xs bg-secondary borders"/>
      <diff-card class="col-6 q-mr-md rounded-borders q-pa-lg q-mt-xs borders">
        <div>
          <h2>Change user information here</h2>
          <div class="gap-y-4">
            <q-input outlined v-model="email" type="email" label="Email" disable readonly />
            <div class="row mt-4">
              <q-input outlined class="w-half" v-model="firstName" type="text" label="First name" />
              <q-input outlined class="w-half ml-4" v-model="lastName" type="text" label="Last name" />
            </div>
            <div class="row mt-4">
              <q-input outlined class="w-half" v-model="password" type="password" label="Password" />
              <q-input outlined class="w-half ml-4" v-model="passwordConfirm" type="password" label="Password confirm" />
            </div>
          </div>
        </div>
        <q-btn class="save" @click="save">Save changes</q-btn>
      </diff-card>
      <diff-list class="col q-mr-md rounded-borders q-pa-md q-mt-xs bg-secondary borders">
          <img class="profile" src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=300"/>
          <h2>{{ email }}</h2>
          <q-btn class="btn">upload image</q-btn>
      </diff-list>
    </div>
  </div>
</template>

<style>
  .profile {
    width: 300px;
    height: 300px;
    object-fit: none;
    object-position: 50% 25%;
    border-radius: 50%;
    margin: auto;
  }

  .btn {
    position: absolute;
    width: 10rem;
    height: 4rem;
    right: 3rem;
  }

  .w-half {
    width: calc(50% - 1rem);
  }

  .gap-x-4 {
    column-gap: 1rem;
  }

  .mt-4 {
    margin-top: 1rem;
  }

  .ml-4 {
    margin-left: 1rem;
  }

  .save {
    position: relative;
    bottom: 0;
    width: 10rem;
    height: 4rem;
  }
</style>
