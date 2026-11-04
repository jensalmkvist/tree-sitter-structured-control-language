; =============================================================================
; Locals for Siemens SCL (tree-sitter-structured-control-language)
;
; A `#x` name is looked up in the interface of its own block only
; (resolution.md §2.2, "local #x"): every block is a scope, the declarations
; of its VAR sections are the definitions, and `#x` operands are references.
; =============================================================================

; -----------------------------------------------------------------------------
; Scopes: one per block
; -----------------------------------------------------------------------------

(function_block_declaration)     @local.scope
(function_declaration)           @local.scope
(organization_block_declaration) @local.scope
(data_block_declaration)         @local.scope
(struct_type_declaration)        @local.scope

; -----------------------------------------------------------------------------
; Definitions: interface lines (direct children of a VAR section; members of
; an inline STRUCT are not `#` names of the block).  Plain @local.definition
; is used (no .var/.parameter suffix) because tree-sitter-highlight only knows
; the plain name; a reference then takes the highlight of its definition, so a
; `#MAX` declared in VAR CONSTANT is shown as @constant where it is used by
; tree-sitter-highlight (Neovim does not use locals for highlighting).
; -----------------------------------------------------------------------------

(var_block
  (var_declaration name: (_) @local.definition))

; -----------------------------------------------------------------------------
; References: `#x` operands and `#MAX` in array bounds / string lengths
; -----------------------------------------------------------------------------

; The parents of an operand are listed instead of a bare (lvalue ...) so that
; the callee of `#inst(...)` is not a reference: a reference takes the
; highlight of its definition, which would hide @function.call.
(expression            (lvalue "#" . [(identifier) (db_identifier)] @local.reference))
(assignment_statement  left: (lvalue "#" . [(identifier) (db_identifier)] @local.reference))
(assignment_expression left: (lvalue "#" . [(identifier) (db_identifier)] @local.reference))
(for_statement     variable: (lvalue "#" . [(identifier) (db_identifier)] @local.reference))
(argument               out: (lvalue "#" . [(identifier) (db_identifier)] @local.reference))
(case_selector             (lvalue "#" . [(identifier) (db_identifier)] @local.reference))
; `#inst.member(...)` / `#t.TON(...)`: the root is a reference, the callee is not
(invocation_statement name: (lvalue "#" . [(identifier) (db_identifier)] @local.reference (identifier)))
(call_expression      name: (lvalue "#" . [(identifier) (db_identifier)] @local.reference (identifier)))
(array_dimension "#" . (identifier) @local.reference)
(string_type "#" . (identifier) @local.reference)
