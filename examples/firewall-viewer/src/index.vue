<template>
  <div>
    <gl-title title="Firewall" />

    <!-- WAN Access Card -->
    <gl-card>
      <h3 class="section-heading">WAN Access</h3>
      <gl-tips v-if="wanError" state="warning">{{ wanError }}</gl-tips>
      <div v-if="wanAccess" class="wan-grid">
        <div class="wan-item">
          <span class="wan-label">Ping</span>
          <span :class="wanAccess.ping ? 'status-on' : 'status-off'">
            {{ wanAccess.ping ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
        <div class="wan-item">
          <span class="wan-label">SSH</span>
          <span :class="wanAccess.ssh ? 'status-on' : 'status-off'">
            {{ wanAccess.ssh ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
        <div class="wan-item">
          <span class="wan-label">HTTPS</span>
          <span :class="wanAccess.https ? 'status-on' : 'status-off'">
            {{ wanAccess.https ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
      </div>
    </gl-card>

    <!-- Port Forwards Card -->
    <gl-card>
      <h3 class="section-heading">Port Forwards</h3>
      <gl-tips v-if="forwardError" state="warning">{{ forwardError }}</gl-tips>
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
      <gl-tips v-if="ruleError" state="warning">{{ ruleError }}</gl-tips>
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
    fetchData() {
      var self = this;

      this.$rpcRequest('call', ['sid', 'firewall', 'get_port_forward_list', {}])
        .then(function (res) {
          self.portForwards = (res && (res.list || res.rules || res.port_forward_list)) || [];
          if (Array.isArray(res)) self.portForwards = res;
        })
        .catch(function () {
          self.forwardError = 'Failed to load port forwards.';
        });

      this.$rpcRequest('call', ['sid', 'firewall', 'get_rule_list', {}])
        .then(function (res) {
          self.rules = (res && (res.list || res.rules || res.rule_list)) || [];
          if (Array.isArray(res)) self.rules = res;
        })
        .catch(function () {
          self.ruleError = 'Failed to load firewall rules.';
        });

      this.$rpcRequest('call', ['sid', 'firewall', 'get_wan_access', {}])
        .then(function (res) {
          self.wanAccess = res || {};
        })
        .catch(function () {
          self.wanError = 'Failed to load WAN access settings.';
        });
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
