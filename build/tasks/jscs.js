'use strict';

module.exports = function(grunt) {
  grunt.config('jscs', {
    main: {
      src: ['Gruntfile.js', 'src/**/*.js', 'test/spec/**/*.js'],
      options: {
        config: '.jscsrc',
        validateIndentation: 2,
        disallowDanglingUnderscores: null,
        disallowMultipleVarDecl: null,
        requireMultipleVarDecl: null
      }
    },
    special: {
      src: ['test/karma.conf.js'],
      options: {
        config: '.jscsrc',
        validateIndentation: 2,
        requireCamelCaseOrUpperCaseIdentifiers: null,
        disallowDanglingUnderscores: null,
        disallowMultipleVarDecl: null,
        requireMultipleVarDecl: null
      }
    }
  });

  grunt.loadNpmTasks('grunt-jscs-checker');
};
