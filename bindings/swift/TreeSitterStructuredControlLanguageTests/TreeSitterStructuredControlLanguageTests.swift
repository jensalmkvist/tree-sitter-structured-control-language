import XCTest
import SwiftTreeSitter
import TreeSitterStructuredControlLanguage

final class TreeSitterStructuredControlLanguageTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_structured_control_language())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading StructuredControlLanguage grammar")
    }
}
