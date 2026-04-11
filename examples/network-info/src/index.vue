<template>
  <div>
    <gl-title title="Network Info" />

    <gl-card>
      <gl-tips state="info">
        Device and network information from the Vuex store and RPC API.
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
        <h3 class="section-heading">System Status</h3>
        <gl-table :data="systemRows">
          <gl-table-column prop="label" label="Property" />
          <gl-table-column prop="value" label="Value" />
        </gl-table>
      </div>
    </gl-card>

    <gl-card v-if="wifiRows.length" style="margin-top: 20px;">
      <div class="section">
        <h3 class="section-heading">Wi-Fi</h3>
        <gl-table :data="wifiRows">
          <gl-table-column prop="label" label="Property" />
          <gl-table-column prop="value" label="Value" />
        </gl-table>
      </div>
    </gl-card>

    <gl-card v-if="serviceRows.length" style="margin-top: 20px;">
      <div class="section">
        <h3 class="section-heading">Services</h3>
        <gl-table :data="serviceRows">
          <gl-table-column prop="name" label="Service" />
          <gl-table-column prop="status" label="Status" />
        </gl-table>
      </div>
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
      board: {},
      error: '',
    };
  },
  computed: {
    ss() {
      var st = this.$store && this.$store.state ? this.$store.state : {};
      return st.systemStatus || {};
    },
    si() {
      var st = this.$store && this.$store.state ? this.$store.state : {};
      return st.systemInfo || {};
    },
    deviceRows() {
      var b = this.si.board_info || {};
      var rows = [
        { label: 'Model', value: b.model || this.board.model || '--' },
        { label: 'Hostname', value: b.hostname || this.board.hostname || '--' },
        { label: 'Architecture', value: b.architecture || this.board.system || '--' },
        { label: 'Kernel', value: b.kernel_version || this.board.kernel || '--' },
        { label: 'OpenWrt', value: b.openwrt_version || '--' },
        { label: 'Firmware', value: this.si.firmware_version || '--' },
      ];
      if (this.si.mac) rows.push({ label: 'MAC', value: this.si.mac });
      return rows;
    },
    systemRows() {
      var sys = this.ss.system || {};
      var rows = [
        { label: 'Uptime', value: this.formatUptime(sys.uptime) },
        { label: 'LAN IP', value: sys.lan_ip || '--' },
        { label: 'Mode', value: this.modeName(sys.mode) },
      ];
      if (sys.cpu && sys.cpu.temperature) {
        rows.push({ label: 'CPU Temp', value: sys.cpu.temperature + ' C' });
      }
      if (sys.flash_total) {
        rows.push({ label: 'Flash', value: sys.flash_free + ' / ' + sys.flash_total + ' MB free' });
      }
      if (sys.guest_ip) {
        rows.push({ label: 'Guest IP', value: sys.guest_ip });
      }
      return rows;
    },
    wifiRows() {
      var wifi = this.ss.wifi || [];
      var rows = [];
      wifi.forEach(function (w, i) {
        rows.push({ label: 'SSID' + (i > 0 ? ' ' + (i + 1) : ''), value: w.ssid || '--' });
        if (w.channel) rows.push({ label: 'Channel' + (i > 0 ? ' ' + (i + 1) : ''), value: String(w.channel) });
      });
      return rows;
    },
    serviceRows() {
      var services = this.ss.service || [];
      return services.map(function (s) {
        return {
          name: s.name,
          status: s.status ? 'Running' : 'Stopped',
        };
      });
    },
  },
  created() {
    this.fetchBoard();
  },
  methods: {
    fetchBoard() {
      var self = this;
      this.$rpcRequest('call', ['sid', 'system', 'board', {}])
        .then(function (res) {
          self.board = res || {};
        })
        .catch(function () {
          self.error = 'Failed to fetch board info.';
        });
    },
    formatUptime(s) {
      if (!s && s !== 0) return '--';
      var d = Math.floor(s / 86400);
      var h = Math.floor((s % 86400) / 3600);
      var m = Math.floor((s % 3600) / 60);
      var parts = [];
      if (d > 0) parts.push(d + 'd');
      if (h > 0) parts.push(h + 'h');
      parts.push(m + 'm');
      return parts.join(' ');
    },
    modeName(mode) {
      var modes = { 0: 'Router', 1: 'WDS', 2: 'Relay', 3: 'Mesh', 4: 'AP', 6: 'Passthrough' };
      return modes[mode] || '--';
    },
  },
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
