<template>
  <q-expansion-item
    v-model="expanded"
    style="
      border: 1px solid rgba(0, 0, 0, 0.12);
      background-color: white;
      border-radius: 4px;
    "
    class="q-mb-md q-mx-sm"
  >
    <template v-slot:header>
      <q-item-section class="text-body1">
        <q-item-label
          ><div
            @click="preventLinkVisit($event)"
            v-html="props.item?.content"
          ></div>
        </q-item-label>
        <q-item-label caption lines="2">
          <div
            v-for="(description, index) in props.item?.description"
            :key="index"
          >
            {{ description }}
          </div>
        </q-item-label>
      </q-item-section>
      <q-item-section caption top side>
        {{ props.item?.date }}
        @{{ props.item?.user }}
      </q-item-section>
    </template>
    <q-separator />

    <q-item-section>
      <q-item-label class="q-mt-sm text-bold text-body1 q-ml-sm">
        Content
      </q-item-label>

      <div class="q-pa-md">
        <div
          class="text-center"
          @click="preventLinkVisit($event)"
          v-html="props.item?.content"
        ></div>
      </div>
    </q-item-section>
    <q-separator />

    <q-item-section>
      <q-item-label class="q-mt-sm text-bold text-body1 q-ml-sm">
        Type
      </q-item-label>

      <div class="q-pa-md">
        <div class="row">
          <div class="text-capitalize col-4 q-pt-sm text-body1">
            {{ props.item?.typeOfEdit }}
          </div>
          <q-input
            v-model="description"
            filled
            dense
            autogrow
            label="Description"
            class="col"
          >
            <!-- User: Contributor  Only -->
            <template v-slot:append>
              <q-btn
                round
                dense
                flat
                icon="check"
                color="primary"
                @click="handleComment"
              />
            </template>
          </q-input>
        </div>
      </div>
    </q-item-section>
    <q-separator />

    <q-item-section>
      <q-item-label class="q-mt-sm text-bold text-body1 q-ml-sm">
        Status
      </q-item-label>

      <div class="q-pa-md">
        <q-badge rounded :color="status[props.item?.status]" />
        <span class="text-body1 q-pl-sm">{{ props.item?.status }}</span>
      </div>
    </q-item-section>
    <q-separator />

    <q-item-section>
      <q-item-label class="q-mt-sm text-bold text-body1 q-ml-sm">
        Comments
      </q-item-label>
      <q-item-section class="q-pa-md row justify-center">
        <!-- Default Comments Examples.-->
        <q-scroll-area
          style="
            height: 150px;
            background-color: rgb(246, 248, 250);
            width: 100%;
          "
          class="q-pa-sm"
        >
          <q-chat-message
            name="me"
            :text="['hey, how are you?']"
            stamp="7 minutes ago"
            sent
            bg-color="amber-7"
          />
          <q-chat-message
            name="Jane"
            :text="[
              'doing fine, how r you?',
              'I just feel like typing a really, really, REALLY long message to annoy you...',
            ]"
            size="6"
            stamp="4 minutes ago"
            text-color="white"
            bg-color="primary"
          />
          <q-chat-message
            name="Jane"
            :text="['Did it work?']"
            stamp="1 minutes ago"
            size="8"
            text-color="white"
            bg-color="primary"
          />
        </q-scroll-area>

        <q-input
          v-model="comment"
          autogrow
          filled
          dense
          class="row"
          placeholder="Leave a comment"
          style="width: 100%"
        >
          <template v-slot:append>
            <q-btn
              round
              dense
              flat
              icon="send"
              color="primary"
              @click="handleComment"
            />
          </template>
        </q-input>
      </q-item-section>
    </q-item-section>
    <q-separator />

    <!-- User: Reviewer Only -->
    <q-item-section style="background-color: rgb(231, 237, 243)">
      <div class="row q-my-md justify-around">
        <q-btn
          outline
          color="red"
          style="background-color: white !important"
          label="Reject"
          @click="handleReject"
        />
        <q-btn color="green" label="Approve" @click="handleApprove" />
      </div>
    </q-item-section>
  </q-expansion-item>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const expanded = ref(true);
const props = defineProps({
  item: Object,
});
const description = ref(props.item?.description);
const comment = ref('');
const status: { [key: string]: string } = {
  'Awaiting Reviewer Approval': 'yellow-8',
  'Edit Approved': 'green',
  'Edit Rejected': 'red',
};
const preventLinkVisit = (event: MouseEvent) => {
  //Prevent visting links:
  event.preventDefault();
};

function handleComment() {
  console.log('commented: ', comment.value);
  comment.value = '';
}
function handleApprove() {
  console.log('Edit Approved');
}
function handleReject() {
  console.log('Edit Rejected');
}
</script>
<style scoped>
.q-item__section--main + .q-item__section--main {
  margin-left: 0px;
}
</style>
