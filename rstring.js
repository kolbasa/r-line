'use strict';

import fs from 'fs';

const TAB = ' ▸  ';
const SPACE = '·';

const N = '\n';
const TAB_REGEX = new RegExp('\\t', 'g');
const SPACES_REGEX = new RegExp(' ', 'g');

const _ = {
    /**
     * @param {string} str
     * @param {string} strToFind
     *
     * @returns {Array}
     */
    getMatchIndexes: (str, strToFind) => {
        const indices = [];
        if (!utils.isString(strToFind) || strToFind.length === 0) {
            return indices;
        }
        let index;
        let currentIndex = 0;
        while ((index = str.indexOf(strToFind, currentIndex)) > -1) {
            indices.push(index);
            currentIndex = index + strToFind.length;
        }
        return indices;
    },

    /**
     * @param {string} str
     * @param {string} replacement
     * @param {number} startIndex
     * @param {number} endIndex
     *
     * @returns {string}
     */
    replaceBetweenIndices: (str, replacement, startIndex, endIndex) => {
        return str.substring(0, startIndex) + replacement + str.substring(endIndex);
    },

    /**
     * @param {string} str
     * @param {string} strToReplace
     * @param {string} replacement
     * @param {boolean} isFirst
     *
     * @returns {string}
     */
    replaceOccurrenceOfString: (str, strToReplace, replacement, isFirst) => {
        const indices = _.getMatchIndexes(str, strToReplace);
        if (indices.length === 0) {
            return str;
        }
        const startIndex = isFirst ? indices[0] : indices[indices.length - 1];
        const endIndex = startIndex + strToReplace.length;
        return _.replaceBetweenIndices(str, replacement || '', startIndex, endIndex);
    },

    /**
     * @param {string} filePath
     * @returns {boolean}
     */
    isValidFile: (filePath) => {
        try {
            if (fs.lstatSync(filePath).isDirectory()) {
                return false;
            }
        } catch (e) {
            return false;
        }
        return true;
    },

    /**
     * @param {string} lineNumber
     * @param {string} line
     * @param {boolean} showSpaces
     *
     * @returns {string}
     */
    previewLineNumber: (lineNumber, line, showSpaces) => {
        return lineNumber + (' ').repeat(3) + START_INDICATOR + (showSpaces ? _.showSpaces(line) : line);
    },

    /**
     * @param {number} number
     * @param {number} width
     * @param {string} prefix
     *
     * @returns {string}
     */
    padPage: (number, width, prefix) => {
        prefix = prefix || '0';
        const pageString = number + '';
        const paddedPage = new Array(width - pageString.length + 1).join(prefix) + number;
        return pageString.length >= width ? number : paddedPage;
    },

    /**
     * @param {string} content
     * @returns {string}
     */
    showSpaces: (content) => {
        return utils.replaceTabs(utils.replaceSpaces(content, SPACE), TAB);
    },

    /**
     * @param {string} line
     * @param {number} paddingLength
     * @param {string} changeIndicator
     *
     * @returns {string}
     */
    previewContent: (line, paddingLength, changeIndicator) => {
        const lines = line.split(N);
        if (lines.length === 0) {
            return line;
        }
        line = lines[0];
        for (let i = 1; i < lines.length; i++) {
            line += N + (' ').repeat(paddingLength) + MODIFIED_INDICATOR;
            line += changeIndicator + lines[i];
        }
        return line;
    },

    /**
     * @param {string} originalLine
     * @param {string} modifiedLine
     * @param {string} lineNumber
     * @param {boolean} showSpaces
     *
     * @returns {{originalLine: string, changeIndicator: string}}
     */
    previewOriginalLine: (originalLine, modifiedLine, lineNumber, showSpaces) => {
        originalLine = showSpaces ? _.showSpaces(originalLine) : originalLine;
        const hasNewLines = modifiedLine.split(N);
        return {
            originalLine: lineNumber + (' ').repeat(3) + ORIGINAL_INDICATOR_1 + originalLine + N,
            changeIndicator: hasNewLines ? ORIGINAL_INDICATOR_2 : ORIGINAL_INDICATOR_3
        };
    },

    /**
     * @param {string} originalLine
     * @param {string} modifiedLine
     * @param {string} lineNumber
     * @param {boolean} showSpaces
     *
     * @returns {string}
     */
    previewModifiedLine: function (originalLine, modifiedLine, lineNumber, showSpaces) {
        let conf = {changeIndicator: CHANGE_INDICATOR};

        conf = originalLine == null ? conf : _.previewOriginalLine(...arguments);
        modifiedLine = showSpaces ? _.showSpaces(modifiedLine) : modifiedLine;

        const paddingLength = lineNumber.toString().length;
        const content = _.previewContent(modifiedLine, paddingLength, conf.changeIndicator);

        lineNumber = originalLine ? (' ').repeat(paddingLength) : lineNumber;
        return (conf.originalLine || '') + lineNumber + MODIFIED_INDICATOR + conf.changeIndicator + content;
    },

    /**
     * @param {string} lineNumber
     * @param {string} line
     * @param {boolean} showSpaces
     *
     * @returns {string}
     */
    previewDeletedLine: (lineNumber, line, showSpaces) => {
        return lineNumber + DELETED_INDICATOR + CHANGE_INDICATOR + (showSpaces ? _.showSpaces(line) : line) + N;
    },

    /**
     * @param {string[]} originalLines
     * @param {string[]} modifiedLines
     * @param options
     *
     * @returns {string}
     */
    preview: (originalLines, modifiedLines, options) => {
        options = options || {};

        let modifiedFileContent = '';

        for (let i in modifiedLines) {
            if (modifiedLines.hasOwnProperty(i)) {
                let nPaddingLength = originalLines.length.toString().length;
                let sLineNumber = _.padPage((parseInt(i) + 1), nPaddingLength, ' ');

                let sModifiedLine = modifiedLines[i];
                if (sModifiedLine !== false) {
                    if (sModifiedLine != null && originalLines[i] !== sModifiedLine) {
                        const originalLine = options.hideOriginalLines ? null : originalLines[i];
                        sModifiedLine = _.previewModifiedLine(originalLine, sModifiedLine, sLineNumber, options.showSpaces);
                        modifiedFileContent += sModifiedLine + N;
                    } else {
                        originalLines[i] = _.previewLineNumber(sLineNumber, originalLines[i], options.showSpaces);
                        if (options.previewUnchangedLines) {
                            modifiedFileContent += originalLines[i] + N;
                        }
                    }
                } else {
                    modifiedFileContent += _.previewDeletedLine(sLineNumber, originalLines[i], options.showSpaces);
                }
            }
        }

        modifiedFileContent = utils.replaceLastOccurrence(modifiedFileContent, N)
        return modifiedFileContent;
    },

    /**
     * @param {string[]} originalLines
     * @param {string[]} modifiedLines
     *
     * @returns {string}
     */
    applyChanges: (originalLines, modifiedLines) => {
        return modifiedLines
            .map((line, i) => {
                const modifiedLine = modifiedLines[i];
                if (modifiedLine === false) {
                    return false;
                }
                if (modifiedLine != null && originalLines[i] !== modifiedLine) {
                    return modifiedLine;
                } else {
                    return originalLines[i];
                }
            })
            .filter(utils.isString)
            .join(N);
    },

    /**
     * @param {string[]} modifiedLines
     * @param {number} index
     *
     * @returns {Object.<string, string>}
     */
    filterLines: (modifiedLines, index) => {
        let lines = {};
        if (modifiedLines.length > index) {
            lines[index + 1] = modifiedLines[index];
        }
        return lines;
    },

    /**
     *
     * @param {function} onLine
     * @param {string[]} modifiedLines
     * @param {Object.<string, string>} lines
     * @param {number} index
     *
     * @returns {string[]}
     */
    pipeToLineHandler: (onLine, modifiedLines, lines, index) => {
        if (Object.keys(lines).length === 0) {
            return modifiedLines;
        }
        let line = lines[Object.keys(lines)[0]];
        if (line === false) {
            return modifiedLines;
        }
        let result = onLine(line, (index + 1));
        if (result != null) {
            modifiedLines[index] = result;
        }
        return modifiedLines;
    },

    /**
     * @param {string} filePath
     * @param {string} content
     *
     * @returns {void}
     */
    writeFile: (filePath, content) => {
        fs.writeFileSync(filePath, content, 'utf-8');
    },

    /**
     * @param {boolean} contentChanged
     * @param {string} filePath
     * @param {string} previewContent
     *
     * @returns {void}
     */
    logPreview: (contentChanged, filePath, previewContent) => {
        if (contentChanged) {
            console.log(`[INFO] Preview: '${filePath}'${N}${N}${previewContent}`);
        } else {
            console.log(`[INFO] Nothing changed in file: '${filePath}'`);
        }
    },

    /**
     * @param {boolean} contentChanged
     * @param {string} filePath
     * @param {string} previewContent
     * @param {boolean} preview
     *
     * @returns {void}
     */
    logProgress: function (contentChanged, filePath, previewContent, preview) {
        if (preview) {
            return _.logPreview(...arguments);
        }
        if (contentChanged) {
            console.log(`[INFO] Replacing file: '${filePath}'`);
        } else {
            console.log(`[INFO] Nothing changed in file: '${filePath}'`);
        }
    }

};

