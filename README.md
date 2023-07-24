### r-line

This node script is designed to allow quick and easy modification of text files.  
For this purpose, the script offers a simple preview mode for the changes before they are applied.

### Installation

```bash
npm install r-line
```

### Sample usage

```node
import rl from 'r-line';

rl.replaceLine('lib/r-line.js', (line) => {
    if (line.includes('function preview(')) {
        return line.replace('preview', 'foo');
    }
}, {preview: true});
```

This leads to the following output:

```
[INFO] Preview: 'lib/r-line.js'

176   ┌ function preview(originalLines, modifiedLines, options) {
    M └▷function foo(originalLines, modifiedLines, options) {
```

If you now remove the `preview: true`, the changes will be applied.