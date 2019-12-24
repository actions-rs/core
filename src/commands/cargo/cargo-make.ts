import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import { Config, Installer, Task, getLatestRelease } from './installer';

async function resolveVersion(value?: string): Promise<string> {
    if (value === 'latest' || value === undefined) {
        return await getLatestRelease('sagiegurari', 'cargo-make');
    }
    return Promise.resolve(value);
}

class CargoMakeInstaller implements Installer {
    async install(version?: string): Task {
        version = await resolveVersion(version);

        let arch = '';
        let archFolder = '';
        switch (process.platform) {
            case 'linux':
                arch = 'x86_64-unknown-linux-musl';
                archFolder = `cargo-make-v${version}-${arch}`;
                break;
            case 'darwin':
                arch = 'x86_64-apple-darwin';
                archFolder = `cargo-make-v${version}-${arch}`;
                break;
            case 'win32':
                arch = 'x86_64-pc-windows-msvc';
                break;
            default:
                throw Error(`Unsupported platform: ${process.platform}`);
        }

        const tmpFolder = path.join(os.tmpdir(), `setup-cargo-make-${version}`);
        await io.mkdirP(tmpFolder);

        const archive = `cargo-make-v${version}-${arch}`;
        const cacheKey = `cargo-make-${process.platform}`;
        const url = `https://github.com/sagiegurari/cargo-make/releases/download/${version}/${archive}.zip`;

        let binPath = tc.find(cacheKey, version);
        if (!binPath) {
            const downloaded = await tc.downloadTool(url);
            const extracted = await tc.extractZip(downloaded, tmpFolder);
            const cachePath = path.join(extracted, archFolder);

            binPath = await tc.cacheDir(cachePath, cacheKey, version);
        }
        core.addPath(binPath);
    }
}

export function config(): [string, Config] {
    return [
        'cargo-make',
        {
            command: 'cargo-make',
            version: '0.24.3',
            platforms: ['linux', 'darwin', 'win32'],
            installer: new CargoMakeInstaller(),
        },
    ];
}
