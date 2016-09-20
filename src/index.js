import path from 'path';
import through from 'through2';
import fs from 'fs';
import debug from 'debug';
import stream from 'stream';
import vm from 'vm';

const log = debug('text-extractify');

/**
 * @param {String} opts.dest - Output filename for the extracted file
 * @param {Array<String>} [opts.exts=[]] - List of extensions of files that should be extracted.
 * @param {Array<file => TransformStream>} [opts.transforms=[]] - List of transforms factories
 *                                 that should be applied to the file contents. This follows the
 *                                 same signature as browserify transforms, but these transforms should
 *                                 return content for the extracted file instead of Javascript. (So
 *                                 normal browserify transforms most likely will not give you the result
 *                                 you want)
 * @param {Boolean} [global=false] Wheter to apply the extract logic globally or locally.
 */
module.exports = function(b, opts = {}) {
	const { exts = [], transforms = [], global = false, dest } = opts;

	/**
	 * Determines if this file should be processed by text-extractify
	 */
	function shouldProcess(file) {
		const ext = path.extname(file).substr(1); //path.extname includes leading dot
		return exts.includes(ext);
	}

	function updatePipeline() {
		log(`Injecting collector into the pipeline`);
		let chunks = [];
		b.pipeline.get('pack').unshift(through.obj(function(chunk, enc, cb) {
			if (shouldProcess(chunk.file)) {
				const sandbox = {
					module : { }
				};
				try {
					vm.runInNewContext(chunk.source, sandbox);
				} catch (e) {
					throw new Error(`Could not extract ${chunk.file}. Please make sure your file is properly transformed into a JS module that exports a string`);
				}
				chunks.push(sandbox.module.exports);
				chunk.source = '';
			}
			this.push(chunk);
			cb();
		}, function(cb) {
			log(`Combining files`);
			const result = chunks
				.filter(chunk => chunk)
				.join('\n');
			log(`Writing to ${dest}`);
			fs.writeFile(dest, result, 'utf8', cb);
		}));
	}
	b.on('reset', updatePipeline);
	updatePipeline();


}
