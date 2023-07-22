'use strict';

import fs from 'fs';

const S = ' ';
const N = '\n';
const TAB = ' ▸  ';
const SPACE = '·';
const ENCODING = 'utf-8';

const TAB_REGEX = new RegExp('\\t', 'g');
const SPACES_REGEX = new RegExp(S, 'g');

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
        return lineNumber + S.repeat(3) + START_INDICATOR + (showSpaces ? _.showSpaces(line) : line);
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
        const pageString = number.toString();
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
            line += N + S.repeat(paddingLength) + MODIFIED_INDICATOR;
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
            originalLine: lineNumber + S.repeat(3) + ORIGINAL_INDICATOR_1 + originalLine + N,
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

        lineNumber = originalLine ? S.repeat(paddingLength) : lineNumber;
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
        return lineNumber + DELETED_INDICATOR + CHANGE_INDICATOR + (showSpaces ? _.showSpaces(line) : line);
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

        return modifiedLines
            .map((line, i) => {
                let lineNumber = _.padPage((i + 1), originalLines.length.toString().length, S);

                if (modifiedLines[i] === false) {
                    return _.previewDeletedLine(lineNumber, originalLines[i], options.showSpaces);
                }

                if (originalLines[i] !== modifiedLines[i]) {
                    const originalLine = options.hideOriginalLines ? null : originalLines[i];
                    modifiedLines[i] = _.previewModifiedLine(originalLine, modifiedLines[i], lineNumber, options.showSpaces);
                    return modifiedLines[i];
                }

                originalLines[i] = _.previewLineNumber(lineNumber, originalLines[i], options.showSpaces);
                if (options.previewUnchangedLines) {
                    return originalLines[i];
                }
            })
            .filter(utils.isString)
            .join(N);
    },

    /**
     * @param {string[]} modifiedLines
     * @param {function} onLine
     *
     * @returns {string[]}
     */
    applyUserChanges: (modifiedLines, onLine) => {
        return modifiedLines.map((line, index) => {
            const change = onLine(line, index + 1);
            return change == null ? line : change;
        });
    },

    /**
     * @param {string} filePath
     * @param {string} content
     *
     * @returns {void}
     */
    writeFile: (filePath, content) => {
        fs.writeFileSync(filePath, content, ENCODING);
    },

    /**
     * @param {string} filePath
     * @returns {string}
     */
    readFile: (filePath) => {
        return fs.readFileSync(filePath, ENCODING).toString();
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
    },

    /**
     * @param {string} filePath
     * @param {function} onLineCallback
     *
     * @returns {void}
     */
    validate: (filePath, onLineCallback) => {
        if (!_.isValidFile(filePath)) {
            throw new Error(`[ERROR] Not a valid file: '${filePath}'!`);
        }

        if (onLineCallback == null || typeof onLineCallback !== 'function') {
            throw new Error('[ERROR] no callback function given!');
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

    _.validate(filePath, onLineCallback);

    const fulltext = _.readFile(filePath);

    const lines = fulltext.split(N);
    const linesChanged = _.applyUserChanges(lines.slice(0), onLineCallback);

    const fulltextChanged = linesChanged.filter(utils.isString).join(N);
    const hasChanged = fulltextChanged !== fulltext;

    if (hasChanged || !options.doNotLogUnchanged) {
        _.logProgress(hasChanged, filePath, _.preview(lines, linesChanged, options), options.preview);
    }

    if (hasChanged && !options.preview) {
        _.writeFile(filePath, fulltextChanged);
    }
}

if (global.describe != null) { // global mocha method
    // releasing the private methods for testing.
    Object.keys(_).forEach((x) => utils[x] = _[x]);
}

export const rstring = {file: file, utils: utils};