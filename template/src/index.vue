<template>
  <div class="plugin-wrapper">
    <gl-title :title="'My Plugin'" />
    <div class="plugin-card">
      <p>Your plugin content goes here.</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'my-plugin',
  data() {
    return {};
  },
  created() {},
  methods: {},
};
</script>

<style scoped>
.plugin-wrapper {
  padding: 20px 0;
}
.plugin-card {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 24px;
  margin-top: 16px;
}
</style>
