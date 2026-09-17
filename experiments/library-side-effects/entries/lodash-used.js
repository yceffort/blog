import _ from 'lodash'

globalThis.__libResult = _.chunk([1, 2, 3, 4], 2)
performance.mark('payload-evaluated')
