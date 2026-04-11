<template>
  <div>
    <gl-title title="Hello World" />
    <gl-card>
      <gl-tips state="info">
        This is a sample GL.iNet plugin built with the gl-sdk4-plugin-kit.
      </gl-tips>

      <div class="info-section">
        <h3 class="section-heading">Device Information</h3>
        <div class="info-row">
          <span class="info-label">Model</span>
          <span class="info-value">{{ board.model || '--' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Hostname</span>
          <span class="info-value">{{ board.hostname || '--' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Kernel</span>
          <span class="info-value">{{ board.kernel || '--' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Firmware</span>
          <span class="info-value">{{ firmwareVersion }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Uptime</span>
          <span class="info-value">{{ formattedUptime }}</span>
        </div>
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>
    </gl-card>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  data() {
    return {
      board: {},
      error: '',
    };
  },
  computed: {
    firmwareVersion() {
      return this.board.release ? this.board.release.version : '--';
    },
    formattedUptime() {
      var status = this.$store && this.$store.state ? this.$store.state.systemStatus : null;
      if (!status || !status.system || !status.system.uptime) return '--';
      var s = status.system.uptime;
      var d = Math.floor(s / 86400);
      var h = Math.floor((s % 86400) / 3600);
      var m = Math.floor((s % 3600) / 60);
      return d + 'd ' + h + 'h ' + m + 'm';
    },
  },
  created() {
    this.fetchData();
  },
  methods: {
    fetchData() {
      var self = this;
      this.$rpcRequest('call', ['sid', 'system', 'board', {}])
        .then(function (res) {
          self.board = res || {};
        })
        .catch(function () {
          self.error = 'Failed to fetch device info.';
        });
    },
  },
};
</script>

<style scoped>
.info-section {
  margin-top: 20px;
}

.section-heading {
  color: var(--title-color);
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--table-border);
}

.info-label {
  color: var(--label-color);
  font-size: 14px;
}

.info-value {
  color: var(--text-color);
  font-size: 14px;
  font-weight: 500;
}

.error-text {
  text-align: center;
  padding: 20px;
  color: var(--error-color);
}
</style>
