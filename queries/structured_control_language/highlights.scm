;; =============================================================================
;; Highlights for tree-sitter-scl
;; FUNCTION_BLOCK, FUNCTION, ORGANIZATION_BLOCK, TYPE files (.scl)
;; =============================================================================

;; -----------------------------------------------------------------------------
;; Block declaration keywords
;; -----------------------------------------------------------------------------

["FUNCTION_BLOCK" "function_block" "Function_block" "Function_Block"
 "END_FUNCTION_BLOCK" "end_function_block" "End_function_block" "End_Function_Block"] @keyword

["FUNCTION" "function" "Function"
 "END_FUNCTION" "end_function" "End_function" "End_Function"] @keyword

["ORGANIZATION_BLOCK" "organization_block" "Organization_block" "Organization_Block"
 "END_ORGANIZATION_BLOCK" "end_organization_block" "End_organization_block" "End_Organization_Block"] @keyword

["TYPE" "type" "Type"
 "END_TYPE" "end_type" "End_type" "End_Type"] @keyword

;; Block names
(function_block_declaration     name: (identifier)    @type.definition)
(function_declaration           name: (identifier)    @function)
(organization_block_declaration name: (identifier)    @type.definition)
(type_declaration               name: (identifier)    @type.definition)
(type_declaration               name: (db_identifier) @type.definition)

;; Block names — quoted variant
(function_block_declaration     name: (db_identifier) @type.definition)
(function_declaration           name: (db_identifier) @function)
(organization_block_declaration name: (db_identifier) @type.definition)

;; VERSION pragma
(version_pragma ["VERSION" "version"] @keyword)
(version_pragma (float_literal) @number)

;; Block-level RETAIN / NON_RETAIN
(block_attr) @keyword.modifier

;; BEGIN
["BEGIN" "begin" "Begin"] @keyword

;; -----------------------------------------------------------------------------
;; Variable block keywords
;; -----------------------------------------------------------------------------

["VAR" "var" "Var"
 "VAR_INPUT" "var_input" "Var_input" "Var_Input"
 "VAR_OUTPUT" "var_output" "Var_output" "Var_Output"
 "VAR_IN_OUT" "var_in_out" "Var_in_out" "Var_In_Out"
 "VAR_TEMP" "var_temp" "Var_temp" "Var_Temp"
 "VAR_STAT" "var_stat" "Var_stat" "Var_Stat"
 "VAR_GLOBAL" "var_global" "Var_global" "Var_Global"
 "END_VAR" "end_var" "End_var" "End_Var"] @keyword

(var_attr) @keyword.modifier

(var_declaration name: (identifier) @variable.declaration)

;; -----------------------------------------------------------------------------
;; Control-flow keywords
;; -----------------------------------------------------------------------------

["IF" "if" "If" "THEN" "then" "Then"
 "ELSIF" "elsif" "Elsif" "ELSE" "else" "Else"
 "END_IF" "end_if" "End_if" "End_If"] @keyword

["FOR" "for" "For" "TO" "to" "To" "BY" "by" "By"
 "DO" "do" "Do" "END_FOR" "end_for" "End_for" "End_For"] @keyword

["WHILE" "while" "While" "END_WHILE" "end_while" "End_while" "End_While"] @keyword

["REPEAT" "repeat" "Repeat" "UNTIL" "until" "Until"
 "END_REPEAT" "end_repeat" "End_repeat" "End_Repeat"] @keyword

["CASE" "case" "Case" "OF" "of" "Of" "END_CASE" "end_case" "End_case" "End_Case"] @keyword

["EXIT" "exit" "Exit"
 "CONTINUE" "continue" "Continue"
 "RETURN" "return" "Return"] @keyword.control.return

;; -----------------------------------------------------------------------------
;; Region
;; -----------------------------------------------------------------------------

["REGION" "region" "Region" "END_REGION" "end_region" "End_region" "End_Region"] @keyword

(region_name) @comment

;; -----------------------------------------------------------------------------
;; Types
;; -----------------------------------------------------------------------------

(elementary_type) @type.builtin

(struct_type ["STRUCT" "struct" "Struct" "END_STRUCT" "end_struct" "End_struct" "End_Struct"] @keyword)

(array_type ["ARRAY" "array" "Array" "OF" "of" "Of"] @keyword)

(string_type) @type.builtin

(type (identifier) @type)

;; -----------------------------------------------------------------------------
;; Variables and member access
;; -----------------------------------------------------------------------------

(lvalue "#" @punctuation.special)
(db_identifier) @namespace
(lvalue (identifier) @variable)

;; -----------------------------------------------------------------------------
;; Function / block invocations
;; -----------------------------------------------------------------------------

(invocation_statement name: (lvalue (identifier)    @function.call))
(invocation_statement name: (lvalue (db_identifier) @function.call))
(call_expression      name: (lvalue (identifier)    @function.call))
(call_expression      name: (lvalue (db_identifier) @function.call))

(argument name: (identifier) @variable.parameter)

;; -----------------------------------------------------------------------------
;; Operators
;; -----------------------------------------------------------------------------

(binary_expression [
  "OR" "or" "Or" "XOR" "xor" "Xor" "AND" "and" "And"
  "=" "<>" "<" ">" "<=" ">="
  "+" "-" "*" "/" "MOD" "mod" "Mod"
  "**"
] @operator)

(unary_expression ["NOT" "not" "Not" "-"] @operator)

":=" @operator
"=>" @operator

;; -----------------------------------------------------------------------------
;; Literals
;; -----------------------------------------------------------------------------

(bool_literal)        @boolean
(typed_literal)       @number
(int_literal)         @number
(based_literal)       @number
(float_literal)       @number
(time_literal)        @number
(s5time_literal)      @number
(date_literal)        @number
(time_of_day_literal) @number
(date_time_literal)   @number
(string_literal)      @string
(wstring_literal)     @string

;; -----------------------------------------------------------------------------
;; Attribute pragmas  { key := 'value' }
;; -----------------------------------------------------------------------------

(attribute_pragma "{" @punctuation.bracket "}" @punctuation.bracket)
(attribute_pragma (identifier)     @attribute)
(attribute_pragma (string_literal) @string)

;; -----------------------------------------------------------------------------
;; Punctuation
;; -----------------------------------------------------------------------------

["(" ")" "[" "]"] @punctuation.bracket
["." ","]         @punctuation.delimiter
";"               @punctuation.delimiter
":"               @punctuation.delimiter

;; -----------------------------------------------------------------------------
;; Comments
;; -----------------------------------------------------------------------------

(comment) @comment
