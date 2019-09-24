import * as core from '@actions/core';

/**
 * Workaround for a GitHub weird input naming.
 *
 * For input `all-features: true` it will generate the `INPUT_ALL-FEATURES: true`
 * env variable, which looks too weird.
 * Here we are trying to get proper name `INPUT_NO_DEFAULT_FEATURES` first,
 * and if it does not exist, trying the `INPUT_NO-DEFAULT-FEATURES`.
 **/
export function getInput(name: string, options?: core.InputOptions): string {
    const inputFullName = name.replace(/-/g, '_');
    let value = core.getInput(inputFullName, options);
    if (value.length > 0) {
        return value
    }

    return core.getInput(name, options);
}

export function getInputBool(name: string, options?: core.InputOptions): boolean {
    const value = getInput(name, options);
    if (value && (value === 'true' || value === '1')) {
        return true;
    } else {
        return false;
    }
}
