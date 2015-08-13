module.exports = function (grunt) {

	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.initConfig({
		less: {
			development: {
				options: {
//					cleancss: true
				},
				files: {
					"pme/style.css": "pme/style.less"
				}
			}
		},

		watch: {
			files: [
				"./pme/*.less"
			],
			tasks: ["less"]
		}

	});

	grunt.registerTask('default', ['less', 'watch']);
};
