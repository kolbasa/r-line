const chai = require('chai');
const expect = chai.expect;

const rl = require('../lib/r-line.js');

const fs = require('fs');
const mock = require('mock-fs');

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
const REPLACING_FILE_LOG = `[INFO] Replacing file: '${TEXT_FILE}'` + N;
const NOTHING_CHANGED_IN_FILE_LOG = `[INFO] Nothing changed in file: '${TEXT_FILE}'` + N;
const READING_FILE_LOG = `[INFO] Preview: '${TEXT_FILE}'` + N;

let stdout = '';
const consoleLogOriginal = console.log;
const consoleErrorOriginal = console.error;

/**
 * @returns {void}
 */
function startConsoleLogRecording() {
    console.log = (str) => {
        stdout += str + N;
    };
}

/**
 * @returns {void}
 */
function resetConsoleLog() {
    stdout = '';
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

describe('rl.js', () => {

    describe('replaceLine', () => {

        beforeEach(startConsoleLogRecording);

        afterEach(() => {
            stopConsoleLogRecording(true);
            mock.restore();
        });

        /**
         * @param {Object.<string, string|0>=} linesToChange
         *
         * @param {object=} options
         * @param {boolean=} options.dryRun
         * @param {boolean=} options.hidePreview
         * @param {boolean=} options.hideLogOfUnchangedFile
         * @param {object=}  options.previewOptions
         * @param {boolean=} options.previewOptions.showSpaces
         * @param {boolean=} options.previewOptions.hideOriginalLines
         * @param {boolean=} options.previewOptions.showUnchangedLines
         * @param {boolean=} options.previewOptions.keepOriginalIndentation
         *
         * @param {boolean=} options.resume The default text file should not be reset
         * @param {string=} options.content If you want to replace the default content of the test text file.
         */
        function changeLines(linesToChange, options) {
            options = options || {};

            // The preview is tested separately.
            if (options.hidePreview == null) {
                options.hidePreview = true;
            }

            if (options.resume) {
                resetConsoleLog();
            } else {
                mock({[TEXT_FILE]: options.content || CONTENT});
            }

            rl.replaceLine(
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
        }

        /**
         * @param {string=} previewContent
         * @param {string=} content
         */
        function expectPreviewContent(previewContent, content) {
            expect(readTextFile()).to.equal(content || CONTENT);
            expect(stdout).to.equal(READING_FILE_LOG + (previewContent == null ? '' : previewContent + N));
        }

        it('number of lines', () => {
            mock({[TEXT_FILE]: CONTENT});
            let lines = [];
            rl.replaceLine(TEXT_FILE, (line) => {
                lines.push(line);
            });
            expect(lines).to.deep.equal(CONTENT.split(N));
        });

        it('multiple change runs', () => {
            changeLines({A: D});
            expectChangedContent(D + N + B + N + C);
            changeLines({D: B}, {resume: true});
            expectChangedContent(B + N + B + N + C);
        });

        it('callback missing', () => {
            mock({[TEXT_FILE]: CONTENT});
            try {
                // noinspection JSCheckFunctionSignatures
                rl.replaceLine(TEXT_FILE);
            } catch (err) {
                expect(err.message).to.equal(`[ERROR] no callback function given!`);
                expect(stdout).to.be.empty;
                expect(readTextFile()).to.equal(CONTENT);
                return;
            }
            throw new chai.AssertionError('Should have thrown "missing callback" error!');
        });

        it('context', () => {
            mock({[TEXT_FILE]: CONTENT});

            const lines = [];
            rl.replaceLine(TEXT_FILE, (line, context) => {
                lines.push([line, context]);
            });

            expect(lines).to.deep.equal(
                [
                    [
                        A,
                        {
                            lineNumber: 1,
                            previous: {
                                line: undefined,
                                lines: []
                            },
                            next: {
                                line: B,
                                lines: [B, C]
                            }
                        }
                    ],
                    [
                        B,
                        {
                            lineNumber: 2,
                            previous: {
                                line: A,
                                lines: [A]
                            },
                            next: {
                                line: C,
                                lines: [C]
                            }
                        }
                    ],
                    [
                        C,
                        {
                            lineNumber: 3,
                            previous: {
                                line: B,
                                lines: [A, B]
                            },
                            next: {
                                line: undefined,
                                lines: []
                            }
                        }
                    ]
                ]
            );
        });

        describe('list files', () => {

            /**
             * @type {'\\' | '/'}
             */
            const SEP = require('path').sep;

            /**
             * Converts the file separator depending on the platform.
             *
             * @param {string} path
             * @returns {string}
             */
            function _(path) {
                return path.replaceAll('/', SEP);
            }

            /**
             * @returns {void}
             */
            function mockFileStructure() {
                mock({
                    [_('path/to/some.png')]: '',
                    [_('path/to/fake/dir')]: {
                        'c.txt': '',
                        'a.txt': '',
                        'b.txt': '',
                        'empty-dir': {}
                    },
                    [_('some/other/path')]: {
                        'some-file.txt': ''
                    }
                });
            }

            const FILES1 = [
                _('path/to/fake/dir/a.txt'),
                _('path/to/fake/dir/b.txt'),
                _('path/to/fake/dir/c.txt'),
                _('path/to/some.png')
            ];

            const FILES2 = [
                _('some/other/path/some-file.txt')
            ];

            it('iterate files', () => {
                mockFileStructure();
                const files1 = [];
                rl.listFiles('path', (file) => files1.push(file));
                expect(files1).to.deep.equal(FILES1);

                const files2 = [];
                rl.listFiles(_('some/other/path'), (file) => files2.push(file));
                expect(files2).to.deep.equal(FILES2);
            });

            it('invalid directory', () => {
                mockFileStructure();
                const invalidDir = _('no/files');
                try {
                    rl.listFiles(invalidDir, () => {
                        //
                    });
                } catch (err) {
                    expect(err.message).to.equal(`ENOENT: no such file or directory, scandir '${invalidDir}'`);
                    return;
                }
                throw new chai.AssertionError('Should have thrown "scandir" error!');
            });

        });

        describe('file system errors', () => {

            it('missing read permissions', () => {
                mock({
                    [TEXT_FILE]: mock.file({
                        content: CONTENT,
                        mode: 0o000
                    })
                });

                try {
                    rl.replaceLine(TEXT_FILE, () => {
                        //
                    });
                } catch (err) {
                    expect(err.message).to.equal(`EACCES: permission denied, open '${TEXT_FILE}'`);
                    expect(stdout).to.be.empty;
                    return;
                }

                throw new chai.AssertionError('Should have thrown "permission denied" error!');
            });

            describe('file not found', () => {

                it('error message', () => {
                    mock({[TEXT_FILE]: CONTENT});

                    const missingFile = 'unknown.txt';
                    let lines = [];

                    try {
                        rl.replaceLine(missingFile, (line) => {
                            lines.push(line);
                        });
                    } catch (err) {
                        expect(err.message).to.equal(`ENOENT: no such file or directory, open '${missingFile}'`);
                        expect(stdout).to.be.empty;
                        expect(lines).to.be.empty;
                        return;
                    }

                    throw new chai.AssertionError('Should have thrown "no such file" error!');
                });

                it('should not create file', () => {
                    mock({[TEXT_FILE]: CONTENT});
                    const missingFile = 'unknown.txt';
                    try {
                        rl.replaceLine(missingFile, () => {
                            //
                        });
                    } catch (err) {
                        //
                    }

                    try {
                        fs.readFileSync(missingFile, 'utf-8');
                    } catch (err) {
                        expect(err.message).to.equal(`ENOENT: no such file or directory, open '${missingFile}'`);
                        return;
                    }
                    throw new chai.AssertionError(`File should not exist: '${missingFile}'`);
                });

            });

        });

        describe('empty file', () => {

            it('reading content', () => {
                mock({[TEXT_FILE]: ''});

                let lines = [];
                rl.replaceLine(TEXT_FILE, (line) => {
                    lines.push(line);
                });

                const changedContent = readTextFile();
                expect(changedContent).be.empty;
                expect(changedContent.split(N)).to.deep.equal(['']);
                expect(lines).to.deep.equal(['']);
            });

            it('adding lines', () => {
                mock({[TEXT_FILE]: ''});

                rl.replaceLine(TEXT_FILE, () => CONTENT, {hidePreview: true});

                expect(readTextFile()).to.equal(CONTENT);
                expect(stdout).to.equal(REPLACING_FILE_LOG);
            });

        });

        describe('preview', () => {

            describe('log', () => {

                it('changed', () => {
                    changeLines({A: D}, {dryRun: true});
                    expect(stdout).to.equal(
                        READING_FILE_LOG +
                        '1   ┌  A' + N +
                        '  C └▷ D' + N
                    );
                });

                describe('nothing changed', () => {

                    it('default', () => {
                        changeLines({}, {dryRun: true});
                        expect(stdout).to.equal(NOTHING_CHANGED_IN_FILE_LOG);
                    });

                    it('do not log unchanged', () => {
                        changeLines({}, {dryRun: true, hideLogOfUnchangedFile: true});
                        expect(stdout).to.be.empty;
                    });

                });

            });

            describe('change', () => {

                describe('default', () => {

                    it('first line', () => {
                        changeLines({A: D}, {dryRun: true});
                        expectPreviewContent(
                            '1   ┌  A' + N +
                            '  C └▷ D'
                        );
                    });

                    it('second line', () => {
                        changeLines({B: D}, {dryRun: true});
                        expectPreviewContent(
                            '2   ┌  B' + N +
                            '  C └▷ D'
                        );
                    });

                    it('last line', () => {
                        changeLines({C: D}, {dryRun: true});
                        expectPreviewContent(
                            '3   ┌  C' + N +
                            '  C └▷ D'
                        );
                    });

                    it('change all', () => {
                        changeLines({A: D, B: D, C: D}, {dryRun: true});
                        expectPreviewContent(
                            '1   ┌  A' + N + '  C └▷ D' + N +
                            '2   ┌  B' + N + '  C └▷ D' + N +
                            '3   ┌  C' + N + '  C └▷ D'
                        );
                    });

                    it('new line', () => {
                        changeLines({A: D + N + D + N + D}, {dryRun: true});
                        expectPreviewContent(
                            '1   ┌  A' + N +
                            '  C └▷ D' + N +
                            '       D' + N +
                            '       D'
                        );
                    });

                });

                describe('show spaces', () => {

                    describe('changed line', () => {

                        describe('spaces', () => {

                            it('start', () => {
                                changeLines({A: D + '  '}, {dryRun: true, previewOptions: {showSpaces: true}});
                                expectPreviewContent(
                                    '1   ┌  A' + N +
                                    '  C └▷ D' + SPACE + SPACE
                                );
                            });

                            it('end', () => {
                                changeLines({A: '  ' + D}, {dryRun: true, previewOptions: {showSpaces: true}});
                                expectPreviewContent(
                                    '1   ┌  A' + N +
                                    '  C └▷ ' + SPACE + SPACE + 'D'
                                );
                            });

                        });

                        describe('tabs', () => {

                            it('start', () => {
                                changeLines({A: D + T + T}, {dryRun: true, previewOptions: {showSpaces: true}});
                                expectPreviewContent(
                                    '1   ┌  A' + N +
                                    '  C └▷ D' + TAB + TAB
                                );
                            });

                            it('end', () => {
                                changeLines({A: T + T + D}, {dryRun: true, previewOptions: {showSpaces: true}});
                                expectPreviewContent(
                                    '1   ┌  A' + N +
                                    '  C └▷ ' + TAB + TAB + 'D'
                                );
                            });

                        });

                    });

                    describe('original line', () => {

                        describe('spaces', () => {

                            it('start', () => {
                                const content = '  ' + A;
                                changeLines({[content]: 0}, {
                                    content: content,
                                    dryRun: true,
                                    previewOptions: {showSpaces: true}
                                });
                                expectPreviewContent('1 D ┤  ' + SPACE + SPACE + 'A', content);
                            });

                            it('end', () => {
                                const content = A + '  ';
                                changeLines({[content]: 0}, {
                                    content: content,
                                    dryRun: true,
                                    previewOptions: {showSpaces: true}
                                });
                                expectPreviewContent('1 D ┤  A' + SPACE + SPACE, content);
                            });

                        });

                        describe('tabs', () => {

                            it('start', () => {
                                const content = T + T + A;
                                changeLines({[content]: 0}, {
                                    content: content,
                                    dryRun: true,
                                    previewOptions: {showSpaces: true}
                                });
                                expectPreviewContent('1 D ┤  ' + TAB + TAB + 'A', content);
                            });

                            it('end', () => {
                                const content = A + T + T;
                                changeLines({[content]: 0}, {
                                    content: content,
                                    dryRun: true,
                                    previewOptions: {showSpaces: true}
                                });
                                expectPreviewContent('1 D ┤  A' + TAB + TAB, content);
                            });

                        });

                    });

                });

                describe('preview unchanged lines', () => {

                    it('first line', () => {
                        changeLines({A: D}, {dryRun: true, previewOptions: {showUnchangedLines: true}});
                        expectPreviewContent(
                            '1   ┌  A' + N +
                            '  C └▷ D' + N +
                            '2   │  B' + N +
                            '3   │  C'
                        );
                    });

                    it('second line', () => {
                        changeLines({B: D}, {dryRun: true, previewOptions: {showUnchangedLines: true}});
                        expectPreviewContent(
                            '1   │  A' + N +
                            '2   ┌  B' + N +
                            '  C └▷ D' + N +
                            '3   │  C'
                        );
                    });

                    it('last line', () => {
                        changeLines({C: D}, {dryRun: true, previewOptions: {showUnchangedLines: true}});
                        expectPreviewContent(
                            '1   │  A' + N +
                            '2   │  B' + N +
                            '3   ┌  C' + N +
                            '  C └▷ D'
                        );
                    });

                    it('change all', () => {
                        changeLines({A: D, B: D, C: D}, {dryRun: true, previewOptions: {showUnchangedLines: true}});
                        expectPreviewContent(
                            '1   ┌  A' + N +
                            '  C └▷ D' + N +
                            '2   ┌  B' + N +
                            '  C └▷ D' + N +
                            '3   ┌  C' + N +
                            '  C └▷ D'
                        );
                    });

                });

                describe('hide original lines', () => {

                    it('first line', () => {
                        changeLines({A: D}, {dryRun: true, previewOptions: {hideOriginalLines: true}});
                        expectPreviewContent('1 C ┤  D');
                    });

                    it('second line', () => {
                        changeLines({B: D}, {dryRun: true, previewOptions: {hideOriginalLines: true}});
                        expectPreviewContent('2 C ┤  D');
                    });

                    it('last line', () => {
                        changeLines({C: D}, {dryRun: true, previewOptions: {hideOriginalLines: true}});
                        expectPreviewContent('3 C ┤  D');
                    });

                    it('change all', () => {
                        changeLines({A: D, B: D, C: D}, {dryRun: true, previewOptions: {hideOriginalLines: true}});
                        expectPreviewContent(
                            '1 C ┤  D' + N +
                            '2 C ┤  D' + N +
                            '3 C ┤  D'
                        );
                    });

                });

                describe('hide original lines + preview unchanged lines', () => {

                    it('first line', () => {
                        changeLines({A: D}, {
                            dryRun: true,
                            previewOptions: {
                                hideOriginalLines: true,
                                showUnchangedLines: true
                            }
                        });
                        expectPreviewContent(
                            '1 C ┤  D' + N +
                            '2   │  B' + N +
                            '3   │  C'
                        );
                    });

                    it('second line', () => {
                        changeLines({B: D}, {
                            dryRun: true,
                            previewOptions: {
                                hideOriginalLines: true,
                                showUnchangedLines: true
                            }
                        });
                        expectPreviewContent(
                            '1   │  A' + N +
                            '2 C ┤  D' + N +
                            '3   │  C'
                        );
                    });

                    it('last line', () => {
                        changeLines({C: D}, {
                            dryRun: true,
                            previewOptions: {
                                hideOriginalLines: true,
                                showUnchangedLines: true
                            }
                        });
                        expectPreviewContent(
                            '1   │  A' + N +
                            '2   │  B' + N +
                            '3 C ┤  D'
                        );
                    });

                    it('change all', () => {
                        changeLines({A: D, B: D, C: D}, {
                            dryRun: true,
                            previewOptions: {
                                hideOriginalLines: true,
                                showUnchangedLines: true
                            }
                        });
                        expectPreviewContent(
                            '1 C ┤  D' + N +
                            '2 C ┤  D' + N +
                            '3 C ┤  D'
                        );
                    });

                });

            });

            describe('delete', () => {

                describe('default', () => {

                    it('first line', () => {
                        changeLines({A: 0}, {dryRun: true});
                        expectPreviewContent('1 D ┤  A');
                    });

                    it('second line', () => {
                        changeLines({B: 0}, {dryRun: true});
                        expectPreviewContent('2 D ┤  B');
                    });

                    it('last line', () => {
                        changeLines({C: 0}, {dryRun: true});
                        expectPreviewContent('3 D ┤  C');
                    });

                    it('change all', () => {
                        changeLines({A: 0, B: 0, C: 0}, {dryRun: true});
                        expectPreviewContent(
                            '1 D ┤  A' + N +
                            '2 D ┤  B' + N +
                            '3 D ┤  C'
                        );
                    });

                });

                describe('preview unchanged lines', () => {

                    it('first line', () => {
                        changeLines({A: 0}, {dryRun: true, previewOptions: {showUnchangedLines: true}});
                        expectPreviewContent(
                            '1 D ┤  A' + N +
                            '2   │  B' + N +
                            '3   │  C'
                        );
                    });

                    it('second line', () => {
                        changeLines({B: 0}, {dryRun: true, previewOptions: {showUnchangedLines: true}});
                        expectPreviewContent(
                            '1   │  A' + N +
                            '2 D ┤  B' + N +
                            '3   │  C'
                        );
                    });

                    it('last line', () => {
                        changeLines({C: 0}, {dryRun: true, previewOptions: {showUnchangedLines: true}});
                        expectPreviewContent(
                            '1   │  A' + N +
                            '2   │  B' + N +
                            '3 D ┤  C'
                        );
                    });

                    it('change all', () => {
                        changeLines({A: 0, B: 0, C: 0}, {dryRun: true, previewOptions: {showUnchangedLines: true}});
                        expectPreviewContent(
                            '1 D ┤  A' + N +
                            '2 D ┤  B' + N +
                            '3 D ┤  C'
                        );
                    });

                });

            });

            describe('mix of change and delete', () => {

                it('default', () => {
                    changeLines({A: D, B: 0}, {dryRun: true});
                    expectPreviewContent(
                        '1   ┌  A' + N +
                        '  C └▷ D' + N +
                        '2 D ┤  B'
                    );
                });

                it('preview unchanged lines', () => {
                    changeLines({A: D, B: 0}, {dryRun: true, previewOptions: {showUnchangedLines: true}});
                    expectPreviewContent(
                        '1   ┌  A' + N +
                        '  C └▷ D' + N +
                        '2 D ┤  B' + N +
                        '3   │  C'
                    );
                });

                it('hide original lines', () => {
                    changeLines({A: D, B: 0}, {dryRun: true, previewOptions: {hideOriginalLines: true}});
                    expectPreviewContent(
                        '1 C ┤  D' + N +
                        '2 D ┤  B'
                    );
                });

                it('hideOriginalLines + preview unchanged lines', () => {
                    changeLines({A: D, B: 0}, {
                        dryRun: true,
                        previewOptions: {
                            showUnchangedLines: true,
                            hideOriginalLines: true
                        }
                    });
                    expectPreviewContent(
                        '1 C ┤  D' + N +
                        '2 D ┤  B' + N +
                        '3   │  C'
                    );
                });

            });

            describe('indentation', () => {

                const RELATIVE_INDENTATION = (
                    ' A' + N +
                    '  B' + N +
                    'C' + N +
                    '  B'
                );

                describe('change', () => {

                    describe('default', () => {

                        it('should trim left', () => {
                            const content = (
                                ' A' + N +
                                ' B'
                            );

                            changeLines({' A': ' D'},
                                {
                                    content: content,
                                    dryRun: true
                                }
                            );

                            expectPreviewContent(
                                '1   ┌  A' + N +
                                '  C └▷ D',
                                content
                            );
                        });

                        describe('new line', () => {

                            it('should trim', () => {
                                const content = (
                                    ' A' + N +
                                    ' B'
                                );

                                changeLines({' A': ' C' + N + ' D'},
                                    {
                                        content: content,
                                        dryRun: true
                                    }
                                );

                                expectPreviewContent(
                                    '1   ┌  A' + N +
                                    '  C └▷ C' + N +
                                    '       D',
                                    content
                                );
                            });

                            it('should not trim', () => {
                                const content = (
                                    ' A' + N +
                                    ' B'
                                );

                                changeLines({' A': ' C' + N + 'D'},
                                    {
                                        content: content,
                                        dryRun: true
                                    }
                                );

                                expectPreviewContent(
                                    '1   ┌   A' + N +
                                    '  C └▷  C' + N +
                                    '       D',
                                    content
                                );
                            });

                        });

                        it('relative indentation', () => {
                            changeLines(
                                {
                                    ' A': ' D',
                                    '  B': '  E'
                                },
                                {
                                    content: RELATIVE_INDENTATION,
                                    dryRun: true
                                }
                            );

                            expectPreviewContent(
                                '1   ┌  A' + N +
                                '  C └▷ D' + N +
                                '2   ┌   B' + N +
                                '  C └▷  E' + N +
                                '4   ┌  B' + N +
                                '  C └▷ E',
                                RELATIVE_INDENTATION
                            );
                        });

                    });

                    describe('keep original', () => {

                        it('keepOriginalIndentation=true', () => {
                            const content = (
                                ' A' + N +
                                ' B'
                            );

                            changeLines({' A': ' D'},
                                {
                                    content: content,
                                    dryRun: true,
                                    previewOptions: {
                                        keepOriginalIndentation: true
                                    }
                                }
                            );

                            expectPreviewContent(
                                '1   ┌   A' + N +
                                '  C └▷  D',
                                content
                            );
                        });

                        it('override by showSpaces=true', () => {

                            const content = (
                                ' A' + N +
                                ' B'
                            );

                            changeLines({' A': ' D'},
                                {
                                    content: content,
                                    dryRun: true,
                                    previewOptions: {
                                        keepOriginalIndentation: false,
                                        showSpaces: true
                                    }
                                }
                            );

                            expectPreviewContent(
                                '1   ┌  ' + SPACE + 'A' + N +
                                '  C └▷ ' + SPACE + 'D',
                                content
                            );

                        });

                        it('override by showUnchangedLines=true', () => {

                            const content = (
                                ' A' + N +
                                ' B'
                            );

                            changeLines({' A': ' D'},
                                {
                                    content: content,
                                    dryRun: true,
                                    previewOptions: {
                                        keepOriginalIndentation: false,
                                        showUnchangedLines: true
                                    }
                                }
                            );

                            expectPreviewContent(
                                '1   ┌   A' + N +
                                '  C └▷  D' + N +
                                '2   │   B',
                                content
                            );

                        });

                    });

                });

                describe('delete', () => {

                    describe('default', () => {

                        it('should trim left', () => {
                            const content = (
                                ' A' + N +
                                ' B'
                            );

                            changeLines({' A': 0},
                                {
                                    content: content,
                                    dryRun: true
                                }
                            );

                            expectPreviewContent(
                                '1 D ┤  A',
                                content
                            );
                        });

                        it('relative indentation', () => {
                            changeLines(
                                {
                                    ' A': 0,
                                    '  B': 0
                                },
                                {
                                    content: RELATIVE_INDENTATION,
                                    dryRun: true
                                }
                            );

                            expectPreviewContent(
                                '1 D ┤  A' + N +
                                '2 D ┤   B' + N +
                                '4 D ┤  B',
                                RELATIVE_INDENTATION
                            );
                        });

                    });

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

            describe('log', () => {

                describe('changed', () => {

                    it('hidePreview: true', () => {
                        changeLines({A: D}, {hidePreview: true});
                        expect(stdout).to.equal(REPLACING_FILE_LOG);
                    });

                    it('hidePreview: false', () => {
                        changeLines({A: D}, {hidePreview: false});
                        expect(stdout).to.equal(
                            REPLACING_FILE_LOG +
                            '1   ┌  A' + N +
                            '  C └▷ D' + N
                        );
                    });

                });

                describe('nothing changed', () => {

                    it('default', () => {
                        changeLines({});
                        expect(stdout).to.equal(NOTHING_CHANGED_IN_FILE_LOG);
                    });

                    it('do not log unchanged', () => {
                        changeLines({}, {hideLogOfUnchangedFile: true, hidePreview: false});
                        expect(stdout).to.be.empty;
                    });

                });

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

            describe('new lines', () => {

                it('adding two', () => {
                    changeLines({A: A + N + N});
                    expectChangedContent(A + N + N + N + B + N + C);
                });

                it('replacing with one', () => {
                    changeLines({B: N});
                    expectChangedContent(A + N + N + N + C);
                });

                it('should not trim original content', () => {
                    changeLines({B: C}, {content: N + A + N + B + N});
                    expectChangedContent(N + A + N + C + N);
                });

                describe('first line', () => {

                    it('start', () => {
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

                    it('end', () => {
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

    describe('stringUtils', () => {

        const s = rl.stringUtils;

        it('lineIndent', () => {
            expect(s.lineIndent('a')).to.equal('');
            expect(s.lineIndent(' a')).to.equal(' ');
            expect(s.lineIndent('  a')).to.equal('  ');
        });

        it('replaceWhitespaces', () => {
            expect(s.replaceWhitespaces(' a a ')).to.equal('aa');
            expect(s.replaceWhitespaces('  a  a  ')).to.equal('aa');
            expect(s.replaceWhitespaces(' a a ', '-')).to.equal('-a-a-');
            expect(s.replaceWhitespaces('\ta\ta\t')).to.equal('aa');
            expect(s.replaceWhitespaces('\na\na\n')).to.equal('aa');
        });

        it('replaceBetween', () => {
            expect(s.replaceBetween('abc', 'a', 'c', 'd')).to.equal('adc');
            expect(s.replaceBetween('aabc', 'a', 'c', 'd')).to.equal('adc');
            expect(s.replaceBetween('abc-abc', 'a', 'c', 'd')).to.equal('adc-abc');
        });

    });

});