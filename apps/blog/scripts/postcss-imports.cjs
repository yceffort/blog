const {readFile} = require('node:fs/promises')
const {dirname, resolve} = require('node:path')

// Inline local imports before StyleX and color optimization so splitting files
// does not create separate optimization passes or change the cascade.
module.exports = () => ({
  postcssPlugin: 'blog-imports',
  async Once(root, {result, postcss}) {
    async function inline(container, filename, ancestors) {
      const imports = container.nodes.filter(
        (node) => node.type === 'atrule' && node.name === 'import',
      )
      for (const node of imports) {
        const target = node.params.match(/^['"]([.][^'"]+)['"]$/)?.[1]
        if (!target) continue
        const file = resolve(dirname(filename), target)
        if (ancestors.includes(file))
          throw node.error(`Circular CSS import: ${file}`)
        result.messages.push({
          type: 'dependency',
          plugin: 'blog-imports',
          file,
          parent: filename,
        })
        const imported = postcss.parse(await readFile(file, 'utf8'), {
          from: file,
        })
        await inline(imported, file, [...ancestors, file])
        node.replaceWith(imported.nodes)
      }
    }
    if (result.opts.from?.endsWith('/src/styles/stylex.css')) {
      await inline(root, result.opts.from, [result.opts.from])
    }
  },
})
module.exports.postcss = true
