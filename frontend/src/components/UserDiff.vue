<script setup lang="ts">
const { avatarUrl, email } = defineProps<{
  avatarUrl: string | undefined;
  email: string;
  className: string;
}>();
</script>

<template>
  <div :class="className">
    <q-avatar size="sm">
      <img :src="avatarUrl" referrerpolicy="no-referrer" />
    </q-avatar>
    <span class="username q-ml-sm">
      {{ email }}
    </span>
  </div>
</template>

<style scoped>
.user {
  display: flex;
  align-items: center;
  overflow: hidden;
}
.profile {
  width: 20rem;
}

.revision {
  width: 13vw;
}

@media screen and (max-width: 672px) {
  .revision {
    width: 2rem;
  }
}

@media screen and (min-width: 601px) and (max-width: 1024px) {
  .revision {
    width: 7vw;
  }
}

@media screen and (min-width: 1025px) and (max-width: 1440px) {
  .revision {
    width: 10vw;
  }
}

@media screen and (min-width: 1441px) and (max-width: 1920px) {
  .revision {
    width: 12vw;
  }
}
</style>
