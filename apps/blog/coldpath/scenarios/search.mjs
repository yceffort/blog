// Open site search and wait for results from the lazily fetched index.
export default async function ({page}) {
  await page.getByRole('button', {name: '검색', exact: true}).first().click()
  await page.getByPlaceholder('글 검색…').fill('react')
  await page.locator('.search-result').first().waitFor()
}
