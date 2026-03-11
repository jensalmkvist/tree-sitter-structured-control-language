// tree-sitter-udt — parser for Siemens SCL user-defined type files (.udt)
// Contains TYPE declarations only.
//
// Inherits all rules from tree-sitter-structured-control-language and
// overrides only `source_file` to restrict the top-level to type declarations.

module.exports = grammar(
  require("../../grammar"),
  {
    name: "udt",

    rules: {
      source_file: $ => repeat(
        $.type_declaration,
      ),
    },
  }
);
