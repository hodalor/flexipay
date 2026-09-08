const path = require('path');
const moduleAlias = require('module-alias');

const packageRoot = path.resolve(__dirname, '../..');

moduleAlias.addAliases({
  '@main': path.resolve(packageRoot, 'src/main'),
  '@renderer': path.resolve(packageRoot, 'src/renderer')
});
