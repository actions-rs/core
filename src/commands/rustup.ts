import { promises as fs } from 'fs';
import * as path from 'path';
import * as process from 'process';

import * as semver from 'semver';
import * as io from '@actions/io';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';

const PROFILES_MIN_VERSION = '1.20.1';
const COMPONENTS_MIN_VERSION = '1.20.1';

type Profile = 'minimal' | 'default' | 'full';

export interface ToolchainOptions {
    default?: boolean;
    override?: boolean;
    components?: string[];
    noSelfUpdate?: boolean;
}

export class RustUp {
    private readonly path: string;

    private constructor(exePath: string) {
        this.path = exePath;
    }

    public static async getOrInstall(): Promise<RustUp> {
        try {
            return await RustUp.get();
        } catch (error) {
            core.debug(
                `Unable to find "rustup" executable, installing it now. Reason: ${error}`,
            );
            return await RustUp.install();
        }
    }

    // Will throw an error if `rustup` is not installed.
    public static async get(): Promise<RustUp> {
        const exePath = await io.which('rustup', true);

        return new RustUp(exePath);
    }

    public static async install(): Promise<RustUp> {
        const args = [
            '--default-toolchain',
            'none',
            '-y', // No need for the prompts (hard error from within the Docker containers)
        ];

        switch (process.platform) {
            case 'darwin':
            case 'linux': {
                // eslint-disable-line prettier/prettier
                const rustupSh = await tc.downloadTool('https://sh.rustup.rs');

                // While the `rustup-init.sh` is properly executed as is,
                // when Action is running on the VM itself,
                // it fails with `EACCES` when called in the Docker container.
                // Adding the execution bit manually just in case.
                // See: https://github.com/actions-rs/toolchain/pull/19#issuecomment-543358693
                core.debug(`Executing chmod 755 on the ${rustupSh}`);
                await fs.chmod(rustupSh, 0o755);

                await exec.exec(rustupSh, args);
                break;
            }

            case 'win32': {
                const rustupExe = await tc.downloadTool('http://win.rustup.rs');
                await exec.exec(rustupExe, args);
                break;
            }

            default:
                throw new Error(
                    `Unknown platform ${process.platform}, can't install rustup`,
                );
        }

        // `$HOME` should always be declared, so it is more to get the linters happy
        core.addPath(path.join(process.env.HOME!, '.cargo', 'bin')); // eslint-disable-line @typescript-eslint/no-non-null-assertion

        // Assuming it is in the $PATH already
        return new RustUp('rustup');
    }

    public async installToolchain(
        name: string,
        options?: ToolchainOptions,
    ): Promise<number> {
        const args = ['toolchain', 'install', name];
        if (options && options.components && options.components.length > 0) {
            for (const component of options.components) {
                args.push('--component');
                args.push(component);
            }
        }
        if (options && options.noSelfUpdate) {
            args.push('--no-self-update');
        }
        await this.call(args);

        if (options && options.default) {
            await this.call(['default', name]);
        }

        if (options && options.override) {
            await this.call(['override', 'set', name]);
        }

        // TODO: Is there smth like Rust' `return Ok(())`?
        return 0;
    }

    public async addTarget(
        name: string,
        forToolchain?: string,
    ): Promise<number> {
        const args = ['target', 'add'];
        if (forToolchain) {
            args.push('--toolchain');
            args.push(forToolchain);
        }
        args.push(name);

        return await this.call(args);
    }

    public async activeToolchain(): Promise<string> {
        const stdout = await this.callStdout(['show', 'active-toolchain']);

        if (stdout) {
            return stdout.split(' ', 2)[0];
        } else {
            throw new Error('Unable to determine active toolchain');
        }
    }

    public async supportProfiles(): Promise<boolean> {
        const version = await this.version();
        const supports = semver.gte(version, PROFILES_MIN_VERSION);
        if (supports) {
            core.info(`Installed rustup ${version} support profiles`);
        } else {
            core.info(`Installed rustup ${version} does not support profiles, \
expected at least ${PROFILES_MIN_VERSION}`);
        }
        return supports;
    }

    public async supportComponents(): Promise<boolean> {
        const version = await this.version();
        const supports = semver.gte(version, COMPONENTS_MIN_VERSION);
        if (supports) {
            core.info(`Installed rustup ${version} support components`);
        } else {
            core.info(`Installed rustup ${version} does not support components, \
expected at least ${PROFILES_MIN_VERSION}`);
        }
        return supports;
    }

    /**
     * Executes `rustup set profile ${name}`
     *
     * Note that it includes the check if currently installed rustup support profiles at all
     */
    public async setProfile(name: Profile): Promise<number> {
        return await this.call(['set', 'profile', name]);
    }

    public async version(): Promise<string> {
        const stdout = await this.callStdout(['-V']);

        return stdout.split(' ')[1];
    }

    // rustup which `program`
    public async which(program: string): Promise<string> {
        const stdout = await this.callStdout(['which', program]);

        if (stdout) {
            return stdout;
        } else {
            throw new Error(`Unable to find the ${program}`);
        }
    }

    public async selfUpdate(): Promise<number> {
        return await this.call(['self', 'update']);
    }

    public async call(args: string[], options?: {}): Promise<number> {
        return await exec.exec(this.path, args, options);
    }

    /**
     * Call the `rustup` and return an stdout
     */
    async callStdout(args: string[], options?: {}): Promise<string> {
        let stdout = '';
        const resOptions = Object.assign({}, options, {
            listeners: {
                stdout: (buffer: Buffer) => {
                    stdout += buffer.toString();
                },
            },
        });

        await this.call(args, resOptions);

        return stdout;
    }
}
