import moment from 'moment'

globalThis.__libResult = moment(0).format('YYYY-MM-DD')
performance.mark('payload-evaluated')
