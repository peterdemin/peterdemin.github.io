"""Configuration file for the Sphinx documentation builder."""
# pylint: disable=invalid-name, redefined-builtin

from sphinx.builders.dirhtml import DirectoryHTMLBuilder

project = "Peter Demin"
html_title = "Peter Demin"
copyright = "2022, Peter Demin"
author = "Peter Demin"

# Ensure WebP is considered an image for HTML output
if "image/webp" not in DirectoryHTMLBuilder.supported_image_types:
    DirectoryHTMLBuilder.supported_image_types.append("image/webp")

extensions = [
    "myst_parser",
    "sphinx_design",
    "sphinx.ext.graphviz",
    "sphinx.ext.extlinks",
]

myst_enable_extensions = [
    "attrs_block",
]

templates_path = ["_templates"]
extlinks = {
    "GH": ("https://github.com/%s", "%s"),
}

html_theme = "shibuya"
html_theme_options = {
    "page_layout": "compact",
}
html_static_path = ["_static"]
html_css_files = [
    "custom.css",
]
