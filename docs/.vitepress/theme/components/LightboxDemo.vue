<script setup lang="ts">
// The stage renders the snippet file's markup verbatim (v-html): the engine's
// delegated handlers match late-mounted DOM like anything else, so a plain
// markup demo needs no JS at all.
defineProps<{ html: string }>()
</script>

<template>
  <div class="lightbox-demo">
    <div class="lightbox-demo__stage" v-html="html" />
  </div>
</template>

<style>
.lightbox-demo {
  margin: 16px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.lightbox-demo__stage {
  padding: 32px 24px;
}
</style>
