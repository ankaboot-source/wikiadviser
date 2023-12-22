<script setup lang="ts">
import { verifyLink } from 'src/api/supabaseHelper';
import { onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();

onBeforeMount(async () => {
  const { params } = useRoute();
  const token = params.token;
  const articleId = await verifyLink(`${token}`);
  if (articleId) {
    router.push({
      path: `/articles/${articleId}`,
    });
  }
});
</script>

<template>
  <div class="m-auto">
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
