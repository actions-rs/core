import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import { Config, Installer, Task, getLatestRelease } from './installer';

async function resolveVersion(value?: string): Promise<string> {
    if (value === 'latest' || value === undefined) {
        return await getLatestRelease('xd009642', 'tarpaulin');
    }
    return Promise.resolve(value);
}

export class TarpaulinInstaller implements Installer {
    async install(version?: string): Task {
        version = await resolveVersion(version);

        let archive = '';
        switch (process.platform) {
            case 'linux':
                archive = `cargo-tarpaulin-${version}-travis`;
                break;
            default:
                throw Error(`Unsupported platform: ${process.platform}`);
        }

        const tmpFolder = path.join(
            os.tmpdir(),
            `setup-cargo-tarpaulin-${version}`,
        );
        await io.mkdirP(tmpFolder);

        const cacheKey = `cargo-tarpaulin-${process.platform}`;
        const url = `https://github.com/xd009642/tarpaulin/releases/download/${version}/${archive}.tar.gz`;

        let binPath = tc.find(cacheKey, version);
        if (!binPath) {
            const downloaded = await tc.downloadTool(url);
            const extracted = await tc.extractTar(downloaded, tmpFolder);

            binPath = await tc.cacheDir(extracted, cacheKey, version);
        }
        core.addPath(binPath);
    }
}

export function config(): [string, Config] {
    return [
        'cargo-tarpaulin',
        {
            command: 'cargo-tarpaulin',
            version: '0.9.3',
            platforms: ['linux'],
            installer: new TarpaulinInstaller(),
        },
    ];
}
