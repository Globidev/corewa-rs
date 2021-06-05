const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require('path');

module.exports = {
  entry: "./src/index.tsx",

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      // {
      //   test: /\.wasm$/,
      //   type: "webassembly/experimental"
      // },
      {
        test: /\.(svg|png|md)$/,
        use: [
          'file-loader',
        ],
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.wasm'],
    fallback: { path: false }
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  mode: "development",
  plugins: [
    new CopyWebpackPlugin(['public/index.html'])
  ],
  experiments: {
    asyncWebAssembly: true,
  },
  devServer: {
    compress: true,
    inline: true,
    port: '8080',
    allowedHosts: [
      'manjaro'
    ]
  },
};
