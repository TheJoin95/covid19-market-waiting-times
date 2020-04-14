const sass = require('node-sass');

module.exports = function (grunt) {

  // Packages
  grunt.loadNpmTasks("grunt-contrib-htmlmin");
  grunt.loadNpmTasks("grunt-contrib-uglify-es");
  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-processhtml");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-sass");

  // Config
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    sass: {
      dist: {
        files: {
          "css/index.css": "src/sass/index.scss",
        },
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
    uglify: {
      options: {
        banner:
          '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */',
      },
      build: {
        src: "src/js/main.js",
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
    clean: ["css/**"],
  });

  // Tasks
  grunt.registerTask('default', ['sass', 'cssmin','uglify', 'processhtml', 'htmlmin','clean']);
  grunt.registerTask('build', ['sass', 'cssmin','uglify', 'htmlmin', 'processhtml']);
  
};
