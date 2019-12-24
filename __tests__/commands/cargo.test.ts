import * as io from '@actions/io';
import { Config, CONFIG } from '../../src/commands/cargo/installer';

describe = process.env.TEST_INSTALLERS === 'true' ? describe : describe.skip;

const CONFIG_WITH_VERSION: [string, string, Config][] = Array.from(CONFIG).map(
    ([command, config]) => {
        return [command, config.version, config];
    },
);

describe('Test binary installers', () => {
    it.each(Array.from(CONFIG))(
        'Install %s@latest',
        async (command: string, config: Config) => {
            const { platforms, installer } = config;
            const t = installer.install('latest');

            if (platforms.includes(process.platform)) {
                await expect(t).resolves.toBeUndefined();
                expect(await io.which(command)).toEqual(
                    expect.stringContaining(command),
                );
            } else {
                const e = new Error(
                    `Unsupported platform: ${process.platform}`,
                );
                await expect(t).rejects.toThrow(e);
            }
        },
    );

    it.each(CONFIG_WITH_VERSION)(
        'Install %s@%s',
        async (command, version, config) => {
            const { platforms, installer } = config;
            const t = installer.install(version);

            if (platforms.includes(process.platform)) {
                await expect(t).resolves.toBeUndefined();
                expect(await io.which(command)).toEqual(
                    expect.stringContaining(command),
                );
            } else {
                const e = new Error(
                    `Unsupported platform: ${process.platform}`,
                );
                await expect(t).rejects.toThrow(e);
            }
        },
    );
});