const utils = {

    /**
     * @param {*} propToCheck
     * @returns {boolean}
     */
    isString: function (propToCheck) {
        return typeof propToCheck === 'string';
    },

    /**
     * @param {string} str
     * @param {string} strToReplace
     * @param {string=} replacement
     *
     * @returns {string}
     */
    replaceLastOccurrence: function (str, strToReplace, replacement) {
        return _.replaceOccurrenceOfString(str, strToReplace, replacement, false);
    },

    /**
     * @param {string} str
     * @param {string=} replacement
     *
     * @returns {string}
     */
    replaceTabs: function (str, replacement) {
        return str.replace(TAB_REGEX, replacement);
    },

    /**
     * @param {string} str
     * @param {string=} replacement
     *
     * @returns {string}
     */
    replaceSpaces: function (str, replacement) {
        return str.replace(SPACES_REGEX, replacement);
    }

};

const START_INDICATOR = '│ ';
const CHANGE_INDICATOR = '┤ ';
const MODIFIED_INDICATOR = ' M ';
const ORIGINAL_INDICATOR_1 = '┌ ';
const ORIGINAL_INDICATOR_2 = '└▷';
const ORIGINAL_INDICATOR_3 = '└▷';
const DELETED_INDICATOR = ' D ';

/**
 * @param {string} filePath
 * @param {function} onLineCallback
 * @param {object=} options
 * @param {boolean=} options.preview
 * @param {boolean=} options.showSpaces
 * @param {boolean=} options.hideOriginalLines
 * @param {boolean=} options.previewUnchangedLines
 * @param {boolean=} options.doNotLogUnchanged
 *
 * @returns {void}
 */
