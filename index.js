'use strict';
const path = require('path');
const gutil = require('gulp-util');
const through = require('through2');
const tildify = require('tildify');
const stringifyObject = require('stringify-object');
const chalk = require('chalk');
const plur = require('plur');
const pretty_bytes = require('pretty-bytes');
const ora = require('ora');

const prop = chalk.magenta;

module.exports = function(opts, action) {
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
    // contain file log information here
    let queue = [];
    let prefix = opts.prefix;
    let suffix = opts.suffix;

    // create the spinner
    let spinner = ora({
        spinner: 'bouncingBar',
        color: 'green'
    });
    spinner.start();

    // determine the action
    action = (!action) ? chalk.yellow('✎') : chalk.red('🗑');

    return through.obj({
        // highWaterMark limit stops after 16 objects (16 files)
        // so set it to Infinity to allow for all the passed in files.
        // [https://github.com/rvagg/through2/issues/32]
        // [https://github.com/gulpjs/gulp/issues/716]
        highWaterMark: Infinity
    }, (file, enc, cb) => {
        if (opts.showFiles) {
            const full =
                '\n' +
                (file.cwd ? 'cwd:   ' + prop(tildify(file.cwd)) : '') +
                (file.base ? '\nbase:  ' + prop(tildify(file.base)) : '') +
                (file.path ? '\npath:  ' + prop(tildify(file.path)) : '') +
                (file.stat && opts.verbose ? '\nstat:  ' + prop(stringifyObject(file.stat, {
                        indent: '       '
                    })
                    .replace(/[{}]/g, '')
                    .trim()) : '') +
                '\n';

            const file_path = opts.minimal ? prop(path.relative(process.cwd(), file.path)) : full;
            var file_size = chalk.blue(pretty_bytes((file.contents || '')
                .length));
            // prefix? + action + file_path + file_size + suffix?;
            var output = `${action} ${file_path} ${file_size}`;
            // add log information to queue
            queue.push(output);
        }

        count++;
        cb(null, file);
    }, cb => {
        // stop the spinner
        spinner.clear();
        spinner.stop(true);

        var file_count = queue.length.toString()
            .length;

        queue.forEach(function(output, index) {
            // increase the index to account for 0 based index
            index = index + 1;
            // to keep files aligned account for index number length
            var number_diff = file_count - index.toString()
                .length;
            var number_spacer = ' '.repeat(number_diff);
            // log file information
            gutil.log(`${prefix} ${chalk.green(index)}${number_spacer} ${output} ${suffix}`);
        });

        // log file count
        gutil.log(opts.prefix + ' ' + chalk.green(count + ' ' + plur('item', count)));
        cb();
    });
};
