const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const scriptPath = path.resolve(__dirname, '../getAppConfig.js');

describe('getAppConfig', () => {
  let projectRoot;
  let destinationDir;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-constants-config-'));
    destinationDir = path.join(projectRoot, 'output');
    fs.mkdirSync(destinationDir);
    fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}');
    fs.writeFileSync(
      path.join(projectRoot, 'app.config.js'),
      `module.exports = {
        name: 'test',
        slug: 'test',
        extra: { mode: process.env.NODE_ENV, value: process.env.EXPO_PUBLIC_MODE_VALUE },
      };`
    );
    fs.writeFileSync(
      path.join(projectRoot, '.env.development'),
      'EXPO_PUBLIC_MODE_VALUE=development-value\n'
    );
    fs.writeFileSync(
      path.join(projectRoot, '.env.production'),
      'EXPO_PUBLIC_MODE_VALUE=production-value\n'
    );
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it.each([
    { nodeEnv: 'development', modeArg: 'production', mode: 'production' },
    { nodeEnv: 'production', modeArg: undefined, mode: 'production' },
  ])(
    'loads $mode with NODE_ENV=$nodeEnv and mode argument $modeArg',
    ({ nodeEnv, modeArg, mode }) => {
      const env = {
        ...process.env,
        NODE_ENV: nodeEnv,
        EXPO_PUBLIC_MODE_VALUE: 'parent-value',
        __EXPO_ENV_LOADED: JSON.stringify(['EXPO_PUBLIC_MODE_VALUE']),
      };
      delete env.EXPO_NO_DOTENV;
      delete env.EXPO_UNSAFE_DOTENV_KEYS;
      const args = [scriptPath, projectRoot, destinationDir];
      if (modeArg) {
        args.push('ios', 'false', modeArg);
      }

      const result = spawnSync(process.execPath, args, { env, encoding: 'utf8' });

      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      const appConfig = JSON.parse(
        fs.readFileSync(path.join(destinationDir, 'app.config'), 'utf8')
      );
      expect(appConfig.extra).toEqual({ mode, value: `${mode}-value` });
    }
  );
});
