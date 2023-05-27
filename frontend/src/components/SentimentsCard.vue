<template>
  <q-scroll-area>
    <div style="display: grid; grid-template-columns: 50% 50%">
      <div>
        <strong>Subjectivity:</strong>
        <br />
        <template v-for="sentence in data" :key="sentence.id">
          <div
            :style="{
              backgroundColor: `rgba(255, 211, 67, ${sentence.sentiment_subjectivity})`,
            }"
            :title="sentence.sentiment_subjectivity"
            v-html="sentence.sentence"
          ></div>
        </template>
      </div>
      <div>
        <strong>Polarity:</strong>
        <br />
        <template v-for="sentence in data" :key="sentence.id">
          <div
            :style="{
              'background-color':
                sentence.sentiment_polarity >= 0
                  ? `rgba(51, 176, 57, ${sentence.sentiment_polarity})`
                  : `rgba(255, 112, 112, ${-1 * sentence.sentiment_polarity})`,
            }"
            :title="sentence.sentiment_polarity"
            v-html="sentence.sentence"
          ></div>
        </template>
      </div>
    </div>
  </q-scroll-area>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import getSentimentAnalysis from 'src/api/nlpHelper';

const props = defineProps<{
  articleId: string;
}>();
const data = ref();
onMounted(async () => {
  data.value = await getSentimentAnalysis(props.articleId);
  console.log(data.value);
});
</script>
