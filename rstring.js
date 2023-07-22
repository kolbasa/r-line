'use strict';

import fs from 'fs';

/**
 * @param {String} sToFindSubstringIn
 * @param {String} sSubstringToFind
 *
 * @returns {Array}
 */
function getMatchIndexes(sToFindSubstringIn, sSubstringToFind) {
    let nLengthToMatch = sSubstringToFind.length;
    let anIndices = [];
    if (!_.isString(sSubstringToFind) || sSubstringToFind.length === 0) {
        return anIndices;
    }
    let nIndex;
    let nCurrentIndex = 0;
    while ((nIndex = sToFindSubstringIn.indexOf(sSubstringToFind, nCurrentIndex)) > -1) {
        anIndices.push(nIndex);
        nCurrentIndex = nIndex + nLengthToMatch;
    }
    return anIndices;
}

/**
 * @param {String} sToReplaceIn
 * @param {String} sReplacement
 * @param {Number} nStartIndex
 * @param {Number} nEndIndex
 *
 * @returns {String}
 */
function replaceBetweenIndices(sToReplaceIn, sReplacement, nStartIndex, nEndIndex) {
    return sToReplaceIn.substring(0, nStartIndex) + sReplacement + sToReplaceIn.substring(nEndIndex);
}

/**
 * @param {String} sToReplaceIn
 * @param {String} sToReplace
 * @param {String} sReplacement
 * @param {Boolean} bFirst
 *
 * @returns {String}
 */
function replaceOccurrenceOfString(sToReplaceIn, sToReplace, sReplacement, bFirst) {
    let anIndices = getMatchIndexes(sToReplaceIn, sToReplace);
    if (anIndices.length > 0) {
        let nReplaceFromIndex = bFirst ? anIndices[0] : anIndices[anIndices.length - 1];
        return replaceBetweenIndices(sToReplaceIn, sReplacement || '',
            nReplaceFromIndex, nReplaceFromIndex + sToReplace.length);
    }
    return sToReplaceIn;
}

const TAB = ' ▸  ';
const SPACE = '·';

let TAB_REGEX = new RegExp('\\t', 'g');
let SPACES_REGEX = new RegExp(' ', 'g');

let _ = {

    /**
     * @param {*} obj
     *
     * @returns {Boolean}
     */
    isString: function (obj) {
        return typeof obj === 'string';
    },

    /**
     * @param {String} sToReplaceIn
     * @param {String} sToReplace
     * @param {String=} sReplacement
     *
     * @returns {String}
     */
    replaceLastOccurrence: function (sToReplaceIn, sToReplace, sReplacement) {
        return replaceOccurrenceOfString(sToReplaceIn, sToReplace, sReplacement, false);
    },

    /**
     * @param {Number} number
     * @param {Number} nWidth
     * @param {String} sPrefix
     *
     * @returns {String}
     */
    pad: function pad(number, nWidth, sPrefix) {
        sPrefix = sPrefix || '0';
        const _number = number + '';
        let sPaddedNumber = new Array(nWidth - _number.length + 1).join(sPrefix) + number;
        return _number.length >= nWidth ? number : sPaddedNumber;
    },

    /**
     * @param {String} sReplaceIn
     * @param {String=} sReplaceWith
     *
     * @returns {String}
     */
    replaceTabs: function (sReplaceIn, sReplaceWith) {
        return sReplaceIn.replace(TAB_REGEX, sReplaceWith);
    },

    /**
     * @param {String} sReplaceIn
     * @param {String=} sReplaceWith
     *
     * @returns {String}
     */
    replaceSpaces: function (sReplaceIn, sReplaceWith) {
        return sReplaceIn.replace(SPACES_REGEX, sReplaceWith);
    },

    /**
     * @param {String} sFilePath
     *
     * @returns {Boolean}
     */
    isValidFile: function (sFilePath) {
        try {
            if (fs.lstatSync(sFilePath).isDirectory()) {
                return false;
            }
        } catch (e) {
            return false;
        }
        return true;
    }

};

// /////////////////////////////////////////////////////////////////// //

let START_INDICATOR = '│ ';
let CHANGED_INDICATOR = '┤ ';
let MODIFIED_INDICATOR = ' M ';
let ORIGINAL_INDICATOR_1 = '┌ ';
let ORIGINAL_INDICATOR_2 = '└▷';
let ORIGINAL_INDICATOR_3 = '└▷';
let DELETED_INDICATOR = ' D ';

