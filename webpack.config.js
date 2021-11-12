const webpack = require('webpack');
const path = require('path');

/** @type {import('webpack').Configuration} */
const baseConfig = {
  target: 'node',
  entry: './src/extension.ts',
  externals: {
    vscode: 'vscode',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [{ loader: 'ts-loader' }],
      },
    ],
  },
};
/** @type {import('webpack').Configuration} */
const devConfig = {
  ...baseConfig,
  mode: 'development',
  devtool: 'source-map',
};

/** @type {import('webpack').Configuration} */
const buildConfig = {
  ...baseConfig,
  mode: 'production',
};

console.log(process.env.NODE_ENV);

if (process.env.NODE_ENV !== 'production') {
  module.exports = devConfig;
} else {
  module.exports = buildConfig;
}

