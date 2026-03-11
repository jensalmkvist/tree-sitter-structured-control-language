// tree-sitter-db — parser for Siemens SCL data block files (.db)
// Contains DATA_BLOCK declarations only.
//
// Inherits all rules from tree-sitter-structured-control-language and
// overrides only `source_file` to restrict the top-level to data blocks.

module.exports = grammar(
  require("../../grammar"),
  {
    name: "db",

    rules: {
      source_file: $ => repeat(
        $.data_block_declaration,
      ),
    },
  }
);
