import * as io from '@actions/io';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

export class Cargo {
    private readonly path: string;

    private constructor(path: string) {
        this.path = path;
    }

    public static async get(): Promise<Cargo> {
        try {
            const path = await io.which('cargo', true);

            return new Cargo(path);
        } catch (error) {
            core.error(
                'cargo is not installed by default for some virtual environments, \
see https://help.github.com/en/articles/software-in-virtual-environments-for-github-actions',
            );
            core.error(
                'To install it, use this action: https://github.com/actions-rs/toolchain',
            );

            throw error;
        }
    }

    /**
     * Executes `cargo install ${program}`.
     *
     * TODO: Caching ability implementation is blocked,
     * see https://github.com/actions-rs/core/issues/31
     * As for now it acts just like an stub and simply installs the program
     * on each call.
     *
     * `version` argument could be either actual program version or `"latest"` string,
     * which can be provided by user input.
     *
     * If `version` is `undefined` or `"latest"`, this method could call the Crates.io API,
     * fetch the latest version and search for it in cache.
     * TODO: Actually implement this.
     *
     * ## Returns
     *
     * Path to the installed program.
     * As the $PATH should be already tuned properly at this point,
     * returned value at the moment is simply equal to the `program` argument.
     */
    public async installCached(
        program: string,
        version?: string,
    ): Promise<string> {
        const args = ['install'];
        if (version && version != 'latest') {
            args.push('--version');
            args.push(version);
        }
        args.push(program);

        try {
            core.startGroup(`Installing "${program} = ${version || 'latest'}"`);
            await this.call(args);
        } finally {
            core.endGroup();
        }

        return program;
    }

    /**
     * Find the cargo sub-command or install it
     */
    public async findOrInstall(
        program: string,
        version?: string,
    ): Promise<string> {
        try {
            return await io.which(program, true);
        } catch (error) {
            core.info(`${program} is not installed, installing it now`);
        }

        return await this.installCached(program, version);
    }

    public async call(args: string[], options?: {}): Promise<number> {
        return await exec.exec(this.path, args, options);
    }
}
