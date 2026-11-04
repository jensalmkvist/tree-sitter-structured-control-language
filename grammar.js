/**
 * @file Siemens Structured Control Language (SCL) grammar for tree-sitter
 * @author Jens Thieme Almkvist <jens.almkvist@gmail.com>
 * @license MIT
 *
 * Targets Siemens TIA Portal SCL (IEC 61131-3 Structured Text dialect).
 * Notable SCL-specific extensions over plain ST:
 *   - Case-insensitive keywords (all keywords matched with kw())
 *   - Local variables:  #VarName
 *   - DB / instance references:  "DBName"
 *   - Block types: FUNCTION_BLOCK, FUNCTION, ORGANIZATION_BLOCK, DATA_BLOCK
 *   - VAR_STAT (static variables in FBs)
 *   - REGION / END_REGION (non-standard, but TIA supports it)
 *   - Attribute pragmas:  { S7_optimized_access := 'TRUE' }
 *   - S5TIME literals: S5T#...
 *   - NAMESPACE / END_NAMESPACE (TIA software unit export)
 *   - NVT (named value type) — TYPE Name : BaseType ( A := 0, B := 1 ); END_TYPE
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// ---------------------------------------------------------------------------
// Helper — matches a keyword case-insensitively.
//
// Returns choice(UPPER, lower) for the two canonical forms, which integrates
// correctly with tree-sitter's `word` keyword-reservation mechanism.
//
// TIA Portal exports use mixed case (e.g. "Array", "Of", "Begin") — these
// are covered by adding the most common mixed-case variants explicitly.
// ---------------------------------------------------------------------------
function kw(word, ...extra) {
  const upper = word.toUpperCase();
  const lower = word.toLowerCase();

  // Simple title-case: first char upper, rest lower  (e.g. "Array", "Begin")
  const title = upper[0] + lower.slice(1);

  // Compound title-case for underscore keywords: each segment capitalised
  // e.g. END_VAR -> "End_Var",  FUNCTION_BLOCK -> "Function_Block"
  const compoundTitle = word.split('_')
    .map(seg => seg.length > 0 ? seg[0].toUpperCase() + seg.slice(1).toLowerCase() : seg)
    .join('_');

  // Deduplicate
  const variants = [...new Set([upper, lower, title, compoundTitle, ...extra])];
  return choice(...variants);
}

module.exports = grammar({
  name: "structured_control_language",

  extras: $ => [
    /\s/,
    $.comment
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    // case_element body has no explicit terminator — the next case selector
    // (identifier or integer) is syntactically identical to the start of a
    // statement inside the body.  GLR resolves this at parse time.
    [$.case_element],
    [$.qualified_dotted_type, $._access_segment],
  ],

  rules: {

    // =========================================================================
    // Top-level: optional NAMESPACE wrapper, then block / type declarations.
    // All executable statements must live inside a block body.
    // =========================================================================

    source_file: $ => repeat1(choice(
      $.namespace_declaration,
      $._source_item,
    )),

    namespace_declaration: $ => seq(
      kw('NAMESPACE'),
      field('namespace_name', $.namespace_name),
      repeat($._source_item),
      kw('END_NAMESPACE')
    ),

    // `Objects`, `Objects.Sub`, or quoted when the name is restricted.
    namespace_name: $ => seq(
      choice($.identifier, $.db_identifier),
      repeat(seq('.', choice($.identifier, $.db_identifier)))
    ),

    _source_item: $ => choice(
      $.function_block_declaration,
      $.function_declaration,
      $.organization_block_declaration,
      $.data_block_declaration,
      $.struct_type_declaration,
      $.nvt_type_declaration,
    ),

    // =========================================================================
    // Block declarations (POUs + Data Blocks)
    // =========================================================================

    // TIA Portal exports wrap the body in BEGIN...END_BLOCK.
    // Hand-written SCL omits BEGIN — both forms are accepted.
    //
    // Header order for all block types:
    //   BLOCK_KEYWORD name
    //   { pragma }*
    //   VERSION : n.n          (optional, TIA export only)
    //   RETAIN | NON_RETAIN    (optional block-level qualifier)
    //   VAR_xxx ... END_VAR    (zero or more)
    //   BEGIN                  (optional)
    //     statements
    //   END_BLOCK_KEYWORD

    function_block_declaration: $ => seq(
      kw('FUNCTION_BLOCK'),
      field('name', $._block_name),
      repeat($._block_header_item),
      repeat($.var_block),
      optional(kw('BEGIN')),
      repeat($._statement),
      kw('END_FUNCTION_BLOCK')
    ),

    function_declaration: $ => seq(
      kw('FUNCTION'),
      field('name', $._block_name),
      ':',
      field('return_type', $.type),
      repeat($._block_header_item),
      repeat($.var_block),
      optional(kw('BEGIN')),
      repeat($._statement),
      kw('END_FUNCTION')
    ),

    organization_block_declaration: $ => seq(
      kw('ORGANIZATION_BLOCK'),
      field('name', $._block_name),
      repeat($._block_header_item),
      repeat($.var_block),
      optional(kw('BEGIN')),
      repeat($._statement),
      kw('END_ORGANIZATION_BLOCK')
    ),

    data_block_declaration: $ => seq(
      kw('DATA_BLOCK'),
      field('name', $._block_name),
      repeat($._block_header_item),
      repeat(choice($.var_block, seq($.struct_type, ';'))),
      // Exported DB type line of an instance DB or a DB of a type:
      // `"FB_name"`, `_.Objects.MyType`, `TON_TIME` (library FB/SDT)
      optional(field('instance_type', $.db_instance_type)),
      optional(kw('BEGIN')),
      repeat($._statement),
      kw('END_DATA_BLOCK')
    ),

    db_instance_type: $ => choice(
      $.identifier,
      $.db_identifier,
      $.qualified_dotted_type
    ),

    // TYPE "UDT_Name"  -or-  TYPE UDT_Name
    //   VERSION : n.n          (optional, TIA export)
    //   STRUCT
    //     field : type [ := init ] ;
    //     ...
    //   END_STRUCT ;
    // END_TYPE
    struct_type_declaration: $ => seq(
      kw('TYPE'),
      field('name', $._block_name),
      repeat($._block_header_item),
      $.struct_type,
      optional(';'),
      kw('END_TYPE')
    ),

    // NVT (named value data type) — Siemens enum-like type, often in .nvt files:
    // TYPE
    //   MODE : USInt
    //   ( MANUAL := 0, AUTO := 1 );
    // END_TYPE
    nvt_type_declaration: $ => seq(
      kw('TYPE'),
      repeat1($.nvt_type),
      kw('END_TYPE')
    ),

    // One named value type:  MsgID : USInt (UNDEF := 0, "Stop x" := 2);
    nvt_type: $ => seq(
      field('name', choice($.identifier, $.db_identifier)),
      ':',
      field('base_type', choice($.elementary_type, $.identifier)),
      '(',
      optional(seq(
        $.nvt_member,
        repeat(seq(',', $.nvt_member)),
        optional(',')
      )),
      ')',
      optional(';')
    ),

    nvt_member: $ => seq(
      field('name', choice($.identifier, $.db_identifier)),
      ':=',
      field('value', $.signed_int_literal)
    ),

    // -32768, +5, 16#7FFF
    signed_int_literal: $ => seq(optional(choice('-', '+')), $.int_literal),

    // Block name: plain identifier or quoted "name with spaces"
    _block_name: $ => choice($.identifier, $.db_identifier),

    // =========================================================================
    // Attribute pragmas  { key := 'value' }
    // =========================================================================

    attribute_pragma: $ => seq(
      '{',
      $.attribute,
      repeat(seq(';', $.attribute)),
      optional(';'),
      '}'
    ),

    attribute: $ => seq(
      field('name', $.identifier),
      ':=',
      field('value', choice($.string_literal, $.identifier, $.int_literal, $.float_literal))
    ),

    // Block header lines, in any order. Portal writes
    //   TITLE = …, { … }, AUTHOR / FAMILY / NAME : …, VERSION : n.n,
    //   UNLINKED / READ_ONLY / NON_RETAIN (DBs), CODE_VERSION1
    _block_header_item: $ => choice(
      $.title_pragma,
      $.attribute_pragma,
      $.header_property,
      $.version_pragma,
      $.block_attr,
    ),

    // VERSION : 0.1  — TIA metadata line present in all exported block headers
    version_pragma: $ => seq(
      kw('VERSION'),
      ':',
      $.float_literal
    ),

    // AUTHOR : SafeSys   NAME : F_GLOBDB   FAMILY : 'a b'
    // Portal quotes the value only when it has a special character or is a
    // keyword; otherwise it is a bare name.
    header_property: $ => seq(
      field('key', choice(kw('AUTHOR'), kw('FAMILY'), kw('NAME'))),
      ':',
      field('value', choice($.identifier, $.string_literal))
    ),

    // TITLE = <rest of line>. Portal prints the stored title text as-is, so it
    // can be quoted ("Main Program Sweep (Cycle)") or plain text.
    title_pragma: $ => seq(
      kw('TITLE'),
      '=',
      field('value', $.title_text)
    ),

    title_text: $ => token(prec(-1, /[^\s][^\r\n]*/)),

    // Block-level qualifiers outside any VAR block
    block_attr: $ => choice(
      kw('RETAIN'),
      kw('NON_RETAIN'),
      kw('UNLINKED'),
      kw('READ_ONLY'),
      kw('CODE_VERSION1')
    ),

    // NOTE: BEGIN is inlined directly into each block declaration as
    // optional(kw('BEGIN')) + repeat($._statement).
    // A named begin_section rule is intentionally absent: tree-sitter does not
    // allow syntactic rules that can match the empty string.

    // =========================================================================
    // Variable declaration blocks
    // =========================================================================

    var_block: $ => seq(
      field('kind', choice(
        kw('VAR_IN_OUT'),
        kw('VAR_INPUT'),
        kw('VAR_OUTPUT'),
        kw('VAR_TEMP'),
        kw('VAR_STAT'),
        kw('VAR_GLOBAL'),
        kw('VAR'),
      )),
      repeat($.var_attr),
      repeat($.var_declaration),
      kw('END_VAR')
    ),

    // Optional block-level qualifiers
    var_attr: $ => choice(
      kw('RETAIN'),
      kw('NON_RETAIN'),
      kw('CONSTANT'),
      kw('PERSISTENT'),
      kw('DB_SPECIFIC')
    ),

    var_declaration: $ => seq(
      field('name', choice($.identifier, $.db_identifier)),
      optional($.attribute_pragma),
      optional(seq(kw('AT'), field('at', choice($.identifier, $.db_identifier)))),
      ':',
      field('type', $.type),
      optional(seq(':=', field('initial_value', $._initial_value))),
      ';'
    ),

    // Start value of a declaration: an expression, a structure value
    // `((), (), TRUE, 3)` or an array value `[3(0), 1]`.
    _initial_value: $ => choice(
      $.expression,
      $.structure_value,
      $.array_value
    ),

    // A single scalar in parentheses, `(5)`, stays a parenthesised expression.
    structure_value: $ => seq(
      '(',
      optional(choice(
        seq($._initial_value, repeat1(seq(',', $._initial_value))),
        $.structure_value,
        $.array_value
      )),
      ')'
    ),

    array_value: $ => seq(
      '[',
      optional(seq($._array_value_item, repeat(seq(',', $._array_value_item)))),
      ']'
    ),

    _array_value_item: $ => choice(
      $._initial_value,
      $.repeated_value
    ),

    // n(v): v repeated n times
    repeated_value: $ => seq(
      field('count', $.int_literal),
      '(',
      optional(field('value', $._initial_value)),
      ')'
    ),

    // =========================================================================
    // Statement list — used inside control structures
    // =========================================================================

    statement_list: $ => repeat1($._statement),

    // =========================================================================
    // Statements
    // =========================================================================

    _statement: $ => choice(
      $.assignment_statement,
      $.invocation_statement,
      $.if_statement,
      $.for_statement,
      $.while_statement,
      $.repeat_statement,
      $.case_statement,
      $.exit_statement,
      $.continue_statement,
      $.return_statement,
      $.null_statement,
      $.region
    ),

    // lvalue := expr ;
    // a := b;   a += 1;   a := b := c;   (chained)   ref ?= variant;
    assignment_statement: $ => seq(
      field('left', $.lvalue),
      field('operator', $._assignment_operator),
      field('right', choice($.expression, $.assignment_expression)),
      ';'
    ),

    // The inner part of a chained assignment `#a := #b := TIME_TCK();`
    assignment_expression: $ => seq(
      field('left', $.lvalue),
      field('operator', $._assignment_operator),
      field('right', choice($.expression, $.assignment_expression))
    ),

    _assignment_operator: $ => choice(':=', '+=', '-=', '*=', '/=', '?='),

    // FB_or_func( args ) ;
    invocation_statement: $ => seq(
      field('name', $.lvalue),
      '(',
      optional($.argument_list),
      ')',
      ';'
    ),

    exit_statement:     $ => seq(kw('EXIT'),     ';'),
    continue_statement: $ => seq(kw('CONTINUE'), ';'),
    return_statement:   $ => seq(kw('RETURN'),   ';'),
    null_statement:     $ => ';',

    // =========================================================================
    // Control flow
    // =========================================================================

    if_statement: $ => seq(
      kw('IF'),
      field('condition', $.expression),
      kw('THEN'),
      optional($.statement_list),
      repeat($.elsif_clause),
      optional($.else_clause),
      kw('END_IF'),
      ';'
    ),

    elsif_clause: $ => seq(
      kw('ELSIF'),
      field('condition', $.expression),
      kw('THEN'),
      optional($.statement_list)
    ),

    // `ELSE :` is accepted too (Portal keeps a colon after ELSE in CASE).
    else_clause: $ => seq(
      kw('ELSE'),
      optional(':'),
      optional($.statement_list)
    ),

    for_statement: $ => seq(
      kw('FOR'),
      field('variable', $.lvalue),
      ':=',
      field('from', $.expression),
      kw('TO'),
      field('to', $.expression),
      optional(seq(kw('BY'), field('by', $.expression))),
      kw('DO'),
      optional($.statement_list),
      kw('END_FOR'),
      ';'
    ),

    while_statement: $ => seq(
      kw('WHILE'),
      field('condition', $.expression),
      kw('DO'),
      optional($.statement_list),
      kw('END_WHILE'),
      ';'
    ),

    repeat_statement: $ => seq(
      kw('REPEAT'),
      optional($.statement_list),
      kw('UNTIL'),
      field('condition', $.expression),
      kw('END_REPEAT'),
      ';'
    ),

    // CASE expr OF  case_element+  [ELSE stmt*]  END_CASE ;
    case_statement: $ => seq(
      kw('CASE'),
      field('operand', $.expression),
      kw('OF'),
      repeat($.case_element),
      optional($.else_clause),
      kw('END_CASE'),
      ';'
    ),

    // One or more selectors followed by a colon and zero or more statements.
    // No closing keyword — GLR decides whether the next identifier starts a
    // new statement or the next case selector.
    case_element: $ => seq(
      field('selector', $.case_selector_list),
      ':',
      repeat($._statement)
    ),

    // Comma-separated list of selectors
    case_selector_list: $ => seq(
      $.case_selector,
      repeat(seq(',', $.case_selector))
    ),

    // Single selector: range  lo..hi  or a single value
    case_selector: $ => choice(
      seq(
        field('low', $._case_value),
        '..',
        field('high', $._case_value)
      ),
      $._case_value
    ),

    _case_value: $ => choice(
      $.int_literal,
      alias($._negative_int, $.signed_int_literal),
      $.typed_literal,
      $.lvalue
    ),

    _negative_int: $ => seq('-', $.int_literal),

    // =========================================================================
    // Regions
    // =========================================================================

    region: $ => seq(
      kw('REGION'),
      optional($.region_name),
      repeat($._statement),
      kw('END_REGION')
    ),

    // token.immediate — only matched immediately after REGION, before any
    // whitespace extra can run.  Captures everything up to end-of-line.
    region_name: $ => token.immediate(/[^\r\n]+/),

    // =========================================================================
    // Types
    // =========================================================================

    type: $ => choice(
      $.struct_type,      // STRUCT ... END_STRUCT
      $.array_type,       // ARRAY[lo..hi] OF type
      $.string_type,      // STRING[n] / WSTRING[n]
      $.ref_to_type,      // REF_TO _.Unit.TypeName
      $.elementary_type,  // BOOL, INT, REAL, TIME, ...
      $.qualified_dotted_type, // _.Process.STATE, Unit.Type
      $.db_identifier,    // quoted UDT/FB type reference: "fjellmanTool"
      $.identifier        // plain UDT/FB type reference: MyUDT, TON, CTU
    ),

    // Namespace / library qualified type: at least one dot (_.Process.STATE)
    qualified_dotted_type: $ => seq(
      choice($.identifier, $.db_identifier),
      repeat1(seq('.', choice($.identifier, $.db_identifier)))
    ),

    // Reference type (REF_TO accepts plain or dotted target)
    ref_to_type: $ => seq(
      kw('REF_TO'),
      choice($.identifier, $.db_identifier),
      repeat(seq('.', choice($.identifier, $.db_identifier)))
    ),

    struct_type: $ => seq(
      kw('STRUCT'),
      repeat($.var_declaration),
      kw('END_STRUCT')
    ),

    // ARRAY[lo..hi] OF type
    // ARRAY[lo..hi, lo2..hi2] OF type  (multi-dimensional)
    array_type: $ => seq(
      kw('ARRAY'),
      '[',
      $.array_dimension,
      repeat(seq(',', $.array_dimension)),
      ']',
      kw('OF'),
      field('base_type', $.type)
    ),

    // Array dimensions must be integer constants in TIA Portal SCL.
    // Using int_literal (not expression) prevents the lexer from consuming
    // the leading digit of "0..999" as the start of a float_literal (0.)
    // before it can see the second dot.
    array_dimension: $ => choice(
      seq(
        field('low', $._array_bound),
        '..',
        field('high', $._array_bound)
      ),
      '*'
    ),

    // 0, -5, or a constant: MAX, "MAX", #MAX
    _array_bound: $ => choice(
      $.int_literal,
      alias($._negative_int, $.signed_int_literal),
      $.identifier,
      $.db_identifier,
      seq('#', $.identifier)
    ),

    // STRING[n]  or  WSTRING[n]
    string_type: $ => seq(
      choice(kw('STRING'), kw('WSTRING', 'WString')),
      '[',
      field('length', choice($.int_literal, $.identifier, $.db_identifier, seq('#', $.identifier))),
      ']'
    ),

    // Extra spellings are the ones Portal prints (TypeClass names,
    // writer-answers.md §1.1), e.g. `USInt`, `LReal`, `Time_Of_Day`.
    elementary_type: $ => choice(
      // Void return type (used in FUNCTION declarations)
      kw('VOID'),
      // Bit / byte types
      kw('BOOL'),  kw('BYTE'),  kw('WORD'),  kw('DWORD', 'DWord'), kw('LWORD', 'LWord'),
      // Signed integers
      kw('SINT', 'SInt'),  kw('INT'),   kw('DINT', 'DInt'),  kw('LINT', 'LInt'),
      // Unsigned integers
      kw('USINT', 'USInt'), kw('UINT', 'UInt'),  kw('UDINT', 'UDInt'), kw('ULINT', 'ULInt'),
      // Reals
      kw('REAL'),  kw('LREAL', 'LReal'),
      // Duration
      kw('TIME'),  kw('LTIME', 'LTime'), kw('S5TIME', 'S5Time'),
      // Date and time
      kw('DATE'),  kw('LDATE', 'LDate'),
      kw('TIME_OF_DAY'),   kw('TOD'),
      kw('LTIME_OF_DAY', 'LTime_Of_Day'),  kw('LTOD'),
      kw('DATE_AND_TIME'), kw('DT'),
      kw('LDT'), kw('DTL'),
      // Characters / strings
      kw('CHAR'),    kw('WCHAR', 'WChar'),
      kw('STRING'),  kw('WSTRING', 'WString'),
      // Generic
      kw('VARIANT')
    ),

    // =========================================================================
    // Identifiers and lvalue (left-hand side / variable access)
    // =========================================================================

    // Plain alphanumeric identifier (no sigil)
    identifier: $ => /[a-zA-ZÀ-ÖØ-öø-ÿ_][a-zA-ZÀ-ÖØ-öø-ÿ0-9_]*/,

    // Quoted DB/instance name: "DBName"  "My FB Instance"
    db_identifier: $ => /"[^"]+"/,

    // Array subscript:  [expr]  or  [expr, expr, ...]
    subscript: $ => seq(
      '[',
      $.expression,
      repeat(seq(',', $.expression)),
      ']'
    ),

    // A single access segment: name with optional subscript
    //   foo        plain
    //   arr[i]     array element
    //   mat[i,j]   multi-dim array element
    _access_segment: $ => seq(
      choice($.identifier, $.db_identifier),
      optional($.subscript)
    ),

    // Access segment that may be dereferenced with `^` (REF_TO / pointer).
    // Examples: `refVar^`, `"DB".ptr^`
    _deref_access_segment: $ => seq(
      $._access_segment,
      optional('^')
    ),

    // Bit/byte/word slice of a variable: `.%X3`, `.%B1`, `.%W0`, `.%D0`
    slice: $ => token(seq('%', /[XxBbWwDd]/, /\d+/)),

    // Direct I/O access suffix: `"Tag":P`
    peripheral_access: $ => token.immediate(/:[Pp]/),

    _access_tail: $ => seq('.', choice($._deref_access_segment, $.slice)),

    // SCL root: either a local (#) variable or a plain/DB access chain.
    //
    //   #localVar               local variable in FB/FC
    //   #localVar.member        local struct field
    //   #localArr[i].member     local array + struct field
    //   "DBName".member         global DB access
    //   "DBName".arr[i].field   global DB, array element, struct field
    //   plainIdent              unqualified (e.g. FC call target, global)
    //   plainIdent.member       dot-chain on plain ident
    lvalue: $ => choice(
      // #local chain
      seq(
        '#',
        $._deref_access_segment,
        repeat($._access_tail)
      ),
      // DB or plain chain (no sigil)
      seq(
        $._deref_access_segment,
        repeat($._access_tail),
        optional($.peripheral_access)
      )
    ),

    // =========================================================================
    // Expressions
    // =========================================================================

    expression: $ => choice(
      $.binary_expression,
      $.unary_expression,
      $._primary_expression
    ),

    _primary_expression: $ => choice(
      $.call_expression,   // func/FB call used as a value
      $._literal,
      $.lvalue,
      seq('(', $.expression, ')')
    ),

    // Function/FB call inside an expression (no trailing semicolon)
    call_expression: $ => seq(
      field('name', $.lvalue),
      '(',
      optional($.argument_list),
      ')'
    ),

    binary_expression: $ => choice(
      // Precedence 1 — lowest: OR, XOR
      prec.left(1, seq($.expression, choice(kw('OR'), kw('XOR')), $.expression)),
      // Precedence 2: AND
      prec.left(2, seq($.expression, kw('AND'), $.expression)),
      // Precedence 3: comparison
      prec.left(3, seq($.expression, choice('=', '<>', '<', '>', '<=', '>='), $.expression)),
      // Precedence 4: addition / subtraction
      prec.left(4, seq($.expression, choice('+', '-'), $.expression)),
      // Precedence 5: multiplication / division / modulo
      prec.left(5, seq($.expression, choice('*', '/', kw('MOD')), $.expression)),
      // Precedence 6: exponentiation (right-associative)
      prec.right(7, seq($.expression, '**', $.expression)),
    ),

    unary_expression: $ => choice(
      prec(8, seq(kw('NOT'), $.expression)),
      prec(8, seq('-', $.expression)),
    ),

    // =========================================================================
    // Literals
    // =========================================================================

    _literal: $ => choice(
      $.typed_literal,
      $.bool_literal,
      $.int_literal,
      $.float_literal,
      $.time_literal,
      $.s5time_literal,
      $.date_literal,
      $.time_of_day_literal,
      $.date_time_literal,
      $.string_literal,
      $.wstring_literal
    ),

    // TYPE#value  e.g. INT#42  REAL#3.14  BOOL#TRUE  BYTE#16#FF  MODE#AUTO (NVT)
    // Wrapped in token() so the lexer commits atomically.
    // Float before int (so 3.14 isn't consumed as 3), based before decimal.
    // Identifier suffix last: NVT enumeration literals (MODE#MANUAL).
    // Named values may carry a namespace prefix: Process.MsgID#UNDEF,
    // _.Process.MsgID#UNDEF (resolution.md §2.6).
    typed_literal: $ => token(seq(
      /([a-zA-ZÀ-ÖØ-öø-ÿ_][a-zA-ZÀ-ÖØ-öø-ÿ0-9_]*\.)*/,
      /[a-zA-ZÀ-ÖØ-öø-ÿ_][a-zA-ZÀ-ÖØ-öø-ÿ0-9_]*/,
      '#',
      choice(
        /[tT][rR][uU][eE]|[fF][aA][lL][sS][eE]/,
        /'(?:[^'$]|\$.)*'/,          // STRING#'abc', CHAR#'a'
        /"(?:[^"$]|\$.)*"/,          // WSTRING#"abc"
        /\d+#[0-9A-Fa-f][0-9A-Fa-f_]*/,
        /[+\-]?\d[\d_]*\.[\d_]+([eE][+\-]?\d[\d_]*)?/,
        /[+\-]?\d[\d_]*/,
        /[a-zA-ZÀ-ÖØ-öø-ÿ_][a-zA-ZÀ-ÖØ-öø-ÿ0-9_]*/
      )
    )),

    bool_literal: $ => choice(kw('TRUE'), kw('FALSE')),

    // Decimal: 42  1_000
    // Based:   16#FF  2#1010  8#77
    int_literal: $ => choice(
      /\d[\d_]*/,
      $.based_literal
    ),

    based_literal: $ => /\d+#[0-9A-Fa-f][0-9A-Fa-f_]*/,

    float_literal: $ => /\d[\d_]*\.[\d_]+([eE][+\-]?\d[\d_]*)?/,

    // T#5s  TIME#1h30m20s500ms  LT#...  LTIME#...
    time_literal: $ => token(seq(
      /[lL][tT][iI][mM][eE]|[lL][tT]|[tT][iI][mM][eE]|[tT]/,
      '#',
      optional('-'),
      // units in any case, as Portal prints them: T#3S, T#500ms, T#1h_30m
      /(\d+(\.\d+)?([dD]|[hH]|[mM][sS]|[mM]|[uU][sS]|[sS]|[nN][sS])_?)+/
    )),

    // S5TIME / S5T — Siemens-specific legacy timer type
    s5time_literal: $ => token(seq(
      /[sS]5[tT][iI][mM][eE]|[sS]5[tT]/,
      '#',
      /(\d+(\.\d+)?([dD]|[hH]|[mM][sS]|[mM]|[sS])_?)+/
    )),

    // D#2024-01-15  DATE#2024-01-15  LD#...  LDATE#...
    date_literal: $ => token(seq(
      /[lL][dD][aA][tT][eE]|[lL][dD]|[dD][aA][tT][eE]|[dD]/,
      '#',
      /\d{4}-\d{2}-\d{2}/
    )),

    // TOD#12:30:00  TIME_OF_DAY#...  LTOD#...
    time_of_day_literal: $ => token(seq(
      /[lL][tT][iI][mM][eE]_[oO][fF]_[dD][aA][yY]|[lL][tT][oO][dD]|[tT][iI][mM][eE]_[oO][fF]_[dD][aA][yY]|[tT][oO][dD]/,
      '#',
      /\d{2}:\d{2}:\d{2}(\.\d+)?/
    )),

    // DT#2024-01-15-12:30:00  DATE_AND_TIME#...  LDT#...  DTL#...
    date_time_literal: $ => token(seq(
      /[lL][dD][aA][tT][eE]_[aA][nN][dD]_[tT][iI][mM][eE]|[lL][dD][tT]|[dD][aA][tT][eE]_[aA][nN][dD]_[tT][iI][mM][eE]|[dD][tT][lL]|[dD][tT]/,
      '#',
      /\d{4}-\d{2}-\d{2}-\d{2}:\d{2}:\d{2}(\.\d+)?/
    )),

    // Single-quoted string: 'hello'  '$'' is an escaped quote
    string_literal: $ => /'(?:[^'$]|\$\$|\$'|\$[nNtTrRlLpP]|\$[0-9A-Fa-f]{2})*'/,

    // Double-quoted wide string: "hello"  "$"" is escaped
    // NOTE: SCL also uses "..." for DB identifiers — the lexer resolves
    // ambiguity by context (db_identifier is matched inside lvalue rules).
    wstring_literal: $ => /"(?:[^"$]|\$\$|\$"|\$[nNtTrRlLpP]|\$[0-9A-Fa-f]{4})*"/,

    // =========================================================================
    // Function/FB arguments
    // =========================================================================

    argument_list: $ => seq(
      $.argument,
      repeat(seq(',', $.argument))
    ),

    // Named input:   ParamName := expr
    // Named output:  ParamName => variable   (read FB output pin)
    // Positional:    expr
    argument: $ => choice(
      seq(
        field('name', $.identifier),
        ':=',
        field('value', $.expression)
      ),
      seq(
        field('name', $.identifier),
        '=>',
        field('out', $.lvalue)
      ),
      field('value', $.expression)
    ),

    // =========================================================================
    // Comments
    // =========================================================================

    comment: $ => token(choice(
      // Single-line
      seq('//', /.*/),
      // IEC block comment
      seq('(*', /[^*]*\*+([^)*][^*]*\*+)*/, ')'),
      // C-style block comment (TIA supports this)
      seq('/*', /[^*]*\*+([^/][^*]*\*+)*/, '/')
    )),

  }
});
