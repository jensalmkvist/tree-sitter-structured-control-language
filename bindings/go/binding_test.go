package tree_sitter_structured_control_language_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_structured_control_language "github.com/tree-sitter/tree-sitter-structured_control_language/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_structured_control_language.Language())
	if language == nil {
		t.Errorf("Error loading StructuredControlLanguage grammar")
	}
}
