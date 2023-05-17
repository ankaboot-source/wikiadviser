<template>
  <q-item
    class="app-search__result"
    clickable
    active-class="app-search__result--active"
    @click.prevent.stop="props.entry.onClick"
    @mouseenter="props.entry.onMouseenter"
  >
    <q-item-section>
      <div class="app-search__result-title row items-center q-gutter-sm">
        <div class="col-auto">
          <q-avatar rounded>
            <img
              v-if="!!props.entry?.thumbnail?.source"
              :src="props.entry.thumbnail.source"
            />
          </q-avatar>
        </div>
        <div class="col">
          <div class="doc-token">{{ props.entry.title }}</div>
          <div class="q-pl-sm" v-if="props.entry.description">
            {{ props.entry.description }}
          </div>
        </div>
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup>
const props = defineProps({
  entry: Object,
});
</script>
