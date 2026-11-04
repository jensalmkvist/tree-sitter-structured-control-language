;; =============================================================================
;; Highlights for tree-sitter-structured-control-language (Siemens SCL)
;;
;; Categories follow Portal's SCL name kinds (tia-import-export,
;; docs/rea/languages/scl/resolution.md):
;;
;;   #x                 local interface name         @variable  ("#" @punctuation.special)
;;   "x"                global name (DB, tag, ...)   @variable.global
;;   #x.y / "DB".y      member step                  @variable.member
;;   EN / ENO           built-in block variables     @variable.builtin
;;   _  /  _.Ns.        global namespace / namespace @module.builtin / @module
;;   Type#Value         named value (NVT)            @constant
;;   VAR CONSTANT x     local constant               @constant
;;   Int, IEC_TIMER     elementary / system type     @type.builtin
;;   "UDT", MyType      user type                    @type
;;   TON(), MOVE_BLK()  instruction / built-in       @function.builtin
;;   INT_TO_REAL()      conversion                   @function.builtin
;;   "FC"(), #inst()    user call                    @function.call
;;   INT#1, 16#FF       typed / based number         @number / @number.float
;;   T#5s, D#..., TOD#  time and date literals       @string.special
;;   { S7_x := 'y' }    attribute list               @attribute
;;   REGION title       region                       @keyword.directive / @markup.heading
;;   TITLE/VERSION/...  block header                 @keyword.directive
;;
;; Ordering: when several patterns capture the same node, the LAST one wins
;; (tree-sitter-highlight >= 0.23, Neovim, Helix).  General fallbacks come
;; first in each section, the more specific patterns after them.
;; =============================================================================

;; -----------------------------------------------------------------------------
;; Punctuation and operators
;; -----------------------------------------------------------------------------

["(" ")" "[" "]"] @punctuation.bracket
["." "," ";" ":"] @punctuation.delimiter

["=" "<>" "<" ">" "<=" ">=" "+" "-" "*" "/" "**"
 ":=" "+=" "-=" "*=" "/=" "?=" "=>" ".." "^"] @operator

["AND" "and" "And" "OR" "or" "Or" "XOR" "xor" "Xor"
 "NOT" "not" "Not" "MOD" "mod" "Mod"] @keyword.operator

;; Local sigil (also in `#MAX` bounds and lengths)
"#" @punctuation.special

;; -----------------------------------------------------------------------------
;; Keywords
;; -----------------------------------------------------------------------------

["FUNCTION_BLOCK" "function_block" "Function_block" "Function_Block"
 "END_FUNCTION_BLOCK" "end_function_block" "End_function_block" "End_Function_Block"
 "FUNCTION" "function" "Function"
 "END_FUNCTION" "end_function" "End_function" "End_Function"
 "ORGANIZATION_BLOCK" "organization_block" "Organization_block" "Organization_Block"
 "END_ORGANIZATION_BLOCK" "end_organization_block" "End_organization_block" "End_Organization_Block"
 "DATA_BLOCK" "data_block" "Data_block" "Data_Block"
 "END_DATA_BLOCK" "end_data_block" "End_data_block" "End_Data_Block"
 "TYPE" "type" "Type"
 "END_TYPE" "end_type" "End_type" "End_Type"
 "NAMESPACE" "namespace" "Namespace"
 "END_NAMESPACE" "end_namespace" "End_namespace" "End_Namespace"
 "BEGIN" "begin" "Begin"
 "VAR" "var" "Var"
 "VAR_INPUT" "var_input" "Var_input" "Var_Input"
 "VAR_OUTPUT" "var_output" "Var_output" "Var_Output"
 "VAR_IN_OUT" "var_in_out" "Var_in_out" "Var_In_Out"
 "VAR_TEMP" "var_temp" "Var_temp" "Var_Temp"
 "VAR_STAT" "var_stat" "Var_stat" "Var_Stat"
 "VAR_GLOBAL" "var_global" "Var_global" "Var_Global"
 "END_VAR" "end_var" "End_var" "End_Var"
 "AT" "at" "At"] @keyword

