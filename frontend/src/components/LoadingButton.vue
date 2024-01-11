<script setup lang="ts">
defineProps<{
  show: boolean;
  icon?: string;
  loading: boolean;
  closePopup?: boolean;
  outline?: boolean;
  color: 'primary' | 'negative';
  label: string;
  styling?: string;
  onClick: () => void;
  className?: string;
}>();
</script>

<template>
  <q-btn
    v-if="show"
    :v-close-popup="closePopup"
    unelevated
    :class="className"
    :color="color"
    :style="styling"
    no-caps
    :icon="icon"
    :outline="outline"
    :label="label"
    :loading="loading"
    @click="onClick"
  >
    <template #loading>
      <q-spinner class="on-left" />
      <slot />
    </template>
  </q-btn>
</template>
