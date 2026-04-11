<template>
  <div>
    <gl-title title="Client Monitor" />
    <gl-card>
      <div class="header-bar">
        <div class="client-summary">
          <span class="summary-item">
            <strong>{{ wirelessCount }}</strong> wireless
          </span>
          <span class="summary-divider">|</span>
          <span class="summary-item">
            <strong>{{ wiredCount }}</strong> wired
          </span>
        </div>
        <label class="toggle-label">
          <input type="checkbox" v-model="onlineOnly" />
          <span>Online only</span>
        </label>
      </div>

      <gl-tips v-if="error" state="warning">{{ error }}</gl-tips>

      <gl-table v-if="filteredClients.length" :data="filteredClients">
        <gl-table-column label="Name" min-width="140">
          <template slot-scope="{ row }">
            {{ row.name || row.mac }}
          </template>
        </gl-table-column>
        <gl-table-column prop="ip" label="IP Address" min-width="130" />
        <gl-table-column label="Interface" width="100">
          <template slot-scope="{ row }">
            {{ formatIface(row.iface) }}
          </template>
        </gl-table-column>
        <gl-table-column label="Status" width="90">
          <template slot-scope="{ row }">
            <span :style="{ color: row.online ? 'var(--success-color)' : 'var(--error-color)' }">
              {{ row.online ? 'Online' : 'Offline' }}
            </span>
          </template>
        </gl-table-column>
        <gl-table-column label="RX" width="100">
          <template slot-scope="{ row }">
            {{ formatBytes(row.total_rx) }}
          </template>
        </gl-table-column>
        <gl-table-column label="TX" width="100">
          <template slot-scope="{ row }">
            {{ formatBytes(row.total_tx) }}
          </template>
        </gl-table-column>
      </gl-table>

      <div v-if="!filteredClients.length && !loading && !error" class="empty-text">
        No clients found.
      </div>
    </gl-card>
  </div>
</template>

<script>
export default {
  name: 'ClientMonitor',
  data() {
    return {
      clients: [],
      status: {},
      onlineOnly: false,
      loading: false,
      error: '',
    };
  },
  computed: {
    filteredClients() {
      if (!this.onlineOnly) return this.clients;
      return this.clients.filter(function (c) { return c.online; });
    },
    wirelessCount() {
      return this.status.wireless_total || 0;
    },
    wiredCount() {
      return this.status.cable_total || 0;
    },
  },
  created() {
    this.fetchData();
  },
  methods: {
    fetchData() {
      var self = this;
      self.loading = true;
      self.error = '';

      this.$rpcRequest('call', ['sid', 'clients', 'get_list', {}])
        .then(function (res) {
          self.clients = (res && res.clients) || [];
        })
        .catch(function () {
          self.error = 'Failed to load client list.';
        });

      this.$rpcRequest('call', ['sid', 'clients', 'get_status', {}])
        .then(function (res) {
          self.status = res || {};
        })
        .catch(function () {})
        .finally(function () {
          self.loading = false;
        });
    },
    formatIface(iface) {
      if (!iface) return '--';
      var lower = iface.toLowerCase();
      if (lower.indexOf('2g') !== -1 || lower.indexOf('2.4') !== -1 || lower === 'wlan0') return '2G';
      if (lower.indexOf('5g') !== -1 || lower === 'wlan1') return '5G';
      if (lower.indexOf('lan') !== -1 || lower.indexOf('eth') !== -1) return 'LAN';
      return iface;
    },
    formatBytes(bytes) {
      if (!bytes && bytes !== 0) return '--';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
      return (bytes / 1073741824).toFixed(2) + ' GB';
    },
  },
};
</script>

<style scoped>
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.client-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-color);
  font-size: 14px;
}
.summary-divider {
  color: var(--table-border);
}
.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-color);
  font-size: 14px;
  cursor: pointer;
}
.empty-text {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-color);
  font-size: 14px;
}
</style>
