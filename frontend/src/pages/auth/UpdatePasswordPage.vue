<template>
  <q-page class="q-pa-xl d-flex flex-center">
    <q-card-section class="row justify-center q-pt-lg">
      <q-card-section>
        <p class="text-h5 text-center merriweather q-pb-md">
          Create your new password
        </p>
        <UpdatePassword />
      </q-card-section>
    </q-card-section>
  </q-page>
</template>

<script setup lang="ts">
import UpdatePassword from 'src/components/Auth/UpdatePassword.vue';
</script>
