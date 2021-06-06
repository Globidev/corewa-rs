const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require('path');

module.exports = {
  mode: "development",

  entry: "./src/index.tsx",

  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
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
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
      },
    ],
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.wasm'],
    fallback: { path: false }
  },

  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "public/" }]
    })
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
