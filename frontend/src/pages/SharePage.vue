<script setup lang="ts">
import { api } from 'src/boot/axios';
import { onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();

onBeforeMount(async () => {
  const { params } = useRoute();
  const link = params.token;
  const { status, data } = await api.get(`/share/${link}`);
  if (status === 200) {
    router.push({
      path: `/articles/${data.articleId}`,
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
