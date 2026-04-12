const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const pkg = require('./package.json');

const pluginName = pkg.pluginName || path.basename(process.cwd());

module.exports = {
  mode: 'production',
  entry: './src/index.vue',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `gl-sdk4-ui-${pluginName}.common.js`,
    libraryTarget: 'commonjs2',
    libraryExport: 'default',
  },
  externals: {
    vue: 'vue',
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['vue-style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [new VueLoaderPlugin()],
  resolve: {
    extensions: ['.js', '.vue'],
  },
};
