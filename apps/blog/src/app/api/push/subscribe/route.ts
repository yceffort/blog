import {createPushSubscribeHandlers} from '@yceffort/shared/server'

export const {POST, DELETE} = createPushSubscribeHandlers('push:subscriptions')
