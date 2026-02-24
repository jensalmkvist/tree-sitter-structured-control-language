; Indent inside block statements
(if_statement) @indent
(elsif_clause) @indent
(for_loop) @indent
(while_loop) @indent
(case_statement) @indent
(case_branch) @indent
(region) @indent
(var_block) @indent

; Indent inside function call argument lists
(argument_list) @indent

; Dedent at closing keywords
"END_IF" @dedent
"END_FOR" @dedent
"END_WHILE" @dedent
"END_CASE" @dedent
"END_REGION" @dedent
"END_VAR" @dedent

; ELSIF and ELSE dedent from previous block and re-indent
"ELSIF" @dedent
"ELSE" @dedent

; Closing paren of function call dedents back
")" @dedent