/**
 * @param {string} filePath
 * @param {function} onLine
 * @param {object=} options
 * @param {boolean=} options.preview
 * @param {boolean=} options.showSpaces
 * @param {boolean=} options.hideOriginalLines
 * @param {boolean=} options.previewUnchangedLines
 */
function handleFile(filePath, onLine, options) {

    if (!_.isValidFile(filePath)) {
        console.error('[ERROR] Not a valid file: \'' + filePath + '\'');
        return;
    }

    options = options || {};

    let sModifiedFileContent = '';

    let preview = options.preview;
    let showSpaces = options.showSpaces;
    let previewDeletedLines = true;
    let previewOriginalLine = !options.hideOriginalLines;
    let previewUnchangedLines = options.previewUnchangedLines;

    /**
     *
     * @param sModifiedLine
     * @param sLineNumber
     * @param sLine
     * @param preview
     * @returns {*}
     */
    function _previewModifiedLine(sModifiedLine, sLineNumber, sLine, preview) {
        if (!preview) {
            return sModifiedLine;
        }

        let sOriginal = '';
        let sLineIndicator = CHANGED_INDICATOR;
        let bHasNewLines = sModifiedLine.split('\n');

        if (previewOriginalLine) {
            if (showSpaces) {
                sLine = _.replaceTabs(_.replaceSpaces(sLine, SPACE), TAB);
            }
            sOriginal = sLineNumber + ' '.repeat(3) + ORIGINAL_INDICATOR_1 + sLine + '\n';
            if (bHasNewLines) {
                sLineIndicator = ORIGINAL_INDICATOR_2;
            } else {
                sLineIndicator = ORIGINAL_INDICATOR_3;
            }
        }

        if (showSpaces) {
            sModifiedLine = _.replaceTabs(_.replaceSpaces(sModifiedLine, SPACE), TAB);
        }

        let nPaddingLength = sLineNumber.toString().length;
        sModifiedLine = sOriginal + (previewOriginalLine ? ' '.repeat(nPaddingLength) : sLineNumber) +
                        MODIFIED_INDICATOR + sLineIndicator + _previewNewLines(sModifiedLine, nPaddingLength);

        return sModifiedLine;
    }

    /**
     *
     * @param sLine
     * @param nPaddingLength
     * @returns {*}
     */
    function _previewNewLines(sLine, nPaddingLength) {
        let aLines = sLine.split('\n');
        if (aLines.length > 0) {
            sLine = aLines[0];
            for (let i = 1; i < aLines.length; i++) {
                sLine += '\n' + ' '.repeat(nPaddingLength) +
                         MODIFIED_INDICATOR + (
                             previewOriginalLine ? ORIGINAL_INDICATOR_3 : CHANGED_INDICATOR
                         ) + aLines[i];
            }
        }
        return sLine;
    }

    /**
     *
     * @param sLineNumber
     * @param sLine
     * @param preview
     * @returns {*}
     */
    function _previewLineNumber(sLineNumber, sLine, preview) {
        if (preview) {
            if (showSpaces) {
                sLine = _.replaceTabs(_.replaceSpaces(sLine, SPACE), TAB);
            }
            sLine = sLineNumber + ' '.repeat(3) + START_INDICATOR + sLine;
        }
        return sLine;
    }

    /**
     *
     * @param sModifiedFileContent
     * @param sLineNumber
     * @param sLine
     * @param preview
     * @returns {*}
     */
    function _previewDeletedLine(sModifiedFileContent, sLineNumber, sLine, preview) {
        if (preview && previewDeletedLines) {
            if (showSpaces) {
                sLine = _.replaceTabs(_.replaceSpaces(sLine, SPACE), TAB);
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
    function _applyChanges(aOriginalLines, aModifiedLines, preview) {

        for (let i in aModifiedLines) {
            if (aModifiedLines.hasOwnProperty(i)) {
                let nPaddingLength = aOriginalLines.length.toString().length;
                let sLineNumber = preview ? _.pad((parseInt(i) + 1), nPaddingLength, ' ') : '';

                let sModifiedLine = aModifiedLines[i];
                if (sModifiedLine !== false) {
                    if (sModifiedLine != null && aOriginalLines[i] !== sModifiedLine) {
                        sModifiedLine = _previewModifiedLine(sModifiedLine, sLineNumber, aOriginalLines[i], preview);
                        sModifiedFileContent += sModifiedLine + '\n';
                    } else {
                        aOriginalLines[i] = _previewLineNumber(sLineNumber, aOriginalLines[i], preview);
                        if (!preview || previewUnchangedLines) {
                            sModifiedFileContent += aOriginalLines[i] + '\n';
                        }
                    }
                } else {
                    sModifiedFileContent = _previewDeletedLine(sModifiedFileContent, sLineNumber, aOriginalLines[i], preview);
                }
            }
        }

        return sModifiedFileContent;
    }

    /**
     *
     * @param oCurrentConfiguration
     * @param aModifiedLines
     * @param aLines
     * @param nIndex
     * @returns {{}}
     */
    function _preselectLines(oCurrentConfiguration, aModifiedLines, aLines, nIndex) {
        let oLines = {};
        let nInitialLinesCount = oCurrentConfiguration.nLinesNeeded;

        for (let x = 0; x < nInitialLinesCount; x++) {
            if (aModifiedLines.length > (nIndex + x)) {
                let bSkipChanged = (
                    oCurrentConfiguration.nLinesNeeded > 1 &&
                    (
                        (
                            oCurrentConfiguration.bHideChangedLines &&
                            aModifiedLines[nIndex + x] !== aLines[nIndex + x]
                        )
                        ||
                        aModifiedLines[nIndex + x] === false
                    )
                );

                if (aModifiedLines[nIndex + x] != null && !bSkipChanged) {
                    oLines[nIndex + (x + 1)] = aModifiedLines[nIndex + x];
                } else {
                    nInitialLinesCount++;
                }
            }
        }

        return oLines;
    }

    /**
     *
     * @param oCurrentConfiguration
     * @param aModifiedLines
     * @param oLines
     * @param nIndex
     * @param oNameSpace
     * @returns {*}
     */
    function _pipeToLineHandler(oCurrentConfiguration, aModifiedLines, oLines, nIndex, oNameSpace) {
        if (Object.keys(oLines).length > 0) {
            let fnCurrentHandler = oCurrentConfiguration.fnHandler;
            if (oCurrentConfiguration.nLinesNeeded === 1) {
                let line = oLines[Object.keys(oLines)[0]];
                if (line !== false) {
                    let sResult = fnCurrentHandler(line, (nIndex + 1), oNameSpace, filePath);
                    if (sResult != null) {
                        aModifiedLines[nIndex] = sResult;
                    }
                }
            } else {
                fnCurrentHandler(oLines, (nIndex + 1), oNameSpace, filePath);
                for (let nLineNumber in oLines) {
                    if (oLines.hasOwnProperty(nLineNumber)) {
                        aModifiedLines[nLineNumber - 1] = oLines[nLineNumber];
                    }
                }
            }
        }
        return aModifiedLines;
    }

    /**
     *
     */
    function _writeFile() {
        sModifiedFileContent = _.replaceLastOccurrence(sModifiedFileContent, '\n');
        if (preview) {
            if (sModifiedFileContent != null && sModifiedFileContent.trim().length > 0) {
                console.log('\n' + sModifiedFileContent);
            }
        } else {
            console.log('[INFO] Replacing file: \'' + filePath + '\'');
            fs.writeFileSync(filePath, sModifiedFileContent, 'utf-8');
        }
    }

    if (onLine == null) {
        return;
    }

    let sFileContent = fs.readFileSync(filePath, 'utf-8');

    let aLines = sFileContent.split('\n');
    let aLinesCopy = aLines.slice(0);

    let aModifiedLines;
    aModifiedLines = aLines.slice(0);
    let oCurrentConfiguration = {
        nLinesNeeded: 1,
        fnHandler: onLine,
        bHideChangedLines: false
    };
    let oNameSpace = {};

    for (let nLineIndex = 0; nLineIndex < aModifiedLines.length; nLineIndex++) {
        let oLines = _preselectLines(oCurrentConfiguration, aModifiedLines, aLines, nLineIndex);
        aModifiedLines = _pipeToLineHandler(oCurrentConfiguration, aModifiedLines, oLines, nLineIndex, oNameSpace);
    }
    let bFileChanged = (_applyChanges(aLinesCopy, aModifiedLines).trim() !== sFileContent.trim());
    sModifiedFileContent = '';
    _applyChanges(aLinesCopy, aModifiedLines, preview);

    if (preview) {
        console.log('[INFO] Reading file: \'' + filePath + '\'');
    }

    if (bFileChanged) {
        _writeFile();
    }

}

export const rstring = {
    handleFile: handleFile,
    stringUtils: _
};