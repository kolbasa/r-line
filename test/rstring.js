import chai, {expect} from 'chai';
import {rstring} from '../rstring.js';

import fs from 'fs';
import mock from 'mock-fs';

const A = 'A';
const B = 'B';
const C = 'C';
const D = 'D';
const N = '\n';

const TEXT_FILE = 'ipsum.txt';
const CONTENT = A + N + B + N + C;
const REPLACING_FILE_LOG = `[INFO] Replacing file - '${TEXT_FILE}'${N}`;

let stdout = '', stderr = '';
const consoleLogOriginal = console.log;
const consoleErrorOriginal = console.error;

/**
 * @returns {void}
 */
function startLogRecording() {
    console.log = (str) => {
        stdout += str + N;
    };
    console.error = (str) => {
        stderr += str + N;
    };
}

/**
 * @param {boolean=} resetLog
 */
function stopLogRecording(resetLog) {
    console.log = consoleLogOriginal;
    console.error = consoleErrorOriginal;
    if (resetLog) {
        stdout = '';
        stderr = '';
    }
}

/**
 * @returns {Buffer}
 */
function readTextFile() {
    return fs.readFileSync(TEXT_FILE, 'utf-8');
}

describe('rstring.js', () => {

    beforeEach(startLogRecording);

    afterEach(() => {
        stopLogRecording(true);
        mock.restore();
    });

    it('file not found error', () => {
        mock({[TEXT_FILE]: CONTENT});

        const missingFile = 'unknown.txt';
        let lines = [];
        rstring.handleFile(missingFile, (line) => {
            lines.push(line);
        });

        expect(stdout).to.be.empty;
        expect(stderr).to.equal(`[ERROR] Not a valid file: '${missingFile}'${N}`);
        expect(lines).to.be.empty;

        try {
            fs.readFileSync(missingFile, 'utf-8');
        } catch (err) {
            expect(err.message).to.equal(`ENOENT: no such file or directory, open '${missingFile}'`);
            return;
        }
        throw new chai.AssertionError(`File should not exist: '${missingFile}'`);
    });

    it('round trip', () => {
        mock({[TEXT_FILE]: CONTENT});

        let lines = [];
        rstring.handleFile(TEXT_FILE, (line) => {
            lines.push(line);
        });

        expect(readTextFile()).to.equal(CONTENT);
        expect(lines).to.deep.equal(CONTENT.split(N));

        expect(stdout).to.be.empty;
        expect(stderr).to.be.empty;
    });

    /**
     * @param {Object.<string, string|0>} linesToChange
     * @param {string} newContent
     */
    function lineToChange(linesToChange, newContent) {
        mock({[TEXT_FILE]: CONTENT});

        rstring.handleFile(
            TEXT_FILE,
            (line) => {
                if (linesToChange[line] != null) {
                    return linesToChange[line] === 0 ? false : linesToChange[line];
                }
            }
        );

        expect(readTextFile()).to.equal(newContent);
        expect(stdout).to.equal(REPLACING_FILE_LOG);
        expect(stderr).to.be.empty;
    }

    describe('change', () => {

        it('first line', () => {
            lineToChange({A: D}, D + N + B + N + C);
        });

        it('second line', () => {
            lineToChange({B: D}, A + N + D + N + C);
        });

        it('last line', () => {
            lineToChange({C: D}, A + N + B + N + D);
        });

        it('change all', () => {
            lineToChange({A: D, B: D, C: D}, D + N + D + N + D);
        });

        it('leave only one line unchanged', () => {
            lineToChange({A: D, C: D}, D + N + B + N + D);
        });

        describe('new line', () => {

            it('adding two', () => {
                lineToChange({A: A + N + N}, A + N + N + N + B + N + C);
            });

            it('replacing with one', () => {
                lineToChange({B: N}, A + N + N + N + C);
            });

            describe('first line', () => {

                it.skip('start', () => {
                    lineToChange({A: N + A}, N + A + N + B + N + C);
                });

                it('end', () => {
                    lineToChange({A: A + N}, A + N + N + B + N + C);
                });

            });

            describe('last line', () => {

                it('start', () => {
                    lineToChange({C: N + C}, A + N + B + N + N + C);
                });

                it.skip('end', () => {
                    lineToChange({C: C + N}, A + N + B + N + C + N);
                });

            });

        });

    });

    describe('delete', () => {

        it('first line', () => {
            lineToChange({A: 0}, B + N + C);
        });

        it('second line', () => {
            lineToChange({B: 0}, A + N + C);
        });

        it('last line', () => {
            lineToChange({C: 0}, A + N + B);
        });

        it('delete all', () => {
            lineToChange({A: 0, B: 0, C: 0}, '');
        });

        it('leave only one line', () => {
            lineToChange({A: 0, C: 0}, B);
        });

    });

});