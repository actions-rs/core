import * as path from 'path';
import * as process from 'process';

import * as io from '@actions/io';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';

export interface ToolchainOptions {
    default?: boolean;
    override?: boolean;
    profile?: 'minimal' | 'default' | 'full';
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
        const args = ['--default-toolchain', 'none'];

        switch (process.platform) {
            case 'darwin':
            case 'linux': {
                // eslint-disable-line prettier/prettier
                const rustupSh = await tc.downloadTool('https://sh.rustup.rs');
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
        await this.call(['toolchain', 'install', name]);

        if (options && options.default) {
            await this.call(['default', name]);
        }

        if (options && options.override) {
            await this.call(['override', 'set', name]);
        }

        // TODO: Support profiles

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
        let stdout = '';
        await this.call(['show', 'active-toolchain'], {
            listeners: {
                stdout: (buffer: Buffer) => {
                    stdout = buffer.toString().trim();
                },
            },
        });

        if (stdout) {
            return stdout.split(' ', 2)[0];
        } else {
            throw new Error('Unable to determine active toolchain');
        }
    }

    // rustup which `program`
    public async which(program: string): Promise<string> {
        let stdout = '';
        await this.call(['which', program], {
            listeners: {
                stdout: (buffer: Buffer) => {
                    stdout = buffer.toString().trim();
                },
            },
        });

        if (stdout) {
            return stdout;
        } else {
            throw new Error(`Unable to find the ${program}`);
        }
    }

    public async call(args: string[], options?: {}): Promise<number> {
        return await exec.exec(this.path, args, options);
    }
}
