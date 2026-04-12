# GL.iNet Vue Components Reference

> Extracted from GL-MT3000 firmware 4.8.1 by inspecting `Vue.options.components`
> and the compiled app bundle. Props are confirmed via runtime introspection.
> The admin panel is Vue 2.x with Element UI 2.x included.

---

## How component names work

Some components are registered in **kebab-case** (`gl-button`), others in **PascalCase** (`GlCheckbox`).
In Vue 2 templates you can use either form — `<gl-checkbox>` resolves `GlCheckbox`.
But if the component is only registered in kebab-case, using PascalCase won't work and vice versa.

**Not available to plugins:** `gl-btn`, `gl-alert`, `gl-message-fade` — these exist in the
app bundle but are registered **locally** inside built-in views, not globally. Plugins cannot use them.

---

## Layout

### gl-title

Page title header.

| Prop | Type | Description |
|------|------|-------------|
| `title` | String | The heading text |

```vue
<gl-title title="My Plugin" />
```

---

### gl-card

Card container. The main layout building block.

| Prop | Type | Description |
|------|------|-------------|
| `title` | String | Optional card title |
| `footer` | String | Footer text |
| `badge` | String | Badge text |
| `state` | String | Card state styling |
| `footerClass` | String | CSS class for footer |
| `iconClass` | String | CSS class for icon |

| Slot | Description |
|------|-------------|
| default | Card body |
| footer | Footer area |

```vue
<gl-card>
  <p>Card body content.</p>
</gl-card>
```

---

### gl-drawer

Side panel overlay for detail views and settings.

No confirmed props — controlled via `v-if` or `v-show` binding.

```vue
<gl-drawer v-if="showDrawer">
  <p>Drawer content.</p>
</gl-drawer>
```

---

### GlCollapse / GlCollapseGroup

Accordion for collapsible sections. Registered as PascalCase.

```vue
<GlCollapseGroup>
  <GlCollapse title="Section One">
    <p>Content here.</p>
  </GlCollapse>
</GlCollapseGroup>
```

---

## Buttons and Controls

### gl-button

Standard button. **Not `gl-btn`** — that is a local component unavailable to plugins.

| Prop | Type | Description |
|------|------|-------------|
| `type` | String | `"primary"`, `"default"`, `"danger"` |
| `cssClass` | String | Additional CSS class |
| `loading` | Boolean | Shows spinner, disables click |
| `disabled` | Boolean | Disables the button |
| `plain` | Boolean | Outlined/plain style |
| `round` | String | Rounded corners |
| `textTransform` | String | CSS text-transform value |

```vue
<gl-button type="primary" :loading="saving" @click="save">
  Save Settings
</gl-button>
```

---

### gl-switch

Toggle switch for boolean values.

| Prop | Type | Description |
|------|------|-------------|
| `value` | Boolean | Current state (v-model) |
| `disabled` | Boolean | Disables the switch |
| `activeColor` | String | Color when on |
| `inactiveColor` | String | Color when off |
| `width` | Number | Width in px |

```vue
<gl-switch v-model="enabled" />
```

---

### GlToggle / GlToggleItem

Tab-style switcher. Registered as PascalCase.

```vue
<GlToggle v-model="activeTab">
  <GlToggleItem value="tab1">Tab One</GlToggleItem>
  <GlToggleItem value="tab2">Tab Two</GlToggleItem>
</GlToggle>
```

---

### gl-link

Styled anchor.

| Prop | Type | Description |
|------|------|-------------|
| `href` | String | Link URL |
| `type` | String | Link style |

```vue
<gl-link href="https://www.gl-inet.com">GL.iNet</gl-link>
```

---

### GlDropdown / GlDropdownItem

Dropdown menu. Registered as PascalCase.

```vue
<GlDropdown>
  <GlDropdownItem @click="action1">Action One</GlDropdownItem>
  <GlDropdownItem @click="action2">Action Two</GlDropdownItem>
</GlDropdown>
```

---

## Form Inputs

### el-input

Text input. This is an **Element UI** component bundled with the admin panel.

| Prop | Type | Description |
|------|------|-------------|
| `value` | String/Number | Input value (v-model) |
| `type` | String | `"text"`, `"textarea"`, `"password"`, `"number"` |
| `placeholder` | String | Placeholder text |
| `disabled` | Boolean | Disabled state |
| `clearable` | Boolean | Show clear button |
| `showPassword` | Boolean | Toggle password visibility |
| `size` | String | `"large"`, `"small"`, `"mini"` |
| `prefixIcon` | String | Icon class for prefix |
| `suffixIcon` | String | Icon class for suffix |
| `readonly` | Boolean | Read-only state |

