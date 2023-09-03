const fs = require('fs');
const SEP = require('path').sep;

const S = ' ';
const N = '\n';
const TAB = ' ▸  ';
const SPACE = '·';
const ENCODING = 'utf-8';

const TAB_REGEX = new RegExp('\\t', 'g');
const SPACES_REGEX = new RegExp(S, 'g');

const MARKER_CHANGED = ' C ';
const MARKER_DELETED = ' D ';

const LINE_UNCHANGED = '│  ';
const LINE_CHANGED = '┤  ';

const ROUTE_START = '┌  ';
const ROUTE_END = '└▷ ';

/**
 * @param {*} propToCheck
 * @returns {boolean}
 */
function isString(propToCheck) {
    return typeof propToCheck === 'string';
}

/**
 * @param {string} str
 * @param {string=} replacement
 *
 * @returns {string}
 */
function replaceTabs(str, replacement) {
    return str.replace(TAB_REGEX, replacement);
}

/**
 * @param {string} str
 * @param {string=} replacement
 *
 * @returns {string}
 */
function replaceSpaces(str, replacement) {
    return str.replace(SPACES_REGEX, replacement);
}

/**
 * @param {string} str
 * @param {number} width
 * @param {string} prefix
 *
 * @returns {string}
 */
function pad(str, width, prefix) {
    return str.length >= width ? str : (new Array(width - str.length + 1).join(prefix) + str);
}

/**
 * @param {number} lineNumber
 * @param {number} lineCount
 * @returns {string}
 */
function padLineNumber(lineNumber, lineCount) {
    return pad(lineNumber.toString(), lineCount.toString().length, S);
}

/**
 * @param {string} str
 * @returns {string}
 */
function showSpaces(str) {
    return isString(str) ? replaceTabs(replaceSpaces(str, SPACE), TAB) : str;
}

/**
 * @param {string} lineNumber
 * @param {string} line
 *
 * @returns {string}
 */
function previewDeletedLine(lineNumber, line) {
    return lineNumber + MARKER_DELETED + LINE_CHANGED + line;
}

/**
 * @param {string} lineOriginal
 * @param {string} lineChanged
 * @param {string} lineNumber
 *
 * @returns {string}
 */
function previewChangedLine(lineNumber, lineOriginal, lineChanged) {
    let changeIndicator = LINE_CHANGED;
    if (lineOriginal != null) {
        lineOriginal = lineNumber + S.repeat(3) + ROUTE_START + lineOriginal + N;
        changeIndicator = ROUTE_END;
    }

    lineNumber = lineOriginal ? S.repeat(lineNumber.toString().length) : lineNumber;
    const prefix = lineNumber + MARKER_CHANGED + changeIndicator;

    return (lineOriginal || '') + prefix + lineChanged.split(N).map((line, index) => {
        return index === 0 ? line : (S.repeat(prefix.length) + line);
    }).join(N);
}

/**
 * @param {string} lineNumber
 * @param {string} line
 *
 * @returns {string}
 */
function previewUnchangedLine(lineNumber, line) {
    return lineNumber + S.repeat(3) + LINE_UNCHANGED + line;
}

/**
 * @param {string} lineChanged
 * @param {string} lineOriginal
 * @param {number} lineNumber
 * @param {number} lineCount
 * @param {Object.<number, number>} indentation
 *
 * @param {object} options
 * @param {boolean=} options.showSpaces
 * @param {boolean=} options.hideOriginalLines
 * @param {boolean=} options.showUnchangedLines
 *
 * @returns {String}
 */
