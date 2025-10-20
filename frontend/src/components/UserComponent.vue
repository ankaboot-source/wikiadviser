<template>
  <div :class="`${section} user`">
    <q-avatar size="sm">
      <img :src="avatarUrl" referrerpolicy="no-referrer" />
    </q-avatar>
    <span class="username q-ml-sm ellipsis">
      {{ name }}
    </span>
  </div>
</template>

<script setup lang="ts">
const { avatarUrl, name } = defineProps<{
  avatarUrl: string | undefined;
  name: string;
  section: 'profile' | 'revision';
}>();
</script>

<style scoped>
.user {
  display: flex;
  align-items: center;
  overflow: hidden;
}

.profile {
  width: auto;
  max-width: 20rem;
}

.revision {
  width: auto;
  max-width: 13vw;
}

@media screen and (max-width: 672px) {
  .revision {
    max-width: 12rem;
  }
}

@media screen and (min-width: 601px) and (max-width: 1024px) {
  .revision {
    max-width: 20vw;
  }
}

@media screen and (min-width: 1025px) and (max-width: 1440px) {
  .revision {
    max-width: 12vw;
  }
}

@media screen and (min-width: 1441px) and (max-width: 1920px) {
  .revision {
    max-width: 12vw;
  }
}
</style>
