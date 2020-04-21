const { series, parallel, src, dest, watch } = require('gulp');
const browserify = require("browserify");
const browserSync = require('browser-sync');
const cleanCSS = require('gulp-clean-css');
const cleanHTML = require('gulp-htmlclean');
const del = require('del');
const processhtml = require('gulp-processhtml');
const rename = require('gulp-rename');
const reload = browserSync.reload;
const sass = require('gulp-sass');
const source = require("vinyl-source-stream");

const cssVersion = '20200421';
const jsVersion = '20200421';
const paths = {
  css: 'dist/css/',
  html: 'dist/',
  js: 'dist/'
}

sass.compiler = require("node-sass");

function startServer(cb) {
  browserSync({
    server: {
      baseDir: "dist",
    },
  });
  cb();
}

function build(cb) {
  compileSCSS();
  compileJS();
  compileHTML();
  cb();
}

function compileSCSS() {
  return src("src/sass/index.scss")
    .pipe(sass())
    .pipe(cleanCSS())
    .pipe(rename(`index-${cssVersion}.min.css`))
    .pipe(dest(`${paths.css}`))
    .pipe(reload({ stream:true }));
}

function compileJS(cb) {
  // return src("src/js/main.js")
  //   // Need to babel this before minify
  //   .pipe(babel({
  //     exclude: 'node_modules/**/*',
  //     presets: ['@babel/env'],
  //     // sourceType: 'unambiguous'
  //     // modules: 'cjs'
  //     plugins: []
  //   }))
  //   .pipe(rename("index.min.js"))
  //   .pipe(dest(`${paths.js}`))
  //   .pipe(reload({ stream: true }))
  cb();
}

function bundleJS(cb) {
  return (
    browserify("src/js/main.js", {
      debug: true,
    })
    // .transform("babelify", {
    //   presets: ["@babel/preset-env"],
    // })
    .bundle()
    .pipe(source(`index-${jsVersion}.min.js`))
    .pipe(dest(`${paths.js}`))
    .pipe(reload({ stream: true }))
  );
}

function processHTML() {
  return src('src/html/index.uncompiled.html')
    .pipe(processhtml())
    .pipe(cleanHTML())
    .pipe(rename('index.html'))
    .pipe(dest(`${paths.html}`))
    .pipe(reload({ stream: true }))
}

function clean(cb) {
  return del([
    'dist/**/*'
  ]);
}

function watchTasks(cb) {
  watchSCSS();
  watchHTML();
  watchJS();
  cb();
}

function watchSCSS() {
  watch('src/sass/**/*.scss', { events: 'all' }, function(cb) {
    compileSCSS();
    cb();
  });
}

function watchHTML() {
  watch("src/html/**/*.html", { events: "all" }, function (cb) {
    processHTML();
    cb();
  });
}

function watchJS() {
  watch("src/js/**/*.js", { events: "all" }, function (cb) {
    bundleJS();
    cb();
  });
}

// Exports

exports.build = build;
exports.clean = clean;
exports.default = series(
  clean,
  parallel(compileSCSS, bundleJS, processHTML),
  compileJS,
  watchTasks,
  startServer
);
