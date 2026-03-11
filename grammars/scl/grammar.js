// tree-sitter-scl — parser for Siemens SCL source files (.scl)
// Contains FUNCTION_BLOCK, FUNCTION, and ORGANIZATION_BLOCK declarations.
//
// Also accepts TYPE declarations because TIA Portal's "Generate source from
// block" export option bundles dependent UDTs into the same .scl file.
//
// Inherits all rules from tree-sitter-structured-control-language and
// overrides only `source_file`.

module.exports = grammar(
  require("../../grammar"),
  {
    name: "scl",

    rules: {
      source_file: $ => repeat(choice(
        $.function_block_declaration,
        $.function_declaration,
        $.organization_block_declaration,
        $.type_declaration,
      )),
    },
  }
);
