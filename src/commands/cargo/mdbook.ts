import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as semver from 'semver';
import * as tc from '@actions/tool-cache';
import { Config, Installer, Task, getLatestRelease } from './installer';

async function resolveVersion(value?: string): Promise<string> {
    if (value === 'latest' || value === undefined) {
        return await getLatestRelease('rust-lang', 'mdBook');
    }
    value = 'v' + semver.coerce(value);
    return Promise.resolve(value);
}

class MdbookInstaller implements Installer {
    async install(version?: string): Task {
        version = await resolveVersion(version);

        let arch = '';
        let archExt = '.tar.gz';
        switch (process.platform) {
            case 'linux':
                arch = 'x86_64-unknown-linux-gnu';
                break;
            case 'darwin':
                arch = 'x86_64-apple-darwin';
                break;
            case 'win32':
                arch = 'x86_64-pc-windows-msvc';
                archExt = '.zip';
                break;
            default:
                throw Error(`Unsupported platform: ${process.platform}`);
        }

        const tmpFolder = path.join(os.tmpdir(), `setup-mdbook-${version}`);
        await io.mkdirP(tmpFolder);

        const archive = `mdbook-${version}-${arch}`;
        const cacheKey = `mdbook-${process.platform}`;
        const url = `https://github.com/rust-lang/mdBook/releases/download/${version}/${archive}${archExt}`;

        let binPath = tc.find(cacheKey, version);
        if (!binPath) {
            const downloaded = await tc.downloadTool(url);
            let extracted;
            if (process.platform == 'win32') {
                extracted = await tc.extractZip(downloaded, tmpFolder);
            } else {
                extracted = await tc.extractTar(downloaded, tmpFolder);
            }

            binPath = await tc.cacheDir(extracted, cacheKey, version);
        }
        core.addPath(binPath);
    }
}

export function config(): [string, Config] {
    return [
        'mdbook',
        {
            command: 'mdbook',
            version: '0.3.4',
            platforms: ['linux', 'darwin', 'win32'],
            installer: new MdbookInstaller(),
        },
    ];
}
