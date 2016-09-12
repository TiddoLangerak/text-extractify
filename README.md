Browserify plugin to extract text into standalone files

## Usage

```javascript
import extractify from 'text-extractify';

browserify(entry, opts)
	.plugin(extractify, opts)
	.bundle();
```

### Options

- `dest` - Output filename for the extracted file
- `[exts=[]]` - List of extensions of files that should be extracted.
- `[opts.transforms=[]]` - List of transforms factories
                           that should be applied to the file contents. This follows the
                           same signature as browserify transforms, but these transforms should
                           return content for the extracted file instead of Javascript. (So
                           normal browserify transforms most likely will not give you the result
                           you want)
- `[global=false]` Whether to apply the extract logic globally or locally.

### Complete example
```javascript
import extractify from 'text-extractify';

browserify(entry, opts)
	.plugin(extractify, {
		exts : ['less', 'css'],
		global : true,
		dest : 'style.css',
		transforms : [
			file => through.obj(function(chunk, enc, cb) {
				less.render(chunk.toString(), lessOptions, (err, result) => {
					if (err) {
						cb(err);
					} else {
						cb(result.css);
					}
				});
			})
		]
	})
	.bundle();
```
