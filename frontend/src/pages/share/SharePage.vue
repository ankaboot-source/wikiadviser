<template>
  <upgrade-page v-if="reachedLimits" />
  <div v-else class="col q-panel q-py-lg">
    <div class="row justify-center">
      <q-card class="q-pa-sm column" flat style="width: 80vw">
        <q-card-section v-if="!valid" class="text-center" padding>
          <q-img
            src="/images/invalid-link.svg"
            spinner-color="white"
            alt="invalid link"
            height="20.25vh"
            fit="contain"
            class="q-mb-lg"
          />
          <div class="text-h6">This shared link has expired.</div>
          <div class="text-body2 q-mt-md q-mb-lg">
            Please ask the article's owner for a new share link.
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import supabase from 'src/api/supabase';
import UpgradePage from 'src/components/Subscription/UpgradeAccountPage.vue';
import { onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const valid = ref(true);

const reachedLimits = ref(false);

onBeforeMount(async () => {
  try {
    const { params } = useRoute();
    const token = params.token;
    const { data: shareLink, error: validationError } =
      await supabase.functions.invoke(`share-link/${token}`, {
        method: 'GET',
      });

    if (validationError) {
      reachedLimits.value = validationError.context.status === 402;
      throw new Error(validationError.message);
    }

    router.push({
      path: `/articles/${shareLink.article_id}`,
    });
  } catch (error) {
    valid.value = false;
  }
});
</script>
