export function makeFeature() {
  return function later(flag) {
    return flag ? '한🔥' : '다른 경로'
  }
}

export function unusedFeature() {
  throw new Error('This function must remain unobserved')
}
