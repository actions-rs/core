import * as core from '@actions/core';
import { Octokit } from '@octokit/action';
import { Cargo } from '../cargo';
import * as cargoMake from './cargo-make';
import * as cargoTarpaulin from './cargo-tarpaulin';
import * as cargoWeb from './cargo-web';
import * as grcov from './grcov';
import * as mdbook from './mdbook';

export type Task = Promise<void>;

export interface Installer {
    install(version?: string): Task;
}

export interface Config {
    command: string;
    version: string;
    platforms: string[];
    installer: Installer;
}

class CargoInstaller implements Installer {
    cargo: Cargo;
    program: string;

    constructor(cargo: Cargo, program: string) {
        this.cargo = cargo;
        this.program = program;
    }

    async install(version?: string): Task {
        const args = ['install'];
        if (version && version != 'latest') {
            args.push('--version');
            args.push(version);
        }
        args.push(this.program);

        await this.cargo.call(args);
    }
}

class FallbackInstaller implements Installer {
    installer: Installer;
    cargo: Installer;

    constructor(installer: Installer, cargo: Installer) {
        this.installer = installer;
        this.cargo = cargo;
    }

    async install(version?: string): Task {
        try {
            await this.installer.install(version);
        } catch (error) {
            core.error(
                `Downloading the binary release failed: ${error.message}`,
            );
            core.error('Fallback to `cargo install`');
            await this.cargo.install(version);
        }
    }
}

// Force unauthenticated when no GitHub token is provided.
const GitHub = Octokit.defaults(
    process.env.GITHUB_TOKEN !== undefined ? {} : { authStrategy: undefined },
);

export async function getLatestRelease(
    owner: string,
    repo: string,
): Promise<string> {
    const github = new GitHub();
    const { data: release } = await github.repos.getLatestRelease({
        owner,
        repo,
    });
    return release.tag_name;
}

export const CONFIG = new Map([
    cargoMake.config(),
    cargoTarpaulin.config(),
    cargoWeb.config(),
    grcov.config(),
    mdbook.config(),
]);

export default class Installers {
    static get(cargo: Cargo, program: string): Installer {
        const platform = process.platform;
        const config = CONFIG.get(program);
        const installer = new CargoInstaller(cargo, program);
        if (config && config.platforms.includes(platform)) {
            return new FallbackInstaller(config.installer, installer);
        }
        return installer;
    }
}
