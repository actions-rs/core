"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const github = __importStar(require("@actions/github"));
class CheckReporter {
    constructor(client, checkName) {
        this.client = client;
        this.checkName = checkName;
        this.checkId = undefined;
    }
    async startCheck(status) {
        const { owner, repo } = github.context.repo;
        const response = await this.client.checks.create({
            owner: owner,
            repo: repo,
            name: this.checkName,
            head_sha: github.context.sha,
            status: status ? status : 'in_progress',
        });
        this.checkId = response.data.id;
        return this.checkId;
    }
    async finishCheck(conclusion, output) {
        const { owner, repo } = github.context.repo;
        await this.client.checks.update({
            owner: owner,
            repo: repo,
            name: this.checkName,
            check_run_id: this.checkId,
            status: 'completed',
            conclusion: conclusion,
            completed_at: new Date().toISOString(),
            output: output,
        });
        return;
    }
    async cancelCheck() {
        const { owner, repo } = github.context.repo;
        await this.client.checks.update({
            owner: owner,
            repo: repo,
            name: this.checkName,
            check_run_id: this.checkId,
            status: 'completed',
            conclusion: 'cancelled',
            completed_at: new Date().toISOString(),
            output: {
                title: this.checkName,
                summary: 'Unhandled error',
                text: 'Check was cancelled due to unhandled error. Check the Action logs for details.',
            },
        });
        return;
    }
}
exports.CheckReporter = CheckReporter;
