const path = require('path');

module.exports = {
  mode: 'production',
  target: 'electron-main',
  entry: path.resolve(__dirname, 'src/main/index.js'),
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'index.js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.js'],
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
      '@renderer': path.resolve(__dirname, 'src/renderer')
    }
  }
};

