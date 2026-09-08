const path = require('path');
const moduleAlias = require('module-alias');

const packageRoot = path.resolve(__dirname, '..');

moduleAlias.addAliases({
  '@src': path.resolve(packageRoot, 'src'),
  '@config': path.resolve(packageRoot, 'src/config'),
  '@models': path.resolve(packageRoot, 'src/models'),
  '@routes': path.resolve(packageRoot, 'src/routes'),
  '@controllers': path.resolve(packageRoot, 'src/controllers'),
  '@services': path.resolve(packageRoot, 'src/services'),
  '@middleware': path.resolve(packageRoot, 'src/middleware'),
  '@utils': path.resolve(packageRoot, 'src/utils')
});
