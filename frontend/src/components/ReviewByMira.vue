<template>
  <div>
    <q-btn
      icon="img:/icons/logo.svg"
      label="Review by Mira"
      outline
      no-caps
      :loading="loading"
      :disable="loading"
      @click="triggerReview"
    />

    <q-dialog v-model="dialog">
      <q-card class="q-pa-md" style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">AI Review Result</div>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div v-if="error" class="text-negative">
            {{ error }}
          </div>
          <div v-else-if="result" v-html="result"></div>
          <div v-else>
            Waiting for result...
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup color="primary" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import  supabaseClient  from 'src/api/supabase';
import { Article } from 'src/types';

const props = defineProps<{ article: Article }>();

const loading = ref(false);
const dialog = ref(false);
const result = ref<string | null>(null);
const error = ref<string | null>(null);

const supabase = supabaseClient;

async function triggerReview() {
  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    const { data, error: fnError } = await supabase.functions.invoke('ai-review', {
      body: {
        article_id: props.article.article_id,
        language: props.article.language,
      },
    });

    if (fnError) throw fnError;
    result.value = data?.summary ?? 'No feedback returned';
    dialog.value = true;
  } catch (err: unknown) {
  if (err instanceof Error) {
    error.value = err.message;
  } else {
    error.value = String(err) || 'Something went wrong';
  }
} finally {
    loading.value = false;
  }
}
</script>
