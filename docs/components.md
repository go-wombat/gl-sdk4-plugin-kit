# GL.iNet Vue Components Reference

> **Important:** These components were discovered via reverse engineering of the GL-MT3000 admin panel
> (firmware SDK 4.x, Vue 2.x). Props, events, and slots listed here are those confirmed through
> analysis but are likely incomplete. Most components accept additional undocumented props.
> All components automatically inherit the active theme via CSS custom properties.

---

## Layout Components

### gl-title

Page title header displayed at the top of a view.

| Prop | Type | Description |
|------|------|-------------|
| `title` | String | The page heading text |

```vue
<gl-title title="My Plugin Page" />
```

---

### gl-card

Card container with optional footer. Uses the default slot for body content.

| Prop | Type | Description |
|------|------|-------------|
| `footer` | Boolean/String | Controls footer area display |

| Slot | Description |
|------|-------------|
| default | Card body content |
| footer | Footer area content (when footer prop is truthy) |

```vue
<gl-card>
  <p>Card body content goes here.</p>
  <template #footer>
    <gl-btn type="primary">Save</gl-btn>
  </template>
</gl-card>
```

---

### gl-drawer

Side panel or modal overlay for secondary content, settings, or detail views.

| Prop | Type | Description |
|------|------|-------------|
| (undocumented) | -- | Visibility and size props expected but not confirmed |

```vue
<gl-drawer>
  <p>Drawer content here.</p>
</gl-drawer>
```

---

### gl-collapse-group

Accordion component for collapsible content sections.

```vue
<gl-collapse-group>
  <!-- Collapse items go here -->
</gl-collapse-group>
```

---

## Buttons and Controls

### gl-btn

Standard button component.

| Prop | Type | Description |
|------|------|-------------|
| `type` | String | Visual style: `"primary"`, `"default"`, `"danger"`, etc. |
| `size` | String | Button size: `"small"`, `"medium"`, `"large"` |
| `loading` | Boolean | Shows a loading spinner and disables interaction |
| `disabled` | Boolean | Disables the button |

```vue
<gl-btn type="primary" :loading="saving" @click="handleSave">
  Save Settings
</gl-btn>
```

---

### gl-switch

Toggle switch for boolean settings.

| Prop | Type | Description |
|------|------|-------------|
| `value` | Boolean | Current toggle state (use with v-model) |
| `disabled` | Boolean | Disables the switch |

| Event | Payload | Description |
|-------|---------|-------------|
| `change` | Boolean | Emitted when toggle state changes |

```vue
<gl-switch v-model="enabled" @change="onToggle" />
```

---

### gl-toggle / gl-toggle-item

Tab-style switcher for choosing between multiple options.

```vue
<gl-toggle v-model="activeTab">
  <gl-toggle-item value="tab1">Tab One</gl-toggle-item>
  <gl-toggle-item value="tab2">Tab Two</gl-toggle-item>
</gl-toggle>
```

---

### gl-link

Styled anchor/link component.

```vue
<gl-link href="https://www.gl-inet.com">GL.iNet Website</gl-link>
```

---

### gl-dropdown / gl-dropdown-item

Dropdown menu for actions or selections.

```vue
<gl-dropdown>
  <gl-dropdown-item @click="doAction1">Action One</gl-dropdown-item>
  <gl-dropdown-item @click="doAction2">Action Two</gl-dropdown-item>
</gl-dropdown>
```

---

## Form Inputs

### gl-private

Password input field with show/hide toggle.

| Prop | Type | Description |
|------|------|-------------|
| `value` | String | Input value (use with v-model) |

| Event | Payload | Description |
|-------|---------|-------------|
| `input` | String | Emitted on value change |

```vue
<gl-private v-model="password" />
```

---

### gl-search-input

Search field with built-in icon and clear button.

```vue
<gl-search-input v-model="searchQuery" />
```

---

### gl-cascader

Cascading/hierarchical selector for multi-level choices.

```vue
<gl-cascader :options="cascadeOptions" v-model="selected" />
```

---

### gl-checkbox-list / gl-checkbox-item

Checkbox group for multi-select options.

