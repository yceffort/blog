import {createPushSubscribeHandlers} from '@yceffort/shared/server'

export const {POST, DELETE} = createPushSubscribeHandlers(
  'news:push:subscriptions',
)
