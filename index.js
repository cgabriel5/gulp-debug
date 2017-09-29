'use strict';
const path = require('path');
const gutil = require('gulp-util');
const through = require('through2');
const tildify = require('tildify');
const stringifyObject = require('stringify-object');
const chalk = require('chalk');
const plur = require('plur');
const pretty_bytes = require('pretty-bytes');

const prop = chalk.magenta;

module.exports = opts => {
	opts = Object.assign({
		prefix: (' '.repeat(10) + '├──'),
		suffix: '',
		minimal: true,
		showFiles: true
	}, opts);

	if (process.argv.indexOf('--verbose') !== -1) {
		opts.verbose = true;
		opts.minimal = false;
		opts.showFiles = true;
	}

	let count = 0;

	return through.obj((file, enc, cb) => {
		if (opts.showFiles) {
			const full =
				'\n' +
				(file.cwd ? 'cwd:   ' + prop(tildify(file.cwd)) : '') +
				(file.base ? '\nbase:  ' + prop(tildify(file.base)) : '') +
				(file.path ? '\npath:  ' + prop(tildify(file.path)) : '') +
				(file.stat && opts.verbose ? '\nstat:  ' + prop(stringifyObject(file.stat, {indent: '       '}).replace(/[{}]/g, '').trim()) : '') +
				'\n';

			const output = opts.minimal ? prop(path.relative(process.cwd(), file.path)) : full;

			gutil.log(opts.prefix + ' ' + output + ' ' + chalk.blue(pretty_bytes((file.contents || "").length)) + ' ' + opts.suffix);
		}

		count++;
		cb(null, file);
	}, cb => {
		gutil.log(opts.prefix + ' ' + chalk.green(count + ' ' + plur('item', count)));
		cb();
	});
};
