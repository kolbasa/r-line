import {expect} from 'chai';
import {rstring} from '../../rstring.js';

import fs from 'fs';
import mock from 'mock-fs';

const NEW_LINE = '\n';
const TEXT_FILE = 'ipsum.txt';
const CONTENT = '1' + NEW_LINE + '2' + NEW_LINE + '3';
const REPLACING_FILE_LOG = `[INFO] Replacing file - '${TEXT_FILE}'${NEW_LINE}`;

let stdout = '', stderr = '';
const consoleLogOriginal = console.log;
const consoleErrorOriginal = console.error;

/**
 * @returns {void}
 */
function startLogRecording() {
    console.log = (str) => {
        stdout += str + NEW_LINE;
    };
    console.error = (str) => {
        stderr += str + NEW_LINE;
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

    it('round trip', () => {

        mock({[TEXT_FILE]: CONTENT});

        let lines = [];
        rstring.handleFile(TEXT_FILE, (line) => lines.push(line));

        expect(lines).to.deep.equal(CONTENT.split(NEW_LINE));
        expect(readTextFile()).to.equal(CONTENT);

        expect(stdout).to.be.empty;
        expect(stderr).to.be.empty;

    });

    describe('change', () => {

    });

    describe('delete', () => {

        /**
         * @param {string[]} linesToRemove
         * @param {string} newContent
         */
        function deleteLine (linesToRemove, newContent) {
            mock({[TEXT_FILE]: CONTENT});

            rstring.handleFile(
                TEXT_FILE,
                (line) => {
                    if (linesToRemove.find((_line) => line === _line)) {
                        return false;
                    }
                }
            );

            expect(stdout).to.equal(REPLACING_FILE_LOG);
            expect(stderr).to.be.empty;
            expect(readTextFile()).to.equal(newContent);
        }

        it('first line', () => {

            deleteLine(['1'], '2' + NEW_LINE + '3');

        });

        it('second line', () => {

            deleteLine(['2'], '1' + NEW_LINE + '3');

        });

        it('last line', () => {

            deleteLine(['3'], '1' + NEW_LINE + '2');

        });

        it('delete all', () => {

            deleteLine(['1', '2', '3'], '');

        });

        it('leave only one line', () => {

            deleteLine(['1', '2'], '3');

        });

    });

});