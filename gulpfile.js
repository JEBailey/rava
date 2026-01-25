/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var gulp = require ('gulp');
var concat = require ('gulp-concat');
var uglify = require ('gulp-terser');
var { spawn } = require('child_process');

var paths = {
    core : 'index.js',
    tests: 'test/**/*.test.js'
};

function core() {
    return gulp.src (paths.core)
    .pipe (concat ('rava.js'))
    .pipe (gulp.dest ('dist/'));
}

function minify() {
    return gulp.src (paths.core)
    .pipe (uglify ())
    .pipe (concat ('rava.min.js'))
    .pipe (gulp.dest ('dist/'));
}

function test(cb) {
    const mochaProcess = spawn('npx', ['mocha', paths.tests], { stdio: 'inherit' });
    mochaProcess.on('close', (code) => {
        cb(code === 0 ? null : new Error(`Mocha exited with code ${code}`));
    });
}

function testWatch() {
    return gulp.watch([paths.core, paths.tests], test);
}

// Define tasks
gulp.task('core', core);
gulp.task('minify', minify);
gulp.task('test', test);
gulp.task('test:watch', testWatch);

// Default task
gulp.task('default', gulp.parallel(core, minify));
gulp.task('build', gulp.parallel(core, minify, test));
