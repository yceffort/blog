import {format, parseISO} from 'date-fns'

export function formatDate(
  date: string | Date,
  formatStr = 'yyyy-MM-dd',
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr)
}

export function formatDateLong(date: string | Date): string {
  return formatDate(date, 'yyyy년 MM월 dd일')
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'yyyy.MM.dd')
}
