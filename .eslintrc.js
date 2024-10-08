const path = require("path");

module.exports = {
	ignorePatterns: [".eslintrc.js", "frontend/**/*"],
	env: {
		browser: true,
		es6: true,
		node: true,
	},
	noInlineConfig: true, // disallows students from using /* eslint-disable */ comments
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: path.join(__dirname, "tsconfig.json"),
		sourceType: "module",
	},
	plugins: ["descriptive", "jsdoc"],
	extends: ["plugin:descriptive/all", "prettier"],
	overrides: [
		{
			files: ["**/*.spec.ts"],
			rules: {
				"descriptive/max-lines": "off",
				// describe functions exceed this limit easily
				"descriptive/max-lines-per-function": "off",
				// describe/it have 3 additional callbacks (if they want to have two nested describes)
				"descriptive/max-nested-callbacks": ["error", 3 + 2],
			},
		},
	],
	rules: {
		/* JSDOC lint rules */
		"jsdoc/check-alignment": 2,
		"jsdoc/check-indentation": 2,
		"jsdoc/require-asterisk-prefix": 2,
		"jsdoc/no-bad-blocks": 2,
	},
};
