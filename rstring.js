'use strict';

import fs from 'fs';

const TAB = ' ▸  ';
const SPACE = '·';

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
        let indices = [];
        if (!publicUtils.isString(strToFind) || strToFind.length === 0) {
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
        let indices = _.getMatchIndexes(str, strToReplace);
        if (indices.length === 0) {
            return str;
        }
        let replaceFromIndex = isFirst ? indices[0] : indices[indices.length - 1];
        return _.replaceBetweenIndices(str, replacement || '',
            replaceFromIndex, replaceFromIndex + strToReplace.length
        );
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
     *
     * @param sLineNumber
     * @param sLine
     * @param showSpaces
     * @returns {*}
     */
    previewLineNumber: (sLineNumber, sLine, showSpaces) => {
        if (showSpaces) {
            sLine = publicUtils.replaceTabs(publicUtils.replaceSpaces(sLine, SPACE), TAB);
        }
        return sLineNumber + ' '.repeat(3) + START_INDICATOR + sLine;
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
     * @param {boolean} hideOriginalLines
     *
     * @returns {string}
     */
    previewNewLines: (line, paddingLength, hideOriginalLines) => {
        let lines = line.split('\n');
        if (lines.length > 0) {
            line = lines[0];
            for (let i = 1; i < lines.length; i++) {
                line += '\n' + ' '.repeat(paddingLength) +
                        MODIFIED_INDICATOR + (
                            !hideOriginalLines ? ORIGINAL_INDICATOR_3 : CHANGED_INDICATOR
                        ) + lines[i];
            }
        }
        return line;
    },

    /**
     * @param {string} originalLine
     * @param {string} modifiedLine
     * @param {string} lineNumber
     * @param {boolean} hideOriginalLines
     * @param {boolean} showSpaces
     *
     * @returns {string}
     */
    previewModifiedLine: (originalLine, modifiedLine, lineNumber, hideOriginalLines, showSpaces) => {
        let original = '';
        let lineIndicator = CHANGED_INDICATOR;
        let hasNewLines = modifiedLine.split('\n');

        if (!hideOriginalLines) {
            if (showSpaces) {
                originalLine = publicUtils.replaceTabs(publicUtils.replaceSpaces(originalLine, SPACE), TAB);
            }
            original = lineNumber + ' '.repeat(3) + ORIGINAL_INDICATOR_1 + originalLine + '\n';
            if (hasNewLines) {
                lineIndicator = ORIGINAL_INDICATOR_2;
            } else {
                lineIndicator = ORIGINAL_INDICATOR_3;
            }
        }

        if (showSpaces) {
            modifiedLine = publicUtils.replaceTabs(publicUtils.replaceSpaces(modifiedLine, SPACE), TAB);
        }

        let nPaddingLength = lineNumber.toString().length;
        modifiedLine = original + (!hideOriginalLines ? ' '.repeat(nPaddingLength) : lineNumber) +
                       MODIFIED_INDICATOR + lineIndicator +
                       _.previewNewLines(modifiedLine, nPaddingLength, hideOriginalLines);

        return modifiedLine;
    }

};

const publicUtils = {

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
 * @param {function} onLine
 * @param {object=} options
 * @param {boolean=} options.preview
 * @param {boolean=} options.showSpaces
 * @param {boolean=} options.hideOriginalLines
 * @param {boolean=} options.previewUnchangedLines
 *
 * @returns {void}
 */
function file(filePath, onLine, options) {
    options = options || {};

    if (!_.isValidFile(filePath)) {
        console.error('[ERROR] Not a valid file: \'' + filePath + '\'!');
        return;
    }

    if (onLine == null || typeof onLine !== 'function') {
        console.error('[ERROR] no callback function given!');
        return;
    }

    let sModifiedFileContent = '';

    /**
     *
     * @param sModifiedFileContent
     * @param sLineNumber
     * @param sLine
     * @param preview
     * @returns {*}
     */
    function previewDeletedLine(sModifiedFileContent, sLineNumber, sLine, preview) {
        if (preview) {
            if (options.showSpaces) {
                sLine = publicUtils.replaceTabs(publicUtils.replaceSpaces(sLine, SPACE), TAB);
            }
            sModifiedFileContent += sLineNumber + DELETED_INDICATOR +
                                    CHANGED_INDICATOR + sLine + '\n';
        }
        return sModifiedFileContent;
    }

    /**
     *
     * @param aOriginalLines
     * @param aModifiedLines
     * @param preview
     */
    function applyChanges(aOriginalLines, aModifiedLines, preview) {

        for (let i in aModifiedLines) {
            if (aModifiedLines.hasOwnProperty(i)) {
                let nPaddingLength = aOriginalLines.length.toString().length;
                let sLineNumber = preview ? _.padPage((parseInt(i) + 1), nPaddingLength, ' ') : '';

                let sModifiedLine = aModifiedLines[i];
                if (sModifiedLine !== false) {
                    if (sModifiedLine != null && aOriginalLines[i] !== sModifiedLine) {
                        if (preview) {
                            sModifiedLine = _.previewModifiedLine(aOriginalLines[i], sModifiedLine, sLineNumber,
                                options.hideOriginalLines, options.showSpaces);
                        }
                        sModifiedFileContent += sModifiedLine + '\n';
                    } else {
                        if (preview) {
                            aOriginalLines[i] = _.previewLineNumber(sLineNumber, aOriginalLines[i], preview);
                        }
                        if (!preview || options.previewUnchangedLines) {
                            sModifiedFileContent += aOriginalLines[i] + '\n';
                        }
                    }
                } else {
                    sModifiedFileContent = previewDeletedLine(sModifiedFileContent, sLineNumber, aOriginalLines[i], preview);
                }
            }
        }

        return sModifiedFileContent;
    }

    /**
     *
     * @param aModifiedLines
     * @param aLines
     * @param nIndex
     * @returns {{}}
     */
    function preselectLines(aModifiedLines, aLines, nIndex) {
        let oLines = {};
        if (aModifiedLines.length > (nIndex)) {
            if (aModifiedLines[nIndex] != null) {
                oLines[nIndex + 1] = aModifiedLines[nIndex];
            }
        }
        return oLines;
    }

    /**
     *
     * @param onLine
     * @param aModifiedLines
     * @param oLines
     * @param nIndex
     * @returns {*}
     */
    function pipeToLineHandler(onLine, aModifiedLines, oLines, nIndex) {
        if (Object.keys(oLines).length > 0) {
            let line = oLines[Object.keys(oLines)[0]];
            if (line !== false) {
                let sResult = onLine(line, (nIndex + 1));
                if (sResult != null) {
                    aModifiedLines[nIndex] = sResult;
                }
            }
        }
        return aModifiedLines;
    }

    /**
     *
     */
    function writeFile() {
        sModifiedFileContent = publicUtils.replaceLastOccurrence(sModifiedFileContent, '\n');
        if (options.preview) {
            if (sModifiedFileContent != null && sModifiedFileContent.trim().length > 0) {
                console.log('\n' + sModifiedFileContent);
            }
        } else {
            console.log('[INFO] Replacing file: \'' + filePath + '\'');
            fs.writeFileSync(filePath, sModifiedFileContent, 'utf-8');
        }
    }

    let sFileContent = fs.readFileSync(filePath, 'utf-8');

    let aLines = sFileContent.split('\n');
    let aLinesCopy = aLines.slice(0);

    let aModifiedLines;
    aModifiedLines = aLines.slice(0);

    for (let nLineIndex = 0; nLineIndex < aModifiedLines.length; nLineIndex++) {
        let oLines = preselectLines(aModifiedLines, aLines, nLineIndex);
        aModifiedLines = pipeToLineHandler(onLine, aModifiedLines, oLines, nLineIndex);
    }

    let bFileChanged = (applyChanges(aLinesCopy, aModifiedLines).trim() !== sFileContent.trim());
    sModifiedFileContent = '';
    applyChanges(aLinesCopy, aModifiedLines, options.preview);

    if (options.preview) {
        console.log('[INFO] Reading file: \'' + filePath + '\'');
    }

    if (bFileChanged) {
        writeFile();
    }

}

if (global.describe != null) {
    // releasing the private methods for testing.
    Object.keys(_).forEach((x) => {
        publicUtils[x] = _[x];
    });
}

export const rstring = {
    file: file,
    utils: publicUtils
};