```vue
<el-input v-model="name" placeholder="Enter name" clearable />
```

---

### el-select

Dropdown select. Element UI component.

| Prop | Type | Description |
|------|------|-------------|
| `value` | any | Selected value (v-model) |
| `placeholder` | String | Placeholder text |
| `disabled` | Boolean | Disabled state |
| `clearable` | Boolean | Allow clearing |
| `filterable` | Boolean | Allow typing to filter |

Use with `ElOption`:

```vue
<el-select v-model="selected" placeholder="Choose...">
  <ElOption label="Option A" value="a" />
  <ElOption label="Option B" value="b" />
</el-select>
```

---

### el-form-item

Form field wrapper with label and validation. Element UI component.

```vue
<ElForm :model="form" label-width="120px">
  <el-form-item label="Username" prop="username">
    <el-input v-model="form.username" />
  </el-form-item>
</ElForm>
```

---

### gl-private

Password input with show/hide toggle.

| Prop | Type | Description |
|------|------|-------------|
| `value` | String | Password value (v-model) |

```vue
<gl-private v-model="password" />
```

---

### gl-search-input

Search input with icon and clear button.

```vue
<gl-search-input v-model="query" />
```

---

### gl-cascader

Cascading/hierarchical selector.

| Prop | Type | Description |
|------|------|-------------|
| `openDelay` | Number | Delay before opening (ms) |

```vue
<gl-cascader :options="cascadeOptions" v-model="selected" />
```

---

### GlCheckbox / GlCheckboxGroup

Checkbox and checkbox group. Registered as PascalCase.

```vue
<GlCheckboxGroup v-model="selectedItems">
  <GlCheckbox label="a">Option A</GlCheckbox>
  <GlCheckbox label="b">Option B</GlCheckbox>
</GlCheckboxGroup>
```

---

### GlRadio / GlRadioGroup

Radio button and radio group. Registered as PascalCase.

```vue
<GlRadioGroup v-model="choice">
  <GlRadio label="opt1">Option 1</GlRadio>
  <GlRadio label="opt2">Option 2</GlRadio>
</GlRadioGroup>
```

---

### gl-time-pick

Time picker input.

```vue
<gl-time-pick v-model="selectedTime" />
```

---

### gl-week-select

Day-of-week selector for scheduling.

```vue
<gl-week-select v-model="selectedDays" />
```

---

### gl-upload-card

File upload with drag-and-drop.

```vue
<gl-upload-card @change="handleFile" />
```

---

## Data Display

### gl-table / gl-table-column

Data table. Props extracted from runtime:

**gl-table:**

| Prop | Type | Description |
|------|------|-------------|
| `data` | Array | Row data |
| `border` | Boolean | Show borders |
| `stripe` | Boolean | Striped rows |
| `height` | String/Number | Fixed height |
| `emptyText` | String | Text when empty |

**gl-table-column:**

| Prop | Type | Description |
|------|------|-------------|
| `prop` | String | Key in row data |
| `label` | String | Column header |
| `width` | String/Number | Fixed width |
| `minWidth` | String/Number | Minimum width |
| `sortable` | Boolean/String | Enable sorting |
| `formatter` | Function | Cell value formatter |

```vue
<gl-table :data="rows">
  <gl-table-column prop="name" label="Name" sortable />
  <gl-table-column prop="value" label="Value" />
</gl-table>
```

---

### gl-percent-circle

Circular percentage indicator.

| Prop | Type | Description |
|------|------|-------------|
| `percent` | Number | Value 0-100 |

```vue
<gl-percent-circle :percent="75" />
```

---

### gl-line-chart

Line chart for trends.

```vue
<gl-line-chart :data="chartData" />
```

---

### gl-battery

Battery level icon.

| Prop | Type | Description |
|------|------|-------------|
| `size` | Number | Icon size |
| `vertical` | Boolean | Vertical orientation |
| `theme` | String | Color theme |

```vue
<gl-battery :size="24" />
```

---

### gl-wireless-signal

Wi-Fi signal strength icon.

```vue
<gl-wireless-signal :level="3" />
```

---

### gl-qrcode

QR code generator.

```vue
<gl-qrcode :value="qrData" />
```

---

### gl-ellipsis-tooltip

Truncates text with hover tooltip.

| Prop | Type | Description |
|------|------|-------------|
| `placement` | String | `"top"`, `"bottom"`, `"left"`, `"right"` |

