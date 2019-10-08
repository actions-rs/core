"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const io = __importStar(require("@actions/io"));
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
class Cargo {
    constructor(path) {
        this.path = path;
    }
    static async get() {
        try {
            const path = await io.which('cargo', true);
            return new Cargo(path);
        }
        catch (error) {
            core.warning('cargo is not installed by default for some virtual environments, \
see https://help.github.com/en/articles/software-in-virtual-environments-for-github-actions');
            core.warning('To install it, use this action: https://github.com/actions-rs/toolchain');
            throw error;
        }
    }
    async installCached(program, version) {
        const args = ['install'];
        if (version && version != 'latest') {
            args.push('--version');
            args.push(version);
        }
        args.push(program);
        try {
            core.startGroup(`Installing "${program} = ${version || 'latest'}"`);
            await this.call(args);
        }
        finally {
            core.endGroup();
        }
        return program;
    }
    async findOrInstall(program, version) {
        try {
            return await io.which(program, true);
        }
        catch (error) {
            core.info(`${program} is not installed, installing it now`);
        }
        return await this.installCached(program, version);
    }
    async call(args, options) {
        return await exec.exec(this.path, args, options);
    }
}
exports.Cargo = Cargo;
