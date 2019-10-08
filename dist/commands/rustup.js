"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const process = __importStar(require("process"));
const io = __importStar(require("@actions/io"));
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const tc = __importStar(require("@actions/tool-cache"));
class RustUp {
    constructor(exePath) {
        this.path = exePath;
    }
    static async getOrInstall() {
        try {
            return await RustUp.get();
        }
        catch (error) {
            core.debug(`Unable to find "rustup" executable, installing it now. Reason: ${error}`);
            return await RustUp.install();
        }
    }
    static async get() {
        const exePath = await io.which('rustup', true);
        return new RustUp(exePath);
    }
    static async install() {
        const args = ['--default-toolchain', 'none'];
        switch (process.platform) {
            case 'darwin':
            case 'linux': {
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
                throw new Error(`Unknown platform ${process.platform}, can't install rustup`);
        }
        core.addPath(path.join(process.env.HOME, '.cargo', 'bin'));
        return new RustUp('rustup');
    }
    async installToolchain(name, options) {
        await this.call(['toolchain', 'install', name]);
        if (options && options.default) {
            await this.call(['default', name]);
        }
        if (options && options.override) {
            await this.call(['override', 'set', name]);
        }
        return 0;
    }
    async addTarget(name, forToolchain) {
        const args = ['target', 'add'];
        if (forToolchain) {
            args.push('--toolchain');
            args.push(forToolchain);
        }
        args.push(name);
        return await this.call(args);
    }
    async activeToolchain() {
        let stdout = '';
        await this.call(['show', 'active-toolchain'], {
            listeners: {
                stdout: (buffer) => {
                    stdout = buffer.toString().trim();
                },
            },
        });
        if (stdout) {
            return stdout.split(' ', 2)[0];
        }
        else {
            throw new Error('Unable to determine active toolchain');
        }
    }
    async which(program) {
        let stdout = '';
        await this.call(['which', program], {
            listeners: {
                stdout: (buffer) => {
                    stdout = buffer.toString().trim();
                },
            },
        });
        if (stdout) {
            return stdout;
        }
        else {
            throw new Error(`Unable to find the ${program}`);
        }
    }
    async call(args, options) {
        return await exec.exec(this.path, args, options);
    }
}
exports.RustUp = RustUp;
