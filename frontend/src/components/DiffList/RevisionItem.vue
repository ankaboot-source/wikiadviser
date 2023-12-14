<template>
  <q-expansion-item
    v-model="expanded"
    class="q-mb-md q-mx-sm borders bg-white rounded-borders"
  >
    <template #header>
      <q-item-section class="text-body1">
        <q-item-label>
          Revision {{ revision.revision }}
          <br />
          <q-badge
            text-color="light-blue-1"
            color="light-blue-10"
            class="q-mt-s text-capitalize"
            :label="`${revision.items.length} changes`"
            size="sm"
          >
            <q-tooltip>
              {{ revision.awaiting.length }} Current changes <br />
              {{ revision.reviewed.length }} Reviewed changes
            </q-tooltip>
          </q-badge>
        </q-item-label>

        <q-item-label v-if="!expanded" caption lines="2">
          <q-tooltip>{{ description }}</q-tooltip>
          <div>{{ description }}</div>
        </q-item-label>
      </q-item-section>
      <q-item-section caption top side lines="2">
        <span class="text-black">
          <q-avatar size="sm" icon="person" color="accent" />
          {{ revision.items[0]?.user.email }}</span
        >
        <span style="size: 0.5rem">
          {{ new Date(revision.items[0]?.created_at).toLocaleTimeString() }}
          <br />
          {{ new Date(revision.items[0]?.created_at).toLocaleDateString() }}
        </span>
      </q-item-section>
    </template>

    <!-- Current Changes -->
    <q-list>
      <q-item-label class="q-ma-sm">
        <div>{{ description }}</div>
      </q-item-label>
      <q-expansion-item
        v-if="revision.awaiting.length"
        class="q-mb-md q-mx-sm borders bg-secondary rounded-borders"
        label="Current changes"
      >
        <template #header>
          <q-item-section>
            <q-item-label>
              <q-badge
                text-color="light-blue-1"
                color="light-blue-10"
                class="q-mt-s text-capitalize"
                :label="revision.awaiting.length"
                size="sm"
              />
              Current changes
            </q-item-label>
          </q-item-section>
        </template>
        <q-list>
          <diff-item
            v-for="item in revision.awaiting"
            :key="item.id"
            :item="item"
            :role="role"
          />
        </q-list>
      </q-expansion-item>

      <!-- Review Changes -->
      <q-expansion-item
        v-if="revision.reviewed.length"
        class="q-mb-md q-mx-sm borders bg-secondary rounded-borders"
        label="Reviewed changes"
      >
        <template #header>
          <q-item-section>
            <q-item-label>
              <q-badge
                text-color="light-blue-1"
                color="light-blue-10"
                class="q-mt-s text-capitalize"
                :label="revision.reviewed.length"
                size="sm"
              />
              Reviewed changes
            </q-item-label>
          </q-item-section>
        </template>
        <q-list>
          <diff-item
            v-for="item in revision.reviewed"
            :key="item.id"
            :item="item"
            :role="role"
          />
        </q-list>
      </q-expansion-item>
    </q-list>
  </q-expansion-item>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DiffItem from './DiffItem.vue';
import { ChangesItem, UserRole } from 'src/types';

const props = defineProps<{
  role: UserRole;
  changesList: ChangesItem[];
  revision: {
    revision: number;
    items: ChangesItem[];
    reviewed: ChangesItem[];
    awaiting: ChangesItem[];
  };
}>();
const expanded = ref(false);

const description = 'Revision summary';
</script>
