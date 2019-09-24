const os = require('os');
const fs = require('fs');
const path = require('path');
const process = require('process');

import * as io from '@actions/io';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as download from 'download';

export interface ToolchainOptions {
    default?: boolean,
    override?: boolean,
    profile?: 'minimal' | 'default' | 'full',
}

export class RustUp {
    private readonly path: string;

    private constructor(exePath: string) {
        this.path = exePath;
    }

    // Will throw an error if `rustup` is not installed.
    public static async get(): Promise<RustUp> {
        const exePath = await io.which('rustup', true);

        return new RustUp(exePath);
    }

    public async install(): Promise<RustUp> {
        const args = [
            '--default-toolchain',
            'none',
        ];

        switch (process.platform) {
            case 'darwin':
            case 'linux':  // Should be installed already, but just in case
                const rustupSh = await this.downloadRustInit('https://sh.rustup.rs', 'rustup-init.sh');
                await exec.exec(rustupSh, args);
                break;

            case 'win32':
                const rustupExe = await this.downloadRustInit('http://win.rustup.rs', 'rustup-init.exe');
                await exec.exec(rustupExe, args);
                break;

            default:
                throw new Error(`Unknown platform ${process.platform}, can't install rustup`);
        }

        core.addPath(path.join(process.env['HOME'], '.cargo', 'bin'));

        // Assuming it is in the $PATH already
        return new RustUp('rustup');
    }

    public async installToolchain(name: string, options?: ToolchainOptions): Promise<number> {
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

    public async installTarget(name: string, forToolchain?: string): Promise<number> {
        let args = ['target', 'add'];
        if (forToolchain) {
            args.push('--toolchain');
            args.push(forToolchain);
        }
        args.push(name);

        return await this.call(args);
    }

    public async call(args: string[], options?: {}): Promise<number> {
        return await exec.exec(this.path, args, options);
    }

    private downloadRustInit(url: string, outputName: string): Promise<string> {
        const absPath = path.join(os.tmpdir(), outputName);

        return new Promise((resolve, reject) => {
            let req = download(url);
            let output = fs.createWriteStream(absPath, {
                mode: 0o755
            });

            req.pipe(output);
            req.on('end', () => {
                output.close(resolve);
            });
            req.on('error', reject);
            output.on('error', reject);
        })
        .then(() => {
            return absPath;
        });
    }
}
