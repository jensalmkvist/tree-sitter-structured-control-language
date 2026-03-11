import XCTest
import SwiftTreeSitter
import TreeSitterTreeSitterDb

final class TreeSitterTreeSitterDbTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_tree_sitter_db())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading tree-sitter db grammar")
    }
}
