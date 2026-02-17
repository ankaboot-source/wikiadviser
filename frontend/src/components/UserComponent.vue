<template>
  <div :class="`${section} user`">
    <q-avatar size="sm">
      <img
        :src="isMiraUser ? '/icons/logo.svg' : avatarUrl"
        referrerpolicy="no-referrer"
      />
    </q-avatar>
    <span class="username q-ml-sm ellipsis">
      {{ name }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import env from 'src/schema/env.schema';

const { avatarUrl, name, email } = defineProps<{
  avatarUrl: string | undefined;
  name: string;
  section: 'profile' | 'revision';
  email?: string;
}>();

const isMiraUser = computed(() => {
  const userEmail = email || name;
  return userEmail === env.AI_BOT_EMAIL;
});
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

@media screen and (max-width: 390px) {
  .revision {
    max-width: 10rem;
  }
}
@media screen and (min-width: 391px) and (max-width: 599px) {
  .revision {
    max-width: 12rem;
  }
}

@media screen and (min-width: 601px) and (max-width: 1024px) {
  .revision {
    max-width: 50vw;
  }
}

@media screen and (min-width: 1025px) and (max-width: 1440px) {
  .revision {
    max-width: 15vw;
  }
}

@media screen and (min-width: 1441px) and (max-width: 1920px) {
  .revision {
    max-width: 15vw;
  }
}
</style>
