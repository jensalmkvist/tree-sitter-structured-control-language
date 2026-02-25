/**
 * @file Siemens SCL
 * @author Jens Thieme Almkvist <jens.almkvist@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "structured_control_language",

  extras: $ => [
    /\s/,
    $.comment
  ],

  conflicts: $ => [
    [$.case_branch],
  ],


  rules: {
    source_file: $ => repeat($._statement),

    _statement: $ => choice(
      $.assignment,
      $.function_call,
      $.if_statement,
      $.for_loop,
      $.while_loop,
      $.case_statement,
      $.var_block,
      $.region
    ),

    // -------------------------------------------------------------------------
    // Regions
    // -------------------------------------------------------------------------

    region: $ => seq(
      'REGION',
      optional($.region_name),
      repeat($._statement),
      'END_REGION'
    ),

    region_name: $ => /[^\r\n]+/,

    // -------------------------------------------------------------------------
    // Variable blocks
    // -------------------------------------------------------------------------

    var_block: $ => seq(
      choice('VAR', 'VAR_IN', 'VAR_OUT', 'VAR_IN_OUT', 'VAR_TEMP'),
      repeat($.var_declaration),
      'END_VAR'
    ),

    var_declaration: $ => seq(
      field('name', $.plain_identifier),
      ':',
      field('type', $.type),
      ';'
    ),

    // -------------------------------------------------------------------------
    // Identifiers
    //
    // SCL has three kinds of variable reference:
    //   plain_identifier  ->  foo           (keywords, function names, types)
    //   local_variable    ->  #foo          (local/temp variables, # prefix)
    //   global_variable   ->  "DB_name"     (global datablock, quoted)
    //
    // Any of these can be followed by member access chains:
    //   #foo.Bar.Baz
    //   "DB_name".Member.SubMember
    // -------------------------------------------------------------------------

    plain_identifier: $ => /[a-zA-ZÀ-ÖØ-öø-ÿ_][a-zA-ZÀ-ÖØ-öø-ÿ0-9_]*/,

    // #LocalVar  or  #LocalVar.Member.Sub
    local_variable: $ => seq(
      '#',
      $.plain_identifier,
      repeat(seq('.', $.plain_identifier))
    ),

    // "DB_Name"  or  "DB_Name".Member.Sub  or  "DB_Name"."Quoted Member"
    global_variable: $ => seq(
      $.db_identifier,
      repeat(seq('.', choice($.plain_identifier, $.db_identifier)))
    ),

    // The quoted part of a global variable: "DB_AlarmSummary"
    db_identifier: $ => /"[^"]+"/,

    // Any variable that can appear in expressions or on the left of :=
    _variable: $ => choice(
      $.local_variable,
      $.global_variable,
      $.plain_identifier
    ),

    // -------------------------------------------------------------------------
    // Statements
    // -------------------------------------------------------------------------

    assignment: $ => seq(
      field('left', $._variable),
      ':=',
      field('right', $.expression),
      ';'
    ),

    // Function call with optional named or positional arguments
    // e.g. MyFB(Param1 := #val, Param2 := "DB".x);
    function_call: $ => seq(
      field('name', $._variable),
      '(',
      optional($.argument_list),
      ')',
      ';'
    ),

    argument_list: $ => seq(
      $.argument,
      repeat(seq(',', $.argument))
    ),

    // Named param:  ParamName := expression
    // Positional:   expression
    argument: $ => choice(
      seq(
        field('param', $.plain_identifier),
        ':=',
        field('value', $.expression)
      ),
      $.expression
    ),

    // -------------------------------------------------------------------------
    // Control flow
    // -------------------------------------------------------------------------

    if_statement: $ => seq(
      'IF',
      $.expression,
      'THEN',
      repeat($._statement),
      repeat($.elsif_clause),
      optional(seq('ELSE', repeat($._statement))),
      'END_IF',
      ';'
    ),

    elsif_clause: $ => seq(
      'ELSIF',
      $.expression,
      'THEN',
      repeat($._statement)
    ),

    for_loop: $ => seq(
      'FOR',
      $.assignment,
      'TO',
      $.expression,
      optional(seq('BY', $.expression)),
      'DO',
      repeat($._statement),
      'END_FOR',
      ';'
    ),

    while_loop: $ => seq(
      'WHILE',
      $.expression,
      'DO',
      repeat($._statement),
      'END_WHILE',
      ';'
    ),

    case_statement: $ => seq(
      'CASE',
      $._variable,
      'OF',
      repeat($.case_branch),
      optional(seq('ELSE', repeat($._statement))),
      'END_CASE',
      ';'
    ),

    case_branch: $ => seq(
      $.case_value,
      ':',
      repeat($._statement)
    ),

    case_value: $ => choice(
      $.integer,
      $._variable
    ),

    // -------------------------------------------------------------------------
    // Expressions
    // -------------------------------------------------------------------------

    expression: $ => choice(
      $.binary_expression,
      $.unary_expression,
      $.boolean_literal,
      $.integer,
      $.float,
      $.string,
      $._variable,
      seq('(', $.expression, ')')
    ),

    binary_expression: $ => choice(
      // Boolean / bitwise (lowest precedence)
      prec.left(1, seq($.expression, choice('OR', 'XOR'), $.expression)),
      prec.left(2, seq($.expression, 'AND', $.expression)),
      // Comparison
      prec.left(3, seq($.expression, choice('=', '<>', '<', '>', '<=', '>='), $.expression)),
      // Arithmetic
      prec.left(4, seq($.expression, choice('+', '-'), $.expression)),
      prec.left(5, seq($.expression, choice('*', '/', 'MOD'), $.expression)),
    ),

    unary_expression: $ => choice(
      prec(6, seq('NOT', $.expression)),
      prec(6, seq('-', $.expression)),
    ),

    // -------------------------------------------------------------------------
    // Literals
    // -------------------------------------------------------------------------

    boolean_literal: $ => choice('TRUE', 'FALSE'),
    integer: $ => /\d+/,
    float: $ => /\d+\.\d+/,
    string: $ => /'(?:[^'\\]|\\.)*'/,

    // -------------------------------------------------------------------------
    // Comments
    // -------------------------------------------------------------------------

    comment: $ => token(choice(
      seq('//', /.*/),
      seq('(*', /[^*]*\*+([^)*][^*]*\*+)*/, ')')
    )),

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    type: $ => choice(
      'BOOL', 'BYTE', 'WORD', 'DWORD', 'LWORD',
      'SINT', 'INT', 'DINT', 'LINT',
      'USINT', 'UINT', 'UDINT', 'ULINT',
      'REAL', 'LREAL',
      'TIME', 'LTIME',
      'DATE', 'LDATE',
      'TIME_OF_DAY', 'LTIME_OF_DAY',
      'CHAR', 'WCHAR',
      'STRING', 'WSTRING'
    )
  }
});
