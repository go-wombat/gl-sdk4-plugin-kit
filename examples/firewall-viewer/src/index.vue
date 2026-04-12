<template>
  <div>
    <gl-title title="Firewall" />

    <!-- WAN Access Card -->
    <gl-card>
      <h3 class="section-heading">WAN Access</h3>
      <gl-tips v-if="wanError" state="warning" :tips="wanError" />
      <div v-if="wanAccess" class="wan-grid">
        <div class="wan-item">
          <span class="wan-label">Ping</span>
          <span :class="wanAccess.enable_ping ? 'status-on' : 'status-off'">
            {{ wanAccess.enable_ping ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
        <div class="wan-item">
          <span class="wan-label">SSH</span>
          <span :class="wanAccess.enable_ssh ? 'status-on' : 'status-off'">
            {{ wanAccess.enable_ssh ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
        <div class="wan-item">
          <span class="wan-label">HTTPS</span>
          <span :class="wanAccess.enable_https ? 'status-on' : 'status-off'">
            {{ wanAccess.enable_https ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
      </div>
    </gl-card>

    <!-- Port Forwards Card -->
    <gl-card>
      <h3 class="section-heading">Port Forwards</h3>
      <gl-tips v-if="forwardError" state="warning" :tips="forwardError" />
      <gl-table v-if="portForwards.length" :data="portForwards">
        <gl-table-column prop="name" label="Name" min-width="120" />
        <gl-table-column prop="proto" label="Protocol" width="100" />
        <gl-table-column label="External Port" width="120">
          <template slot-scope="{ row }">
            {{ row.src_dport || '--' }}
          </template>
        </gl-table-column>
        <gl-table-column label="Internal IP" min-width="130">
          <template slot-scope="{ row }">
            {{ row.dest_ip || '--' }}
          </template>
        </gl-table-column>
        <gl-table-column label="Internal Port" width="120">
          <template slot-scope="{ row }">
            {{ row.dest_port || '--' }}
          </template>
        </gl-table-column>
        <gl-table-column label="Enabled" width="90">
          <template slot-scope="{ row }">
            <span :style="{ color: row.enabled ? 'var(--success-color)' : 'var(--error-color)' }">
              {{ row.enabled ? 'Yes' : 'No' }}
            </span>
          </template>
        </gl-table-column>
      </gl-table>
      <div v-if="!portForwards.length && !forwardError" class="empty-text">
        No port forwards configured.
      </div>
    </gl-card>

    <!-- Firewall Rules Card -->
    <gl-card>
      <h3 class="section-heading">Firewall Rules</h3>
      <gl-tips v-if="ruleError" state="warning" :tips="ruleError" />
      <gl-table v-if="rules.length" :data="rules">
        <gl-table-column prop="name" label="Name" min-width="140" />
        <gl-table-column prop="proto" label="Protocol" width="100" />
        <gl-table-column prop="src" label="Source" width="100" />
        <gl-table-column prop="dest" label="Destination" width="100" />
        <gl-table-column label="Port" width="100">
          <template slot-scope="{ row }">
            {{ row.dest_port || row.src_dport || '--' }}
          </template>
        </gl-table-column>
        <gl-table-column prop="target" label="Action" width="90">
          <template slot-scope="{ row }">
            <span :style="{ color: row.target === 'ACCEPT' ? 'var(--success-color)' : 'var(--error-color)' }">
              {{ row.target || '--' }}
            </span>
          </template>
        </gl-table-column>
      </gl-table>
      <div v-if="!rules.length && !ruleError" class="empty-text">
        No firewall rules configured.
      </div>
    </gl-card>
  </div>
</template>

<script>
export default {
  name: 'FirewallViewer',
  data() {
    return {
      portForwards: [],
      rules: [],
      wanAccess: null,
      forwardError: '',
      ruleError: '',
      wanError: '',
    };
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
      var fwdRes = await this.rpc('firewall', 'get_port_forward_list');
      if (fwdRes) {
        this.portForwards = Array.isArray(fwdRes)
          ? fwdRes
          : (fwdRes.list || fwdRes.rules || fwdRes.port_forward_list || []);
      } else {
        this.forwardError = 'Failed to load port forwards.';
      }

      var ruleRes = await this.rpc('firewall', 'get_rule_list');
      if (ruleRes) {
        this.rules = Array.isArray(ruleRes)
          ? ruleRes
          : (ruleRes.list || ruleRes.rules || ruleRes.rule_list || []);
      } else {
        this.ruleError = 'Failed to load firewall rules.';
      }

      var wanRes = await this.rpc('firewall', 'get_wan_access');
      if (wanRes) {
        this.wanAccess = wanRes;
      } else {
        this.wanError = 'Failed to load WAN access settings.';
      }
    },
  },
};
</script>

<style scoped>
.section-heading {
  color: var(--title-color);
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}
.wan-grid {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.wan-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 24px;
  border: 1px solid var(--table-border);
  border-radius: 8px;
  background: var(--card-bg);
  min-width: 100px;
}
.wan-label {
  color: var(--text-color);
  font-size: 14px;
}
.status-on {
  color: var(--success-color);
  font-weight: 600;
  font-size: 14px;
}
.status-off {
  color: var(--error-color);
  font-weight: 600;
  font-size: 14px;
}
.empty-text {
  text-align: center;
  padding: 24px 20px;
  color: var(--text-color);
  font-size: 14px;
}
</style>
