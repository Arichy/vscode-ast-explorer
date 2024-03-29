import compileModule from '../../../utils/compileModule';
import pkg from 'posthtml/package.json';
import transpile from '../../../transpilers/babel';
import * as posthtml from 'posthtml';

const ID = 'posthtml';

export default {
  id: ID,
  displayName: ID,
  version: pkg.version,
  homepage: pkg.homepage || 'https://github.com/posthtml/posthtml',

  defaultParserID: 'posthtml-parser',

  loadTransformer(callback) {
    callback({ transpile, posthtml });
  },

  transform({ transpile, posthtml }, transformCode, code) {
    // transpile with babel for es6+ support
    transformCode = transpile(transformCode);
    // compile to turn from string into a module
    let transform = compileModule(
      // eslint-disable-line no-shadow
      transformCode
    );
    return posthtml()
      .use(transform.default || transform)
      .process(code, { sync: true }).html;
  },
};
