import { User } from '@supabase/supabase-js';
import { defineStore } from 'pinia';
import supabase from 'src/api/supabase';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  // States
  const user = ref<User>();

  // Actions
  async function fetchUser() {
    user.value = (await supabase.auth.getUser()).data.user as User;
  }

  return {
    user,
    fetchUser,
  };
});
