<template>
  <div>
    <gl-title title="Network Info" />

    <gl-card>
      <gl-tips state="info">
        Device and network information retrieved from the router API.
      </gl-tips>

      <div class="section">
        <h3 class="section-heading">Device</h3>
        <gl-table :data="deviceRows">
          <gl-table-column prop="label" label="Property" />
          <gl-table-column prop="value" label="Value" />
        </gl-table>
      </div>
    </gl-card>

    <gl-card style="margin-top: 20px;">
      <div class="section">
        <h3 class="section-heading">System</h3>
        <gl-table :data="systemRows">
          <gl-table-column prop="label" label="Property" />
          <gl-table-column prop="value" label="Value" />
        </gl-table>
      </div>
    </gl-card>

    <gl-card style="margin-top: 20px;">
      <div class="section">
        <h3 class="section-heading">Memory</h3>
        <gl-table :data="memoryRows">
          <gl-table-column prop="label" label="Metric" />
          <gl-table-column prop="value" label="Value" />
        </gl-table>
      </div>
      <template #footer>
        <gl-btn type="primary" :loading="loading" @click="refresh">
          Refresh
        </gl-btn>
      </template>
    </gl-card>

    <div v-if="error" class="error-banner">
      <gl-tips state="error">{{ error }}</gl-tips>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NetworkInfo',
  data() {
    return {
      board: null,
      info: null,
      loading: true,
      error: ''
    };
  },
  computed: {
    deviceRows() {
      if (!this.board) return [];
      return [
        { label: 'Hostname', value: this.board.hostname || '--' },
        { label: 'Model', value: this.board.model || '--' },
        { label: 'Board Name', value: this.board.board_name || '--' },
        { label: 'Architecture', value: this.board.system || '--' },
        { label: 'Kernel Version', value: this.board.kernel || '--' },
        {
          label: 'Firmware Version',
          value: this.board.release ? this.board.release.version : '--'
        },
        {
          label: 'Firmware Revision',
          value: this.board.release ? this.board.release.revision : '--'
        }
      ];
    },
    systemRows() {
      if (!this.info) return [];
      return [
        { label: 'Uptime', value: this.formatUptime(this.info.uptime) },
        { label: 'Local Time', value: this.info.localtime || '--' },
        {
          label: 'Load Average (1/5/15 min)',
          value: this.info.load ? this.info.load.join(' / ') : '--'
        }
      ];
    },
    memoryRows() {
      if (!this.info || !this.info.memory) return [];
      const mem = this.info.memory;
      return [
        { label: 'Total', value: this.formatBytes(mem.total) },
        { label: 'Free', value: this.formatBytes(mem.free) },
        { label: 'Used', value: this.formatBytes((mem.total || 0) - (mem.free || 0)) },
        { label: 'Shared', value: this.formatBytes(mem.shared) },
        { label: 'Buffered', value: this.formatBytes(mem.buffered) }
      ];
    }
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
          this.$rpc.call('system', 'board', {}),
          this.$rpc.call('system', 'info', {})
        ]);
        this.board = board;
        this.info = info;
      } catch (err) {
        this.error = 'Failed to load data from the router. Check your connection.';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    refresh() {
      this.fetchData();
    },
    formatUptime(seconds) {
      if (!seconds && seconds !== 0) return '--';
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      const parts = [];
      if (days > 0) parts.push(days + 'd');
      if (hours > 0) parts.push(hours + 'h');
      if (minutes > 0) parts.push(minutes + 'm');
      parts.push(secs + 's');
      return parts.join(' ');
    },
    formatBytes(bytes) {
      if (!bytes && bytes !== 0) return '--';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }
  }
};
</script>

<style scoped>
.section {
  margin-bottom: 8px;
}

.section-heading {
  color: var(--title-color);
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.error-banner {
  margin-top: 20px;
}
</style>
