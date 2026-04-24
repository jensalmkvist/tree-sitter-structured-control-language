; =============================================================================
; Indentation queries for Siemens SCL (tree-sitter-structured-control-language)
; Uses new nvim-treesitter indent API: @indent.begin / @indent.end / @indent.branch
; =============================================================================

; -----------------------------------------------------------------------------
; Block declarations
; -----------------------------------------------------------------------------

(function_block_declaration)     @indent.begin
(function_declaration)           @indent.begin
(organization_block_declaration) @indent.begin
(data_block_declaration)         @indent.begin
(struct_type_declaration)        @indent.begin
(nvt_type_declaration)           @indent.begin
(namespace_declaration)          @indent.begin

["END_FUNCTION_BLOCK" "END_FUNCTION" "END_ORGANIZATION_BLOCK"
 "END_DATA_BLOCK" "END_TYPE"] @indent.end

; -----------------------------------------------------------------------------
; Variable blocks
; -----------------------------------------------------------------------------

(var_block) @indent.begin
"END_VAR"   @indent.end

; -----------------------------------------------------------------------------
; Control flow
; -----------------------------------------------------------------------------

(if_statement)     @indent.begin
(for_statement)    @indent.begin
(while_statement)  @indent.begin
(repeat_statement) @indent.begin
(case_statement)   @indent.begin
(case_element)     @indent.begin
(region)           @indent.begin

["END_IF" "END_FOR" "END_WHILE" "END_REPEAT" "END_CASE" "END_REGION"] @indent.end

; ELSIF / ELSE are branches — dedent from previous block, re-indent for body
(elsif_clause) @indent.branch
(else_clause)  @indent.branch

; UNTIL ends the repeat body
"UNTIL" @indent.branch

; -----------------------------------------------------------------------------
; Struct types
; -----------------------------------------------------------------------------

(struct_type) @indent.begin
"END_STRUCT"  @indent.end

; -----------------------------------------------------------------------------
; Function call argument lists
; -----------------------------------------------------------------------------

(argument_list) @indent.begin
")"             @indent.end
