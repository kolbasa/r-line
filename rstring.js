'use strict';

import fs from 'fs';

/**
 * @param {String} sToFindSubstringIn
 * @param {String} sSubstringToFind
 *
 * @returns {Array}
 */
function _getMatchIndexes(sToFindSubstringIn, sSubstringToFind) {
    let nLengthToMatch = sSubstringToFind.length;
    let anIndices = [];
    if (!_.isPopulatedString(sSubstringToFind)) {
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
function _replaceBetweenIndices(sToReplaceIn, sReplacement, nStartIndex, nEndIndex) {
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
function _replaceOccurrenceOfString(sToReplaceIn, sToReplace, sReplacement, bFirst) {
    let anIndices = _getMatchIndexes(sToReplaceIn, sToReplace);
    if (anIndices.length > 0) {
        let nReplaceFromIndex = bFirst ? anIndices[0] : anIndices[anIndices.length - 1];
        return _replaceBetweenIndices(sToReplaceIn, sReplacement || '',
            nReplaceFromIndex, nReplaceFromIndex + sToReplace.length);
    }
    return sToReplaceIn;
}

let TAB_REGEX = new RegExp('\\t', 'g');
let SPACES_REGEX = new RegExp(' ', 'g');
let WHITESPACE_REGEX = new RegExp('\\s', 'g');
let WHITESPACE2_REGEX = new RegExp('\\S', 'g');

let _ = {

    /**
     * @param {*} value
     *
     * @returns {Boolean}
     */
    isNil: function (value) {
        return value == null;
    },

    /**
     * @param {*} obj
     *
     * @returns {Boolean}
     */
    isEmpty: function (obj) {
        if (_.isNil(obj)) {
            return false;
        }
        if (Array.isArray(obj)) {
            return obj.length === 0;
        } else if (typeof obj === 'string') {
            return obj === '';
        } else {
            return _.keys(obj).length === 0;
        }
    },

    /**
     * @param sPath {string}
     * @returns {string}
     */
    getFileName: function (sPath) {
        let aPath = sPath.split('/');
        return aPath[aPath.length - 1];
    },

    /**
     * @param {String} sToFindSubstringIn
     * @param {String} sSubstringToFind
     *
     * @returns {Array}
     */
    getMatchIndexes: _getMatchIndexes,

    /**
     * @param {*} obj
     *
     * @returns {Array}
     */
    keys: function (obj) {
        return Object.keys(obj);
    },

    /**
     * @param {*[]} array
     *
     * @returns {*}
     */
    first: function (array) {
        return array[0];
    },

    /**
     * @param {*[]} array
     *
     * @returns {*}
     */
    last: function (array) {
        return array[array.length - 1];
    },

    /**
     * @param {*} obj
     *
     * @returns {Boolean}
     */
    isString: function (obj) {
        return typeof obj === 'string';
    },

    /**
     * @param {*} obj
     *
     * @returns {Boolean}
     */
    isPopulatedString: function (obj) {
        return _.isString(obj) && !_.isEmpty(obj);
    },

    /**
     * @param {String} str
     *
     * @returns {String}
     */
    escapeRegExp: function (str) {
        let aCharactersToEscape = [
            '-', '[', ']', '/', '{', '}', '(',
            ')', '*', '+', '?', '.', '\\',
            '^', '$', '|'
        ];
        let sRegex = new RegExp('[' + aCharactersToEscape.join('\\') + ']', 'g');
        return str.replace(sRegex, '\\$&');
    },

    /**
     * @param {String} str
     * @param {String} sPrefix
     *
     * @returns {Boolean}
     */
    startsWith: function (str, sPrefix) {
        if (_.isPopulatedString(str) && _.isPopulatedString(sPrefix)) {
            return str.indexOf(sPrefix) === 0;
        }
        return false;
    },

    /**
     * @param {String} str
     * @param {String} sSuffix
     *
     * @returns {Boolean}
     */
    endsWith: function (str, sSuffix) {
        if (_.isPopulatedString(str) && _.isPopulatedString(sSuffix)) {
            return str.match(new RegExp(_.escapeRegExp(sSuffix) + '$')) != null;
        }
        return false;
    },

    /**
     * @param {String} str
     * @param {String} subStr
     *
     * @returns {Boolean}
     */
    containsString: function (str, subStr) {
        if (_.isPopulatedString(str) && _.isPopulatedString(subStr)) {
            return str.indexOf(subStr) > -1;
        }
        return false;
    },

    /**
     * @param {String} sToReplaceIn
     * @param {String} sToReplace
     * @param {String} sReplacement
     *
     * @returns {String}
     */
    replaceLastOccurrence: function (sToReplaceIn, sToReplace, sReplacement) {
        return _replaceOccurrenceOfString(sToReplaceIn, sToReplace, sReplacement, false);
    },

    /**
     * @param {String} sToReplaceIn
     * @param {String} sToReplace
     * @param {String=} sReplacement
     *
     * @returns {String}
     */
    replaceFirstOccurrence: function (sToReplaceIn, sToReplace, sReplacement) {
        return _replaceOccurrenceOfString(sToReplaceIn, sToReplace, sReplacement, true);
    },

    /**
     * @param {String} string
     * @param {Number} nRepeat
     *
     * @returns {String}
     */
    repeat: function (string, nRepeat) {
        let sResult = '';
        for (let i = 0; i < nRepeat; i++) {
            sResult += string;
        }
        return sResult;
    },

    /**
     * @param {String} str
     * @param {String} sMarker
     * @param {String} sReplaceWith
     *
     * @returns {String}
     */
    replaceAfterString: function (str, sMarker, sReplaceWith) {
        if (_.containsString(str, sMarker)) {
            let nMarkerIndex = str.indexOf(sMarker);
            if (nMarkerIndex > 0) {
                let sPrefix = str.substring(0, nMarkerIndex + sMarker.length);
                return sPrefix + sReplaceWith;
            }
        }
        return str;
    },

    /**
     * @param {String} str
     * @param {String} sFirstMarker
     * @param {String} sSecondMarker
     *
     * @returns {String}
     */
    getFirstBetweenStrings: function (str, sFirstMarker, sSecondMarker) {
        if (_.containsString(str, sFirstMarker)) {
            if (sSecondMarker == null) {
                sSecondMarker = sFirstMarker;
            }

            let nFirstMarkerIndex = str.indexOf(sFirstMarker);
            let nSecondMarkerIndex = str.indexOf(sSecondMarker, nFirstMarkerIndex + sFirstMarker.length);

            if (nFirstMarkerIndex >= 0 && nSecondMarkerIndex >= 0) {
                return str.substring(nFirstMarkerIndex +
                    sFirstMarker.length, nSecondMarkerIndex);
            }
        }
    },

    /**
     * @param {String} str
     * @param {String} sFirstMarker
     * @param {String} sSecondMarker
     * @param {String} sReplaceWith
     *
     * @returns {String}
     */
    replaceBetweenStrings: function (str, sFirstMarker, sSecondMarker, sReplaceWith) {
        if (_.containsString(str, sFirstMarker)) {
            let nFirstMarkerIndex = str.indexOf(sFirstMarker);
            let nSecondMarkerIndex = str.indexOf(sSecondMarker, nFirstMarkerIndex + sFirstMarker.length);
            if (nFirstMarkerIndex >= 0 && nSecondMarkerIndex >= 0) {
                str = str.substring(0, nFirstMarkerIndex + sFirstMarker.length) + sReplaceWith + str.substring(nSecondMarkerIndex);
            }
        }
        return str;
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
        number = number + '';
        let sPaddedNumber = new Array(nWidth - number.length + 1).join(sPrefix) + number;
        return number.length >= nWidth ? number : sPaddedNumber;
    },

    /**
     * @param {String} sReplaceIn
     * @param {String} sReplaceWith
     *
     * @returns {String}
     */
    replaceTabs: function (sReplaceIn, sReplaceWith) {
        // TODO: nope
        if (sReplaceWith == null) {
            sReplaceWith = ' ▸  ';
        }
        return sReplaceIn.replace(TAB_REGEX, sReplaceWith);
    },

    /**
     * @param {String} sReplaceIn
     * @param {String} sReplaceWith
     *
     * @returns {String}
     */
    replaceSpaces: function (sReplaceIn, sReplaceWith) {
        // TODO: nope
        if (sReplaceWith == null) {
            sReplaceWith = '·';
        }
        return sReplaceIn.replace(SPACES_REGEX, sReplaceWith);
    },

    /**
     * @param {String} sReplaceIn
     * @param {String=} sReplaceWith
     *
     * @returns {String}
     */
    replaceWhitespaces: function (sReplaceIn, sReplaceWith) {
        if (sReplaceIn == null) {
            // TODO: nope
            return undefined;
        }
        if (sReplaceWith == null) {
            sReplaceWith = '·';
        }
        return sReplaceIn.replace(WHITESPACE_REGEX, sReplaceWith);
    },

    /**
     * @param {String} sLine
     *
     * @returns {String}
     */
    lineIndent: function (sLine) {
        let nIndentLength = sLine.search(WHITESPACE2_REGEX);
        if (nIndentLength > 0) {
            return _.repeat(' ', nIndentLength);
        }
        return '';
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
    },

    /**
     * @param {String} sReplaceIn
     * @param {String} sToReplace
     * @param {String=} sReplaceWith
     *
     * @returns {String}
     */
    replace: function (sReplaceIn, sToReplace, sReplaceWith) {
        if (sReplaceWith == null) {
            sReplaceWith = '';
        }
        return sReplaceIn.replace(new RegExp(_.escapeRegExp(sToReplace), 'g'), sReplaceWith);
    },

    /**
     * @param {String[]} aStrings
     *
     * @returns {String[]}
     */
    sortAlphabetically: function (aStrings) {
        return aStrings.sort(function (aString, bString) {
            return aString.localeCompare(bString);
        });
    },

    /**
     * @param {Object} obj
     * @param {Object} oToAssign
     *
     * @returns {Object}
     */
    assign: function (obj, oToAssign) {
        for (let i in oToAssign) {
            if (oToAssign.hasOwnProperty(i)) {
                obj[i] = oToAssign[i];
            }
        }
        return obj;
    },

    walkSync: function (sDir, aFileList) {
        let aFiles = fs.readdirSync(sDir);
        aFileList = aFileList || [];
        aFiles.forEach(function (file) {
            if (fs.statSync(sDir + '/' + file).isDirectory()) {
                aFileList = _.walkSync(sDir + '/' + file, aFileList);
            } else {
                aFileList.push(sDir + '/' + file);
            }
        });
        return aFileList;
    },

    listFiles: function (sDirPath) {
        let aFileList = [];
        this.walkSync(sDirPath, aFileList);
        return aFileList;
    },

    /**
     *
     * @param sDirectoryPath
     * @param sRootPath
     * @returns {boolean|*}
     */
    mkDir: function (sDirectoryPath, sRootPath) {
        let aDirs = sDirectoryPath.split('/');
        let dir = aDirs.shift();
        sRootPath = (sRootPath || '') + dir + '/';
        try {
            fs.mkdirSync(sRootPath);
        } catch (e) {
            if (!fs.statSync(sRootPath).isDirectory()) {
                throw new Error(e);
            }
        }
        return !aDirs.length || _.mkDir(aDirs.join('/'), sRootPath);
    },

    /**
     *
     */
    getDate: function () {
        let tzOffset = (new Date()).getTimezoneOffset() * 60000;
        return _.replace(new Date(Date.now() - tzOffset).toISOString(), ':', '-');
    },

    /**
     *
     * @param sOriginalFilePath
     * @param sNewFilePath
     */
    copyFile: function (sOriginalFilePath, sNewFilePath) {
        return fs.createReadStream(sOriginalFilePath)
            .pipe(fs.createWriteStream(sNewFilePath));
    },

    /**
     * @param str
     * @param sReplaceWith
     * @returns {*|string|void}
     */
    replaceSpecialCharacters: function (str, sReplaceWith) {
        return str.replace(/[^\w\s]/gi, sReplaceWith);
    },

    /**
     *
     * @param sFilePath
     */
    trimFilePath: function (sFilePath) {
        sFilePath = _.replaceSpecialCharacters(sFilePath, '_');
        let aFilePath = sFilePath.split('_');
        let sResult = '';

        for (let i = aFilePath.length - 1; i >= 0; i--) {
            sResult = '_' + aFilePath[i] + sResult;
            if (aFilePath.length - i > 2) {
                break;
            }
        }
        return sResult;
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
 *
 * @param sFilePath
 * @param aHandler
 * @param {object=} options
 * @param {boolean=} options.preview
 * @param {boolean=} options.showSpaces
 * @param {boolean=} options.previewDeletedLines
 * @param {boolean=} options.previewOriginalLines
 * @param {boolean=} options.previewUnchangedLines
 */
function _handleFile(sFilePath, aHandler, options) {

    if (!_.isValidFile(sFilePath)) {
        console.error('[ERROR] Not a valid file: \'' + sFilePath + '\'');
        return;
    }

    let sModifiedFileContent = '';

    let preview = _.isNil(options) ? false : options.preview;
    let showSpaces = _.isNil(options) ? false : options.showSpaces;
    let previewDeletedLines = _.isNil(options) ? false : options.previewDeletedLines;
    let previewOriginalLine = _.isNil(options) ? true : options.previewOriginalLines;
    let previewUnchangedLines = _.isNil(options) ? true : options.previewUnchangedLines;

    if (!Array.isArray(aHandler)) {
        aHandler = [aHandler];
    }

    /**
     * @param oConfiguration
     * @returns {*}
     */
    function _validateConfiguration(oConfiguration) {
        let bSingleLineMode = _.isNil(oConfiguration.nLinesNeeded) ||
            oConfiguration.nLinesNeeded <= 1;

        if (bSingleLineMode) {
            oConfiguration = {
                nLinesNeeded: 1,
                fnHandler: oConfiguration,
                bHideChangedLines: false
            };
        }

        return oConfiguration;
    }

    /**
     *
     * @param sModifiedLine
     * @param sLineNumber
     * @param sLine
     * @param preview
     * @returns {*}
     */
    function _previewModifiedLine(sModifiedLine, sLineNumber, sLine, preview) {
        if (preview) {
            let sOriginal = '';
            let sLineIndicator = CHANGED_INDICATOR;
            let bHasNewLines = sModifiedLine.split('\n');

            if (previewOriginalLine) {
                if (showSpaces) {
                    sLine = _.replaceTabs(_.replaceSpaces(sLine));
                }
                sOriginal = sLineNumber + _.repeat(' ', 3) + ORIGINAL_INDICATOR_1 + sLine + '\n';
                if (bHasNewLines) {
                    sLineIndicator = ORIGINAL_INDICATOR_2;
                } else {
                    sLineIndicator = ORIGINAL_INDICATOR_3;
                }
            }

            if (showSpaces) {
                sModifiedLine = _.replaceTabs(_.replaceSpaces(sModifiedLine));
            }

            let nPaddingLength = sLineNumber.toString().length;
            sModifiedLine = sOriginal + (previewOriginalLine ? _.repeat(' ', nPaddingLength) : sLineNumber) +
                MODIFIED_INDICATOR + sLineIndicator + _previewNewLines(sModifiedLine, nPaddingLength);

        }
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
            sLine = _.first(aLines);
            for (let i = 1; i < aLines.length; i++) {
                sLine += '\n' + _.repeat(' ', nPaddingLength) +
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
                sLine = _.replaceTabs(_.replaceSpaces(sLine));
            }
            sLine = sLineNumber + _.repeat(' ', 3) + START_INDICATOR + sLine;
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
                sLine = _.replaceTabs(_.replaceSpaces(sLine));
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
                    if (!_.isNil(sModifiedLine) && aOriginalLines[i] !== sModifiedLine) {
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

                if (!_.isNil(aModifiedLines[nIndex + x]) && !bSkipChanged) {
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
        if (_.keys(oLines).length > 0) {
            let fnCurrentHandler = oCurrentConfiguration.fnHandler;
            if (oCurrentConfiguration.nLinesNeeded === 1) {
                let line = oLines[_.first(_.keys(oLines))];
                if (line !== false) {
                    let sResult = fnCurrentHandler(line, (nIndex + 1), oNameSpace, sFilePath);
                    if (!_.isNil(sResult)) {
                        aModifiedLines[nIndex] = sResult;
                    }
                }
            } else {
                fnCurrentHandler(oLines, (nIndex + 1), oNameSpace, sFilePath);
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
            console.log('\n[INFO] Reading - \'' + sFilePath + '\'');
            console.log('\n' + sModifiedFileContent);
        } else {
            console.log('[INFO] Replacing file - \'' + sFilePath + '\'');
            fs.writeFileSync(sFilePath, sModifiedFileContent, 'utf-8');
        }
    }

    if (_.isNil(aHandler) || _.isEmpty(aHandler)) {
        return;
    }

    let sFileContent = fs.readFileSync(sFilePath, 'utf-8');

    let aLines = sFileContent.split('\n');
    let aLinesCopy = aLines.slice(0);
    let bFileChanged = false;

    let aModifiedLines;
    if (aHandler.length > 0) {
        for (let z = 0; z < aHandler.length; z++) {
            aModifiedLines = aLines.slice(0);
            let oCurrentConfiguration = _validateConfiguration(aHandler[z]);
            let oNameSpace = {};

            for (let nLineIndex = 0; nLineIndex < aModifiedLines.length; nLineIndex++) {
                let oLines = _preselectLines(oCurrentConfiguration, aModifiedLines, aLines, nLineIndex);
                aModifiedLines = _pipeToLineHandler(oCurrentConfiguration, aModifiedLines, oLines, nLineIndex, oNameSpace);
            }
            aLines = aModifiedLines;
        }
        bFileChanged = (_applyChanges(aLinesCopy, aModifiedLines).trim() !== sFileContent.trim());
        sModifiedFileContent = '';
        _applyChanges(aLinesCopy, aModifiedLines, preview);
    }

    if (bFileChanged) {
        _writeFile();
    }
}

// /////////////////////////////////////////////////////////////////// //

let aPredefinedHandler = {

    /**
     *
     * @param sLine
     * @returns {*}
     */
    removeComments: function (sLine) {
        if (!_.startsWith(sLine.trim(), '//')) {
            return sLine;
        }
        return false; // delete line
    },

    /**
     *
     */
    removeDuplicateEmptyLines: {
        nLinesNeeded: 2,
        bHideChangedLines: true,

        fnHandler: function (oLines) {
            let aKeys = _.keys(oLines);
            if (aKeys.length > 1) {
                let bFirstLineIsEmpty = oLines[aKeys[0]].trim().length === 0;
                let bSecondLineIsEmpty = oLines[aKeys[1]].trim().length === 0;
                if (bFirstLineIsEmpty && bSecondLineIsEmpty) {
                    oLines[aKeys[0]] = false;
                }
            }
            return oLines;
        }
    },

    /**
     *
     * @param sLine
     * @returns {boolean}
     */
    removeEmptyLines: function (sLine) {
        let bLineIsEmpty = sLine.trim().length === 0;
        if (bLineIsEmpty) {
            return false; // delete sLine
        }
    },

    /**
     *
     * @param sLine
     * @returns {string}
     */
    replaceTabsWithSpaces: function (sLine) {
        return sLine.replace(TAB_REGEX, _.repeat(' ', 4));
    },

    /**
     *
     * @param sLine
     * @returns {string}
     */
    removeTrailingSpaces: function (sLine) {
        return sLine.replace(new RegExp(' ' + '*$'), '');
    },

    /**
     *
     * @param sLine
     * @returns {string}
     */
    replaceUmlaute: function (sLine) {
        return sLine
            .replace('Ü', 'Ue')
            .replace('ü', 'ue')
            .replace('Ö', 'Oe')
            .replace('ö', 'oe')
            .replace('Ä', 'Ae')
            .replace('ä', 'ae')
            .replace('ß', 'ss');
    }
};

// /////////////////////////////////////////////////////////////////// //


export const rstring = {
    handleFile: _handleFile,
    handler: aPredefinedHandler,
    _: _
};

// /////////////////////////////////////////////////////////////////// //
