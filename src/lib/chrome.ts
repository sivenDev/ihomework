/** 用安卓 intent 链接让系统用 Chrome 打开指定页面。 */
export function chromeIntentUrl(href: string): string {
  const url = new URL(href)
  const scheme = url.protocol.replace(':', '')
  return `intent://${url.host}${url.pathname}${url.search}${url.hash}#Intent;scheme=${scheme};package=com.android.chrome;end`
}
