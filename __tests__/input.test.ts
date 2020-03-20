import { getInput, getInputBool, getInputList } from '../src/input';

describe('input', () => {
    describe('getInput', () => {
        it('env.INPUT_FOO | getInput("foo")', () => {
            process.env['INPUT_FOO'] = '12345';
            expect(getInput('foo')).toBe('12345');
        });

        it('env.INPUT_FOO-BAR | getInput("foo-bar")', () => {
            process.env['INPUT_FOO-BAR'] = '12345';
            expect(getInput('foo-bar')).toBe('12345');
        });

        it('env.INPUT_FOO_BAR | getInput("foo-bar")', () => {
            process.env['INPUT_FOO_BAR'] = '12345';
            expect(getInput('foo-bar')).toBe('12345');
        });
    });

    describe('getInputBool', () => {
        it('"true" == true', () => {
            process.env['INPUT_VALUE'] = 'true';
            expect(getInputBool('value')).toBe(true);
        });

        it('"1" == true', () => {
            process.env['INPUT_VALUE'] = '1';
            expect(getInputBool('value')).toBe(true);
        });

        it('"" == false', () => {
            process.env['INPUT_VALUE'] = '';
            expect(getInputBool('value')).toBe(false);
        });

        it('"foobar" == false', () => {
            process.env['INPUT_VALUE'] = 'foobar';
            expect(getInputBool('value')).toBe(false);
        });
    });

    describe('getInputList', () => {
        it('empty', () => {
            process.env['INPUT_VALUE'] = '';
            expect(getInputList('value')).toStrictEqual([]);
        });
        it('", ,, "', () => {
            process.env['INPUT_VALUE'] = ', ,, ';
            expect(getInputList('value')).toStrictEqual([]);
        });
        it('"one,two,three"', () => {
            process.env['INPUT_VALUE'] = 'one,two,three';
            expect(getInputList('value')).toStrictEqual([
                'one',
                'two',
                'three',
            ]);
        });
        it('",one , two , three"', () => {
            process.env['INPUT_VALUE'] = ',one , two , three';
            expect(getInputList('value')).toStrictEqual([
                'one',
                'two',
                'three',
            ]);
        });
    });
});