```vue
<gl-checkbox-list v-model="selectedItems">
  <gl-checkbox-item value="a">Option A</gl-checkbox-item>
  <gl-checkbox-item value="b">Option B</gl-checkbox-item>
</gl-checkbox-list>
```

---

### gl-radio-wrapper

Radio button group for single-select options.

```vue
<gl-radio-wrapper v-model="choice" :options="radioOptions" />
```

---

### gl-time-pick

Time picker input.

```vue
<gl-time-pick v-model="selectedTime" />
```

---

### gl-week-select

Week/day selector, typically used for scheduling features.

```vue
<gl-week-select v-model="selectedDays" />
```

---

### gl-upload-card

File upload component with drag-and-drop or click-to-browse.

```vue
<gl-upload-card @change="handleFileUpload" />
```

---

## Data Display

### gl-table / gl-table-column

Data table with column definitions and optional sorting.

| gl-table-column Props | Type | Description |
|-----------------------|------|-------------|
| `prop` | String | Key in row data object |
| `label` | String | Column header text |
| `sortable` | Boolean | Enable sorting for this column |

```vue
<gl-table :data="tableData">
  <gl-table-column prop="name" label="Name" sortable />
  <gl-table-column prop="value" label="Value" />
</gl-table>
```

---

### gl-percent-circle

Circular progress/percentage indicator.

| Prop | Type | Description |
|------|------|-------------|
| `percent` | Number | Percentage value (0-100) |

```vue
<gl-percent-circle :percent="75" />
```

---

### gl-line-chart

Line chart for time-series or trend data.

```vue
<gl-line-chart :data="chartData" />
```

---

### gl-battery

Battery level indicator icon.

| Prop | Type | Description |
|------|------|-------------|
| `size` | Number/String | Display size of the battery icon |

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

QR code generator component.

```vue
<gl-qrcode :value="qrData" />
```

---

### gl-ellipsis-tooltip

Truncates overflowing text and shows a tooltip on hover with the full content.

| Prop | Type | Description |
|------|------|-------------|
| `placement` | String | Tooltip position: `"top"`, `"bottom"`, `"left"`, `"right"` |

```vue
<gl-ellipsis-tooltip placement="top">
  This is a very long string that will be truncated...
</gl-ellipsis-tooltip>
```

---

## Feedback

### gl-alert

Alert banner for page-level messages.

```vue
<gl-alert type="warning">Firmware update available.</gl-alert>
```

---

### gl-tips

Inline info, warning, error, or success tip block.

| Prop | Type | Description |
|------|------|-------------|
| `state` | String | One of `"info"`, `"warning"`, `"error"`, `"success"` |

```vue
<gl-tips state="warning">
  Changes require a reboot to take effect.
</gl-tips>
```

---

### gl-message / gl-message-fade

Toast notification that appears temporarily.

| Prop | Type | Description |
|------|------|-------------|
| `type` | String | Message type: `"success"`, `"error"`, `"warning"`, `"info"` |

Typically called programmatically:

```js
this.$message({ type: 'success', message: 'Settings saved.' });
```

---

### gl-guide-icon

Small help/question-mark icon that shows a tooltip on hover.

```vue
<gl-guide-icon content="This setting controls the DNS server." />
```

---

### gl-pwd-strength / gl-pwd-strong

Password strength indicator bar.

| Prop | Type | Description |
|------|------|-------------|
| `password` | String | The password string to evaluate |

```vue
<gl-pwd-strength :password="newPassword" />
```

---

## Utility

### gl-iconfont

Icon component using the GL.iNet icon font.

```vue
<gl-iconfont name="wifi" />
```

---

### gl-is-desktop

Responsive helper component. Renders its slot content only on desktop-width viewports.

```vue
<gl-is-desktop>
  <p>This content is only visible on desktop.</p>
</gl-is-desktop>
```

---

## Notes

- All components use the `gl-` prefix and are globally registered in the admin panel Vue instance.
- Theme CSS variables are inherited automatically; you do not need to pass colors as props.
- This reference was produced by reverse engineering compiled bundles. Many components likely
  support additional props, slots, and events beyond what is listed here. When in doubt, inspect
  the component in the browser DevTools or refer to the bundled source.
