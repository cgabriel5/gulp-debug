"use strict";
const path = require("path");
const gutil = require("gulp-util");
const through = require("through2");
const tildify = require("tildify");
const stringifyObject = require("stringify-object");
const chalk = require("chalk");
const plur = require("plur");
const pretty_bytes = require("pretty-bytes");
const ora = require("ora");
const prop = chalk.magenta;

/**
 * Log passed in files' path, file size, and action done to it.
 *
 * @param  {object} options - The options object.
 * @return {object} - The through object.
 */
function logger(options) {
	// spacer for logging
	let log_spacer = " ".repeat(10);

	// plugin options
	let opts = Object.assign(
		{
			suffix: "",
			action: "",
			loader: true,
			minimal: true,
			showFiles: true,
			verbose: false,
			// the modifier is a function that, when provided, will allow
			// for the modification of the output. by default no modifier
			// is used but one can easily be provided. the modifier is passed
			// an object containing all the file path data needed. the
			// function should return the newly modified string that will
			// be used instead.
			modifier: false,
			prefix: log_spacer + "├──"
		},
		options // merge provided options
	);

	// get options
	let prefix = opts.prefix;
	let suffix = opts.suffix;
	let loader = opts.loader;
	let action = opts.action;
	let modifier = opts.modifier;

	// plugin vars
	let spinner;
	let count = 0;
	let queue = []; // contain file log information here

	if (process.argv.indexOf("--verbose") !== -1) {
		opts.verbose = true;
		opts.minimal = false;
	}

	// use a CLI loader by default unless turned off via
	// the options object.
	if (loader) {
		// create the spinner
		spinner = ora({
			spinner: "bouncingBar",
			color: "green"
		});
		spinner.start();
	}

	return through.obj(
		{
			// highWaterMark limit stops after 16 objects (16 files)
			// so set it to Infinity to allow for all the passed in files.
			// [https://github.com/rvagg/through2/issues/32]
			// [https://github.com/gulpjs/gulp/issues/716]
			highWaterMark: Infinity
		},
		(file, enc, cb) => {
			if (opts.showFiles) {
				let full =
					"\n" +
					(file.cwd ? "cwd:   " + prop(tildify(file.cwd)) : "") +
					(file.base ? "\nbase:  " + prop(tildify(file.base)) : "") +
					(file.path ? "\npath:  " + prop(tildify(file.path)) : "") +
					(file.stat && opts.verbose
						? "\nstat:  " +
							prop(
								stringifyObject(file.stat, {
									indent: "       "
								})
									.replace(/[{}]/g, "")
									.trim()
							)
						: "") +
					"\n";

				let file_path_relative = path.relative(
					process.cwd(),
					file.path
				);

				let file_path = opts.minimal ? prop(file_path_relative) : full;
				let file_size = chalk.blue(
					pretty_bytes((file.contents || "").length)
				);

				// prefix? + action + file_path + file_size + suffix?;
				let output = `=> ${file_path} ${file_size} ${action}`;

				// add log information to queue
				queue.push(
					// this object is to be used with the modifier
					// optional function. the modifier function will
					// receive this object to be able to modify the
					// output if needed. the file object itself is
					// also passed to the function.
					{
						output: output,
						paths: {
							absolute: file_path,
							relative: file_path_relative
						},
						size: file_size,
						action: action,
						file: file
					}
				);
			}

			count++;
			cb(null, file);
		},
		cb => {
			if (spinner) {
				// stop the spinner
				spinner.clear();
				spinner.stop(true);
			}

			// get the file count
			let file_count = queue.length.toString().length;

			// print log header
			gutil.log(log_spacer + "┌── log");

			// print queue
			queue.forEach(function(data, index) {
				// get the needed information
				let output = data.output;

				// apply modifier function when provided
				if (modifier) {
					data = modifier(data);
					// make the new output
					output = data.output;
				}

				// increase the index to account for 0 based index
				index = index + 1;

				// to keep files aligned account for index number length
				let number_diff = file_count - index.toString().length;
				let number_spacer = " ".repeat(number_diff);

				// log file information
				gutil.log(
					`${prefix} ${chalk.green(
						index
					)}${number_spacer} ${output} ${suffix}`
				);
			});

			// print file count
			gutil.log(
				log_spacer +
					"└──" +
					" " +
					chalk.green(count + " " + plur("item", count))
			);
			cb();
		}
	);
}

logger.edit = function() {
	return logger({
		action: chalk.yellow("✎")
	});
};
logger.clean = function(replacements) {
	return logger({
		action: chalk.red("🗑")
	});
};

module.exports = logger;
