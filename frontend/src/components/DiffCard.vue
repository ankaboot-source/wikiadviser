<template>
  <q-scroll-area>
    <div class="q-mr-md" @click="handleClick($event)" v-html="data"></div>
  </q-scroll-area>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import 'src/css/styles/index.scss';
import 'src/css/styles/ve.scss';
import 'src/css/styles/diff.scss';
import { getArticleParsedContent } from 'src/api/supabaseHelper';
import { useSelectedChangeStore } from '../stores/selectedChange';

const store = useSelectedChangeStore();
const props = defineProps<{
  articleId: string;
}>();

const fetchData = async () => {
  try {
    data.value = await getArticleParsedContent(props.articleId);
  } catch (error) {
    console.error(error);
  } finally {
    // Call fetchData again after the request completes to implement long polling
    setTimeout(() => fetchData(), 1000);
  }
};

const data = ref('');

onMounted(fetchData);

function handleClick(event: MouseEvent) {
  //Prevent visting links:
  event.preventDefault();
  let target = event.target as HTMLElement;
  const rest = target;
  let ancestry = 0;
  while (target && !target.getAttribute('data-id')) {
    target = target.parentElement!;
    ancestry++;
  }
  if (target) {
    console.log(`Element clicked of ancestry ${ancestry}:`, target);
    store.selectedChangeId = target.getAttribute('data-id') as string;
  } else {
    console.log('Element clicked:', rest);
  }
}

watch(
  () => store.hoveredChangeId,
  (hoveredChangeId: string) => {
    if (hoveredChangeId) {
      const element = document
        .querySelector('.ve-ui-diffElement-document')!
        .querySelector('[data-id="' + hoveredChangeId + '"]');

      element!.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });

      if (element) {
        element.classList.add('preHovered');
        setTimeout(() => {
          element.classList.add('hovered');
        }, 10);
      }
    } else {
      const elements = document.querySelectorAll('.hovered');
      elements.forEach((element) => {
        element.classList.remove('hovered');
      });
    }
  }
);
</script>

<style>
/* General */
b {
  font-weight: bold !important;
}

/* Data diff: */
/* Change */
[data-diff-action='change'],
[data-diff-action='change-insert'] {
  background-color: transparent !important;
  box-shadow: none;

  border-bottom: 3px solid rgba(109, 169, 247, 0.45);
  border-top: 3px solid rgba(109, 169, 247, 0.45);
}
[data-diff-action='change']:hover,
[data-diff-action='change-insert']:hover {
  border-bottom: 3px solid rgba(109, 169, 247, 0.65);
  border-top: 3px solid rgba(109, 169, 247, 0.65);
}

/* Remove */
[data-diff-action='remove'],
[data-diff-action='remove'] > caption,
[data-diff-action='remove'] > figcaption {
  background-color: transparent !important;
  box-shadow: none;

  border-bottom: 3px solid rgba(174, 30, 66, 0.45);
  border-top: 3px solid rgba(174, 30, 66, 0.45);
  text-decoration: line-through;
  text-decoration-color: rgba(87, 15, 33, 0.45);
  text-decoration-thickness: 2px;
}
[data-diff-action='remove']:hover,
[data-diff-action='remove']:hover > caption,
[data-diff-action='remove']:hover > figcaption :hover {
  border-bottom: 3px solid rgba(109, 18, 41, 0.5);
  border-top: 3px solid rgba(109, 18, 41, 0.5);
}

/* Insert */
[data-diff-action='insert'],
[data-diff-action='insert'] > caption,
[data-diff-action='insert'] > figcaption {
  background-color: transparent !important;
  box-shadow: none;

  border-bottom: 3px solid rgba(30, 174, 49, 0.45);
  border-top: 3px solid rgba(30, 174, 49, 0.45);
}
[data-diff-action='insert']:hover,
[data-diff-action='insert']:hover > caption,
[data-diff-action='insert']:hover > figcaption {
  border-bottom: 3px solid rgba(18, 109, 31, 0.5);
  border-top: 3px solid rgba(18, 109, 31, 0.5);
}

/* data-status */
[data-status] {
  cursor: pointer;
}
[data-status='0'] {
  background-color: rgba(255, 211, 67, 0.2) !important;
}
[data-status='0']:hover {
  background-color: rgba(255, 211, 67, 0.3) !important;
}

[data-status='2'] {
  background-color: rgba(255, 112, 112, 0.2) !important;
}
[data-status='2']:hover {
  background-color: rgba(255, 112, 112, 0.3) !important;
}

[data-status='1'] {
  background-color: rgba(16, 146, 0, 0.2) !important;
}
[data-status='1']:hover {
  background-color: rgba(16, 146, 0, 0.3) !important;
}

/* Hover Effect */
.preHovered {
  background: linear-gradient(
      0deg,
      rgb(184, 212, 248, 0.9),
      rgb(184, 212, 248, 0.9)
    )
    no-repeat right bottom / 0 var(--bg-h);
  transition: background-size 350ms;
  --bg-h: 100%;
}
.hovered {
  background-size: 100% var(--bg-h);
  background-position-x: left;

  border-bottom: 6px solid rgb(184, 212, 248, 0.9);
  border-top: 6px solid rgb(184, 212, 248, 0.9);
}
</style>
