## r-line

This node script is designed to allow quick and easy modification of text files.  
For this purpose, the script offers a simple preview mode for the changes before they are applied.  

It has no dependencies and can be integrated directly into your project even without npm.

### Installation

```bash
npm install r-line
```

Alternatively, simply use the script from `lib/r-line.js` as standalone.

### Sample usage

```node
import rl from 'r-line';

rl.replaceLine('lib/r-line.js', (line) => {

    if (line.includes('function preview(')) {
        return line.replace('preview', 'foo'); // return string to change a line
    }

    if (line.includes('const stringUtils')) {
        return false; // return "false" to delete a line
    }

}, {dryRun: true});
```

This leads to the following output:

```
[INFO] Preview: 'lib/r-line.js'

176   ┌  function preview(originalLines, changedLines, options) {
    C └▷ function foo(originalLines, changedLines, options) {
337 D ┤  const stringUtils = {

```

If you remove `dryRun: true`, the changes will be applied.

### Preview options

You can customise the preview with the following optional parameters:

```node
rl.replaceLine('your/file.js', (line) => {
    //
}, {
    previewOptions: {
        // Visualises whitespaces and tabs.
        showSpaces: true / false, // default := false

        // Previews the complete file content, not just the changed lines.
        showUnchangedLines: true / false, // default := false

        // Hides the original content of the changed lines.
        hideOriginalLines: true / false, // default := false

        // By default unnecessary indentation is removed.
        // However, the behavior can be turned off.
        keepOriginalIndentation: true / false // default := false
    }
});
```

### Line context

The callback function provides a `context` object as the second parameter.  
This contains the line number and previous or following lines.

```node
rl.replaceLine('your/file.js', (line, context) => {
    context.lineNumber;     // number

    context.next.line;      // String
    context.next.lines;     // string[]

    context.previous.line;  // String
    context.previous.lines; // string[]
});
```

### Listing files

If you are editing several files at once, then there is a helper function for this called `listFiles`.

```node
rl.listFiles('lib', (file) => rl.replaceLine(file, (line) => {
    //
}));
```