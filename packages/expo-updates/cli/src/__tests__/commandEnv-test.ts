import { loadProjectEnv } from '@expo/env';

import { resolveRuntimeVersion } from '../resolveRuntimeVersion';
import { syncConfigurationToNative } from '../syncConfigurationToNative';
import { syncConfigurationToNativeAsync } from '../syncConfigurationToNativeAsync';

const mockResolveRuntimeVersionAsync = jest.fn();

jest.mock('@expo/env', () => ({
  ...jest.requireActual('@expo/env'),
  loadProjectEnv: jest.fn(),
}));
jest.mock('../syncConfigurationToNativeAsync');
jest.mock(
  '../../../utils/build/resolveRuntimeVersionAsync.js',
  () => ({ resolveRuntimeVersionAsync: mockResolveRuntimeVersionAsync }),
  { virtual: true }
);

describe.each([
  { parentMode: undefined, expectedMode: 'production' },
  { parentMode: 'development', expectedMode: 'development' },
])('with parent mode $parentMode', ({ parentMode, expectedMode }) => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.__EXPO_CONFIG_MODE;
    if (parentMode) {
      process.env.__EXPO_CONFIG_MODE = parentMode;
    }
    mockResolveRuntimeVersionAsync.mockResolvedValue({
      runtimeVersion: '1',
      fingerprintSources: null,
      workflow: 'managed',
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('loads env files before resolving the runtime version', async () => {
    await resolveRuntimeVersion(['--platform', 'ios']);

    expect(loadProjectEnv).toHaveBeenCalledWith(expect.any(String), {
      mode: expectedMode,
      silent: true,
    });
    expect(jest.mocked(loadProjectEnv).mock.invocationCallOrder[0]).toBeLessThan(
      mockResolveRuntimeVersionAsync.mock.invocationCallOrder[0]!
    );
  });

  it('loads env files before syncing native configuration', async () => {
    await syncConfigurationToNative(['--platform', 'android', '--workflow', 'generic']);

    expect(loadProjectEnv).toHaveBeenCalledWith(expect.any(String), { mode: expectedMode });
    expect(jest.mocked(loadProjectEnv).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(syncConfigurationToNativeAsync).mock.invocationCallOrder[0]!
    );
  });
});