function previewLine(lineChanged, lineOriginal, lineNumber, lineCount, indentation, options) {
    lineChanged = options.showSpaces ? showSpaces(lineChanged) : lineChanged;
    lineOriginal = options.showSpaces ? showSpaces(lineOriginal) : lineOriginal;

    if (indentation != null && lineOriginal !== lineChanged) {
        lineOriginal = lineOriginal.slice(indentation[lineNumber]);
        if (lineChanged.trim != null) {
            lineChanged = lineChanged.split(N).map((line) => line.slice(indentation[lineNumber])).join(N);
        }
    }

    const paddedLineNumber = padLineNumber(lineNumber, lineCount);

    if (lineChanged === false) {
        return previewDeletedLine(paddedLineNumber, lineOriginal);
    }

    if (lineOriginal !== lineChanged) {
        return previewChangedLine(paddedLineNumber, (options.hideOriginalLines ? null : lineOriginal), lineChanged);
    }

    if (options.showUnchangedLines) {
        return previewUnchangedLine(paddedLineNumber, lineOriginal);
    }
}

/**
 * @param {string[]} linesOriginal
 * @param {string[]} linesChanged
 * @param {object} options
 * @param {boolean=} options.showSpaces
 * @param {boolean=} options.hideOriginalLines
 * @param {boolean=} options.keepOriginalIndentation
 *
 * @returns {Object.<number, number>}
 */
function collectIndentation(linesChanged, linesOriginal, options) {
    if (options.keepOriginalIndentation) {
        return null;
    }

    const indentation = [];

    linesChanged.forEach((line, i) => {
        if (line === linesOriginal[i]) {
            return;
        }

        const search = line.split == null ? [] : line.split(N);
        if (line.split == null || !options.hideOriginalLines) {
            search.push(linesOriginal[i]);
        }

        if (indentation[i] != null) {
            search.push(linesOriginal[i - 1]);
        }

        let trim = Infinity;
        search.forEach((_line) => (trim = Math.min(trim, _line.length - _line.trimStart().length)));
        indentation[i + 1] = trim;
    });

    return indentation;
}

/**
 * @param {string[]} linesOriginal
 * @param {string[]} linesChanged
 *
 * @param {object} options
 * @param {boolean=} options.showSpaces
 * @param {boolean=} options.hideOriginalLines
 * @param {boolean=} options.showUnchangedLines
 * @param {boolean=} options.keepOriginalIndentation
 *
 * @returns {String}
 */
function preview(linesOriginal, linesChanged, options) {
    if (options.showUnchangedLines || options.showSpaces) {
        options.keepOriginalIndentation = true;
    }

    const indentation = collectIndentation(linesChanged, linesOriginal, options);

    return linesChanged
        .map((lineChanged, i) => {
            return previewLine(lineChanged, linesOriginal[i], i + 1, linesOriginal.length, indentation, options);
        })
        .filter(isString) // removing delete (false) statements
        .join(N);
}

/**
 * @param {string[]} linesChanged
 * @param {function(string, {lineNumber: number, next: {line: string, lines: string[]},
 *      previous: {line: string, lines: string[]}}): (boolean|string)} onLineCallback
 *
 * @returns {string[]}
 */
function applyUserChanges(linesChanged, onLineCallback) {
    const nextLines = linesChanged.slice(0); // array copy
    const previousLines = [];

    return linesChanged.map((line, index) => {
        nextLines.shift();

        const change = onLineCallback(
            line,
            {
                lineNumber: index + 1,
                next: {
                    line: linesChanged[index + 1],
                    lines: nextLines.slice(0)
                },
                previous: {
                    line: linesChanged[index - 1],
                    lines: previousLines.slice(0)
                }
            }
        );

        previousLines.push(line);
        return change == null ? line : change;
    });
}

/**
 * @param {boolean} contentChanged
 * @param {string} filePath
 * @param {string} previewContent
 *
 * @returns {void}
 */
function logPreview(contentChanged, filePath, previewContent) {
    if (contentChanged) {
        console.log(`[INFO] Preview: '${filePath}'${N}${previewContent}`);
    } else {
        console.log(`[INFO] Nothing changed in file: '${filePath}'`);
    }
}

/**
 * @param {boolean} contentChanged
 * @param {string} filePath
 *
 * @returns {void}
 */
function logFileChange(contentChanged, filePath) {
    if (contentChanged) {
        console.log(`[INFO] Replacing file: '${filePath}'`);
    } else {
        console.log(`[INFO] Nothing changed in file: '${filePath}'`);
    }
}

