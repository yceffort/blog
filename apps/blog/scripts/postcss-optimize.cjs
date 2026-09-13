const {Features, transform} = require('lightningcss')

// Preserve the previous production optimizer's color conversion and browser targets.
// Next.js performs its own final optimization after this PostCSS pass.
module.exports = () => ({
  postcssPlugin: 'blog-optimize',
  OnceExit(root, {result, postcss}) {
    if (
      process.env.NODE_ENV !== 'production' ||
      !result.opts.from?.endsWith('/src/styles/stylex.css')
    ) {
      return
    }
    let code = Buffer.from(root.toString())
    for (let pass = 0; pass < 2; pass++) {
      code = transform({
        filename: result.opts.from,
        code,
        minify: true,
        drafts: {customMedia: true},
        include: Features.Nesting | Features.MediaQueries,
        exclude:
          Features.LogicalProperties |
          Features.DirSelector |
          Features.LightDark,
        targets: {
          safari: (16 << 16) | (4 << 8),
          ios_saf: (16 << 16) | (4 << 8),
          firefox: 128 << 16,
          chrome: 111 << 16,
        },
      }).code
    }
    const optimized = postcss.parse(code.toString(), {from: result.opts.from})
    root.removeAll().append(optimized.nodes)
  },
})
module.exports.postcss = true
