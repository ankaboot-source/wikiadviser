<template>
  <div class="row justify-center q-pt-xl">
    <q-card class="q-pa-xl column" flat style="width: 80vw">
      <q-card-section class="text-center" padding>
        <q-img
          src="/images/subscription/upgrade_image.svg"
          spinner-color="white"
          alt="invalid link"
          height="20.25vh"
          fit="contain"
        />
        <div class="text-h6 q-pt-lg">Upgrade Required</div>
        <div class="text-body2 q-mt-md q-mb-lg">
          You're only allowed to have {{ allowedArticlesCount }}. For more
          articles, please upgrade your account.
        </div>
        <q-btn
          no-caps
          unelevated
          color="positive"
          label="↗️ Upgrade account"
          @click="upgrade()"
        />
      </q-card-section>
    </q-card>
  </div>
</template>
<script setup lang="ts">
import { WIKIADVISER_PRICING_PAGE } from 'src/utils/consts';
import { useUserStore } from 'src/stores/userStore';
import { computed } from 'vue';
import { Profile } from 'src/types';

const user = computed(() => useUserStore().user as Profile);
const allowedArticlesCount = computed(
  () =>
    `${user.value.allowed_articles} article${
      user.value.allowed_articles > 1 ? 's' : ''
    }`,
);

function upgrade() {
  window.open(WIKIADVISER_PRICING_PAGE, '_blank');
}
</script>
