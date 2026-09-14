//! hast (HTML AST) 노드. JSON 으로 직렬화해 JS 쪽에서 React 엘리먼트로 바꾼다.
//! 필드 이름과 형태는 `mdast-util-to-hast` 가 만드는 트리와 같게 맞춘다.

use serde::Serialize;
use serde_json::{Map, Value};

pub type Properties = Map<String, Value>;

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type")]
pub enum Node {
    #[serde(rename = "root")]
    Root { children: Vec<Node> },
    #[serde(rename = "element")]
    Element(Element),
    #[serde(rename = "text")]
    Text { value: String },
    #[serde(rename = "mdxJsxFlowElement")]
    MdxJsxFlowElement(MdxJsxElement),
    #[serde(rename = "mdxJsxTextElement")]
    MdxJsxTextElement(MdxJsxElement),
    #[serde(rename = "mdxFlowExpression")]
    MdxFlowExpression { value: String },
    #[serde(rename = "mdxTextExpression")]
    MdxTextExpression { value: String },
    #[serde(rename = "mdxjsEsm")]
    MdxjsEsm { value: String },
}

#[derive(Clone, Debug, Serialize, Default)]
pub struct Element {
    #[serde(rename = "tagName")]
    pub tag_name: String,
    pub properties: Properties,
    pub children: Vec<Node>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

#[derive(Clone, Debug, Serialize)]
pub struct MdxJsxElement {
    pub name: Option<String>,
    pub attributes: Vec<MdxAttribute>,
    pub children: Vec<Node>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type")]
pub enum MdxAttribute {
    #[serde(rename = "mdxJsxAttribute")]
    Attribute {
        name: String,
        value: Option<MdxAttributeValue>,
    },
    #[serde(rename = "mdxJsxExpressionAttribute")]
    Expression { value: String },
}

#[derive(Clone, Debug, Serialize)]
#[serde(untagged)]
pub enum MdxAttributeValue {
    Literal(String),
    Expression(MdxAttributeValueExpression),
}

/// `height={680}` 같은 표현식 값. `data.literal` 에 Rust 쪽에서 평가한 리터럴을 담는다.
#[derive(Clone, Debug, Serialize)]
pub struct MdxAttributeValueExpression {
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub value: String,
    pub data: Value,
}

impl Node {
    pub fn text(value: impl Into<String>) -> Node {
        Node::Text {
            value: value.into(),
        }
    }

    pub fn element(tag_name: &str, properties: Properties, children: Vec<Node>) -> Node {
        Node::Element(Element {
            tag_name: tag_name.to_string(),
            properties,
            children,
            data: None,
        })
    }

    pub fn children(&self) -> Option<&Vec<Node>> {
        match self {
            Node::Root { children } | Node::Element(Element { children, .. }) => Some(children),
            Node::MdxJsxFlowElement(el) | Node::MdxJsxTextElement(el) => Some(&el.children),
            _ => None,
        }
    }

    pub fn children_mut(&mut self) -> Option<&mut Vec<Node>> {
        match self {
            Node::Root { children } | Node::Element(Element { children, .. }) => Some(children),
            Node::MdxJsxFlowElement(el) | Node::MdxJsxTextElement(el) => Some(&mut el.children),
            _ => None,
        }
    }

    /// `hast-util-to-string`: 후손 text 노드 값을 이어 붙인다.
    pub fn text_content(&self) -> String {
        let mut out = String::new();
        collect_text(self, &mut out);
        out
    }
}

fn collect_text(node: &Node, out: &mut String) {
    match node {
        Node::Text { value } => out.push_str(value),
        _ => {
            if let Some(children) = node.children() {
                for child in children {
                    collect_text(child, out);
                }
            }
        }
    }
}

pub fn props(entries: Vec<(&str, Value)>) -> Properties {
    let mut map = Properties::new();
    for (key, value) in entries {
        map.insert(key.to_string(), value);
    }
    map
}

pub fn class_list(classes: &[&str]) -> Value {
    Value::Array(classes.iter().map(|c| Value::String((*c).to_string())).collect())
}

impl Element {
    pub fn class_names(&self) -> Vec<String> {
        match self.properties.get("className") {
            Some(Value::Array(items)) => items
                .iter()
                .filter_map(|v| v.as_str().map(str::to_string))
                .collect(),
            Some(Value::String(s)) => vec![s.clone()],
            _ => Vec::new(),
        }
    }

    pub fn set_class_names(&mut self, classes: Vec<String>) {
        self.properties.insert(
            "className".to_string(),
            Value::Array(classes.into_iter().map(Value::String).collect()),
        );
    }

    pub fn push_class(&mut self, class: &str) {
        let mut classes = self.class_names();
        classes.push(class.to_string());
        self.set_class_names(classes);
    }
}

/// 전위 순회로 모든 element 를 방문한다 (`unist-util-visit` 의 element 방문 순서).
pub fn visit_elements_mut(node: &mut Node, f: &mut dyn FnMut(&mut Element)) {
    if let Node::Element(el) = node {
        f(el);
    }
    if let Some(children) = node.children_mut() {
        for child in children {
            visit_elements_mut(child, f);
        }
    }
}
