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

function logger(options) {
	var log_spacer = " ".repeat(10);

	// plugin options
	let opts = Object.assign(
		{
			suffix: "",
			action: "",
			loader: true,
			minimal: true,
			showFiles: true,
			verbose: false,
			prefix: log_spacer + "├──"
		},
		options // merge provided options
	);

	// get options
	let prefix = opts.prefix;
	let suffix = opts.suffix;
	let loader = opts.loader;
	let action = opts.action;

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
				const full =
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

				const file_path = opts.minimal
					? prop(path.relative(process.cwd(), file.path))
					: full;
				var file_size = chalk.blue(
					pretty_bytes((file.contents || "").length)
				);
				// prefix? + action + file_path + file_size + suffix?;
				var output = `=> ${file_path} ${file_size} ${action}`;
				// add log information to queue
				queue.push(output);
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

			var file_count = queue.length.toString().length;

			// print log header
			gutil.log(log_spacer + "┌── log");

			// print queue
			queue.forEach(function(output, index) {
				// increase the index to account for 0 based index
				index = index + 1;
				// to keep files aligned account for index number length
				var number_diff = file_count - index.toString().length;
				var number_spacer = " ".repeat(number_diff);
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
