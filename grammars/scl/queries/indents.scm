; =============================================================================
; Indentation for tree-sitter-scl
; FUNCTION_BLOCK, FUNCTION, ORGANIZATION_BLOCK, TYPE files (.scl)
; =============================================================================

; -----------------------------------------------------------------------------
; Block declarations
; -----------------------------------------------------------------------------

(function_block_declaration)     @indent
(function_declaration)           @indent
(organization_block_declaration) @indent
(struct_type_declaration)        @indent
(nvt_type_declaration)           @indent

"END_FUNCTION_BLOCK"     @dedent
"END_FUNCTION"           @dedent
"END_ORGANIZATION_BLOCK" @dedent
"END_TYPE"               @dedent

; -----------------------------------------------------------------------------
; Variable blocks
; -----------------------------------------------------------------------------

(var_block) @indent
"END_VAR"   @dedent

; -----------------------------------------------------------------------------
; Control flow
; -----------------------------------------------------------------------------

(if_statement)     @indent
(elsif_clause)     @indent
(else_clause)      @indent
(for_statement)    @indent
(while_statement)  @indent
(repeat_statement) @indent
(case_statement)   @indent
(case_element)     @indent
(region)           @indent

"END_IF"     @dedent
"END_FOR"    @dedent
"END_WHILE"  @dedent
"END_REPEAT" @dedent
"END_CASE"   @dedent
"END_REGION" @dedent

; ELSIF / ELSE dedent from previous block then re-indent for their body
"ELSIF" @dedent
"ELSE"  @dedent

; UNTIL dedent from repeat body
"UNTIL" @dedent

; -----------------------------------------------------------------------------
; Struct / array types
; -----------------------------------------------------------------------------

(struct_type) @indent
"END_STRUCT"  @dedent

; -----------------------------------------------------------------------------
; Function call argument lists
; -----------------------------------------------------------------------------

(argument_list) @indent
")"             @dedent
