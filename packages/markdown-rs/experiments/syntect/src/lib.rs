use serde::Deserialize;
use std::{cell::RefCell, sync::OnceLock};
use syntect::{
    parsing::{ParseState, SyntaxSet},
    util::LinesWithEndings,
};

static SYNTAXES: OnceLock<SyntaxSet> = OnceLock::new();
thread_local! {
    static BLOCKS: RefCell<Vec<Block>> = const { RefCell::new(Vec::new()) };
}

#[derive(Deserialize)]
pub struct Block {
    pub syntax: String,
    pub code: String,
}

pub fn syntaxes() -> &'static SyntaxSet {
    SYNTAXES.get_or_init(SyntaxSet::load_defaults_newlines)
}

#[no_mangle]
pub extern "C" fn init() -> usize {
    syntaxes().syntaxes().len()
}

pub fn load_json(input: &[u8]) -> usize {
    let blocks: Vec<Block> = serde_json::from_slice(input).unwrap();
    for block in &blocks {
        assert!(syntaxes().find_syntax_by_name(&block.syntax).is_some());
    }
    let count = blocks.len();
    BLOCKS.with(|slot| *slot.borrow_mut() = blocks);
    count
}

#[no_mangle]
pub extern "C" fn run(start: usize, count: usize) -> u32 {
    BLOCKS.with(|slot| {
        let blocks = slot.borrow();
        let ss = syntaxes();
        let mut checksum = 0u32;
        for block in &blocks[start..start + count] {
            let syntax = ss.find_syntax_by_name(&block.syntax).unwrap();
            let mut parser = ParseState::new(syntax);
            for line in LinesWithEndings::from(&block.code) {
                for (offset, operation) in parser.parse_line(line, ss).unwrap() {
                    // Consume the parse result without building HTML or serializing a tree.
                    checksum = checksum.wrapping_add(offset as u32 + 1);
                    std::hint::black_box(operation);
                }
            }
        }
        checksum
    })
}

#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    Box::into_raw(vec![0u8; len].into_boxed_slice()) as *mut u8
}

/// # Safety
/// The pointer must refer to an allocation returned by alloc with this length.
#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)));
}

/// # Safety
/// The pointer must refer to len readable bytes of UTF-8 JSON.
#[no_mangle]
pub unsafe extern "C" fn load(ptr: *const u8, len: usize) -> usize {
    load_json(std::slice::from_raw_parts(ptr, len))
}
