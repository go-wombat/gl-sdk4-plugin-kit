<template>
  <div>
    <gl-title title="Wi-Fi Scanner" />
    <gl-card>
      <div class="toolbar">
        <gl-button type="primary" :loading="scanning" @click="doScan">
          {{ scanning ? 'Scanning...' : 'Scan' }}
        </gl-button>
        <span v-if="networks.length" class="count-text">
          {{ networks.length }} networks found
        </span>
      </div>

      <gl-tips v-if="error" state="warning">{{ error }}</gl-tips>

      <gl-table v-if="sortedNetworks.length" :data="sortedNetworks">
        <gl-table-column prop="ssid" label="SSID" min-width="160">
          <template slot-scope="{ row }">
            {{ row.ssid || '(hidden)' }}
          </template>
        </gl-table-column>
        <gl-table-column prop="signal" label="Signal" width="100">
          <template slot-scope="{ row }">
            <span :style="{ color: signalColor(row.signal) }">
              {{ row.signal }} dBm
            </span>
          </template>
        </gl-table-column>
        <gl-table-column prop="channel" label="Channel" width="90" />
        <gl-table-column prop="band" label="Band" width="80">
          <template slot-scope="{ row }">
            <span class="band-tag">{{ row.band }}</span>
          </template>
        </gl-table-column>
        <gl-table-column prop="encryption" label="Encryption" min-width="120" />
      </gl-table>

      <div v-if="!sortedNetworks.length && !scanning && !error" class="empty-text">
        No networks found. Click Scan to search.
      </div>
    </gl-card>
  </div>
</template>

<script>
export default {
  name: 'WifiScanner',
  data() {
    return {
      networks: [],
      scanning: false,
      error: '',
    };
  },
  computed: {
    sortedNetworks() {
      return this.networks.slice().sort(function (a, b) {
        return b.signal - a.signal;
      });
    },
  },
  created() {
    this.doScan();
  },
  methods: {
    rpc(module, func, params) {
      return this.$rpcRequest('call', ['sid', module, func, params || {}])
        .then(function (r) { return r; })
        .catch(function () { return null; });
    },
    async doScan() {
      this.scanning = true;
      this.error = '';
      try {
        var res = await this.rpc('repeater', 'scan');
        if (res) {
          this.networks = res.res || [];
        } else {
          this.error = 'Failed to scan Wi-Fi networks. Please try again.';
        }
      } finally {
        this.scanning = false;
      }
    },
    signalColor(signal) {
      if (signal >= -50) return 'var(--success-color)';
      if (signal >= -70) return 'var(--title-color)';
      return 'var(--error-color)';
    },
  },
};
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.count-text {
  color: var(--text-color);
  font-size: 14px;
}
.band-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: var(--card-bg);
  color: var(--title-color);
  border: 1px solid var(--table-border);
}
.empty-text {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-color);
  font-size: 14px;
}
</style>
