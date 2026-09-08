module.exports = {
  presets: [
    ['@babel/preset-env', { targets: 'defaults' }],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  plugins: [
    ['module-resolver', {
      root: ['./src'],
      alias: {
        '@': './src',
        '@api': './src/api',
        '@components': './src/components',
        '@hooks': './src/hooks',
        '@pages': './src/pages'
      }
    }]
  ]
};

