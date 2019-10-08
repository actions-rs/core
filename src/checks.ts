import * as github from '@actions/github';

interface Output {
    title: string;
    summary: string;
    text: string;
}

/**
 * Thin wrapper around the GitHub Checks API
 */
export class CheckReporter {
    private readonly client: github.GitHub;
    private readonly checkName: string;
    private checkId: undefined | number;

    constructor(client: github.GitHub, checkName: string) {
        this.client = client;
        this.checkName = checkName;
        this.checkId = undefined;
    }

    /**
     * Starts a new Check and returns check ID.
     */
    public async startCheck(
        status?: 'queued' | 'in_progress' | 'completed',
    ): Promise<number> {
        const { owner, repo } = github.context.repo;

        const response = await this.client.checks.create({
            owner: owner,
            repo: repo,
            name: this.checkName,
            head_sha: github.context.sha, // eslint-disable-line
            status: status ? status : 'in_progress',
        });
        // TODO: Check for errors

        this.checkId = response.data.id;
        return this.checkId;
    }

    // TODO:
    //     public async sendAnnotations(annotations: Array<octokit.ChecksCreateParamsOutputAnnotations>): Promise<void> {
    //     }

    /**
     * It is up to caller to call the `startCheck` first!
     */
    public async finishCheck(
        conclusion:
            | 'cancelled'
            | 'success'
            | 'failure'
            | 'neutral'
            | 'timed_out'
            | 'action_required',
        output: Output,
    ): Promise<void> {
        const { owner, repo } = github.context.repo;

        // TODO: Check for errors
        await this.client.checks.update({
            owner: owner,
            repo: repo,
            name: this.checkName,
            check_run_id: this.checkId!, // eslint-disable-line
            status: 'completed',
            conclusion: conclusion,
            completed_at: new Date().toISOString(), // eslint-disable-line
            output: output,
        });

        return;
    }

    public async cancelCheck(): Promise<void> {
        const { owner, repo } = github.context.repo;

        // TODO: Check for errors
        await this.client.checks.update({
            owner: owner,
            repo: repo,
            name: this.checkName,
            check_run_id: this.checkId!, // eslint-disable-line
            status: 'completed',
            conclusion: 'cancelled',
            completed_at: new Date().toISOString(), // eslint-disable-line
            output: {
                title: this.checkName,
                summary: 'Unhandled error',
                text:
                    'Check was cancelled due to unhandled error. Check the Action logs for details.',
            },
        });

        return;
    }
}