function file(filePath, onLineCallback, options) {
    options = options || {};

    if (!_.isValidFile(filePath)) {
        throw new Error(`[ERROR] Not a valid file: '${filePath}'!`);
    }

    if (onLineCallback == null || typeof onLineCallback !== 'function') {
        throw new Error('[ERROR] no callback function given!');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(N);

    let modifiedLines = lines.slice(0);

    for (let lineIndex = 0; lineIndex < modifiedLines.length; lineIndex++) {
        let filteredLines = _.filterLines(modifiedLines, lineIndex);
        modifiedLines = _.pipeToLineHandler(onLineCallback, modifiedLines, filteredLines, lineIndex);
    }

    let contentChanged = (_.applyChanges(lines, modifiedLines).trim() !== content.trim());
    let newContent = options.preview ? _.preview(lines, modifiedLines, options) : _.applyChanges(lines, modifiedLines);
    // newContent = utils.replaceLastOccurrence(newContent, N);


    if (contentChanged || !options.doNotLogUnchanged) {
        _.logProgress(contentChanged, filePath, newContent, options.preview);
    }

    if (!options.preview && contentChanged) {
        _.writeFile(filePath, newContent);
    }
}

if (global.describe != null) { // global mocha method
    // releasing the private methods for testing.
    Object.keys(_).forEach((x) => utils[x] = _[x]);
}

export const rstring = {file: file, utils: utils};