# SCL Grammar Test Files

Test files for `tree-sitter-structured-control-language`.
Run against the grammar with:

```sh
tree-sitter parse test_fb_motor_control.scl
tree-sitter parse test_fb_pid.scl
tree-sitter parse test_fc_utilities.scl
tree-sitter parse test_ob_blocks.scl
tree-sitter parse test_db_blocks.scl
tree-sitter parse test_literals_and_expressions.scl
tree-sitter parse test_type_system.scl
tree-sitter parse test_edge_cases.scl
```

To generate corpus entries for `test/corpus/`:

```sh
for f in test_*.scl; do
    tree-sitter parse --cst "$f"
done
```

---

## File coverage

| File | What it tests |
|---|---|
| `test_fb_motor_control.scl` | FB with all VAR block kinds, CASE state machine, nested IF, FOR, timer FB calls, `=>` output args, REGION, `VAR_STAT` |
| `test_fb_pid.scl` | FB with complex boolean expressions, anti-windup pattern, REPEAT..UNTIL, FOR with EXIT |
| `test_fc_utilities.scl` | Multiple FCs in one file — return types, RETURN statement, based literals, CASE with ranges and multi-value selectors |
| `test_ob_blocks.scl` | OB1 (cyclic), OB100 (startup), OB30 (cyclic interrupt), OB121 (error OB) — DB access patterns, FOR init loops |
| `test_db_blocks.scl` | Global DBs with initial values, `VAR RETAIN`, ARRAY of UDT, STRING[n], nested types |
| `test_literals_and_expressions.scl` | Every literal form exhaustively — BOOL, INT, DINT, REAL, LREAL, WORD, based (hex/binary/octal), TIME, LTIME, DATE, TOD, DT, STRING, typed literals (INT#42 etc.), all operators and precedence |
| `test_type_system.scl` | Every elementary type, ARRAY[n..m] OF, multi-dim ARRAY, inline STRUCT, nested STRUCT, STRUCT with ARRAY member, ARRAY of UDT, STRING[n], WSTRING[n], UDT references |
| `test_edge_cases.scl` | All three comment styles, empty block bodies, deeply nested control flow, CASE selector forms, chained calls, `=>` output args, CONTINUE, RETURN, EXIT, operator precedence edge cases, attribute pragma inside block, minimal valid blocks |

---

## What is NOT in the grammar (by design)

### Tag tables
PLC tag tables (the I/O and memory tag configuration) are **pure XML** in TIA Portal
export files — they are not SCL and are not parsed by this grammar. The SCL files
reference tag table entries as `"TagTable".tagName` (global DB access syntax), which
the grammar handles correctly as `db_identifier` + member access chains.

A separate parser/tool will be needed for the TIA XML tag table format.

### UDT declarations (TYPE...END_TYPE)
In TIA Portal, User Defined Types are defined in separate UDT objects, not inline in
SCL source files. The grammar handles **references** to UDTs (e.g. `myVar : UDT_Recipe`)
via the `identifier` alternative in the `type` rule. The UDT definition objects
themselves export as XML and are not SCL.

If you want to support standalone `.udt` files or shared type libraries in the future,
adding `type_declaration_block` (as in the ST grammar) would be the path.

### FB/FC interface declarations (from TIA XML)
TIA exports FB/FC interfaces separately from the code body in some export formats.
The grammar currently requires the full `VAR_INPUT ... END_VAR` blocks to be present
inline in the source file, which matches TIA's SCL source export format.

### Network/rung comments (LAD/FBD)
Not applicable — SCL only.

### Symbolic address notation (%I0.0, %MW100)
Absolute addressing (`AT %MW0`) is not yet in the grammar.

---

## Known ambiguities to watch

1. **`"..."`** — double-quoted strings are used for both `db_identifier` (`"DBName"`) and
   `wstring_literal` (`"hello world"`). The grammar resolves this by context: `db_identifier`
   only appears inside `lvalue` (variable access chains), never as a standalone expression.
   Monitor for any false parses where a WSTRING expression is misread as a DB reference.

2. **`case_element` GLR conflict** — the grammar declares this conflict explicitly.
   The next identifier after a case body is ambiguous between a new statement and a new
   case selector. Tree-sitter's GLR resolves this correctly but may produce multiple
   parse paths during development — check `tree-sitter parse --debug` output if you
   see unexpected errors in CASE blocks.

3. **`typed_literal` vs `identifier`** — `INT#42` is a `typed_literal` (committed atomically
   by the lexer). Plain `INT` as a type keyword and `INT` as part of a typed literal are
   disambiguated by the `#` lookahead baked into the `token()` call.