["IF" "if" "If" "THEN" "then" "Then"
 "ELSIF" "elsif" "Elsif" "ELSE" "else" "Else"
 "END_IF" "end_if" "End_if" "End_If"
 "CASE" "case" "Case" "OF" "of" "Of" "END_CASE" "end_case" "End_case" "End_Case"] @keyword.conditional

["FOR" "for" "For" "TO" "to" "To" "BY" "by" "By"
 "DO" "do" "Do" "END_FOR" "end_for" "End_for" "End_For"
 "WHILE" "while" "While" "END_WHILE" "end_while" "End_while" "End_While"
 "REPEAT" "repeat" "Repeat" "UNTIL" "until" "Until"
 "END_REPEAT" "end_repeat" "End_repeat" "End_Repeat"
 "EXIT" "exit" "Exit" "CONTINUE" "continue" "Continue"] @keyword.repeat

["RETURN" "return" "Return"] @keyword.return

(var_attr)   @keyword.modifier
(block_attr) @keyword.modifier

;; -----------------------------------------------------------------------------
;; Literals
;; -----------------------------------------------------------------------------

(int_literal)         @number
(signed_int_literal)  @number
(signed_int_literal ["-" "+"] @number)
(float_literal)       @number.float
(bool_literal)        @boolean
(time_literal)        @string.special
(s5time_literal)      @string.special
(date_literal)        @string.special
(time_of_day_literal) @string.special
(date_time_literal)   @string.special
(string_literal)      @string
(wstring_literal)     @string

