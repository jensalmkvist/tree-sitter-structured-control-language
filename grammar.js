/**
 * @file Siemens SCL
 * @author Jens Thieme Almkvist <jens.almkvist@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

function kw(word) {
  return choice(word, word.toLowerCase());
}

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
      $.region,
      $.return_statement
    ),

    // -------------------------------------------------------------------------
    // Regions
    // -------------------------------------------------------------------------

    region: $ => seq(
      kw('REGION'),
      optional($.region_name),
      repeat($._statement),
      kw('END_REGION')
    ),

    region_name: $ => token.immediate(/[^\r\n]+/),

    // -------------------------------------------------------------------------
    // Variable blocks
    // -------------------------------------------------------------------------

    var_block: $ => seq(
      choice(
        kw('VAR_IN_OUT'),
        kw('VAR_TEMP'),
        kw('VAR_IN'),
        kw('VAR_OUT'),
        kw('VAR')
      ),
      repeat($.var_declaration),
      kw('END_VAR')
    ),

    var_declaration: $ => seq(
      field('name', $.plain_identifier),
      ':',
      field('type', $.type),
      ';'
    ),

    // -------------------------------------------------------------------------
    // Identifiers
    // -------------------------------------------------------------------------

    plain_identifier: $ => /[a-zA-ZÀ-ÖØ-öø-ÿ_][a-zA-ZÀ-ÖØ-öø-ÿ0-9_]*/,

    subscript: $ => seq('[', $.expression, ']'),

    local_variable: $ => seq(
      '#',
      $.plain_identifier,
      optional($.subscript),
      repeat(seq('.', $.plain_identifier, optional($.subscript)))
    ),

    global_variable: $ => seq(
      $.db_identifier,
      repeat(seq('.', choice($.plain_identifier, $.db_identifier), optional($.subscript))),
      optional(seq('.', '#', $.plain_identifier, optional($.subscript)))
    ),

    db_identifier: $ => /"[^"]+"/,

    _variable: $ => choice(
      $.local_variable,
      $.global_variable,
      seq($.plain_identifier, optional($.subscript))
    ),

    return_statement: $ => seq(
      choice('RETURN', 'return'),
      ';'
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

    function_call: $ => seq(
      field('name', $._variable),
      '(',
      optional($.argument_list),
      ')',
      ';'
    ),

    function_call_expression: $ => seq(
      field('name', $._variable),
      '(',
      optional($.argument_list),
      ')'
    ),

    argument_list: $ => seq(
      $.argument,
      repeat(seq(',', $.argument))
    ),

    argument: $ => choice(
      seq(
        field('param', choice($.plain_identifier, $.db_identifier)),
        ':=',
        field('value', $.expression)
      ),
      seq(
        field('param', choice($.plain_identifier, $.db_identifier)),
        '=>',
        field('value', $.expression)
      ),
      $.expression
    ),

    // -------------------------------------------------------------------------
    // Control flow
    // -------------------------------------------------------------------------

    if_statement: $ => seq(
      kw('IF'),
      $.expression,
      kw('THEN'),
      repeat($._statement),
      repeat($.elsif_clause),
      optional(seq(kw('ELSE'), repeat($._statement))),
      kw('END_IF'),
      ';'
    ),

    elsif_clause: $ => seq(
      kw('ELSIF'),
      $.expression,
      kw('THEN'),
      repeat($._statement)
    ),

    for_loop: $ => seq(
      kw('FOR'),
      $.for_assignment,
      kw('TO'),
      $.expression,
      optional(seq(kw('BY'), $.expression)),
      kw('DO'),
      repeat($._statement),
      kw('END_FOR'),
      ';'
    ),

    for_assignment: $ => seq(
      field('left', $._variable),
      ':=',
      field('right', $.expression)
    ),

    while_loop: $ => seq(
      kw('WHILE'),
      $.expression,
      kw('DO'),
      repeat($._statement),
      kw('END_WHILE'),
      ';'
    ),

    case_statement: $ => seq(
      kw('CASE'),
      $._variable,
      kw('OF'),
      repeat($.case_branch),
      optional(seq(kw('ELSE'), repeat($._statement))),
      kw('END_CASE'),
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
      $.time_literal,
      $.function_call_expression,
      $._variable,
      seq('(', $.expression, ')')
    ),

    binary_expression: $ => choice(
      prec.left(1, seq($.expression, choice(kw('OR'), kw('XOR')), $.expression)),
      prec.left(2, seq($.expression, kw('AND'), $.expression)),
      prec.left(3, seq($.expression, '<>', $.expression)),
      prec.left(3, seq($.expression, '<=', $.expression)),
      prec.left(3, seq($.expression, '>=', $.expression)),
      prec.left(3, seq($.expression, choice('=', '<', '>'), $.expression)),
      prec.left(4, seq($.expression, choice('+', '-'), $.expression)),
      prec.left(5, seq($.expression, choice('*', '/', kw('MOD')), $.expression)),
    ),

    unary_expression: $ => choice(
      prec(6, seq(kw('NOT'), $.expression)),
      prec(6, seq('-', $.expression)),
    ),

    // -------------------------------------------------------------------------
    // Literals
    // -------------------------------------------------------------------------

    boolean_literal: $ => choice(kw('TRUE'), kw('FALSE')),

    integer:      $ => /\d+/,
    float:        $ => /\d+\.\d+/,
    string:       $ => /'(?:[^'\\]|\\.)*'/,
    time_literal: $ => /[Tt]#[0-9smhd_]+/,

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
      kw('BOOL'),   kw('BYTE'),
      kw('WORD'),   kw('DWORD'),  kw('LWORD'),
      kw('SINT'),   kw('INT'),    kw('DINT'),   kw('LINT'),
      kw('USINT'),  kw('UINT'),   kw('UDINT'),  kw('ULINT'),
      kw('REAL'),   kw('LREAL'),
      kw('TIME'),   kw('LTIME'),
      kw('DATE'),   kw('LDATE'),
      kw('TIME_OF_DAY'), kw('LTIME_OF_DAY'),
      kw('CHAR'),   kw('WCHAR'),
      kw('STRING'), kw('WSTRING')
    )
  }
});
