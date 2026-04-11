<template>
  <div class="vpnstatus-wrapper">
    <gl-title :title="'VPN Status'" />

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
      <div v-if="tailscaleIp" class="status-detail">
        IP: {{ tailscaleIp }}
      </div>
    </gl-card>

    <gl-card style="margin-top: 16px">
      <div class="status-header">
        <span class="status-label">Tor</span>
        <div class="status-indicator" :class="{ active: torRunning }">
          {{ torRunning ? 'Running' : 'Stopped' }}
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

    <gl-card v-if="interfaces.length" style="margin-top: 16px">
      <h3 class="section-heading">Network Interfaces</h3>
      <gl-table :data="interfaces">
        <gl-table-column prop="iface" label="Interface" />
        <gl-table-column prop="status" label="Status" />
        <gl-table-column prop="online" label="Online" />
      </gl-table>
    </gl-card>
  </div>
</template>

<script>
export default {
  name: 'vpnstatus',
  data() {
    return {
      sysStatus: {},
      tailscaleConfig: {},
      torStatus: {},
    };
  },
  computed: {
    services() {
      return (this.sysStatus.service || []);
    },
    wgRunning() {
      return this.isServiceRunning('wgserver');
    },
    ovpnRunning() {
      return this.isServiceRunning('ovpnserver');
    },
    tailscaleRunning() {
      return this.tailscaleConfig.enabled || false;
    },
    tailscaleIp() {
      return this.tailscaleConfig.lan_ip || '';
    },
    torRunning() {
      return this.isServiceRunning('tor');
    },
    allServices() {
      return this.services.map(function (s) {
        return { name: s.name, status: s.status ? 'Running' : 'Stopped' };
      });
    },
    interfaces() {
      var net = this.sysStatus.network || [];
      return net.map(function (n) {
        return {
          iface: n.interface || '--',
          status: n.up ? 'Up' : 'Down',
          online: n.online ? 'Yes' : 'No',
        };
      });
    },
  },
  created() {
    this.fetchData();
  },
  methods: {
    rpc(module, func, params) {
      return this.$rpcRequest('call', ['sid', module, func, params || {}])
        .then(function (r) { return r; })
        .catch(function () { return null; });
    },
    async fetchData() {
      this.sysStatus = await this.rpc('system', 'get_status') || {};
      this.tailscaleConfig = await this.rpc('tailscale', 'get_config') || {};
      this.torStatus = await this.rpc('tor', 'get_status') || {};
    },
    isServiceRunning(name) {
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
.status-detail {
  margin-top: 8px;
  font-size: 13px;
  color: var(--hint-color);
}
.section-heading {
  color: var(--title-color);
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px;
}
</style>
