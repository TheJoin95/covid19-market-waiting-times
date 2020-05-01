const sass = require('node-sass');

module.exports = function (grunt) {

  // Packages
  grunt.loadNpmTasks("grunt-contrib-htmlmin");
  grunt.loadNpmTasks("grunt-contrib-uglify-es");
  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-postcss");
  grunt.loadNpmTasks("grunt-processhtml");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-sass");
  grunt.loadNpmTasks("grunt-babel");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks('grunt-browser-sync');

  // Config
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    watch: {
      sass: {
        files: "src/sass/**/*.scss",
        tasks: ["sass", "postcss", "cssmin"],
      },
      html: {
        files: "src/html/**/*.html",
        tasks: ["processhtml", "htmlmin"],
      },
      js: {
        files: "src/js/**/*.js",
        tasks: ["babel", "uglify"],
      },
    },
    sass: {
      dist: {
        files: {
          "css/index.css": "src/sass/index.scss",
        },
      },
    },
    postcss: {
      options: {
        processors: [
          require("pixrem")(), // add fallbacks for rem units
          require("autoprefixer")({ browsers: "last 2 versions" }), // add vendor prefixes
        ],
      },
      dist: {
        src: "css/*.css",
      },
    },
    cssmin: {
      minify: {
        options: {
          banner:
            '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */',
        },
        expand: true,
        src: ["css/index.css"],
        dest: "dist/",
        ext: ".min.css",
      },
    },
    babel: {
      options: {
        sourceMap: true,
        presets: [
          [
            '@babel/preset-env',
            {
              "targets": {
                "chrome": "58",
                "ie": "11"
              }
            }
          ]
        ]
      },
      dist: {
        files: {
          'dist/js/main.js': 'src/js/main.js'
        }
      }
    },
    uglify: {
      options: {
        banner:
          '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */',
      },
      build: {
        src: "dist/js/main.js",
        dest: "dist/index.min.js",
      },
    },
    processhtml: {
      dist: {
        options: {
          process: true,
          data: {
            title: "Covid-19 - Waiting Time Map",
            message: "CovidMap",
          },
        },
        files: {
          "dist/index.compiled.html": ["src/html/index.uncompiled.html"],
        },
      },
    },
    htmlmin: {
      dist: {
        options: {
          removeComments: true,
          collapseWhitespace: true,
        },
        files: {
          "dist/index.html": "dist/index.compiled.html",
        },
      },
    },
    browserSync: {
      bsFiles: {
        src: [
          "dist/css/*.css",
          "dist/*.html",
          "dist/*.js"
        ],
      },
      options: {
        server: {
          baseDir: "./dist",
        },
        watchTask: true,
      },
    },
    clean: ["css/**"],
  });

  // Tasks
  grunt.registerTask("default", [
    "sass",
    "postcss",
    "cssmin",
    "babel",
    "uglify",
    "processhtml",
    "htmlmin",
    "browserSync",
    "watch",
    "clean",
  ]);
  grunt.registerTask('build', [
    'sass',
    "postcss",
    'cssmin',
    'babel',
    'uglify',
    'htmlmin',
    'processhtml'
  ]);

};
