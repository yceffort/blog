export const metadata = {
  title: 'k8s-fe-lab',
}

export default function RootLayout({children}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
