use crate::hast::{props, Node};
use math_core::{LatexToMathML, MathCoreConfig, MathDisplay, PrettyPrint};
use serde_json::json;
use std::sync::OnceLock;

static CONVERTER: OnceLock<LatexToMathML> = OnceLock::new();

pub fn apply(node: &mut Node) -> Result<(), String> {
    if let Node::Element(element) = node {
        let formula = if element.tag_name == "pre" {
            element.children.iter().find_map(|child| match child {
                Node::Element(code)
                    if code.tag_name == "code"
                        && code.class_names().iter().any(|c| c == "language-math") =>
                {
                    Some((child.text_content(), true))
                }
                _ => None,
            })
        } else if element.tag_name == "code"
            && element.class_names().iter().any(|c| c == "language-math")
        {
            Some((node.text_content(), false))
        } else {
            None
        };
        if let Some((source, display)) = formula {
            *node = render(&source, display)?;
            return Ok(());
        }
    }
    if let Some(children) = node.children_mut() {
        for child in children {
            apply(child)?;
        }
    }
    Ok(())
}

fn render(source: &str, display: bool) -> Result<Node, String> {
    let converter = CONVERTER.get_or_init(|| {
        LatexToMathML::new(MathCoreConfig {
            annotation: true,
            pretty_print: PrettyPrint::Never,
            macros: vec![("space".into(), "\\ ".into())],
            ..MathCoreConfig::default()
        })
        .unwrap()
    });
    let mathml = converter
        .convert_with_local_counter(
            source,
            if display {
                MathDisplay::Block
            } else {
                MathDisplay::Inline
            },
        )
        .map_err(|e| format!("invalid math {source:?}: {e}"))?;
    let document = roxmltree::Document::parse(&mathml).map_err(|e| e.to_string())?;
    Ok(from_xml(document.root_element()))
}

fn from_xml(node: roxmltree::Node<'_, '_>) -> Node {
    if node.is_text() {
        return Node::text(node.text().unwrap_or_default());
    }
    let mut properties = props(vec![]);
    for attribute in node.attributes() {
        if attribute.name() == "class" {
            properties.insert(
                "className".into(),
                json!(attribute.value().split_whitespace().collect::<Vec<_>>()),
            );
        } else {
            properties.insert(attribute.name().into(), json!(attribute.value()));
        }
    }
    Node::element(
        node.tag_name().name(),
        properties,
        node.children()
            .filter(|n| n.is_element() || n.is_text())
            .map(from_xml)
            .collect(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_tex_annotation_and_math_structure() {
        let source = r"\frac{1}{2} + \sqrt{x}";
        let node = render(source, true).unwrap();
        let value = serde_json::to_value(&node).unwrap();
        assert_eq!(value["tagName"], "math");
        assert_eq!(value["properties"]["display"], "block");
        let semantics = value["children"]
            .as_array()
            .unwrap()
            .iter()
            .find(|n| n["tagName"] == "semantics")
            .unwrap();
        let annotation = semantics["children"]
            .as_array()
            .unwrap()
            .iter()
            .find(|n| n["tagName"] == "annotation")
            .unwrap();
        assert_eq!(annotation["tagName"], "annotation");
        assert_eq!(annotation["children"][0]["value"], source);
        assert!(value.to_string().contains("mfrac"));
        assert!(value.to_string().contains("msqrt"));
    }

    #[test]
    fn supports_existing_set_and_logic_notation() {
        for source in [
            r"A \not\subset B",
            r"a \space b \lt c",
            r"p \land q \lor \lnot r",
            "x = 1\ny = 2",
        ] {
            render(source, false).unwrap();
        }
    }

    #[test]
    fn rejects_unknown_commands() {
        assert!(render(r"\notarealcommand{x}", false).is_err());
    }
}
