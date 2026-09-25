// Open the first Mermaid diagram in the zoom dialog and zoom in once.
export default async function ({page}) {
  const open = page.getByRole('button', {name: '다이어그램 확대'}).first()
  await open.waitFor()
  await open.click()
  // Panzoom loads when the dialog opens; wait until it is applied.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('div')].some(
      (node) => node.style.cursor === 'move',
    ),
  )
  await page.getByRole('button', {name: 'Zoom in'}).click()
}
