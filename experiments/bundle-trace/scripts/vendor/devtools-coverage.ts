// Copyright 2020 The Chromium Authors
// BSD license: see LICENSE.chromium in this directory.
// Extracted from CoverageModel.ts at 63555438dd48b3cdecaa6293b01c446d86176d42.
// Only method declarations changed to exported functions; bodies are unchanged.
  export function convertToDisjointSegments(ranges: RangeUseCount[], stamp: number): CoverageSegment[] {
    ranges.sort((a, b) => a.startOffset - b.startOffset);
    const result: CoverageSegment[] = [];
    const stack = [];
    for (const entry of ranges) {
      let top: RangeUseCount = stack[stack.length - 1];
      while (top && top.endOffset <= entry.startOffset) {
        append(top.endOffset, top.count);
        stack.pop();
        top = stack[stack.length - 1];
      }
      append(entry.startOffset, top ? top.count : 0);
      stack.push(entry);
    }
    for (let top = stack.pop(); top; top = stack.pop()) {
      append(top.endOffset, top.count);
    }

    function append(end: number, count: number): void {
      const last = result[result.length - 1];
      if (last) {
        if (last.end === end) {
          return;
        }
        if (last.count === count) {
          last.end = end;
          return;
        }
      }
      result.push({end, count, stamp});
    }

    return result;
  }

  export function calculateSizeForSources(sourceMap: SDK.SourceMap.SourceMap, text: TextUtils.Text.Text, contentLength: number):
      [
        Map<Platform.DevToolsPath.UrlString, number>,
        SourceSegment[],
      ] {
    // Map shows the size of source files contributed to the size in the generated file. For example:
    // Map(3) {url1 => 593, url2 => 232, url3 => 52}
    // This means in there are 593 bytes in the generated file are contributed by url1, and so on.
    const sourceSizeMap = new Map<Platform.DevToolsPath.UrlString, number>();
    // Continuous segments shows that which source file contribute to the generated file segment. For example:
    // [{end: 84, sourceUrl: ''}, {end: 593, sourceUrl: url1}, {end: 781, sourceUrl: url2}, {end: 833, sourceUrl: url3}, {end: 881, sourceUrl: url1}]
    // This means that the first 84 bytes in the generated file are not contributed by any source file, the next 593 bytes are contributed by url1, and so on.
    const sourceSegments: SourceSegment[] = [];
    const calculateSize = function(startLine: number, startCol: number, endLine: number, endCol: number): number {
      if (startLine === endLine) {
        return endCol - startCol;
      }
      if (text) {
        // If we hit the line break, we need to use offset to calculate size
        const startOffset = text.offsetFromPosition(startLine, startCol);
        const endOffset = text.offsetFromPosition(endLine, endCol);
        return endOffset - startOffset;
      }
      // If for some reason we don't have the text, we can only use col number to calculate size
      return endCol;
    };
    const mappings = sourceMap.mappings();
    if (mappings.length === 0) {
      return [sourceSizeMap, sourceSegments];
    }
    // calculate the segment before the first entry
    let lastEntry = mappings[0];
    let totalSegmentSize = 0;
    if (text) {
      totalSegmentSize += text.offsetFromPosition(lastEntry.lineNumber, lastEntry.columnNumber);
    } else {
      totalSegmentSize += calculateSize(0, 0, lastEntry.lineNumber, lastEntry.columnNumber);
    }
    sourceSegments.push({end: totalSegmentSize, sourceUrl: '' as Platform.DevToolsPath.UrlString});
    for (let i = 0; i < mappings.length; i++) {
      const curEntry = mappings[i];
      const entryRange = sourceMap.findEntryRanges(curEntry.lineNumber, curEntry.columnNumber);
      if (entryRange) {
        // calculate the size
        const range = entryRange.range;
        const sourceURL = entryRange.sourceURL;
        const oldSize = sourceSizeMap.get(sourceURL) || 0;
        let size = 0;
        if (i === mappings.length - 1) {
          const startOffset = text.offsetFromPosition(range.startLine, range.startColumn);
          size = contentLength - startOffset;
        } else {
          size = calculateSize(range.startLine, range.startColumn, range.endLine, range.endColumn);
        }
        sourceSizeMap.set(sourceURL, oldSize + size);
      }
      // calculate the segment
      const segmentSize =
          calculateSize(lastEntry.lineNumber, lastEntry.columnNumber, curEntry.lineNumber, curEntry.columnNumber);
      totalSegmentSize += segmentSize;
      if (curEntry.sourceURL !== lastEntry.sourceURL) {
        if (text) {
          const endOffsetForLastEntry = text.offsetFromPosition(curEntry.lineNumber, curEntry.columnNumber);
          sourceSegments.push(
              {end: endOffsetForLastEntry, sourceUrl: lastEntry.sourceURL || '' as Platform.DevToolsPath.UrlString});
        } else {
          sourceSegments.push(
              {end: totalSegmentSize, sourceUrl: lastEntry.sourceURL || '' as Platform.DevToolsPath.UrlString});
        }
      }
      lastEntry = curEntry;
      // add the last segment if we are at the last entry
      if (i === mappings.length - 1) {
        sourceSegments.push(
            {end: contentLength, sourceUrl: curEntry.sourceURL || '' as Platform.DevToolsPath.UrlString});
      }
    }
    return [sourceSizeMap, sourceSegments];
  }
