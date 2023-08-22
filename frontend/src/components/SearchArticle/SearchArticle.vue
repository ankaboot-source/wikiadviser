<template>
  <q-card class="q-pa-sm bg-secondary column">
    <q-card-section>
      <div class="text-h5 merriweather">
        {{ title }}
      </div>
    </q-card-section>
    <q-card-section class="q-pb-none">
      <q-input
        v-model="term"
        bg-color="white"
        dense
        outlined
        style="width: 40vw"
        debounce="700"
        placeholder="Search wikipedia"
        :loading="isSearching"
      >
        <template #append>
          <q-select
            v-model="languageModel"
            :option-label="(item) => item.value.toLocaleUpperCase()"
            :options="languageOptions"
            filled
            dense
            options-dense
          >
            <q-tooltip anchor="top middle" self="center middle">
              {{ languageModel?.label }}
            </q-tooltip>
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>{{
                    scope.opt.description
                  }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <q-icon name="search" />
        </template>
      </q-input>
    </q-card-section>
    <q-scroll-area v-if="results" class="col-grow q-pt-none q-pb-lg">
      <search-list :results="results" :language="languageModel.value" />
    </q-scroll-area>
  </q-card>
</template>
<script setup lang="ts">
import SearchList from './SearchList.vue';
import { onBeforeMount, ref, watch } from 'vue';
import { SearchResult } from 'src/types';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';

const $q = useQuasar();
const term = ref('');
const title = ref('');
const isSearching = ref(false);
const results = ref<SearchResult[]>();
const languageOptions = ref([
  { label: 'Afrikaans', value: 'af', lang: 'af' },
  { label: 'Polski', value: 'pl', lang: 'pl' },
  { label: 'العربية', value: 'ar', description: 'Al-ʿArabīyah', lang: 'ar' },
  { label: 'Asturianu', value: 'ast', lang: 'ast' },
  { label: 'Azərbaycanca', value: 'az', lang: 'az' },
  { label: 'Български', value: 'bg', description: 'Bǎlgarski', lang: 'bg' },
  { label: 'Bân-lâm-gú / Hō-ló-oē', value: 'nan', lang: 'nan' },
  { label: 'বাংলা', value: 'bn', description: 'Bangla', lang: 'bn' },
  { label: 'Беларуская', value: 'be', description: 'Belaruskaya', lang: 'be' },
  { label: 'Català', value: 'ca', lang: 'ca' },
  { label: 'Čeština', value: 'cs', description: 'čeština', lang: 'cs' },
  { label: 'Cymraeg', value: 'cy', description: 'Cymraeg', lang: 'cy' },
  { label: 'Dansk', value: 'da', lang: 'da' },
  { label: 'Deutsch', value: 'de', lang: 'de' },
  { label: 'Eesti', value: 'et', lang: 'et' },
  { label: 'Ελληνικά', value: 'el', description: 'Ellīniká', lang: 'el' },
  { label: 'English', value: 'en', description: 'English', lang: 'en' },
  { label: 'Español', value: 'es', lang: 'es' },
  { label: 'Esperanto', value: 'eo', lang: 'eo' },
  { label: 'Euskara', value: 'eu', lang: 'eu' },
  { label: 'فارسی', value: 'fa', description: 'Fārsi', lang: 'fa' },
  { label: 'Français', value: 'fr', description: 'français', lang: 'fr' },
  { label: 'Galego', value: 'gl', lang: 'gl' },
  { label: '한국어', value: 'ko', description: 'Hangugeo', lang: 'ko' },
  { label: 'हिन्दी', value: 'hi', description: 'Hindī', lang: 'hi' },
  { label: 'Hrvatski', value: 'hr', lang: 'hr' },
  { label: 'Bahasa Indonesia', value: 'id', lang: 'id' },
  { label: 'Italiano', value: 'it', lang: 'it' },
  { label: 'עברית', value: 'he', description: 'Ivrit', lang: 'he' },
  { label: 'ქართული', value: 'ka', description: 'Kartuli', lang: 'ka' },
  { label: 'Latina', value: 'la', lang: 'la' },
  { label: 'Latviešu', value: 'lv', lang: 'lv' },
  { label: 'Lietuvių', value: 'lt', lang: 'lt' },
  { label: 'Magyar', value: 'hu', lang: 'hu' },
  { label: 'Македонски', value: 'mk', description: 'Makedonski', lang: 'mk' },
  { label: 'مصرى', value: 'arz', description: 'Maṣrī', lang: 'arz' },
  { label: 'Bahasa Melayu', value: 'ms', lang: 'ms' },
  { label: 'Bahaso Minangkabau', value: 'min', lang: 'min' },
  { label: 'Nederlands', value: 'nl', lang: 'nl' },
  { label: '日本語', value: 'ja', description: 'Nihongo', lang: 'ja' },
  { label: 'Norsk (bokmål)', value: 'no', lang: 'nb' },
  { label: 'Norsk (nynorsk)', value: 'nn', lang: 'nn' },
  { label: 'Нохчийн', value: 'ce', description: 'Noxçiyn', lang: 'ce' },
  {
    label: 'Oʻzbekcha / Ўзбекча',
    value: 'uz',
    description: 'Oʻzbekcha',
    lang: 'uz',
  },
  { label: 'Português', value: 'pt', lang: 'pt' },
  { label: 'Қазақша / Qazaqşa / قازاقشا', value: 'kk', lang: 'kk' },
  { label: 'Română', value: 'ro', lang: 'ro' },
  { label: 'Simple English', value: 'simple', lang: 'en' },
  { label: 'Sinugboanong Binisaya', value: 'ceb', lang: 'ceb' },
  { label: 'Slovenčina', value: 'sk', lang: 'sk' },
  { label: 'Slovenščina', value: 'sl', description: 'slovenščina', lang: 'sl' },
  { label: 'Српски / Srpski', value: 'sr', lang: 'sr' },
  { label: 'Srpskohrvatski / Српскохрватски', value: 'sh', lang: 'sh' },
  { label: 'Suomi', value: 'fi', lang: 'fi' },
  { label: 'Svenska', value: 'sv', lang: 'sv' },
  { label: 'தமிழ்', value: 'ta', description: 'Tamiḻ', lang: 'ta' },
  { label: 'Татарча / Tatarça', value: 'tt', lang: 'tt' },
  { label: 'ภาษาไทย', value: 'th', description: 'Phasa Thai', lang: 'th' },
  { label: 'Тоҷикӣ', value: 'tg', description: 'Tojikī', lang: 'tg' },
  { label: 'تۆرکجه', value: 'azb', description: 'Türkce', lang: 'azb' },
  { label: 'Türkçe', value: 'tr', description: 'Türkçe', lang: 'tr' },
  { label: 'Українська', value: 'uk', description: 'Ukrayins’ka', lang: 'uk' },
  { label: 'اردو', value: 'ur', description: 'Urdu', lang: 'ur' },
  { label: 'Tiếng Việt', value: 'vi', description: 'Tiếng Việt', lang: 'vi' },
  { label: 'Winaray', value: 'war', description: 'Winaray', lang: 'war' },
  {
    label: '粵語',
    value: 'zh-yue',
    description: 'Yuht Yúh / Jyut6 jyu5',
    lang: 'yue',
  },
  { label: '中文', value: 'zh', description: 'Zhōngwén', lang: 'zh' },
  { label: 'Русский', value: 'ru', description: 'Russkiy', lang: 'ru' },
  { label: 'Հայերեն', value: 'hy', description: 'Hayeren', lang: 'hy' },
  { label: 'မြန်မာဘာသာ', value: 'my', description: 'Myanmarsar', lang: 'my' },
]);
const defaultOption = languageOptions.value.find(
  (option) => window.navigator.language.split('-')[0] === option.lang
) || {
  label: 'English',
  value: 'en',
  description: 'English',
};
const languageModel = ref(defaultOption);

watch(term, async (term) => {
  if (!term.trim()) {
    results.value = [];
    return;
  }
  try {
    isSearching.value = true;
    const response = await api.get<{
      message: string;
      results: SearchResult[];
    }>('wikipedia/articles', {
      params: {
        term,
        language: languageModel.value.value,
      },
    });
    results.value = response.data.results;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      $q.notify({
        message: error.message,
        color: 'negative',
      });
    } else {
      console.error(error);
      $q.notify({
        message: 'Whoops, something went wrong while searching for articles',
        color: 'negative',
      });
    }
  } finally {
    isSearching.value = false;
  }
});

onBeforeMount(() => {
  title.value = $q.localStorage.getItem('articles')
    ? 'Edit a new article'
    : 'Edit your first article';
});
</script>
