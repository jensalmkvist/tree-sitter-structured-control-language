// swift-tools-version:5.3

import Foundation
import PackageDescription

var sources = ["src/parser.c"]
if FileManager.default.fileExists(atPath: "src/scanner.c") {
    sources.append("src/scanner.c")
}

let package = Package(
    name: "TreeSitterTreeSitterScl",
    products: [
        .library(name: "TreeSitterTreeSitterScl", targets: ["TreeSitterTreeSitterScl"]),
    ],
    dependencies: [
        .package(name: "SwiftTreeSitter", url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.9.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterTreeSitterScl",
            dependencies: [],
            path: ".",
            sources: sources,
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterTreeSitterSclTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterTreeSitterScl",
            ],
            path: "bindings/swift/TreeSitterTreeSitterSclTests"
        )
    ],
    cLanguageStandard: .c11
)
