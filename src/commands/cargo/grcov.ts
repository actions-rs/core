import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as semver from 'semver';
import * as tc from '@actions/tool-cache';
import { Config, Installer, Task, getLatestRelease } from './installer';

async function resolveVersion(value?: string): Promise<string> {
    if (value === 'latest' || value === undefined) {
        return await getLatestRelease('mozilla', 'grcov');
    }
    value = 'v' + semver.coerce(value);
    return Promise.resolve(value);
}

class GrcovInstaller implements Installer {
    async install(version?: string): Task {
        version = await resolveVersion(version);

        let arch = '';
        switch (process.platform) {
            case 'linux':
                arch = 'linux-x86_64';
                break;
            case 'darwin':
                arch = 'osx-x86_64';
                break;
            // case 'win32':
            //     arch = 'win-x86_64';
            //     break;
            default:
                throw Error(`Unsupported platform: ${process.platform}`);
        }

        const tmpFolder = path.join(os.tmpdir(), `setup-grcov-${version}`);
        await io.mkdirP(tmpFolder);

        const archive = `grcov-${arch}`;
        const cacheKey = `grcov-${process.platform}`;
        const url = `https://github.com/mozilla/grcov/releases/download/${version}/${archive}.tar.bz2`;

        let binPath = tc.find(cacheKey, version);
        if (!binPath) {
            const downloaded = await tc.downloadTool(url);
            const extracted = await tc.extractTar(downloaded, tmpFolder, 'xj');

            binPath = await tc.cacheDir(extracted, cacheKey, version);
        }
        core.addPath(binPath);
    }
}

export function config(): [string, Config] {
    return [
        'grcov',
        {
            command: 'grcov',
            version: '0.5.6',
            platforms: ['linux', 'darwin' /*, 'win32'*/],
            installer: new GrcovInstaller(),
        },
    ];
}
