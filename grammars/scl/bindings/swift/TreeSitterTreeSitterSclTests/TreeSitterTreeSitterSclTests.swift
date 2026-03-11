import XCTest
import SwiftTreeSitter
import TreeSitterTreeSitterScl

final class TreeSitterTreeSitterSclTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_tree_sitter_scl())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading tree-siiter scl grammar")
    }
}
