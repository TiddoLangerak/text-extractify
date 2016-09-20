Browserify plugin to extract text into standalone files

In order to extract text from a file the file should be transformed into a JS module that doesn't `require` anything and exports the text as `module.exports`. Files transformed with [stringify](https://www.npmjs.com/package/stringify) are suitable to be used with `text-extractify`.

## Usage

```javascript
import extractify from 'text-extractify';

browserify(entry, opts)
	.transform(stringify(['.css']))
	.plugin(extractify, opts)
	.bundle();
```

### Options

- `dest` - Output filename for the extracted file
- `[exts=[]]` - List of extensions of files that should be extracted.

### Complete example
```javascript
import extractify from 'text-extractify';
import stringify from 'stringify';
import lessify from 'node-lessify';

browserify(entry, opts)
	.transform(stringify(['.css']))
	.transform(lessify, { textMode : true })
	.plugin(extractify, {
		exts : ['less', 'css'],
		dest : 'style.css',
	})
	.bundle();
```
