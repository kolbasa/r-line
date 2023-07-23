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
     * @param {*} propToCheck
     * @returns {boolean}
     */
    isString: function (propToCheck) {
        return typeof propToCheck === 'string';
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
     * @param {number} lineNumber
     * @param {number} lineCount
     * @returns {string}
     */
    padLineNumber: (lineNumber, lineCount) => {
        return _.pad(lineNumber.toString(), lineCount.toString().length, S);
    },

    /**
     * @param {string} content
     * @returns {string}
     */
    showSpaces: (content) => {
        if (!_.isString(content)) {
            return content;
        }
        return _.replaceTabs(_.replaceSpaces(content, SPACE), TAB);
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
        let paddedLineNumber = _.padLineNumber(lineNumber, lineCount);

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
            .filter(_.isString) // removing delete (false) statements
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
     * @param {object=} options
     * @param {boolean=} options.preview
     * @param {object=} options.previewOptions
     * @returns {object}
     */
    validate: (filePath, onLineCallback, options) => {
        if (!_.isValidFile(filePath)) {
            throw new Error(`[ERROR] Not a valid file: '${filePath}'!`);
        }

        if (onLineCallback == null || typeof onLineCallback !== 'function') {
            throw new Error('[ERROR] no callback function given!');
        }

        options = options || {};
        options.previewOptions = options.preview ? (options.previewOptions || {}) : null;
        return options;
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
    options = _.validate(...arguments);

    const fulltextOriginal = _.readFile(filePath);
    const linesOriginal = fulltextOriginal.split(N);
    const linesModified = _.applyUserChanges(linesOriginal.slice(0), onLineCallback);
    const fulltextModified = linesModified.filter(_.isString).join(N);

    const changed = fulltextModified !== fulltextOriginal;

    if (changed && !options.preview) {
        _.writeFile(filePath, fulltextModified);
    }

    if (!changed && options.hideLogOfUnchangedFile) {
        return; // Log is not desired
    }

    if (options.preview) {
        _.logPreview(changed, filePath, _.preview(linesOriginal, linesModified, options.previewOptions));
    } else {
        _.logFileChange(changed, filePath);
    }
}

export const rstring = {changeLine: changeLine};