```vue
<gl-ellipsis-tooltip placement="top">
  Very long text that gets truncated...
</gl-ellipsis-tooltip>
```

---

## Feedback

### gl-tips

Inline tip block.

**Important:** Pass text via the `:tips` prop, not slot content. Slot content renders empty.

| Prop | Type | Description |
|------|------|-------------|
| `tips` | String | The message text |
| `state` | String | `"info"`, `"warning"`, `"error"`, `"success"` |
| `sign` | String | Icon style (`"none"` to hide) |
| `iconClass` | String | Custom icon class |

```vue
<gl-tips state="warning" tips="Changes require a reboot." />
<gl-tips v-if="error" state="error" :tips="error" />
```

---

### gl-guide-icon

Help icon with tooltip on hover.

| Prop | Type | Description |
|------|------|-------------|
| `content` | String | Tooltip text |

```vue
<gl-guide-icon content="This controls the DNS server." />
```

---

### $message (programmatic)

Toast notification. Not a component — called via `this.$message()`.

```js
this.$message({ type: 'success', message: 'Settings saved.' });
this.$message({ type: 'error', message: 'Operation failed.' });
```

---

### $alert (programmatic)

Alert dialog. Called via `this.$alert()`.

```js
this.$alert('Are you sure?', 'Confirm', {
  confirmButtonText: 'OK',
  callback: function(action) { /* ... */ }
});
```

---

### gl-pwd-strength

Password strength indicator.

```vue
<gl-pwd-strength :password="newPassword" />
```

---

## Element UI Components

The admin panel bundles Element UI 2.x. These components are globally available:

| Component | Tag | Purpose |
|-----------|-----|---------|
| ElDialog | `<ElDialog>` | Modal dialog |
| ElForm | `<ElForm>` | Form wrapper with validation |
| el-form-item | `<el-form-item>` | Form field wrapper |
| el-input | `<el-input>` | Text/textarea/password input |
| el-select | `<el-select>` | Dropdown select |
| ElOption | `<ElOption>` | Select option |
| ElTabs / ElTabPane | `<ElTabs>` | Tab panels |
| ElTooltip | `<ElTooltip>` | Hover tooltip |
| ElPopover | `<ElPopover>` | Click/hover popover |
| ElSlider | `<ElSlider>` | Range slider |
| ElPagination | `<ElPagination>` | Page navigation |
| ElMenu / ElMenuItem | `<ElMenu>` | Navigation menu |

See [Element UI 2.x docs](https://element.eleme.io/#/en-US/component/) for full API.

---

## Other GL.iNet Components

| Component | Tag | Purpose |
|-----------|-----|---------|
| GlDraggableSort | `<GlDraggableSort>` | Drag-and-drop reordering |
| GlScanWifi | `<GlScanWifi>` | Wi-Fi scanning trigger |
| GlWifiList | `<GlWifiList>` | Wi-Fi network list for selection |

---

## Complete Globally Registered Component List

Firmware 4.8.1, GL-MT3000. Extracted via `Object.keys(Vue.options.components)`:

**GL.iNet (kebab-case):**
```
gl-battery          gl-ellipsis-tooltip  gl-private          gl-time-pick
gl-button           gl-guide-icon        gl-pwd-strength     gl-tips
gl-card             gl-line-chart        gl-qrcode           gl-title
gl-cascader         gl-link              gl-search-input     gl-upload-card
gl-drawer           gl-percent-circle    gl-switch           gl-week-select
                                         gl-table            gl-wireless-signal
                                         gl-table-column
```

**GL.iNet (PascalCase):**
```
GlCheckbox       GlCollapseGroup   GlDropdownItem    GlScanWifi
GlCheckboxGroup  GlDraggableSort   GlRadio           GlToggle
GlCollapse       GlDropdown        GlRadioGroup      GlToggleItem
                                   GlWifiList
```

**Element UI:**
```
ElDialog         ElMenuItem        ElPagination      ElTabs
ElForm           ElMenuItemGroup   ElPopover         ElTooltip
ElMenu           ElOption          ElSlider
el-form-item     el-input          el-select
```

**NOT globally registered (local only, unavailable to plugins):**
```
gl-btn           gl-alert          gl-message-fade
```

---

## Notes

- Use CSS variables for theming: `--error-color`, `--warning-color`, `--success-color`,
  `--title-color`, `--text-color`, `--hint-color`, `--card-bg`, `--table-border`, etc.
- Props were extracted via `Vue.options.components[name].options.props` at runtime.
- See `docs/theme.md` for the full list of CSS variables.
- Use `glplugin extract root@<router-ip>` to re-extract from any firmware version.
