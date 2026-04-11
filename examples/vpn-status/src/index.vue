<template>
  <div class="vpnstatus-wrapper">
    <gl-title :title="'VPN Status'" />

    <gl-tips v-if="error" state="error">
      {{ error }}
    </gl-tips>

    <gl-card>
      <div class="status-header">
        <span class="status-label">WireGuard</span>
        <div class="status-indicator" :class="{ active: wgRunning }">
          {{ wgRunning ? 'Running' : 'Stopped' }}
        </div>
      </div>
    </gl-card>

    <gl-card style="margin-top: 16px">
      <div class="status-header">
        <span class="status-label">OpenVPN</span>
        <div class="status-indicator" :class="{ active: ovpnRunning }">
          {{ ovpnRunning ? 'Running' : 'Stopped' }}
        </div>
      </div>
    </gl-card>

    <gl-card style="margin-top: 16px">
      <div class="status-header">
        <span class="status-label">Tailscale</span>
        <div class="status-indicator" :class="{ active: tailscaleRunning }">
          {{ tailscaleRunning ? 'Running' : 'Stopped' }}
        </div>
      </div>
    </gl-card>

    <gl-card v-if="allServices.length" style="margin-top: 16px">
      <h3 class="section-heading">All Services</h3>
      <gl-table :data="allServices">
        <gl-table-column prop="name" label="Service" />
        <gl-table-column prop="status" label="Status" />
      </gl-table>
    </gl-card>

    <gl-card v-if="networkInterfaces.length" style="margin-top: 16px">
      <h3 class="section-heading">Network Interfaces</h3>
      <gl-table :data="networkInterfaces">
        <gl-table-column prop="name" label="Interface" />
        <gl-table-column prop="proto" label="Protocol" />
        <gl-table-column prop="ip" label="IP" />
        <gl-table-column prop="status" label="Status" />
      </gl-table>
    </gl-card>

    <gl-tips state="info" style="margin-top: 16px">
      Data from Vuex store. No RPC calls needed.
    </gl-tips>
  </div>
</template>

<script>
export default {
  name: 'vpnstatus',
  computed: {
    ss() {
      var st = this.$store && this.$store.state ? this.$store.state : {};
      return st.systemStatus || {};
    },
    services() {
      return this.ss.service || [];
    },
    wgRunning() {
      return this.serviceStatus('wireguard');
    },
    ovpnRunning() {
      return this.serviceStatus('openvpn');
    },
    tailscaleRunning() {
      return this.serviceStatus('tailscale');
    },
    allServices() {
      return this.services.map(function (s) {
        return {
          name: s.name,
          status: s.status ? 'Running' : 'Stopped',
        };
      });
    },
    networkInterfaces() {
      var net = this.ss.network || [];
      return net.map(function (n) {
        return {
          name: n.interface || '--',
          proto: n.proto || '--',
          ip: n.ipaddr || '--',
          status: n.up ? 'Up' : 'Down',
        };
      });
    },
    error() {
      return null;
    },
  },
  methods: {
    serviceStatus(name) {
      var svc = this.services.find(function (s) { return s.name === name; });
      return svc ? !!svc.status : false;
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
.section-heading {
  color: var(--title-color);
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px;
}
</style>
