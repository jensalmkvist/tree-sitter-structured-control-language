package tree_sitter_tree_sitter_udt_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_tree_sitter_udt "github.com/tree-sitter/tree-sitter-tree_sitter_udt/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_tree_sitter_udt.Language())
	if language == nil {
		t.Errorf("Error loading tree-sitter udt grammar")
	}
}
