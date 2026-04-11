<template>
  <div>
    <gl-title title="Hello World" />
    <gl-card>
      <gl-tips state="info">
        This is a sample GL.iNet plugin built with the gl-sdk4-plugin-kit.
      </gl-tips>

      <div class="info-section" v-if="board">
        <h3 class="section-heading">Device Information</h3>
        <div class="info-row">
          <span class="info-label">Hostname</span>
          <span class="info-value">{{ board.hostname || '--' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Model</span>
          <span class="info-value">{{ board.model || '--' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Board</span>
          <span class="info-value">{{ board.board_name || '--' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Kernel</span>
          <span class="info-value">{{ board.kernel || '--' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Firmware</span>
          <span class="info-value">{{ board.release ? board.release.version : '--' }}</span>
        </div>
      </div>

      <div class="info-section" v-if="info">
        <h3 class="section-heading">System Status</h3>
        <div class="info-row">
          <span class="info-label">Uptime</span>
          <span class="info-value">{{ formatUptime(info.uptime) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Local Time</span>
          <span class="info-value">{{ info.localtime || '--' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Memory Used</span>
          <span class="info-value">{{ formatMemory(info.memory) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Load Average</span>
          <span class="info-value">{{ info.load ? info.load.join(', ') : '--' }}</span>
        </div>
      </div>

      <div v-if="loading" class="loading-text">Loading...</div>
      <div v-if="error" class="error-text">{{ error }}</div>
    </gl-card>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  data() {
    return {
      board: null,
      info: null,
      loading: true,
      error: ''
    };
  },
  created() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      this.loading = true;
      this.error = '';
      try {
        const [board, info] = await Promise.all([
          this.$rpcRequest('call', ['sid', 'system', 'board', {}]),
          this.$rpcRequest('call', ['sid', 'system', 'info', {}])
        ]);
        this.board = board;
        this.info = info;
      } catch (err) {
        this.error = 'Failed to fetch system information.';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    formatUptime(seconds) {
      if (!seconds) return '--';
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const parts = [];
      if (days > 0) parts.push(days + 'd');
      if (hours > 0) parts.push(hours + 'h');
      parts.push(minutes + 'm');
      return parts.join(' ');
    },
    formatMemory(memory) {
      if (!memory) return '--';
      const total = memory.total || 0;
      const free = memory.free || 0;
      const used = total - free;
      const usedMB = (used / 1024 / 1024).toFixed(1);
      const totalMB = (total / 1024 / 1024).toFixed(1);
      return usedMB + ' / ' + totalMB + ' MB';
    }
  }
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

.loading-text {
  text-align: center;
  padding: 20px;
  color: var(--hint-color);
}

.error-text {
  text-align: center;
  padding: 20px;
  color: var(--error-color);
}
</style>
