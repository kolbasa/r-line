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
        if (showSpaces) {
            line = utils.replaceTabs(utils.replaceSpaces(line, SPACE), TAB);
        }
        return lineNumber + ' '.repeat(3) + START_INDICATOR + line;
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
     * @param {string} line
     * @param {number} paddingLength
     * @param {string} lineIndicator
     *
     * @returns {string}
     */
    previewNewLines: (line, paddingLength, lineIndicator) => {
        let lines = line.split(N);
        if (lines.length === 0) {
            return line;
        }
        line = lines[0];
        for (let i = 1; i < lines.length; i++) {
            line += N + ' '.repeat(paddingLength) + MODIFIED_INDICATOR;
            line += lineIndicator + lines[i];
        }
        return line;
    },

    /**
     * @param {string} originalLine
     * @param {string} modifiedLine
     * @param {string} lineNumber
     * @param {boolean} showSpaces
     *
     * @returns {{original: string, lineIndicator: string}}
     */
    previewOriginalLine: (originalLine, modifiedLine, lineNumber, showSpaces) => {
        if (showSpaces) {
            originalLine = utils.replaceTabs(utils.replaceSpaces(originalLine, SPACE), TAB);
        }
        let hasNewLines = modifiedLine.split(N);
        return {
            original: lineNumber + ' '.repeat(3) + ORIGINAL_INDICATOR_1 + originalLine + N,
            lineIndicator: hasNewLines ? ORIGINAL_INDICATOR_2 : ORIGINAL_INDICATOR_3
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
        let conf = {
            original: '',
            lineIndicator: CHANGED_INDICATOR
        };

        if (originalLine != null) {
            conf = _.previewOriginalLine(...arguments);
        }

        if (showSpaces) {
            modifiedLine = utils.replaceTabs(utils.replaceSpaces(modifiedLine, SPACE), TAB);
        }

        const paddingLength = lineNumber.toString().length;
        const newLines = _.previewNewLines(modifiedLine, paddingLength, conf.lineIndicator);

        return conf.original + (originalLine ? ' '.repeat(paddingLength) : lineNumber) +
               MODIFIED_INDICATOR + conf.lineIndicator + newLines;
    },

    /**
     *
     * @param sModifiedFileContent
     * @param sLineNumber
     * @param sLine
     * @param showSpaces
     * @returns {*}
     */
    previewDeletedLine: (sModifiedFileContent, sLineNumber, sLine, showSpaces) => {
        if (showSpaces) {
            sLine = utils.replaceTabs(utils.replaceSpaces(sLine, SPACE), TAB);
        }
        return sLineNumber + DELETED_INDICATOR + CHANGED_INDICATOR + sLine + N;
    },

    /**
     * @param aOriginalLines
     * @param aModifiedLines
     * @param options
     */
    applyChanges: (aOriginalLines, aModifiedLines, options) => {
        options = options || {};

        let sModifiedFileContent = '';

        for (let i in aModifiedLines) {
            if (aModifiedLines.hasOwnProperty(i)) {
                let nPaddingLength = aOriginalLines.length.toString().length;
                let sLineNumber = options.preview ? _.padPage((parseInt(i) + 1), nPaddingLength, ' ') : '';

                let sModifiedLine = aModifiedLines[i];
                if (sModifiedLine !== false) {
                    if (sModifiedLine != null && aOriginalLines[i] !== sModifiedLine) {
                        if (options.preview) {
                            const originalLine = options.hideOriginalLines ? null : aOriginalLines[i];
                            sModifiedLine = _.previewModifiedLine(originalLine, sModifiedLine, sLineNumber, options.showSpaces);
                        }
                        sModifiedFileContent += sModifiedLine + N;
                    } else {
                        if (options.preview) {
                            aOriginalLines[i] = _.previewLineNumber(sLineNumber, aOriginalLines[i], options.showSpaces);
                        }
                        if (!options.preview || options.previewUnchangedLines) {
                            sModifiedFileContent += aOriginalLines[i] + N;
                        }
                    }
                } else if (options.preview) {
                    sModifiedFileContent += _.previewDeletedLine(sModifiedFileContent, sLineNumber, aOriginalLines[i], options.showSpaces);
                }
            }
        }

        return sModifiedFileContent;
    },

    /**
     *
     * @param aModifiedLines
     * @param aLines
     * @param nIndex
     * @returns {{}}
     */
    filterLines: (aModifiedLines, aLines, nIndex) => {
        let oLines = {};
        if (aModifiedLines.length > (nIndex)) {
            oLines[nIndex + 1] = aModifiedLines[nIndex];
        }
        return oLines;
    },

    /**
     *
     * @param onLine
     * @param modifiedLines
     * @param oLines
     * @param nIndex
     * @returns {*}
     */
    pipeToLineHandler: (onLine, modifiedLines, oLines, nIndex) => {
        if (Object.keys(oLines).length === 0) {
            return modifiedLines;
        }
        let line = oLines[Object.keys(oLines)[0]];
        if (line === false) {
            return modifiedLines;
        }
        let sResult = onLine(line, (nIndex + 1));
        if (sResult != null) {
            modifiedLines[nIndex] = sResult;
        }
        return modifiedLines;
    },

    /**
     * @param {string} filePath
     * @param {string} content
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
const CHANGED_INDICATOR = '┤ ';
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
        let filteredLines = _.filterLines(modifiedLines, lines, lineIndex);
        modifiedLines = _.pipeToLineHandler(onLineCallback, modifiedLines, filteredLines, lineIndex);
    }

    let contentChanged = (_.applyChanges(lines, modifiedLines).trim() !== content.trim());
    let newContent = _.applyChanges(lines, modifiedLines, options);

    newContent = utils.replaceLastOccurrence(newContent, N);

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