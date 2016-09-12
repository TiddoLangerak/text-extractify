import path from 'path';
import through from 'through2';
import fs from 'fs';
import debug from 'debug';
import stream from 'stream';

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

	const cache = new Map();

	/**
	 * Determines if this file should be processed by text-extractify
	 */
	function shouldProcess(file) {
		const ext = path.extname(file).substr(1); //path.extname includes leading dot
		return exts.includes(ext);
	}

	b.transform(file => {
		if (!shouldProcess(file)) {
			return through.obj();
		}
		log(`Extracting ${file}`);

		log(`${transforms.length} transformers`);


		//We need to apply the transforms
		const transformStream = transforms
			.map(t => t(file))
			.reduce((stream, transform) => stream.pipe(transform), through.obj());

		//NOTE: we can't chain this with the expression above: the result of this
		//expression is a writeStream, to which we can't push.
		transformStream.pipe(new stream.Writable({
				write(chunk, enc, cb) {
					log(`Transformations applied to ${file}`);
					cache.set(file, chunk);
					cb();
				}
			}));


		//We do want to keep the files in the bundle, such that requires work, but
		//we need to strip the content from it. We therefore replace it with the
		//empty string.
		return through.obj(function (chunk, enc, cb) {
			log(`Stripping ${file}`);
			this.push("");
			log(`Creating readable stream for ${file}`);
			const readable = new stream.Readable({
				read() {
					log(`Applying transformations to ${file}`);
					this.push(chunk);
					this.push(null);
				}
			});
			const out = readable.pipe(transformStream);

			out.on('end', cb);
			out.on('error', cb);
		}, (cb) =>{
			log(`Transformation for ${file} done`);
			cb();
		});

	}, { global });


	function updatePipeline() {
		const files = [];
		log(`Injecting collector into the pipeline`);
		b.pipeline.get('pack').unshift(through.obj(function(chunk, enc, cb) {
			if (shouldProcess(chunk.file)) {
				files.push(chunk.file);
			}
			this.push(chunk);
			cb();
		}, function(cb) {
			log(`Combining files`);
			const result = files
				//FIXME: we have this filter for non-globally applied text extractions.
				//Better would be to actually check if this is a local file
				.filter(file => cache.has(file))
				.map(file => cache.get(file))
				.join('\n');
			log(`Writing to ${dest}`);
			fs.writeFile(dest, result, 'utf8', cb);
		}));
	}
	b.on('reset', updatePipeline);
	updatePipeline();


}
