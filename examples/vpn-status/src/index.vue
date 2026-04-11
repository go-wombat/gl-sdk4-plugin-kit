<template>
  <div class="vpnstatus-wrapper">
    <gl-title :title="'VPN Status'" />

    <gl-tips v-if="error" state="error">
      {{ error }}
    </gl-tips>

    <gl-card>
      <div class="status-header">
        <div class="status-row">
          <span class="status-label">WireGuard</span>
          <gl-switch
            :value="wgEnabled"
            :disabled="toggling"
            @change="toggleWg"
          />
        </div>
        <div class="status-indicator" :class="{ active: wgConnected }">
          {{ wgConnected ? 'Connected' : 'Disconnected' }}
        </div>
      </div>
    </gl-card>

    <gl-card v-if="wgConnected" style="margin-top: 16px">
      <gl-table :data="peerData">
        <gl-table-column prop="label" label="Property" />
        <gl-table-column prop="value" label="Value" />
      </gl-table>
    </gl-card>

    <gl-card style="margin-top: 16px">
      <div class="status-header">
        <div class="status-row">
          <span class="status-label">OpenVPN</span>
          <gl-switch
            :value="ovpnEnabled"
            :disabled="toggling"
            @change="toggleOvpn"
          />
        </div>
        <div class="status-indicator" :class="{ active: ovpnConnected }">
          {{ ovpnConnected ? 'Connected' : 'Disconnected' }}
        </div>
      </div>
    </gl-card>

    <gl-tips v-if="lastRefresh" state="info" style="margin-top: 16px">
      Last updated: {{ lastRefresh }}
    </gl-tips>

    <div style="margin-top: 16px">
      <gl-btn type="primary" :loading="loading" @click="refresh">
        Refresh
      </gl-btn>
    </div>
  </div>
</template>

<script>
export default {
  name: 'vpnstatus',
  data() {
    return {
      wgEnabled: false,
      wgConnected: false,
      ovpnEnabled: false,
      ovpnConnected: false,
      peerData: [],
      loading: false,
      toggling: false,
      error: null,
      lastRefresh: null,
    };
  },
  created() {
    this.refresh();
  },
  methods: {
    async refresh() {
      this.loading = true;
      this.error = null;
      try {
        const wgStatus = await this.$rpc.call('wireguard', 'status', {});
        this.wgEnabled = wgStatus.enabled || false;
        this.wgConnected = wgStatus.connected || false;

        if (wgStatus.peers && wgStatus.peers.length > 0) {
          const peer = wgStatus.peers[0];
          this.peerData = [
            { label: 'Endpoint', value: peer.endpoint || 'N/A' },
            { label: 'Allowed IPs', value: (peer.allowed_ips || []).join(', ') || 'N/A' },
            { label: 'Latest Handshake', value: peer.latest_handshake || 'N/A' },
            { label: 'Transfer RX', value: this.formatBytes(peer.rx_bytes) },
            { label: 'Transfer TX', value: this.formatBytes(peer.tx_bytes) },
            { label: 'Keepalive', value: peer.persistent_keepalive ? peer.persistent_keepalive + 's' : 'off' },
          ];
        } else {
          this.peerData = [];
        }
      } catch (e) {
        this.wgEnabled = false;
        this.wgConnected = false;
        this.peerData = [];
      }

      try {
        const ovpnStatus = await this.$rpc.call('openvpn', 'status', {});
        this.ovpnEnabled = ovpnStatus.enabled || false;
        this.ovpnConnected = ovpnStatus.connected || false;
      } catch (e) {
        this.ovpnEnabled = false;
        this.ovpnConnected = false;
      }

      this.lastRefresh = new Date().toLocaleTimeString();
      this.loading = false;
    },
    async toggleWg(val) {
      this.toggling = true;
      try {
        await this.$rpc.call('wireguard', val ? 'start' : 'stop', {});
        await this.refresh();
      } catch (e) {
        this.error = 'Failed to toggle WireGuard.';
      }
      this.toggling = false;
    },
    async toggleOvpn(val) {
      this.toggling = true;
      try {
        await this.$rpc.call('openvpn', val ? 'start' : 'stop', {});
        await this.refresh();
      } catch (e) {
        this.error = 'Failed to toggle OpenVPN.';
      }
      this.toggling = false;
    },
    formatBytes(bytes) {
      if (!bytes) return '0 B';
      var k = 1024;
      var sizes = ['B', 'KB', 'MB', 'GB'];
      var i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },
  },
};
</script>

<style scoped>
.vpnstatus-wrapper {
  padding: 20px 0;
}
.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.status-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--title-color);
}
.status-indicator {
  font-size: 14px;
  color: var(--error-color);
  font-weight: 500;
}
.status-indicator.active {
  color: var(--success-color);
}
</style>
