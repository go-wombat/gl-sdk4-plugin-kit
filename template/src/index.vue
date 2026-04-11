<template>
  <div class="plugin-wrapper">
    <gl-title :title="'My Plugin'" />
    <gl-card>
      <p class="text">Model: {{ model }}</p>
      <p class="text">Uptime: {{ uptime }}</p>
      <p class="text">Edit <code>src/index.vue</code> to get started.</p>
    </gl-card>
  </div>
</template>

<script>
export default {
  name: 'my-plugin',
  computed: {
    model() {
      var si = this.$store && this.$store.state ? this.$store.state.systemInfo : {};
      var b = si.board_info || {};
      return b.model || '--';
    },
    uptime() {
      var ss = this.$store && this.$store.state ? this.$store.state.systemStatus : {};
      var sys = ss.system || {};
      if (!sys.uptime) return '--';
      var s = sys.uptime;
      var d = Math.floor(s / 86400);
      var h = Math.floor((s % 86400) / 3600);
      var m = Math.floor((s % 3600) / 60);
      return d + 'd ' + h + 'h ' + m + 'm';
    },
  },
};
</script>

<style scoped>
.plugin-wrapper {
  padding: 20px 0;
}
.text {
  color: var(--text-color);
  line-height: 1.8;
}
code {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}
</style>
