<script setup lang="ts">
import { verifyLink } from 'src/api/supabaseHelper';
import { ref, onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const valid = ref(true);

onBeforeMount(async () => {
  const { params } = useRoute();
  const token = params.token;
  valid.value = await verifyLink(`${token}`);
  if (valid.value) {
    router.push({
      path: '/',
    });
  }
});
</script>

<template>
  <div v-if="!valid" class="m-auto">
    <img class="center" src="~assets/invalid-link.svg" alt="" />
    <h4 class="w-lg text-center">
      This shared link has expired. Please ask the article's owner for a new
      share link.
    </h4>
  </div>
</template>

<style scoped>
.m-auto {
  margin: auto;
}

.center {
  display: block;
  margin-left: auto;
  margin-right: auto;
  width: 67%;
}

.w-lg {
  width: 60vw;
}
</style>
