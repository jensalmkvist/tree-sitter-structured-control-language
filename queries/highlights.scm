;; Keywords
"IF" @keyword
"THEN" @keyword
"ELSIF" @keyword
"ELSE" @keyword
"END_IF" @keyword

"FOR" @keyword
"TO" @keyword
"BY" @keyword
"DO" @keyword
"END_FOR" @keyword

"WHILE" @keyword
"END_WHILE" @keyword

"CASE" @keyword
"OF" @keyword
"END_CASE" @keyword

"REGION" @keyword
"END_REGION" @keyword

"VAR" @keyword
"VAR_IN" @keyword
"VAR_OUT" @keyword
"VAR_IN_OUT" @keyword
"VAR_TEMP" @keyword
"END_VAR" @keyword

;; Region name label
(region_name) @comment

;; Types
(type) @type

;; Local variables: #MyVar.Member
(local_variable "#" @punctuation.special)
(local_variable (plain_identifier) @variable)

;; Global/datablock variables: "DB_Name".Member
(db_identifier) @namespace
(global_variable (plain_identifier) @property)

;; Function call name
(function_call name: (plain_identifier) @function)
(function_call name: (local_variable (plain_identifier) @function))

;; Named argument parameters
(argument param: (plain_identifier) @parameter)

;; Operators
(binary_expression [
  "OR" "XOR" "AND"
  "=" "<>" "<" ">" "<=" ">="
  "+" "-" "*" "/" "MOD"
] @operator)

(unary_expression ["NOT" "-"] @operator)

;; Assignment operator
":=" @operator

;; Boolean literals
(boolean_literal) @boolean

;; Numbers
(integer) @number
(float) @number

;; Strings
(string) @string

;; Comments
(comment) @comment
