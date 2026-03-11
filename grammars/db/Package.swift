// swift-tools-version:5.3

import Foundation
import PackageDescription

var sources = ["src/parser.c"]
if FileManager.default.fileExists(atPath: "src/scanner.c") {
    sources.append("src/scanner.c")
}

let package = Package(
    name: "TreeSitterTreeSitterDb",
    products: [
        .library(name: "TreeSitterTreeSitterDb", targets: ["TreeSitterTreeSitterDb"]),
    ],
    dependencies: [
        .package(name: "SwiftTreeSitter", url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.9.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterTreeSitterDb",
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
            name: "TreeSitterTreeSitterDbTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterTreeSitterDb",
            ],
            path: "bindings/swift/TreeSitterTreeSitterDbTests"
        )
    ],
    cLanguageStandard: .c11
)
