import SeriesIndexView, {
  seriesIndexMetadata,
} from '@/components/series/SeriesIndexView'

export const metadata = seriesIndexMetadata('en')

export default function Page() {
  return <SeriesIndexView locale="en" />
}
