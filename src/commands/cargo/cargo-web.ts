import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import { Config, Installer, Task, getLatestRelease } from './installer';

async function resolveVersion(value?: string): Promise<string> {
    if (value === 'latest' || value === undefined) {
        return await getLatestRelease('koute', 'cargo-web');
    }
    return Promise.resolve(value);
}

class CargoWebInstaller implements Installer {
    async install(version?: string): Task {
        version = await resolveVersion(version);

        let arch = '';
        switch (process.platform) {
            case 'linux':
                arch = 'x86_64-unknown-linux-gnu';
                break;
            case 'darwin':
                arch = 'x86_64-apple-darwin';
                break;
            default:
                throw Error(`Unsupported platform: ${process.platform}`);
        }

        const tmpFolder = path.join(os.tmpdir(), `setup-cargo-web-${version}`);
        await io.mkdirP(tmpFolder);

        const archive = `cargo-web-${arch}`;
        const cacheKey = `cargo-web-${process.platform}`;
        const url = `https://github.com/koute/cargo-web/releases/download/${version}/${archive}.gz`;

        let binPath = tc.find(cacheKey, version);
        if (!binPath) {
            const downloaded = await tc.downloadTool(url);
            await io.mv(downloaded, `${downloaded}.gz`);
            await exec.exec(`gzip -d ${downloaded}`);
            await exec.exec(`chmod +x ${downloaded}`);

            binPath = await tc.cacheFile(
                downloaded,
                'cargo-web',
                cacheKey,
                version,
            );
        }
        core.addPath(binPath);
    }
}

export function config(): [string, Config] {
    return [
        'cargo-web',
        {
            command: 'cargo-web',
            version: '0.6.25',
            platforms: ['linux', 'darwin'],
            installer: new CargoWebInstaller(),
        },
    ];
}
