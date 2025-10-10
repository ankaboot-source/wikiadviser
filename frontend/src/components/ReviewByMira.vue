<template>
  <div>
    <q-btn
      icon="img:/icons/logo.svg"
      :label="$q.screen.lt.md ? '' : 'Review by Mira'"
      outline
      no-caps
      class="q-mr-xs"
      :loading="loading"
      :disable="loading"
      @click="triggerReview"
    />

    <q-dialog v-model="dialog">
      <q-card class="q-pa-md">
        <q-card-section>
          <div class="text-h6">AI Review by Mira</div>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div v-if="error" class="text-negative">
            {{ error }}
          </div>

          <div v-else-if="reviews.length > 0">
            <div
              v-for="(review, index) in reviews"
              :key="index"
              class="q-mb-md"
            >
              <div class="text-subtitle1">Change {{ index + 1 }}</div>
              <div class="q-pa-sm bg-grey-2 rounded-borders">
                <strong>Comment:</strong> {{ review.comment }}<br />
                <strong>Proposed Change:</strong> {{ review.proposed_change }}
              </div>
            </div>
          </div>

          <div v-else-if="result">
            {{ result }}
          </div>

          <div v-else>Waiting for Mira's review...</div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Close" color="primary" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import supabaseClient from 'src/api/supabase';
import { Article } from 'src/types';

const props = defineProps<{ article: Article; hideLabel?: boolean }>();

const loading = ref(false);
const dialog = ref(false);
const result = ref<string | null>(null);
const error = ref<string | null>(null);
const reviews = ref<
  { change_id: string; comment: string; proposed_change: string }[]
>([]);

async function triggerReview() {
  loading.value = true;
  error.value = null;
  result.value = null;
  reviews.value = [];

  try {
    const { data, error: fnError } = await supabaseClient.functions.invoke(
      'ai-review',
      {
        body: {
          article_id: props.article.article_id,
          language: props.article.language,
        },
      },
    );

    if (fnError) throw fnError;

    if (data?.reviews?.length > 0) {
      reviews.value = data.reviews;
    } else {
      result.value = data?.summary ?? 'No feedback returned';
    }

    dialog.value = true;
  } catch (err: unknown) {
    if (err instanceof Error) {
      error.value = err.message;
    } else {
      error.value = String(err) || 'Something went wrong';
    }
    dialog.value = true;
  } finally {
    loading.value = false;
  }
}
</script>
