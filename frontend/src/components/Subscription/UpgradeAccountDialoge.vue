<template>
  <q-dialog>
    <q-card>
      <q-toolbar class="borders">
        <q-toolbar-title class="merriweather">
          Upgrade Required</q-toolbar-title
        >
        <q-btn v-close-popup flat round dense icon="close" size="sm" />
      </q-toolbar>
      <q-card-section>
        You're only allowed to have {{ allowedArticles }}. For more articles,
        please upgrade your account.
      </q-card-section>
      <q-card-actions class="borders">
        <q-space />
        <q-btn v-close-popup no-caps outline color="primary" label="Cancel" />
        <q-btn
          unelevated
          color="positive"
          no-caps
          label="↗️ Upgrade account"
          @click="upgrade()"
        >
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { WIKIADVISER_PRICING_PAGE } from 'src/utils/consts';
import { useUserStore } from 'src/stores/userStore';
import { Profile } from 'src/types';
import { computed } from 'vue';

const user = useUserStore().user as Profile;
const allowedArticles = computed(
  () =>
    `${user.allowed_articles} article${user.allowed_articles > 1 ? 's' : ''}`,
);

function upgrade() {
  window.open(WIKIADVISER_PRICING_PAGE, '_blank');
}
</script>