;; Typed literals are one token: the prefix (INT#, LREAL#, MsgID#) is part of it.
(typed_literal) @number
((typed_literal) @number.float
 (#match? @number.float "#[+-]?[0-9][0-9_]*\\."))
;; Named value of a named value type: MsgID#UNDEF, _.Process.MsgID#UNDEF
((typed_literal) @constant
 (#match? @constant "^[^#]+#[A-Za-z_][^#'\"]*$"))
((typed_literal) @string
 (#match? @string "#['\"]"))
((typed_literal) @boolean
 (#match? @boolean "#([Tt][Rr][Uu][Ee]|[Ff][Aa][Ll][Ss][Ee])$"))

;; -----------------------------------------------------------------------------
;; Operands (lvalue chains)
;; -----------------------------------------------------------------------------

;; Every step is a member ...
(lvalue (identifier)    @variable.member)
(lvalue (db_identifier) @variable.member)
(slice) @variable.member

;; ... except the root: "x" global (DB, tag, ...), #x local / x unquoted
(lvalue . (identifier)    @variable)
(lvalue . (db_identifier) @variable.global)

;; Built-in variables of a block
((lvalue . (identifier) @variable.builtin)
 (#any-of? @variable.builtin "EN" "ENO"))

;; `_` — the global namespace identifier
((lvalue . (identifier) @module.builtin)
 (#eq? @module.builtin "_"))

;; Direct I/O access `"Tag":P`
(peripheral_access) @punctuation.special

;; -----------------------------------------------------------------------------
;; Calls: the callee is the last step of the call's lvalue
;; -----------------------------------------------------------------------------

;; User blocks: "FC"(), Fc(), #inst(), "InstDB"(), _.Ns.Fc()
(invocation_statement name: (lvalue (_) @function.call .))
(call_expression      name: (lvalue (_) @function.call .))

;; Instructions of the PLC library, also after an IEC timer member:
;; "DB".t.TON(...), #t.TON(...)
([(invocation_statement name: (lvalue (identifier) @function.builtin .))
  (call_expression      name: (lvalue (identifier) @function.builtin .))]
 (#any-of? @function.builtin
  "TON" "TOF" "TP" "TONR" "CTU" "CTD" "CTUD" "R_TRIG" "F_TRIG"
  "TIME_TCK" "RUNTIME" "RD_SYS_T" "RD_LOC_T" "WR_SYS_T" "WR_LOC_T" "SET_TIMEZONE"
  "T_ADD" "T_SUB" "T_DIFF" "T_COMBINE" "T_CONV"
  "MOVE_BLK" "UMOVE_BLK" "MOVE_BLK_VARIANT" "FILL_BLK" "UFILL_BLK" "SWAP"
  "SCATTER" "SCATTER_BLK" "GATHER" "GATHER_BLK"
  "SEL" "MUX" "DEMUX" "MIN" "MAX" "LIMIT"
  "ABS" "SQR" "SQRT" "LN" "LOG" "EXP" "EXPT" "SIN" "COS" "TAN" "ASIN" "ACOS" "ATAN"
  "FRAC" "TRUNC" "ROUND" "CEIL" "FLOOR" "NORM_X" "SCALE_X" "SCALE" "UNSCALE"
  "SHL" "SHR" "ROL" "ROR" "DECO" "ENCO" "BITSUM" "INV"
  "CONVERT" "S_CONV" "STRG_VAL" "VAL_STRG" "Chars_TO_Strg" "Strg_TO_Chars" "ATH" "HTA"
  "LEN" "CONCAT" "LEFT" "RIGHT" "MID" "DELETE" "INSERT" "REPLACE" "FIND" "MAX_LEN"
  "PEEK" "PEEK_BOOL" "POKE" "POKE_BOOL" "POKE_BLK"
  "READ_BIG" "READ_LITTLE" "WRITE_BIG" "WRITE_LITTLE"
  "GET_ERR_ID" "GET_ERROR" "GetSymbolName" "GetSymbolPath" "GetInstanceName" "GetInstancePath"
  "GetBlockName" "Serialize" "Deserialize" "TypeOf" "TypeOfElements" "TypeOfDB"
  "IS_ARRAY" "LOWER_BOUND" "UPPER_BOUND" "CountOfElements" "REF" "IS_NULL"
  "VariantGet" "VariantPut" "RE_TRIGR" "STP" "RDREC" "WRREC" "RALRM" "DPRD_DAT" "DPWR_DAT"
  "Gen_UsrMsg" "Program_Alarm" "LED" "GET_DIAG" "DeviceStates" "ModuleStates"))

;; Conversion functions X_TO_Y (INT_TO_REAL, DINT_TO_TIME, ...)
([(invocation_statement name: (lvalue (identifier) @function.builtin .))
  (call_expression      name: (lvalue (identifier) @function.builtin .))]
 (#match? @function.builtin "^[A-Za-z0-9]+_[Tt][Oo]_[A-Za-z0-9]+$"))

;; Calls through the global namespace: _.Ns.Sub.Fc() — namespaces, then the callee
;; (one match per call, so the steps between are captured with a quantifier)
([(invocation_statement
   name: (lvalue . (identifier) @module.builtin ("." (identifier) @module)* "." (identifier) @function.call .))
  (call_expression
   name: (lvalue . (identifier) @module.builtin ("." (identifier) @module)* "." (identifier) @function.call .))]
 (#eq? @module.builtin "_"))

;; Formal parameters
(argument name: (identifier) @variable.parameter)

;; -----------------------------------------------------------------------------
;; Types
;; -----------------------------------------------------------------------------

;; User types: MyUdt, "UDT name"
(type (identifier)    @type)
(type (db_identifier) @type)

(elementary_type) @type.builtin
(string_type ["STRING" "string" "String" "WSTRING" "wstring" "Wstring" "WString"] @type.builtin)
(array_type ["ARRAY" "array" "Array" "OF" "of" "Of"] @type.builtin)
(struct_type ["STRUCT" "struct" "Struct" "END_STRUCT" "end_struct" "End_struct" "End_Struct"] @keyword.type)
(ref_to_type ["REF_TO" "ref_to" "Ref_to" "Ref_To"] @keyword.type)

;; System types written as plain names: IEC_TIMER, TON_TIME, ANY, POINTER,
;; DB_ANY, HW_* and OB_* hardware types, ...
((type (identifier) @type.builtin)
 (#match? @type.builtin "^(IEC_[A-Za-z_]+|(TON|TOF|TP|TONR)(_L?TIME)?|(CTU|CTD|CTUD)(_[A-Za-z]+)?|[RF]_TRIG|ANY|POINTER|BLOCK_(DB|FB|FC)|DB_(ANY|WWW|DYN)|HW_[A-Za-z_]+|OB_[A-Za-z_]+|CONN_[A-Za-z_]+|Conn_[A-Za-z_]+|EVENT_[A-Za-z_]+|TCON_[A-Za-z_]+|TADDR_[A-Za-z_]+|ErrorStruct|CREF|NREF|AOM_IDENT)$"))

;; Namespace-qualified types: _.Process.STATE / REF_TO _.Unit.Type —
;; namespaces, then the type
(qualified_dotted_type (_) @module)
(qualified_dotted_type (_) @type .)
((qualified_dotted_type . (identifier) @module.builtin)
 (#eq? @module.builtin "_"))
(ref_to_type (_) @module)
(ref_to_type (_) @type .)
((ref_to_type . (identifier) @module.builtin)
 (#eq? @module.builtin "_"))

;; Constants in array bounds and string lengths: Array[0..MAX], String[#LEN]
(array_dimension (identifier)    @constant)
(array_dimension (db_identifier) @constant)
(string_type length: (identifier)    @constant)
(string_type length: (db_identifier) @constant)

;; -----------------------------------------------------------------------------
;; Declarations
;; -----------------------------------------------------------------------------

(var_declaration name: (_) @variable)
(var_declaration at: (_) @variable)

;; Local constants: names declared in VAR CONSTANT
;; (one match per section: a quantifier, since the matches share @_block)
((var_block
  (var_declaration name: (_) @constant)+) @_block
 (#match? @_block "^[Vv][Aa][Rr]\\s+[Cc][Oo][Nn][Ss][Tt][Aa][Nn][Tt]"))

;; Block names
(function_block_declaration     name: (_) @type.definition)
(function_declaration           name: (_) @function)
(organization_block_declaration name: (_) @type.definition)
(data_block_declaration         name: (_) @variable.global)
(struct_type_declaration        name: (_) @type.definition)

;; Instance DB / DB of a type: `"FB_name"`, `TON_TIME`, `_.Ns.MyType`
(db_instance_type (identifier)    @type)
(db_instance_type (db_identifier) @type)
((db_instance_type (identifier) @type.builtin)
 (#match? @type.builtin "^(IEC_[A-Za-z_]+|(TON|TOF|TP|TONR)(_L?TIME)?|(CTU|CTD|CTUD)(_[A-Za-z]+)?|[RF]_TRIG)$"))

;; Namespaces
(namespace_name (_) @module)

;; Named value types: TYPE MsgID : USInt (UNDEF := 0, "Stop x" := 2); END_TYPE
(nvt_type name: (_) @type.definition)
(nvt_type base_type: (identifier) @type.builtin)
(nvt_member name: (_) @constant)

;; -----------------------------------------------------------------------------
;; Block header: TITLE / VERSION / AUTHOR / FAMILY / NAME
;; -----------------------------------------------------------------------------

(title_pragma ["TITLE" "title" "Title"] @keyword.directive)
(title_pragma "=" @punctuation.delimiter)
(title_text) @string.documentation

(version_pragma ["VERSION" "version" "Version"] @keyword.directive)

(header_property key: _ @keyword.directive)
(header_property value: _ @string.special)

;; -----------------------------------------------------------------------------
;; Attribute lists  { S7_Optimized_Access := 'TRUE' }  /  x { S7_SetPoint := 'False' } : Bool;
;; -----------------------------------------------------------------------------

(attribute_pragma ["{" "}"] @punctuation.special)
(attribute name: (identifier) @attribute)
(attribute value: (identifier) @string)

;; -----------------------------------------------------------------------------
;; Regions
;; -----------------------------------------------------------------------------

["REGION" "region" "Region" "END_REGION" "end_region" "End_region" "End_Region"] @keyword.directive

(region_name) @markup.heading

;; -----------------------------------------------------------------------------
;; Comments
;; -----------------------------------------------------------------------------

(comment) @comment
