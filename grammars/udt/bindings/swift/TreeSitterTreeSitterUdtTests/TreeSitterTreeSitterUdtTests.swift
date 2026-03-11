import XCTest
import SwiftTreeSitter
import TreeSitterTreeSitterUdt

final class TreeSitterTreeSitterUdtTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_tree_sitter_udt())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading tree-sitter udt grammar")
    }
}
