import compileModule from '../../../utils/compileModule';
import pkg from 'prettier/package.json';
import transpile from '../../../transpilers/babel';
import * as prettier from 'prettier/standalone';
import * as babel from 'prettier/parser-babel';

const ID = 'prettier';
const name = 'prettier';

export default {
  id: ID,
  displayName: name,
  version: pkg.version,
  homepage: pkg.homepage,

  defaultParserID: 'babylon7',

  loadTransformer(callback) {
    callback({ transpile, prettier, babel });
  },

  transform({ transpile, prettier, babel }, transformCode, code) {
    transformCode = transpile(transformCode);
    const options = compileModule(transformCode);
    return prettier.format(
      code,
      Object.assign({ plugins: [babel] }, options.default || options)
    );
  },
};
