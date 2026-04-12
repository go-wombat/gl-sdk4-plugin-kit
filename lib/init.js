const fs = require('fs');
const path = require('path');

module.exports = function init(name) {
  if (!name) {
    console.error('Error: Plugin name required. Usage: glplugin init <name>');
    process.exit(1);
  }

  const slug = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const viewId = slug.replace(/-/g, '');
  const dir = path.resolve(process.cwd(), slug);

  if (fs.existsSync(dir)) {
    console.error(`Error: Directory "${slug}" already exists.`);
    process.exit(1);
  }

  console.log(`Creating plugin "${slug}"...`);

  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'i18n'), { recursive: true });

  // package.json
  const pkg = {
    name: `gl-plugin-${slug}`,
    version: '1.0.0',
    private: true,
    pluginName: viewId,
    scripts: {
      build: 'glplugin build',
      deploy: 'glplugin deploy',
    },
    devDependencies: {
      '@babel/core': '^7.24.0',
      '@babel/preset-env': '^7.24.0',
      'babel-loader': '^9.1.3',
      'css-loader': '^6.10.0',
      'vue-loader': '^15.11.1',
      'vue-style-loader': '^4.1.3',
      'vue-template-compiler': '^2.7.16',
      'webpack': '^5.90.0',
      'webpack-cli': '^5.1.4',
    },
  };
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  // webpack.config.js
  const webpackConfig = `const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const pkg = require('./package.json');

module.exports = {
  mode: 'production',
  entry: './src/index.vue',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: \`gl-sdk4-ui-\${pkg.pluginName}.common.js\`,
    libraryTarget: 'commonjs2',
    libraryExport: 'default',
  },
  externals: { vue: 'vue' },
  module: {
    rules: [
      { test: /\\.vue$/, loader: 'vue-loader' },
      { test: /\\.js$/, loader: 'babel-loader', exclude: /node_modules/ },
      { test: /\\.css$/, use: ['vue-style-loader', 'css-loader'] },
    ],
  },
  plugins: [new VueLoaderPlugin()],
  resolve: { extensions: ['.js', '.vue'] },
};
`;
  fs.writeFileSync(path.join(dir, 'webpack.config.js'), webpackConfig);

  // .babelrc
  fs.writeFileSync(path.join(dir, '.babelrc'), JSON.stringify({
    presets: [['@babel/preset-env', { targets: { browsers: ['> 1%', 'last 2 versions', 'not dead'] } }]],
  }, null, 2) + '\n');

  // menu.json
  const title = slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  const i18nKey = viewId.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  const menu = {
    index: 80,
    view: viewId,
    title: { translate: `${i18nKey}.title` },
    icon: 'setting',
    level: 1,
  };
  fs.writeFileSync(path.join(dir, 'menu.json'), JSON.stringify(menu, null, 2) + '\n');

  // i18n — GL.iNet expects files named gl-sdk4-ui-{viewId}.{lang}.json with nested keys
  const i18n = {};
  i18n[i18nKey] = {
    title: title,
  };
  fs.writeFileSync(
    path.join(dir, 'i18n', `gl-sdk4-ui-${viewId}.en.json`),
    JSON.stringify(i18n, null, 2) + '\n'
  );

  // src/index.vue
  const vue = `<template>
  <div class="${slug}-wrapper">
    <gl-title :title="$t('${i18nKey}.title')" />
    <div class="plugin-card">
      <h2 style="margin: 0 0 12px; color: var(--title-color)">
        ${title}
      </h2>
      <p style="color: var(--text-color); line-height: 1.8">
        Plugin is working. Edit <code>src/index.vue</code> to get started.
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: '${slug}',
  data() {
    return {};
  },
  created() {},
  methods: {},
};
</script>

<style scoped>
.${slug}-wrapper {
  padding: 20px 0;
}
.plugin-card {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 24px;
  margin-top: 16px;
}
code {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}
</style>
`;
  fs.writeFileSync(path.join(dir, 'src', 'index.vue'), vue);

  console.log(`
  Plugin "${slug}" created!

  Next steps:
    cd ${slug}
    npm install
    npm run build
    glplugin deploy root@192.168.14.1
  `);
};
