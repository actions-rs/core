"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(require("os"));
const io = __importStar(require("@actions/io"));
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const cargo_1 = require("./cargo");
class Cross {
    constructor(path) {
        this.path = path;
    }
    static async getOrInstall() {
        try {
            return await Cross.get();
        }
        catch (error) {
            core.debug(`${error}`);
            return await Cross.install();
        }
    }
    static async get() {
        const path = await io.which('cross', true);
        return new Cross(path);
    }
    static async install(version) {
        const cargo = await cargo_1.Cargo.get();
        const cwd = process.cwd();
        process.chdir(os.tmpdir());
        try {
            const crossPath = await cargo.installCached('cross', version);
            return new Cross(crossPath);
        }
        finally {
            process.chdir(cwd);
            core.endGroup();
        }
    }
    async call(args, options) {
        return await exec.exec(this.path, args, options);
    }
}
exports.Cross = Cross;
