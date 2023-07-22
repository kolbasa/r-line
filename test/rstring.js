import chai, {expect} from 'chai';
import {rstring} from '../rstring.js';

import fs from 'fs';
import mock from 'mock-fs';

const A = 'A';
const B = 'B';
const C = 'C';
const D = 'D';

const N = '\n';
const T = '\t';

const TAB = ' ▸  ';
const SPACE = '·';

const TEXT_FILE = 'ipsum.txt';
const CONTENT = A + N + B + N + C;
const REPLACING_FILE_LOG = `[INFO] Replacing file: '${TEXT_FILE}'${N}`;
const READING_FILE_LOG = `[INFO] Reading file: '${TEXT_FILE}'${N}`;

let stdout = '', stderr = '';
const consoleLogOriginal = console.log;
const consoleErrorOriginal = console.error;

/**
 * @returns {void}
 */
function startConsoleLogRecording() {
    console.log = (str) => {
        stdout += str + N;
    };
    console.error = (str) => {
        stderr += str + N;
    };
}

/**
 * @returns {void}
 */
function resetConsoleLog() {
    stdout = '';
    stderr = '';
}

/**
 * @param {boolean=} resetLog
 */
function stopConsoleLogRecording(resetLog) {
    console.log = consoleLogOriginal;
    console.error = consoleErrorOriginal;
    if (resetLog) {
        resetConsoleLog();
    }
}

/**
 * @returns {string}
 */
function readTextFile() {
    return fs.readFileSync(TEXT_FILE, 'utf-8').toString();
}

