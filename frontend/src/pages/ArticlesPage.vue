<template>
  <q-layout view="hHh lpR fFf">
    <app-header></app-header>
    <q-page-container>
      <q-page class="row justify-center q-pt-xl">
        <q-card class="q-pa-sm" style="background-color: #f6f8fa; height: 100%">
          <search-article></search-article>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import AppHeader from 'src/layouts/AppHeader.vue';
import SearchArticle from 'src/components/SearchArticle/SearchArticle.vue';
</script>

<style lang="scss"></style>
