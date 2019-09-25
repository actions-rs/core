const os = require('os');

import * as io from '@actions/io';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

import {Cargo} from './cargo';

export class Cross {
    private readonly path: string;

    private constructor(path: string) {
        this.path = path;
    }

    public static async getOrInstall(): Promise<Cross> {
        try {
            return await Cross.get();
        } catch (error) {
            core.debug(`${error}`);
            return await Cross.install();
        }
    }

    public static async get(): Promise<Cross> {
        const path = await io.which('cross', true);

        return new Cross(path);
    }

    public static async install(version?: string): Promise<Cross> {
        const cargo = await Cargo.get();

        // Somewhat new Rust is required to compile `cross`
        // (TODO: Not sure what version exactly, should clarify)
        // but if some action will set an override toolchain before this action called
        // (ex. `@actions-rs/toolchain` with `toolchain: 1.31.0`)
        // `cross` compilation will fail.
        //
        // In order to skip this problem and install `cross` globally
        // using the pre-installed system Rust,
        // we are going to jump to the tmpdir (skipping directory override that way)
        // install `cross` from there and then jump back.

        const cwd = process.cwd();
        process.chdir(os.tmpdir());

        try {
            core.startGroup('Installing cross');

            let args = ['install'];
            if (version && version != 'latest') {
                args.push('--version');
                args.push(version);
            }
            args.push('cross');

            await cargo.call(args);

            // Assuming that `cross` executable is in `$PATH` already
            return new Cross('cross');
        } finally {
            // It is important to chdir back!
            process.chdir(cwd);
            core.endGroup();
        }
    }

    public async call(args: string[], options?: {}): Promise<number> {
        return await exec.exec(this.path, args, options);
    }
}
