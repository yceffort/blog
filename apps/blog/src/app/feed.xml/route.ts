import {buildFeedResponse} from '@/utils/feed'

export function GET() {
  return buildFeedResponse('ko')
}