/**
 * @param {string} filePath
 * @param {string} content
 *
 * @returns {void}
 */
function writeFile(filePath, content) {
    fs.writeFileSync(filePath, content, ENCODING);
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function readFile(filePath) {
    return fs.readFileSync(filePath, ENCODING).toString();
}

/**
 * @param {string} dirPath
 * @param {function(string): void} onFile
 *
 * @returns {void}
 */
function listFiles(dirPath, onFile) {
    fs.readdirSync(dirPath).forEach((file) => {
        const path = `${dirPath}${SEP}${file}`;
        if (fs.statSync(path).isDirectory()) {
            listFiles(path, onFile);
        } else {
            onFile(path);
        }
    });
}

/**
 * @param {string} filePath
 * @param {function} onLineCallback
 * @param {object=} options
 * @param {boolean=} options.dryRun
 * @param {boolean=} options.hidePreview
 * @param {boolean=} options.hideLogOfUnchangedFile
 * @param {object=}  options.previewOptions
 * @param {boolean=} options.previewOptions.showSpaces
 * @param {boolean=} options.previewOptions.hideOriginalLines
 * @param {boolean=} options.previewOptions.showUnchangedLines
 * @param {boolean=} options.previewOptions.keepOriginalIndentation
 * @returns {object}
 */
function validate(filePath, onLineCallback, options) {
    if (onLineCallback == null || typeof onLineCallback !== 'function') {
        throw new Error('[ERROR] no callback function given!');
    }

    options = options || {};
    options.previewOptions = options.previewOptions || {};

    if (options.dryRun && options.hidePreview) {
        options.hidePreview = false;
    }

    return options;
}

/**
 * @param {string} filePath
 * @param {function(string, {lineNumber: number, next: {line: string, lines: string[]},
 *      previous: {line: string, lines: string[]}}): (boolean|string)} onLineCallback
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
 * @returns {void}
 */
function replaceLine(filePath, onLineCallback, options) {
    options = validate(...arguments);

    const fulltextOriginal = readFile(filePath);
    const linesOriginal = fulltextOriginal.split(N);
    const linesChanged = applyUserChanges(linesOriginal.slice(0), onLineCallback);
    const fulltextChanged = linesChanged.filter(isString).join(N);

    const changed = fulltextChanged !== fulltextOriginal;

    if (changed && !options.dryRun) {
        writeFile(filePath, fulltextChanged);
    }

    if (!changed && options.hideLogOfUnchangedFile) {
        return; // Log is not desired
    }

    if (!options.dryRun) {
        logFileChange(changed, filePath);
    }

    if (options.hidePreview) {
        return;
    }

    const previewContent = preview(linesOriginal, linesChanged, options.previewOptions);
    if (options.dryRun) {
        logPreview(changed, filePath, previewContent);
    } else if (changed) {
        console.log(previewContent);
    }
}

const stringUtils = {

    /**
     * @param {string} line
     *
     * @returns {string}
     */
    lineIndent: (line) => {
        return S.repeat(line.search(new RegExp('\\S', 'g')));
    },

    /**
     * @param {string} str
     * @param {string=} replacement
     *
     * @returns {string}
     */
    replaceWhitespaces: function (str, replacement) {
        replacement = replacement || '';
        return str.replace(new RegExp('\\s', 'g'), replacement);
    },

    /**
     * @param {string} str
     * @param {string} start
     * @param {string} end
     * @param {string=} replacement
     *
     * @returns {string}
     */
    replaceBetween: function (str, start, end, replacement) {
        replacement = replacement || '';
        if (!str.includes(start) && !str.includes(end)) {
            return str;
        }
        const startIndex = str.indexOf(start);
        const endIndex = str.indexOf(end, startIndex + start.length);
        if (startIndex < 0 || endIndex < 0) {
            return str;
        }
        return str.substring(0, startIndex + start.length) + replacement + str.substring(endIndex);
    }

};

module.exports = {replaceLine: replaceLine, listFiles: listFiles, stringUtils: stringUtils};