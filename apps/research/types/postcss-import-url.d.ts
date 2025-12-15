declare module 'postcss-import-url' {
  import type {PluginCreator} from 'postcss'

  interface Options {
    recursive?: boolean
    resolveUrls?: boolean
    modernBrowser?: boolean
    userAgent?: string | null
    dataUrls?: boolean
  }

  const plugin: PluginCreator<Options>
  export default plugin
}
