import fs from 'fs';

const S = ' ';
const N = '\n';
const TAB = ' ▸  ';
const SPACE = '·';
const ENCODING = 'utf-8';

const TAB_REGEX = new RegExp('\\t', 'g');
const SPACES_REGEX = new RegExp(S, 'g');

const START_INDICATOR = '│ ';
const CHANGE_INDICATOR = '┤ ';
const MODIFIED_INDICATOR = ' M ';
const ORIGINAL_INDICATOR_1 = '┌ ';
const ORIGINAL_INDICATOR_2 = '└▷';
const ORIGINAL_INDICATOR_3 = '└▷';
const DELETED_INDICATOR = ' D ';

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
     * @param {string} str
     * @param {number} width
     * @param {string} prefix
     *
     * @returns {string}
     */
    pad: (str, width, prefix) => {
        return str.length >= width ? str : (new Array(width - str.length + 1).join(prefix) + str);
    },

    /**
     * @param {string} content
     * @returns {string}
     */
    showSpaces: (content) => {
        if (!utils.isString(content)) {
            return content;
        }
        return utils.replaceTabs(utils.replaceSpaces(content, SPACE), TAB);
    },

    /**
     * @param {number} lineNumber
     * @param {number} lineCount
     * @returns {string}
     */
    lineNumber: (lineNumber, lineCount) => {
        return _.pad(lineNumber.toString(), lineCount.toString().length, S);
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
     * @param {string} lineNumber
     * @param {string} originalLine
     * @param {string} modifiedLine
     *
     * @returns {{originalLine: string, changeIndicator: string}}
     */
    previewOriginalLine: (lineNumber, originalLine, modifiedLine) => {
        const hasNewLines = modifiedLine.split(N);
        return {
            originalLine: lineNumber + S.repeat(3) + ORIGINAL_INDICATOR_1 + originalLine + N,
            changeIndicator: hasNewLines ? ORIGINAL_INDICATOR_2 : ORIGINAL_INDICATOR_3
        };
    },

    /**
     * @param {string} lineNumber
     * @param {string} line
     *
     * @returns {string}
     */
    previewDeletedLine: (lineNumber, line) => {
        return lineNumber + DELETED_INDICATOR + CHANGE_INDICATOR + line;
    },

    /**
     * @param {string} originalLine
     * @param {string} modifiedLine
     * @param {string} lineNumber
     *
     * @returns {string}
     */
    previewChangedLine: function (lineNumber, originalLine, modifiedLine) {
        let conf = {changeIndicator: CHANGE_INDICATOR};

        conf = originalLine == null ? conf : _.previewOriginalLine(...arguments);

        const paddingLength = lineNumber.toString().length;
        const content = _.previewContent(modifiedLine, paddingLength, conf.changeIndicator);

        lineNumber = originalLine ? S.repeat(paddingLength) : lineNumber;
        return (conf.originalLine || '') + lineNumber + MODIFIED_INDICATOR + conf.changeIndicator + content;
    },

    /**
     * @param {string} lineNumber
     * @param {string} line
     *
     * @returns {string}
     */
    previewUnchangedLine: (lineNumber, line) => {
        return lineNumber + S.repeat(3) + START_INDICATOR + line;
    },

    /**
     * @param {string} line
     * @param {number} lineNumber
     * @param {number} lineCount
     * @param {string} originalLine
     *
     * @param {object} options
     * @param {boolean=} options.showSpaces
     * @param {boolean=} options.hideOriginalLines
     * @param {boolean=} options.showUnchangedLines
     *
     * @returns {String}
     */
    previewLine: (line, originalLine, lineNumber, lineCount, options) => {
        let paddedLineNumber = _.lineNumber(lineNumber, lineCount);

        line = options.showSpaces ? _.showSpaces(line) : line;
        originalLine = options.showSpaces ? _.showSpaces(originalLine) : originalLine;

        if (line === false) {
            return _.previewDeletedLine(paddedLineNumber, originalLine);
        }

        if (originalLine !== line) {
            return _.previewChangedLine(paddedLineNumber, options.hideOriginalLines ? null : originalLine, line);
        }

        if (options.showUnchangedLines) {
            return _.previewUnchangedLine(paddedLineNumber, originalLine);
        }
    },

    /**
     * @param {string[]} originalLines
     * @param {string[]} modifiedLines
     *
     * @param {object} options
     * @param {boolean=} options.showSpaces
     * @param {boolean=} options.hideOriginalLines
     * @param {boolean=} options.showUnchangedLines
     *
     * @returns {String}
     */
    preview: (originalLines, modifiedLines, options) => {
        return modifiedLines
            .map((line, i) => _.previewLine(line, originalLines[i], i + 1, originalLines.length, options))
            .filter(utils.isString) // removing delete (false) statements
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
     *
     * @returns {void}
     */
    logFileChange: function (contentChanged, filePath) {
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

/**
 * @param {string} filePath
 * @param {function} onLineCallback
 * @param {object=} options
 * @param {boolean=} options.hideLogOfUnchangedFile
 * @param {boolean=} options.preview
 * @param {object=} options.previewOptions
 * @param {boolean=} options.previewOptions.showSpaces
 * @param {boolean=} options.previewOptions.hideOriginalLines
 * @param {boolean=} options.previewOptions.showUnchangedLines
 *
 * @returns {void}
 */
function changeLine(filePath, onLineCallback, options) {
    options = options || {};
    options.previewOptions = options.preview ? (options.previewOptions || {}) : null;

    _.validate(filePath, onLineCallback);

    const fulltext = _.readFile(filePath);

    const lines = fulltext.split(N);
    const linesChanged = _.applyUserChanges(lines.slice(0), onLineCallback);

    const fulltextChanged = linesChanged.filter(utils.isString).join(N);
    const hasChanged = fulltextChanged !== fulltext;

    if (hasChanged && !options.preview) {
        _.writeFile(filePath, fulltextChanged);
    }

    if (!hasChanged && options.hideLogOfUnchangedFile) {
        return; // Log is not desired
    }

    if (options.preview) {
        _.logPreview(hasChanged, filePath, _.preview(lines, linesChanged, options.previewOptions));
    } else {
        _.logFileChange(hasChanged, filePath);
    }
}

if (global.describe != null) { // global mocha method
    // releasing the private methods for testing.
    Object.keys(_).forEach((x) => utils[x] = _[x]);
}

export const rstring = {changeLine: changeLine, utils: utils};