describe('rstring.js', () => {

    beforeEach(startConsoleLogRecording);

    afterEach(() => {
        stopConsoleLogRecording(true);
        mock.restore();
    });

    /**
     * @param {Object.<string, string|0>=} linesToChange
     *
     * @param {object=} options
     * @param {boolean=} options.preview
     * @param {boolean=} options.showSpaces
     * @param {boolean=} options.hideOriginalLines
     * @param {boolean=} options.previewUnchangedLines
     *
     * @param {boolean=} options.resume The default text file should not be reset
     * @param {string=} options.content If you want to replace the default content of the test text file.
     */
    function changeLines(linesToChange, options) {
        options = options || {};

        if (options.resume) {
            resetConsoleLog();
        } else {
            mock({[TEXT_FILE]: options.content || CONTENT});
        }

        rstring.handleFile(
            TEXT_FILE,
            (line) => {
                if (linesToChange[line] != null) {
                    return linesToChange[line] === 0 ? false : linesToChange[line];
                }
            },
            options
        );
    }

    /**
     * @param {string} changedContent
     */
    function expectChangedContent(changedContent) {
        expect(readTextFile()).to.equal(changedContent);
        expect(stdout).to.equal(REPLACING_FILE_LOG);
        expect(stderr).to.be.empty;
    }

    /**
     * @param {string=} previewContent
     * @param {string=} content
     */
    function expectPreviewContent(previewContent, content) {
        expect(readTextFile()).to.equal(content || CONTENT);
        expect(stdout).to.equal(READING_FILE_LOG + (previewContent == null ? '' : N + previewContent + N));
        expect(stderr).to.be.empty;
    }

    it('number of lines', () => {
        mock({[TEXT_FILE]: CONTENT});
        let lines = [];
        rstring.handleFile(TEXT_FILE, (line) => {
            lines.push(line);
        });
        expect(lines).to.deep.equal(CONTENT.split(N));
    });

    it('no changes', () => {
        changeLines({});
        expect(readTextFile()).to.equal(CONTENT);
        expect(stdout).to.be.empty;
        expect(stderr).to.be.empty;
    });

    it('multiple change runs', () => {
        changeLines({A: D});
        expectChangedContent(D + N + B + N + C);
        changeLines({D: B}, {resume: true});
        expectChangedContent(B + N + B + N + C);
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

    describe('empty file', () => {

        it('read only', () => {
            mock({[TEXT_FILE]: ''});

            let lines = [];
            rstring.handleFile(TEXT_FILE, (line) => {
                lines.push(line);
            });

            const changedContent = readTextFile();
            expect(changedContent).be.empty;
            expect(changedContent.split(N)).to.deep.equal(['']);
            expect(lines).to.deep.equal(['']);

            expect(stdout).to.be.empty;
            expect(stderr).to.be.empty;
        });

        it('adding lines', () => {
            mock({[TEXT_FILE]: ''});

            rstring.handleFile(TEXT_FILE, () => CONTENT);

            expect(readTextFile()).to.equal(CONTENT);
            expect(stdout).to.equal(REPLACING_FILE_LOG);
            expect(stderr).to.be.empty;
        });

    });

    describe('preview', () => {

        it('nothing changed', () => {
            changeLines({}, {preview: true});
            expectPreviewContent();
        });

        describe('change', () => {

            describe('standard mode', () => {

                it('first line', () => {
                    changeLines({A: D}, {preview: true});
                    expectPreviewContent(
                        '1   ┌ A' + N +
                        '  M └▷D'
                    );
                });

                it('second line', () => {
                    changeLines({B: D}, {preview: true});
                    expectPreviewContent(
                        '2   ┌ B' + N +
                        '  M └▷D'
                    );
                });

                it('last line', () => {
                    changeLines({C: D}, {preview: true});
                    expectPreviewContent(
                        '3   ┌ C' + N +
                        '  M └▷D'
                    );
                });

                it('change all', () => {
                    changeLines({A: D, B: D, C: D}, {preview: true});
                    expectPreviewContent(
                        '1   ┌ A' + N + '  M └▷D' + N +
                        '2   ┌ B' + N + '  M └▷D' + N +
                        '3   ┌ C' + N + '  M └▷D'
                    );
                });

            });

            describe('show spaces', () => {

                describe('changed line', () => {

                    describe('spaces', () => {

                        it('start', () => {
                            changeLines({A: D + '  '}, {preview: true, showSpaces: true});
                            expectPreviewContent(
                                '1   ┌ A' + N +
                                '  M └▷D' + SPACE + SPACE
                            );
                        });

                        it('end', () => {
                            changeLines({A: '  ' + D}, {preview: true, showSpaces: true});
                            expectPreviewContent(
                                '1   ┌ A' + N +
                                '  M └▷' + SPACE + SPACE + 'D'
                            );
                        });

                    });

                    describe('tabs', () => {

                        it('start', () => {
                            changeLines({A: D + T + T}, {preview: true, showSpaces: true});
                            expectPreviewContent(
                                '1   ┌ A' + N +
                                '  M └▷D' + TAB + TAB
                            );
                        });

                        it('end', () => {
                            changeLines({A: T + T + D}, {preview: true, showSpaces: true});
                            expectPreviewContent(
                                '1   ┌ A' + N +
                                '  M └▷' + TAB + TAB + 'D'
                            );
                        });

                    });

                });

                describe('original line', () => {

                    describe('spaces', () => {

                        it('start', () => {
                            const content = '  ' + A;
                            changeLines({[content]: 0}, {preview: true, showSpaces: true, content: content});
                            expectPreviewContent('1 D ┤ ' + SPACE + SPACE + 'A', content);
                        });

                        it('end', () => {
                            const content = A + '  ';
                            changeLines({[content]: 0}, {preview: true, showSpaces: true, content: content});
                            expectPreviewContent('1 D ┤ A' + SPACE + SPACE, content);
                        });

                    });

                    describe('tabs', () => {

                        it('start', () => {
                            const content = T + T + A;
                            changeLines({[content]: 0}, {preview: true, showSpaces: true, content: content});
                            expectPreviewContent('1 D ┤ ' + TAB + TAB + 'A', content);
                        });

                        it('end', () => {
                            const content = A + T + T;
                            changeLines({[content]: 0}, {preview: true, showSpaces: true, content: content});
                            expectPreviewContent('1 D ┤ A' + TAB + TAB, content);
                        });

                    });

                });

            });

            describe('preview unchanged lines', () => {

                it('first line', () => {
                    changeLines({A: D}, {preview: true, previewUnchangedLines: true});
                    expectPreviewContent(
                        '1   ┌ A' + N +
                        '  M └▷D' + N +
                        '2   │ B' + N +
                        '3   │ C'
                    );
                });

                it('second line', () => {
                    changeLines({B: D}, {preview: true, previewUnchangedLines: true});
                    expectPreviewContent(
                        '1   │ A' + N +
                        '2   ┌ B' + N +
                        '  M └▷D' + N +
                        '3   │ C'
                    );
                });

                it('last line', () => {
                    changeLines({C: D}, {preview: true, previewUnchangedLines: true});
                    expectPreviewContent(
                        '1   │ A' + N +
                        '2   │ B' + N +
                        '3   ┌ C' + N +
                        '  M └▷D'
                    );
                });

                it('change all', () => {
                    changeLines({A: D, B: D, C: D}, {preview: true, previewUnchangedLines: true});
                    expectPreviewContent(
                        '1   ┌ A' + N +
                        '  M └▷D' + N +
                        '2   ┌ B' + N +
                        '  M └▷D' + N +
                        '3   ┌ C' + N +
                        '  M └▷D'
                    );
                });

            });

            describe('hide original lines', () => {

                it('first line', () => {
                    changeLines({A: D}, {preview: true, hideOriginalLines: true});
                    expectPreviewContent('1 M ┤ D');
                });

                it('second line', () => {
                    changeLines({B: D}, {preview: true, hideOriginalLines: true});
                    expectPreviewContent('2 M ┤ D');
                });

                it('last line', () => {
                    changeLines({C: D}, {preview: true, hideOriginalLines: true});
                    expectPreviewContent('3 M ┤ D');
                });

                it('change all', () => {
                    changeLines({A: D, B: D, C: D}, {preview: true, hideOriginalLines: true});
                    expectPreviewContent(
                        '1 M ┤ D' + N +
                        '2 M ┤ D' + N +
                        '3 M ┤ D'
                    );
                });

            });

            describe('hide original lines + preview unchanged lines', () => {

                it('first line', () => {
                    changeLines({A: D}, {
                        preview: true,
                        hideOriginalLines: true,
                        previewUnchangedLines: true
                    });
                    expectPreviewContent(
                        '1 M ┤ D' + N +
                        '2   │ B' + N +
                        '3   │ C'
                    );
                });

                it('second line', () => {
                    changeLines({B: D}, {
                        preview: true,
                        hideOriginalLines: true,
                        previewUnchangedLines: true
                    });
                    expectPreviewContent(
                        '1   │ A' + N +
                        '2 M ┤ D' + N +
                        '3   │ C'
                    );
                });

                it('last line', () => {
                    changeLines({C: D}, {
                        preview: true,
                        hideOriginalLines: true,
                        previewUnchangedLines: true
                    });
                    expectPreviewContent(
                        '1   │ A' + N +
                        '2   │ B' + N +
                        '3 M ┤ D'
                    );
                });

                it('change all', () => {
                    changeLines({A: D, B: D, C: D}, {
                        preview: true,
                        hideOriginalLines: true,
                        previewUnchangedLines: true
                    });
                    expectPreviewContent(
                        '1 M ┤ D' + N +
                        '2 M ┤ D' + N +
                        '3 M ┤ D'
                    );
                });

            });

        });

        describe('delete', () => {

            describe('standard mode', () => {

                it('first line', () => {
                    changeLines({A: 0}, {preview: true});
                    expectPreviewContent('1 D ┤ A');
                });

                it('second line', () => {
                    changeLines({B: 0}, {preview: true});
                    expectPreviewContent('2 D ┤ B');
                });

                it('last line', () => {
                    changeLines({C: 0}, {preview: true});
                    expectPreviewContent('3 D ┤ C');
                });

                it('change all', () => {
                    changeLines({A: 0, B: 0, C: 0}, {preview: true});
                    expectPreviewContent(
                        '1 D ┤ A' + N +
                        '2 D ┤ B' + N +
                        '3 D ┤ C'
                    );
                });

            });

            describe('preview unchanged lines', () => {

                it('first line', () => {
                    changeLines({A: 0}, {preview: true, previewUnchangedLines: true});
                    expectPreviewContent(
                        '1 D ┤ A' + N +
                        '2   │ B' + N +
                        '3   │ C'
                    );
                });

                it('second line', () => {
                    changeLines({B: 0}, {preview: true, previewUnchangedLines: true});
                    expectPreviewContent(
                        '1   │ A' + N +
                        '2 D ┤ B' + N +
                        '3   │ C'
                    );
                });

                it('last line', () => {
                    changeLines({C: 0}, {preview: true, previewUnchangedLines: true});
                    expectPreviewContent(
                        '1   │ A' + N +
                        '2   │ B' + N +
                        '3 D ┤ C'
                    );
                });

                it('change all', () => {
                    changeLines({A: 0, B: 0, C: 0}, {preview: true, previewUnchangedLines: true});
                    expectPreviewContent(
                        '1 D ┤ A' + N +
                        '2 D ┤ B' + N +
                        '3 D ┤ C'
                    );
                });

            });

        });

        describe('mix of change and delete', () => {

            it('standard mode', () => {
                changeLines({A: D, B: 0}, {preview: true});
                expectPreviewContent(
                    '1   ┌ A' + N +
                    '  M └▷D' + N +
                    '2 D ┤ B'
                );
            });

            it('preview unchanged lines', () => {
                changeLines({A: D, B: 0}, {preview: true, previewUnchangedLines: true});
                expectPreviewContent(
                    '1   ┌ A' + N +
                    '  M └▷D' + N +
                    '2 D ┤ B' + N +
                    '3   │ C'
                );
            });

            it('hide original lines', () => {
                changeLines({A: D, B: 0}, {preview: true, hideOriginalLines: true});
                expectPreviewContent(
                    '1 M ┤ D' + N +
                    '2 D ┤ B'
                );
            });

            it('hideOriginalLines + preview unchanged lines', () => {
                changeLines({A: D, B: 0}, {preview: true, hideOriginalLines: true, previewUnchangedLines: true});
                expectPreviewContent(
                    '1 M ┤ D' + N +
                    '2 D ┤ B' + N +
                    '3   │ C'
                );
            });

        });

    });

    describe('change', () => {

        it('first line', () => {
            changeLines({A: D});
            expectChangedContent(D + N + B + N + C);
        });

        it('second line', () => {
            changeLines({B: D});
            expectChangedContent(A + N + D + N + C);
        });

        it('last line', () => {
            changeLines({C: D});
            expectChangedContent(A + N + B + N + D);
        });

        it('change all', () => {
            changeLines({A: D, B: D, C: D});
            expectChangedContent(D + N + D + N + D);
        });

        it('leave only one line unchanged', () => {
            changeLines({A: D, C: D});
            expectChangedContent(D + N + B + N + D);
        });

        describe('special cases', () => {

            it('should not trim line', () => {
                changeLines({A: '  ' + D + '  '});
                expectChangedContent('  ' + D + '  ' + N + B + N + C);
            });

            it('empty string', () => {
                changeLines({A: ''});
                expectChangedContent('' + N + B + N + C);
            });

            it('single space', () => {
                changeLines({A: ' '});
                expectChangedContent(' ' + N + B + N + C);
            });

            it('unicode characters', () => {
                changeLines({A: 'ä'});
                expectChangedContent('ä' + N + B + N + C);
            });

        });

        describe('new line', () => {

            it('adding two', () => {
                changeLines({A: A + N + N});
                expectChangedContent(A + N + N + N + B + N + C);
            });

            it('replacing with one', () => {
                changeLines({B: N});
                expectChangedContent(A + N + N + N + C);
            });

            describe('first line', () => {

                it.skip('start', () => {
                    changeLines({A: N + A});
                    expectChangedContent(N + A + N + B + N + C);
                });

                it('end', () => {
                    changeLines({A: A + N});
                    expectChangedContent(A + N + N + B + N + C);
                });

            });

            describe('last line', () => {

                it('start', () => {
                    changeLines({C: N + C});
                    expectChangedContent(A + N + B + N + N + C);
                });

                it.skip('end', () => {
                    changeLines({C: C + N});
                    expectChangedContent(A + N + B + N + C + N);
                });

            });

        });

    });

    describe('delete', () => {

        it('first line', () => {
            changeLines({A: 0});
            expectChangedContent(B + N + C);
        });

        it('second line', () => {
            changeLines({B: 0});
            expectChangedContent(A + N + C);
        });

        it('last line', () => {
            changeLines({C: 0});
            expectChangedContent(A + N + B);
        });

        it('delete all', () => {
            changeLines({A: 0, B: 0, C: 0});
            expectChangedContent('');
        });

        it('leave only one line', () => {
            changeLines({A: 0, C: 0});
            expectChangedContent(B);
        });

    });

});