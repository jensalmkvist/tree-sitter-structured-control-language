from unittest import TestCase

from tree_sitter import Language, Parser
import tree_sitter_structured_control_language


class TestLanguage(TestCase):
    def test_can_load_grammar(self):
        try:
            Parser(Language(tree_sitter_structured_control_language.language()))
        except Exception:
            self.fail("Error loading StructuredControlLanguage grammar")
