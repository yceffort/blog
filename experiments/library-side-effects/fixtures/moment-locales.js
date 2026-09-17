globalThis.process = globalThis.process || {
  env: {},
  argv: [],
  platform: 'browser',
  version: '',
  versions: {},
  nextTick: function (f) {
    queueMicrotask(f)
  },
  cwd: function () {
    return '/'
  },
  emitWarning: function () {},
  on: function () {},
  off: function () {},
  listeners: function () {
    return []
  },
}
;(() => {
  var Pd = Object.create
  var rr = Object.defineProperty
  var Od = Object.getOwnPropertyDescriptor
  var Wd = Object.getOwnPropertyNames
  var Ad = Object.getPrototypeOf,
    Ed = Object.prototype.hasOwnProperty
  var zt = ((u) =>
    typeof require < 'u'
      ? require
      : typeof Proxy < 'u'
        ? new Proxy(u, {
            get: (M, ye) => (typeof require < 'u' ? require : M)[ye],
          })
        : u)(function (u) {
    if (typeof require < 'u') return require.apply(this, arguments)
    throw Error('Dynamic require of "' + u + '" is not supported')
  })
  var nr = (u, M) => () => (M || u((M = {exports: {}}).exports, M), M.exports)
  var Fd = (u, M, ye, H) => {
    if ((M && typeof M == 'object') || typeof M == 'function')
      for (let R of Wd(M))
        !Ed.call(u, R) &&
          R !== ye &&
          rr(u, R, {
            get: () => M[R],
            enumerable: !(H = Od(M, R)) || H.enumerable,
          })
    return u
  }
  var dr = (u, M, ye) => (
    (ye = u != null ? Pd(Ad(u)) : {}),
    Fd(
      M || !u || !u.__esModule
        ? rr(ye, 'default', {value: u, enumerable: !0})
        : ye,
      u,
    )
  )
  var xs = nr((js, Pa) => {
    ;(function (u, M) {
      typeof js == 'object' && typeof Pa < 'u'
        ? (Pa.exports = M())
        : typeof define == 'function' && define.amd
          ? define(M)
          : (u.moment = M())
    })(js, function () {
      'use strict'
      var u
      function M() {
        return u.apply(null, arguments)
      }
      function ye(a) {
        u = a
      }
      function H(a) {
        return (
          a instanceof Array ||
          Object.prototype.toString.call(a) === '[object Array]'
        )
      }
      function R(a) {
        return (
          a != null && Object.prototype.toString.call(a) === '[object Object]'
        )
      }
      function T(a, t) {
        return Object.prototype.hasOwnProperty.call(a, t)
      }
      function ua(a) {
        if (Object.getOwnPropertyNames)
          return Object.getOwnPropertyNames(a).length === 0
        var t
        for (t in a) if (T(a, t)) return !1
        return !0
      }
      function J(a) {
        return a === void 0
      }
      function P(a) {
        return (
          typeof a == 'number' ||
          Object.prototype.toString.call(a) === '[object Number]'
        )
      }
      function Fe(a) {
        return (
          a instanceof Date ||
          Object.prototype.toString.call(a) === '[object Date]'
        )
      }
      function st(a, t) {
        var r = [],
          n,
          d = a.length
        for (n = 0; n < d; ++n) r.push(t(a[n], n))
        return r
      }
      function fe(a, t) {
        for (var r in t) T(t, r) && (a[r] = t[r])
        return (
          T(t, 'toString') && (a.toString = t.toString),
          T(t, 'valueOf') && (a.valueOf = t.valueOf),
          a
        )
      }
      function oe(a, t, r, n) {
        return As(a, t, r, n, !0).utc()
      }
      function Nt() {
        return {
          empty: !1,
          unusedTokens: [],
          unusedInput: [],
          overflow: -2,
          charsLeftOver: 0,
          nullInput: !1,
          invalidEra: null,
          invalidMonth: null,
          invalidFormat: !1,
          userInvalidated: !1,
          iso: !1,
          parsedDateParts: [],
          era: null,
          meridiem: null,
          rfc2822: !1,
          weekdayMismatch: !1,
        }
      }
      function f(a) {
        return (a._pf == null && (a._pf = Nt()), a._pf)
      }
      var Oa
      Array.prototype.some
        ? (Oa = Array.prototype.some)
        : (Oa = function (a) {
            var t = Object(this),
              r = t.length >>> 0,
              n
            for (n = 0; n < r; n++)
              if (n in t && a.call(this, t[n], n, t)) return !0
            return !1
          })
      function ma(a) {
        var t = null,
          r = !1,
          n = a._d && !isNaN(a._d.getTime())
        if (
          (n &&
            ((t = f(a)),
            (r = Oa.call(t.parsedDateParts, function (d) {
              return d != null
            })),
            (n =
              t.overflow < 0 &&
              !t.empty &&
              !t.invalidEra &&
              !t.invalidMonth &&
              !t.invalidWeekday &&
              !t.weekdayMismatch &&
              !t.nullInput &&
              !t.invalidFormat &&
              !t.userInvalidated &&
              (!t.meridiem || (t.meridiem && r))),
            a._strict &&
              (n =
                n &&
                t.charsLeftOver === 0 &&
                t.unusedTokens.length === 0 &&
                t.bigHour === void 0)),
          Object.isFrozen == null || !Object.isFrozen(a))
        )
          a._isValid = n
        else return n
        return a._isValid
      }
      function Ma(a) {
        var t = oe(NaN)
        return (a != null ? fe(f(t), a) : (f(t).userInvalidated = !0), t)
      }
      var U = (M.momentProperties = []),
        ha = !1
      function Qe(a, t) {
        var r,
          n,
          d,
          o = U.length
        if (
          (J(t._isAMomentObject) || (a._isAMomentObject = t._isAMomentObject),
          J(t._i) || (a._i = t._i),
          J(t._f) || (a._f = t._f),
          J(t._l) || (a._l = t._l),
          J(t._strict) || (a._strict = t._strict),
          J(t._tzm) || (a._tzm = t._tzm),
          J(t._isUTC) || (a._isUTC = t._isUTC),
          J(t._offset) || (a._offset = t._offset),
          J(t._pf) || (a._pf = f(t)),
          J(t._locale) || (a._locale = t._locale),
          o > 0)
        )
          for (r = 0; r < o; r++) ((n = U[r]), (d = t[n]), J(d) || (a[n] = d))
        return a
      }
      function Xe(a) {
        ;(Qe(this, a),
          (this._d = new Date(a._d != null ? a._d.getTime() : NaN)),
          this.isValid() || (this._d = new Date(NaN)),
          ha === !1 && ((ha = !0), M.updateOffset(this), (ha = !1)))
      }
      function A(a) {
        return a instanceof Xe || (a != null && a._isAMomentObject != null)
      }
      function rt(a) {
        M.suppressDeprecationWarnings === !1 &&
          typeof console < 'u' &&
          console.warn &&
          console.warn('Deprecation warning: ' + a)
      }
      function X(a, t) {
        var r = !0
        return fe(function () {
          if (
            (M.deprecationHandler != null && M.deprecationHandler(null, a), r)
          ) {
            var n = [],
              d,
              o,
              m,
              L = arguments.length
            for (o = 0; o < L; o++) {
              if (((d = ''), typeof arguments[o] == 'object')) {
                d +=
                  `
[` +
                  o +
                  '] '
                for (m in arguments[0])
                  T(arguments[0], m) && (d += m + ': ' + arguments[0][m] + ', ')
                d = d.slice(0, -2)
              } else d = arguments[o]
              n.push(d)
            }
            ;(rt(
              a +
                `
Arguments: ` +
                Array.prototype.slice.call(n).join('') +
                `
` +
                new Error().stack,
            ),
              (r = !1))
          }
          return t.apply(this, arguments)
        }, t)
      }
      var nt = {}
      function dt(a, t) {
        ;(M.deprecationHandler != null && M.deprecationHandler(a, t),
          nt[a] || (rt(t), (nt[a] = !0)))
      }
      ;((M.suppressDeprecationWarnings = !1), (M.deprecationHandler = null))
      function le(a) {
        return (
          (typeof Function < 'u' && a instanceof Function) ||
          Object.prototype.toString.call(a) === '[object Function]'
        )
      }
      function Rt(a) {
        var t, r
        for (r in a)
          T(a, r) && ((t = a[r]), le(t) ? (this[r] = t) : (this['_' + r] = t))
        ;((this._config = a),
          (this._dayOfMonthOrdinalParseLenient = new RegExp(
            (this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) +
              '|' +
              /\d{1,2}/.source,
          )))
      }
      function ea(a, t) {
        var r = fe({}, a),
          n
        for (n in t)
          T(t, n) &&
            (R(a[n]) && R(t[n])
              ? ((r[n] = {}), fe(r[n], a[n]), fe(r[n], t[n]))
              : t[n] != null
                ? (r[n] = t[n])
                : delete r[n])
        for (n in a) T(a, n) && !T(t, n) && R(a[n]) && (r[n] = fe({}, r[n]))
        return r
      }
      function Wa(a) {
        a != null && this.set(a)
      }
      var ca
      Object.keys
        ? (ca = Object.keys)
        : (ca = function (a) {
            var t,
              r = []
            for (t in a) T(a, t) && r.push(t)
            return r
          })
      var Jt = {
        sameDay: '[Today at] LT',
        nextDay: '[Tomorrow at] LT',
        nextWeek: 'dddd [at] LT',
        lastDay: '[Yesterday at] LT',
        lastWeek: '[Last] dddd [at] LT',
        sameElse: 'L',
      }
      function It(a, t, r) {
        var n = this._calendar[a] || this._calendar.sameElse
        return le(n) ? n.call(t, r) : n
      }
      function ee(a, t, r) {
        var n = '' + Math.abs(a),
          d = t - n.length,
          o = a >= 0
        return (
          (o ? (r ? '+' : '') : '-') +
          Math.pow(10, Math.max(0, d)).toString().substr(1) +
          n
        )
      }
      var La =
          /(\[[^[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g,
        Ya = /(\[[^[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,
        Aa = {},
        ze = {}
      function Y(a, t, r, n) {
        var d = n
        ;(typeof n == 'string' &&
          (d = function () {
            return this[n]()
          }),
          a && (ze[a] = d),
          t &&
            (ze[t[0]] = function () {
              return ee(d.apply(this, arguments), t[1], t[2])
            }),
          r &&
            (ze[r] = function () {
              return this.localeData().ordinal(d.apply(this, arguments), a)
            }))
      }
      function it(a) {
        return a.match(/\[[\s\S]/)
          ? a.replace(/^\[|\]$/g, '')
          : a.replace(/\\/g, '')
      }
      function $t(a) {
        var t = a.match(La),
          r,
          n
        for (r = 0, n = t.length; r < n; r++)
          ze[t[r]] ? (t[r] = ze[t[r]]) : (t[r] = it(t[r]))
        return function (d) {
          var o = '',
            m
          for (m = 0; m < n; m++) o += le(t[m]) ? t[m].call(d, a) : t[m]
          return o
        }
      }
      function ue(a, t) {
        return a.isValid()
          ? ((t = _t(t, a.localeData())), (Aa[t] = Aa[t] || $t(t)), Aa[t](a))
          : a.localeData().invalidDate()
      }
      function _t(a, t) {
        var r = 5
        function n(d) {
          return t.longDateFormat(d) || d
        }
        for (Ya.lastIndex = 0; r >= 0 && Ya.test(a);)
          ((a = a.replace(Ya, n)), (Ya.lastIndex = 0), (r -= 1))
        return a
      }
      var Ct = {
        LTS: 'h:mm:ss A',
        LT: 'h:mm A',
        L: 'MM/DD/YYYY',
        LL: 'MMMM D, YYYY',
        LLL: 'MMMM D, YYYY h:mm A',
        LLLL: 'dddd, MMMM D, YYYY h:mm A',
      }
      function Ea(a) {
        var t = this._longDateFormat[a],
          r = this._longDateFormat[a.toUpperCase()]
        return t || !r
          ? t
          : ((this._longDateFormat[a] = r
              .match(La)
              .map(function (n) {
                return n === 'MMMM' || n === 'MM' || n === 'DD' || n === 'dddd'
                  ? n.slice(1)
                  : n
              })
              .join('')),
            this._longDateFormat[a])
      }
      var ot = 'Invalid date'
      function Ne() {
        return this._invalidDate
      }
      var ae = '%d',
        ke = /\d{1,2}/
      function pe(a) {
        return this._ordinal.replace('%d', a)
      }
      var De = {
        future: 'in %s',
        past: '%s ago',
        s: 'a few seconds',
        ss: '%d seconds',
        m: 'a minute',
        mm: '%d minutes',
        h: 'an hour',
        hh: '%d hours',
        d: 'a day',
        dd: '%d days',
        w: 'a week',
        ww: '%d weeks',
        M: 'a month',
        MM: '%d months',
        y: 'a year',
        yy: '%d years',
      }
      function lt(a, t, r, n) {
        var d = this._relativeTime[r]
        return le(d) ? d(a, t, r, n) : d.replace(/%d/i, a)
      }
      function ut(a, t) {
        var r = this._relativeTime[a > 0 ? 'future' : 'past']
        return le(r) ? r(t) : r.replace(/%s/i, t)
      }
      var mt = {
        D: 'date',
        dates: 'date',
        date: 'date',
        d: 'day',
        days: 'day',
        day: 'day',
        e: 'weekday',
        weekdays: 'weekday',
        weekday: 'weekday',
        E: 'isoWeekday',
        isoweekdays: 'isoWeekday',
        isoweekday: 'isoWeekday',
        DDD: 'dayOfYear',
        dayofyears: 'dayOfYear',
        dayofyear: 'dayOfYear',
        h: 'hour',
        hours: 'hour',
        hour: 'hour',
        ms: 'millisecond',
        milliseconds: 'millisecond',
        millisecond: 'millisecond',
        m: 'minute',
        minutes: 'minute',
        minute: 'minute',
        M: 'month',
        months: 'month',
        month: 'month',
        Q: 'quarter',
        quarters: 'quarter',
        quarter: 'quarter',
        s: 'second',
        seconds: 'second',
        second: 'second',
        gg: 'weekYear',
        weekyears: 'weekYear',
        weekyear: 'weekYear',
        GG: 'isoWeekYear',
        isoweekyears: 'isoWeekYear',
        isoweekyear: 'isoWeekYear',
        w: 'week',
        weeks: 'week',
        week: 'week',
        W: 'isoWeek',
        isoweeks: 'isoWeek',
        isoweek: 'isoWeek',
        y: 'year',
        years: 'year',
        year: 'year',
      }
      function G(a) {
        return typeof a == 'string' ? mt[a] || mt[a.toLowerCase()] : void 0
      }
      function Fa(a) {
        var t = {},
          r,
          n
        for (n in a) T(a, n) && ((r = G(n)), r && (t[r] = a[n]))
        return t
      }
      var za = {
        date: 9,
        day: 11,
        weekday: 11,
        isoWeekday: 11,
        dayOfYear: 4,
        hour: 13,
        millisecond: 16,
        minute: 14,
        month: 8,
        quarter: 7,
        second: 15,
        weekYear: 1,
        isoWeekYear: 1,
        week: 5,
        isoWeek: 5,
        year: 1,
      }
      function Mt(a) {
        var t = [],
          r
        for (r in a) T(a, r) && t.push({unit: r, priority: za[r]})
        return (
          t.sort(function (n, d) {
            return n.priority - d.priority
          }),
          t
        )
      }
      var Na = /\d/,
        V = /\d\d/,
        ya = /\d{3}/,
        fa = /\d{4}/,
        aa = /[+-]?\d{6}/,
        S = /\d\d?/,
        ka = /\d\d\d\d?/,
        Ra = /\d\d\d\d\d\d?/,
        ta = /\d{1,3}/,
        Ja = /\d{1,4}/,
        Re = /[+-]?\d{1,6}/,
        Se = /\d+/,
        I = /[+-]?\d+/,
        Ut = /Z|[+-]\d\d:?\d\d/gi,
        pa = /Z|[+-]\d\d(?::?\d\d)?/gi,
        Da = /[+-]?\d+(\.\d{1,3})?/,
        sa =
          /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i,
        E = /^[1-9]\d?/,
        Ia = /^([1-9]\d|\d)/,
        Ta
      Ta = {}
      function c(a, t, r) {
        Ta[a] = le(t)
          ? t
          : function (n, d) {
              return n && r ? r : t
            }
      }
      function ht(a, t) {
        return T(Ta, a) ? Ta[a](t._strict, t._locale) : new RegExp($a(a))
      }
      function $a(a) {
        return me(
          a
            .replace('\\', '')
            .replace(
              /\\(\[)|\\(\])|\[([^\][]*)\]|\\(.)/g,
              function (t, r, n, d, o) {
                return r || n || d || o
              },
            ),
        )
      }
      function me(a) {
        return a.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
      }
      function te(a) {
        return a < 0 ? Math.ceil(a) || 0 : Math.floor(a)
      }
      function k(a) {
        var t = +a,
          r = 0
        return (t !== 0 && isFinite(t) && (r = te(t)), r)
      }
      var Ca = {}
      function v(a, t) {
        var r,
          n = t,
          d
        for (
          typeof a == 'string' && (a = [a]),
            P(t) &&
              (n = function (o, m) {
                m[t] = k(o)
              }),
            d = a.length,
            r = 0;
          r < d;
          r++
        )
          Ca[a[r]] = n
      }
      function ra(a, t) {
        v(a, function (r, n, d, o) {
          ;((d._w = d._w || {}), t(r, d._w, d, o))
        })
      }
      function Gt(a, t, r) {
        t != null && T(Ca, a) && Ca[a](t, r._a, r, a)
      }
      function wa(a) {
        return (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0
      }
      var z = 0,
        Te = 1,
        Me = 2,
        W = 3,
        x = 4,
        O = 5,
        be = 6,
        Vt = 7,
        qt = 8
      ;(Y('Y', 0, 0, function () {
        var a = this.year()
        return a <= 9999 ? ee(a, 4) : '+' + a
      }),
        Y(0, ['YY', 2], 0, function () {
          return this.year() % 100
        }),
        Y(0, ['YYYY', 4], 0, 'year'),
        Y(0, ['YYYYY', 5], 0, 'year'),
        Y(0, ['YYYYYY', 6, !0], 0, 'year'),
        c('Y', I),
        c('YY', S, V),
        c('YYYY', Ja, fa),
        c('YYYYY', Re, aa),
        c('YYYYYY', Re, aa),
        v(['YYYYY', 'YYYYYY'], z),
        v('YYYY', function (a, t) {
          t[z] = a.length === 2 ? M.parseTwoDigitYear(a) : k(a)
        }),
        v('YY', function (a, t) {
          t[z] = M.parseTwoDigitYear(a)
        }),
        v('Y', function (a, t) {
          t[z] = parseInt(a, 10)
        }))
      function na(a) {
        return wa(a) ? 366 : 365
      }
      M.parseTwoDigitYear = function (a) {
        return k(a) + (k(a) > 68 ? 1900 : 2e3)
      }
      var Ua = q('FullYear', !0)
      function Bt() {
        return wa(this.year())
      }
      function q(a, t) {
        return function (r) {
          return r != null
            ? (B(this, a, r), M.updateOffset(this, t), this)
            : da(this, a)
        }
      }
      function da(a, t) {
        if (!a.isValid()) return NaN
        var r = a._d,
          n = a._isUTC
        switch (t) {
          case 'Milliseconds':
            return n ? r.getUTCMilliseconds() : r.getMilliseconds()
          case 'Seconds':
            return n ? r.getUTCSeconds() : r.getSeconds()
          case 'Minutes':
            return n ? r.getUTCMinutes() : r.getMinutes()
          case 'Hours':
            return n ? r.getUTCHours() : r.getHours()
          case 'Date':
            return n ? r.getUTCDate() : r.getDate()
          case 'Day':
            return n ? r.getUTCDay() : r.getDay()
          case 'Month':
            return n ? r.getUTCMonth() : r.getMonth()
          case 'FullYear':
            return n ? r.getUTCFullYear() : r.getFullYear()
          default:
            return NaN
        }
      }
      function B(a, t, r) {
        var n, d, o, m, L
        if (!(!a.isValid() || isNaN(r))) {
          switch (((n = a._d), (d = a._isUTC), t)) {
            case 'Milliseconds':
              return void (d ? n.setUTCMilliseconds(r) : n.setMilliseconds(r))
            case 'Seconds':
              return void (d ? n.setUTCSeconds(r) : n.setSeconds(r))
            case 'Minutes':
              return void (d ? n.setUTCMinutes(r) : n.setMinutes(r))
            case 'Hours':
              return void (d ? n.setUTCHours(r) : n.setHours(r))
            case 'Date':
              return void (d ? n.setUTCDate(r) : n.setDate(r))
            case 'FullYear':
              break
            default:
              return
          }
          ;((o = r),
            (m = a.month()),
            (L = a.date()),
            (L = L === 29 && m === 1 && !wa(o) ? 28 : L),
            d ? n.setUTCFullYear(o, m, L) : n.setFullYear(o, m, L))
        }
      }
      function ct(a) {
        return ((a = G(a)), le(this[a]) ? this[a]() : this)
      }
      function Je(a, t) {
        if (typeof a == 'object') {
          a = Fa(a)
          var r = Mt(a),
            n,
            d = r.length
          for (n = 0; n < d; n++) this[r[n].unit](a[r[n].unit])
        } else if (((a = G(a)), le(this[a]))) return this[a](t)
        return this
      }
      function de(a, t) {
        return ((a % t) + t) % t
      }
      var b
      Array.prototype.indexOf
        ? (b = Array.prototype.indexOf)
        : (b = function (a) {
            var t
            for (t = 0; t < this.length; ++t) if (this[t] === a) return t
            return -1
          })
      function Ga(a, t) {
        if (isNaN(a) || isNaN(t)) return NaN
        var r = de(t, 12)
        return (
          (a += (t - r) / 12), r === 1 ? (wa(a) ? 29 : 28) : 31 - ((r % 7) % 2)
        )
      }
      ;(Y('M', ['MM', 2], 'Mo', function () {
        return this.month() + 1
      }),
        Y('MMM', 0, 0, function (a) {
          return this.localeData().monthsShort(this, a)
        }),
        Y('MMMM', 0, 0, function (a) {
          return this.localeData().months(this, a)
        }),
        c('M', S, E),
        c('MM', S, V),
        c('MMM', function (a, t) {
          return t.monthsShortRegex(a)
        }),
        c('MMMM', function (a, t) {
          return t.monthsRegex(a)
        }),
        v(['M', 'MM'], function (a, t) {
          t[Te] = k(a) - 1
        }),
        v(['MMM', 'MMMM'], function (a, t, r, n) {
          var d = r._locale.monthsParse(a, n, r._strict)
          d != null ? (t[Te] = d) : (f(r).invalidMonth = a)
        }))
      var Zt =
          'January_February_March_April_May_June_July_August_September_October_November_December'.split(
            '_',
          ),
        Lt = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
        Yt = /D[oD]?(\[[^[\]]*\]|\s)+MMMM?/,
        $ = sa,
        Kt = sa
      function Qt(a, t) {
        return a
          ? H(this._months)
            ? this._months[a.month()]
            : this._months[
                (this._months.isFormat || Yt).test(t) ? 'format' : 'standalone'
              ][a.month()]
          : H(this._months)
            ? this._months
            : this._months.standalone
      }
      function Xt(a, t) {
        return a
          ? H(this._monthsShort)
            ? this._monthsShort[a.month()]
            : this._monthsShort[Yt.test(t) ? 'format' : 'standalone'][a.month()]
          : H(this._monthsShort)
            ? this._monthsShort
            : this._monthsShort.standalone
      }
      function yt(a, t, r) {
        var n,
          d,
          o,
          m = a.toLocaleLowerCase()
        if (!this._monthsParse)
          for (
            this._monthsParse = [],
              this._longMonthsParse = [],
              this._shortMonthsParse = [],
              n = 0;
            n < 12;
            ++n
          )
            ((o = oe([2e3, n])),
              (this._shortMonthsParse[n] = this.monthsShort(
                o,
                '',
              ).toLocaleLowerCase()),
              (this._longMonthsParse[n] = this.months(
                o,
                '',
              ).toLocaleLowerCase()))
        return r
          ? t === 'MMM'
            ? ((d = b.call(this._shortMonthsParse, m)), d !== -1 ? d : null)
            : ((d = b.call(this._longMonthsParse, m)), d !== -1 ? d : null)
          : t === 'MMM'
            ? ((d = b.call(this._shortMonthsParse, m)),
              d !== -1
                ? d
                : ((d = b.call(this._longMonthsParse, m)), d !== -1 ? d : null))
            : ((d = b.call(this._longMonthsParse, m)),
              d !== -1
                ? d
                : ((d = b.call(this._shortMonthsParse, m)),
                  d !== -1 ? d : null))
      }
      function Va(a, t, r) {
        var n, d, o
        if (this._monthsParseExact) return yt.call(this, a, t, r)
        for (
          this._monthsParse ||
            ((this._monthsParse = []),
            (this._longMonthsParse = []),
            (this._shortMonthsParse = [])),
            n = 0;
          n < 12;
          n++
        ) {
          if (
            ((d = oe([2e3, n])),
            r &&
              !this._longMonthsParse[n] &&
              ((this._longMonthsParse[n] = new RegExp(
                '^' + this.months(d, '').replace('.', '') + '$',
                'i',
              )),
              (this._shortMonthsParse[n] = new RegExp(
                '^' + this.monthsShort(d, '').replace('.', '') + '$',
                'i',
              ))),
            !r &&
              !this._monthsParse[n] &&
              ((o = '^' + this.months(d, '') + '|^' + this.monthsShort(d, '')),
              (this._monthsParse[n] = new RegExp(o.replace('.', ''), 'i'))),
            r && t === 'MMMM' && this._longMonthsParse[n].test(a))
          )
            return n
          if (r && t === 'MMM' && this._shortMonthsParse[n].test(a)) return n
          if (!r && this._monthsParse[n].test(a)) return n
        }
      }
      function Ie(a, t) {
        if (!a.isValid()) return a
        if (typeof t == 'string') {
          if (/^\d+$/.test(t)) t = k(t)
          else if (((t = a.localeData().monthsParse(t)), !P(t))) return a
        }
        var r = t,
          n = a.date()
        return (
          (n = n < 29 ? n : Math.min(n, Ga(a.year(), r))),
          a._isUTC ? a._d.setUTCMonth(r, n) : a._d.setMonth(r, n),
          a
        )
      }
      function ft(a) {
        return a != null
          ? (Ie(this, a), M.updateOffset(this, !0), this)
          : da(this, 'Month')
      }
      function es() {
        return Ga(this.year(), this.month())
      }
      function $e(a) {
        return this._monthsParseExact
          ? (T(this, '_monthsRegex') || kt.call(this),
            a ? this._monthsShortStrictRegex : this._monthsShortRegex)
          : (T(this, '_monthsShortRegex') || (this._monthsShortRegex = $),
            this._monthsShortStrictRegex && a
              ? this._monthsShortStrictRegex
              : this._monthsShortRegex)
      }
      function as(a) {
        return this._monthsParseExact
          ? (T(this, '_monthsRegex') || kt.call(this),
            a ? this._monthsStrictRegex : this._monthsRegex)
          : (T(this, '_monthsRegex') || (this._monthsRegex = Kt),
            this._monthsStrictRegex && a
              ? this._monthsStrictRegex
              : this._monthsRegex)
      }
      function kt() {
        function a(y, D) {
          return D.length - y.length
        }
        var t = [],
          r = [],
          n = [],
          d,
          o,
          m,
          L
        for (d = 0; d < 12; d++)
          ((o = oe([2e3, d])),
            (m = me(this.monthsShort(o, ''))),
            (L = me(this.months(o, ''))),
            t.push(m),
            r.push(L),
            n.push(L),
            n.push(m))
        ;(t.sort(a),
          r.sort(a),
          n.sort(a),
          (this._monthsRegex = new RegExp('^(' + n.join('|') + ')', 'i')),
          (this._monthsShortRegex = this._monthsRegex),
          (this._monthsStrictRegex = new RegExp('^(' + r.join('|') + ')', 'i')),
          (this._monthsShortStrictRegex = new RegExp(
            '^(' + t.join('|') + ')',
            'i',
          )))
      }
      function Ce(a, t, r, n, d, o, m) {
        var L
        return (
          a < 100 && a >= 0
            ? ((L = new Date(a + 400, t, r, n, d, o, m)),
              isFinite(L.getFullYear()) && L.setFullYear(a))
            : (L = new Date(a, t, r, n, d, o, m)),
          L
        )
      }
      function Ue(a) {
        var t, r
        return (
          a < 100 && a >= 0
            ? ((r = Array.prototype.slice.call(arguments)),
              (r[0] = a + 400),
              (t = new Date(Date.UTC.apply(null, r))),
              isFinite(t.getUTCFullYear()) && t.setUTCFullYear(a))
            : (t = new Date(Date.UTC.apply(null, arguments))),
          t
        )
      }
      function ie(a, t, r) {
        var n = 7 + t - r,
          d = (7 + Ue(a, 0, n).getUTCDay() - t) % 7
        return -d + n - 1
      }
      function je(a, t, r, n, d) {
        var o = (7 + r - n) % 7,
          m = ie(a, n, d),
          L = 1 + 7 * (t - 1) + o + m,
          y,
          D
        return (
          L <= 0
            ? ((y = a - 1), (D = na(y) + L))
            : L > na(a)
              ? ((y = a + 1), (D = L - na(a)))
              : ((y = a), (D = L)),
          {year: y, dayOfYear: D}
        )
      }
      function Ge(a, t, r) {
        var n = ie(a.year(), t, r),
          d = Math.floor((a.dayOfYear() - n - 1) / 7) + 1,
          o,
          m
        return (
          d < 1
            ? ((m = a.year() - 1), (o = d + he(m, t, r)))
            : d > he(a.year(), t, r)
              ? ((o = d - he(a.year(), t, r)), (m = a.year() + 1))
              : ((m = a.year()), (o = d)),
          {week: o, year: m}
        )
      }
      function he(a, t, r) {
        var n = ie(a, t, r),
          d = ie(a + 1, t, r)
        return (na(a) - n + d) / 7
      }
      ;(Y('w', ['ww', 2], 'wo', 'week'),
        Y('W', ['WW', 2], 'Wo', 'isoWeek'),
        c('w', S, E),
        c('ww', S, V),
        c('W', S, E),
        c('WW', S, V),
        ra(['w', 'ww', 'W', 'WW'], function (a, t, r, n) {
          t[n.substr(0, 1)] = k(a)
        }))
      function Ve(a) {
        return Ge(a, this._week.dow, this._week.doy).week
      }
      var ia = {dow: 0, doy: 6}
      function ts() {
        return this._week.dow
      }
      function ce() {
        return this._week.doy
      }
      function se(a) {
        var t = this.localeData().week(this)
        return a == null ? t : this.add((a - t) * 7, 'd')
      }
      function ss(a) {
        var t = Ge(this, 1, 4).week
        return a == null ? t : this.add((a - t) * 7, 'd')
      }
      ;(Y('d', 0, 'do', 'day'),
        Y('dd', 0, 0, function (a) {
          return this.localeData().weekdaysMin(this, a)
        }),
        Y('ddd', 0, 0, function (a) {
          return this.localeData().weekdaysShort(this, a)
        }),
        Y('dddd', 0, 0, function (a) {
          return this.localeData().weekdays(this, a)
        }),
        Y('e', 0, 0, 'weekday'),
        Y('E', 0, 0, 'isoWeekday'),
        c('d', S),
        c('e', S),
        c('E', S),
        c('dd', function (a, t) {
          return t.weekdaysMinRegex(a)
        }),
        c('ddd', function (a, t) {
          return t.weekdaysShortRegex(a)
        }),
        c('dddd', function (a, t) {
          return t.weekdaysRegex(a)
        }),
        ra(['dd', 'ddd', 'dddd'], function (a, t, r, n) {
          var d = r._locale.weekdaysParse(a, n, r._strict)
          d != null ? (t.d = d) : (f(r).invalidWeekday = a)
        }),
        ra(['d', 'e', 'E'], function (a, t, r, n) {
          t[n] = k(a)
        }))
      function rs(a, t) {
        return typeof a != 'string'
          ? a
          : isNaN(a)
            ? ((a = t.weekdaysParse(a)), typeof a == 'number' ? a : null)
            : parseInt(a, 10)
      }
      function re(a, t) {
        return typeof a == 'string'
          ? t.weekdaysParse(a) % 7 || 7
          : isNaN(a)
            ? null
            : a
      }
      function qa(a, t) {
        return a.slice(t, 7).concat(a.slice(0, t))
      }
      var ns = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split(
          '_',
        ),
        pt = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        ds = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        Dt = sa,
        is = sa,
        Ba = sa
      function Tt(a, t) {
        var r = H(this._weekdays)
          ? this._weekdays
          : this._weekdays[
              a && a !== !0 && this._weekdays.isFormat.test(t)
                ? 'format'
                : 'standalone'
            ]
        return a === !0 ? qa(r, this._week.dow) : a ? r[a.day()] : r
      }
      function wt(a) {
        return a === !0
          ? qa(this._weekdaysShort, this._week.dow)
          : a
            ? this._weekdaysShort[a.day()]
            : this._weekdaysShort
      }
      function _s(a) {
        return a === !0
          ? qa(this._weekdaysMin, this._week.dow)
          : a
            ? this._weekdaysMin[a.day()]
            : this._weekdaysMin
      }
      function Za(a, t, r) {
        var n,
          d,
          o,
          m = a.toLocaleLowerCase()
        if (!this._weekdaysParse)
          for (
            this._weekdaysParse = [],
              this._shortWeekdaysParse = [],
              this._minWeekdaysParse = [],
              n = 0;
            n < 7;
            ++n
          )
            ((o = oe([2e3, 1]).day(n)),
              (this._minWeekdaysParse[n] = this.weekdaysMin(
                o,
                '',
              ).toLocaleLowerCase()),
              (this._shortWeekdaysParse[n] = this.weekdaysShort(
                o,
                '',
              ).toLocaleLowerCase()),
              (this._weekdaysParse[n] = this.weekdays(
                o,
                '',
              ).toLocaleLowerCase()))
        return r
          ? t === 'dddd'
            ? ((d = b.call(this._weekdaysParse, m)), d !== -1 ? d : null)
            : t === 'ddd'
              ? ((d = b.call(this._shortWeekdaysParse, m)), d !== -1 ? d : null)
              : ((d = b.call(this._minWeekdaysParse, m)), d !== -1 ? d : null)
          : t === 'dddd'
            ? ((d = b.call(this._weekdaysParse, m)),
              d !== -1 || ((d = b.call(this._shortWeekdaysParse, m)), d !== -1)
                ? d
                : ((d = b.call(this._minWeekdaysParse, m)),
                  d !== -1 ? d : null))
            : t === 'ddd'
              ? ((d = b.call(this._shortWeekdaysParse, m)),
                d !== -1 || ((d = b.call(this._weekdaysParse, m)), d !== -1)
                  ? d
                  : ((d = b.call(this._minWeekdaysParse, m)),
                    d !== -1 ? d : null))
              : ((d = b.call(this._minWeekdaysParse, m)),
                d !== -1 || ((d = b.call(this._weekdaysParse, m)), d !== -1)
                  ? d
                  : ((d = b.call(this._shortWeekdaysParse, m)),
                    d !== -1 ? d : null))
      }
      function gt(a, t, r) {
        var n, d, o
        if (this._weekdaysParseExact) return Za.call(this, a, t, r)
        for (
          this._weekdaysParse ||
            ((this._weekdaysParse = []),
            (this._minWeekdaysParse = []),
            (this._shortWeekdaysParse = []),
            (this._fullWeekdaysParse = [])),
            n = 0;
          n < 7;
          n++
        ) {
          if (
            ((d = oe([2e3, 1]).day(n)),
            r &&
              !this._fullWeekdaysParse[n] &&
              ((this._fullWeekdaysParse[n] = new RegExp(
                '^' + this.weekdays(d, '').replace('.', '\\.?') + '$',
                'i',
              )),
              (this._shortWeekdaysParse[n] = new RegExp(
                '^' + this.weekdaysShort(d, '').replace('.', '\\.?') + '$',
                'i',
              )),
              (this._minWeekdaysParse[n] = new RegExp(
                '^' + this.weekdaysMin(d, '').replace('.', '\\.?') + '$',
                'i',
              ))),
            this._weekdaysParse[n] ||
              ((o =
                '^' +
                this.weekdays(d, '') +
                '|^' +
                this.weekdaysShort(d, '') +
                '|^' +
                this.weekdaysMin(d, '')),
              (this._weekdaysParse[n] = new RegExp(o.replace('.', ''), 'i'))),
            r && t === 'dddd' && this._fullWeekdaysParse[n].test(a))
          )
            return n
          if (r && t === 'ddd' && this._shortWeekdaysParse[n].test(a)) return n
          if (r && t === 'dd' && this._minWeekdaysParse[n].test(a)) return n
          if (!r && this._weekdaysParse[n].test(a)) return n
        }
      }
      function os(a) {
        if (!this.isValid()) return a != null ? this : NaN
        var t = da(this, 'Day')
        return a != null
          ? ((a = rs(a, this.localeData())), this.add(a - t, 'd'))
          : t
      }
      function ls(a) {
        if (!this.isValid()) return a != null ? this : NaN
        var t = (this.day() + 7 - this.localeData()._week.dow) % 7
        return a == null ? t : this.add(a - t, 'd')
      }
      function vt(a) {
        if (!this.isValid()) return a != null ? this : NaN
        if (a != null) {
          var t = re(a, this.localeData())
          return this.day(this.day() % 7 ? t : t - 7)
        } else return this.day() || 7
      }
      function us(a) {
        return this._weekdaysParseExact
          ? (T(this, '_weekdaysRegex') || Le.call(this),
            a ? this._weekdaysStrictRegex : this._weekdaysRegex)
          : (T(this, '_weekdaysRegex') || (this._weekdaysRegex = Dt),
            this._weekdaysStrictRegex && a
              ? this._weekdaysStrictRegex
              : this._weekdaysRegex)
      }
      function Ka(a) {
        return this._weekdaysParseExact
          ? (T(this, '_weekdaysRegex') || Le.call(this),
            a ? this._weekdaysShortStrictRegex : this._weekdaysShortRegex)
          : (T(this, '_weekdaysShortRegex') || (this._weekdaysShortRegex = is),
            this._weekdaysShortStrictRegex && a
              ? this._weekdaysShortStrictRegex
              : this._weekdaysShortRegex)
      }
      function qe(a) {
        return this._weekdaysParseExact
          ? (T(this, '_weekdaysRegex') || Le.call(this),
            a ? this._weekdaysMinStrictRegex : this._weekdaysMinRegex)
          : (T(this, '_weekdaysMinRegex') || (this._weekdaysMinRegex = Ba),
            this._weekdaysMinStrictRegex && a
              ? this._weekdaysMinStrictRegex
              : this._weekdaysMinRegex)
      }
      function Le() {
        function a(Q, Ee) {
          return Ee.length - Q.length
        }
        var t = [],
          r = [],
          n = [],
          d = [],
          o,
          m,
          L,
          y,
          D
        for (o = 0; o < 7; o++)
          ((m = oe([2e3, 1]).day(o)),
            (L = me(this.weekdaysMin(m, ''))),
            (y = me(this.weekdaysShort(m, ''))),
            (D = me(this.weekdays(m, ''))),
            t.push(L),
            r.push(y),
            n.push(D),
            d.push(L),
            d.push(y),
            d.push(D))
        ;(t.sort(a),
          r.sort(a),
          n.sort(a),
          d.sort(a),
          (this._weekdaysRegex = new RegExp('^(' + d.join('|') + ')', 'i')),
          (this._weekdaysShortRegex = this._weekdaysRegex),
          (this._weekdaysMinRegex = this._weekdaysRegex),
          (this._weekdaysStrictRegex = new RegExp(
            '^(' + n.join('|') + ')',
            'i',
          )),
          (this._weekdaysShortStrictRegex = new RegExp(
            '^(' + r.join('|') + ')',
            'i',
          )),
          (this._weekdaysMinStrictRegex = new RegExp(
            '^(' + t.join('|') + ')',
            'i',
          )))
      }
      function we() {
        return this.hours() % 12 || 12
      }
      function ms() {
        return this.hours() || 24
      }
      ;(Y('H', ['HH', 2], 0, 'hour'),
        Y('h', ['hh', 2], 0, we),
        Y('k', ['kk', 2], 0, ms),
        Y('hmm', 0, 0, function () {
          return '' + we.apply(this) + ee(this.minutes(), 2)
        }),
        Y('hmmss', 0, 0, function () {
          return (
            '' + we.apply(this) + ee(this.minutes(), 2) + ee(this.seconds(), 2)
          )
        }),
        Y('Hmm', 0, 0, function () {
          return '' + this.hours() + ee(this.minutes(), 2)
        }),
        Y('Hmmss', 0, 0, function () {
          return (
            '' + this.hours() + ee(this.minutes(), 2) + ee(this.seconds(), 2)
          )
        }))
      function ge(a, t) {
        Y(a, 0, 0, function () {
          return this.localeData().meridiem(this.hours(), this.minutes(), t)
        })
      }
      ;(ge('a', !0), ge('A', !1))
      function ga(a, t) {
        return t._meridiemParse
      }
      ;(c('a', ga),
        c('A', ga),
        c('H', S, Ia),
        c('h', S, E),
        c('k', S, E),
        c('HH', S, V),
        c('hh', S, V),
        c('kk', S, V),
        c('hmm', ka),
        c('hmmss', Ra),
        c('Hmm', ka),
        c('Hmmss', Ra),
        v(['H', 'HH'], W),
        v(['k', 'kk'], function (a, t, r) {
          var n = k(a)
          t[W] = n === 24 ? 0 : n
        }),
        v(['a', 'A'], function (a, t, r) {
          ;((r._isPm = r._locale.isPM(a)), (r._meridiem = a))
        }),
        v(['h', 'hh'], function (a, t, r) {
          ;((t[W] = k(a)), (f(r).bigHour = !0))
        }),
        v('hmm', function (a, t, r) {
          var n = a.length - 2
          ;((t[W] = k(a.substr(0, n))),
            (t[x] = k(a.substr(n))),
            (f(r).bigHour = !0))
        }),
        v('hmmss', function (a, t, r) {
          var n = a.length - 4,
            d = a.length - 2
          ;((t[W] = k(a.substr(0, n))),
            (t[x] = k(a.substr(n, 2))),
            (t[O] = k(a.substr(d))),
            (f(r).bigHour = !0))
        }),
        v('Hmm', function (a, t, r) {
          var n = a.length - 2
          ;((t[W] = k(a.substr(0, n))), (t[x] = k(a.substr(n))))
        }),
        v('Hmmss', function (a, t, r) {
          var n = a.length - 4,
            d = a.length - 2
          ;((t[W] = k(a.substr(0, n))),
            (t[x] = k(a.substr(n, 2))),
            (t[O] = k(a.substr(d))))
        }))
      function Ht(a) {
        return (a + '').toLowerCase().charAt(0) === 'p'
      }
      var Qa = /[ap]\.?m?\.?/i,
        Ms = q('Hours', !0)
      function hs(a, t, r) {
        return a > 11 ? (r ? 'pm' : 'PM') : r ? 'am' : 'AM'
      }
      var xe = {
          calendar: Jt,
          longDateFormat: Ct,
          invalidDate: ot,
          ordinal: ae,
          dayOfMonthOrdinalParse: ke,
          relativeTime: De,
          months: Zt,
          monthsShort: Lt,
          week: ia,
          weekdays: ns,
          weekdaysMin: ds,
          weekdaysShort: pt,
          meridiemParse: Qa,
        },
        p = {},
        N = {},
        F
      function Z(a, t) {
        var r,
          n = Math.min(a.length, t.length)
        for (r = 0; r < n; r += 1) if (a[r] !== t[r]) return r
        return n
      }
      function St(a) {
        return a && a.toLowerCase().replace('_', '-')
      }
      function cs(a) {
        for (var t = 0, r, n, d, o; t < a.length;) {
          for (
            o = St(a[t]).split('-'),
              r = o.length,
              n = St(a[t + 1]),
              n = n ? n.split('-') : null;
            r > 0;
          ) {
            if (((d = Be(o.slice(0, r).join('-'))), d)) return d
            if (n && n.length >= r && Z(o, n) >= r - 1) break
            r--
          }
          t++
        }
        return F
      }
      function Xa(a) {
        return !!(a && a.match('^[^/\\\\]*$'))
      }
      function Be(a) {
        var t = null,
          r
        if (p[a] === void 0 && typeof Pa < 'u' && Pa && Pa.exports && Xa(a))
          try {
            ;((t = F._abbr), (r = zt), r('./locale/' + a), Ye(t))
          } catch {
            p[a] = null
          }
        return p[a]
      }
      function Ye(a, t) {
        var r
        return (
          a &&
            (J(t) ? (r = C(a)) : (r = et(a, t)),
            r
              ? (F = r)
              : typeof console < 'u' &&
                console.warn &&
                console.warn(
                  'Locale ' + a + ' not found. Did you forget to load it?',
                )),
          F._abbr
        )
      }
      function et(a, t) {
        if (t !== null) {
          var r,
            n = xe
          if (((t.abbr = a), p[a] != null))
            (dt(
              'defineLocaleOverride',
              'use moment.updateLocale(localeName, config) to change an existing locale. moment.defineLocale(localeName, config) should only be used for creating a new locale See http://momentjs.com/guides/#/warnings/define-locale/ for more info.',
            ),
              (n = p[a]._config))
          else if (t.parentLocale != null)
            if (p[t.parentLocale] != null) n = p[t.parentLocale]._config
            else if (((r = Be(t.parentLocale)), r != null)) n = r._config
            else
              return (
                N[t.parentLocale] || (N[t.parentLocale] = []),
                N[t.parentLocale].push({name: a, config: t}),
                null
              )
          return (
            (p[a] = new Wa(ea(n, t))),
            N[a] &&
              N[a].forEach(function (d) {
                et(d.name, d.config)
              }),
            Ye(a),
            p[a]
          )
        } else return (delete p[a], null)
      }
      function Ls(a, t) {
        if (t != null) {
          var r,
            n,
            d = xe
          ;(p[a] != null && p[a].parentLocale != null
            ? p[a].set(ea(p[a]._config, t))
            : ((n = Be(a)),
              n != null && (d = n._config),
              (t = ea(d, t)),
              n == null && (t.abbr = a),
              (r = new Wa(t)),
              (r.parentLocale = p[a]),
              (p[a] = r)),
            Ye(a))
        } else
          p[a] != null &&
            (p[a].parentLocale != null
              ? ((p[a] = p[a].parentLocale), a === Ye() && Ye(a))
              : p[a] != null && delete p[a])
        return p[a]
      }
      function C(a) {
        var t
        if ((a && a._locale && a._locale._abbr && (a = a._locale._abbr), !a))
          return F
        if (!H(a)) {
          if (((t = Be(a)), t)) return t
          a = [a]
        }
        return cs(a)
      }
      function Ys() {
        return ca(p)
      }
      function _a(a) {
        var t,
          r = a._a
        return (
          r &&
            f(a).overflow === -2 &&
            ((t =
              r[Te] < 0 || r[Te] > 11
                ? Te
                : r[Me] < 1 || r[Me] > Ga(r[z], r[Te])
                  ? Me
                  : r[W] < 0 ||
                      r[W] > 24 ||
                      (r[W] === 24 && (r[x] !== 0 || r[O] !== 0 || r[be] !== 0))
                    ? W
                    : r[x] < 0 || r[x] > 59
                      ? x
                      : r[O] < 0 || r[O] > 59
                        ? O
                        : r[be] < 0 || r[be] > 999
                          ? be
                          : -1),
            f(a)._overflowDayOfYear && (t < z || t > Me) && (t = Me),
            f(a)._overflowWeeks && t === -1 && (t = Vt),
            f(a)._overflowWeekday && t === -1 && (t = qt),
            (f(a).overflow = t)),
          a
        )
      }
      var ne =
          /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
        ys =
          /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d|))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
        Pe = /Z|[+-]\d\d(?::?\d\d)?/,
        va = [
          ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
          ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
          ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
          ['GGGG-[W]WW', /\d{4}-W\d\d/, !1],
          ['YYYY-DDD', /\d{4}-\d{3}/],
          ['YYYY-MM', /\d{4}-\d\d/, !1],
          ['YYYYYYMMDD', /[+-]\d{10}/],
          ['YYYYMMDD', /\d{8}/],
          ['GGGG[W]WWE', /\d{4}W\d{3}/],
          ['GGGG[W]WW', /\d{4}W\d{2}/, !1],
          ['YYYYDDD', /\d{7}/],
          ['YYYYMM', /\d{6}/, !1],
          ['YYYY', /\d{4}/, !1],
        ],
        He = [
          ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
          ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
          ['HH:mm:ss', /\d\d:\d\d:\d\d/],
          ['HH:mm', /\d\d:\d\d/],
          ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
          ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
          ['HHmmss', /\d\d\d\d\d\d/],
          ['HHmm', /\d\d\d\d/],
          ['HH', /\d\d/],
        ],
        bt = /^\/?Date\((-?\d+)/i,
        at =
          /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/,
        e = {
          UT: 0,
          GMT: 0,
          EDT: -240,
          EST: -300,
          CDT: -300,
          CST: -360,
          MDT: -360,
          MST: -420,
          PDT: -420,
          PST: -480,
        }
      function s(a) {
        var t,
          r,
          n = a._i,
          d = ne.exec(n) || ys.exec(n),
          o,
          m,
          L,
          y,
          D = va.length,
          Q = He.length
        if (d) {
          for (f(a).iso = !0, t = 0, r = D; t < r; t++)
            if (va[t][1].exec(d[1])) {
              ;((m = va[t][0]), (o = va[t][2] !== !1))
              break
            }
          if (m == null) {
            a._isValid = !1
            return
          }
          if (d[3]) {
            for (t = 0, r = Q; t < r; t++)
              if (He[t][1].exec(d[3])) {
                L = (d[2] || ' ') + He[t][0]
                break
              }
            if (L == null) {
              a._isValid = !1
              return
            }
          }
          if (!o && L != null) {
            a._isValid = !1
            return
          }
          if (d[4])
            if (Pe.exec(d[4])) y = 'Z'
            else {
              a._isValid = !1
              return
            }
          ;((a._f = m + (L || '') + (y || '')), ks(a))
        } else a._isValid = !1
      }
      function i(a, t, r, n, d, o) {
        var m = [
          _(a),
          Lt.indexOf(t),
          parseInt(r, 10),
          parseInt(n, 10),
          parseInt(d, 10),
        ]
        return (o && m.push(parseInt(o, 10)), m)
      }
      function _(a) {
        var t = parseInt(a, 10)
        return t <= 49 ? 2e3 + t : t <= 999 ? 1900 + t : t
      }
      function l(a) {
        return a
          .replace(/\([^()]*\)|[\n\t]/g, ' ')
          .replace(/(\s\s+)/g, ' ')
          .replace(/^\s\s*/, '')
          .replace(/\s\s*$/, '')
      }
      function K(a, t, r) {
        if (a) {
          var n = pt.indexOf(a),
            d = new Date(t[0], t[1], t[2]).getDay()
          if (n !== d)
            return ((f(r).weekdayMismatch = !0), (r._isValid = !1), !1)
        }
        return !0
      }
      function _e(a, t, r) {
        if (a) return e[a]
        if (t) return 0
        var n = parseInt(r, 10),
          d = n % 100,
          o = (n - d) / 100
        return o * 60 + d
      }
      function Os(a) {
        var t = at.exec(l(a._i)),
          r
        if (t) {
          if (((r = i(t[4], t[3], t[2], t[5], t[6], t[7])), !K(t[1], r, a)))
            return
          ;((a._a = r),
            (a._tzm = _e(t[8], t[9], t[10])),
            (a._d = Ue.apply(null, a._a)),
            a._d.setUTCMinutes(a._d.getUTCMinutes() - a._tzm),
            (f(a).rfc2822 = !0))
        } else a._isValid = !1
      }
      function or(a) {
        var t = bt.exec(a._i)
        if (t !== null) {
          a._d = new Date(+t[1])
          return
        }
        if ((s(a), a._isValid === !1)) delete a._isValid
        else return
        if ((Os(a), a._isValid === !1)) delete a._isValid
        else return
        a._strict ? (a._isValid = !1) : M.createFromInputFallback(a)
      }
      M.createFromInputFallback = X(
        'value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are discouraged. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.',
        function (a) {
          a._d = new Date(a._i + (a._useUTC ? ' UTC' : ''))
        },
      )
      function Ha(a, t, r) {
        return a ?? t ?? r
      }
      function lr(a) {
        var t = new Date(M.now())
        return a._useUTC
          ? [t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()]
          : [t.getFullYear(), t.getMonth(), t.getDate()]
      }
      function fs(a) {
        var t,
          r,
          n = [],
          d,
          o,
          m
        if (!a._d) {
          for (
            d = lr(a),
              a._w && a._a[Me] == null && a._a[Te] == null && ur(a),
              a._dayOfYear != null &&
                ((m = Ha(a._a[z], d[z])),
                (a._dayOfYear > na(m) || a._dayOfYear === 0) &&
                  (f(a)._overflowDayOfYear = !0),
                (r = Ue(m, 0, a._dayOfYear)),
                (a._a[Te] = r.getUTCMonth()),
                (a._a[Me] = r.getUTCDate())),
              t = 0;
            t < 3 && a._a[t] == null;
            ++t
          )
            a._a[t] = n[t] = d[t]
          for (; t < 7; t++)
            a._a[t] = n[t] = a._a[t] == null ? (t === 2 ? 1 : 0) : a._a[t]
          ;(a._a[W] === 24 &&
            a._a[x] === 0 &&
            a._a[O] === 0 &&
            a._a[be] === 0 &&
            ((a._nextDay = !0), (a._a[W] = 0)),
            (a._d = (a._useUTC ? Ue : Ce).apply(null, n)),
            (o = a._useUTC ? a._d.getUTCDay() : a._d.getDay()),
            a._tzm != null && a._d.setUTCMinutes(a._d.getUTCMinutes() - a._tzm),
            a._nextDay && (a._a[W] = 24),
            a._w &&
              typeof a._w.d < 'u' &&
              a._w.d !== o &&
              (f(a).weekdayMismatch = !0))
        }
      }
      function ur(a) {
        var t, r, n, d, o, m, L, y, D
        ;((t = a._w),
          t.GG != null || t.W != null || t.E != null
            ? ((o = 1),
              (m = 4),
              (r = Ha(t.GG, a._a[z], Ge(j(), 1, 4).year)),
              (n = Ha(t.W, 1)),
              (d = Ha(t.E, 1)),
              (d < 1 || d > 7) && (y = !0))
            : ((o = a._locale._week.dow),
              (m = a._locale._week.doy),
              (D = Ge(j(), o, m)),
              (r = Ha(t.gg, a._a[z], D.year)),
              (n = Ha(t.w, D.week)),
              t.d != null
                ? ((d = t.d), (d < 0 || d > 6) && (y = !0))
                : t.e != null
                  ? ((d = t.e + o), (t.e < 0 || t.e > 6) && (y = !0))
                  : (d = o)),
          n < 1 || n > he(r, o, m)
            ? (f(a)._overflowWeeks = !0)
            : y != null
              ? (f(a)._overflowWeekday = !0)
              : ((L = je(r, n, d, o, m)),
                (a._a[z] = L.year),
                (a._dayOfYear = L.dayOfYear)))
      }
      ;((M.ISO_8601 = function () {}), (M.RFC_2822 = function () {}))
      function ks(a) {
        if (a._f === M.ISO_8601) {
          s(a)
          return
        }
        if (a._f === M.RFC_2822) {
          Os(a)
          return
        }
        ;((a._a = []), (f(a).empty = !0))
        var t = '' + a._i,
          r,
          n,
          d,
          o,
          m,
          L = t.length,
          y = 0,
          D,
          Q
        for (
          d = _t(a._f, a._locale).match(La) || [], Q = d.length, r = 0;
          r < Q;
          r++
        )
          ((o = d[r]),
            (n = (t.match(ht(o, a)) || [])[0]),
            n &&
              ((m = t.substr(0, t.indexOf(n))),
              m.length > 0 && f(a).unusedInput.push(m),
              (t = t.slice(t.indexOf(n) + n.length)),
              (y += n.length)),
            ze[o]
              ? (n ? (f(a).empty = !1) : f(a).unusedTokens.push(o), Gt(o, n, a))
              : a._strict && !n && f(a).unusedTokens.push(o))
        ;((f(a).charsLeftOver = L - y),
          t.length > 0 && f(a).unusedInput.push(t),
          a._a[W] <= 12 &&
            f(a).bigHour === !0 &&
            a._a[W] > 0 &&
            (f(a).bigHour = void 0),
          (f(a).parsedDateParts = a._a.slice(0)),
          (f(a).meridiem = a._meridiem),
          (a._a[W] = mr(a._locale, a._a[W], a._meridiem)),
          (D = f(a).era),
          D !== null && (a._a[z] = a._locale.erasConvertYear(D, a._a[z])),
          fs(a),
          _a(a))
      }
      function mr(a, t, r) {
        var n
        return r == null
          ? t
          : a.meridiemHour != null
            ? a.meridiemHour(t, r)
            : (a.isPM != null &&
                ((n = a.isPM(r)),
                n && t < 12 && (t += 12),
                !n && t === 12 && (t = 0)),
              t)
      }
      function Mr(a) {
        var t,
          r,
          n,
          d,
          o,
          m,
          L = !1,
          y = a._f.length
        if (y === 0) {
          ;((f(a).invalidFormat = !0), (a._d = new Date(NaN)))
          return
        }
        for (d = 0; d < y; d++)
          ((o = 0),
            (m = !1),
            (t = Qe({}, a)),
            a._useUTC != null && (t._useUTC = a._useUTC),
            (t._f = a._f[d]),
            ks(t),
            ma(t) && (m = !0),
            (o += f(t).charsLeftOver),
            (o += f(t).unusedTokens.length * 10),
            (f(t).score = o),
            L
              ? o < n && ((n = o), (r = t))
              : (n == null || o < n || m) && ((n = o), (r = t), m && (L = !0)))
        fe(a, r || t)
      }
      function hr(a) {
        if (!a._d) {
          var t = Fa(a._i),
            r = t.day === void 0 ? t.date : t.day
          ;((a._a = st(
            [t.year, t.month, r, t.hour, t.minute, t.second, t.millisecond],
            function (n) {
              return n && parseInt(n, 10)
            },
          )),
            fs(a))
        }
      }
      function cr(a) {
        var t = new Xe(_a(Ws(a)))
        return (t._nextDay && (t.add(1, 'd'), (t._nextDay = void 0)), t)
      }
      function Ws(a) {
        var t = a._i,
          r = a._f
        return (
          (a._locale = a._locale || C(a._l)),
          t === null || (r === void 0 && t === '')
            ? Ma({nullInput: !0})
            : (typeof t == 'string' && (a._i = t = a._locale.preparse(t)),
              A(t)
                ? new Xe(_a(t))
                : (Fe(t) ? (a._d = t) : H(r) ? Mr(a) : r ? ks(a) : Lr(a),
                  ma(a) || (a._d = null),
                  a))
        )
      }
      function Lr(a) {
        var t = a._i
        J(t)
          ? (a._d = new Date(M.now()))
          : Fe(t)
            ? (a._d = new Date(t.valueOf()))
            : typeof t == 'string'
              ? or(a)
              : H(t)
                ? ((a._a = st(t.slice(0), function (r) {
                    return parseInt(r, 10)
                  })),
                  fs(a))
                : R(t)
                  ? hr(a)
                  : P(t)
                    ? (a._d = new Date(t))
                    : M.createFromInputFallback(a)
      }
      function As(a, t, r, n, d) {
        var o = {}
        return (
          (t === !0 || t === !1) && ((n = t), (t = void 0)),
          (r === !0 || r === !1) && ((n = r), (r = void 0)),
          ((R(a) && ua(a)) || (H(a) && a.length === 0)) && (a = void 0),
          (o._isAMomentObject = !0),
          (o._useUTC = o._isUTC = d),
          (o._l = r),
          (o._i = a),
          (o._f = t),
          (o._strict = n),
          cr(o)
        )
      }
      function j(a, t, r, n) {
        return As(a, t, r, n, !1)
      }
      var Yr = X(
          'moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/',
          function () {
            var a = j.apply(null, arguments)
            return this.isValid() && a.isValid() ? (a < this ? this : a) : Ma()
          },
        ),
        yr = X(
          'moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/',
          function () {
            var a = j.apply(null, arguments)
            return this.isValid() && a.isValid() ? (a > this ? this : a) : Ma()
          },
        )
      function Es(a, t) {
        var r, n
        if ((t.length === 1 && H(t[0]) && (t = t[0]), !t.length)) return j()
        for (r = t[0], n = 1; n < t.length; ++n)
          (!t[n].isValid() || t[n][a](r)) && (r = t[n])
        return r
      }
      function fr() {
        var a = [].slice.call(arguments, 0)
        return Es('isBefore', a)
      }
      function kr() {
        var a = [].slice.call(arguments, 0)
        return Es('isAfter', a)
      }
      var pr = function () {
          return Date.now ? Date.now() : +new Date()
        },
        tt = [
          'year',
          'quarter',
          'month',
          'week',
          'day',
          'hour',
          'minute',
          'second',
          'millisecond',
        ]
      function Dr(a) {
        var t,
          r = !1,
          n,
          d = tt.length
        for (t in a)
          if (
            T(a, t) &&
            !(b.call(tt, t) !== -1 && (a[t] == null || !isNaN(a[t])))
          )
            return !1
        for (n = 0; n < d; ++n)
          if (a[tt[n]]) {
            if (r) return !1
            parseFloat(a[tt[n]]) !== k(a[tt[n]]) && (r = !0)
          }
        return !0
      }
      function Tr() {
        return this._isValid
      }
      function wr() {
        return ve(NaN)
      }
      function jt(a) {
        var t = Fa(a),
          r = t.year || 0,
          n = t.quarter || 0,
          d = t.month || 0,
          o = t.week || t.isoWeek || 0,
          m = t.day || 0,
          L = t.hour || 0,
          y = t.minute || 0,
          D = t.second || 0,
          Q = t.millisecond || 0
        ;((this._isValid = Dr(t)),
          (this._milliseconds = +Q + D * 1e3 + y * 6e4 + L * 1e3 * 60 * 60),
          (this._days = +m + o * 7),
          (this._months = +d + n * 3 + r * 12),
          (this._data = {}),
          (this._locale = C()),
          this._bubble())
      }
      function xt(a) {
        return a instanceof jt
      }
      function ps(a) {
        return a < 0 ? Math.round(-1 * a) * -1 : Math.round(a)
      }
      function gr(a, t, r) {
        var n = Math.min(a.length, t.length),
          d = Math.abs(a.length - t.length),
          o = 0,
          m
        for (m = 0; m < n; m++)
          ((r && a[m] !== t[m]) || (!r && k(a[m]) !== k(t[m]))) && o++
        return o + d
      }
      function Fs(a, t) {
        Y(a, 0, 0, function () {
          var r = this.utcOffset(),
            n = '+'
          return (
            r < 0 && ((r = -r), (n = '-')),
            n + ee(~~(r / 60), 2) + t + ee(~~r % 60, 2)
          )
        })
      }
      ;(Fs('Z', ':'),
        Fs('ZZ', ''),
        c('Z', pa),
        c('ZZ', pa),
        v(['Z', 'ZZ'], function (a, t, r) {
          ;((r._useUTC = !0), (r._tzm = Ds(pa, a)))
        }))
      var vr = /([+\-]|\d\d)/gi
      function Ds(a, t) {
        var r = (t || '').match(a),
          n,
          d,
          o
        return r === null
          ? null
          : ((n = r[r.length - 1] || []),
            (d = (n + '').match(vr) || ['-', 0, 0]),
            (o = +(d[1] * 60) + k(d[2])),
            o === 0 ? 0 : d[0] === '+' ? o : -o)
      }
      function Ts(a, t) {
        var r, n
        return t._isUTC
          ? ((r = t.clone()),
            (n = (A(a) || Fe(a) ? a.valueOf() : j(a).valueOf()) - r.valueOf()),
            r._d.setTime(r._d.valueOf() + n),
            M.updateOffset(r, !1),
            r)
          : j(a).local()
      }
      function ws(a) {
        return -Math.round(a._d.getTimezoneOffset())
      }
      M.updateOffset = function () {}
      function Hr(a, t, r) {
        var n = this._offset || 0,
          d
        if (!this.isValid()) return a != null ? this : NaN
        if (a != null) {
          if (typeof a == 'string') {
            if (((a = Ds(pa, a)), a === null)) return this
          } else Math.abs(a) < 16 && !r && (a = a * 60)
          return (
            !this._isUTC && t && (d = ws(this)),
            (this._offset = a),
            (this._isUTC = !0),
            d != null && this.add(d, 'm'),
            n !== a &&
              (!t || this._changeInProgress
                ? Js(this, ve(a - n, 'm'), 1, !1)
                : this._changeInProgress ||
                  ((this._changeInProgress = !0),
                  M.updateOffset(this, !0),
                  (this._changeInProgress = null))),
            this
          )
        } else return this._isUTC ? n : ws(this)
      }
      function Sr(a, t) {
        return a != null
          ? (typeof a != 'string' && (a = -a), this.utcOffset(a, t), this)
          : -this.utcOffset()
      }
      function br(a) {
        return this.utcOffset(0, a)
      }
      function jr(a) {
        return (
          this._isUTC &&
            (this.utcOffset(0, a),
            (this._isUTC = !1),
            a && this.subtract(ws(this), 'm')),
          this
        )
      }
      function xr() {
        if (this._tzm != null) this.utcOffset(this._tzm, !1, !0)
        else if (typeof this._i == 'string') {
          var a = Ds(Ut, this._i)
          a != null ? this.utcOffset(a) : this.utcOffset(0, !0)
        }
        return this
      }
      function Pr(a) {
        return this.isValid()
          ? ((a = a ? j(a).utcOffset() : 0), (this.utcOffset() - a) % 60 === 0)
          : !1
      }
      function Or() {
        return (
          this.utcOffset() > this.clone().month(0).utcOffset() ||
          this.utcOffset() > this.clone().month(5).utcOffset()
        )
      }
      function Wr() {
        if (!J(this._isDSTShifted)) return this._isDSTShifted
        var a = {},
          t
        return (
          Qe(a, this),
          (a = Ws(a)),
          a._a
            ? ((t = a._isUTC ? oe(a._a) : j(a._a)),
              (this._isDSTShifted =
                this.isValid() && gr(a._a, t.toArray()) > 0))
            : (this._isDSTShifted = !1),
          this._isDSTShifted
        )
      }
      function Ar() {
        return this.isValid() ? !this._isUTC : !1
      }
      function Er() {
        return this.isValid() ? this._isUTC : !1
      }
      function zs() {
        return this.isValid() ? this._isUTC && this._offset === 0 : !1
      }
      var Fr = /^(-|\+)?(?:(\d*)[. ])?(\d+):(\d+)(?::(\d+)(\.\d*)?)?$/,
        zr =
          /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/
      function ve(a, t) {
        var r = a,
          n = null,
          d,
          o,
          m
        return (
          xt(a)
            ? (r = {ms: a._milliseconds, d: a._days, M: a._months})
            : P(a) || !isNaN(+a)
              ? ((r = {}), t ? (r[t] = +a) : (r.milliseconds = +a))
              : (n = Fr.exec(a))
                ? ((d = n[1] === '-' ? -1 : 1),
                  (r = {
                    y: 0,
                    d: k(n[Me]) * d,
                    h: k(n[W]) * d,
                    m: k(n[x]) * d,
                    s: k(n[O]) * d,
                    ms: k(ps(n[be] * 1e3)) * d,
                  }))
                : (n = zr.exec(a))
                  ? ((d = n[1] === '-' ? -1 : 1),
                    (r = {
                      y: oa(n[2], d),
                      M: oa(n[3], d),
                      w: oa(n[4], d),
                      d: oa(n[5], d),
                      h: oa(n[6], d),
                      m: oa(n[7], d),
                      s: oa(n[8], d),
                    }))
                  : r == null
                    ? (r = {})
                    : typeof r == 'object' &&
                      ('from' in r || 'to' in r) &&
                      ((m = Nr(j(r.from), j(r.to))),
                      (r = {}),
                      (r.ms = m.milliseconds),
                      (r.M = m.months)),
          (o = new jt(r)),
          xt(a) && T(a, '_locale') && (o._locale = a._locale),
          xt(a) && T(a, '_isValid') && (o._isValid = a._isValid),
          o
        )
      }
      ;((ve.fn = jt.prototype), (ve.invalid = wr))
      function oa(a, t) {
        var r = a && parseFloat(a.replace(',', '.'))
        return (isNaN(r) ? 0 : r) * t
      }
      function Ns(a, t) {
        var r = {}
        return (
          (r.months = t.month() - a.month() + (t.year() - a.year()) * 12),
          a.clone().add(r.months, 'M').isAfter(t) && --r.months,
          (r.milliseconds = +t - +a.clone().add(r.months, 'M')),
          r
        )
      }
      function Nr(a, t) {
        var r
        return a.isValid() && t.isValid()
          ? ((t = Ts(t, a)),
            a.isBefore(t)
              ? (r = Ns(a, t))
              : ((r = Ns(t, a)),
                (r.milliseconds = -r.milliseconds),
                (r.months = -r.months)),
            r)
          : {milliseconds: 0, months: 0}
      }
      function Rs(a, t) {
        return function (r, n) {
          var d, o
          return (
            n !== null &&
              !isNaN(+n) &&
              (dt(
                t,
                'moment().' +
                  t +
                  '(period, number) is deprecated. Please use moment().' +
                  t +
                  '(number, period). See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.',
              ),
              (o = r),
              (r = n),
              (n = o)),
            (d = ve(r, n)),
            Js(this, d, a),
            this
          )
        }
      }
      function Js(a, t, r, n) {
        var d = t._milliseconds,
          o = ps(t._days),
          m = ps(t._months)
        a.isValid() &&
          ((n = n ?? !0),
          m && Ie(a, da(a, 'Month') + m * r),
          o && B(a, 'Date', da(a, 'Date') + o * r),
          d && a._d.setTime(a._d.valueOf() + d * r),
          n && M.updateOffset(a, o || m))
      }
      var Rr = Rs(1, 'add'),
        Jr = Rs(-1, 'subtract')
      function Is(a) {
        return typeof a == 'string' || a instanceof String
      }
      function Ir(a) {
        return (
          A(a) ||
          Fe(a) ||
          Is(a) ||
          P(a) ||
          Cr(a) ||
          $r(a) ||
          a === null ||
          a === void 0
        )
      }
      function $r(a) {
        var t = R(a) && !ua(a),
          r = !1,
          n = [
            'years',
            'year',
            'y',
            'months',
            'month',
            'M',
            'days',
            'day',
            'd',
            'dates',
            'date',
            'D',
            'hours',
            'hour',
            'h',
            'minutes',
            'minute',
            'm',
            'seconds',
            'second',
            's',
            'milliseconds',
            'millisecond',
            'ms',
          ],
          d,
          o,
          m = n.length
        for (d = 0; d < m; d += 1) ((o = n[d]), (r = r || T(a, o)))
        return t && r
      }
      function Cr(a) {
        var t = H(a),
          r = !1
        return (
          t &&
            (r =
              a.filter(function (n) {
                return !P(n) && Is(a)
              }).length === 0),
          t && r
        )
      }
      function Ur(a) {
        var t = R(a) && !ua(a),
          r = !1,
          n = [
            'sameDay',
            'nextDay',
            'lastDay',
            'nextWeek',
            'lastWeek',
            'sameElse',
          ],
          d,
          o
        for (d = 0; d < n.length; d += 1) ((o = n[d]), (r = r || T(a, o)))
        return t && r
      }
      function Gr(a, t) {
        var r = a.diff(t, 'days', !0)
        return r < -6
          ? 'sameElse'
          : r < -1
            ? 'lastWeek'
            : r < 0
              ? 'lastDay'
              : r < 1
                ? 'sameDay'
                : r < 2
                  ? 'nextDay'
                  : r < 7
                    ? 'nextWeek'
                    : 'sameElse'
      }
      function Vr(a, t) {
        arguments.length === 1 &&
          (arguments[0]
            ? Ir(arguments[0])
              ? ((a = arguments[0]), (t = void 0))
              : Ur(arguments[0]) && ((t = arguments[0]), (a = void 0))
            : ((a = void 0), (t = void 0)))
        var r = a || j(),
          n = Ts(r, this).startOf('day'),
          d = M.calendarFormat(this, n) || 'sameElse',
          o = t && (le(t[d]) ? t[d].call(this, r) : t[d])
        return this.format(o || this.localeData().calendar(d, this, j(r)))
      }
      function qr() {
        return new Xe(this)
      }
      function Br(a, t) {
        var r = A(a) ? a : j(a)
        return this.isValid() && r.isValid()
          ? ((t = G(t) || 'millisecond'),
            t === 'millisecond'
              ? this.valueOf() > r.valueOf()
              : r.valueOf() < this.clone().startOf(t).valueOf())
          : !1
      }
      function Zr(a, t) {
        var r = A(a) ? a : j(a)
        return this.isValid() && r.isValid()
          ? ((t = G(t) || 'millisecond'),
            t === 'millisecond'
              ? this.valueOf() < r.valueOf()
              : this.clone().endOf(t).valueOf() < r.valueOf())
          : !1
      }
      function Kr(a, t, r, n) {
        var d = A(a) ? a : j(a),
          o = A(t) ? t : j(t)
        return this.isValid() && d.isValid() && o.isValid()
          ? ((n = n || '()'),
            (n[0] === '(' ? this.isAfter(d, r) : !this.isBefore(d, r)) &&
              (n[1] === ')' ? this.isBefore(o, r) : !this.isAfter(o, r)))
          : !1
      }
      function Qr(a, t) {
        var r = A(a) ? a : j(a),
          n
        return this.isValid() && r.isValid()
          ? ((t = G(t) || 'millisecond'),
            t === 'millisecond'
              ? this.valueOf() === r.valueOf()
              : ((n = r.valueOf()),
                this.clone().startOf(t).valueOf() <= n &&
                  n <= this.clone().endOf(t).valueOf()))
          : !1
      }
      function Xr(a, t) {
        return this.isSame(a, t) || this.isAfter(a, t)
      }
      function en(a, t) {
        return this.isSame(a, t) || this.isBefore(a, t)
      }
      function an(a, t, r) {
        var n, d, o
        if (!this.isValid()) return NaN
        if (((n = Ts(a, this)), !n.isValid())) return NaN
        switch (
          ((d = (n.utcOffset() - this.utcOffset()) * 6e4), (t = G(t)), t)
        ) {
          case 'year':
            o = Pt(this, n) / 12
            break
          case 'month':
            o = Pt(this, n)
            break
          case 'quarter':
            o = Pt(this, n) / 3
            break
          case 'second':
            o = (this - n) / 1e3
            break
          case 'minute':
            o = (this - n) / 6e4
            break
          case 'hour':
            o = (this - n) / 36e5
            break
          case 'day':
            o = (this - n - d) / 864e5
            break
          case 'week':
            o = (this - n - d) / 6048e5
            break
          default:
            o = this - n
        }
        return r ? o : te(o)
      }
      function Pt(a, t) {
        if (a.date() < t.date()) return -Pt(t, a)
        var r = (t.year() - a.year()) * 12 + (t.month() - a.month()),
          n = a.clone().add(r, 'months'),
          d,
          o
        return (
          t - n < 0
            ? ((d = a.clone().add(r - 1, 'months')), (o = (t - n) / (n - d)))
            : ((d = a.clone().add(r + 1, 'months')), (o = (t - n) / (d - n))),
          -(r + o) || 0
        )
      }
      ;((M.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ'),
        (M.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]'))
      function tn() {
        return this.clone()
          .locale('en')
          .format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ')
      }
      function sn(a) {
        if (!this.isValid()) return null
        var t = a !== !0,
          r = t ? this.clone().utc() : this
        return r.year() < 0 || r.year() > 9999
          ? ue(
              r,
              t
                ? 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]'
                : 'YYYYYY-MM-DD[T]HH:mm:ss.SSSZ',
            )
          : le(Date.prototype.toISOString)
            ? t
              ? this.toDate().toISOString()
              : new Date(this.valueOf() + this.utcOffset() * 60 * 1e3)
                  .toISOString()
                  .replace('Z', ue(r, 'Z'))
            : ue(
                r,
                t
                  ? 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]'
                  : 'YYYY-MM-DD[T]HH:mm:ss.SSSZ',
              )
      }
      function rn() {
        if (!this.isValid()) return 'moment.invalid(/* ' + this._i + ' */)'
        var a = 'moment',
          t = '',
          r,
          n,
          d,
          o
        return (
          this.isLocal() ||
            ((a = this.utcOffset() === 0 ? 'moment.utc' : 'moment.parseZone'),
            (t = 'Z')),
          (r = '[' + a + '("]'),
          (n = 0 <= this.year() && this.year() <= 9999 ? 'YYYY' : 'YYYYYY'),
          (d = '-MM-DD[T]HH:mm:ss.SSS'),
          (o = t + '[")]'),
          this.format(r + n + d + o)
        )
      }
      function nn(a) {
        a || (a = this.isUtc() ? M.defaultFormatUtc : M.defaultFormat)
        var t = ue(this, a)
        return this.localeData().postformat(t)
      }
      function dn(a, t) {
        return this.isValid() && ((A(a) && a.isValid()) || j(a).isValid())
          ? ve({to: this, from: a}).locale(this.locale()).humanize(!t)
          : this.localeData().invalidDate()
      }
      function _n(a) {
        return this.from(j(), a)
      }
      function on(a, t) {
        return this.isValid() && ((A(a) && a.isValid()) || j(a).isValid())
          ? ve({from: this, to: a}).locale(this.locale()).humanize(!t)
          : this.localeData().invalidDate()
      }
      function ln(a) {
        return this.to(j(), a)
      }
      function $s(a) {
        var t
        return a === void 0
          ? this._locale._abbr
          : ((t = C(a)), t != null && (this._locale = t), this)
      }
      var Cs = X(
        'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
        function (a) {
          return a === void 0 ? this.localeData() : this.locale(a)
        },
      )
      function Us() {
        return this._locale
      }
      var Ot = 1e3,
        Sa = 60 * Ot,
        Wt = 60 * Sa,
        Gs = (365 * 400 + 97) * 24 * Wt
      function ba(a, t) {
        return ((a % t) + t) % t
      }
      function Vs(a, t, r) {
        return a < 100 && a >= 0
          ? new Date(a + 400, t, r) - Gs
          : new Date(a, t, r).valueOf()
      }
      function qs(a, t, r) {
        return a < 100 && a >= 0
          ? Date.UTC(a + 400, t, r) - Gs
          : Date.UTC(a, t, r)
      }
      function un(a) {
        var t, r
        if (
          ((a = G(a)), a === void 0 || a === 'millisecond' || !this.isValid())
        )
          return this
        switch (((r = this._isUTC ? qs : Vs), a)) {
          case 'year':
            t = r(this.year(), 0, 1)
            break
          case 'quarter':
            t = r(this.year(), this.month() - (this.month() % 3), 1)
            break
          case 'month':
            t = r(this.year(), this.month(), 1)
            break
          case 'week':
            t = r(this.year(), this.month(), this.date() - this.weekday())
            break
          case 'isoWeek':
            t = r(
              this.year(),
              this.month(),
              this.date() - (this.isoWeekday() - 1),
            )
            break
          case 'day':
          case 'date':
            t = r(this.year(), this.month(), this.date())
            break
          case 'hour':
            ;((t = this._d.valueOf()),
              (t -= ba(t + (this._isUTC ? 0 : this.utcOffset() * Sa), Wt)))
            break
          case 'minute':
            ;((t = this._d.valueOf()), (t -= ba(t, Sa)))
            break
          case 'second':
            ;((t = this._d.valueOf()), (t -= ba(t, Ot)))
            break
        }
        return (this._d.setTime(t), M.updateOffset(this, !0), this)
      }
      function mn(a) {
        var t, r
        if (
          ((a = G(a)), a === void 0 || a === 'millisecond' || !this.isValid())
        )
          return this
        switch (((r = this._isUTC ? qs : Vs), a)) {
          case 'year':
            t = r(this.year() + 1, 0, 1) - 1
            break
          case 'quarter':
            t = r(this.year(), this.month() - (this.month() % 3) + 3, 1) - 1
            break
          case 'month':
            t = r(this.year(), this.month() + 1, 1) - 1
            break
          case 'week':
            t =
              r(this.year(), this.month(), this.date() - this.weekday() + 7) - 1
            break
          case 'isoWeek':
            t =
              r(
                this.year(),
                this.month(),
                this.date() - (this.isoWeekday() - 1) + 7,
              ) - 1
            break
          case 'day':
          case 'date':
            t = r(this.year(), this.month(), this.date() + 1) - 1
            break
          case 'hour':
            ;((t = this._d.valueOf()),
              (t +=
                Wt - ba(t + (this._isUTC ? 0 : this.utcOffset() * Sa), Wt) - 1))
            break
          case 'minute':
            ;((t = this._d.valueOf()), (t += Sa - ba(t, Sa) - 1))
            break
          case 'second':
            ;((t = this._d.valueOf()), (t += Ot - ba(t, Ot) - 1))
            break
        }
        return (this._d.setTime(t), M.updateOffset(this, !0), this)
      }
      function Mn() {
        return this._d.valueOf() - (this._offset || 0) * 6e4
      }
      function hn() {
        return Math.floor(this.valueOf() / 1e3)
      }
      function cn() {
        return new Date(this.valueOf())
      }
      function Ln() {
        var a = this
        return [
          a.year(),
          a.month(),
          a.date(),
          a.hour(),
          a.minute(),
          a.second(),
          a.millisecond(),
        ]
      }
      function Yn() {
        var a = this
        return {
          years: a.year(),
          months: a.month(),
          date: a.date(),
          hours: a.hours(),
          minutes: a.minutes(),
          seconds: a.seconds(),
          milliseconds: a.milliseconds(),
        }
      }
      function yn() {
        return this.isValid() ? this.toISOString() : null
      }
      function fn() {
        return ma(this)
      }
      function kn() {
        return fe({}, f(this))
      }
      function pn() {
        return f(this).overflow
      }
      function Dn() {
        return {
          input: this._i,
          format: this._f,
          locale: this._locale,
          isUTC: this._isUTC,
          strict: this._strict,
        }
      }
      ;(Y('N', 0, 0, 'eraAbbr'),
        Y('NN', 0, 0, 'eraAbbr'),
        Y('NNN', 0, 0, 'eraAbbr'),
        Y('NNNN', 0, 0, 'eraName'),
        Y('NNNNN', 0, 0, 'eraNarrow'),
        Y('y', ['y', 1], 'yo', 'eraYear'),
        Y('y', ['yy', 2], 0, 'eraYear'),
        Y('y', ['yyy', 3], 0, 'eraYear'),
        Y('y', ['yyyy', 4], 0, 'eraYear'),
        c('N', gs),
        c('NN', gs),
        c('NNN', gs),
        c('NNNN', On),
        c('NNNNN', Wn),
        v(['N', 'NN', 'NNN', 'NNNN', 'NNNNN'], function (a, t, r, n) {
          var d = r._locale.erasParse(a, n, r._strict)
          d ? (f(r).era = d) : (f(r).invalidEra = a)
        }),
        c('y', Se),
        c('yy', Se),
        c('yyy', Se),
        c('yyyy', Se),
        c('yo', An),
        v(['y', 'yy', 'yyy', 'yyyy'], z),
        v(['yo'], function (a, t, r, n) {
          var d
          ;(r._locale._eraYearOrdinalRegex &&
            (d = a.match(r._locale._eraYearOrdinalRegex)),
            r._locale.eraYearOrdinalParse
              ? (t[z] = r._locale.eraYearOrdinalParse(a, d))
              : (t[z] = parseInt(a, 10)))
        }))
      function Tn(a, t) {
        var r,
          n,
          d,
          o = this._eras || C('en')._eras
        for (r = 0, n = o.length; r < n; ++r) {
          switch (typeof o[r].since) {
            case 'string':
              ;((d = M(o[r].since).startOf('day')), (o[r].since = d.valueOf()))
              break
          }
          switch (typeof o[r].until) {
            case 'undefined':
              o[r].until = 1 / 0
              break
            case 'string':
              ;((d = M(o[r].until).startOf('day').valueOf()),
                (o[r].until = d.valueOf()))
              break
          }
        }
        return o
      }
      function wn(a, t, r) {
        var n,
          d,
          o = this.eras(),
          m,
          L,
          y
        for (a = a.toUpperCase(), n = 0, d = o.length; n < d; ++n)
          if (
            ((m = o[n].name.toUpperCase()),
            (L = o[n].abbr.toUpperCase()),
            (y = o[n].narrow.toUpperCase()),
            r)
          )
            switch (t) {
              case 'N':
              case 'NN':
              case 'NNN':
                if (L === a) return o[n]
                break
              case 'NNNN':
                if (m === a) return o[n]
                break
              case 'NNNNN':
                if (y === a) return o[n]
                break
            }
          else if ([m, L, y].indexOf(a) >= 0) return o[n]
      }
      function gn(a, t) {
        var r = a.since <= a.until ? 1 : -1
        return t === void 0
          ? M(a.since).year()
          : M(a.since).year() + (t - a.offset) * r
      }
      function vn() {
        var a,
          t,
          r,
          n = this.localeData().eras()
        for (a = 0, t = n.length; a < t; ++a)
          if (
            ((r = this.clone().startOf('day').valueOf()),
            (n[a].since <= r && r <= n[a].until) ||
              (n[a].until <= r && r <= n[a].since))
          )
            return n[a].name
        return ''
      }
      function Hn() {
        var a,
          t,
          r,
          n = this.localeData().eras()
        for (a = 0, t = n.length; a < t; ++a)
          if (
            ((r = this.clone().startOf('day').valueOf()),
            (n[a].since <= r && r <= n[a].until) ||
              (n[a].until <= r && r <= n[a].since))
          )
            return n[a].narrow
        return ''
      }
      function Sn() {
        var a,
          t,
          r,
          n = this.localeData().eras()
        for (a = 0, t = n.length; a < t; ++a)
          if (
            ((r = this.clone().startOf('day').valueOf()),
            (n[a].since <= r && r <= n[a].until) ||
              (n[a].until <= r && r <= n[a].since))
          )
            return n[a].abbr
        return ''
      }
      function bn() {
        var a,
          t,
          r,
          n,
          d = this.localeData().eras()
        for (a = 0, t = d.length; a < t; ++a)
          if (
            ((r = d[a].since <= d[a].until ? 1 : -1),
            (n = this.clone().startOf('day').valueOf()),
            (d[a].since <= n && n <= d[a].until) ||
              (d[a].until <= n && n <= d[a].since))
          )
            return (this.year() - M(d[a].since).year()) * r + d[a].offset
        return this.year()
      }
      function jn(a) {
        return (
          T(this, '_erasNameRegex') || vs.call(this),
          a ? this._erasNameRegex : this._erasRegex
        )
      }
      function xn(a) {
        return (
          T(this, '_erasAbbrRegex') || vs.call(this),
          a ? this._erasAbbrRegex : this._erasRegex
        )
      }
      function Pn(a) {
        return (
          T(this, '_erasNarrowRegex') || vs.call(this),
          a ? this._erasNarrowRegex : this._erasRegex
        )
      }
      function gs(a, t) {
        return t.erasAbbrRegex(a)
      }
      function On(a, t) {
        return t.erasNameRegex(a)
      }
      function Wn(a, t) {
        return t.erasNarrowRegex(a)
      }
      function An(a, t) {
        return t._eraYearOrdinalRegex || Se
      }
      function vs() {
        var a = [],
          t = [],
          r = [],
          n = [],
          d,
          o,
          m,
          L,
          y,
          D = this.eras()
        for (d = 0, o = D.length; d < o; ++d)
          ((m = me(D[d].name)),
            (L = me(D[d].abbr)),
            (y = me(D[d].narrow)),
            t.push(m),
            a.push(L),
            r.push(y),
            n.push(m),
            n.push(L),
            n.push(y))
        ;((this._erasRegex = new RegExp('^(' + n.join('|') + ')', 'i')),
          (this._erasNameRegex = new RegExp('^(' + t.join('|') + ')', 'i')),
          (this._erasAbbrRegex = new RegExp('^(' + a.join('|') + ')', 'i')),
          (this._erasNarrowRegex = new RegExp('^(' + r.join('|') + ')', 'i')))
      }
      ;(Y(0, ['gg', 2], 0, function () {
        return this.weekYear() % 100
      }),
        Y(0, ['GG', 2], 0, function () {
          return this.isoWeekYear() % 100
        }))
      function At(a, t) {
        Y(0, [a, a.length], 0, t)
      }
      ;(At('gggg', 'weekYear'),
        At('ggggg', 'weekYear'),
        At('GGGG', 'isoWeekYear'),
        At('GGGGG', 'isoWeekYear'),
        c('G', I),
        c('g', I),
        c('GG', S, V),
        c('gg', S, V),
        c('GGGG', Ja, fa),
        c('gggg', Ja, fa),
        c('GGGGG', Re, aa),
        c('ggggg', Re, aa),
        ra(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (a, t, r, n) {
          t[n.substr(0, 2)] = k(a)
        }),
        ra(['gg', 'GG'], function (a, t, r, n) {
          t[n] = M.parseTwoDigitYear(a)
        }))
      function En(a) {
        return Bs.call(
          this,
          a,
          this.week(),
          this.weekday() + this.localeData()._week.dow,
          this.localeData()._week.dow,
          this.localeData()._week.doy,
        )
      }
      function Fn(a) {
        return Bs.call(this, a, this.isoWeek(), this.isoWeekday(), 1, 4)
      }
      function zn() {
        return he(this.year(), 1, 4)
      }
      function Nn() {
        return he(this.isoWeekYear(), 1, 4)
      }
      function Rn() {
        var a = this.localeData()._week
        return he(this.year(), a.dow, a.doy)
      }
      function Jn() {
        var a = this.localeData()._week
        return he(this.weekYear(), a.dow, a.doy)
      }
      function Bs(a, t, r, n, d) {
        var o
        return a == null
          ? Ge(this, n, d).year
          : ((o = he(a, n, d)), t > o && (t = o), In.call(this, a, t, r, n, d))
      }
      function In(a, t, r, n, d) {
        var o = je(a, t, r, n, d),
          m = Ue(o.year, 0, o.dayOfYear)
        return (
          this.year(m.getUTCFullYear()),
          this.month(m.getUTCMonth()),
          this.date(m.getUTCDate()),
          this
        )
      }
      ;(Y('Q', 0, 'Qo', 'quarter'),
        c('Q', Na),
        v('Q', function (a, t) {
          t[Te] = (k(a) - 1) * 3
        }))
      function $n(a) {
        return a == null
          ? Math.ceil((this.month() + 1) / 3)
          : this.month((a - 1) * 3 + (this.month() % 3))
      }
      ;(Y('D', ['DD', 2], 'Do', 'date'),
        c('D', S, E),
        c('DD', S, V),
        c('Do', function (a, t) {
          return a
            ? t._dayOfMonthOrdinalParse || t._ordinalParse
            : t._dayOfMonthOrdinalParseLenient
        }),
        v(['D', 'DD'], Me),
        v('Do', function (a, t) {
          t[Me] = k(a.match(S)[0])
        }))
      var Zs = q('Date', !0)
      ;(Y('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear'),
        c('DDD', ta),
        c('DDDD', ya),
        v(['DDD', 'DDDD'], function (a, t, r) {
          r._dayOfYear = k(a)
        }))
      function Cn(a) {
        var t =
          Math.round(
            (this.clone().startOf('day') - this.clone().startOf('year')) /
              864e5,
          ) + 1
        return a == null ? t : this.add(a - t, 'd')
      }
      ;(Y('m', ['mm', 2], 0, 'minute'),
        c('m', S, Ia),
        c('mm', S, V),
        v(['m', 'mm'], x))
      var Un = q('Minutes', !1)
      ;(Y('s', ['ss', 2], 0, 'second'),
        c('s', S, Ia),
        c('ss', S, V),
        v(['s', 'ss'], O))
      var Gn = q('Seconds', !1)
      ;(Y('S', 0, 0, function () {
        return ~~(this.millisecond() / 100)
      }),
        Y(0, ['SS', 2], 0, function () {
          return ~~(this.millisecond() / 10)
        }),
        Y(0, ['SSS', 3], 0, 'millisecond'),
        Y(0, ['SSSS', 4], 0, function () {
          return this.millisecond() * 10
        }),
        Y(0, ['SSSSS', 5], 0, function () {
          return this.millisecond() * 100
        }),
        Y(0, ['SSSSSS', 6], 0, function () {
          return this.millisecond() * 1e3
        }),
        Y(0, ['SSSSSSS', 7], 0, function () {
          return this.millisecond() * 1e4
        }),
        Y(0, ['SSSSSSSS', 8], 0, function () {
          return this.millisecond() * 1e5
        }),
        Y(0, ['SSSSSSSSS', 9], 0, function () {
          return this.millisecond() * 1e6
        }),
        c('S', ta, Na),
        c('SS', ta, V),
        c('SSS', ta, ya))
      var Ze, Ks
      for (Ze = 'SSSS'; Ze.length <= 9; Ze += 'S') c(Ze, Se)
      function Vn(a, t) {
        t[be] = k(('0.' + a) * 1e3)
      }
      for (Ze = 'S'; Ze.length <= 9; Ze += 'S') v(Ze, Vn)
      ;((Ks = q('Milliseconds', !1)),
        Y('z', 0, 0, 'zoneAbbr'),
        Y('zz', 0, 0, 'zoneName'))
      function qn() {
        return this._isUTC ? 'UTC' : ''
      }
      function Bn() {
        return this._isUTC ? 'Coordinated Universal Time' : ''
      }
      var h = Xe.prototype
      ;((h.add = Rr),
        (h.calendar = Vr),
        (h.clone = qr),
        (h.diff = an),
        (h.endOf = mn),
        (h.format = nn),
        (h.from = dn),
        (h.fromNow = _n),
        (h.to = on),
        (h.toNow = ln),
        (h.get = ct),
        (h.invalidAt = pn),
        (h.isAfter = Br),
        (h.isBefore = Zr),
        (h.isBetween = Kr),
        (h.isSame = Qr),
        (h.isSameOrAfter = Xr),
        (h.isSameOrBefore = en),
        (h.isValid = fn),
        (h.lang = Cs),
        (h.locale = $s),
        (h.localeData = Us),
        (h.max = yr),
        (h.min = Yr),
        (h.parsingFlags = kn),
        (h.set = Je),
        (h.startOf = un),
        (h.subtract = Jr),
        (h.toArray = Ln),
        (h.toObject = Yn),
        (h.toDate = cn),
        (h.toISOString = sn),
        (h.inspect = rn),
        typeof Symbol < 'u' &&
          Symbol.for != null &&
          (h[Symbol.for('nodejs.util.inspect.custom')] = function () {
            return 'Moment<' + this.format() + '>'
          }),
        (h.toJSON = yn),
        (h.toString = tn),
        (h.unix = hn),
        (h.valueOf = Mn),
        (h.creationData = Dn),
        (h.eraName = vn),
        (h.eraNarrow = Hn),
        (h.eraAbbr = Sn),
        (h.eraYear = bn),
        (h.year = Ua),
        (h.isLeapYear = Bt),
        (h.weekYear = En),
        (h.isoWeekYear = Fn),
        (h.quarter = h.quarters = $n),
        (h.month = ft),
        (h.daysInMonth = es),
        (h.week = h.weeks = se),
        (h.isoWeek = h.isoWeeks = ss),
        (h.weeksInYear = Rn),
        (h.weeksInWeekYear = Jn),
        (h.isoWeeksInYear = zn),
        (h.isoWeeksInISOWeekYear = Nn),
        (h.date = Zs),
        (h.day = h.days = os),
        (h.weekday = ls),
        (h.isoWeekday = vt),
        (h.dayOfYear = Cn),
        (h.hour = h.hours = Ms),
        (h.minute = h.minutes = Un),
        (h.second = h.seconds = Gn),
        (h.millisecond = h.milliseconds = Ks),
        (h.utcOffset = Hr),
        (h.utc = br),
        (h.local = jr),
        (h.parseZone = xr),
        (h.hasAlignedHourOffset = Pr),
        (h.isDST = Or),
        (h.isLocal = Ar),
        (h.isUtcOffset = Er),
        (h.isUtc = zs),
        (h.isUTC = zs),
        (h.zoneAbbr = qn),
        (h.zoneName = Bn),
        (h.dates = X('dates accessor is deprecated. Use date instead.', Zs)),
        (h.months = X('months accessor is deprecated. Use month instead', ft)),
        (h.years = X('years accessor is deprecated. Use year instead', Ua)),
        (h.zone = X(
          'moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/',
          Sr,
        )),
        (h.isDSTShifted = X(
          'isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information',
          Wr,
        )))
      function Zn(a) {
        return j(a * 1e3)
      }
      function Kn() {
        return j.apply(null, arguments).parseZone()
      }
      function Qs(a) {
        return a
      }
      var g = Wa.prototype
      ;((g.calendar = It),
        (g.longDateFormat = Ea),
        (g.invalidDate = Ne),
        (g.ordinal = pe),
        (g.preparse = Qs),
        (g.postformat = Qs),
        (g.relativeTime = lt),
        (g.pastFuture = ut),
        (g.set = Rt),
        (g.eras = Tn),
        (g.erasParse = wn),
        (g.erasConvertYear = gn),
        (g.erasAbbrRegex = xn),
        (g.erasNameRegex = jn),
        (g.erasNarrowRegex = Pn),
        (g.months = Qt),
        (g.monthsShort = Xt),
        (g.monthsParse = Va),
        (g.monthsRegex = as),
        (g.monthsShortRegex = $e),
        (g.week = Ve),
        (g.firstDayOfYear = ce),
        (g.firstDayOfWeek = ts),
        (g.weekdays = Tt),
        (g.weekdaysMin = _s),
        (g.weekdaysShort = wt),
        (g.weekdaysParse = gt),
        (g.weekdaysRegex = us),
        (g.weekdaysShortRegex = Ka),
        (g.weekdaysMinRegex = qe),
        (g.isPM = Ht),
        (g.meridiem = hs))
      function Et(a, t, r, n) {
        var d = C(),
          o = oe().set(n, t)
        return d[r](o, a)
      }
      function Xs(a, t, r) {
        if ((P(a) && ((t = a), (a = void 0)), (a = a || ''), t != null))
          return Et(a, t, r, 'month')
        var n,
          d = []
        for (n = 0; n < 12; n++) d[n] = Et(a, n, r, 'month')
        return d
      }
      function Hs(a, t, r, n) {
        typeof a == 'boolean'
          ? (P(t) && ((r = t), (t = void 0)), (t = t || ''))
          : ((t = a),
            (r = t),
            (a = !1),
            P(t) && ((r = t), (t = void 0)),
            (t = t || ''))
        var d = C(),
          o = a ? d._week.dow : 0,
          m,
          L = []
        if (r != null) return Et(t, (r + o) % 7, n, 'day')
        for (m = 0; m < 7; m++) L[m] = Et(t, (m + o) % 7, n, 'day')
        return L
      }
      function Qn(a, t) {
        return Xs(a, t, 'months')
      }
      function Xn(a, t) {
        return Xs(a, t, 'monthsShort')
      }
      function ed(a, t, r) {
        return Hs(a, t, r, 'weekdays')
      }
      function ad(a, t, r) {
        return Hs(a, t, r, 'weekdaysShort')
      }
      function td(a, t, r) {
        return Hs(a, t, r, 'weekdaysMin')
      }
      ;(Ye('en', {
        eras: [
          {
            since: '0001-01-01',
            until: 1 / 0,
            offset: 1,
            name: 'Anno Domini',
            narrow: 'AD',
            abbr: 'AD',
          },
          {
            since: '0000-12-31',
            until: -1 / 0,
            offset: 1,
            name: 'Before Christ',
            narrow: 'BC',
            abbr: 'BC',
          },
        ],
        dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal: function (a) {
          var t = a % 10,
            r =
              k((a % 100) / 10) === 1
                ? 'th'
                : t === 1
                  ? 'st'
                  : t === 2
                    ? 'nd'
                    : t === 3
                      ? 'rd'
                      : 'th'
          return a + r
        },
      }),
        (M.lang = X(
          'moment.lang is deprecated. Use moment.locale instead.',
          Ye,
        )),
        (M.langData = X(
          'moment.langData is deprecated. Use moment.localeData instead.',
          C,
        )))
      var Oe = Math.abs
      function sd() {
        var a = this._data
        return (
          (this._milliseconds = Oe(this._milliseconds)),
          (this._days = Oe(this._days)),
          (this._months = Oe(this._months)),
          (a.milliseconds = Oe(a.milliseconds)),
          (a.seconds = Oe(a.seconds)),
          (a.minutes = Oe(a.minutes)),
          (a.hours = Oe(a.hours)),
          (a.months = Oe(a.months)),
          (a.years = Oe(a.years)),
          this
        )
      }
      function er(a, t, r, n) {
        var d = ve(t, r)
        return (
          (a._milliseconds += n * d._milliseconds),
          (a._days += n * d._days),
          (a._months += n * d._months),
          a._bubble()
        )
      }
      function rd(a, t) {
        return er(this, a, t, 1)
      }
      function nd(a, t) {
        return er(this, a, t, -1)
      }
      function ar(a) {
        return a < 0 ? Math.floor(a) : Math.ceil(a)
      }
      function dd() {
        var a = this._milliseconds,
          t = this._days,
          r = this._months,
          n = this._data,
          d,
          o,
          m,
          L,
          y
        return (
          (a >= 0 && t >= 0 && r >= 0) ||
            (a <= 0 && t <= 0 && r <= 0) ||
            ((a += ar(Ss(r) + t) * 864e5), (t = 0), (r = 0)),
          (n.milliseconds = a % 1e3),
          (d = te(a / 1e3)),
          (n.seconds = d % 60),
          (o = te(d / 60)),
          (n.minutes = o % 60),
          (m = te(o / 60)),
          (n.hours = m % 24),
          (t += te(m / 24)),
          (y = te(tr(t))),
          (r += y),
          (t -= ar(Ss(y))),
          (L = te(r / 12)),
          (r %= 12),
          (n.days = t),
          (n.months = r),
          (n.years = L),
          this
        )
      }
      function tr(a) {
        return (a * 4800) / 146097
      }
      function Ss(a) {
        return (a * 146097) / 4800
      }
      function id(a) {
        if (!this.isValid()) return NaN
        var t,
          r,
          n = this._milliseconds
        if (((a = G(a)), a === 'month' || a === 'quarter' || a === 'year'))
          switch (
            ((t = this._days + n / 864e5), (r = this._months + tr(t)), a)
          ) {
            case 'month':
              return r
            case 'quarter':
              return r / 3
            case 'year':
              return r / 12
          }
        else
          switch (((t = this._days + Math.round(Ss(this._months))), a)) {
            case 'week':
              return t / 7 + n / 6048e5
            case 'day':
              return t + n / 864e5
            case 'hour':
              return t * 24 + n / 36e5
            case 'minute':
              return t * 1440 + n / 6e4
            case 'second':
              return t * 86400 + n / 1e3
            case 'millisecond':
              return Math.floor(t * 864e5) + n
            default:
              throw new Error('Unknown unit ' + a)
          }
      }
      function We(a) {
        return function () {
          return this.as(a)
        }
      }
      var sr = We('ms'),
        _d = We('s'),
        od = We('m'),
        ld = We('h'),
        ud = We('d'),
        md = We('w'),
        Md = We('M'),
        hd = We('Q'),
        cd = We('y'),
        Ld = sr
      function Yd() {
        return ve(this)
      }
      function yd(a) {
        return ((a = G(a)), this.isValid() ? this[a + 's']() : NaN)
      }
      function la(a) {
        return function () {
          return this.isValid() ? this._data[a] : NaN
        }
      }
      var fd = la('milliseconds'),
        kd = la('seconds'),
        pd = la('minutes'),
        Dd = la('hours'),
        Td = la('days'),
        wd = la('months'),
        gd = la('years')
      function vd() {
        return te(this.days() / 7)
      }
      var Ae = Math.round,
        ja = {ss: 44, s: 45, m: 45, h: 22, d: 26, w: null, M: 11}
      function Hd(a, t, r, n, d) {
        return d.relativeTime(t || 1, !!r, a, n)
      }
      function Sd(a, t, r, n) {
        var d = ve(a).abs(),
          o = Ae(d.as('s')),
          m = Ae(d.as('m')),
          L = Ae(d.as('h')),
          y = Ae(d.as('d')),
          D = Ae(d.as('M')),
          Q = Ae(d.as('w')),
          Ee = Ae(d.as('y')),
          Ke =
            (o <= r.ss && ['s', o]) ||
            (o < r.s && ['ss', o]) ||
            (m <= 1 && ['m']) ||
            (m < r.m && ['mm', m]) ||
            (L <= 1 && ['h']) ||
            (L < r.h && ['hh', L]) ||
            (y <= 1 && ['d']) ||
            (y < r.d && ['dd', y])
        return (
          r.w != null &&
            (Ke = Ke || (Q <= 1 && ['w']) || (Q < r.w && ['ww', Q])),
          (Ke = Ke ||
            (D <= 1 && ['M']) ||
            (D < r.M && ['MM', D]) ||
            (Ee <= 1 && ['y']) || ['yy', Ee]),
          (Ke[2] = t),
          (Ke[3] = +a > 0),
          (Ke[4] = n),
          Hd.apply(null, Ke)
        )
      }
      function bd(a) {
        return a === void 0 ? Ae : typeof a == 'function' ? ((Ae = a), !0) : !1
      }
      function jd(a, t) {
        return ja[a] === void 0
          ? !1
          : t === void 0
            ? ja[a]
            : ((ja[a] = t), a === 's' && (ja.ss = t - 1), !0)
      }
      function xd(a, t) {
        if (!this.isValid()) return this.localeData().invalidDate()
        var r = !1,
          n = ja,
          d,
          o
        return (
          typeof a == 'object' && ((t = a), (a = !1)),
          typeof a == 'boolean' && (r = a),
          typeof t == 'object' &&
            ((n = Object.assign({}, ja, t)),
            t.s != null && t.ss == null && (n.ss = t.s - 1)),
          (d = this.localeData()),
          (o = Sd(this, !r, n, d)),
          r && (o = d.pastFuture(+this, o)),
          d.postformat(o)
        )
      }
      var bs = Math.abs
      function xa(a) {
        return (a > 0) - (a < 0) || +a
      }
      function Ft() {
        if (!this.isValid()) return this.localeData().invalidDate()
        var a = bs(this._milliseconds) / 1e3,
          t = bs(this._days),
          r = bs(this._months),
          n,
          d,
          o,
          m,
          L = this.asSeconds(),
          y,
          D,
          Q,
          Ee
        return L
          ? ((n = te(a / 60)),
            (d = te(n / 60)),
            (a %= 60),
            (n %= 60),
            (o = te(r / 12)),
            (r %= 12),
            (m = a ? a.toFixed(3).replace(/\.?0+$/, '') : ''),
            (y = L < 0 ? '-' : ''),
            (D = xa(this._months) !== xa(L) ? '-' : ''),
            (Q = xa(this._days) !== xa(L) ? '-' : ''),
            (Ee = xa(this._milliseconds) !== xa(L) ? '-' : ''),
            y +
              'P' +
              (o ? D + o + 'Y' : '') +
              (r ? D + r + 'M' : '') +
              (t ? Q + t + 'D' : '') +
              (d || n || a ? 'T' : '') +
              (d ? Ee + d + 'H' : '') +
              (n ? Ee + n + 'M' : '') +
              (a ? Ee + m + 'S' : ''))
          : 'P0D'
      }
      var w = jt.prototype
      ;((w.isValid = Tr),
        (w.abs = sd),
        (w.add = rd),
        (w.subtract = nd),
        (w.as = id),
        (w.asMilliseconds = sr),
        (w.asSeconds = _d),
        (w.asMinutes = od),
        (w.asHours = ld),
        (w.asDays = ud),
        (w.asWeeks = md),
        (w.asMonths = Md),
        (w.asQuarters = hd),
        (w.asYears = cd),
        (w.valueOf = Ld),
        (w._bubble = dd),
        (w.clone = Yd),
        (w.get = yd),
        (w.milliseconds = fd),
        (w.seconds = kd),
        (w.minutes = pd),
        (w.hours = Dd),
        (w.days = Td),
        (w.weeks = vd),
        (w.months = wd),
        (w.years = gd),
        (w.humanize = xd),
        (w.toISOString = Ft),
        (w.toString = Ft),
        (w.toJSON = Ft),
        (w.locale = $s),
        (w.localeData = Us),
        (w.toIsoString = X(
          'toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)',
          Ft,
        )),
        (w.lang = Cs),
        Y('X', 0, 0, 'unix'),
        Y('x', 0, 0, 'valueOf'),
        c('x', I),
        c('X', Da),
        v('X', function (a, t, r) {
          r._d = new Date(parseFloat(a) * 1e3)
        }),
        v('x', function (a, t, r) {
          r._d = new Date(k(a))
        }))
      return (
        (M.version = '2.30.1'),
        ye(j),
        (M.fn = h),
        (M.min = fr),
        (M.max = kr),
        (M.now = pr),
        (M.utc = oe),
        (M.unix = Zn),
        (M.months = Qn),
        (M.isDate = Fe),
        (M.locale = Ye),
        (M.invalid = Ma),
        (M.duration = ve),
        (M.isMoment = A),
        (M.weekdays = ed),
        (M.parseZone = Kn),
        (M.localeData = C),
        (M.isDuration = xt),
        (M.monthsShort = Xn),
        (M.weekdaysMin = td),
        (M.defineLocale = et),
        (M.updateLocale = Ls),
        (M.locales = Ys),
        (M.weekdaysShort = ad),
        (M.normalizeUnits = G),
        (M.relativeTimeRounding = bd),
        (M.relativeTimeThreshold = jd),
        (M.calendarFormat = Gr),
        (M.prototype = h),
        (M.HTML5_FMT = {
          DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm',
          DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss',
          DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS',
          DATE: 'YYYY-MM-DD',
          TIME: 'HH:mm',
          TIME_SECONDS: 'HH:mm:ss',
          TIME_MS: 'HH:mm:ss.SSS',
          WEEK: 'GGGG-[W]WW',
          MONTH: 'YYYY-MM',
        }),
        M
      )
    })
  })
  var _r = nr((Ps, ir) => {
    ;(function (u, M) {
      typeof Ps == 'object' && typeof ir < 'u' && typeof zt == 'function'
        ? M(xs())
        : typeof define == 'function' && define.amd
          ? define(['../moment'], M)
          : M(u.moment)
    })(Ps, function (u) {
      'use strict'
      u.defineLocale('af', {
        months:
          'Januarie_Februarie_Maart_April_Mei_Junie_Julie_Augustus_September_Oktober_November_Desember'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mrt_Apr_Mei_Jun_Jul_Aug_Sep_Okt_Nov_Des'.split(
          '_',
        ),
        weekdays:
          'Sondag_Maandag_Dinsdag_Woensdag_Donderdag_Vrydag_Saterdag'.split(
            '_',
          ),
        weekdaysShort: 'Son_Maa_Din_Woe_Don_Vry_Sat'.split('_'),
        weekdaysMin: 'So_Ma_Di_Wo_Do_Vr_Sa'.split('_'),
        meridiemParse: /vm|nm/i,
        isPM: function (e) {
          return /^nm$/i.test(e)
        },
        meridiem: function (e, s, i) {
          return e < 12 ? (i ? 'vm' : 'VM') : i ? 'nm' : 'NM'
        },
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Vandag om] LT',
          nextDay: '[M\xF4re om] LT',
          nextWeek: 'dddd [om] LT',
          lastDay: '[Gister om] LT',
          lastWeek: '[Laas] dddd [om] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'oor %s',
          past: '%s gelede',
          s: "'n paar sekondes",
          ss: '%d sekondes',
          m: "'n minuut",
          mm: '%d minute',
          h: "'n uur",
          hh: '%d ure',
          d: "'n dag",
          dd: '%d dae',
          M: "'n maand",
          MM: '%d maande',
          y: "'n jaar",
          yy: '%d jaar',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(ste|de)/,
        ordinal: function (e) {
          return e + (e === 1 || e === 8 || e >= 20 ? 'ste' : 'de')
        },
        week: {dow: 1, doy: 4},
      })
      var M = function (e) {
          return e === 0
            ? 0
            : e === 1
              ? 1
              : e === 2
                ? 2
                : e % 100 >= 3 && e % 100 <= 10
                  ? 3
                  : e % 100 >= 11
                    ? 4
                    : 5
        },
        ye = {
          s: [
            '\u0623\u0642\u0644 \u0645\u0646 \u062B\u0627\u0646\u064A\u0629',
            '\u062B\u0627\u0646\u064A\u0629 \u0648\u0627\u062D\u062F\u0629',
            [
              '\u062B\u0627\u0646\u064A\u062A\u0627\u0646',
              '\u062B\u0627\u0646\u064A\u062A\u064A\u0646',
            ],
            '%d \u062B\u0648\u0627\u0646',
            '%d \u062B\u0627\u0646\u064A\u0629',
            '%d \u062B\u0627\u0646\u064A\u0629',
          ],
          m: [
            '\u0623\u0642\u0644 \u0645\u0646 \u062F\u0642\u064A\u0642\u0629',
            '\u062F\u0642\u064A\u0642\u0629 \u0648\u0627\u062D\u062F\u0629',
            [
              '\u062F\u0642\u064A\u0642\u062A\u0627\u0646',
              '\u062F\u0642\u064A\u0642\u062A\u064A\u0646',
            ],
            '%d \u062F\u0642\u0627\u0626\u0642',
            '%d \u062F\u0642\u064A\u0642\u0629',
            '%d \u062F\u0642\u064A\u0642\u0629',
          ],
          h: [
            '\u0623\u0642\u0644 \u0645\u0646 \u0633\u0627\u0639\u0629',
            '\u0633\u0627\u0639\u0629 \u0648\u0627\u062D\u062F\u0629',
            [
              '\u0633\u0627\u0639\u062A\u0627\u0646',
              '\u0633\u0627\u0639\u062A\u064A\u0646',
            ],
            '%d \u0633\u0627\u0639\u0627\u062A',
            '%d \u0633\u0627\u0639\u0629',
            '%d \u0633\u0627\u0639\u0629',
          ],
          d: [
            '\u0623\u0642\u0644 \u0645\u0646 \u064A\u0648\u0645',
            '\u064A\u0648\u0645 \u0648\u0627\u062D\u062F',
            [
              '\u064A\u0648\u0645\u0627\u0646',
              '\u064A\u0648\u0645\u064A\u0646',
            ],
            '%d \u0623\u064A\u0627\u0645',
            '%d \u064A\u0648\u0645\u064B\u0627',
            '%d \u064A\u0648\u0645',
          ],
          M: [
            '\u0623\u0642\u0644 \u0645\u0646 \u0634\u0647\u0631',
            '\u0634\u0647\u0631 \u0648\u0627\u062D\u062F',
            [
              '\u0634\u0647\u0631\u0627\u0646',
              '\u0634\u0647\u0631\u064A\u0646',
            ],
            '%d \u0623\u0634\u0647\u0631',
            '%d \u0634\u0647\u0631\u0627',
            '%d \u0634\u0647\u0631',
          ],
          y: [
            '\u0623\u0642\u0644 \u0645\u0646 \u0639\u0627\u0645',
            '\u0639\u0627\u0645 \u0648\u0627\u062D\u062F',
            [
              '\u0639\u0627\u0645\u0627\u0646',
              '\u0639\u0627\u0645\u064A\u0646',
            ],
            '%d \u0623\u0639\u0648\u0627\u0645',
            '%d \u0639\u0627\u0645\u064B\u0627',
            '%d \u0639\u0627\u0645',
          ],
        },
        H = function (e) {
          return function (s, i, _, l) {
            var K = M(s),
              _e = ye[e][M(s)]
            return (K === 2 && (_e = _e[i ? 0 : 1]), _e.replace(/%d/i, s))
          }
        },
        R = [
          '\u062C\u0627\u0646\u0641\u064A',
          '\u0641\u064A\u0641\u0631\u064A',
          '\u0645\u0627\u0631\u0633',
          '\u0623\u0641\u0631\u064A\u0644',
          '\u0645\u0627\u064A',
          '\u062C\u0648\u0627\u0646',
          '\u062C\u0648\u064A\u0644\u064A\u0629',
          '\u0623\u0648\u062A',
          '\u0633\u0628\u062A\u0645\u0628\u0631',
          '\u0623\u0643\u062A\u0648\u0628\u0631',
          '\u0646\u0648\u0641\u0645\u0628\u0631',
          '\u062F\u064A\u0633\u0645\u0628\u0631',
        ]
      u.defineLocale('ar-dz', {
        months: R,
        monthsShort: R,
        weekdays:
          '\u0627\u0644\u0623\u062D\u062F_\u0627\u0644\u0625\u062B\u0646\u064A\u0646_\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621_\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621_\u0627\u0644\u062E\u0645\u064A\u0633_\u0627\u0644\u062C\u0645\u0639\u0629_\u0627\u0644\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysShort:
          '\u0623\u062D\u062F_\u0625\u062B\u0646\u064A\u0646_\u062B\u0644\u0627\u062B\u0627\u0621_\u0623\u0631\u0628\u0639\u0627\u0621_\u062E\u0645\u064A\u0633_\u062C\u0645\u0639\u0629_\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysMin: '\u062D_\u0646_\u062B_\u0631_\u062E_\u062C_\u0633'.split(
          '_',
        ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'D/\u200FM/\u200FYYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        meridiemParse: /ص|م/,
        isPM: function (e) {
          return e === '\u0645'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? '\u0635' : '\u0645'
        },
        calendar: {
          sameDay:
            '[\u0627\u0644\u064A\u0648\u0645 \u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextDay:
            '[\u063A\u062F\u064B\u0627 \u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextWeek:
            'dddd [\u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastDay:
            '[\u0623\u0645\u0633 \u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastWeek:
            'dddd [\u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0628\u0639\u062F %s',
          past: '\u0645\u0646\u0630 %s',
          s: H('s'),
          ss: H('s'),
          m: H('m'),
          mm: H('m'),
          h: H('h'),
          hh: H('h'),
          d: H('d'),
          dd: H('d'),
          M: H('M'),
          MM: H('M'),
          y: H('y'),
          yy: H('y'),
        },
        postformat: function (e) {
          return e.replace(/,/g, '\u060C')
        },
        week: {dow: 0, doy: 4},
      })
      u.defineLocale('ar-kw', {
        months:
          '\u064A\u0646\u0627\u064A\u0631_\u0641\u0628\u0631\u0627\u064A\u0631_\u0645\u0627\u0631\u0633_\u0623\u0628\u0631\u064A\u0644_\u0645\u0627\u064A_\u064A\u0648\u0646\u064A\u0648_\u064A\u0648\u0644\u064A\u0648\u0632_\u063A\u0634\u062A_\u0634\u062A\u0646\u0628\u0631_\u0623\u0643\u062A\u0648\u0628\u0631_\u0646\u0648\u0646\u0628\u0631_\u062F\u062C\u0646\u0628\u0631'.split(
            '_',
          ),
        monthsShort:
          '\u064A\u0646\u0627\u064A\u0631_\u0641\u0628\u0631\u0627\u064A\u0631_\u0645\u0627\u0631\u0633_\u0623\u0628\u0631\u064A\u0644_\u0645\u0627\u064A_\u064A\u0648\u0646\u064A\u0648_\u064A\u0648\u0644\u064A\u0648\u0632_\u063A\u0634\u062A_\u0634\u062A\u0646\u0628\u0631_\u0623\u0643\u062A\u0648\u0628\u0631_\u0646\u0648\u0646\u0628\u0631_\u062F\u062C\u0646\u0628\u0631'.split(
            '_',
          ),
        weekdays:
          '\u0627\u0644\u0623\u062D\u062F_\u0627\u0644\u0625\u062A\u0646\u064A\u0646_\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621_\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621_\u0627\u0644\u062E\u0645\u064A\u0633_\u0627\u0644\u062C\u0645\u0639\u0629_\u0627\u0644\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysShort:
          '\u0627\u062D\u062F_\u0627\u062A\u0646\u064A\u0646_\u062B\u0644\u0627\u062B\u0627\u0621_\u0627\u0631\u0628\u0639\u0627\u0621_\u062E\u0645\u064A\u0633_\u062C\u0645\u0639\u0629_\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysMin: '\u062D_\u0646_\u062B_\u0631_\u062E_\u062C_\u0633'.split(
          '_',
        ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay:
            '[\u0627\u0644\u064A\u0648\u0645 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextDay:
            '[\u063A\u062F\u0627 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextWeek:
            'dddd [\u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastDay:
            '[\u0623\u0645\u0633 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastWeek:
            'dddd [\u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0641\u064A %s',
          past: '\u0645\u0646\u0630 %s',
          s: '\u062B\u0648\u0627\u0646',
          ss: '%d \u062B\u0627\u0646\u064A\u0629',
          m: '\u062F\u0642\u064A\u0642\u0629',
          mm: '%d \u062F\u0642\u0627\u0626\u0642',
          h: '\u0633\u0627\u0639\u0629',
          hh: '%d \u0633\u0627\u0639\u0627\u062A',
          d: '\u064A\u0648\u0645',
          dd: '%d \u0623\u064A\u0627\u0645',
          M: '\u0634\u0647\u0631',
          MM: '%d \u0623\u0634\u0647\u0631',
          y: '\u0633\u0646\u0629',
          yy: '%d \u0633\u0646\u0648\u0627\u062A',
        },
        week: {dow: 0, doy: 12},
      })
      var T = {
          1: '1',
          2: '2',
          3: '3',
          4: '4',
          5: '5',
          6: '6',
          7: '7',
          8: '8',
          9: '9',
          0: '0',
        },
        ua = function (e) {
          return e === 0
            ? 0
            : e === 1
              ? 1
              : e === 2
                ? 2
                : e % 100 >= 3 && e % 100 <= 10
                  ? 3
                  : e % 100 >= 11
                    ? 4
                    : 5
        },
        J = {
          s: [
            '\u0623\u0642\u0644 \u0645\u0646 \u062B\u0627\u0646\u064A\u0629',
            '\u062B\u0627\u0646\u064A\u0629 \u0648\u0627\u062D\u062F\u0629',
            [
              '\u062B\u0627\u0646\u064A\u062A\u0627\u0646',
              '\u062B\u0627\u0646\u064A\u062A\u064A\u0646',
            ],
            '%d \u062B\u0648\u0627\u0646',
            '%d \u062B\u0627\u0646\u064A\u0629',
            '%d \u062B\u0627\u0646\u064A\u0629',
          ],
          m: [
            '\u0623\u0642\u0644 \u0645\u0646 \u062F\u0642\u064A\u0642\u0629',
            '\u062F\u0642\u064A\u0642\u0629 \u0648\u0627\u062D\u062F\u0629',
            [
              '\u062F\u0642\u064A\u0642\u062A\u0627\u0646',
              '\u062F\u0642\u064A\u0642\u062A\u064A\u0646',
            ],
            '%d \u062F\u0642\u0627\u0626\u0642',
            '%d \u062F\u0642\u064A\u0642\u0629',
            '%d \u062F\u0642\u064A\u0642\u0629',
          ],
          h: [
            '\u0623\u0642\u0644 \u0645\u0646 \u0633\u0627\u0639\u0629',
            '\u0633\u0627\u0639\u0629 \u0648\u0627\u062D\u062F\u0629',
            [
              '\u0633\u0627\u0639\u062A\u0627\u0646',
              '\u0633\u0627\u0639\u062A\u064A\u0646',
            ],
            '%d \u0633\u0627\u0639\u0627\u062A',
            '%d \u0633\u0627\u0639\u0629',
            '%d \u0633\u0627\u0639\u0629',
          ],
          d: [
            '\u0623\u0642\u0644 \u0645\u0646 \u064A\u0648\u0645',
            '\u064A\u0648\u0645 \u0648\u0627\u062D\u062F',
            [
              '\u064A\u0648\u0645\u0627\u0646',
              '\u064A\u0648\u0645\u064A\u0646',
            ],
            '%d \u0623\u064A\u0627\u0645',
            '%d \u064A\u0648\u0645\u064B\u0627',
            '%d \u064A\u0648\u0645',
          ],
          M: [
            '\u0623\u0642\u0644 \u0645\u0646 \u0634\u0647\u0631',
            '\u0634\u0647\u0631 \u0648\u0627\u062D\u062F',
            [
              '\u0634\u0647\u0631\u0627\u0646',
              '\u0634\u0647\u0631\u064A\u0646',
            ],
            '%d \u0623\u0634\u0647\u0631',
            '%d \u0634\u0647\u0631\u0627',
            '%d \u0634\u0647\u0631',
          ],
          y: [
            '\u0623\u0642\u0644 \u0645\u0646 \u0639\u0627\u0645',
            '\u0639\u0627\u0645 \u0648\u0627\u062D\u062F',
            [
              '\u0639\u0627\u0645\u0627\u0646',
              '\u0639\u0627\u0645\u064A\u0646',
            ],
            '%d \u0623\u0639\u0648\u0627\u0645',
            '%d \u0639\u0627\u0645\u064B\u0627',
            '%d \u0639\u0627\u0645',
          ],
        },
        P = function (e) {
          return function (s, i, _, l) {
            var K = ua(s),
              _e = J[e][ua(s)]
            return (K === 2 && (_e = _e[i ? 0 : 1]), _e.replace(/%d/i, s))
          }
        },
        Fe = [
          '\u064A\u0646\u0627\u064A\u0631',
          '\u0641\u0628\u0631\u0627\u064A\u0631',
          '\u0645\u0627\u0631\u0633',
          '\u0623\u0628\u0631\u064A\u0644',
          '\u0645\u0627\u064A\u0648',
          '\u064A\u0648\u0646\u064A\u0648',
          '\u064A\u0648\u0644\u064A\u0648',
          '\u0623\u063A\u0633\u0637\u0633',
          '\u0633\u0628\u062A\u0645\u0628\u0631',
          '\u0623\u0643\u062A\u0648\u0628\u0631',
          '\u0646\u0648\u0641\u0645\u0628\u0631',
          '\u062F\u064A\u0633\u0645\u0628\u0631',
        ]
      u.defineLocale('ar-ly', {
        months: Fe,
        monthsShort: Fe,
        weekdays:
          '\u0627\u0644\u0623\u062D\u062F_\u0627\u0644\u0625\u062B\u0646\u064A\u0646_\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621_\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621_\u0627\u0644\u062E\u0645\u064A\u0633_\u0627\u0644\u062C\u0645\u0639\u0629_\u0627\u0644\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysShort:
          '\u0623\u062D\u062F_\u0625\u062B\u0646\u064A\u0646_\u062B\u0644\u0627\u062B\u0627\u0621_\u0623\u0631\u0628\u0639\u0627\u0621_\u062E\u0645\u064A\u0633_\u062C\u0645\u0639\u0629_\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysMin: '\u062D_\u0646_\u062B_\u0631_\u062E_\u062C_\u0633'.split(
          '_',
        ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'D/\u200FM/\u200FYYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        meridiemParse: /ص|م/,
        isPM: function (e) {
          return e === '\u0645'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? '\u0635' : '\u0645'
        },
        calendar: {
          sameDay:
            '[\u0627\u0644\u064A\u0648\u0645 \u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextDay:
            '[\u063A\u062F\u064B\u0627 \u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextWeek:
            'dddd [\u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastDay:
            '[\u0623\u0645\u0633 \u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastWeek:
            'dddd [\u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0628\u0639\u062F %s',
          past: '\u0645\u0646\u0630 %s',
          s: P('s'),
          ss: P('s'),
          m: P('m'),
          mm: P('m'),
          h: P('h'),
          hh: P('h'),
          d: P('d'),
          dd: P('d'),
          M: P('M'),
          MM: P('M'),
          y: P('y'),
          yy: P('y'),
        },
        preparse: function (e) {
          return e.replace(/،/g, ',')
        },
        postformat: function (e) {
          return e
            .replace(/\d/g, function (s) {
              return T[s]
            })
            .replace(/,/g, '\u060C')
        },
        week: {dow: 6, doy: 12},
      })
      u.defineLocale('ar-ma', {
        months:
          '\u064A\u0646\u0627\u064A\u0631_\u0641\u0628\u0631\u0627\u064A\u0631_\u0645\u0627\u0631\u0633_\u0623\u0628\u0631\u064A\u0644_\u0645\u0627\u064A_\u064A\u0648\u0646\u064A\u0648_\u064A\u0648\u0644\u064A\u0648\u0632_\u063A\u0634\u062A_\u0634\u062A\u0646\u0628\u0631_\u0623\u0643\u062A\u0648\u0628\u0631_\u0646\u0648\u0646\u0628\u0631_\u062F\u062C\u0646\u0628\u0631'.split(
            '_',
          ),
        monthsShort:
          '\u064A\u0646\u0627\u064A\u0631_\u0641\u0628\u0631\u0627\u064A\u0631_\u0645\u0627\u0631\u0633_\u0623\u0628\u0631\u064A\u0644_\u0645\u0627\u064A_\u064A\u0648\u0646\u064A\u0648_\u064A\u0648\u0644\u064A\u0648\u0632_\u063A\u0634\u062A_\u0634\u062A\u0646\u0628\u0631_\u0623\u0643\u062A\u0648\u0628\u0631_\u0646\u0648\u0646\u0628\u0631_\u062F\u062C\u0646\u0628\u0631'.split(
            '_',
          ),
        weekdays:
          '\u0627\u0644\u0623\u062D\u062F_\u0627\u0644\u0625\u062B\u0646\u064A\u0646_\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621_\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621_\u0627\u0644\u062E\u0645\u064A\u0633_\u0627\u0644\u062C\u0645\u0639\u0629_\u0627\u0644\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysShort:
          '\u0627\u062D\u062F_\u0627\u062B\u0646\u064A\u0646_\u062B\u0644\u0627\u062B\u0627\u0621_\u0627\u0631\u0628\u0639\u0627\u0621_\u062E\u0645\u064A\u0633_\u062C\u0645\u0639\u0629_\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysMin: '\u062D_\u0646_\u062B_\u0631_\u062E_\u062C_\u0633'.split(
          '_',
        ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay:
            '[\u0627\u0644\u064A\u0648\u0645 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextDay:
            '[\u063A\u062F\u0627 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextWeek:
            'dddd [\u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastDay:
            '[\u0623\u0645\u0633 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastWeek:
            'dddd [\u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0641\u064A %s',
          past: '\u0645\u0646\u0630 %s',
          s: '\u062B\u0648\u0627\u0646',
          ss: '%d \u062B\u0627\u0646\u064A\u0629',
          m: '\u062F\u0642\u064A\u0642\u0629',
          mm: '%d \u062F\u0642\u0627\u0626\u0642',
          h: '\u0633\u0627\u0639\u0629',
          hh: '%d \u0633\u0627\u0639\u0627\u062A',
          d: '\u064A\u0648\u0645',
          dd: '%d \u0623\u064A\u0627\u0645',
          M: '\u0634\u0647\u0631',
          MM: '%d \u0623\u0634\u0647\u0631',
          y: '\u0633\u0646\u0629',
          yy: '%d \u0633\u0646\u0648\u0627\u062A',
        },
        week: {dow: 1, doy: 4},
      })
      var st = {
          1: '\u0661',
          2: '\u0662',
          3: '\u0663',
          4: '\u0664',
          5: '\u0665',
          6: '\u0666',
          7: '\u0667',
          8: '\u0668',
          9: '\u0669',
          0: '\u0660',
        },
        fe = {
          '\u0661': '1',
          '\u0662': '2',
          '\u0663': '3',
          '\u0664': '4',
          '\u0665': '5',
          '\u0666': '6',
          '\u0667': '7',
          '\u0668': '8',
          '\u0669': '9',
          '\u0660': '0',
        }
      u.defineLocale('ar-ps', {
        months:
          '\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u062B\u0627\u0646\u064A_\u0634\u0628\u0627\u0637_\u0622\u0630\u0627\u0631_\u0646\u064A\u0633\u0627\u0646_\u0623\u064A\u0651\u0627\u0631_\u062D\u0632\u064A\u0631\u0627\u0646_\u062A\u0645\u0651\u0648\u0632_\u0622\u0628_\u0623\u064A\u0644\u0648\u0644_\u062A\u0634\u0631\u064A \u0627\u0644\u0623\u0648\u0651\u0644_\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u062B\u0627\u0646\u064A_\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u0623\u0648\u0651\u0644'.split(
            '_',
          ),
        monthsShort:
          '\u0643\u0662_\u0634\u0628\u0627\u0637_\u0622\u0630\u0627\u0631_\u0646\u064A\u0633\u0627\u0646_\u0623\u064A\u0651\u0627\u0631_\u062D\u0632\u064A\u0631\u0627\u0646_\u062A\u0645\u0651\u0648\u0632_\u0622\u0628_\u0623\u064A\u0644\u0648\u0644_\u062A\u0661_\u062A\u0662_\u0643\u0661'.split(
            '_',
          ),
        weekdays:
          '\u0627\u0644\u0623\u062D\u062F_\u0627\u0644\u0625\u062B\u0646\u064A\u0646_\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621_\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621_\u0627\u0644\u062E\u0645\u064A\u0633_\u0627\u0644\u062C\u0645\u0639\u0629_\u0627\u0644\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysShort:
          '\u0623\u062D\u062F_\u0625\u062B\u0646\u064A\u0646_\u062B\u0644\u0627\u062B\u0627\u0621_\u0623\u0631\u0628\u0639\u0627\u0621_\u062E\u0645\u064A\u0633_\u062C\u0645\u0639\u0629_\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysMin: '\u062D_\u0646_\u062B_\u0631_\u062E_\u062C_\u0633'.split(
          '_',
        ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        meridiemParse: /ص|م/,
        isPM: function (e) {
          return e === '\u0645'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? '\u0635' : '\u0645'
        },
        calendar: {
          sameDay:
            '[\u0627\u0644\u064A\u0648\u0645 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextDay:
            '[\u063A\u062F\u0627 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextWeek:
            'dddd [\u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastDay:
            '[\u0623\u0645\u0633 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastWeek:
            'dddd [\u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0641\u064A %s',
          past: '\u0645\u0646\u0630 %s',
          s: '\u062B\u0648\u0627\u0646',
          ss: '%d \u062B\u0627\u0646\u064A\u0629',
          m: '\u062F\u0642\u064A\u0642\u0629',
          mm: '%d \u062F\u0642\u0627\u0626\u0642',
          h: '\u0633\u0627\u0639\u0629',
          hh: '%d \u0633\u0627\u0639\u0627\u062A',
          d: '\u064A\u0648\u0645',
          dd: '%d \u0623\u064A\u0627\u0645',
          M: '\u0634\u0647\u0631',
          MM: '%d \u0623\u0634\u0647\u0631',
          y: '\u0633\u0646\u0629',
          yy: '%d \u0633\u0646\u0648\u0627\u062A',
        },
        preparse: function (e) {
          return e
            .replace(/[٣٤٥٦٧٨٩٠]/g, function (s) {
              return fe[s]
            })
            .split('')
            .reverse()
            .join('')
            .replace(/[١٢](?![\u062a\u0643])/g, function (s) {
              return fe[s]
            })
            .split('')
            .reverse()
            .join('')
            .replace(/،/g, ',')
        },
        postformat: function (e) {
          return e
            .replace(/\d/g, function (s) {
              return st[s]
            })
            .replace(/,/g, '\u060C')
        },
        week: {dow: 0, doy: 6},
      })
      var oe = {
          1: '\u0661',
          2: '\u0662',
          3: '\u0663',
          4: '\u0664',
          5: '\u0665',
          6: '\u0666',
          7: '\u0667',
          8: '\u0668',
          9: '\u0669',
          0: '\u0660',
        },
        Nt = {
          '\u0661': '1',
          '\u0662': '2',
          '\u0663': '3',
          '\u0664': '4',
          '\u0665': '5',
          '\u0666': '6',
          '\u0667': '7',
          '\u0668': '8',
          '\u0669': '9',
          '\u0660': '0',
        }
      u.defineLocale('ar-sa', {
        months:
          '\u064A\u0646\u0627\u064A\u0631_\u0641\u0628\u0631\u0627\u064A\u0631_\u0645\u0627\u0631\u0633_\u0623\u0628\u0631\u064A\u0644_\u0645\u0627\u064A\u0648_\u064A\u0648\u0646\u064A\u0648_\u064A\u0648\u0644\u064A\u0648_\u0623\u063A\u0633\u0637\u0633_\u0633\u0628\u062A\u0645\u0628\u0631_\u0623\u0643\u062A\u0648\u0628\u0631_\u0646\u0648\u0641\u0645\u0628\u0631_\u062F\u064A\u0633\u0645\u0628\u0631'.split(
            '_',
          ),
        monthsShort:
          '\u064A\u0646\u0627\u064A\u0631_\u0641\u0628\u0631\u0627\u064A\u0631_\u0645\u0627\u0631\u0633_\u0623\u0628\u0631\u064A\u0644_\u0645\u0627\u064A\u0648_\u064A\u0648\u0646\u064A\u0648_\u064A\u0648\u0644\u064A\u0648_\u0623\u063A\u0633\u0637\u0633_\u0633\u0628\u062A\u0645\u0628\u0631_\u0623\u0643\u062A\u0648\u0628\u0631_\u0646\u0648\u0641\u0645\u0628\u0631_\u062F\u064A\u0633\u0645\u0628\u0631'.split(
            '_',
          ),
        weekdays:
          '\u0627\u0644\u0623\u062D\u062F_\u0627\u0644\u0625\u062B\u0646\u064A\u0646_\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621_\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621_\u0627\u0644\u062E\u0645\u064A\u0633_\u0627\u0644\u062C\u0645\u0639\u0629_\u0627\u0644\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysShort:
          '\u0623\u062D\u062F_\u0625\u062B\u0646\u064A\u0646_\u062B\u0644\u0627\u062B\u0627\u0621_\u0623\u0631\u0628\u0639\u0627\u0621_\u062E\u0645\u064A\u0633_\u062C\u0645\u0639\u0629_\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysMin: '\u062D_\u0646_\u062B_\u0631_\u062E_\u062C_\u0633'.split(
          '_',
        ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        meridiemParse: /ص|م/,
        isPM: function (e) {
          return e === '\u0645'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? '\u0635' : '\u0645'
        },
        calendar: {
          sameDay:
            '[\u0627\u0644\u064A\u0648\u0645 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextDay:
            '[\u063A\u062F\u0627 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextWeek:
            'dddd [\u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastDay:
            '[\u0623\u0645\u0633 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastWeek:
            'dddd [\u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0641\u064A %s',
          past: '\u0645\u0646\u0630 %s',
          s: '\u062B\u0648\u0627\u0646',
          ss: '%d \u062B\u0627\u0646\u064A\u0629',
          m: '\u062F\u0642\u064A\u0642\u0629',
          mm: '%d \u062F\u0642\u0627\u0626\u0642',
          h: '\u0633\u0627\u0639\u0629',
          hh: '%d \u0633\u0627\u0639\u0627\u062A',
          d: '\u064A\u0648\u0645',
          dd: '%d \u0623\u064A\u0627\u0645',
          M: '\u0634\u0647\u0631',
          MM: '%d \u0623\u0634\u0647\u0631',
          y: '\u0633\u0646\u0629',
          yy: '%d \u0633\u0646\u0648\u0627\u062A',
        },
        preparse: function (e) {
          return e
            .replace(/[١٢٣٤٥٦٧٨٩٠]/g, function (s) {
              return Nt[s]
            })
            .replace(/،/g, ',')
        },
        postformat: function (e) {
          return e
            .replace(/\d/g, function (s) {
              return oe[s]
            })
            .replace(/,/g, '\u060C')
        },
        week: {dow: 0, doy: 6},
      })
      u.defineLocale('ar-tn', {
        months:
          '\u062C\u0627\u0646\u0641\u064A_\u0641\u064A\u0641\u0631\u064A_\u0645\u0627\u0631\u0633_\u0623\u0641\u0631\u064A\u0644_\u0645\u0627\u064A_\u062C\u0648\u0627\u0646_\u062C\u0648\u064A\u0644\u064A\u0629_\u0623\u0648\u062A_\u0633\u0628\u062A\u0645\u0628\u0631_\u0623\u0643\u062A\u0648\u0628\u0631_\u0646\u0648\u0641\u0645\u0628\u0631_\u062F\u064A\u0633\u0645\u0628\u0631'.split(
            '_',
          ),
        monthsShort:
          '\u062C\u0627\u0646\u0641\u064A_\u0641\u064A\u0641\u0631\u064A_\u0645\u0627\u0631\u0633_\u0623\u0641\u0631\u064A\u0644_\u0645\u0627\u064A_\u062C\u0648\u0627\u0646_\u062C\u0648\u064A\u0644\u064A\u0629_\u0623\u0648\u062A_\u0633\u0628\u062A\u0645\u0628\u0631_\u0623\u0643\u062A\u0648\u0628\u0631_\u0646\u0648\u0641\u0645\u0628\u0631_\u062F\u064A\u0633\u0645\u0628\u0631'.split(
            '_',
          ),
        weekdays:
          '\u0627\u0644\u0623\u062D\u062F_\u0627\u0644\u0625\u062B\u0646\u064A\u0646_\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621_\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621_\u0627\u0644\u062E\u0645\u064A\u0633_\u0627\u0644\u062C\u0645\u0639\u0629_\u0627\u0644\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysShort:
          '\u0623\u062D\u062F_\u0625\u062B\u0646\u064A\u0646_\u062B\u0644\u0627\u062B\u0627\u0621_\u0623\u0631\u0628\u0639\u0627\u0621_\u062E\u0645\u064A\u0633_\u062C\u0645\u0639\u0629_\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysMin: '\u062D_\u0646_\u062B_\u0631_\u062E_\u062C_\u0633'.split(
          '_',
        ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay:
            '[\u0627\u0644\u064A\u0648\u0645 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextDay:
            '[\u063A\u062F\u0627 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextWeek:
            'dddd [\u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastDay:
            '[\u0623\u0645\u0633 \u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastWeek:
            'dddd [\u0639\u0644\u0649 \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0641\u064A %s',
          past: '\u0645\u0646\u0630 %s',
          s: '\u062B\u0648\u0627\u0646',
          ss: '%d \u062B\u0627\u0646\u064A\u0629',
          m: '\u062F\u0642\u064A\u0642\u0629',
          mm: '%d \u062F\u0642\u0627\u0626\u0642',
          h: '\u0633\u0627\u0639\u0629',
          hh: '%d \u0633\u0627\u0639\u0627\u062A',
          d: '\u064A\u0648\u0645',
          dd: '%d \u0623\u064A\u0627\u0645',
          M: '\u0634\u0647\u0631',
          MM: '%d \u0623\u0634\u0647\u0631',
          y: '\u0633\u0646\u0629',
          yy: '%d \u0633\u0646\u0648\u0627\u062A',
        },
        week: {dow: 1, doy: 4},
      })
      var f = {
          1: '\u0661',
          2: '\u0662',
          3: '\u0663',
          4: '\u0664',
          5: '\u0665',
          6: '\u0666',
          7: '\u0667',
          8: '\u0668',
          9: '\u0669',
          0: '\u0660',
        },
        Oa = {
          '\u0661': '1',
          '\u0662': '2',
          '\u0663': '3',
          '\u0664': '4',
          '\u0665': '5',
          '\u0666': '6',
          '\u0667': '7',
          '\u0668': '8',
          '\u0669': '9',
          '\u0660': '0',
        },
        ma = function (e) {
          return e === 0
            ? 0
            : e === 1
              ? 1
              : e === 2
                ? 2
                : e % 100 >= 3 && e % 100 <= 10
                  ? 3
                  : e % 100 >= 11
                    ? 4
                    : 5
        },
        Ma = {
          s: [
            '\u0623\u0642\u0644 \u0645\u0646 \u062B\u0627\u0646\u064A\u0629',
            '\u062B\u0627\u0646\u064A\u0629 \u0648\u0627\u062D\u062F\u0629',
            [
              '\u062B\u0627\u0646\u064A\u062A\u0627\u0646',
              '\u062B\u0627\u0646\u064A\u062A\u064A\u0646',
            ],
            '%d \u062B\u0648\u0627\u0646',
            '%d \u062B\u0627\u0646\u064A\u0629',
            '%d \u062B\u0627\u0646\u064A\u0629',
          ],
          m: [
            '\u0623\u0642\u0644 \u0645\u0646 \u062F\u0642\u064A\u0642\u0629',
            '\u062F\u0642\u064A\u0642\u0629 \u0648\u0627\u062D\u062F\u0629',
            [
              '\u062F\u0642\u064A\u0642\u062A\u0627\u0646',
              '\u062F\u0642\u064A\u0642\u062A\u064A\u0646',
            ],
            '%d \u062F\u0642\u0627\u0626\u0642',
            '%d \u062F\u0642\u064A\u0642\u0629',
            '%d \u062F\u0642\u064A\u0642\u0629',
          ],
          h: [
            '\u0623\u0642\u0644 \u0645\u0646 \u0633\u0627\u0639\u0629',
            '\u0633\u0627\u0639\u0629 \u0648\u0627\u062D\u062F\u0629',
            [
              '\u0633\u0627\u0639\u062A\u0627\u0646',
              '\u0633\u0627\u0639\u062A\u064A\u0646',
            ],
            '%d \u0633\u0627\u0639\u0627\u062A',
            '%d \u0633\u0627\u0639\u0629',
            '%d \u0633\u0627\u0639\u0629',
          ],
          d: [
            '\u0623\u0642\u0644 \u0645\u0646 \u064A\u0648\u0645',
            '\u064A\u0648\u0645 \u0648\u0627\u062D\u062F',
            [
              '\u064A\u0648\u0645\u0627\u0646',
              '\u064A\u0648\u0645\u064A\u0646',
            ],
            '%d \u0623\u064A\u0627\u0645',
            '%d \u064A\u0648\u0645\u064B\u0627',
            '%d \u064A\u0648\u0645',
          ],
          M: [
            '\u0623\u0642\u0644 \u0645\u0646 \u0634\u0647\u0631',
            '\u0634\u0647\u0631 \u0648\u0627\u062D\u062F',
            [
              '\u0634\u0647\u0631\u0627\u0646',
              '\u0634\u0647\u0631\u064A\u0646',
            ],
            '%d \u0623\u0634\u0647\u0631',
            '%d \u0634\u0647\u0631\u0627',
            '%d \u0634\u0647\u0631',
          ],
          y: [
            '\u0623\u0642\u0644 \u0645\u0646 \u0639\u0627\u0645',
            '\u0639\u0627\u0645 \u0648\u0627\u062D\u062F',
            [
              '\u0639\u0627\u0645\u0627\u0646',
              '\u0639\u0627\u0645\u064A\u0646',
            ],
            '%d \u0623\u0639\u0648\u0627\u0645',
            '%d \u0639\u0627\u0645\u064B\u0627',
            '%d \u0639\u0627\u0645',
          ],
        },
        U = function (e) {
          return function (s, i, _, l) {
            var K = ma(s),
              _e = Ma[e][ma(s)]
            return (K === 2 && (_e = _e[i ? 0 : 1]), _e.replace(/%d/i, s))
          }
        },
        ha = [
          '\u064A\u0646\u0627\u064A\u0631',
          '\u0641\u0628\u0631\u0627\u064A\u0631',
          '\u0645\u0627\u0631\u0633',
          '\u0623\u0628\u0631\u064A\u0644',
          '\u0645\u0627\u064A\u0648',
          '\u064A\u0648\u0646\u064A\u0648',
          '\u064A\u0648\u0644\u064A\u0648',
          '\u0623\u063A\u0633\u0637\u0633',
          '\u0633\u0628\u062A\u0645\u0628\u0631',
          '\u0623\u0643\u062A\u0648\u0628\u0631',
          '\u0646\u0648\u0641\u0645\u0628\u0631',
          '\u062F\u064A\u0633\u0645\u0628\u0631',
        ]
      u.defineLocale('ar', {
        months: ha,
        monthsShort: ha,
        weekdays:
          '\u0627\u0644\u0623\u062D\u062F_\u0627\u0644\u0625\u062B\u0646\u064A\u0646_\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621_\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621_\u0627\u0644\u062E\u0645\u064A\u0633_\u0627\u0644\u062C\u0645\u0639\u0629_\u0627\u0644\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysShort:
          '\u0623\u062D\u062F_\u0625\u062B\u0646\u064A\u0646_\u062B\u0644\u0627\u062B\u0627\u0621_\u0623\u0631\u0628\u0639\u0627\u0621_\u062E\u0645\u064A\u0633_\u062C\u0645\u0639\u0629_\u0633\u0628\u062A'.split(
            '_',
          ),
        weekdaysMin: '\u062D_\u0646_\u062B_\u0631_\u062E_\u062C_\u0633'.split(
          '_',
        ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'D/\u200FM/\u200FYYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        meridiemParse: /ص|م/,
        isPM: function (e) {
          return e === '\u0645'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? '\u0635' : '\u0645'
        },
        calendar: {
          sameDay:
            '[\u0627\u0644\u064A\u0648\u0645 \u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextDay:
            '[\u063A\u062F\u064B\u0627 \u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          nextWeek:
            'dddd [\u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastDay:
            '[\u0623\u0645\u0633 \u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          lastWeek:
            'dddd [\u0639\u0646\u062F \u0627\u0644\u0633\u0627\u0639\u0629] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0628\u0639\u062F %s',
          past: '\u0645\u0646\u0630 %s',
          s: U('s'),
          ss: U('s'),
          m: U('m'),
          mm: U('m'),
          h: U('h'),
          hh: U('h'),
          d: U('d'),
          dd: U('d'),
          M: U('M'),
          MM: U('M'),
          y: U('y'),
          yy: U('y'),
        },
        preparse: function (e) {
          return e
            .replace(/[١٢٣٤٥٦٧٨٩٠]/g, function (s) {
              return Oa[s]
            })
            .replace(/،/g, ',')
        },
        postformat: function (e) {
          return e
            .replace(/\d/g, function (s) {
              return f[s]
            })
            .replace(/,/g, '\u060C')
        },
        week: {dow: 6, doy: 12},
      })
      var Qe = {
        1: '-inci',
        5: '-inci',
        8: '-inci',
        70: '-inci',
        80: '-inci',
        2: '-nci',
        7: '-nci',
        20: '-nci',
        50: '-nci',
        3: '-\xFCnc\xFC',
        4: '-\xFCnc\xFC',
        100: '-\xFCnc\xFC',
        6: '-nc\u0131',
        9: '-uncu',
        10: '-uncu',
        30: '-uncu',
        60: '-\u0131nc\u0131',
        90: '-\u0131nc\u0131',
      }
      u.defineLocale('az', {
        months:
          'yanvar_fevral_mart_aprel_may_iyun_iyul_avqust_sentyabr_oktyabr_noyabr_dekabr'.split(
            '_',
          ),
        monthsShort: 'yan_fev_mar_apr_may_iyn_iyl_avq_sen_okt_noy_dek'.split(
          '_',
        ),
        weekdays:
          'Bazar_Bazar ert\u0259si_\xC7\u0259r\u015F\u0259nb\u0259 ax\u015Fam\u0131_\xC7\u0259r\u015F\u0259nb\u0259_C\xFCm\u0259 ax\u015Fam\u0131_C\xFCm\u0259_\u015E\u0259nb\u0259'.split(
            '_',
          ),
        weekdaysShort:
          'Baz_BzE_\xC7Ax_\xC7\u0259r_CAx_C\xFCm_\u015E\u0259n'.split('_'),
        weekdaysMin: 'Bz_BE_\xC7A_\xC7\u0259_CA_C\xFC_\u015E\u0259'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[bug\xFCn saat] LT',
          nextDay: '[sabah saat] LT',
          nextWeek: '[g\u0259l\u0259n h\u0259ft\u0259] dddd [saat] LT',
          lastDay: '[d\xFCn\u0259n] LT',
          lastWeek: '[ke\xE7\u0259n h\u0259ft\u0259] dddd [saat] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s sonra',
          past: '%s \u0259vv\u0259l',
          s: 'bir ne\xE7\u0259 saniy\u0259',
          ss: '%d saniy\u0259',
          m: 'bir d\u0259qiq\u0259',
          mm: '%d d\u0259qiq\u0259',
          h: 'bir saat',
          hh: '%d saat',
          d: 'bir g\xFCn',
          dd: '%d g\xFCn',
          M: 'bir ay',
          MM: '%d ay',
          y: 'bir il',
          yy: '%d il',
        },
        meridiemParse: /gecə|səhər|gündüz|axşam/,
        isPM: function (e) {
          return /^(gündüz|axşam)$/.test(e)
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? 'gec\u0259'
            : e < 12
              ? 's\u0259h\u0259r'
              : e < 17
                ? 'g\xFCnd\xFCz'
                : 'ax\u015Fam'
        },
        dayOfMonthOrdinalParse: /\d{1,2}-(ıncı|inci|nci|üncü|ncı|uncu)/,
        ordinal: function (e) {
          if (e === 0) return e + '-\u0131nc\u0131'
          var s = e % 10,
            i = (e % 100) - s,
            _ = e >= 100 ? 100 : null
          return e + (Qe[s] || Qe[i] || Qe[_])
        },
        week: {dow: 1, doy: 7},
      })
      function Xe(e, s) {
        var i = e.split('_')
        return s % 10 === 1 && s % 100 !== 11
          ? i[0]
          : s % 10 >= 2 && s % 10 <= 4 && (s % 100 < 10 || s % 100 >= 20)
            ? i[1]
            : i[2]
      }
      function A(e, s, i) {
        var _ = {
          ss: s
            ? '\u0441\u0435\u043A\u0443\u043D\u0434\u0430_\u0441\u0435\u043A\u0443\u043D\u0434\u044B_\u0441\u0435\u043A\u0443\u043D\u0434'
            : '\u0441\u0435\u043A\u0443\u043D\u0434\u0443_\u0441\u0435\u043A\u0443\u043D\u0434\u044B_\u0441\u0435\u043A\u0443\u043D\u0434',
          mm: s
            ? '\u0445\u0432\u0456\u043B\u0456\u043D\u0430_\u0445\u0432\u0456\u043B\u0456\u043D\u044B_\u0445\u0432\u0456\u043B\u0456\u043D'
            : '\u0445\u0432\u0456\u043B\u0456\u043D\u0443_\u0445\u0432\u0456\u043B\u0456\u043D\u044B_\u0445\u0432\u0456\u043B\u0456\u043D',
          hh: s
            ? '\u0433\u0430\u0434\u0437\u0456\u043D\u0430_\u0433\u0430\u0434\u0437\u0456\u043D\u044B_\u0433\u0430\u0434\u0437\u0456\u043D'
            : '\u0433\u0430\u0434\u0437\u0456\u043D\u0443_\u0433\u0430\u0434\u0437\u0456\u043D\u044B_\u0433\u0430\u0434\u0437\u0456\u043D',
          dd: '\u0434\u0437\u0435\u043D\u044C_\u0434\u043D\u0456_\u0434\u0437\u0451\u043D',
          MM: '\u043C\u0435\u0441\u044F\u0446_\u043C\u0435\u0441\u044F\u0446\u044B_\u043C\u0435\u0441\u044F\u0446\u0430\u045E',
          yy: '\u0433\u043E\u0434_\u0433\u0430\u0434\u044B_\u0433\u0430\u0434\u043E\u045E',
        }
        return i === 'm'
          ? s
            ? '\u0445\u0432\u0456\u043B\u0456\u043D\u0430'
            : '\u0445\u0432\u0456\u043B\u0456\u043D\u0443'
          : i === 'h'
            ? s
              ? '\u0433\u0430\u0434\u0437\u0456\u043D\u0430'
              : '\u0433\u0430\u0434\u0437\u0456\u043D\u0443'
            : e + ' ' + Xe(_[i], +e)
      }
      u.defineLocale('be', {
        months: {
          format:
            '\u0441\u0442\u0443\u0434\u0437\u0435\u043D\u044F_\u043B\u044E\u0442\u0430\u0433\u0430_\u0441\u0430\u043A\u0430\u0432\u0456\u043A\u0430_\u043A\u0440\u0430\u0441\u0430\u0432\u0456\u043A\u0430_\u0442\u0440\u0430\u045E\u043D\u044F_\u0447\u044D\u0440\u0432\u0435\u043D\u044F_\u043B\u0456\u043F\u0435\u043D\u044F_\u0436\u043D\u0456\u045E\u043D\u044F_\u0432\u0435\u0440\u0430\u0441\u043D\u044F_\u043A\u0430\u0441\u0442\u0440\u044B\u0447\u043D\u0456\u043A\u0430_\u043B\u0456\u0441\u0442\u0430\u043F\u0430\u0434\u0430_\u0441\u043D\u0435\u0436\u043D\u044F'.split(
              '_',
            ),
          standalone:
            '\u0441\u0442\u0443\u0434\u0437\u0435\u043D\u044C_\u043B\u044E\u0442\u044B_\u0441\u0430\u043A\u0430\u0432\u0456\u043A_\u043A\u0440\u0430\u0441\u0430\u0432\u0456\u043A_\u0442\u0440\u0430\u0432\u0435\u043D\u044C_\u0447\u044D\u0440\u0432\u0435\u043D\u044C_\u043B\u0456\u043F\u0435\u043D\u044C_\u0436\u043D\u0456\u0432\u0435\u043D\u044C_\u0432\u0435\u0440\u0430\u0441\u0435\u043D\u044C_\u043A\u0430\u0441\u0442\u0440\u044B\u0447\u043D\u0456\u043A_\u043B\u0456\u0441\u0442\u0430\u043F\u0430\u0434_\u0441\u043D\u0435\u0436\u0430\u043D\u044C'.split(
              '_',
            ),
        },
        monthsShort:
          '\u0441\u0442\u0443\u0434_\u043B\u044E\u0442_\u0441\u0430\u043A_\u043A\u0440\u0430\u0441_\u0442\u0440\u0430\u0432_\u0447\u044D\u0440\u0432_\u043B\u0456\u043F_\u0436\u043D\u0456\u0432_\u0432\u0435\u0440_\u043A\u0430\u0441\u0442_\u043B\u0456\u0441\u0442_\u0441\u043D\u0435\u0436'.split(
            '_',
          ),
        weekdays: {
          format:
            '\u043D\u044F\u0434\u0437\u0435\u043B\u044E_\u043F\u0430\u043D\u044F\u0434\u0437\u0435\u043B\u0430\u043A_\u0430\u045E\u0442\u043E\u0440\u0430\u043A_\u0441\u0435\u0440\u0430\u0434\u0443_\u0447\u0430\u0446\u0432\u0435\u0440_\u043F\u044F\u0442\u043D\u0456\u0446\u0443_\u0441\u0443\u0431\u043E\u0442\u0443'.split(
              '_',
            ),
          standalone:
            '\u043D\u044F\u0434\u0437\u0435\u043B\u044F_\u043F\u0430\u043D\u044F\u0434\u0437\u0435\u043B\u0430\u043A_\u0430\u045E\u0442\u043E\u0440\u0430\u043A_\u0441\u0435\u0440\u0430\u0434\u0430_\u0447\u0430\u0446\u0432\u0435\u0440_\u043F\u044F\u0442\u043D\u0456\u0446\u0430_\u0441\u0443\u0431\u043E\u0442\u0430'.split(
              '_',
            ),
          isFormat: /\[ ?[Ууў] ?(?:мінулую|наступную)? ?\] ?dddd/,
        },
        weekdaysShort:
          '\u043D\u0434_\u043F\u043D_\u0430\u0442_\u0441\u0440_\u0447\u0446_\u043F\u0442_\u0441\u0431'.split(
            '_',
          ),
        weekdaysMin:
          '\u043D\u0434_\u043F\u043D_\u0430\u0442_\u0441\u0440_\u0447\u0446_\u043F\u0442_\u0441\u0431'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY \u0433.',
          LLL: 'D MMMM YYYY \u0433., HH:mm',
          LLLL: 'dddd, D MMMM YYYY \u0433., HH:mm',
        },
        calendar: {
          sameDay: '[\u0421\u0451\u043D\u043D\u044F \u045E] LT',
          nextDay: '[\u0417\u0430\u045E\u0442\u0440\u0430 \u045E] LT',
          lastDay: '[\u0423\u0447\u043E\u0440\u0430 \u045E] LT',
          nextWeek: function () {
            return '[\u0423] dddd [\u045E] LT'
          },
          lastWeek: function () {
            switch (this.day()) {
              case 0:
              case 3:
              case 5:
              case 6:
                return '[\u0423 \u043C\u0456\u043D\u0443\u043B\u0443\u044E] dddd [\u045E] LT'
              case 1:
              case 2:
              case 4:
                return '[\u0423 \u043C\u0456\u043D\u0443\u043B\u044B] dddd [\u045E] LT'
            }
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u043F\u0440\u0430\u0437 %s',
          past: '%s \u0442\u0430\u043C\u0443',
          s: '\u043D\u0435\u043A\u0430\u043B\u044C\u043A\u0456 \u0441\u0435\u043A\u0443\u043D\u0434',
          m: A,
          mm: A,
          h: A,
          hh: A,
          d: '\u0434\u0437\u0435\u043D\u044C',
          dd: A,
          M: '\u043C\u0435\u0441\u044F\u0446',
          MM: A,
          y: '\u0433\u043E\u0434',
          yy: A,
        },
        meridiemParse: /ночы|раніцы|дня|вечара/,
        isPM: function (e) {
          return /^(дня|вечара)$/.test(e)
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u043D\u043E\u0447\u044B'
            : e < 12
              ? '\u0440\u0430\u043D\u0456\u0446\u044B'
              : e < 17
                ? '\u0434\u043D\u044F'
                : '\u0432\u0435\u0447\u0430\u0440\u0430'
        },
        dayOfMonthOrdinalParse: /\d{1,2}-(і|ы|га)/,
        ordinal: function (e, s) {
          switch (s) {
            case 'M':
            case 'd':
            case 'DDD':
            case 'w':
            case 'W':
              return (e % 10 === 2 || e % 10 === 3) &&
                e % 100 !== 12 &&
                e % 100 !== 13
                ? e + '-\u0456'
                : e + '-\u044B'
            case 'D':
              return e + '-\u0433\u0430'
            default:
              return e
          }
        },
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('bg', {
        months:
          '\u044F\u043D\u0443\u0430\u0440\u0438_\u0444\u0435\u0432\u0440\u0443\u0430\u0440\u0438_\u043C\u0430\u0440\u0442_\u0430\u043F\u0440\u0438\u043B_\u043C\u0430\u0439_\u044E\u043D\u0438_\u044E\u043B\u0438_\u0430\u0432\u0433\u0443\u0441\u0442_\u0441\u0435\u043F\u0442\u0435\u043C\u0432\u0440\u0438_\u043E\u043A\u0442\u043E\u043C\u0432\u0440\u0438_\u043D\u043E\u0435\u043C\u0432\u0440\u0438_\u0434\u0435\u043A\u0435\u043C\u0432\u0440\u0438'.split(
            '_',
          ),
        monthsShort:
          '\u044F\u043D\u0443_\u0444\u0435\u0432_\u043C\u0430\u0440_\u0430\u043F\u0440_\u043C\u0430\u0439_\u044E\u043D\u0438_\u044E\u043B\u0438_\u0430\u0432\u0433_\u0441\u0435\u043F_\u043E\u043A\u0442_\u043D\u043E\u0435_\u0434\u0435\u043A'.split(
            '_',
          ),
        weekdays:
          '\u043D\u0435\u0434\u0435\u043B\u044F_\u043F\u043E\u043D\u0435\u0434\u0435\u043B\u043D\u0438\u043A_\u0432\u0442\u043E\u0440\u043D\u0438\u043A_\u0441\u0440\u044F\u0434\u0430_\u0447\u0435\u0442\u0432\u044A\u0440\u0442\u044A\u043A_\u043F\u0435\u0442\u044A\u043A_\u0441\u044A\u0431\u043E\u0442\u0430'.split(
            '_',
          ),
        weekdaysShort:
          '\u043D\u0435\u0434_\u043F\u043E\u043D_\u0432\u0442\u043E_\u0441\u0440\u044F_\u0447\u0435\u0442_\u043F\u0435\u0442_\u0441\u044A\u0431'.split(
            '_',
          ),
        weekdaysMin:
          '\u043D\u0434_\u043F\u043D_\u0432\u0442_\u0441\u0440_\u0447\u0442_\u043F\u0442_\u0441\u0431'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'D.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY H:mm',
          LLLL: 'dddd, D MMMM YYYY H:mm',
        },
        calendar: {
          sameDay: '[\u0414\u043D\u0435\u0441 \u0432] LT',
          nextDay: '[\u0423\u0442\u0440\u0435 \u0432] LT',
          nextWeek: 'dddd [\u0432] LT',
          lastDay: '[\u0412\u0447\u0435\u0440\u0430 \u0432] LT',
          lastWeek: function () {
            switch (this.day()) {
              case 0:
              case 3:
              case 6:
                return '[\u041C\u0438\u043D\u0430\u043B\u0430\u0442\u0430] dddd [\u0432] LT'
              case 1:
              case 2:
              case 4:
              case 5:
                return '[\u041C\u0438\u043D\u0430\u043B\u0438\u044F] dddd [\u0432] LT'
            }
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0441\u043B\u0435\u0434 %s',
          past: '\u043F\u0440\u0435\u0434\u0438 %s',
          s: '\u043D\u044F\u043A\u043E\u043B\u043A\u043E \u0441\u0435\u043A\u0443\u043D\u0434\u0438',
          ss: '%d \u0441\u0435\u043A\u0443\u043D\u0434\u0438',
          m: '\u043C\u0438\u043D\u0443\u0442\u0430',
          mm: '%d \u043C\u0438\u043D\u0443\u0442\u0438',
          h: '\u0447\u0430\u0441',
          hh: '%d \u0447\u0430\u0441\u0430',
          d: '\u0434\u0435\u043D',
          dd: '%d \u0434\u0435\u043D\u0430',
          w: '\u0441\u0435\u0434\u043C\u0438\u0446\u0430',
          ww: '%d \u0441\u0435\u0434\u043C\u0438\u0446\u0438',
          M: '\u043C\u0435\u0441\u0435\u0446',
          MM: '%d \u043C\u0435\u0441\u0435\u0446\u0430',
          y: '\u0433\u043E\u0434\u0438\u043D\u0430',
          yy: '%d \u0433\u043E\u0434\u0438\u043D\u0438',
        },
        dayOfMonthOrdinalParse: /\d{1,2}-(ев|ен|ти|ви|ри|ми)/,
        ordinal: function (e) {
          var s = e % 10,
            i = e % 100
          return e === 0
            ? e + '-\u0435\u0432'
            : i === 0
              ? e + '-\u0435\u043D'
              : i > 10 && i < 20
                ? e + '-\u0442\u0438'
                : s === 1
                  ? e + '-\u0432\u0438'
                  : s === 2
                    ? e + '-\u0440\u0438'
                    : s === 7 || s === 8
                      ? e + '-\u043C\u0438'
                      : e + '-\u0442\u0438'
        },
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('bm', {
        months:
          'Zanwuyekalo_Fewuruyekalo_Marisikalo_Awirilikalo_M\u025Bkalo_Zuw\u025Bnkalo_Zuluyekalo_Utikalo_S\u025Btanburukalo_\u0254kut\u0254burukalo_Nowanburukalo_Desanburukalo'.split(
            '_',
          ),
        monthsShort:
          'Zan_Few_Mar_Awi_M\u025B_Zuw_Zul_Uti_S\u025Bt_\u0254ku_Now_Des'.split(
            '_',
          ),
        weekdays:
          'Kari_Nt\u025Bn\u025Bn_Tarata_Araba_Alamisa_Juma_Sibiri'.split('_'),
        weekdaysShort: 'Kar_Nt\u025B_Tar_Ara_Ala_Jum_Sib'.split('_'),
        weekdaysMin: 'Ka_Nt_Ta_Ar_Al_Ju_Si'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'MMMM [tile] D [san] YYYY',
          LLL: 'MMMM [tile] D [san] YYYY [l\u025Br\u025B] HH:mm',
          LLLL: 'dddd MMMM [tile] D [san] YYYY [l\u025Br\u025B] HH:mm',
        },
        calendar: {
          sameDay: '[Bi l\u025Br\u025B] LT',
          nextDay: '[Sini l\u025Br\u025B] LT',
          nextWeek: 'dddd [don l\u025Br\u025B] LT',
          lastDay: '[Kunu l\u025Br\u025B] LT',
          lastWeek: 'dddd [t\u025Bm\u025Bnen l\u025Br\u025B] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s k\u0254n\u0254',
          past: 'a b\u025B %s b\u0254',
          s: 'sanga dama dama',
          ss: 'sekondi %d',
          m: 'miniti kelen',
          mm: 'miniti %d',
          h: 'l\u025Br\u025B kelen',
          hh: 'l\u025Br\u025B %d',
          d: 'tile kelen',
          dd: 'tile %d',
          M: 'kalo kelen',
          MM: 'kalo %d',
          y: 'san kelen',
          yy: 'san %d',
        },
        week: {dow: 1, doy: 4},
      })
      var rt = {
          1: '\u09E7',
          2: '\u09E8',
          3: '\u09E9',
          4: '\u09EA',
          5: '\u09EB',
          6: '\u09EC',
          7: '\u09ED',
          8: '\u09EE',
          9: '\u09EF',
          0: '\u09E6',
        },
        X = {
          '\u09E7': '1',
          '\u09E8': '2',
          '\u09E9': '3',
          '\u09EA': '4',
          '\u09EB': '5',
          '\u09EC': '6',
          '\u09ED': '7',
          '\u09EE': '8',
          '\u09EF': '9',
          '\u09E6': '0',
        }
      u.defineLocale('bn-bd', {
        months:
          '\u099C\u09BE\u09A8\u09C1\u09DF\u09BE\u09B0\u09BF_\u09AB\u09C7\u09AC\u09CD\u09B0\u09C1\u09DF\u09BE\u09B0\u09BF_\u09AE\u09BE\u09B0\u09CD\u099A_\u098F\u09AA\u09CD\u09B0\u09BF\u09B2_\u09AE\u09C7_\u099C\u09C1\u09A8_\u099C\u09C1\u09B2\u09BE\u0987_\u0986\u0997\u09B8\u09CD\u099F_\u09B8\u09C7\u09AA\u09CD\u099F\u09C7\u09AE\u09CD\u09AC\u09B0_\u0985\u0995\u09CD\u099F\u09CB\u09AC\u09B0_\u09A8\u09AD\u09C7\u09AE\u09CD\u09AC\u09B0_\u09A1\u09BF\u09B8\u09C7\u09AE\u09CD\u09AC\u09B0'.split(
            '_',
          ),
        monthsShort:
          '\u099C\u09BE\u09A8\u09C1_\u09AB\u09C7\u09AC\u09CD\u09B0\u09C1_\u09AE\u09BE\u09B0\u09CD\u099A_\u098F\u09AA\u09CD\u09B0\u09BF\u09B2_\u09AE\u09C7_\u099C\u09C1\u09A8_\u099C\u09C1\u09B2\u09BE\u0987_\u0986\u0997\u09B8\u09CD\u099F_\u09B8\u09C7\u09AA\u09CD\u099F_\u0985\u0995\u09CD\u099F\u09CB_\u09A8\u09AD\u09C7_\u09A1\u09BF\u09B8\u09C7'.split(
            '_',
          ),
        weekdays:
          '\u09B0\u09AC\u09BF\u09AC\u09BE\u09B0_\u09B8\u09CB\u09AE\u09AC\u09BE\u09B0_\u09AE\u0999\u09CD\u0997\u09B2\u09AC\u09BE\u09B0_\u09AC\u09C1\u09A7\u09AC\u09BE\u09B0_\u09AC\u09C3\u09B9\u09B8\u09CD\u09AA\u09A4\u09BF\u09AC\u09BE\u09B0_\u09B6\u09C1\u0995\u09CD\u09B0\u09AC\u09BE\u09B0_\u09B6\u09A8\u09BF\u09AC\u09BE\u09B0'.split(
            '_',
          ),
        weekdaysShort:
          '\u09B0\u09AC\u09BF_\u09B8\u09CB\u09AE_\u09AE\u0999\u09CD\u0997\u09B2_\u09AC\u09C1\u09A7_\u09AC\u09C3\u09B9\u09B8\u09CD\u09AA\u09A4\u09BF_\u09B6\u09C1\u0995\u09CD\u09B0_\u09B6\u09A8\u09BF'.split(
            '_',
          ),
        weekdaysMin:
          '\u09B0\u09AC\u09BF_\u09B8\u09CB\u09AE_\u09AE\u0999\u09CD\u0997\u09B2_\u09AC\u09C1\u09A7_\u09AC\u09C3\u09B9_\u09B6\u09C1\u0995\u09CD\u09B0_\u09B6\u09A8\u09BF'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'A h:mm \u09B8\u09AE\u09DF',
          LTS: 'A h:mm:ss \u09B8\u09AE\u09DF',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY, A h:mm \u09B8\u09AE\u09DF',
          LLLL: 'dddd, D MMMM YYYY, A h:mm \u09B8\u09AE\u09DF',
        },
        calendar: {
          sameDay: '[\u0986\u099C] LT',
          nextDay: '[\u0986\u0997\u09BE\u09AE\u09C0\u0995\u09BE\u09B2] LT',
          nextWeek: 'dddd, LT',
          lastDay: '[\u0997\u09A4\u0995\u09BE\u09B2] LT',
          lastWeek: '[\u0997\u09A4] dddd, LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u09AA\u09B0\u09C7',
          past: '%s \u0986\u0997\u09C7',
          s: '\u0995\u09DF\u09C7\u0995 \u09B8\u09C7\u0995\u09C7\u09A8\u09CD\u09A1',
          ss: '%d \u09B8\u09C7\u0995\u09C7\u09A8\u09CD\u09A1',
          m: '\u098F\u0995 \u09AE\u09BF\u09A8\u09BF\u099F',
          mm: '%d \u09AE\u09BF\u09A8\u09BF\u099F',
          h: '\u098F\u0995 \u0998\u09A8\u09CD\u099F\u09BE',
          hh: '%d \u0998\u09A8\u09CD\u099F\u09BE',
          d: '\u098F\u0995 \u09A6\u09BF\u09A8',
          dd: '%d \u09A6\u09BF\u09A8',
          M: '\u098F\u0995 \u09AE\u09BE\u09B8',
          MM: '%d \u09AE\u09BE\u09B8',
          y: '\u098F\u0995 \u09AC\u099B\u09B0',
          yy: '%d \u09AC\u099B\u09B0',
        },
        preparse: function (e) {
          return e.replace(/[১২৩৪৫৬৭৮৯০]/g, function (s) {
            return X[s]
          })
        },
        postformat: function (e) {
          return e.replace(/\d/g, function (s) {
            return rt[s]
          })
        },
        meridiemParse: /রাত|ভোর|সকাল|দুপুর|বিকাল|সন্ধ্যা|রাত/,
        meridiemHour: function (e, s) {
          if ((e === 12 && (e = 0), s === '\u09B0\u09BE\u09A4'))
            return e < 4 ? e : e + 12
          if (s === '\u09AD\u09CB\u09B0') return e
          if (s === '\u09B8\u0995\u09BE\u09B2') return e
          if (s === '\u09A6\u09C1\u09AA\u09C1\u09B0') return e >= 3 ? e : e + 12
          if (s === '\u09AC\u09BF\u0995\u09BE\u09B2') return e + 12
          if (s === '\u09B8\u09A8\u09CD\u09A7\u09CD\u09AF\u09BE') return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u09B0\u09BE\u09A4'
            : e < 6
              ? '\u09AD\u09CB\u09B0'
              : e < 12
                ? '\u09B8\u0995\u09BE\u09B2'
                : e < 15
                  ? '\u09A6\u09C1\u09AA\u09C1\u09B0'
                  : e < 18
                    ? '\u09AC\u09BF\u0995\u09BE\u09B2'
                    : e < 20
                      ? '\u09B8\u09A8\u09CD\u09A7\u09CD\u09AF\u09BE'
                      : '\u09B0\u09BE\u09A4'
        },
        week: {dow: 0, doy: 6},
      })
      var nt = {
          1: '\u09E7',
          2: '\u09E8',
          3: '\u09E9',
          4: '\u09EA',
          5: '\u09EB',
          6: '\u09EC',
          7: '\u09ED',
          8: '\u09EE',
          9: '\u09EF',
          0: '\u09E6',
        },
        dt = {
          '\u09E7': '1',
          '\u09E8': '2',
          '\u09E9': '3',
          '\u09EA': '4',
          '\u09EB': '5',
          '\u09EC': '6',
          '\u09ED': '7',
          '\u09EE': '8',
          '\u09EF': '9',
          '\u09E6': '0',
        }
      u.defineLocale('bn', {
        months:
          '\u099C\u09BE\u09A8\u09C1\u09DF\u09BE\u09B0\u09BF_\u09AB\u09C7\u09AC\u09CD\u09B0\u09C1\u09DF\u09BE\u09B0\u09BF_\u09AE\u09BE\u09B0\u09CD\u099A_\u098F\u09AA\u09CD\u09B0\u09BF\u09B2_\u09AE\u09C7_\u099C\u09C1\u09A8_\u099C\u09C1\u09B2\u09BE\u0987_\u0986\u0997\u09B8\u09CD\u099F_\u09B8\u09C7\u09AA\u09CD\u099F\u09C7\u09AE\u09CD\u09AC\u09B0_\u0985\u0995\u09CD\u099F\u09CB\u09AC\u09B0_\u09A8\u09AD\u09C7\u09AE\u09CD\u09AC\u09B0_\u09A1\u09BF\u09B8\u09C7\u09AE\u09CD\u09AC\u09B0'.split(
            '_',
          ),
        monthsShort:
          '\u099C\u09BE\u09A8\u09C1_\u09AB\u09C7\u09AC\u09CD\u09B0\u09C1_\u09AE\u09BE\u09B0\u09CD\u099A_\u098F\u09AA\u09CD\u09B0\u09BF\u09B2_\u09AE\u09C7_\u099C\u09C1\u09A8_\u099C\u09C1\u09B2\u09BE\u0987_\u0986\u0997\u09B8\u09CD\u099F_\u09B8\u09C7\u09AA\u09CD\u099F_\u0985\u0995\u09CD\u099F\u09CB_\u09A8\u09AD\u09C7_\u09A1\u09BF\u09B8\u09C7'.split(
            '_',
          ),
        weekdays:
          '\u09B0\u09AC\u09BF\u09AC\u09BE\u09B0_\u09B8\u09CB\u09AE\u09AC\u09BE\u09B0_\u09AE\u0999\u09CD\u0997\u09B2\u09AC\u09BE\u09B0_\u09AC\u09C1\u09A7\u09AC\u09BE\u09B0_\u09AC\u09C3\u09B9\u09B8\u09CD\u09AA\u09A4\u09BF\u09AC\u09BE\u09B0_\u09B6\u09C1\u0995\u09CD\u09B0\u09AC\u09BE\u09B0_\u09B6\u09A8\u09BF\u09AC\u09BE\u09B0'.split(
            '_',
          ),
        weekdaysShort:
          '\u09B0\u09AC\u09BF_\u09B8\u09CB\u09AE_\u09AE\u0999\u09CD\u0997\u09B2_\u09AC\u09C1\u09A7_\u09AC\u09C3\u09B9\u09B8\u09CD\u09AA\u09A4\u09BF_\u09B6\u09C1\u0995\u09CD\u09B0_\u09B6\u09A8\u09BF'.split(
            '_',
          ),
        weekdaysMin:
          '\u09B0\u09AC\u09BF_\u09B8\u09CB\u09AE_\u09AE\u0999\u09CD\u0997\u09B2_\u09AC\u09C1\u09A7_\u09AC\u09C3\u09B9_\u09B6\u09C1\u0995\u09CD\u09B0_\u09B6\u09A8\u09BF'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'A h:mm \u09B8\u09AE\u09DF',
          LTS: 'A h:mm:ss \u09B8\u09AE\u09DF',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY, A h:mm \u09B8\u09AE\u09DF',
          LLLL: 'dddd, D MMMM YYYY, A h:mm \u09B8\u09AE\u09DF',
        },
        calendar: {
          sameDay: '[\u0986\u099C] LT',
          nextDay: '[\u0986\u0997\u09BE\u09AE\u09C0\u0995\u09BE\u09B2] LT',
          nextWeek: 'dddd, LT',
          lastDay: '[\u0997\u09A4\u0995\u09BE\u09B2] LT',
          lastWeek: '[\u0997\u09A4] dddd, LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u09AA\u09B0\u09C7',
          past: '%s \u0986\u0997\u09C7',
          s: '\u0995\u09DF\u09C7\u0995 \u09B8\u09C7\u0995\u09C7\u09A8\u09CD\u09A1',
          ss: '%d \u09B8\u09C7\u0995\u09C7\u09A8\u09CD\u09A1',
          m: '\u098F\u0995 \u09AE\u09BF\u09A8\u09BF\u099F',
          mm: '%d \u09AE\u09BF\u09A8\u09BF\u099F',
          h: '\u098F\u0995 \u0998\u09A8\u09CD\u099F\u09BE',
          hh: '%d \u0998\u09A8\u09CD\u099F\u09BE',
          d: '\u098F\u0995 \u09A6\u09BF\u09A8',
          dd: '%d \u09A6\u09BF\u09A8',
          M: '\u098F\u0995 \u09AE\u09BE\u09B8',
          MM: '%d \u09AE\u09BE\u09B8',
          y: '\u098F\u0995 \u09AC\u099B\u09B0',
          yy: '%d \u09AC\u099B\u09B0',
        },
        preparse: function (e) {
          return e.replace(/[১২৩৪৫৬৭৮৯০]/g, function (s) {
            return dt[s]
          })
        },
        postformat: function (e) {
          return e.replace(/\d/g, function (s) {
            return nt[s]
          })
        },
        meridiemParse: /রাত|সকাল|দুপুর|বিকাল|রাত/,
        meridiemHour: function (e, s) {
          return (
            e === 12 && (e = 0),
            (s === '\u09B0\u09BE\u09A4' && e >= 4) ||
            (s === '\u09A6\u09C1\u09AA\u09C1\u09B0' && e < 5) ||
            s === '\u09AC\u09BF\u0995\u09BE\u09B2'
              ? e + 12
              : e
          )
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u09B0\u09BE\u09A4'
            : e < 10
              ? '\u09B8\u0995\u09BE\u09B2'
              : e < 17
                ? '\u09A6\u09C1\u09AA\u09C1\u09B0'
                : e < 20
                  ? '\u09AC\u09BF\u0995\u09BE\u09B2'
                  : '\u09B0\u09BE\u09A4'
        },
        week: {dow: 0, doy: 6},
      })
      var le = {
          1: '\u0F21',
          2: '\u0F22',
          3: '\u0F23',
          4: '\u0F24',
          5: '\u0F25',
          6: '\u0F26',
          7: '\u0F27',
          8: '\u0F28',
          9: '\u0F29',
          0: '\u0F20',
        },
        Rt = {
          '\u0F21': '1',
          '\u0F22': '2',
          '\u0F23': '3',
          '\u0F24': '4',
          '\u0F25': '5',
          '\u0F26': '6',
          '\u0F27': '7',
          '\u0F28': '8',
          '\u0F29': '9',
          '\u0F20': '0',
        }
      u.defineLocale('bo', {
        months:
          '\u0F5F\u0FB3\u0F0B\u0F56\u0F0B\u0F51\u0F44\u0F0B\u0F54\u0F7C_\u0F5F\u0FB3\u0F0B\u0F56\u0F0B\u0F42\u0F49\u0F72\u0F66\u0F0B\u0F54_\u0F5F\u0FB3\u0F0B\u0F56\u0F0B\u0F42\u0F66\u0F74\u0F58\u0F0B\u0F54_\u0F5F\u0FB3\u0F0B\u0F56\u0F0B\u0F56\u0F5E\u0F72\u0F0B\u0F54_\u0F5F\u0FB3\u0F0B\u0F56\u0F0B\u0F63\u0F94\u0F0B\u0F54_\u0F5F\u0FB3\u0F0B\u0F56\u0F0B\u0F51\u0FB2\u0F74\u0F42\u0F0B\u0F54_\u0F5F\u0FB3\u0F0B\u0F56\u0F0B\u0F56\u0F51\u0F74\u0F53\u0F0B\u0F54_\u0F5F\u0FB3\u0F0B\u0F56\u0F0B\u0F56\u0F62\u0F92\u0FB1\u0F51\u0F0B\u0F54_\u0F5F\u0FB3\u0F0B\u0F56\u0F0B\u0F51\u0F42\u0F74\u0F0B\u0F54_\u0F5F\u0FB3\u0F0B\u0F56\u0F0B\u0F56\u0F45\u0F74\u0F0B\u0F54_\u0F5F\u0FB3\u0F0B\u0F56\u0F0B\u0F56\u0F45\u0F74\u0F0B\u0F42\u0F45\u0F72\u0F42\u0F0B\u0F54_\u0F5F\u0FB3\u0F0B\u0F56\u0F0B\u0F56\u0F45\u0F74\u0F0B\u0F42\u0F49\u0F72\u0F66\u0F0B\u0F54'.split(
            '_',
          ),
        monthsShort:
          '\u0F5F\u0FB3\u0F0B1_\u0F5F\u0FB3\u0F0B2_\u0F5F\u0FB3\u0F0B3_\u0F5F\u0FB3\u0F0B4_\u0F5F\u0FB3\u0F0B5_\u0F5F\u0FB3\u0F0B6_\u0F5F\u0FB3\u0F0B7_\u0F5F\u0FB3\u0F0B8_\u0F5F\u0FB3\u0F0B9_\u0F5F\u0FB3\u0F0B10_\u0F5F\u0FB3\u0F0B11_\u0F5F\u0FB3\u0F0B12'.split(
            '_',
          ),
        monthsShortRegex: /^(ཟླ་\d{1,2})/,
        monthsParseExact: !0,
        weekdays:
          '\u0F42\u0F5F\u0F60\u0F0B\u0F49\u0F72\u0F0B\u0F58\u0F0B_\u0F42\u0F5F\u0F60\u0F0B\u0F5F\u0FB3\u0F0B\u0F56\u0F0B_\u0F42\u0F5F\u0F60\u0F0B\u0F58\u0F72\u0F42\u0F0B\u0F51\u0F58\u0F62\u0F0B_\u0F42\u0F5F\u0F60\u0F0B\u0F63\u0FB7\u0F42\u0F0B\u0F54\u0F0B_\u0F42\u0F5F\u0F60\u0F0B\u0F55\u0F74\u0F62\u0F0B\u0F56\u0F74_\u0F42\u0F5F\u0F60\u0F0B\u0F54\u0F0B\u0F66\u0F44\u0F66\u0F0B_\u0F42\u0F5F\u0F60\u0F0B\u0F66\u0FA4\u0F7A\u0F53\u0F0B\u0F54\u0F0B'.split(
            '_',
          ),
        weekdaysShort:
          '\u0F49\u0F72\u0F0B\u0F58\u0F0B_\u0F5F\u0FB3\u0F0B\u0F56\u0F0B_\u0F58\u0F72\u0F42\u0F0B\u0F51\u0F58\u0F62\u0F0B_\u0F63\u0FB7\u0F42\u0F0B\u0F54\u0F0B_\u0F55\u0F74\u0F62\u0F0B\u0F56\u0F74_\u0F54\u0F0B\u0F66\u0F44\u0F66\u0F0B_\u0F66\u0FA4\u0F7A\u0F53\u0F0B\u0F54\u0F0B'.split(
            '_',
          ),
        weekdaysMin:
          '\u0F49\u0F72_\u0F5F\u0FB3_\u0F58\u0F72\u0F42_\u0F63\u0FB7\u0F42_\u0F55\u0F74\u0F62_\u0F66\u0F44\u0F66_\u0F66\u0FA4\u0F7A\u0F53'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'A h:mm',
          LTS: 'A h:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY, A h:mm',
          LLLL: 'dddd, D MMMM YYYY, A h:mm',
        },
        calendar: {
          sameDay: '[\u0F51\u0F72\u0F0B\u0F62\u0F72\u0F44] LT',
          nextDay: '[\u0F66\u0F44\u0F0B\u0F49\u0F72\u0F53] LT',
          nextWeek:
            '[\u0F56\u0F51\u0F74\u0F53\u0F0B\u0F55\u0FB2\u0F42\u0F0B\u0F62\u0F97\u0F7A\u0F66\u0F0B\u0F58], LT',
          lastDay: '[\u0F41\u0F0B\u0F66\u0F44] LT',
          lastWeek:
            '[\u0F56\u0F51\u0F74\u0F53\u0F0B\u0F55\u0FB2\u0F42\u0F0B\u0F58\u0F50\u0F60\u0F0B\u0F58] dddd, LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u0F63\u0F0B',
          past: '%s \u0F66\u0F94\u0F53\u0F0B\u0F63',
          s: '\u0F63\u0F58\u0F0B\u0F66\u0F44',
          ss: '%d \u0F66\u0F90\u0F62\u0F0B\u0F46\u0F0D',
          m: '\u0F66\u0F90\u0F62\u0F0B\u0F58\u0F0B\u0F42\u0F45\u0F72\u0F42',
          mm: '%d \u0F66\u0F90\u0F62\u0F0B\u0F58',
          h: '\u0F46\u0F74\u0F0B\u0F5A\u0F7C\u0F51\u0F0B\u0F42\u0F45\u0F72\u0F42',
          hh: '%d \u0F46\u0F74\u0F0B\u0F5A\u0F7C\u0F51',
          d: '\u0F49\u0F72\u0F53\u0F0B\u0F42\u0F45\u0F72\u0F42',
          dd: '%d \u0F49\u0F72\u0F53\u0F0B',
          M: '\u0F5F\u0FB3\u0F0B\u0F56\u0F0B\u0F42\u0F45\u0F72\u0F42',
          MM: '%d \u0F5F\u0FB3\u0F0B\u0F56',
          y: '\u0F63\u0F7C\u0F0B\u0F42\u0F45\u0F72\u0F42',
          yy: '%d \u0F63\u0F7C',
        },
        preparse: function (e) {
          return e.replace(/[༡༢༣༤༥༦༧༨༩༠]/g, function (s) {
            return Rt[s]
          })
        },
        postformat: function (e) {
          return e.replace(/\d/g, function (s) {
            return le[s]
          })
        },
        meridiemParse: /མཚན་མོ|ཞོགས་ཀས|ཉིན་གུང|དགོང་དག|མཚན་མོ/,
        meridiemHour: function (e, s) {
          return (
            e === 12 && (e = 0),
            (s === '\u0F58\u0F5A\u0F53\u0F0B\u0F58\u0F7C' && e >= 4) ||
            (s === '\u0F49\u0F72\u0F53\u0F0B\u0F42\u0F74\u0F44' && e < 5) ||
            s === '\u0F51\u0F42\u0F7C\u0F44\u0F0B\u0F51\u0F42'
              ? e + 12
              : e
          )
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u0F58\u0F5A\u0F53\u0F0B\u0F58\u0F7C'
            : e < 10
              ? '\u0F5E\u0F7C\u0F42\u0F66\u0F0B\u0F40\u0F66'
              : e < 17
                ? '\u0F49\u0F72\u0F53\u0F0B\u0F42\u0F74\u0F44'
                : e < 20
                  ? '\u0F51\u0F42\u0F7C\u0F44\u0F0B\u0F51\u0F42'
                  : '\u0F58\u0F5A\u0F53\u0F0B\u0F58\u0F7C'
        },
        week: {dow: 0, doy: 6},
      })
      function ea(e, s, i) {
        var _ = {mm: 'munutenn', MM: 'miz', dd: 'devezh'}
        return e + ' ' + Jt(_[i], e)
      }
      function Wa(e) {
        switch (ca(e)) {
          case 1:
          case 3:
          case 4:
          case 5:
          case 9:
            return e + ' bloaz'
          default:
            return e + ' vloaz'
        }
      }
      function ca(e) {
        return e > 9 ? ca(e % 10) : e
      }
      function Jt(e, s) {
        return s === 2 ? It(e) : e
      }
      function It(e) {
        var s = {m: 'v', b: 'v', d: 'z'}
        return s[e.charAt(0)] === void 0 ? e : s[e.charAt(0)] + e.substring(1)
      }
      var ee = [
          /^gen/i,
          /^c[ʼ']hwe/i,
          /^meu/i,
          /^ebr/i,
          /^mae/i,
          /^(mez|eve)/i,
          /^gou/i,
          /^eos/i,
          /^gwe/i,
          /^her/i,
          /^du/i,
          /^ker/i,
        ],
        La =
          /^(genver|c[ʼ']hwevrer|meurzh|ebrel|mae|mezheven|gouere|eost|gwengolo|here|du|kerzu|gen|c[ʼ']hwe|meu|ebr|mae|eve|gou|eos|gwe|her|du|ker)/i,
        Ya =
          /^(genver|c[ʼ']hwevrer|meurzh|ebrel|mae|mezheven|gouere|eost|gwengolo|here|du|kerzu)/i,
        Aa = /^(gen|c[ʼ']hwe|meu|ebr|mae|eve|gou|eos|gwe|her|du|ker)/i,
        ze = [
          /^sul/i,
          /^lun/i,
          /^meurzh/i,
          /^merc[ʼ']her/i,
          /^yaou/i,
          /^gwener/i,
          /^sadorn/i,
        ],
        Y = [/^Sul/i, /^Lun/i, /^Meu/i, /^Mer/i, /^Yao/i, /^Gwe/i, /^Sad/i],
        it = [/^Su/i, /^Lu/i, /^Me([^r]|$)/i, /^Mer/i, /^Ya/i, /^Gw/i, /^Sa/i]
      u.defineLocale('br', {
        months:
          'Genver_C\u02BChwevrer_Meurzh_Ebrel_Mae_Mezheven_Gouere_Eost_Gwengolo_Here_Du_Kerzu'.split(
            '_',
          ),
        monthsShort:
          'Gen_C\u02BChwe_Meu_Ebr_Mae_Eve_Gou_Eos_Gwe_Her_Du_Ker'.split('_'),
        weekdays: 'Sul_Lun_Meurzh_Merc\u02BCher_Yaou_Gwener_Sadorn'.split('_'),
        weekdaysShort: 'Sul_Lun_Meu_Mer_Yao_Gwe_Sad'.split('_'),
        weekdaysMin: 'Su_Lu_Me_Mer_Ya_Gw_Sa'.split('_'),
        weekdaysParse: it,
        fullWeekdaysParse: ze,
        shortWeekdaysParse: Y,
        minWeekdaysParse: it,
        monthsRegex: La,
        monthsShortRegex: La,
        monthsStrictRegex: Ya,
        monthsShortStrictRegex: Aa,
        monthsParse: ee,
        longMonthsParse: ee,
        shortMonthsParse: ee,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D [a viz] MMMM YYYY',
          LLL: 'D [a viz] MMMM YYYY HH:mm',
          LLLL: 'dddd, D [a viz] MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Hiziv da] LT',
          nextDay: '[Warc\u02BChoazh da] LT',
          nextWeek: 'dddd [da] LT',
          lastDay: '[Dec\u02BCh da] LT',
          lastWeek: 'dddd [paset da] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'a-benn %s',
          past: '%s \u02BCzo',
          s: 'un nebeud segondenno\xF9',
          ss: '%d eilenn',
          m: 'ur vunutenn',
          mm: ea,
          h: 'un eur',
          hh: '%d eur',
          d: 'un devezh',
          dd: ea,
          M: 'ur miz',
          MM: ea,
          y: 'ur bloaz',
          yy: Wa,
        },
        dayOfMonthOrdinalParse: /\d{1,2}(añ|vet)/,
        ordinal: function (e) {
          var s = e === 1 ? 'a\xF1' : 'vet'
          return e + s
        },
        week: {dow: 1, doy: 4},
        meridiemParse: /a.m.|g.m./,
        isPM: function (e) {
          return e === 'g.m.'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? 'a.m.' : 'g.m.'
        },
      })
      function $t(e, s, i, _) {
        switch (i) {
          case 'm':
            return s ? 'jedna minuta' : _ ? 'jednu minutu' : 'jedne minute'
        }
      }
      function ue(e, s, i) {
        var _ = e + ' '
        switch (i) {
          case 'ss':
            return (
              e === 1
                ? (_ += 'sekunda')
                : e === 2 || e === 3 || e === 4
                  ? (_ += 'sekunde')
                  : (_ += 'sekundi'),
              _
            )
          case 'mm':
            return (
              e === 1
                ? (_ += 'minuta')
                : e === 2 || e === 3 || e === 4
                  ? (_ += 'minute')
                  : (_ += 'minuta'),
              _
            )
          case 'h':
            return 'jedan sat'
          case 'hh':
            return (
              e === 1
                ? (_ += 'sat')
                : e === 2 || e === 3 || e === 4
                  ? (_ += 'sata')
                  : (_ += 'sati'),
              _
            )
          case 'dd':
            return (e === 1 ? (_ += 'dan') : (_ += 'dana'), _)
          case 'MM':
            return (
              e === 1
                ? (_ += 'mjesec')
                : e === 2 || e === 3 || e === 4
                  ? (_ += 'mjeseca')
                  : (_ += 'mjeseci'),
              _
            )
          case 'yy':
            return (
              e === 1
                ? (_ += 'godina')
                : e === 2 || e === 3 || e === 4
                  ? (_ += 'godine')
                  : (_ += 'godina'),
              _
            )
        }
      }
      u.defineLocale('bs', {
        months:
          'januar_februar_mart_april_maj_juni_juli_august_septembar_oktobar_novembar_decembar'.split(
            '_',
          ),
        monthsShort:
          'jan._feb._mar._apr._maj._jun._jul._aug._sep._okt._nov._dec.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'nedjelja_ponedjeljak_utorak_srijeda_\u010Detvrtak_petak_subota'.split(
            '_',
          ),
        weekdaysShort: 'ned._pon._uto._sri._\u010Det._pet._sub.'.split('_'),
        weekdaysMin: 'ne_po_ut_sr_\u010De_pe_su'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY H:mm',
          LLLL: 'dddd, D. MMMM YYYY H:mm',
        },
        calendar: {
          sameDay: '[danas u] LT',
          nextDay: '[sutra u] LT',
          nextWeek: function () {
            switch (this.day()) {
              case 0:
                return '[u] [nedjelju] [u] LT'
              case 3:
                return '[u] [srijedu] [u] LT'
              case 6:
                return '[u] [subotu] [u] LT'
              case 1:
              case 2:
              case 4:
              case 5:
                return '[u] dddd [u] LT'
            }
          },
          lastDay: '[ju\u010Der u] LT',
          lastWeek: function () {
            switch (this.day()) {
              case 0:
              case 3:
                return '[pro\u0161lu] dddd [u] LT'
              case 6:
                return '[pro\u0161le] [subote] [u] LT'
              case 1:
              case 2:
              case 4:
              case 5:
                return '[pro\u0161li] dddd [u] LT'
            }
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'za %s',
          past: 'prije %s',
          s: 'par sekundi',
          ss: ue,
          m: $t,
          mm: ue,
          h: ue,
          hh: ue,
          d: 'dan',
          dd: ue,
          M: 'mjesec',
          MM: ue,
          y: 'godinu',
          yy: ue,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('ca', {
        months: {
          standalone:
            'gener_febrer_mar\xE7_abril_maig_juny_juliol_agost_setembre_octubre_novembre_desembre'.split(
              '_',
            ),
          format:
            "de gener_de febrer_de mar\xE7_d'abril_de maig_de juny_de juliol_d'agost_de setembre_d'octubre_de novembre_de desembre".split(
              '_',
            ),
          isFormat: /D[oD]?(\s)+MMMM/,
        },
        monthsShort:
          'gen._febr._mar\xE7_abr._maig_juny_jul._ag._set._oct._nov._des.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'diumenge_dilluns_dimarts_dimecres_dijous_divendres_dissabte'.split(
            '_',
          ),
        weekdaysShort: 'dg._dl._dt._dc._dj._dv._ds.'.split('_'),
        weekdaysMin: 'dg_dl_dt_dc_dj_dv_ds'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM [de] YYYY',
          ll: 'D MMM YYYY',
          LLL: 'D MMMM [de] YYYY [a les] H:mm',
          lll: 'D MMM YYYY, H:mm',
          LLLL: 'dddd D MMMM [de] YYYY [a les] H:mm',
          llll: 'ddd D MMM YYYY, H:mm',
        },
        calendar: {
          sameDay: function () {
            return '[avui a ' + (this.hours() !== 1 ? 'les' : 'la') + '] LT'
          },
          nextDay: function () {
            return '[dem\xE0 a ' + (this.hours() !== 1 ? 'les' : 'la') + '] LT'
          },
          nextWeek: function () {
            return 'dddd [a ' + (this.hours() !== 1 ? 'les' : 'la') + '] LT'
          },
          lastDay: function () {
            return '[ahir a ' + (this.hours() !== 1 ? 'les' : 'la') + '] LT'
          },
          lastWeek: function () {
            return (
              '[el] dddd [passat a ' +
              (this.hours() !== 1 ? 'les' : 'la') +
              '] LT'
            )
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: "d'aqu\xED %s",
          past: 'fa %s',
          s: 'uns segons',
          ss: '%d segons',
          m: 'un minut',
          mm: '%d minuts',
          h: 'una hora',
          hh: '%d hores',
          d: 'un dia',
          dd: '%d dies',
          M: 'un mes',
          MM: '%d mesos',
          y: 'un any',
          yy: '%d anys',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(r|n|t|è|a)/,
        ordinal: function (e, s) {
          var i =
            e === 1
              ? 'r'
              : e === 2
                ? 'n'
                : e === 3
                  ? 'r'
                  : e === 4
                    ? 't'
                    : '\xE8'
          return ((s === 'w' || s === 'W') && (i = 'a'), e + i)
        },
        week: {dow: 1, doy: 4},
      })
      var _t = {
          standalone:
            'leden_\xFAnor_b\u0159ezen_duben_kv\u011Bten_\u010Derven_\u010Dervenec_srpen_z\xE1\u0159\xED_\u0159\xEDjen_listopad_prosinec'.split(
              '_',
            ),
          format:
            'ledna_\xFAnora_b\u0159ezna_dubna_kv\u011Btna_\u010Dervna_\u010Dervence_srpna_z\xE1\u0159\xED_\u0159\xEDjna_listopadu_prosince'.split(
              '_',
            ),
          isFormat: /DD?[o.]?(\[[^[\]]*\]|\s)+MMMM/,
        },
        Ct =
          'led_\xFAno_b\u0159e_dub_kv\u011B_\u010Dvn_\u010Dvc_srp_z\xE1\u0159_\u0159\xEDj_lis_pro'.split(
            '_',
          ),
        Ea = [
          /^led/i,
          /^úno/i,
          /^bře/i,
          /^dub/i,
          /^kvě/i,
          /^(čvn|červen$|června)/i,
          /^(čvc|červenec|července)/i,
          /^srp/i,
          /^zář/i,
          /^říj/i,
          /^lis/i,
          /^pro/i,
        ],
        ot =
          /^(leden|únor|březen|duben|květen|červenec|července|červen|června|srpen|září|říjen|listopad|prosinec|led|úno|bře|dub|kvě|čvn|čvc|srp|zář|říj|lis|pro)/i
      function Ne(e) {
        return e > 1 && e < 5 && ~~(e / 10) !== 1
      }
      function ae(e, s, i, _) {
        var l = e + ' '
        switch (i) {
          case 's':
            return s || _ ? 'p\xE1r sekund' : 'p\xE1r sekundami'
          case 'ss':
            return s || _ ? l + (Ne(e) ? 'sekundy' : 'sekund') : l + 'sekundami'
          case 'm':
            return s ? 'minuta' : _ ? 'minutu' : 'minutou'
          case 'mm':
            return s || _ ? l + (Ne(e) ? 'minuty' : 'minut') : l + 'minutami'
          case 'h':
            return s ? 'hodina' : _ ? 'hodinu' : 'hodinou'
          case 'hh':
            return s || _ ? l + (Ne(e) ? 'hodiny' : 'hodin') : l + 'hodinami'
          case 'd':
            return s || _ ? 'den' : 'dnem'
          case 'dd':
            return s || _ ? l + (Ne(e) ? 'dny' : 'dn\xED') : l + 'dny'
          case 'M':
            return s || _ ? 'm\u011Bs\xEDc' : 'm\u011Bs\xEDcem'
          case 'MM':
            return s || _
              ? l + (Ne(e) ? 'm\u011Bs\xEDce' : 'm\u011Bs\xEDc\u016F')
              : l + 'm\u011Bs\xEDci'
          case 'y':
            return s || _ ? 'rok' : 'rokem'
          case 'yy':
            return s || _ ? l + (Ne(e) ? 'roky' : 'let') : l + 'lety'
        }
      }
      u.defineLocale('cs', {
        months: _t,
        monthsShort: Ct,
        monthsRegex: ot,
        monthsShortRegex: ot,
        monthsStrictRegex:
          /^(leden|ledna|února|únor|březen|března|duben|dubna|květen|května|červenec|července|červen|června|srpen|srpna|září|říjen|října|listopadu|listopad|prosinec|prosince)/i,
        monthsShortStrictRegex:
          /^(led|úno|bře|dub|kvě|čvn|čvc|srp|zář|říj|lis|pro)/i,
        monthsParse: Ea,
        longMonthsParse: Ea,
        shortMonthsParse: Ea,
        weekdays:
          'ned\u011Ble_pond\u011Bl\xED_\xFAter\xFD_st\u0159eda_\u010Dtvrtek_p\xE1tek_sobota'.split(
            '_',
          ),
        weekdaysShort: 'ne_po_\xFAt_st_\u010Dt_p\xE1_so'.split('_'),
        weekdaysMin: 'ne_po_\xFAt_st_\u010Dt_p\xE1_so'.split('_'),
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY H:mm',
          LLLL: 'dddd D. MMMM YYYY H:mm',
          l: 'D. M. YYYY',
        },
        calendar: {
          sameDay: '[dnes v] LT',
          nextDay: '[z\xEDtra v] LT',
          nextWeek: function () {
            switch (this.day()) {
              case 0:
                return '[v ned\u011Bli v] LT'
              case 1:
              case 2:
                return '[v] dddd [v] LT'
              case 3:
                return '[ve st\u0159edu v] LT'
              case 4:
                return '[ve \u010Dtvrtek v] LT'
              case 5:
                return '[v p\xE1tek v] LT'
              case 6:
                return '[v sobotu v] LT'
            }
          },
          lastDay: '[v\u010Dera v] LT',
          lastWeek: function () {
            switch (this.day()) {
              case 0:
                return '[minulou ned\u011Bli v] LT'
              case 1:
              case 2:
                return '[minul\xE9] dddd [v] LT'
              case 3:
                return '[minulou st\u0159edu v] LT'
              case 4:
              case 5:
                return '[minul\xFD] dddd [v] LT'
              case 6:
                return '[minulou sobotu v] LT'
            }
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'za %s',
          past: 'p\u0159ed %s',
          s: ae,
          ss: ae,
          m: ae,
          mm: ae,
          h: ae,
          hh: ae,
          d: ae,
          dd: ae,
          M: ae,
          MM: ae,
          y: ae,
          yy: ae,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('cv', {
        months:
          '\u043A\u04D1\u0440\u043B\u0430\u0447_\u043D\u0430\u0440\u04D1\u0441_\u043F\u0443\u0448_\u0430\u043A\u0430_\u043C\u0430\u0439_\u04AB\u04D7\u0440\u0442\u043C\u0435_\u0443\u0442\u04D1_\u04AB\u0443\u0440\u043B\u0430_\u0430\u0432\u04D1\u043D_\u044E\u043F\u0430_\u0447\u04F3\u043A_\u0440\u0430\u0448\u0442\u0430\u0432'.split(
            '_',
          ),
        monthsShort:
          '\u043A\u04D1\u0440_\u043D\u0430\u0440_\u043F\u0443\u0448_\u0430\u043A\u0430_\u043C\u0430\u0439_\u04AB\u04D7\u0440_\u0443\u0442\u04D1_\u04AB\u0443\u0440_\u0430\u0432\u043D_\u044E\u043F\u0430_\u0447\u04F3\u043A_\u0440\u0430\u0448'.split(
            '_',
          ),
        weekdays:
          '\u0432\u044B\u0440\u0441\u0430\u0440\u043D\u0438\u043A\u0443\u043D_\u0442\u0443\u043D\u0442\u0438\u043A\u0443\u043D_\u044B\u0442\u043B\u0430\u0440\u0438\u043A\u0443\u043D_\u044E\u043D\u043A\u0443\u043D_\u043A\u04D7\u04AB\u043D\u0435\u0440\u043D\u0438\u043A\u0443\u043D_\u044D\u0440\u043D\u0435\u043A\u0443\u043D_\u0448\u04D1\u043C\u0430\u0442\u043A\u0443\u043D'.split(
            '_',
          ),
        weekdaysShort:
          '\u0432\u044B\u0440_\u0442\u0443\u043D_\u044B\u0442\u043B_\u044E\u043D_\u043A\u04D7\u04AB_\u044D\u0440\u043D_\u0448\u04D1\u043C'.split(
            '_',
          ),
        weekdaysMin:
          '\u0432\u0440_\u0442\u043D_\u044B\u0442_\u044E\u043D_\u043A\u04AB_\u044D\u0440_\u0448\u043C'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD-MM-YYYY',
          LL: 'YYYY [\u04AB\u0443\u043B\u0445\u0438] MMMM [\u0443\u0439\u04D1\u0445\u04D7\u043D] D[-\u043C\u04D7\u0448\u04D7]',
          LLL: 'YYYY [\u04AB\u0443\u043B\u0445\u0438] MMMM [\u0443\u0439\u04D1\u0445\u04D7\u043D] D[-\u043C\u04D7\u0448\u04D7], HH:mm',
          LLLL: 'dddd, YYYY [\u04AB\u0443\u043B\u0445\u0438] MMMM [\u0443\u0439\u04D1\u0445\u04D7\u043D] D[-\u043C\u04D7\u0448\u04D7], HH:mm',
        },
        calendar: {
          sameDay:
            '[\u041F\u0430\u044F\u043D] LT [\u0441\u0435\u0445\u0435\u0442\u0440\u0435]',
          nextDay:
            '[\u042B\u0440\u0430\u043D] LT [\u0441\u0435\u0445\u0435\u0442\u0440\u0435]',
          lastDay:
            '[\u04D6\u043D\u0435\u0440] LT [\u0441\u0435\u0445\u0435\u0442\u0440\u0435]',
          nextWeek:
            '[\u04AA\u0438\u0442\u0435\u0441] dddd LT [\u0441\u0435\u0445\u0435\u0442\u0440\u0435]',
          lastWeek:
            '[\u0418\u0440\u0442\u043D\u04D7] dddd LT [\u0441\u0435\u0445\u0435\u0442\u0440\u0435]',
          sameElse: 'L',
        },
        relativeTime: {
          future: function (e) {
            var s = /сехет$/i.exec(e)
              ? '\u0440\u0435\u043D'
              : /ҫул$/i.exec(e)
                ? '\u0442\u0430\u043D'
                : '\u0440\u0430\u043D'
            return e + s
          },
          past: '%s \u043A\u0430\u044F\u043B\u043B\u0430',
          s: '\u043F\u04D7\u0440-\u0438\u043A \u04AB\u0435\u043A\u043A\u0443\u043D\u0442',
          ss: '%d \u04AB\u0435\u043A\u043A\u0443\u043D\u0442',
          m: '\u043F\u04D7\u0440 \u043C\u0438\u043D\u0443\u0442',
          mm: '%d \u043C\u0438\u043D\u0443\u0442',
          h: '\u043F\u04D7\u0440 \u0441\u0435\u0445\u0435\u0442',
          hh: '%d \u0441\u0435\u0445\u0435\u0442',
          d: '\u043F\u04D7\u0440 \u043A\u0443\u043D',
          dd: '%d \u043A\u0443\u043D',
          M: '\u043F\u04D7\u0440 \u0443\u0439\u04D1\u0445',
          MM: '%d \u0443\u0439\u04D1\u0445',
          y: '\u043F\u04D7\u0440 \u04AB\u0443\u043B',
          yy: '%d \u04AB\u0443\u043B',
        },
        dayOfMonthOrdinalParse: /\d{1,2}-мӗш/,
        ordinal: '%d-\u043C\u04D7\u0448',
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('cy', {
        months:
          'Ionawr_Chwefror_Mawrth_Ebrill_Mai_Mehefin_Gorffennaf_Awst_Medi_Hydref_Tachwedd_Rhagfyr'.split(
            '_',
          ),
        monthsShort: 'Ion_Chwe_Maw_Ebr_Mai_Meh_Gor_Aws_Med_Hyd_Tach_Rhag'.split(
          '_',
        ),
        weekdays:
          'Dydd Sul_Dydd Llun_Dydd Mawrth_Dydd Mercher_Dydd Iau_Dydd Gwener_Dydd Sadwrn'.split(
            '_',
          ),
        weekdaysShort: 'Sul_Llun_Maw_Mer_Iau_Gwe_Sad'.split('_'),
        weekdaysMin: 'Su_Ll_Ma_Me_Ia_Gw_Sa'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Heddiw am] LT',
          nextDay: '[Yfory am] LT',
          nextWeek: 'dddd [am] LT',
          lastDay: '[Ddoe am] LT',
          lastWeek: 'dddd [diwethaf am] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'mewn %s',
          past: '%s yn \xF4l',
          s: 'ychydig eiliadau',
          ss: '%d eiliad',
          m: 'munud',
          mm: '%d munud',
          h: 'awr',
          hh: '%d awr',
          d: 'diwrnod',
          dd: '%d diwrnod',
          M: 'mis',
          MM: '%d mis',
          y: 'blwyddyn',
          yy: '%d flynedd',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(fed|ain|af|il|ydd|ed|eg)/,
        ordinal: function (e) {
          var s = e,
            i = '',
            _ = [
              '',
              'af',
              'il',
              'ydd',
              'ydd',
              'ed',
              'ed',
              'ed',
              'fed',
              'fed',
              'fed',
              'eg',
              'fed',
              'eg',
              'eg',
              'fed',
              'eg',
              'eg',
              'fed',
              'eg',
              'fed',
            ]
          return (
            s > 20
              ? s === 40 || s === 50 || s === 60 || s === 80 || s === 100
                ? (i = 'fed')
                : (i = 'ain')
              : s > 0 && (i = _[s]),
            e + i
          )
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('da', {
        months:
          'januar_februar_marts_april_maj_juni_juli_august_september_oktober_november_december'.split(
            '_',
          ),
        monthsShort: 'jan_feb_mar_apr_maj_jun_jul_aug_sep_okt_nov_dec'.split(
          '_',
        ),
        weekdays:
          's\xF8ndag_mandag_tirsdag_onsdag_torsdag_fredag_l\xF8rdag'.split('_'),
        weekdaysShort: 's\xF8n_man_tir_ons_tor_fre_l\xF8r'.split('_'),
        weekdaysMin: 's\xF8_ma_ti_on_to_fr_l\xF8'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY HH:mm',
          LLLL: 'dddd [d.] D. MMMM YYYY [kl.] HH:mm',
        },
        calendar: {
          sameDay: '[i dag kl.] LT',
          nextDay: '[i morgen kl.] LT',
          nextWeek: 'p\xE5 dddd [kl.] LT',
          lastDay: '[i g\xE5r kl.] LT',
          lastWeek: '[i] dddd[s kl.] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'om %s',
          past: '%s siden',
          s: 'f\xE5 sekunder',
          ss: '%d sekunder',
          m: 'et minut',
          mm: '%d minutter',
          h: 'en time',
          hh: '%d timer',
          d: 'en dag',
          dd: '%d dage',
          M: 'en m\xE5ned',
          MM: '%d m\xE5neder',
          y: 'et \xE5r',
          yy: '%d \xE5r',
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      function ke(e, s, i, _) {
        var l = {
          m: ['eine Minute', 'einer Minute'],
          h: ['eine Stunde', 'einer Stunde'],
          d: ['ein Tag', 'einem Tag'],
          dd: [e + ' Tage', e + ' Tagen'],
          w: ['eine Woche', 'einer Woche'],
          M: ['ein Monat', 'einem Monat'],
          MM: [e + ' Monate', e + ' Monaten'],
          y: ['ein Jahr', 'einem Jahr'],
          yy: [e + ' Jahre', e + ' Jahren'],
        }
        return s ? l[i][0] : l[i][1]
      }
      u.defineLocale('de-at', {
        months:
          'J\xE4nner_Februar_M\xE4rz_April_Mai_Juni_Juli_August_September_Oktober_November_Dezember'.split(
            '_',
          ),
        monthsShort:
          'J\xE4n._Feb._M\xE4rz_Apr._Mai_Juni_Juli_Aug._Sep._Okt._Nov._Dez.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'Sonntag_Montag_Dienstag_Mittwoch_Donnerstag_Freitag_Samstag'.split(
            '_',
          ),
        weekdaysShort: 'So._Mo._Di._Mi._Do._Fr._Sa.'.split('_'),
        weekdaysMin: 'So_Mo_Di_Mi_Do_Fr_Sa'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY HH:mm',
          LLLL: 'dddd, D. MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[heute um] LT [Uhr]',
          sameElse: 'L',
          nextDay: '[morgen um] LT [Uhr]',
          nextWeek: 'dddd [um] LT [Uhr]',
          lastDay: '[gestern um] LT [Uhr]',
          lastWeek: '[letzten] dddd [um] LT [Uhr]',
        },
        relativeTime: {
          future: 'in %s',
          past: 'vor %s',
          s: 'ein paar Sekunden',
          ss: '%d Sekunden',
          m: ke,
          mm: '%d Minuten',
          h: ke,
          hh: '%d Stunden',
          d: ke,
          dd: ke,
          w: ke,
          ww: '%d Wochen',
          M: ke,
          MM: ke,
          y: ke,
          yy: ke,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      function pe(e, s, i, _) {
        var l = {
          m: ['eine Minute', 'einer Minute'],
          h: ['eine Stunde', 'einer Stunde'],
          d: ['ein Tag', 'einem Tag'],
          dd: [e + ' Tage', e + ' Tagen'],
          w: ['eine Woche', 'einer Woche'],
          M: ['ein Monat', 'einem Monat'],
          MM: [e + ' Monate', e + ' Monaten'],
          y: ['ein Jahr', 'einem Jahr'],
          yy: [e + ' Jahre', e + ' Jahren'],
        }
        return s ? l[i][0] : l[i][1]
      }
      u.defineLocale('de-ch', {
        months:
          'Januar_Februar_M\xE4rz_April_Mai_Juni_Juli_August_September_Oktober_November_Dezember'.split(
            '_',
          ),
        monthsShort:
          'Jan._Feb._M\xE4rz_Apr._Mai_Juni_Juli_Aug._Sep._Okt._Nov._Dez.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'Sonntag_Montag_Dienstag_Mittwoch_Donnerstag_Freitag_Samstag'.split(
            '_',
          ),
        weekdaysShort: 'So_Mo_Di_Mi_Do_Fr_Sa'.split('_'),
        weekdaysMin: 'So_Mo_Di_Mi_Do_Fr_Sa'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY HH:mm',
          LLLL: 'dddd, D. MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[heute um] LT [Uhr]',
          sameElse: 'L',
          nextDay: '[morgen um] LT [Uhr]',
          nextWeek: 'dddd [um] LT [Uhr]',
          lastDay: '[gestern um] LT [Uhr]',
          lastWeek: '[letzten] dddd [um] LT [Uhr]',
        },
        relativeTime: {
          future: 'in %s',
          past: 'vor %s',
          s: 'ein paar Sekunden',
          ss: '%d Sekunden',
          m: pe,
          mm: '%d Minuten',
          h: pe,
          hh: '%d Stunden',
          d: pe,
          dd: pe,
          w: pe,
          ww: '%d Wochen',
          M: pe,
          MM: pe,
          y: pe,
          yy: pe,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      function De(e, s, i, _) {
        var l = {
          m: ['eine Minute', 'einer Minute'],
          h: ['eine Stunde', 'einer Stunde'],
          d: ['ein Tag', 'einem Tag'],
          dd: [e + ' Tage', e + ' Tagen'],
          w: ['eine Woche', 'einer Woche'],
          M: ['ein Monat', 'einem Monat'],
          MM: [e + ' Monate', e + ' Monaten'],
          y: ['ein Jahr', 'einem Jahr'],
          yy: [e + ' Jahre', e + ' Jahren'],
        }
        return s ? l[i][0] : l[i][1]
      }
      u.defineLocale('de', {
        months:
          'Januar_Februar_M\xE4rz_April_Mai_Juni_Juli_August_September_Oktober_November_Dezember'.split(
            '_',
          ),
        monthsShort:
          'Jan._Feb._M\xE4rz_Apr._Mai_Juni_Juli_Aug._Sep._Okt._Nov._Dez.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'Sonntag_Montag_Dienstag_Mittwoch_Donnerstag_Freitag_Samstag'.split(
            '_',
          ),
        weekdaysShort: 'So._Mo._Di._Mi._Do._Fr._Sa.'.split('_'),
        weekdaysMin: 'So_Mo_Di_Mi_Do_Fr_Sa'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY HH:mm',
          LLLL: 'dddd, D. MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[heute um] LT [Uhr]',
          sameElse: 'L',
          nextDay: '[morgen um] LT [Uhr]',
          nextWeek: 'dddd [um] LT [Uhr]',
          lastDay: '[gestern um] LT [Uhr]',
          lastWeek: '[letzten] dddd [um] LT [Uhr]',
        },
        relativeTime: {
          future: 'in %s',
          past: 'vor %s',
          s: 'ein paar Sekunden',
          ss: '%d Sekunden',
          m: De,
          mm: '%d Minuten',
          h: De,
          hh: '%d Stunden',
          d: De,
          dd: De,
          w: De,
          ww: '%d Wochen',
          M: De,
          MM: De,
          y: De,
          yy: De,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      var lt = [
          '\u0796\u07AC\u0782\u07AA\u0787\u07A6\u0783\u07A9',
          '\u078A\u07AC\u0784\u07B0\u0783\u07AA\u0787\u07A6\u0783\u07A9',
          '\u0789\u07A7\u0783\u07A8\u0797\u07AA',
          '\u0787\u07AD\u0795\u07B0\u0783\u07A9\u078D\u07AA',
          '\u0789\u07AD',
          '\u0796\u07AB\u0782\u07B0',
          '\u0796\u07AA\u078D\u07A6\u0787\u07A8',
          '\u0787\u07AF\u078E\u07A6\u0790\u07B0\u0793\u07AA',
          '\u0790\u07AC\u0795\u07B0\u0793\u07AC\u0789\u07B0\u0784\u07A6\u0783\u07AA',
          '\u0787\u07AE\u0786\u07B0\u0793\u07AF\u0784\u07A6\u0783\u07AA',
          '\u0782\u07AE\u0788\u07AC\u0789\u07B0\u0784\u07A6\u0783\u07AA',
          '\u0791\u07A8\u0790\u07AC\u0789\u07B0\u0784\u07A6\u0783\u07AA',
        ],
        ut = [
          '\u0787\u07A7\u078B\u07A8\u0787\u07B0\u078C\u07A6',
          '\u0780\u07AF\u0789\u07A6',
          '\u0787\u07A6\u0782\u07B0\u078E\u07A7\u0783\u07A6',
          '\u0784\u07AA\u078B\u07A6',
          '\u0784\u07AA\u0783\u07A7\u0790\u07B0\u078A\u07A6\u078C\u07A8',
          '\u0780\u07AA\u0786\u07AA\u0783\u07AA',
          '\u0780\u07AE\u0782\u07A8\u0780\u07A8\u0783\u07AA',
        ]
      u.defineLocale('dv', {
        months: lt,
        monthsShort: lt,
        weekdays: ut,
        weekdaysShort: ut,
        weekdaysMin:
          '\u0787\u07A7\u078B\u07A8_\u0780\u07AF\u0789\u07A6_\u0787\u07A6\u0782\u07B0_\u0784\u07AA\u078B\u07A6_\u0784\u07AA\u0783\u07A7_\u0780\u07AA\u0786\u07AA_\u0780\u07AE\u0782\u07A8'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'D/M/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        meridiemParse: /މކ|މފ/,
        isPM: function (e) {
          return e === '\u0789\u078A'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? '\u0789\u0786' : '\u0789\u078A'
        },
        calendar: {
          sameDay: '[\u0789\u07A8\u0787\u07A6\u078B\u07AA] LT',
          nextDay: '[\u0789\u07A7\u078B\u07A6\u0789\u07A7] LT',
          nextWeek: 'dddd LT',
          lastDay: '[\u0787\u07A8\u0787\u07B0\u0794\u07AC] LT',
          lastWeek:
            '[\u078A\u07A7\u0787\u07A8\u078C\u07AA\u0788\u07A8] dddd LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u078C\u07AC\u0783\u07AD\u078E\u07A6\u0787\u07A8 %s',
          past: '\u0786\u07AA\u0783\u07A8\u0782\u07B0 %s',
          s: '\u0790\u07A8\u0786\u07AA\u0782\u07B0\u078C\u07AA\u0786\u07AE\u0785\u07AC\u0787\u07B0',
          ss: 'd% \u0790\u07A8\u0786\u07AA\u0782\u07B0\u078C\u07AA',
          m: '\u0789\u07A8\u0782\u07A8\u0793\u07AC\u0787\u07B0',
          mm: '\u0789\u07A8\u0782\u07A8\u0793\u07AA %d',
          h: '\u078E\u07A6\u0791\u07A8\u0787\u07A8\u0783\u07AC\u0787\u07B0',
          hh: '\u078E\u07A6\u0791\u07A8\u0787\u07A8\u0783\u07AA %d',
          d: '\u078B\u07AA\u0788\u07A6\u0780\u07AC\u0787\u07B0',
          dd: '\u078B\u07AA\u0788\u07A6\u0790\u07B0 %d',
          M: '\u0789\u07A6\u0780\u07AC\u0787\u07B0',
          MM: '\u0789\u07A6\u0790\u07B0 %d',
          y: '\u0787\u07A6\u0780\u07A6\u0783\u07AC\u0787\u07B0',
          yy: '\u0787\u07A6\u0780\u07A6\u0783\u07AA %d',
        },
        preparse: function (e) {
          return e.replace(/،/g, ',')
        },
        postformat: function (e) {
          return e.replace(/,/g, '\u060C')
        },
        week: {dow: 7, doy: 12},
      })
      function mt(e) {
        return (
          (typeof Function < 'u' && e instanceof Function) ||
          Object.prototype.toString.call(e) === '[object Function]'
        )
      }
      u.defineLocale('el', {
        monthsNominativeEl:
          '\u0399\u03B1\u03BD\u03BF\u03C5\u03AC\u03C1\u03B9\u03BF\u03C2_\u03A6\u03B5\u03B2\u03C1\u03BF\u03C5\u03AC\u03C1\u03B9\u03BF\u03C2_\u039C\u03AC\u03C1\u03C4\u03B9\u03BF\u03C2_\u0391\u03C0\u03C1\u03AF\u03BB\u03B9\u03BF\u03C2_\u039C\u03AC\u03B9\u03BF\u03C2_\u0399\u03BF\u03CD\u03BD\u03B9\u03BF\u03C2_\u0399\u03BF\u03CD\u03BB\u03B9\u03BF\u03C2_\u0391\u03CD\u03B3\u03BF\u03C5\u03C3\u03C4\u03BF\u03C2_\u03A3\u03B5\u03C0\u03C4\u03AD\u03BC\u03B2\u03C1\u03B9\u03BF\u03C2_\u039F\u03BA\u03C4\u03CE\u03B2\u03C1\u03B9\u03BF\u03C2_\u039D\u03BF\u03AD\u03BC\u03B2\u03C1\u03B9\u03BF\u03C2_\u0394\u03B5\u03BA\u03AD\u03BC\u03B2\u03C1\u03B9\u03BF\u03C2'.split(
            '_',
          ),
        monthsGenitiveEl:
          '\u0399\u03B1\u03BD\u03BF\u03C5\u03B1\u03C1\u03AF\u03BF\u03C5_\u03A6\u03B5\u03B2\u03C1\u03BF\u03C5\u03B1\u03C1\u03AF\u03BF\u03C5_\u039C\u03B1\u03C1\u03C4\u03AF\u03BF\u03C5_\u0391\u03C0\u03C1\u03B9\u03BB\u03AF\u03BF\u03C5_\u039C\u03B1\u0390\u03BF\u03C5_\u0399\u03BF\u03C5\u03BD\u03AF\u03BF\u03C5_\u0399\u03BF\u03C5\u03BB\u03AF\u03BF\u03C5_\u0391\u03C5\u03B3\u03BF\u03CD\u03C3\u03C4\u03BF\u03C5_\u03A3\u03B5\u03C0\u03C4\u03B5\u03BC\u03B2\u03C1\u03AF\u03BF\u03C5_\u039F\u03BA\u03C4\u03C9\u03B2\u03C1\u03AF\u03BF\u03C5_\u039D\u03BF\u03B5\u03BC\u03B2\u03C1\u03AF\u03BF\u03C5_\u0394\u03B5\u03BA\u03B5\u03BC\u03B2\u03C1\u03AF\u03BF\u03C5'.split(
            '_',
          ),
        months: function (e, s) {
          return e
            ? typeof s == 'string' &&
              /D/.test(s.substring(0, s.indexOf('MMMM')))
              ? this._monthsGenitiveEl[e.month()]
              : this._monthsNominativeEl[e.month()]
            : this._monthsNominativeEl
        },
        monthsShort:
          '\u0399\u03B1\u03BD_\u03A6\u03B5\u03B2_\u039C\u03B1\u03C1_\u0391\u03C0\u03C1_\u039C\u03B1\u03CA_\u0399\u03BF\u03C5\u03BD_\u0399\u03BF\u03C5\u03BB_\u0391\u03C5\u03B3_\u03A3\u03B5\u03C0_\u039F\u03BA\u03C4_\u039D\u03BF\u03B5_\u0394\u03B5\u03BA'.split(
            '_',
          ),
        weekdays:
          '\u039A\u03C5\u03C1\u03B9\u03B1\u03BA\u03AE_\u0394\u03B5\u03C5\u03C4\u03AD\u03C1\u03B1_\u03A4\u03C1\u03AF\u03C4\u03B7_\u03A4\u03B5\u03C4\u03AC\u03C1\u03C4\u03B7_\u03A0\u03AD\u03BC\u03C0\u03C4\u03B7_\u03A0\u03B1\u03C1\u03B1\u03C3\u03BA\u03B5\u03C5\u03AE_\u03A3\u03AC\u03B2\u03B2\u03B1\u03C4\u03BF'.split(
            '_',
          ),
        weekdaysShort:
          '\u039A\u03C5\u03C1_\u0394\u03B5\u03C5_\u03A4\u03C1\u03B9_\u03A4\u03B5\u03C4_\u03A0\u03B5\u03BC_\u03A0\u03B1\u03C1_\u03A3\u03B1\u03B2'.split(
            '_',
          ),
        weekdaysMin:
          '\u039A\u03C5_\u0394\u03B5_\u03A4\u03C1_\u03A4\u03B5_\u03A0\u03B5_\u03A0\u03B1_\u03A3\u03B1'.split(
            '_',
          ),
        meridiem: function (e, s, i) {
          return e > 11
            ? i
              ? '\u03BC\u03BC'
              : '\u039C\u039C'
            : i
              ? '\u03C0\u03BC'
              : '\u03A0\u039C'
        },
        isPM: function (e) {
          return (e + '').toLowerCase()[0] === '\u03BC'
        },
        meridiemParse: /[ΠΜ]\.?Μ?\.?/i,
        longDateFormat: {
          LT: 'h:mm A',
          LTS: 'h:mm:ss A',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY h:mm A',
          LLLL: 'dddd, D MMMM YYYY h:mm A',
        },
        calendarEl: {
          sameDay: '[\u03A3\u03AE\u03BC\u03B5\u03C1\u03B1 {}] LT',
          nextDay: '[\u0391\u03CD\u03C1\u03B9\u03BF {}] LT',
          nextWeek: 'dddd [{}] LT',
          lastDay: '[\u03A7\u03B8\u03B5\u03C2 {}] LT',
          lastWeek: function () {
            switch (this.day()) {
              case 6:
                return '[\u03C4\u03BF \u03C0\u03C1\u03BF\u03B7\u03B3\u03BF\u03CD\u03BC\u03B5\u03BD\u03BF] dddd [{}] LT'
              default:
                return '[\u03C4\u03B7\u03BD \u03C0\u03C1\u03BF\u03B7\u03B3\u03BF\u03CD\u03BC\u03B5\u03BD\u03B7] dddd [{}] LT'
            }
          },
          sameElse: 'L',
        },
        calendar: function (e, s) {
          var i = this._calendarEl[e],
            _ = s && s.hours()
          return (
            mt(i) && (i = i.apply(s)),
            i.replace(
              '{}',
              _ % 12 === 1 ? '\u03C3\u03C4\u03B7' : '\u03C3\u03C4\u03B9\u03C2',
            )
          )
        },
        relativeTime: {
          future: '\u03C3\u03B5 %s',
          past: '%s \u03C0\u03C1\u03B9\u03BD',
          s: '\u03BB\u03AF\u03B3\u03B1 \u03B4\u03B5\u03C5\u03C4\u03B5\u03C1\u03CC\u03BB\u03B5\u03C0\u03C4\u03B1',
          ss: '%d \u03B4\u03B5\u03C5\u03C4\u03B5\u03C1\u03CC\u03BB\u03B5\u03C0\u03C4\u03B1',
          m: '\u03AD\u03BD\u03B1 \u03BB\u03B5\u03C0\u03C4\u03CC',
          mm: '%d \u03BB\u03B5\u03C0\u03C4\u03AC',
          h: '\u03BC\u03AF\u03B1 \u03CE\u03C1\u03B1',
          hh: '%d \u03CE\u03C1\u03B5\u03C2',
          d: '\u03BC\u03AF\u03B1 \u03BC\u03AD\u03C1\u03B1',
          dd: '%d \u03BC\u03AD\u03C1\u03B5\u03C2',
          M: '\u03AD\u03BD\u03B1\u03C2 \u03BC\u03AE\u03BD\u03B1\u03C2',
          MM: '%d \u03BC\u03AE\u03BD\u03B5\u03C2',
          y: '\u03AD\u03BD\u03B1\u03C2 \u03C7\u03C1\u03CC\u03BD\u03BF\u03C2',
          yy: '%d \u03C7\u03C1\u03CC\u03BD\u03B9\u03B1',
        },
        dayOfMonthOrdinalParse: /\d{1,2}η/,
        ordinal: '%d\u03B7',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('en-au', {
        months:
          'January_February_March_April_May_June_July_August_September_October_November_December'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split(
          '_',
        ),
        weekdays:
          'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdaysShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysMin: 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        longDateFormat: {
          LT: 'h:mm A',
          LTS: 'h:mm:ss A',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY h:mm A',
          LLLL: 'dddd, D MMMM YYYY h:mm A',
        },
        calendar: {
          sameDay: '[Today at] LT',
          nextDay: '[Tomorrow at] LT',
          nextWeek: 'dddd [at] LT',
          lastDay: '[Yesterday at] LT',
          lastWeek: '[Last] dddd [at] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'in %s',
          past: '%s ago',
          s: 'a few seconds',
          ss: '%d seconds',
          m: 'a minute',
          mm: '%d minutes',
          h: 'an hour',
          hh: '%d hours',
          d: 'a day',
          dd: '%d days',
          M: 'a month',
          MM: '%d months',
          y: 'a year',
          yy: '%d years',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(st|nd|rd|th)/,
        ordinal: function (e) {
          var s = e % 10,
            i =
              ~~((e % 100) / 10) === 1
                ? 'th'
                : s === 1
                  ? 'st'
                  : s === 2
                    ? 'nd'
                    : s === 3
                      ? 'rd'
                      : 'th'
          return e + i
        },
        week: {dow: 0, doy: 4},
      })
      u.defineLocale('en-ca', {
        months:
          'January_February_March_April_May_June_July_August_September_October_November_December'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split(
          '_',
        ),
        weekdays:
          'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdaysShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysMin: 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        longDateFormat: {
          LT: 'h:mm A',
          LTS: 'h:mm:ss A',
          L: 'YYYY-MM-DD',
          LL: 'MMMM D, YYYY',
          LLL: 'MMMM D, YYYY h:mm A',
          LLLL: 'dddd, MMMM D, YYYY h:mm A',
        },
        calendar: {
          sameDay: '[Today at] LT',
          nextDay: '[Tomorrow at] LT',
          nextWeek: 'dddd [at] LT',
          lastDay: '[Yesterday at] LT',
          lastWeek: '[Last] dddd [at] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'in %s',
          past: '%s ago',
          s: 'a few seconds',
          ss: '%d seconds',
          m: 'a minute',
          mm: '%d minutes',
          h: 'an hour',
          hh: '%d hours',
          d: 'a day',
          dd: '%d days',
          M: 'a month',
          MM: '%d months',
          y: 'a year',
          yy: '%d years',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(st|nd|rd|th)/,
        ordinal: function (e) {
          var s = e % 10,
            i =
              ~~((e % 100) / 10) === 1
                ? 'th'
                : s === 1
                  ? 'st'
                  : s === 2
                    ? 'nd'
                    : s === 3
                      ? 'rd'
                      : 'th'
          return e + i
        },
      })
      u.defineLocale('en-gb', {
        months:
          'January_February_March_April_May_June_July_August_September_October_November_December'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split(
          '_',
        ),
        weekdays:
          'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdaysShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysMin: 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Today at] LT',
          nextDay: '[Tomorrow at] LT',
          nextWeek: 'dddd [at] LT',
          lastDay: '[Yesterday at] LT',
          lastWeek: '[Last] dddd [at] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'in %s',
          past: '%s ago',
          s: 'a few seconds',
          ss: '%d seconds',
          m: 'a minute',
          mm: '%d minutes',
          h: 'an hour',
          hh: '%d hours',
          d: 'a day',
          dd: '%d days',
          M: 'a month',
          MM: '%d months',
          y: 'a year',
          yy: '%d years',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(st|nd|rd|th)/,
        ordinal: function (e) {
          var s = e % 10,
            i =
              ~~((e % 100) / 10) === 1
                ? 'th'
                : s === 1
                  ? 'st'
                  : s === 2
                    ? 'nd'
                    : s === 3
                      ? 'rd'
                      : 'th'
          return e + i
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('en-ie', {
        months:
          'January_February_March_April_May_June_July_August_September_October_November_December'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split(
          '_',
        ),
        weekdays:
          'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdaysShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysMin: 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Today at] LT',
          nextDay: '[Tomorrow at] LT',
          nextWeek: 'dddd [at] LT',
          lastDay: '[Yesterday at] LT',
          lastWeek: '[Last] dddd [at] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'in %s',
          past: '%s ago',
          s: 'a few seconds',
          ss: '%d seconds',
          m: 'a minute',
          mm: '%d minutes',
          h: 'an hour',
          hh: '%d hours',
          d: 'a day',
          dd: '%d days',
          M: 'a month',
          MM: '%d months',
          y: 'a year',
          yy: '%d years',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(st|nd|rd|th)/,
        ordinal: function (e) {
          var s = e % 10,
            i =
              ~~((e % 100) / 10) === 1
                ? 'th'
                : s === 1
                  ? 'st'
                  : s === 2
                    ? 'nd'
                    : s === 3
                      ? 'rd'
                      : 'th'
          return e + i
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('en-il', {
        months:
          'January_February_March_April_May_June_July_August_September_October_November_December'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split(
          '_',
        ),
        weekdays:
          'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdaysShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysMin: 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Today at] LT',
          nextDay: '[Tomorrow at] LT',
          nextWeek: 'dddd [at] LT',
          lastDay: '[Yesterday at] LT',
          lastWeek: '[Last] dddd [at] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'in %s',
          past: '%s ago',
          s: 'a few seconds',
          ss: '%d seconds',
          m: 'a minute',
          mm: '%d minutes',
          h: 'an hour',
          hh: '%d hours',
          d: 'a day',
          dd: '%d days',
          M: 'a month',
          MM: '%d months',
          y: 'a year',
          yy: '%d years',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(st|nd|rd|th)/,
        ordinal: function (e) {
          var s = e % 10,
            i =
              ~~((e % 100) / 10) === 1
                ? 'th'
                : s === 1
                  ? 'st'
                  : s === 2
                    ? 'nd'
                    : s === 3
                      ? 'rd'
                      : 'th'
          return e + i
        },
      })
      u.defineLocale('en-in', {
        months:
          'January_February_March_April_May_June_July_August_September_October_November_December'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split(
          '_',
        ),
        weekdays:
          'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdaysShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysMin: 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        longDateFormat: {
          LT: 'h:mm A',
          LTS: 'h:mm:ss A',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY h:mm A',
          LLLL: 'dddd, D MMMM YYYY h:mm A',
        },
        calendar: {
          sameDay: '[Today at] LT',
          nextDay: '[Tomorrow at] LT',
          nextWeek: 'dddd [at] LT',
          lastDay: '[Yesterday at] LT',
          lastWeek: '[Last] dddd [at] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'in %s',
          past: '%s ago',
          s: 'a few seconds',
          ss: '%d seconds',
          m: 'a minute',
          mm: '%d minutes',
          h: 'an hour',
          hh: '%d hours',
          d: 'a day',
          dd: '%d days',
          M: 'a month',
          MM: '%d months',
          y: 'a year',
          yy: '%d years',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(st|nd|rd|th)/,
        ordinal: function (e) {
          var s = e % 10,
            i =
              ~~((e % 100) / 10) === 1
                ? 'th'
                : s === 1
                  ? 'st'
                  : s === 2
                    ? 'nd'
                    : s === 3
                      ? 'rd'
                      : 'th'
          return e + i
        },
        week: {dow: 0, doy: 6},
      })
      u.defineLocale('en-nz', {
        months:
          'January_February_March_April_May_June_July_August_September_October_November_December'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split(
          '_',
        ),
        weekdays:
          'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdaysShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysMin: 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        longDateFormat: {
          LT: 'h:mm A',
          LTS: 'h:mm:ss A',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY h:mm A',
          LLLL: 'dddd, D MMMM YYYY h:mm A',
        },
        calendar: {
          sameDay: '[Today at] LT',
          nextDay: '[Tomorrow at] LT',
          nextWeek: 'dddd [at] LT',
          lastDay: '[Yesterday at] LT',
          lastWeek: '[Last] dddd [at] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'in %s',
          past: '%s ago',
          s: 'a few seconds',
          ss: '%d seconds',
          m: 'a minute',
          mm: '%d minutes',
          h: 'an hour',
          hh: '%d hours',
          d: 'a day',
          dd: '%d days',
          M: 'a month',
          MM: '%d months',
          y: 'a year',
          yy: '%d years',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(st|nd|rd|th)/,
        ordinal: function (e) {
          var s = e % 10,
            i =
              ~~((e % 100) / 10) === 1
                ? 'th'
                : s === 1
                  ? 'st'
                  : s === 2
                    ? 'nd'
                    : s === 3
                      ? 'rd'
                      : 'th'
          return e + i
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('en-sg', {
        months:
          'January_February_March_April_May_June_July_August_September_October_November_December'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split(
          '_',
        ),
        weekdays:
          'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdaysShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysMin: 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Today at] LT',
          nextDay: '[Tomorrow at] LT',
          nextWeek: 'dddd [at] LT',
          lastDay: '[Yesterday at] LT',
          lastWeek: '[Last] dddd [at] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'in %s',
          past: '%s ago',
          s: 'a few seconds',
          ss: '%d seconds',
          m: 'a minute',
          mm: '%d minutes',
          h: 'an hour',
          hh: '%d hours',
          d: 'a day',
          dd: '%d days',
          M: 'a month',
          MM: '%d months',
          y: 'a year',
          yy: '%d years',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(st|nd|rd|th)/,
        ordinal: function (e) {
          var s = e % 10,
            i =
              ~~((e % 100) / 10) === 1
                ? 'th'
                : s === 1
                  ? 'st'
                  : s === 2
                    ? 'nd'
                    : s === 3
                      ? 'rd'
                      : 'th'
          return e + i
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('eo', {
        months:
          'januaro_februaro_marto_aprilo_majo_junio_julio_a\u016Dgusto_septembro_oktobro_novembro_decembro'.split(
            '_',
          ),
        monthsShort:
          'jan_feb_mart_apr_maj_jun_jul_a\u016Dg_sept_okt_nov_dec'.split('_'),
        weekdays:
          'diman\u0109o_lundo_mardo_merkredo_\u0135a\u016Ddo_vendredo_sabato'.split(
            '_',
          ),
        weekdaysShort: 'dim_lun_mard_merk_\u0135a\u016D_ven_sab'.split('_'),
        weekdaysMin: 'di_lu_ma_me_\u0135a_ve_sa'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'YYYY-MM-DD',
          LL: '[la] D[-an de] MMMM, YYYY',
          LLL: '[la] D[-an de] MMMM, YYYY HH:mm',
          LLLL: 'dddd[n], [la] D[-an de] MMMM, YYYY HH:mm',
          llll: 'ddd, [la] D[-an de] MMM, YYYY HH:mm',
        },
        meridiemParse: /[ap]\.t\.m/i,
        isPM: function (e) {
          return e.charAt(0).toLowerCase() === 'p'
        },
        meridiem: function (e, s, i) {
          return e > 11 ? (i ? 'p.t.m.' : 'P.T.M.') : i ? 'a.t.m.' : 'A.T.M.'
        },
        calendar: {
          sameDay: '[Hodia\u016D je] LT',
          nextDay: '[Morga\u016D je] LT',
          nextWeek: 'dddd[n je] LT',
          lastDay: '[Hiera\u016D je] LT',
          lastWeek: '[pasintan] dddd[n je] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'post %s',
          past: 'anta\u016D %s',
          s: 'kelkaj sekundoj',
          ss: '%d sekundoj',
          m: 'unu minuto',
          mm: '%d minutoj',
          h: 'unu horo',
          hh: '%d horoj',
          d: 'unu tago',
          dd: '%d tagoj',
          M: 'unu monato',
          MM: '%d monatoj',
          y: 'unu jaro',
          yy: '%d jaroj',
        },
        dayOfMonthOrdinalParse: /\d{1,2}a/,
        ordinal: '%da',
        week: {dow: 1, doy: 7},
      })
      var G =
          'ene._feb._mar._abr._may._jun._jul._ago._sep._oct._nov._dic.'.split(
            '_',
          ),
        Fa = 'ene_feb_mar_abr_may_jun_jul_ago_sep_oct_nov_dic'.split('_'),
        za = [
          /^ene/i,
          /^feb/i,
          /^mar/i,
          /^abr/i,
          /^may/i,
          /^jun/i,
          /^jul/i,
          /^ago/i,
          /^sep/i,
          /^oct/i,
          /^nov/i,
          /^dic/i,
        ],
        Mt =
          /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene\.?|feb\.?|mar\.?|abr\.?|may\.?|jun\.?|jul\.?|ago\.?|sep\.?|oct\.?|nov\.?|dic\.?)/i
      u.defineLocale('es-do', {
        months:
          'enero_febrero_marzo_abril_mayo_junio_julio_agosto_septiembre_octubre_noviembre_diciembre'.split(
            '_',
          ),
        monthsShort: function (e, s) {
          return e ? (/-MMM-/.test(s) ? Fa[e.month()] : G[e.month()]) : G
        },
        monthsRegex: Mt,
        monthsShortRegex: Mt,
        monthsStrictRegex:
          /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
        monthsShortStrictRegex:
          /^(ene\.?|feb\.?|mar\.?|abr\.?|may\.?|jun\.?|jul\.?|ago\.?|sep\.?|oct\.?|nov\.?|dic\.?)/i,
        monthsParse: za,
        longMonthsParse: za,
        shortMonthsParse: za,
        weekdays:
          'domingo_lunes_martes_mi\xE9rcoles_jueves_viernes_s\xE1bado'.split(
            '_',
          ),
        weekdaysShort: 'dom._lun._mar._mi\xE9._jue._vie._s\xE1b.'.split('_'),
        weekdaysMin: 'do_lu_ma_mi_ju_vi_s\xE1'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'h:mm A',
          LTS: 'h:mm:ss A',
          L: 'DD/MM/YYYY',
          LL: 'D [de] MMMM [de] YYYY',
          LLL: 'D [de] MMMM [de] YYYY h:mm A',
          LLLL: 'dddd, D [de] MMMM [de] YYYY h:mm A',
        },
        calendar: {
          sameDay: function () {
            return '[hoy a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          nextDay: function () {
            return '[ma\xF1ana a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          nextWeek: function () {
            return 'dddd [a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          lastDay: function () {
            return '[ayer a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          lastWeek: function () {
            return (
              '[el] dddd [pasado a la' +
              (this.hours() !== 1 ? 's' : '') +
              '] LT'
            )
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'en %s',
          past: 'hace %s',
          s: 'unos segundos',
          ss: '%d segundos',
          m: 'un minuto',
          mm: '%d minutos',
          h: 'una hora',
          hh: '%d horas',
          d: 'un d\xEDa',
          dd: '%d d\xEDas',
          w: 'una semana',
          ww: '%d semanas',
          M: 'un mes',
          MM: '%d meses',
          y: 'un a\xF1o',
          yy: '%d a\xF1os',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%d\xBA',
        week: {dow: 1, doy: 4},
      })
      var Na =
          'ene._feb._mar._abr._may._jun._jul._ago._sep._oct._nov._dic.'.split(
            '_',
          ),
        V = 'ene_feb_mar_abr_may_jun_jul_ago_sep_oct_nov_dic'.split('_'),
        ya = [
          /^ene/i,
          /^feb/i,
          /^mar/i,
          /^abr/i,
          /^may/i,
          /^jun/i,
          /^jul/i,
          /^ago/i,
          /^sep/i,
          /^oct/i,
          /^nov/i,
          /^dic/i,
        ],
        fa =
          /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene\.?|feb\.?|mar\.?|abr\.?|may\.?|jun\.?|jul\.?|ago\.?|sep\.?|oct\.?|nov\.?|dic\.?)/i
      u.defineLocale('es-mx', {
        months:
          'enero_febrero_marzo_abril_mayo_junio_julio_agosto_septiembre_octubre_noviembre_diciembre'.split(
            '_',
          ),
        monthsShort: function (e, s) {
          return e ? (/-MMM-/.test(s) ? V[e.month()] : Na[e.month()]) : Na
        },
        monthsRegex: fa,
        monthsShortRegex: fa,
        monthsStrictRegex:
          /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
        monthsShortStrictRegex:
          /^(ene\.?|feb\.?|mar\.?|abr\.?|may\.?|jun\.?|jul\.?|ago\.?|sep\.?|oct\.?|nov\.?|dic\.?)/i,
        monthsParse: ya,
        longMonthsParse: ya,
        shortMonthsParse: ya,
        weekdays:
          'domingo_lunes_martes_mi\xE9rcoles_jueves_viernes_s\xE1bado'.split(
            '_',
          ),
        weekdaysShort: 'dom._lun._mar._mi\xE9._jue._vie._s\xE1b.'.split('_'),
        weekdaysMin: 'do_lu_ma_mi_ju_vi_s\xE1'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D [de] MMMM [de] YYYY',
          LLL: 'D [de] MMMM [de] YYYY H:mm',
          LLLL: 'dddd, D [de] MMMM [de] YYYY H:mm',
        },
        calendar: {
          sameDay: function () {
            return '[hoy a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          nextDay: function () {
            return '[ma\xF1ana a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          nextWeek: function () {
            return 'dddd [a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          lastDay: function () {
            return '[ayer a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          lastWeek: function () {
            return (
              '[el] dddd [pasado a la' +
              (this.hours() !== 1 ? 's' : '') +
              '] LT'
            )
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'en %s',
          past: 'hace %s',
          s: 'unos segundos',
          ss: '%d segundos',
          m: 'un minuto',
          mm: '%d minutos',
          h: 'una hora',
          hh: '%d horas',
          d: 'un d\xEDa',
          dd: '%d d\xEDas',
          w: 'una semana',
          ww: '%d semanas',
          M: 'un mes',
          MM: '%d meses',
          y: 'un a\xF1o',
          yy: '%d a\xF1os',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%d\xBA',
        week: {dow: 0, doy: 4},
        invalidDate: 'Fecha inv\xE1lida',
      })
      var aa =
          'ene._feb._mar._abr._may._jun._jul._ago._sep._oct._nov._dic.'.split(
            '_',
          ),
        S = 'ene_feb_mar_abr_may_jun_jul_ago_sep_oct_nov_dic'.split('_'),
        ka = [
          /^ene/i,
          /^feb/i,
          /^mar/i,
          /^abr/i,
          /^may/i,
          /^jun/i,
          /^jul/i,
          /^ago/i,
          /^sep/i,
          /^oct/i,
          /^nov/i,
          /^dic/i,
        ],
        Ra =
          /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene\.?|feb\.?|mar\.?|abr\.?|may\.?|jun\.?|jul\.?|ago\.?|sep\.?|oct\.?|nov\.?|dic\.?)/i
      u.defineLocale('es-us', {
        months:
          'enero_febrero_marzo_abril_mayo_junio_julio_agosto_septiembre_octubre_noviembre_diciembre'.split(
            '_',
          ),
        monthsShort: function (e, s) {
          return e ? (/-MMM-/.test(s) ? S[e.month()] : aa[e.month()]) : aa
        },
        monthsRegex: Ra,
        monthsShortRegex: Ra,
        monthsStrictRegex:
          /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
        monthsShortStrictRegex:
          /^(ene\.?|feb\.?|mar\.?|abr\.?|may\.?|jun\.?|jul\.?|ago\.?|sep\.?|oct\.?|nov\.?|dic\.?)/i,
        monthsParse: ka,
        longMonthsParse: ka,
        shortMonthsParse: ka,
        weekdays:
          'domingo_lunes_martes_mi\xE9rcoles_jueves_viernes_s\xE1bado'.split(
            '_',
          ),
        weekdaysShort: 'dom._lun._mar._mi\xE9._jue._vie._s\xE1b.'.split('_'),
        weekdaysMin: 'do_lu_ma_mi_ju_vi_s\xE1'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'h:mm A',
          LTS: 'h:mm:ss A',
          L: 'MM/DD/YYYY',
          LL: 'D [de] MMMM [de] YYYY',
          LLL: 'D [de] MMMM [de] YYYY h:mm A',
          LLLL: 'dddd, D [de] MMMM [de] YYYY h:mm A',
        },
        calendar: {
          sameDay: function () {
            return '[hoy a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          nextDay: function () {
            return '[ma\xF1ana a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          nextWeek: function () {
            return 'dddd [a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          lastDay: function () {
            return '[ayer a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          lastWeek: function () {
            return (
              '[el] dddd [pasado a la' +
              (this.hours() !== 1 ? 's' : '') +
              '] LT'
            )
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'en %s',
          past: 'hace %s',
          s: 'unos segundos',
          ss: '%d segundos',
          m: 'un minuto',
          mm: '%d minutos',
          h: 'una hora',
          hh: '%d horas',
          d: 'un d\xEDa',
          dd: '%d d\xEDas',
          w: 'una semana',
          ww: '%d semanas',
          M: 'un mes',
          MM: '%d meses',
          y: 'un a\xF1o',
          yy: '%d a\xF1os',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%d\xBA',
        week: {dow: 0, doy: 6},
      })
      var ta =
          'ene._feb._mar._abr._may._jun._jul._ago._sep._oct._nov._dic.'.split(
            '_',
          ),
        Ja = 'ene_feb_mar_abr_may_jun_jul_ago_sep_oct_nov_dic'.split('_'),
        Re = [
          /^ene/i,
          /^feb/i,
          /^mar/i,
          /^abr/i,
          /^may/i,
          /^jun/i,
          /^jul/i,
          /^ago/i,
          /^sep/i,
          /^oct/i,
          /^nov/i,
          /^dic/i,
        ],
        Se =
          /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene\.?|feb\.?|mar\.?|abr\.?|may\.?|jun\.?|jul\.?|ago\.?|sep\.?|oct\.?|nov\.?|dic\.?)/i
      u.defineLocale('es', {
        months:
          'enero_febrero_marzo_abril_mayo_junio_julio_agosto_septiembre_octubre_noviembre_diciembre'.split(
            '_',
          ),
        monthsShort: function (e, s) {
          return e ? (/-MMM-/.test(s) ? Ja[e.month()] : ta[e.month()]) : ta
        },
        monthsRegex: Se,
        monthsShortRegex: Se,
        monthsStrictRegex:
          /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
        monthsShortStrictRegex:
          /^(ene\.?|feb\.?|mar\.?|abr\.?|may\.?|jun\.?|jul\.?|ago\.?|sep\.?|oct\.?|nov\.?|dic\.?)/i,
        monthsParse: Re,
        longMonthsParse: Re,
        shortMonthsParse: Re,
        weekdays:
          'domingo_lunes_martes_mi\xE9rcoles_jueves_viernes_s\xE1bado'.split(
            '_',
          ),
        weekdaysShort: 'dom._lun._mar._mi\xE9._jue._vie._s\xE1b.'.split('_'),
        weekdaysMin: 'do_lu_ma_mi_ju_vi_s\xE1'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D [de] MMMM [de] YYYY',
          LLL: 'D [de] MMMM [de] YYYY H:mm',
          LLLL: 'dddd, D [de] MMMM [de] YYYY H:mm',
        },
        calendar: {
          sameDay: function () {
            return '[hoy a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          nextDay: function () {
            return '[ma\xF1ana a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          nextWeek: function () {
            return 'dddd [a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          lastDay: function () {
            return '[ayer a la' + (this.hours() !== 1 ? 's' : '') + '] LT'
          },
          lastWeek: function () {
            return (
              '[el] dddd [pasado a la' +
              (this.hours() !== 1 ? 's' : '') +
              '] LT'
            )
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'en %s',
          past: 'hace %s',
          s: 'unos segundos',
          ss: '%d segundos',
          m: 'un minuto',
          mm: '%d minutos',
          h: 'una hora',
          hh: '%d horas',
          d: 'un d\xEDa',
          dd: '%d d\xEDas',
          w: 'una semana',
          ww: '%d semanas',
          M: 'un mes',
          MM: '%d meses',
          y: 'un a\xF1o',
          yy: '%d a\xF1os',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%d\xBA',
        week: {dow: 1, doy: 4},
        invalidDate: 'Fecha inv\xE1lida',
      })
      function I(e, s, i, _) {
        var l = {
          s: ['m\xF5ne sekundi', 'm\xF5ni sekund', 'paar sekundit'],
          ss: [e + 'sekundi', e + 'sekundit'],
          m: ['\xFChe minuti', '\xFCks minut'],
          mm: [e + ' minuti', e + ' minutit'],
          h: ['\xFChe tunni', 'tund aega', '\xFCks tund'],
          hh: [e + ' tunni', e + ' tundi'],
          d: ['\xFChe p\xE4eva', '\xFCks p\xE4ev'],
          M: ['kuu aja', 'kuu aega', '\xFCks kuu'],
          MM: [e + ' kuu', e + ' kuud'],
          y: ['\xFChe aasta', 'aasta', '\xFCks aasta'],
          yy: [e + ' aasta', e + ' aastat'],
        }
        return s ? (l[i][2] ? l[i][2] : l[i][1]) : _ ? l[i][0] : l[i][1]
      }
      u.defineLocale('et', {
        months:
          'jaanuar_veebruar_m\xE4rts_aprill_mai_juuni_juuli_august_september_oktoober_november_detsember'.split(
            '_',
          ),
        monthsShort:
          'jaan_veebr_m\xE4rts_apr_mai_juuni_juuli_aug_sept_okt_nov_dets'.split(
            '_',
          ),
        weekdays:
          'p\xFChap\xE4ev_esmasp\xE4ev_teisip\xE4ev_kolmap\xE4ev_neljap\xE4ev_reede_laup\xE4ev'.split(
            '_',
          ),
        weekdaysShort: 'P_E_T_K_N_R_L'.split('_'),
        weekdaysMin: 'P_E_T_K_N_R_L'.split('_'),
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY H:mm',
          LLLL: 'dddd, D. MMMM YYYY H:mm',
        },
        calendar: {
          sameDay: '[T\xE4na,] LT',
          nextDay: '[Homme,] LT',
          nextWeek: '[J\xE4rgmine] dddd LT',
          lastDay: '[Eile,] LT',
          lastWeek: '[Eelmine] dddd LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s p\xE4rast',
          past: '%s tagasi',
          s: I,
          ss: I,
          m: I,
          mm: I,
          h: I,
          hh: I,
          d: I,
          dd: '%d p\xE4eva',
          M: I,
          MM: I,
          y: I,
          yy: I,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('eu', {
        months:
          'urtarrila_otsaila_martxoa_apirila_maiatza_ekaina_uztaila_abuztua_iraila_urria_azaroa_abendua'.split(
            '_',
          ),
        monthsShort:
          'urt._ots._mar._api._mai._eka._uzt._abu._ira._urr._aza._abe.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'igandea_astelehena_asteartea_asteazkena_osteguna_ostirala_larunbata'.split(
            '_',
          ),
        weekdaysShort: 'ig._al._ar._az._og._ol._lr.'.split('_'),
        weekdaysMin: 'ig_al_ar_az_og_ol_lr'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'YYYY-MM-DD',
          LL: 'YYYY[ko] MMMM[ren] D[a]',
          LLL: 'YYYY[ko] MMMM[ren] D[a] HH:mm',
          LLLL: 'dddd, YYYY[ko] MMMM[ren] D[a] HH:mm',
          l: 'YYYY-M-D',
          ll: 'YYYY[ko] MMM D[a]',
          lll: 'YYYY[ko] MMM D[a] HH:mm',
          llll: 'ddd, YYYY[ko] MMM D[a] HH:mm',
        },
        calendar: {
          sameDay: '[gaur] LT[etan]',
          nextDay: '[bihar] LT[etan]',
          nextWeek: 'dddd LT[etan]',
          lastDay: '[atzo] LT[etan]',
          lastWeek: '[aurreko] dddd LT[etan]',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s barru',
          past: 'duela %s',
          s: 'segundo batzuk',
          ss: '%d segundo',
          m: 'minutu bat',
          mm: '%d minutu',
          h: 'ordu bat',
          hh: '%d ordu',
          d: 'egun bat',
          dd: '%d egun',
          M: 'hilabete bat',
          MM: '%d hilabete',
          y: 'urte bat',
          yy: '%d urte',
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 7},
      })
      var Ut = {
          1: '\u06F1',
          2: '\u06F2',
          3: '\u06F3',
          4: '\u06F4',
          5: '\u06F5',
          6: '\u06F6',
          7: '\u06F7',
          8: '\u06F8',
          9: '\u06F9',
          0: '\u06F0',
        },
        pa = {
          '\u06F1': '1',
          '\u06F2': '2',
          '\u06F3': '3',
          '\u06F4': '4',
          '\u06F5': '5',
          '\u06F6': '6',
          '\u06F7': '7',
          '\u06F8': '8',
          '\u06F9': '9',
          '\u06F0': '0',
        }
      u.defineLocale('fa', {
        months:
          '\u0698\u0627\u0646\u0648\u06CC\u0647_\u0641\u0648\u0631\u06CC\u0647_\u0645\u0627\u0631\u0633_\u0622\u0648\u0631\u06CC\u0644_\u0645\u0647_\u0698\u0648\u0626\u0646_\u0698\u0648\u0626\u06CC\u0647_\u0627\u0648\u062A_\u0633\u067E\u062A\u0627\u0645\u0628\u0631_\u0627\u06A9\u062A\u0628\u0631_\u0646\u0648\u0627\u0645\u0628\u0631_\u062F\u0633\u0627\u0645\u0628\u0631'.split(
            '_',
          ),
        monthsShort:
          '\u0698\u0627\u0646\u0648\u06CC\u0647_\u0641\u0648\u0631\u06CC\u0647_\u0645\u0627\u0631\u0633_\u0622\u0648\u0631\u06CC\u0644_\u0645\u0647_\u0698\u0648\u0626\u0646_\u0698\u0648\u0626\u06CC\u0647_\u0627\u0648\u062A_\u0633\u067E\u062A\u0627\u0645\u0628\u0631_\u0627\u06A9\u062A\u0628\u0631_\u0646\u0648\u0627\u0645\u0628\u0631_\u062F\u0633\u0627\u0645\u0628\u0631'.split(
            '_',
          ),
        weekdays:
          '\u06CC\u06A9\u200C\u0634\u0646\u0628\u0647_\u062F\u0648\u0634\u0646\u0628\u0647_\u0633\u0647\u200C\u0634\u0646\u0628\u0647_\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647_\u067E\u0646\u062C\u200C\u0634\u0646\u0628\u0647_\u062C\u0645\u0639\u0647_\u0634\u0646\u0628\u0647'.split(
            '_',
          ),
        weekdaysShort:
          '\u06CC\u06A9\u200C\u0634\u0646\u0628\u0647_\u062F\u0648\u0634\u0646\u0628\u0647_\u0633\u0647\u200C\u0634\u0646\u0628\u0647_\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647_\u067E\u0646\u062C\u200C\u0634\u0646\u0628\u0647_\u062C\u0645\u0639\u0647_\u0634\u0646\u0628\u0647'.split(
            '_',
          ),
        weekdaysMin: '\u06CC_\u062F_\u0633_\u0686_\u067E_\u062C_\u0634'.split(
          '_',
        ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        meridiemParse: /قبل از ظهر|بعد از ظهر/,
        isPM: function (e) {
          return /بعد از ظهر/.test(e)
        },
        meridiem: function (e, s, i) {
          return e < 12
            ? '\u0642\u0628\u0644 \u0627\u0632 \u0638\u0647\u0631'
            : '\u0628\u0639\u062F \u0627\u0632 \u0638\u0647\u0631'
        },
        calendar: {
          sameDay:
            '[\u0627\u0645\u0631\u0648\u0632 \u0633\u0627\u0639\u062A] LT',
          nextDay: '[\u0641\u0631\u062F\u0627 \u0633\u0627\u0639\u062A] LT',
          nextWeek: 'dddd [\u0633\u0627\u0639\u062A] LT',
          lastDay:
            '[\u062F\u06CC\u0631\u0648\u0632 \u0633\u0627\u0639\u062A] LT',
          lastWeek: 'dddd [\u067E\u06CC\u0634] [\u0633\u0627\u0639\u062A] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u062F\u0631 %s',
          past: '%s \u067E\u06CC\u0634',
          s: '\u0686\u0646\u062F \u062B\u0627\u0646\u06CC\u0647',
          ss: '%d \u062B\u0627\u0646\u06CC\u0647',
          m: '\u06CC\u06A9 \u062F\u0642\u06CC\u0642\u0647',
          mm: '%d \u062F\u0642\u06CC\u0642\u0647',
          h: '\u06CC\u06A9 \u0633\u0627\u0639\u062A',
          hh: '%d \u0633\u0627\u0639\u062A',
          d: '\u06CC\u06A9 \u0631\u0648\u0632',
          dd: '%d \u0631\u0648\u0632',
          M: '\u06CC\u06A9 \u0645\u0627\u0647',
          MM: '%d \u0645\u0627\u0647',
          y: '\u06CC\u06A9 \u0633\u0627\u0644',
          yy: '%d \u0633\u0627\u0644',
        },
        preparse: function (e) {
          return e
            .replace(/[۰-۹]/g, function (s) {
              return pa[s]
            })
            .replace(/،/g, ',')
        },
        postformat: function (e) {
          return e
            .replace(/\d/g, function (s) {
              return Ut[s]
            })
            .replace(/,/g, '\u060C')
        },
        dayOfMonthOrdinalParse: /\d{1,2}م/,
        ordinal: '%d\u0645',
        week: {dow: 6, doy: 12},
      })
      var Da =
          'nolla yksi kaksi kolme nelj\xE4 viisi kuusi seitsem\xE4n kahdeksan yhdeks\xE4n'.split(
            ' ',
          ),
        sa = [
          'nolla',
          'yhden',
          'kahden',
          'kolmen',
          'nelj\xE4n',
          'viiden',
          'kuuden',
          Da[7],
          Da[8],
          Da[9],
        ]
      function E(e, s, i, _) {
        var l = ''
        switch (i) {
          case 's':
            return _ ? 'muutaman sekunnin' : 'muutama sekunti'
          case 'ss':
            l = _ ? 'sekunnin' : 'sekuntia'
            break
          case 'm':
            return _ ? 'minuutin' : 'minuutti'
          case 'mm':
            l = _ ? 'minuutin' : 'minuuttia'
            break
          case 'h':
            return _ ? 'tunnin' : 'tunti'
          case 'hh':
            l = _ ? 'tunnin' : 'tuntia'
            break
          case 'd':
            return _ ? 'p\xE4iv\xE4n' : 'p\xE4iv\xE4'
          case 'dd':
            l = _ ? 'p\xE4iv\xE4n' : 'p\xE4iv\xE4\xE4'
            break
          case 'M':
            return _ ? 'kuukauden' : 'kuukausi'
          case 'MM':
            l = _ ? 'kuukauden' : 'kuukautta'
            break
          case 'y':
            return _ ? 'vuoden' : 'vuosi'
          case 'yy':
            l = _ ? 'vuoden' : 'vuotta'
            break
        }
        return ((l = Ia(e, _) + ' ' + l), l)
      }
      function Ia(e, s) {
        return e < 10 ? (s ? sa[e] : Da[e]) : e
      }
      u.defineLocale('fi', {
        months:
          'tammikuu_helmikuu_maaliskuu_huhtikuu_toukokuu_kes\xE4kuu_hein\xE4kuu_elokuu_syyskuu_lokakuu_marraskuu_joulukuu'.split(
            '_',
          ),
        monthsShort:
          'tammi_helmi_maalis_huhti_touko_kes\xE4_hein\xE4_elo_syys_loka_marras_joulu'.split(
            '_',
          ),
        weekdays:
          'sunnuntai_maanantai_tiistai_keskiviikko_torstai_perjantai_lauantai'.split(
            '_',
          ),
        weekdaysShort: 'su_ma_ti_ke_to_pe_la'.split('_'),
        weekdaysMin: 'su_ma_ti_ke_to_pe_la'.split('_'),
        longDateFormat: {
          LT: 'HH.mm',
          LTS: 'HH.mm.ss',
          L: 'DD.MM.YYYY',
          LL: 'Do MMMM[ta] YYYY',
          LLL: 'Do MMMM[ta] YYYY, [klo] HH.mm',
          LLLL: 'dddd, Do MMMM[ta] YYYY, [klo] HH.mm',
          l: 'D.M.YYYY',
          ll: 'Do MMM YYYY',
          lll: 'Do MMM YYYY, [klo] HH.mm',
          llll: 'ddd, Do MMM YYYY, [klo] HH.mm',
        },
        calendar: {
          sameDay: '[t\xE4n\xE4\xE4n] [klo] LT',
          nextDay: '[huomenna] [klo] LT',
          nextWeek: 'dddd [klo] LT',
          lastDay: '[eilen] [klo] LT',
          lastWeek: '[viime] dddd[na] [klo] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s p\xE4\xE4st\xE4',
          past: '%s sitten',
          s: E,
          ss: E,
          m: E,
          mm: E,
          h: E,
          hh: E,
          d: E,
          dd: E,
          M: E,
          MM: E,
          y: E,
          yy: E,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('fil', {
        months:
          'Enero_Pebrero_Marso_Abril_Mayo_Hunyo_Hulyo_Agosto_Setyembre_Oktubre_Nobyembre_Disyembre'.split(
            '_',
          ),
        monthsShort: 'Ene_Peb_Mar_Abr_May_Hun_Hul_Ago_Set_Okt_Nob_Dis'.split(
          '_',
        ),
        weekdays:
          'Linggo_Lunes_Martes_Miyerkules_Huwebes_Biyernes_Sabado'.split('_'),
        weekdaysShort: 'Lin_Lun_Mar_Miy_Huw_Biy_Sab'.split('_'),
        weekdaysMin: 'Li_Lu_Ma_Mi_Hu_Bi_Sab'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'MM/D/YYYY',
          LL: 'MMMM D, YYYY',
          LLL: 'MMMM D, YYYY HH:mm',
          LLLL: 'dddd, MMMM DD, YYYY HH:mm',
        },
        calendar: {
          sameDay: 'LT [ngayong araw]',
          nextDay: '[Bukas ng] LT',
          nextWeek: 'LT [sa susunod na] dddd',
          lastDay: 'LT [kahapon]',
          lastWeek: 'LT [noong nakaraang] dddd',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'sa loob ng %s',
          past: '%s ang nakalipas',
          s: 'ilang segundo',
          ss: '%d segundo',
          m: 'isang minuto',
          mm: '%d minuto',
          h: 'isang oras',
          hh: '%d oras',
          d: 'isang araw',
          dd: '%d araw',
          M: 'isang buwan',
          MM: '%d buwan',
          y: 'isang taon',
          yy: '%d taon',
        },
        dayOfMonthOrdinalParse: /\d{1,2}/,
        ordinal: function (e) {
          return e
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('fo', {
        months:
          'januar_februar_mars_apr\xEDl_mai_juni_juli_august_september_oktober_november_desember'.split(
            '_',
          ),
        monthsShort: 'jan_feb_mar_apr_mai_jun_jul_aug_sep_okt_nov_des'.split(
          '_',
        ),
        weekdays:
          'sunnudagur_m\xE1nadagur_t\xFDsdagur_mikudagur_h\xF3sdagur_fr\xEDggjadagur_leygardagur'.split(
            '_',
          ),
        weekdaysShort: 'sun_m\xE1n_t\xFDs_mik_h\xF3s_fr\xED_ley'.split('_'),
        weekdaysMin: 'su_m\xE1_t\xFD_mi_h\xF3_fr_le'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D. MMMM, YYYY HH:mm',
        },
        calendar: {
          sameDay: '[\xCD dag kl.] LT',
          nextDay: '[\xCD morgin kl.] LT',
          nextWeek: 'dddd [kl.] LT',
          lastDay: '[\xCD gj\xE1r kl.] LT',
          lastWeek: '[s\xED\xF0stu] dddd [kl] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'um %s',
          past: '%s s\xED\xF0ani',
          s: 'f\xE1 sekund',
          ss: '%d sekundir',
          m: 'ein minuttur',
          mm: '%d minuttir',
          h: 'ein t\xEDmi',
          hh: '%d t\xEDmar',
          d: 'ein dagur',
          dd: '%d dagar',
          M: 'ein m\xE1na\xF0ur',
          MM: '%d m\xE1na\xF0ir',
          y: 'eitt \xE1r',
          yy: '%d \xE1r',
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('fr-ca', {
        months:
          'janvier_f\xE9vrier_mars_avril_mai_juin_juillet_ao\xFBt_septembre_octobre_novembre_d\xE9cembre'.split(
            '_',
          ),
        monthsShort:
          'janv._f\xE9vr._mars_avr._mai_juin_juil._ao\xFBt_sept._oct._nov._d\xE9c.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays: 'dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi'.split(
          '_',
        ),
        weekdaysShort: 'dim._lun._mar._mer._jeu._ven._sam.'.split('_'),
        weekdaysMin: 'di_lu_ma_me_je_ve_sa'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'YYYY-MM-DD',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Aujourd\u2019hui \xE0] LT',
          nextDay: '[Demain \xE0] LT',
          nextWeek: 'dddd [\xE0] LT',
          lastDay: '[Hier \xE0] LT',
          lastWeek: 'dddd [dernier \xE0] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'dans %s',
          past: 'il y a %s',
          s: 'quelques secondes',
          ss: '%d secondes',
          m: 'une minute',
          mm: '%d minutes',
          h: 'une heure',
          hh: '%d heures',
          d: 'un jour',
          dd: '%d jours',
          M: 'un mois',
          MM: '%d mois',
          y: 'un an',
          yy: '%d ans',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(er|e)/,
        ordinal: function (e, s) {
          switch (s) {
            default:
            case 'M':
            case 'Q':
            case 'D':
            case 'DDD':
            case 'd':
              return e + (e === 1 ? 'er' : 'e')
            case 'w':
            case 'W':
              return e + (e === 1 ? 're' : 'e')
          }
        },
      })
      u.defineLocale('fr-ch', {
        months:
          'janvier_f\xE9vrier_mars_avril_mai_juin_juillet_ao\xFBt_septembre_octobre_novembre_d\xE9cembre'.split(
            '_',
          ),
        monthsShort:
          'janv._f\xE9vr._mars_avr._mai_juin_juil._ao\xFBt_sept._oct._nov._d\xE9c.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays: 'dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi'.split(
          '_',
        ),
        weekdaysShort: 'dim._lun._mar._mer._jeu._ven._sam.'.split('_'),
        weekdaysMin: 'di_lu_ma_me_je_ve_sa'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Aujourd\u2019hui \xE0] LT',
          nextDay: '[Demain \xE0] LT',
          nextWeek: 'dddd [\xE0] LT',
          lastDay: '[Hier \xE0] LT',
          lastWeek: 'dddd [dernier \xE0] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'dans %s',
          past: 'il y a %s',
          s: 'quelques secondes',
          ss: '%d secondes',
          m: 'une minute',
          mm: '%d minutes',
          h: 'une heure',
          hh: '%d heures',
          d: 'un jour',
          dd: '%d jours',
          M: 'un mois',
          MM: '%d mois',
          y: 'un an',
          yy: '%d ans',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(er|e)/,
        ordinal: function (e, s) {
          switch (s) {
            default:
            case 'M':
            case 'Q':
            case 'D':
            case 'DDD':
            case 'd':
              return e + (e === 1 ? 'er' : 'e')
            case 'w':
            case 'W':
              return e + (e === 1 ? 're' : 'e')
          }
        },
        week: {dow: 1, doy: 4},
      })
      var Ta =
          /^(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i,
        c =
          /(janv\.?|févr\.?|mars|avr\.?|mai|juin|juil\.?|août|sept\.?|oct\.?|nov\.?|déc\.?)/i,
        ht =
          /(janv\.?|févr\.?|mars|avr\.?|mai|juin|juil\.?|août|sept\.?|oct\.?|nov\.?|déc\.?|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i,
        $a = [
          /^janv/i,
          /^févr/i,
          /^mars/i,
          /^avr/i,
          /^mai/i,
          /^juin/i,
          /^juil/i,
          /^août/i,
          /^sept/i,
          /^oct/i,
          /^nov/i,
          /^déc/i,
        ]
      u.defineLocale('fr', {
        months:
          'janvier_f\xE9vrier_mars_avril_mai_juin_juillet_ao\xFBt_septembre_octobre_novembre_d\xE9cembre'.split(
            '_',
          ),
        monthsShort:
          'janv._f\xE9vr._mars_avr._mai_juin_juil._ao\xFBt_sept._oct._nov._d\xE9c.'.split(
            '_',
          ),
        monthsRegex: ht,
        monthsShortRegex: ht,
        monthsStrictRegex: Ta,
        monthsShortStrictRegex: c,
        monthsParse: $a,
        longMonthsParse: $a,
        shortMonthsParse: $a,
        weekdays: 'dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi'.split(
          '_',
        ),
        weekdaysShort: 'dim._lun._mar._mer._jeu._ven._sam.'.split('_'),
        weekdaysMin: 'di_lu_ma_me_je_ve_sa'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Aujourd\u2019hui \xE0] LT',
          nextDay: '[Demain \xE0] LT',
          nextWeek: 'dddd [\xE0] LT',
          lastDay: '[Hier \xE0] LT',
          lastWeek: 'dddd [dernier \xE0] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'dans %s',
          past: 'il y a %s',
          s: 'quelques secondes',
          ss: '%d secondes',
          m: 'une minute',
          mm: '%d minutes',
          h: 'une heure',
          hh: '%d heures',
          d: 'un jour',
          dd: '%d jours',
          w: 'une semaine',
          ww: '%d semaines',
          M: 'un mois',
          MM: '%d mois',
          y: 'un an',
          yy: '%d ans',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(er|)/,
        ordinal: function (e, s) {
          switch (s) {
            case 'D':
              return e + (e === 1 ? 'er' : '')
            default:
            case 'M':
            case 'Q':
            case 'DDD':
            case 'd':
              return e + (e === 1 ? 'er' : 'e')
            case 'w':
            case 'W':
              return e + (e === 1 ? 're' : 'e')
          }
        },
        week: {dow: 1, doy: 4},
      })
      var me =
          'jan._feb._mrt._apr._mai_jun._jul._aug._sep._okt._nov._des.'.split(
            '_',
          ),
        te = 'jan_feb_mrt_apr_mai_jun_jul_aug_sep_okt_nov_des'.split('_')
      u.defineLocale('fy', {
        months:
          'jannewaris_febrewaris_maart_april_maaie_juny_july_augustus_septimber_oktober_novimber_desimber'.split(
            '_',
          ),
        monthsShort: function (e, s) {
          return e ? (/-MMM-/.test(s) ? te[e.month()] : me[e.month()]) : me
        },
        monthsParseExact: !0,
        weekdays: 'snein_moandei_tiisdei_woansdei_tongersdei_freed_sneon'.split(
          '_',
        ),
        weekdaysShort: 'si._mo._ti._wo._to._fr._so.'.split('_'),
        weekdaysMin: 'Si_Mo_Ti_Wo_To_Fr_So'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD-MM-YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[hjoed om] LT',
          nextDay: '[moarn om] LT',
          nextWeek: 'dddd [om] LT',
          lastDay: '[juster om] LT',
          lastWeek: '[\xF4fr\xFBne] dddd [om] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'oer %s',
          past: '%s lyn',
          s: 'in pear sekonden',
          ss: '%d sekonden',
          m: 'ien min\xFAt',
          mm: '%d minuten',
          h: 'ien oere',
          hh: '%d oeren',
          d: 'ien dei',
          dd: '%d dagen',
          M: 'ien moanne',
          MM: '%d moannen',
          y: 'ien jier',
          yy: '%d jierren',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(ste|de)/,
        ordinal: function (e) {
          return e + (e === 1 || e === 8 || e >= 20 ? 'ste' : 'de')
        },
        week: {dow: 1, doy: 4},
      })
      var k = [
          'Ean\xE1ir',
          'Feabhra',
          'M\xE1rta',
          'Aibre\xE1n',
          'Bealtaine',
          'Meitheamh',
          'I\xFAil',
          'L\xFAnasa',
          'Me\xE1n F\xF3mhair',
          'Deireadh F\xF3mhair',
          'Samhain',
          'Nollaig',
        ],
        Ca = [
          'Ean',
          'Feabh',
          'M\xE1rt',
          'Aib',
          'Beal',
          'Meith',
          'I\xFAil',
          'L\xFAn',
          'M.F.',
          'D.F.',
          'Samh',
          'Noll',
        ],
        v = [
          'D\xE9 Domhnaigh',
          'D\xE9 Luain',
          'D\xE9 M\xE1irt',
          'D\xE9 C\xE9adaoin',
          'D\xE9ardaoin',
          'D\xE9 hAoine',
          'D\xE9 Sathairn',
        ],
        ra = [
          'Domh',
          'Luan',
          'M\xE1irt',
          'C\xE9ad',
          'D\xE9ar',
          'Aoine',
          'Sath',
        ],
        Gt = ['Do', 'Lu', 'M\xE1', 'C\xE9', 'D\xE9', 'A', 'Sa']
      u.defineLocale('ga', {
        months: k,
        monthsShort: Ca,
        monthsParseExact: !0,
        weekdays: v,
        weekdaysShort: ra,
        weekdaysMin: Gt,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Inniu ag] LT',
          nextDay: '[Am\xE1rach ag] LT',
          nextWeek: 'dddd [ag] LT',
          lastDay: '[Inn\xE9 ag] LT',
          lastWeek: 'dddd [seo caite] [ag] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'i %s',
          past: '%s \xF3 shin',
          s: 'c\xFApla soicind',
          ss: '%d soicind',
          m: 'n\xF3im\xE9ad',
          mm: '%d n\xF3im\xE9ad',
          h: 'uair an chloig',
          hh: '%d uair an chloig',
          d: 'l\xE1',
          dd: '%d l\xE1',
          M: 'm\xED',
          MM: '%d m\xEDonna',
          y: 'bliain',
          yy: '%d bliain',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(d|na|mh)/,
        ordinal: function (e) {
          var s = e === 1 ? 'd' : e % 10 === 2 ? 'na' : 'mh'
          return e + s
        },
        week: {dow: 1, doy: 4},
      })
      var wa = [
          'Am Faoilleach',
          'An Gearran',
          'Am M\xE0rt',
          'An Giblean',
          'An C\xE8itean',
          'An t-\xD2gmhios',
          'An t-Iuchar',
          'An L\xF9nastal',
          'An t-Sultain',
          'An D\xE0mhair',
          'An t-Samhain',
          'An D\xF9bhlachd',
        ],
        z = [
          'Faoi',
          'Gear',
          'M\xE0rt',
          'Gibl',
          'C\xE8it',
          '\xD2gmh',
          'Iuch',
          'L\xF9n',
          'Sult',
          'D\xE0mh',
          'Samh',
          'D\xF9bh',
        ],
        Te = [
          'Did\xF2mhnaich',
          'Diluain',
          'Dim\xE0irt',
          'Diciadain',
          'Diardaoin',
          'Dihaoine',
          'Disathairne',
        ],
        Me = ['Did', 'Dil', 'Dim', 'Dic', 'Dia', 'Dih', 'Dis'],
        W = ['D\xF2', 'Lu', 'M\xE0', 'Ci', 'Ar', 'Ha', 'Sa']
      u.defineLocale('gd', {
        months: wa,
        monthsShort: z,
        monthsParseExact: !0,
        weekdays: Te,
        weekdaysShort: Me,
        weekdaysMin: W,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[An-diugh aig] LT',
          nextDay: '[A-m\xE0ireach aig] LT',
          nextWeek: 'dddd [aig] LT',
          lastDay: '[An-d\xE8 aig] LT',
          lastWeek: 'dddd [seo chaidh] [aig] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'ann an %s',
          past: 'bho chionn %s',
          s: 'beagan diogan',
          ss: '%d diogan',
          m: 'mionaid',
          mm: '%d mionaidean',
          h: 'uair',
          hh: '%d uairean',
          d: 'latha',
          dd: '%d latha',
          M: 'm\xECos',
          MM: '%d m\xECosan',
          y: 'bliadhna',
          yy: '%d bliadhna',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(d|na|mh)/,
        ordinal: function (e) {
          var s = e === 1 ? 'd' : e % 10 === 2 ? 'na' : 'mh'
          return e + s
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('gl', {
        months:
          'xaneiro_febreiro_marzo_abril_maio_xu\xF1o_xullo_agosto_setembro_outubro_novembro_decembro'.split(
            '_',
          ),
        monthsShort:
          'xan._feb._mar._abr._mai._xu\xF1._xul._ago._set._out._nov._dec.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'domingo_luns_martes_m\xE9rcores_xoves_venres_s\xE1bado'.split('_'),
        weekdaysShort: 'dom._lun._mar._m\xE9r._xov._ven._s\xE1b.'.split('_'),
        weekdaysMin: 'do_lu_ma_m\xE9_xo_ve_s\xE1'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D [de] MMMM [de] YYYY',
          LLL: 'D [de] MMMM [de] YYYY H:mm',
          LLLL: 'dddd, D [de] MMMM [de] YYYY H:mm',
        },
        calendar: {
          sameDay: function () {
            return '[hoxe ' + (this.hours() !== 1 ? '\xE1s' : '\xE1') + '] LT'
          },
          nextDay: function () {
            return (
              '[ma\xF1\xE1 ' + (this.hours() !== 1 ? '\xE1s' : '\xE1') + '] LT'
            )
          },
          nextWeek: function () {
            return 'dddd [' + (this.hours() !== 1 ? '\xE1s' : 'a') + '] LT'
          },
          lastDay: function () {
            return '[onte ' + (this.hours() !== 1 ? '\xE1' : 'a') + '] LT'
          },
          lastWeek: function () {
            return (
              '[o] dddd [pasado ' +
              (this.hours() !== 1 ? '\xE1s' : 'a') +
              '] LT'
            )
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: function (e) {
            return e.indexOf('un') === 0 ? 'n' + e : 'en ' + e
          },
          past: 'hai %s',
          s: 'uns segundos',
          ss: '%d segundos',
          m: 'un minuto',
          mm: '%d minutos',
          h: 'unha hora',
          hh: '%d horas',
          d: 'un d\xEDa',
          dd: '%d d\xEDas',
          M: 'un mes',
          MM: '%d meses',
          y: 'un ano',
          yy: '%d anos',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%d\xBA',
        week: {dow: 1, doy: 4},
      })
      function x(e, s, i, _) {
        var l = {
          s: [
            '\u0925\u094B\u0921\u092F\u093E \u0938\u0945\u0915\u0902\u0921\u093E\u0902\u0928\u0940',
            '\u0925\u094B\u0921\u0947 \u0938\u0945\u0915\u0902\u0921',
          ],
          ss: [
            e + ' \u0938\u0945\u0915\u0902\u0921\u093E\u0902\u0928\u0940',
            e + ' \u0938\u0945\u0915\u0902\u0921',
          ],
          m: [
            '\u090F\u0915\u093E \u092E\u093F\u0923\u091F\u093E\u0928',
            '\u090F\u0915 \u092E\u093F\u0928\u0942\u091F',
          ],
          mm: [
            e + ' \u092E\u093F\u0923\u091F\u093E\u0902\u0928\u0940',
            e + ' \u092E\u093F\u0923\u091F\u093E\u0902',
          ],
          h: [
            '\u090F\u0915\u093E \u0935\u0930\u093E\u0928',
            '\u090F\u0915 \u0935\u0930',
          ],
          hh: [
            e + ' \u0935\u0930\u093E\u0902\u0928\u0940',
            e + ' \u0935\u0930\u093E\u0902',
          ],
          d: [
            '\u090F\u0915\u093E \u0926\u093F\u0938\u093E\u0928',
            '\u090F\u0915 \u0926\u0940\u0938',
          ],
          dd: [
            e + ' \u0926\u093F\u0938\u093E\u0902\u0928\u0940',
            e + ' \u0926\u0940\u0938',
          ],
          M: [
            '\u090F\u0915\u093E \u092E\u094D\u0939\u092F\u0928\u094D\u092F\u093E\u0928',
            '\u090F\u0915 \u092E\u094D\u0939\u092F\u0928\u094B',
          ],
          MM: [
            e + ' \u092E\u094D\u0939\u092F\u0928\u094D\u092F\u093E\u0928\u0940',
            e + ' \u092E\u094D\u0939\u092F\u0928\u0947',
          ],
          y: [
            '\u090F\u0915\u093E \u0935\u0930\u094D\u0938\u093E\u0928',
            '\u090F\u0915 \u0935\u0930\u094D\u0938',
          ],
          yy: [
            e + ' \u0935\u0930\u094D\u0938\u093E\u0902\u0928\u0940',
            e + ' \u0935\u0930\u094D\u0938\u093E\u0902',
          ],
        }
        return _ ? l[i][0] : l[i][1]
      }
      u.defineLocale('gom-deva', {
        months: {
          standalone:
            '\u091C\u093E\u0928\u0947\u0935\u093E\u0930\u0940_\u092B\u0947\u092C\u094D\u0930\u0941\u0935\u093E\u0930\u0940_\u092E\u093E\u0930\u094D\u091A_\u090F\u092A\u094D\u0930\u0940\u0932_\u092E\u0947_\u091C\u0942\u0928_\u091C\u0941\u0932\u092F_\u0911\u0917\u0938\u094D\u091F_\u0938\u092A\u094D\u091F\u0947\u0902\u092C\u0930_\u0911\u0915\u094D\u091F\u094B\u092C\u0930_\u0928\u094B\u0935\u094D\u0939\u0947\u0902\u092C\u0930_\u0921\u093F\u0938\u0947\u0902\u092C\u0930'.split(
              '_',
            ),
          format:
            '\u091C\u093E\u0928\u0947\u0935\u093E\u0930\u0940\u091A\u094D\u092F\u093E_\u092B\u0947\u092C\u094D\u0930\u0941\u0935\u093E\u0930\u0940\u091A\u094D\u092F\u093E_\u092E\u093E\u0930\u094D\u091A\u093E\u091A\u094D\u092F\u093E_\u090F\u092A\u094D\u0930\u0940\u0932\u093E\u091A\u094D\u092F\u093E_\u092E\u0947\u092F\u093E\u091A\u094D\u092F\u093E_\u091C\u0942\u0928\u093E\u091A\u094D\u092F\u093E_\u091C\u0941\u0932\u092F\u093E\u091A\u094D\u092F\u093E_\u0911\u0917\u0938\u094D\u091F\u093E\u091A\u094D\u092F\u093E_\u0938\u092A\u094D\u091F\u0947\u0902\u092C\u0930\u093E\u091A\u094D\u092F\u093E_\u0911\u0915\u094D\u091F\u094B\u092C\u0930\u093E\u091A\u094D\u092F\u093E_\u0928\u094B\u0935\u094D\u0939\u0947\u0902\u092C\u0930\u093E\u091A\u094D\u092F\u093E_\u0921\u093F\u0938\u0947\u0902\u092C\u0930\u093E\u091A\u094D\u092F\u093E'.split(
              '_',
            ),
          isFormat: /MMMM(\s)+D[oD]?/,
        },
        monthsShort:
          '\u091C\u093E\u0928\u0947._\u092B\u0947\u092C\u094D\u0930\u0941._\u092E\u093E\u0930\u094D\u091A_\u090F\u092A\u094D\u0930\u0940._\u092E\u0947_\u091C\u0942\u0928_\u091C\u0941\u0932._\u0911\u0917._\u0938\u092A\u094D\u091F\u0947\u0902._\u0911\u0915\u094D\u091F\u094B._\u0928\u094B\u0935\u094D\u0939\u0947\u0902._\u0921\u093F\u0938\u0947\u0902.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          '\u0906\u092F\u0924\u093E\u0930_\u0938\u094B\u092E\u093E\u0930_\u092E\u0902\u0917\u0933\u093E\u0930_\u092C\u0941\u0927\u0935\u093E\u0930_\u092C\u093F\u0930\u0947\u0938\u094D\u0924\u093E\u0930_\u0938\u0941\u0915\u094D\u0930\u093E\u0930_\u0936\u0947\u0928\u0935\u093E\u0930'.split(
            '_',
          ),
        weekdaysShort:
          '\u0906\u092F\u0924._\u0938\u094B\u092E._\u092E\u0902\u0917\u0933._\u092C\u0941\u0927._\u092C\u094D\u0930\u0947\u0938\u094D\u0924._\u0938\u0941\u0915\u094D\u0930._\u0936\u0947\u0928.'.split(
            '_',
          ),
        weekdaysMin:
          '\u0906_\u0938\u094B_\u092E\u0902_\u092C\u0941_\u092C\u094D\u0930\u0947_\u0938\u0941_\u0936\u0947'.split(
            '_',
          ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'A h:mm [\u0935\u093E\u091C\u0924\u093E\u0902]',
          LTS: 'A h:mm:ss [\u0935\u093E\u091C\u0924\u093E\u0902]',
          L: 'DD-MM-YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY A h:mm [\u0935\u093E\u091C\u0924\u093E\u0902]',
          LLLL: 'dddd, MMMM Do, YYYY, A h:mm [\u0935\u093E\u091C\u0924\u093E\u0902]',
          llll: 'ddd, D MMM YYYY, A h:mm [\u0935\u093E\u091C\u0924\u093E\u0902]',
        },
        calendar: {
          sameDay: '[\u0906\u092F\u091C] LT',
          nextDay: '[\u092B\u093E\u0932\u094D\u092F\u093E\u0902] LT',
          nextWeek: '[\u092B\u0941\u0921\u0932\u094B] dddd[,] LT',
          lastDay: '[\u0915\u093E\u0932] LT',
          lastWeek: '[\u092B\u093E\u091F\u0932\u094B] dddd[,] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s',
          past: '%s \u0906\u0926\u0940\u0902',
          s: x,
          ss: x,
          m: x,
          mm: x,
          h: x,
          hh: x,
          d: x,
          dd: x,
          M: x,
          MM: x,
          y: x,
          yy: x,
        },
        dayOfMonthOrdinalParse: /\d{1,2}(वेर)/,
        ordinal: function (e, s) {
          switch (s) {
            case 'D':
              return e + '\u0935\u0947\u0930'
            default:
            case 'M':
            case 'Q':
            case 'DDD':
            case 'd':
            case 'w':
            case 'W':
              return e
          }
        },
        week: {dow: 0, doy: 3},
        meridiemParse: /राती|सकाळीं|दनपारां|सांजे/,
        meridiemHour: function (e, s) {
          if ((e === 12 && (e = 0), s === '\u0930\u093E\u0924\u0940'))
            return e < 4 ? e : e + 12
          if (s === '\u0938\u0915\u093E\u0933\u0940\u0902') return e
          if (s === '\u0926\u0928\u092A\u093E\u0930\u093E\u0902')
            return e > 12 ? e : e + 12
          if (s === '\u0938\u093E\u0902\u091C\u0947') return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u0930\u093E\u0924\u0940'
            : e < 12
              ? '\u0938\u0915\u093E\u0933\u0940\u0902'
              : e < 16
                ? '\u0926\u0928\u092A\u093E\u0930\u093E\u0902'
                : e < 20
                  ? '\u0938\u093E\u0902\u091C\u0947'
                  : '\u0930\u093E\u0924\u0940'
        },
      })
      function O(e, s, i, _) {
        var l = {
          s: ['thoddea sekondamni', 'thodde sekond'],
          ss: [e + ' sekondamni', e + ' sekond'],
          m: ['eka mintan', 'ek minut'],
          mm: [e + ' mintamni', e + ' mintam'],
          h: ['eka voran', 'ek vor'],
          hh: [e + ' voramni', e + ' voram'],
          d: ['eka disan', 'ek dis'],
          dd: [e + ' disamni', e + ' dis'],
          M: ['eka mhoinean', 'ek mhoino'],
          MM: [e + ' mhoineamni', e + ' mhoine'],
          y: ['eka vorsan', 'ek voros'],
          yy: [e + ' vorsamni', e + ' vorsam'],
        }
        return _ ? l[i][0] : l[i][1]
      }
      u.defineLocale('gom-latn', {
        months: {
          standalone:
            'Janer_Febrer_Mars_Abril_Mai_Jun_Julai_Agost_Setembr_Otubr_Novembr_Dezembr'.split(
              '_',
            ),
          format:
            'Janerachea_Febrerachea_Marsachea_Abrilachea_Maiachea_Junachea_Julaiachea_Agostachea_Setembrachea_Otubrachea_Novembrachea_Dezembrachea'.split(
              '_',
            ),
          isFormat: /MMMM(\s)+D[oD]?/,
        },
        monthsShort:
          'Jan._Feb._Mars_Abr._Mai_Jun_Jul._Ago._Set._Otu._Nov._Dez.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays: "Aitar_Somar_Mongllar_Budhvar_Birestar_Sukrar_Son'var".split(
          '_',
        ),
        weekdaysShort: 'Ait._Som._Mon._Bud._Bre._Suk._Son.'.split('_'),
        weekdaysMin: 'Ai_Sm_Mo_Bu_Br_Su_Sn'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'A h:mm [vazta]',
          LTS: 'A h:mm:ss [vazta]',
          L: 'DD-MM-YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY A h:mm [vazta]',
          LLLL: 'dddd, MMMM Do, YYYY, A h:mm [vazta]',
          llll: 'ddd, D MMM YYYY, A h:mm [vazta]',
        },
        calendar: {
          sameDay: '[Aiz] LT',
          nextDay: '[Faleam] LT',
          nextWeek: '[Fuddlo] dddd[,] LT',
          lastDay: '[Kal] LT',
          lastWeek: '[Fattlo] dddd[,] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s',
          past: '%s adim',
          s: O,
          ss: O,
          m: O,
          mm: O,
          h: O,
          hh: O,
          d: O,
          dd: O,
          M: O,
          MM: O,
          y: O,
          yy: O,
        },
        dayOfMonthOrdinalParse: /\d{1,2}(er)/,
        ordinal: function (e, s) {
          switch (s) {
            case 'D':
              return e + 'er'
            default:
            case 'M':
            case 'Q':
            case 'DDD':
            case 'd':
            case 'w':
            case 'W':
              return e
          }
        },
        week: {dow: 0, doy: 3},
        meridiemParse: /rati|sokallim|donparam|sanje/,
        meridiemHour: function (e, s) {
          if ((e === 12 && (e = 0), s === 'rati')) return e < 4 ? e : e + 12
          if (s === 'sokallim') return e
          if (s === 'donparam') return e > 12 ? e : e + 12
          if (s === 'sanje') return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? 'rati'
            : e < 12
              ? 'sokallim'
              : e < 16
                ? 'donparam'
                : e < 20
                  ? 'sanje'
                  : 'rati'
        },
      })
      var be = {
          1: '\u0AE7',
          2: '\u0AE8',
          3: '\u0AE9',
          4: '\u0AEA',
          5: '\u0AEB',
          6: '\u0AEC',
          7: '\u0AED',
          8: '\u0AEE',
          9: '\u0AEF',
          0: '\u0AE6',
        },
        Vt = {
          '\u0AE7': '1',
          '\u0AE8': '2',
          '\u0AE9': '3',
          '\u0AEA': '4',
          '\u0AEB': '5',
          '\u0AEC': '6',
          '\u0AED': '7',
          '\u0AEE': '8',
          '\u0AEF': '9',
          '\u0AE6': '0',
        }
      u.defineLocale('gu', {
        months:
          '\u0A9C\u0ABE\u0AA8\u0ACD\u0AAF\u0AC1\u0A86\u0AB0\u0AC0_\u0AAB\u0AC7\u0AAC\u0ACD\u0AB0\u0AC1\u0A86\u0AB0\u0AC0_\u0AAE\u0ABE\u0AB0\u0ACD\u0A9A_\u0A8F\u0AAA\u0ACD\u0AB0\u0ABF\u0AB2_\u0AAE\u0AC7_\u0A9C\u0AC2\u0AA8_\u0A9C\u0AC1\u0AB2\u0ABE\u0A88_\u0A91\u0A97\u0AB8\u0ACD\u0A9F_\u0AB8\u0AAA\u0ACD\u0A9F\u0AC7\u0AAE\u0ACD\u0AAC\u0AB0_\u0A91\u0A95\u0ACD\u0A9F\u0ACD\u0AAC\u0AB0_\u0AA8\u0AB5\u0AC7\u0AAE\u0ACD\u0AAC\u0AB0_\u0AA1\u0ABF\u0AB8\u0AC7\u0AAE\u0ACD\u0AAC\u0AB0'.split(
            '_',
          ),
        monthsShort:
          '\u0A9C\u0ABE\u0AA8\u0ACD\u0AAF\u0AC1._\u0AAB\u0AC7\u0AAC\u0ACD\u0AB0\u0AC1._\u0AAE\u0ABE\u0AB0\u0ACD\u0A9A_\u0A8F\u0AAA\u0ACD\u0AB0\u0ABF._\u0AAE\u0AC7_\u0A9C\u0AC2\u0AA8_\u0A9C\u0AC1\u0AB2\u0ABE._\u0A91\u0A97._\u0AB8\u0AAA\u0ACD\u0A9F\u0AC7._\u0A91\u0A95\u0ACD\u0A9F\u0ACD._\u0AA8\u0AB5\u0AC7._\u0AA1\u0ABF\u0AB8\u0AC7.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          '\u0AB0\u0AB5\u0ABF\u0AB5\u0ABE\u0AB0_\u0AB8\u0ACB\u0AAE\u0AB5\u0ABE\u0AB0_\u0AAE\u0A82\u0A97\u0AB3\u0AB5\u0ABE\u0AB0_\u0AAC\u0AC1\u0AA7\u0ACD\u0AB5\u0ABE\u0AB0_\u0A97\u0AC1\u0AB0\u0AC1\u0AB5\u0ABE\u0AB0_\u0AB6\u0AC1\u0A95\u0ACD\u0AB0\u0AB5\u0ABE\u0AB0_\u0AB6\u0AA8\u0ABF\u0AB5\u0ABE\u0AB0'.split(
            '_',
          ),
        weekdaysShort:
          '\u0AB0\u0AB5\u0ABF_\u0AB8\u0ACB\u0AAE_\u0AAE\u0A82\u0A97\u0AB3_\u0AAC\u0AC1\u0AA7\u0ACD_\u0A97\u0AC1\u0AB0\u0AC1_\u0AB6\u0AC1\u0A95\u0ACD\u0AB0_\u0AB6\u0AA8\u0ABF'.split(
            '_',
          ),
        weekdaysMin:
          '\u0AB0_\u0AB8\u0ACB_\u0AAE\u0A82_\u0AAC\u0AC1_\u0A97\u0AC1_\u0AB6\u0AC1_\u0AB6'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'A h:mm \u0AB5\u0ABE\u0A97\u0ACD\u0AAF\u0AC7',
          LTS: 'A h:mm:ss \u0AB5\u0ABE\u0A97\u0ACD\u0AAF\u0AC7',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY, A h:mm \u0AB5\u0ABE\u0A97\u0ACD\u0AAF\u0AC7',
          LLLL: 'dddd, D MMMM YYYY, A h:mm \u0AB5\u0ABE\u0A97\u0ACD\u0AAF\u0AC7',
        },
        calendar: {
          sameDay: '[\u0A86\u0A9C] LT',
          nextDay: '[\u0A95\u0ABE\u0AB2\u0AC7] LT',
          nextWeek: 'dddd, LT',
          lastDay: '[\u0A97\u0A87\u0A95\u0ABE\u0AB2\u0AC7] LT',
          lastWeek: '[\u0AAA\u0ABE\u0A9B\u0AB2\u0ABE] dddd, LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u0AAE\u0ABE',
          past: '%s \u0AAA\u0AB9\u0AC7\u0AB2\u0ABE',
          s: '\u0A85\u0AAE\u0AC1\u0A95 \u0AAA\u0AB3\u0ACB',
          ss: '%d \u0AB8\u0AC7\u0A95\u0A82\u0AA1',
          m: '\u0A8F\u0A95 \u0AAE\u0ABF\u0AA8\u0ABF\u0A9F',
          mm: '%d \u0AAE\u0ABF\u0AA8\u0ABF\u0A9F',
          h: '\u0A8F\u0A95 \u0A95\u0AB2\u0ABE\u0A95',
          hh: '%d \u0A95\u0AB2\u0ABE\u0A95',
          d: '\u0A8F\u0A95 \u0AA6\u0ABF\u0AB5\u0AB8',
          dd: '%d \u0AA6\u0ABF\u0AB5\u0AB8',
          M: '\u0A8F\u0A95 \u0AAE\u0AB9\u0ABF\u0AA8\u0ACB',
          MM: '%d \u0AAE\u0AB9\u0ABF\u0AA8\u0ACB',
          y: '\u0A8F\u0A95 \u0AB5\u0AB0\u0ACD\u0AB7',
          yy: '%d \u0AB5\u0AB0\u0ACD\u0AB7',
        },
        preparse: function (e) {
          return e.replace(/[૧૨૩૪૫૬૭૮૯૦]/g, function (s) {
            return Vt[s]
          })
        },
        postformat: function (e) {
          return e.replace(/\d/g, function (s) {
            return be[s]
          })
        },
        meridiemParse: /રાત|બપોર|સવાર|સાંજ/,
        meridiemHour: function (e, s) {
          if ((e === 12 && (e = 0), s === '\u0AB0\u0ABE\u0AA4'))
            return e < 4 ? e : e + 12
          if (s === '\u0AB8\u0AB5\u0ABE\u0AB0') return e
          if (s === '\u0AAC\u0AAA\u0ACB\u0AB0') return e >= 10 ? e : e + 12
          if (s === '\u0AB8\u0ABE\u0A82\u0A9C') return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u0AB0\u0ABE\u0AA4'
            : e < 10
              ? '\u0AB8\u0AB5\u0ABE\u0AB0'
              : e < 17
                ? '\u0AAC\u0AAA\u0ACB\u0AB0'
                : e < 20
                  ? '\u0AB8\u0ABE\u0A82\u0A9C'
                  : '\u0AB0\u0ABE\u0AA4'
        },
        week: {dow: 0, doy: 6},
      })
      u.defineLocale('he', {
        months:
          '\u05D9\u05E0\u05D5\u05D0\u05E8_\u05E4\u05D1\u05E8\u05D5\u05D0\u05E8_\u05DE\u05E8\u05E5_\u05D0\u05E4\u05E8\u05D9\u05DC_\u05DE\u05D0\u05D9_\u05D9\u05D5\u05E0\u05D9_\u05D9\u05D5\u05DC\u05D9_\u05D0\u05D5\u05D2\u05D5\u05E1\u05D8_\u05E1\u05E4\u05D8\u05DE\u05D1\u05E8_\u05D0\u05D5\u05E7\u05D8\u05D5\u05D1\u05E8_\u05E0\u05D5\u05D1\u05DE\u05D1\u05E8_\u05D3\u05E6\u05DE\u05D1\u05E8'.split(
            '_',
          ),
        monthsShort:
          '\u05D9\u05E0\u05D5\u05F3_\u05E4\u05D1\u05E8\u05F3_\u05DE\u05E8\u05E5_\u05D0\u05E4\u05E8\u05F3_\u05DE\u05D0\u05D9_\u05D9\u05D5\u05E0\u05D9_\u05D9\u05D5\u05DC\u05D9_\u05D0\u05D5\u05D2\u05F3_\u05E1\u05E4\u05D8\u05F3_\u05D0\u05D5\u05E7\u05F3_\u05E0\u05D5\u05D1\u05F3_\u05D3\u05E6\u05DE\u05F3'.split(
            '_',
          ),
        weekdays:
          '\u05E8\u05D0\u05E9\u05D5\u05DF_\u05E9\u05E0\u05D9_\u05E9\u05DC\u05D9\u05E9\u05D9_\u05E8\u05D1\u05D9\u05E2\u05D9_\u05D7\u05DE\u05D9\u05E9\u05D9_\u05E9\u05D9\u05E9\u05D9_\u05E9\u05D1\u05EA'.split(
            '_',
          ),
        weekdaysShort:
          '\u05D0\u05F3_\u05D1\u05F3_\u05D2\u05F3_\u05D3\u05F3_\u05D4\u05F3_\u05D5\u05F3_\u05E9\u05F3'.split(
            '_',
          ),
        weekdaysMin: '\u05D0_\u05D1_\u05D2_\u05D3_\u05D4_\u05D5_\u05E9'.split(
          '_',
        ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D [\u05D1]MMMM YYYY',
          LLL: 'D [\u05D1]MMMM YYYY HH:mm',
          LLLL: 'dddd, D [\u05D1]MMMM YYYY HH:mm',
          l: 'D/M/YYYY',
          ll: 'D MMM YYYY',
          lll: 'D MMM YYYY HH:mm',
          llll: 'ddd, D MMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[\u05D4\u05D9\u05D5\u05DD \u05D1\u05BE]LT',
          nextDay: '[\u05DE\u05D7\u05E8 \u05D1\u05BE]LT',
          nextWeek: 'dddd [\u05D1\u05E9\u05E2\u05D4] LT',
          lastDay: '[\u05D0\u05EA\u05DE\u05D5\u05DC \u05D1\u05BE]LT',
          lastWeek:
            '[\u05D1\u05D9\u05D5\u05DD] dddd [\u05D4\u05D0\u05D7\u05E8\u05D5\u05DF \u05D1\u05E9\u05E2\u05D4] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u05D1\u05E2\u05D5\u05D3 %s',
          past: '\u05DC\u05E4\u05E0\u05D9 %s',
          s: '\u05DE\u05E1\u05E4\u05E8 \u05E9\u05E0\u05D9\u05D5\u05EA',
          ss: '%d \u05E9\u05E0\u05D9\u05D5\u05EA',
          m: '\u05D3\u05E7\u05D4',
          mm: '%d \u05D3\u05E7\u05D5\u05EA',
          h: '\u05E9\u05E2\u05D4',
          hh: function (e) {
            return e === 2
              ? '\u05E9\u05E2\u05EA\u05D9\u05D9\u05DD'
              : e + ' \u05E9\u05E2\u05D5\u05EA'
          },
          d: '\u05D9\u05D5\u05DD',
          dd: function (e) {
            return e === 2
              ? '\u05D9\u05D5\u05DE\u05D9\u05D9\u05DD'
              : e + ' \u05D9\u05DE\u05D9\u05DD'
          },
          M: '\u05D7\u05D5\u05D3\u05E9',
          MM: function (e) {
            return e === 2
              ? '\u05D7\u05D5\u05D3\u05E9\u05D9\u05D9\u05DD'
              : e + ' \u05D7\u05D5\u05D3\u05E9\u05D9\u05DD'
          },
          y: '\u05E9\u05E0\u05D4',
          yy: function (e) {
            return e === 2
              ? '\u05E9\u05E0\u05EA\u05D9\u05D9\u05DD'
              : e % 10 === 0 && e !== 10
                ? e + ' \u05E9\u05E0\u05D4'
                : e + ' \u05E9\u05E0\u05D9\u05DD'
          },
        },
        meridiemParse:
          /אחה"צ|לפנה"צ|אחרי הצהריים|לפני הצהריים|לפנות בוקר|בבוקר|בערב/i,
        isPM: function (e) {
          return /^(אחה"צ|אחרי הצהריים|בערב)$/.test(e)
        },
        meridiem: function (e, s, i) {
          return e < 5
            ? '\u05DC\u05E4\u05E0\u05D5\u05EA \u05D1\u05D5\u05E7\u05E8'
            : e < 10
              ? '\u05D1\u05D1\u05D5\u05E7\u05E8'
              : e < 12
                ? i
                  ? '\u05DC\u05E4\u05E0\u05D4"\u05E6'
                  : '\u05DC\u05E4\u05E0\u05D9 \u05D4\u05E6\u05D4\u05E8\u05D9\u05D9\u05DD'
                : e < 18
                  ? i
                    ? '\u05D0\u05D7\u05D4"\u05E6'
                    : '\u05D0\u05D7\u05E8\u05D9 \u05D4\u05E6\u05D4\u05E8\u05D9\u05D9\u05DD'
                  : '\u05D1\u05E2\u05E8\u05D1'
        },
      })
      var qt = {
          1: '\u0967',
          2: '\u0968',
          3: '\u0969',
          4: '\u096A',
          5: '\u096B',
          6: '\u096C',
          7: '\u096D',
          8: '\u096E',
          9: '\u096F',
          0: '\u0966',
        },
        na = {
          '\u0967': '1',
          '\u0968': '2',
          '\u0969': '3',
          '\u096A': '4',
          '\u096B': '5',
          '\u096C': '6',
          '\u096D': '7',
          '\u096E': '8',
          '\u096F': '9',
          '\u0966': '0',
        },
        Ua = [
          /^जन/i,
          /^फ़र|फर/i,
          /^मार्च/i,
          /^अप्रै/i,
          /^मई/i,
          /^जून/i,
          /^जुल/i,
          /^अग/i,
          /^सितं|सित/i,
          /^अक्टू/i,
          /^नव|नवं/i,
          /^दिसं|दिस/i,
        ],
        Bt = [
          /^जन/i,
          /^फ़र/i,
          /^मार्च/i,
          /^अप्रै/i,
          /^मई/i,
          /^जून/i,
          /^जुल/i,
          /^अग/i,
          /^सित/i,
          /^अक्टू/i,
          /^नव/i,
          /^दिस/i,
        ]
      u.defineLocale('hi', {
        months: {
          format:
            '\u091C\u0928\u0935\u0930\u0940_\u092B\u093C\u0930\u0935\u0930\u0940_\u092E\u093E\u0930\u094D\u091A_\u0905\u092A\u094D\u0930\u0948\u0932_\u092E\u0908_\u091C\u0942\u0928_\u091C\u0941\u0932\u093E\u0908_\u0905\u0917\u0938\u094D\u0924_\u0938\u093F\u0924\u092E\u094D\u092C\u0930_\u0905\u0915\u094D\u091F\u0942\u092C\u0930_\u0928\u0935\u092E\u094D\u092C\u0930_\u0926\u093F\u0938\u092E\u094D\u092C\u0930'.split(
              '_',
            ),
          standalone:
            '\u091C\u0928\u0935\u0930\u0940_\u092B\u0930\u0935\u0930\u0940_\u092E\u093E\u0930\u094D\u091A_\u0905\u092A\u094D\u0930\u0948\u0932_\u092E\u0908_\u091C\u0942\u0928_\u091C\u0941\u0932\u093E\u0908_\u0905\u0917\u0938\u094D\u0924_\u0938\u093F\u0924\u0902\u092C\u0930_\u0905\u0915\u094D\u091F\u0942\u092C\u0930_\u0928\u0935\u0902\u092C\u0930_\u0926\u093F\u0938\u0902\u092C\u0930'.split(
              '_',
            ),
        },
        monthsShort:
          '\u091C\u0928._\u092B\u093C\u0930._\u092E\u093E\u0930\u094D\u091A_\u0905\u092A\u094D\u0930\u0948._\u092E\u0908_\u091C\u0942\u0928_\u091C\u0941\u0932._\u0905\u0917._\u0938\u093F\u0924._\u0905\u0915\u094D\u091F\u0942._\u0928\u0935._\u0926\u093F\u0938.'.split(
            '_',
          ),
        weekdays:
          '\u0930\u0935\u093F\u0935\u093E\u0930_\u0938\u094B\u092E\u0935\u093E\u0930_\u092E\u0902\u0917\u0932\u0935\u093E\u0930_\u092C\u0941\u0927\u0935\u093E\u0930_\u0917\u0941\u0930\u0942\u0935\u093E\u0930_\u0936\u0941\u0915\u094D\u0930\u0935\u093E\u0930_\u0936\u0928\u093F\u0935\u093E\u0930'.split(
            '_',
          ),
        weekdaysShort:
          '\u0930\u0935\u093F_\u0938\u094B\u092E_\u092E\u0902\u0917\u0932_\u092C\u0941\u0927_\u0917\u0941\u0930\u0942_\u0936\u0941\u0915\u094D\u0930_\u0936\u0928\u093F'.split(
            '_',
          ),
        weekdaysMin:
          '\u0930_\u0938\u094B_\u092E\u0902_\u092C\u0941_\u0917\u0941_\u0936\u0941_\u0936'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'A h:mm \u092C\u091C\u0947',
          LTS: 'A h:mm:ss \u092C\u091C\u0947',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY, A h:mm \u092C\u091C\u0947',
          LLLL: 'dddd, D MMMM YYYY, A h:mm \u092C\u091C\u0947',
        },
        monthsParse: Ua,
        longMonthsParse: Ua,
        shortMonthsParse: Bt,
        monthsRegex:
          /^(जनवरी|जन\.?|फ़रवरी|फरवरी|फ़र\.?|मार्च?|अप्रैल|अप्रै\.?|मई?|जून?|जुलाई|जुल\.?|अगस्त|अग\.?|सितम्बर|सितंबर|सित\.?|अक्टूबर|अक्टू\.?|नवम्बर|नवंबर|नव\.?|दिसम्बर|दिसंबर|दिस\.?)/i,
        monthsShortRegex:
          /^(जनवरी|जन\.?|फ़रवरी|फरवरी|फ़र\.?|मार्च?|अप्रैल|अप्रै\.?|मई?|जून?|जुलाई|जुल\.?|अगस्त|अग\.?|सितम्बर|सितंबर|सित\.?|अक्टूबर|अक्टू\.?|नवम्बर|नवंबर|नव\.?|दिसम्बर|दिसंबर|दिस\.?)/i,
        monthsStrictRegex:
          /^(जनवरी?|फ़रवरी|फरवरी?|मार्च?|अप्रैल?|मई?|जून?|जुलाई?|अगस्त?|सितम्बर|सितंबर|सित?\.?|अक्टूबर|अक्टू\.?|नवम्बर|नवंबर?|दिसम्बर|दिसंबर?)/i,
        monthsShortStrictRegex:
          /^(जन\.?|फ़र\.?|मार्च?|अप्रै\.?|मई?|जून?|जुल\.?|अग\.?|सित\.?|अक्टू\.?|नव\.?|दिस\.?)/i,
        calendar: {
          sameDay: '[\u0906\u091C] LT',
          nextDay: '[\u0915\u0932] LT',
          nextWeek: 'dddd, LT',
          lastDay: '[\u0915\u0932] LT',
          lastWeek: '[\u092A\u093F\u091B\u0932\u0947] dddd, LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u092E\u0947\u0902',
          past: '%s \u092A\u0939\u0932\u0947',
          s: '\u0915\u0941\u091B \u0939\u0940 \u0915\u094D\u0937\u0923',
          ss: '%d \u0938\u0947\u0915\u0902\u0921',
          m: '\u090F\u0915 \u092E\u093F\u0928\u091F',
          mm: '%d \u092E\u093F\u0928\u091F',
          h: '\u090F\u0915 \u0918\u0902\u091F\u093E',
          hh: '%d \u0918\u0902\u091F\u0947',
          d: '\u090F\u0915 \u0926\u093F\u0928',
          dd: '%d \u0926\u093F\u0928',
          M: '\u090F\u0915 \u092E\u0939\u0940\u0928\u0947',
          MM: '%d \u092E\u0939\u0940\u0928\u0947',
          y: '\u090F\u0915 \u0935\u0930\u094D\u0937',
          yy: '%d \u0935\u0930\u094D\u0937',
        },
        preparse: function (e) {
          return e.replace(/[१२३४५६७८९०]/g, function (s) {
            return na[s]
          })
        },
        postformat: function (e) {
          return e.replace(/\d/g, function (s) {
            return qt[s]
          })
        },
        meridiemParse: /रात|सुबह|दोपहर|शाम/,
        meridiemHour: function (e, s) {
          if ((e === 12 && (e = 0), s === '\u0930\u093E\u0924'))
            return e < 4 ? e : e + 12
          if (s === '\u0938\u0941\u092C\u0939') return e
          if (s === '\u0926\u094B\u092A\u0939\u0930')
            return e >= 10 ? e : e + 12
          if (s === '\u0936\u093E\u092E') return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u0930\u093E\u0924'
            : e < 10
              ? '\u0938\u0941\u092C\u0939'
              : e < 17
                ? '\u0926\u094B\u092A\u0939\u0930'
                : e < 20
                  ? '\u0936\u093E\u092E'
                  : '\u0930\u093E\u0924'
        },
        week: {dow: 0, doy: 6},
      })
      function q(e, s, i) {
        var _ = e + ' '
        switch (i) {
          case 'ss':
            return (
              e === 1
                ? (_ += 'sekunda')
                : e === 2 || e === 3 || e === 4
                  ? (_ += 'sekunde')
                  : (_ += 'sekundi'),
              _
            )
          case 'm':
            return s ? 'jedna minuta' : 'jedne minute'
          case 'mm':
            return (
              e === 1
                ? (_ += 'minuta')
                : e === 2 || e === 3 || e === 4
                  ? (_ += 'minute')
                  : (_ += 'minuta'),
              _
            )
          case 'h':
            return s ? 'jedan sat' : 'jednog sata'
          case 'hh':
            return (
              e === 1
                ? (_ += 'sat')
                : e === 2 || e === 3 || e === 4
                  ? (_ += 'sata')
                  : (_ += 'sati'),
              _
            )
          case 'dd':
            return (e === 1 ? (_ += 'dan') : (_ += 'dana'), _)
          case 'MM':
            return (
              e === 1
                ? (_ += 'mjesec')
                : e === 2 || e === 3 || e === 4
                  ? (_ += 'mjeseca')
                  : (_ += 'mjeseci'),
              _
            )
          case 'yy':
            return (
              e === 1
                ? (_ += 'godina')
                : e === 2 || e === 3 || e === 4
                  ? (_ += 'godine')
                  : (_ += 'godina'),
              _
            )
        }
      }
      u.defineLocale('hr', {
        months: {
          format:
            'sije\u010Dnja_velja\u010De_o\u017Eujka_travnja_svibnja_lipnja_srpnja_kolovoza_rujna_listopada_studenoga_prosinca'.split(
              '_',
            ),
          standalone:
            'sije\u010Danj_velja\u010Da_o\u017Eujak_travanj_svibanj_lipanj_srpanj_kolovoz_rujan_listopad_studeni_prosinac'.split(
              '_',
            ),
        },
        monthsShort:
          'sij._velj._o\u017Eu._tra._svi._lip._srp._kol._ruj._lis._stu._pro.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'nedjelja_ponedjeljak_utorak_srijeda_\u010Detvrtak_petak_subota'.split(
            '_',
          ),
        weekdaysShort: 'ned._pon._uto._sri._\u010Det._pet._sub.'.split('_'),
        weekdaysMin: 'ne_po_ut_sr_\u010De_pe_su'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'Do MMMM YYYY',
          LLL: 'Do MMMM YYYY H:mm',
          LLLL: 'dddd, Do MMMM YYYY H:mm',
        },
        calendar: {
          sameDay: '[danas u] LT',
          nextDay: '[sutra u] LT',
          nextWeek: function () {
            switch (this.day()) {
              case 0:
                return '[u] [nedjelju] [u] LT'
              case 3:
                return '[u] [srijedu] [u] LT'
              case 6:
                return '[u] [subotu] [u] LT'
              case 1:
              case 2:
              case 4:
              case 5:
                return '[u] dddd [u] LT'
            }
          },
          lastDay: '[ju\u010Der u] LT',
          lastWeek: function () {
            switch (this.day()) {
              case 0:
                return '[pro\u0161lu] [nedjelju] [u] LT'
              case 3:
                return '[pro\u0161lu] [srijedu] [u] LT'
              case 6:
                return '[pro\u0161le] [subote] [u] LT'
              case 1:
              case 2:
              case 4:
              case 5:
                return '[pro\u0161li] dddd [u] LT'
            }
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'za %s',
          past: 'prije %s',
          s: 'par sekundi',
          ss: q,
          m: q,
          mm: q,
          h: q,
          hh: q,
          d: 'dan',
          dd: q,
          M: 'mjesec',
          MM: q,
          y: 'godinu',
          yy: q,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 7},
      })
      var da =
        'vas\xE1rnap h\xE9tf\u0151n kedden szerd\xE1n cs\xFCt\xF6rt\xF6k\xF6n p\xE9nteken szombaton'.split(
          ' ',
        )
      function B(e, s, i, _) {
        var l = e
        switch (i) {
          case 's':
            return _ || s
              ? 'n\xE9h\xE1ny m\xE1sodperc'
              : 'n\xE9h\xE1ny m\xE1sodperce'
          case 'ss':
            return l + (_ || s) ? ' m\xE1sodperc' : ' m\xE1sodperce'
          case 'm':
            return 'egy' + (_ || s ? ' perc' : ' perce')
          case 'mm':
            return l + (_ || s ? ' perc' : ' perce')
          case 'h':
            return 'egy' + (_ || s ? ' \xF3ra' : ' \xF3r\xE1ja')
          case 'hh':
            return l + (_ || s ? ' \xF3ra' : ' \xF3r\xE1ja')
          case 'd':
            return 'egy' + (_ || s ? ' nap' : ' napja')
          case 'dd':
            return l + (_ || s ? ' nap' : ' napja')
          case 'M':
            return 'egy' + (_ || s ? ' h\xF3nap' : ' h\xF3napja')
          case 'MM':
            return l + (_ || s ? ' h\xF3nap' : ' h\xF3napja')
          case 'y':
            return 'egy' + (_ || s ? ' \xE9v' : ' \xE9ve')
          case 'yy':
            return l + (_ || s ? ' \xE9v' : ' \xE9ve')
        }
        return ''
      }
      function ct(e) {
        return (e ? '' : '[m\xFAlt] ') + '[' + da[this.day()] + '] LT[-kor]'
      }
      u.defineLocale('hu', {
        months:
          'janu\xE1r_febru\xE1r_m\xE1rcius_\xE1prilis_m\xE1jus_j\xFAnius_j\xFAlius_augusztus_szeptember_okt\xF3ber_november_december'.split(
            '_',
          ),
        monthsShort:
          'jan._feb._m\xE1rc._\xE1pr._m\xE1j._j\xFAn._j\xFAl._aug._szept._okt._nov._dec.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'vas\xE1rnap_h\xE9tf\u0151_kedd_szerda_cs\xFCt\xF6rt\xF6k_p\xE9ntek_szombat'.split(
            '_',
          ),
        weekdaysShort: 'vas_h\xE9t_kedd_sze_cs\xFCt_p\xE9n_szo'.split('_'),
        weekdaysMin: 'v_h_k_sze_cs_p_szo'.split('_'),
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'YYYY.MM.DD.',
          LL: 'YYYY. MMMM D.',
          LLL: 'YYYY. MMMM D. H:mm',
          LLLL: 'YYYY. MMMM D., dddd H:mm',
        },
        meridiemParse: /de|du/i,
        isPM: function (e) {
          return e.charAt(1).toLowerCase() === 'u'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? (i === !0 ? 'de' : 'DE') : i === !0 ? 'du' : 'DU'
        },
        calendar: {
          sameDay: '[ma] LT[-kor]',
          nextDay: '[holnap] LT[-kor]',
          nextWeek: function () {
            return ct.call(this, !0)
          },
          lastDay: '[tegnap] LT[-kor]',
          lastWeek: function () {
            return ct.call(this, !1)
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s m\xFAlva',
          past: '%s',
          s: B,
          ss: B,
          m: B,
          mm: B,
          h: B,
          hh: B,
          d: B,
          dd: B,
          M: B,
          MM: B,
          y: B,
          yy: B,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('hy-am', {
        months: {
          format:
            '\u0570\u0578\u0582\u0576\u057E\u0561\u0580\u056B_\u0583\u0565\u057F\u0580\u057E\u0561\u0580\u056B_\u0574\u0561\u0580\u057F\u056B_\u0561\u057A\u0580\u056B\u056C\u056B_\u0574\u0561\u0575\u056B\u057D\u056B_\u0570\u0578\u0582\u0576\u056B\u057D\u056B_\u0570\u0578\u0582\u056C\u056B\u057D\u056B_\u0585\u0563\u0578\u057D\u057F\u0578\u057D\u056B_\u057D\u0565\u057A\u057F\u0565\u0574\u0562\u0565\u0580\u056B_\u0570\u0578\u056F\u057F\u0565\u0574\u0562\u0565\u0580\u056B_\u0576\u0578\u0575\u0565\u0574\u0562\u0565\u0580\u056B_\u0564\u0565\u056F\u057F\u0565\u0574\u0562\u0565\u0580\u056B'.split(
              '_',
            ),
          standalone:
            '\u0570\u0578\u0582\u0576\u057E\u0561\u0580_\u0583\u0565\u057F\u0580\u057E\u0561\u0580_\u0574\u0561\u0580\u057F_\u0561\u057A\u0580\u056B\u056C_\u0574\u0561\u0575\u056B\u057D_\u0570\u0578\u0582\u0576\u056B\u057D_\u0570\u0578\u0582\u056C\u056B\u057D_\u0585\u0563\u0578\u057D\u057F\u0578\u057D_\u057D\u0565\u057A\u057F\u0565\u0574\u0562\u0565\u0580_\u0570\u0578\u056F\u057F\u0565\u0574\u0562\u0565\u0580_\u0576\u0578\u0575\u0565\u0574\u0562\u0565\u0580_\u0564\u0565\u056F\u057F\u0565\u0574\u0562\u0565\u0580'.split(
              '_',
            ),
        },
        monthsShort:
          '\u0570\u0576\u057E_\u0583\u057F\u0580_\u0574\u0580\u057F_\u0561\u057A\u0580_\u0574\u0575\u057D_\u0570\u0576\u057D_\u0570\u056C\u057D_\u0585\u0563\u057D_\u057D\u057A\u057F_\u0570\u056F\u057F_\u0576\u0574\u0562_\u0564\u056F\u057F'.split(
            '_',
          ),
        weekdays:
          '\u056F\u056B\u0580\u0561\u056F\u056B_\u0565\u0580\u056F\u0578\u0582\u0577\u0561\u0562\u0569\u056B_\u0565\u0580\u0565\u0584\u0577\u0561\u0562\u0569\u056B_\u0579\u0578\u0580\u0565\u0584\u0577\u0561\u0562\u0569\u056B_\u0570\u056B\u0576\u0563\u0577\u0561\u0562\u0569\u056B_\u0578\u0582\u0580\u0562\u0561\u0569_\u0577\u0561\u0562\u0561\u0569'.split(
            '_',
          ),
        weekdaysShort:
          '\u056F\u0580\u056F_\u0565\u0580\u056F_\u0565\u0580\u0584_\u0579\u0580\u0584_\u0570\u0576\u0563_\u0578\u0582\u0580\u0562_\u0577\u0562\u0569'.split(
            '_',
          ),
        weekdaysMin:
          '\u056F\u0580\u056F_\u0565\u0580\u056F_\u0565\u0580\u0584_\u0579\u0580\u0584_\u0570\u0576\u0563_\u0578\u0582\u0580\u0562_\u0577\u0562\u0569'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY \u0569.',
          LLL: 'D MMMM YYYY \u0569., HH:mm',
          LLLL: 'dddd, D MMMM YYYY \u0569., HH:mm',
        },
        calendar: {
          sameDay: '[\u0561\u0575\u057D\u0585\u0580] LT',
          nextDay: '[\u057E\u0561\u0572\u0568] LT',
          lastDay: '[\u0565\u0580\u0565\u056F] LT',
          nextWeek: function () {
            return 'dddd [\u0585\u0580\u0568 \u056A\u0561\u0574\u0568] LT'
          },
          lastWeek: function () {
            return '[\u0561\u0576\u0581\u0561\u056E] dddd [\u0585\u0580\u0568 \u056A\u0561\u0574\u0568] LT'
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u0570\u0565\u057F\u0578',
          past: '%s \u0561\u057C\u0561\u057B',
          s: '\u0574\u056B \u0584\u0561\u0576\u056B \u057E\u0561\u0575\u0580\u056F\u0575\u0561\u0576',
          ss: '%d \u057E\u0561\u0575\u0580\u056F\u0575\u0561\u0576',
          m: '\u0580\u0578\u057A\u0565',
          mm: '%d \u0580\u0578\u057A\u0565',
          h: '\u056A\u0561\u0574',
          hh: '%d \u056A\u0561\u0574',
          d: '\u0585\u0580',
          dd: '%d \u0585\u0580',
          M: '\u0561\u0574\u056B\u057D',
          MM: '%d \u0561\u0574\u056B\u057D',
          y: '\u057F\u0561\u0580\u056B',
          yy: '%d \u057F\u0561\u0580\u056B',
        },
        meridiemParse: /գիշերվա|առավոտվա|ցերեկվա|երեկոյան/,
        isPM: function (e) {
          return /^(ցերեկվա|երեկոյան)$/.test(e)
        },
        meridiem: function (e) {
          return e < 4
            ? '\u0563\u056B\u0577\u0565\u0580\u057E\u0561'
            : e < 12
              ? '\u0561\u057C\u0561\u057E\u0578\u057F\u057E\u0561'
              : e < 17
                ? '\u0581\u0565\u0580\u0565\u056F\u057E\u0561'
                : '\u0565\u0580\u0565\u056F\u0578\u0575\u0561\u0576'
        },
        dayOfMonthOrdinalParse: /\d{1,2}|\d{1,2}-(ին|րդ)/,
        ordinal: function (e, s) {
          switch (s) {
            case 'DDD':
            case 'w':
            case 'W':
            case 'DDDo':
              return e === 1 ? e + '-\u056B\u0576' : e + '-\u0580\u0564'
            default:
              return e
          }
        },
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('id', {
        months:
          'Januari_Februari_Maret_April_Mei_Juni_Juli_Agustus_September_Oktober_November_Desember'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mar_Apr_Mei_Jun_Jul_Agt_Sep_Okt_Nov_Des'.split(
          '_',
        ),
        weekdays: 'Minggu_Senin_Selasa_Rabu_Kamis_Jumat_Sabtu'.split('_'),
        weekdaysShort: 'Min_Sen_Sel_Rab_Kam_Jum_Sab'.split('_'),
        weekdaysMin: 'Mg_Sn_Sl_Rb_Km_Jm_Sb'.split('_'),
        longDateFormat: {
          LT: 'HH.mm',
          LTS: 'HH.mm.ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY [pukul] HH.mm',
          LLLL: 'dddd, D MMMM YYYY [pukul] HH.mm',
        },
        meridiemParse: /pagi|siang|sore|malam/,
        meridiemHour: function (e, s) {
          if ((e === 12 && (e = 0), s === 'pagi')) return e
          if (s === 'siang') return e >= 11 ? e : e + 12
          if (s === 'sore' || s === 'malam') return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 11 ? 'pagi' : e < 15 ? 'siang' : e < 19 ? 'sore' : 'malam'
        },
        calendar: {
          sameDay: '[Hari ini pukul] LT',
          nextDay: '[Besok pukul] LT',
          nextWeek: 'dddd [pukul] LT',
          lastDay: '[Kemarin pukul] LT',
          lastWeek: 'dddd [lalu pukul] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'dalam %s',
          past: '%s yang lalu',
          s: 'beberapa detik',
          ss: '%d detik',
          m: 'semenit',
          mm: '%d menit',
          h: 'sejam',
          hh: '%d jam',
          d: 'sehari',
          dd: '%d hari',
          M: 'sebulan',
          MM: '%d bulan',
          y: 'setahun',
          yy: '%d tahun',
        },
        week: {dow: 0, doy: 6},
      })
      function Je(e) {
        return e % 100 === 11 ? !0 : e % 10 !== 1
      }
      function de(e, s, i, _) {
        var l = e + ' '
        switch (i) {
          case 's':
            return s || _ ? 'nokkrar sek\xFAndur' : 'nokkrum sek\xFAndum'
          case 'ss':
            return Je(e)
              ? l + (s || _ ? 'sek\xFAndur' : 'sek\xFAndum')
              : l + 'sek\xFAnda'
          case 'm':
            return s ? 'm\xEDn\xFAta' : 'm\xEDn\xFAtu'
          case 'mm':
            return Je(e)
              ? l + (s || _ ? 'm\xEDn\xFAtur' : 'm\xEDn\xFAtum')
              : s
                ? l + 'm\xEDn\xFAta'
                : l + 'm\xEDn\xFAtu'
          case 'hh':
            return Je(e)
              ? l + (s || _ ? 'klukkustundir' : 'klukkustundum')
              : l + 'klukkustund'
          case 'd':
            return s ? 'dagur' : _ ? 'dag' : 'degi'
          case 'dd':
            return Je(e)
              ? s
                ? l + 'dagar'
                : l + (_ ? 'daga' : 'd\xF6gum')
              : s
                ? l + 'dagur'
                : l + (_ ? 'dag' : 'degi')
          case 'M':
            return s ? 'm\xE1nu\xF0ur' : _ ? 'm\xE1nu\xF0' : 'm\xE1nu\xF0i'
          case 'MM':
            return Je(e)
              ? s
                ? l + 'm\xE1nu\xF0ir'
                : l + (_ ? 'm\xE1nu\xF0i' : 'm\xE1nu\xF0um')
              : s
                ? l + 'm\xE1nu\xF0ur'
                : l + (_ ? 'm\xE1nu\xF0' : 'm\xE1nu\xF0i')
          case 'y':
            return s || _ ? '\xE1r' : '\xE1ri'
          case 'yy':
            return Je(e)
              ? l + (s || _ ? '\xE1r' : '\xE1rum')
              : l + (s || _ ? '\xE1r' : '\xE1ri')
        }
      }
      u.defineLocale('is', {
        months:
          'jan\xFAar_febr\xFAar_mars_apr\xEDl_ma\xED_j\xFAn\xED_j\xFAl\xED_\xE1g\xFAst_september_okt\xF3ber_n\xF3vember_desember'.split(
            '_',
          ),
        monthsShort:
          'jan_feb_mar_apr_ma\xED_j\xFAn_j\xFAl_\xE1g\xFA_sep_okt_n\xF3v_des'.split(
            '_',
          ),
        weekdays:
          'sunnudagur_m\xE1nudagur_\xFEri\xF0judagur_mi\xF0vikudagur_fimmtudagur_f\xF6studagur_laugardagur'.split(
            '_',
          ),
        weekdaysShort: 'sun_m\xE1n_\xFEri_mi\xF0_fim_f\xF6s_lau'.split('_'),
        weekdaysMin: 'Su_M\xE1_\xDEr_Mi_Fi_F\xF6_La'.split('_'),
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY [kl.] H:mm',
          LLLL: 'dddd, D. MMMM YYYY [kl.] H:mm',
        },
        calendar: {
          sameDay: '[\xED dag kl.] LT',
          nextDay: '[\xE1 morgun kl.] LT',
          nextWeek: 'dddd [kl.] LT',
          lastDay: '[\xED g\xE6r kl.] LT',
          lastWeek: '[s\xED\xF0asta] dddd [kl.] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'eftir %s',
          past: 'fyrir %s s\xED\xF0an',
          s: de,
          ss: de,
          m: de,
          mm: de,
          h: 'klukkustund',
          hh: de,
          d: de,
          dd: de,
          M: de,
          MM: de,
          y: de,
          yy: de,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('it-ch', {
        months:
          'gennaio_febbraio_marzo_aprile_maggio_giugno_luglio_agosto_settembre_ottobre_novembre_dicembre'.split(
            '_',
          ),
        monthsShort: 'gen_feb_mar_apr_mag_giu_lug_ago_set_ott_nov_dic'.split(
          '_',
        ),
        weekdays:
          'domenica_luned\xEC_marted\xEC_mercoled\xEC_gioved\xEC_venerd\xEC_sabato'.split(
            '_',
          ),
        weekdaysShort: 'dom_lun_mar_mer_gio_ven_sab'.split('_'),
        weekdaysMin: 'do_lu_ma_me_gi_ve_sa'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Oggi alle] LT',
          nextDay: '[Domani alle] LT',
          nextWeek: 'dddd [alle] LT',
          lastDay: '[Ieri alle] LT',
          lastWeek: function () {
            switch (this.day()) {
              case 0:
                return '[la scorsa] dddd [alle] LT'
              default:
                return '[lo scorso] dddd [alle] LT'
            }
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: function (e) {
            return (/^[0-9].+$/.test(e) ? 'tra' : 'in') + ' ' + e
          },
          past: '%s fa',
          s: 'alcuni secondi',
          ss: '%d secondi',
          m: 'un minuto',
          mm: '%d minuti',
          h: "un'ora",
          hh: '%d ore',
          d: 'un giorno',
          dd: '%d giorni',
          M: 'un mese',
          MM: '%d mesi',
          y: 'un anno',
          yy: '%d anni',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%d\xBA',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('it', {
        months:
          'gennaio_febbraio_marzo_aprile_maggio_giugno_luglio_agosto_settembre_ottobre_novembre_dicembre'.split(
            '_',
          ),
        monthsShort: 'gen_feb_mar_apr_mag_giu_lug_ago_set_ott_nov_dic'.split(
          '_',
        ),
        weekdays:
          'domenica_luned\xEC_marted\xEC_mercoled\xEC_gioved\xEC_venerd\xEC_sabato'.split(
            '_',
          ),
        weekdaysShort: 'dom_lun_mar_mer_gio_ven_sab'.split('_'),
        weekdaysMin: 'do_lu_ma_me_gi_ve_sa'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: function () {
            return (
              '[Oggi a' +
              (this.hours() > 1 ? 'lle ' : this.hours() === 0 ? ' ' : "ll'") +
              ']LT'
            )
          },
          nextDay: function () {
            return (
              '[Domani a' +
              (this.hours() > 1 ? 'lle ' : this.hours() === 0 ? ' ' : "ll'") +
              ']LT'
            )
          },
          nextWeek: function () {
            return (
              'dddd [a' +
              (this.hours() > 1 ? 'lle ' : this.hours() === 0 ? ' ' : "ll'") +
              ']LT'
            )
          },
          lastDay: function () {
            return (
              '[Ieri a' +
              (this.hours() > 1 ? 'lle ' : this.hours() === 0 ? ' ' : "ll'") +
              ']LT'
            )
          },
          lastWeek: function () {
            switch (this.day()) {
              case 0:
                return (
                  '[La scorsa] dddd [a' +
                  (this.hours() > 1
                    ? 'lle '
                    : this.hours() === 0
                      ? ' '
                      : "ll'") +
                  ']LT'
                )
              default:
                return (
                  '[Lo scorso] dddd [a' +
                  (this.hours() > 1
                    ? 'lle '
                    : this.hours() === 0
                      ? ' '
                      : "ll'") +
                  ']LT'
                )
            }
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'tra %s',
          past: '%s fa',
          s: 'alcuni secondi',
          ss: '%d secondi',
          m: 'un minuto',
          mm: '%d minuti',
          h: "un'ora",
          hh: '%d ore',
          d: 'un giorno',
          dd: '%d giorni',
          w: 'una settimana',
          ww: '%d settimane',
          M: 'un mese',
          MM: '%d mesi',
          y: 'un anno',
          yy: '%d anni',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%d\xBA',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('ja', {
        eras: [
          {
            since: '2019-05-01',
            offset: 1,
            name: '\u4EE4\u548C',
            narrow: '\u32FF',
            abbr: 'R',
          },
          {
            since: '1989-01-08',
            until: '2019-04-30',
            offset: 1,
            name: '\u5E73\u6210',
            narrow: '\u337B',
            abbr: 'H',
          },
          {
            since: '1926-12-25',
            until: '1989-01-07',
            offset: 1,
            name: '\u662D\u548C',
            narrow: '\u337C',
            abbr: 'S',
          },
          {
            since: '1912-07-30',
            until: '1926-12-24',
            offset: 1,
            name: '\u5927\u6B63',
            narrow: '\u337D',
            abbr: 'T',
          },
          {
            since: '1873-01-01',
            until: '1912-07-29',
            offset: 6,
            name: '\u660E\u6CBB',
            narrow: '\u337E',
            abbr: 'M',
          },
          {
            since: '0001-01-01',
            until: '1873-12-31',
            offset: 1,
            name: '\u897F\u66A6',
            narrow: 'AD',
            abbr: 'AD',
          },
          {
            since: '0000-12-31',
            until: -1 / 0,
            offset: 1,
            name: '\u7D00\u5143\u524D',
            narrow: 'BC',
            abbr: 'BC',
          },
        ],
        eraYearOrdinalRegex: /(元|\d+)年/,
        eraYearOrdinalParse: function (e, s) {
          return s[1] === '\u5143' ? 1 : parseInt(s[1] || e, 10)
        },
        months:
          '1\u6708_2\u6708_3\u6708_4\u6708_5\u6708_6\u6708_7\u6708_8\u6708_9\u6708_10\u6708_11\u6708_12\u6708'.split(
            '_',
          ),
        monthsShort:
          '1\u6708_2\u6708_3\u6708_4\u6708_5\u6708_6\u6708_7\u6708_8\u6708_9\u6708_10\u6708_11\u6708_12\u6708'.split(
            '_',
          ),
        weekdays:
          '\u65E5\u66DC\u65E5_\u6708\u66DC\u65E5_\u706B\u66DC\u65E5_\u6C34\u66DC\u65E5_\u6728\u66DC\u65E5_\u91D1\u66DC\u65E5_\u571F\u66DC\u65E5'.split(
            '_',
          ),
        weekdaysShort: '\u65E5_\u6708_\u706B_\u6C34_\u6728_\u91D1_\u571F'.split(
          '_',
        ),
        weekdaysMin: '\u65E5_\u6708_\u706B_\u6C34_\u6728_\u91D1_\u571F'.split(
          '_',
        ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'YYYY/MM/DD',
          LL: 'YYYY\u5E74M\u6708D\u65E5',
          LLL: 'YYYY\u5E74M\u6708D\u65E5 HH:mm',
          LLLL: 'YYYY\u5E74M\u6708D\u65E5 dddd HH:mm',
          l: 'YYYY/MM/DD',
          ll: 'YYYY\u5E74M\u6708D\u65E5',
          lll: 'YYYY\u5E74M\u6708D\u65E5 HH:mm',
          llll: 'YYYY\u5E74M\u6708D\u65E5(ddd) HH:mm',
        },
        meridiemParse: /午前|午後/i,
        isPM: function (e) {
          return e === '\u5348\u5F8C'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? '\u5348\u524D' : '\u5348\u5F8C'
        },
        calendar: {
          sameDay: '[\u4ECA\u65E5] LT',
          nextDay: '[\u660E\u65E5] LT',
          nextWeek: function (e) {
            return e.week() !== this.week()
              ? '[\u6765\u9031]dddd LT'
              : 'dddd LT'
          },
          lastDay: '[\u6628\u65E5] LT',
          lastWeek: function (e) {
            return this.week() !== e.week()
              ? '[\u5148\u9031]dddd LT'
              : 'dddd LT'
          },
          sameElse: 'L',
        },
        dayOfMonthOrdinalParse: /\d{1,2}日/,
        ordinal: function (e, s) {
          switch (s) {
            case 'y':
              return e === 1 ? '\u5143\u5E74' : e + '\u5E74'
            case 'd':
            case 'D':
            case 'DDD':
              return e + '\u65E5'
            default:
              return e
          }
        },
        relativeTime: {
          future: '%s\u5F8C',
          past: '%s\u524D',
          s: '\u6570\u79D2',
          ss: '%d\u79D2',
          m: '1\u5206',
          mm: '%d\u5206',
          h: '1\u6642\u9593',
          hh: '%d\u6642\u9593',
          d: '1\u65E5',
          dd: '%d\u65E5',
          M: '1\u30F6\u6708',
          MM: '%d\u30F6\u6708',
          y: '1\u5E74',
          yy: '%d\u5E74',
        },
      })
      u.defineLocale('jv', {
        months:
          'Januari_Februari_Maret_April_Mei_Juni_Juli_Agustus_September_Oktober_Nopember_Desember'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mar_Apr_Mei_Jun_Jul_Ags_Sep_Okt_Nop_Des'.split(
          '_',
        ),
        weekdays: 'Minggu_Senen_Seloso_Rebu_Kemis_Jemuwah_Septu'.split('_'),
        weekdaysShort: 'Min_Sen_Sel_Reb_Kem_Jem_Sep'.split('_'),
        weekdaysMin: 'Mg_Sn_Sl_Rb_Km_Jm_Sp'.split('_'),
        longDateFormat: {
          LT: 'HH.mm',
          LTS: 'HH.mm.ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY [pukul] HH.mm',
          LLLL: 'dddd, D MMMM YYYY [pukul] HH.mm',
        },
        meridiemParse: /enjing|siyang|sonten|ndalu/,
        meridiemHour: function (e, s) {
          if ((e === 12 && (e = 0), s === 'enjing')) return e
          if (s === 'siyang') return e >= 11 ? e : e + 12
          if (s === 'sonten' || s === 'ndalu') return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 11
            ? 'enjing'
            : e < 15
              ? 'siyang'
              : e < 19
                ? 'sonten'
                : 'ndalu'
        },
        calendar: {
          sameDay: '[Dinten puniko pukul] LT',
          nextDay: '[Mbenjang pukul] LT',
          nextWeek: 'dddd [pukul] LT',
          lastDay: '[Kala wingi pukul] LT',
          lastWeek: 'dddd [kepengker pukul] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'wonten ing %s',
          past: '%s ingkang kepengker',
          s: 'sawetawis detik',
          ss: '%d detik',
          m: 'setunggal menit',
          mm: '%d menit',
          h: 'setunggal jam',
          hh: '%d jam',
          d: 'sedinten',
          dd: '%d dinten',
          M: 'sewulan',
          MM: '%d wulan',
          y: 'setaun',
          yy: '%d taun',
        },
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('ka', {
        months:
          '\u10D8\u10D0\u10DC\u10D5\u10D0\u10E0\u10D8_\u10D7\u10D4\u10D1\u10D4\u10E0\u10D5\u10D0\u10DA\u10D8_\u10DB\u10D0\u10E0\u10E2\u10D8_\u10D0\u10DE\u10E0\u10D8\u10DA\u10D8_\u10DB\u10D0\u10D8\u10E1\u10D8_\u10D8\u10D5\u10DC\u10D8\u10E1\u10D8_\u10D8\u10D5\u10DA\u10D8\u10E1\u10D8_\u10D0\u10D2\u10D5\u10D8\u10E1\u10E2\u10DD_\u10E1\u10D4\u10E5\u10E2\u10D4\u10DB\u10D1\u10D4\u10E0\u10D8_\u10DD\u10E5\u10E2\u10DD\u10DB\u10D1\u10D4\u10E0\u10D8_\u10DC\u10DD\u10D4\u10DB\u10D1\u10D4\u10E0\u10D8_\u10D3\u10D4\u10D9\u10D4\u10DB\u10D1\u10D4\u10E0\u10D8'.split(
            '_',
          ),
        monthsShort:
          '\u10D8\u10D0\u10DC_\u10D7\u10D4\u10D1_\u10DB\u10D0\u10E0_\u10D0\u10DE\u10E0_\u10DB\u10D0\u10D8_\u10D8\u10D5\u10DC_\u10D8\u10D5\u10DA_\u10D0\u10D2\u10D5_\u10E1\u10D4\u10E5_\u10DD\u10E5\u10E2_\u10DC\u10DD\u10D4_\u10D3\u10D4\u10D9'.split(
            '_',
          ),
        weekdays: {
          standalone:
            '\u10D9\u10D5\u10D8\u10E0\u10D0_\u10DD\u10E0\u10E8\u10D0\u10D1\u10D0\u10D7\u10D8_\u10E1\u10D0\u10DB\u10E8\u10D0\u10D1\u10D0\u10D7\u10D8_\u10DD\u10D7\u10EE\u10E8\u10D0\u10D1\u10D0\u10D7\u10D8_\u10EE\u10E3\u10D7\u10E8\u10D0\u10D1\u10D0\u10D7\u10D8_\u10DE\u10D0\u10E0\u10D0\u10E1\u10D9\u10D4\u10D5\u10D8_\u10E8\u10D0\u10D1\u10D0\u10D7\u10D8'.split(
              '_',
            ),
          format:
            '\u10D9\u10D5\u10D8\u10E0\u10D0\u10E1_\u10DD\u10E0\u10E8\u10D0\u10D1\u10D0\u10D7\u10E1_\u10E1\u10D0\u10DB\u10E8\u10D0\u10D1\u10D0\u10D7\u10E1_\u10DD\u10D7\u10EE\u10E8\u10D0\u10D1\u10D0\u10D7\u10E1_\u10EE\u10E3\u10D7\u10E8\u10D0\u10D1\u10D0\u10D7\u10E1_\u10DE\u10D0\u10E0\u10D0\u10E1\u10D9\u10D4\u10D5\u10E1_\u10E8\u10D0\u10D1\u10D0\u10D7\u10E1'.split(
              '_',
            ),
          isFormat: /(წინა|შემდეგ)/,
        },
        weekdaysShort:
          '\u10D9\u10D5\u10D8_\u10DD\u10E0\u10E8_\u10E1\u10D0\u10DB_\u10DD\u10D7\u10EE_\u10EE\u10E3\u10D7_\u10DE\u10D0\u10E0_\u10E8\u10D0\u10D1'.split(
            '_',
          ),
        weekdaysMin:
          '\u10D9\u10D5_\u10DD\u10E0_\u10E1\u10D0_\u10DD\u10D7_\u10EE\u10E3_\u10DE\u10D0_\u10E8\u10D0'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[\u10D3\u10E6\u10D4\u10E1] LT[-\u10D6\u10D4]',
          nextDay: '[\u10EE\u10D5\u10D0\u10DA] LT[-\u10D6\u10D4]',
          lastDay: '[\u10D2\u10E3\u10E8\u10D8\u10DC] LT[-\u10D6\u10D4]',
          nextWeek:
            '[\u10E8\u10D4\u10DB\u10D3\u10D4\u10D2] dddd LT[-\u10D6\u10D4]',
          lastWeek: '[\u10EC\u10D8\u10DC\u10D0] dddd LT-\u10D6\u10D4',
          sameElse: 'L',
        },
        relativeTime: {
          future: function (e) {
            return e.replace(
              /(წამ|წუთ|საათ|წელ|დღ|თვ)(ი|ე)/,
              function (s, i, _) {
                return _ === '\u10D8'
                  ? i + '\u10E8\u10D8'
                  : i + _ + '\u10E8\u10D8'
              },
            )
          },
          past: function (e) {
            return /(წამი|წუთი|საათი|დღე|თვე)/.test(e)
              ? e.replace(/(ი|ე)$/, '\u10D8\u10E1 \u10EC\u10D8\u10DC')
              : /წელი/.test(e)
                ? e.replace(
                    /წელი$/,
                    '\u10EC\u10DA\u10D8\u10E1 \u10EC\u10D8\u10DC',
                  )
                : e
          },
          s: '\u10E0\u10D0\u10DB\u10D3\u10D4\u10DC\u10D8\u10DB\u10D4 \u10EC\u10D0\u10DB\u10D8',
          ss: '%d \u10EC\u10D0\u10DB\u10D8',
          m: '\u10EC\u10E3\u10D7\u10D8',
          mm: '%d \u10EC\u10E3\u10D7\u10D8',
          h: '\u10E1\u10D0\u10D0\u10D7\u10D8',
          hh: '%d \u10E1\u10D0\u10D0\u10D7\u10D8',
          d: '\u10D3\u10E6\u10D4',
          dd: '%d \u10D3\u10E6\u10D4',
          M: '\u10D7\u10D5\u10D4',
          MM: '%d \u10D7\u10D5\u10D4',
          y: '\u10EC\u10D4\u10DA\u10D8',
          yy: '%d \u10EC\u10D4\u10DA\u10D8',
        },
        dayOfMonthOrdinalParse: /0|1-ლი|მე-\d{1,2}|\d{1,2}-ე/,
        ordinal: function (e) {
          return e === 0
            ? e
            : e === 1
              ? e + '-\u10DA\u10D8'
              : e < 20 || (e <= 100 && e % 20 === 0) || e % 100 === 0
                ? '\u10DB\u10D4-' + e
                : e + '-\u10D4'
        },
        week: {dow: 1, doy: 7},
      })
      var b = {
        0: '-\u0448\u0456',
        1: '-\u0448\u0456',
        2: '-\u0448\u0456',
        3: '-\u0448\u0456',
        4: '-\u0448\u0456',
        5: '-\u0448\u0456',
        6: '-\u0448\u044B',
        7: '-\u0448\u0456',
        8: '-\u0448\u0456',
        9: '-\u0448\u044B',
        10: '-\u0448\u044B',
        20: '-\u0448\u044B',
        30: '-\u0448\u044B',
        40: '-\u0448\u044B',
        50: '-\u0448\u0456',
        60: '-\u0448\u044B',
        70: '-\u0448\u0456',
        80: '-\u0448\u0456',
        90: '-\u0448\u044B',
        100: '-\u0448\u0456',
      }
      u.defineLocale('kk', {
        months:
          '\u049B\u0430\u04A3\u0442\u0430\u0440_\u0430\u049B\u043F\u0430\u043D_\u043D\u0430\u0443\u0440\u044B\u0437_\u0441\u04D9\u0443\u0456\u0440_\u043C\u0430\u043C\u044B\u0440_\u043C\u0430\u0443\u0441\u044B\u043C_\u0448\u0456\u043B\u0434\u0435_\u0442\u0430\u043C\u044B\u0437_\u049B\u044B\u0440\u043A\u04AF\u0439\u0435\u043A_\u049B\u0430\u0437\u0430\u043D_\u049B\u0430\u0440\u0430\u0448\u0430_\u0436\u0435\u043B\u0442\u043E\u049B\u0441\u0430\u043D'.split(
            '_',
          ),
        monthsShort:
          '\u049B\u0430\u04A3_\u0430\u049B\u043F_\u043D\u0430\u0443_\u0441\u04D9\u0443_\u043C\u0430\u043C_\u043C\u0430\u0443_\u0448\u0456\u043B_\u0442\u0430\u043C_\u049B\u044B\u0440_\u049B\u0430\u0437_\u049B\u0430\u0440_\u0436\u0435\u043B'.split(
            '_',
          ),
        weekdays:
          '\u0436\u0435\u043A\u0441\u0435\u043D\u0431\u0456_\u0434\u04AF\u0439\u0441\u0435\u043D\u0431\u0456_\u0441\u0435\u0439\u0441\u0435\u043D\u0431\u0456_\u0441\u04D9\u0440\u0441\u0435\u043D\u0431\u0456_\u0431\u0435\u0439\u0441\u0435\u043D\u0431\u0456_\u0436\u04B1\u043C\u0430_\u0441\u0435\u043D\u0431\u0456'.split(
            '_',
          ),
        weekdaysShort:
          '\u0436\u0435\u043A_\u0434\u04AF\u0439_\u0441\u0435\u0439_\u0441\u04D9\u0440_\u0431\u0435\u0439_\u0436\u04B1\u043C_\u0441\u0435\u043D'.split(
            '_',
          ),
        weekdaysMin:
          '\u0436\u043A_\u0434\u0439_\u0441\u0439_\u0441\u0440_\u0431\u0439_\u0436\u043C_\u0441\u043D'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay:
            '[\u0411\u04AF\u0433\u0456\u043D \u0441\u0430\u0493\u0430\u0442] LT',
          nextDay:
            '[\u0415\u0440\u0442\u0435\u04A3 \u0441\u0430\u0493\u0430\u0442] LT',
          nextWeek: 'dddd [\u0441\u0430\u0493\u0430\u0442] LT',
          lastDay:
            '[\u041A\u0435\u0448\u0435 \u0441\u0430\u0493\u0430\u0442] LT',
          lastWeek:
            '[\u04E8\u0442\u043A\u0435\u043D \u0430\u043F\u0442\u0430\u043D\u044B\u04A3] dddd [\u0441\u0430\u0493\u0430\u0442] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u0456\u0448\u0456\u043D\u0434\u0435',
          past: '%s \u0431\u04B1\u0440\u044B\u043D',
          s: '\u0431\u0456\u0440\u043D\u0435\u0448\u0435 \u0441\u0435\u043A\u0443\u043D\u0434',
          ss: '%d \u0441\u0435\u043A\u0443\u043D\u0434',
          m: '\u0431\u0456\u0440 \u043C\u0438\u043D\u0443\u0442',
          mm: '%d \u043C\u0438\u043D\u0443\u0442',
          h: '\u0431\u0456\u0440 \u0441\u0430\u0493\u0430\u0442',
          hh: '%d \u0441\u0430\u0493\u0430\u0442',
          d: '\u0431\u0456\u0440 \u043A\u04AF\u043D',
          dd: '%d \u043A\u04AF\u043D',
          M: '\u0431\u0456\u0440 \u0430\u0439',
          MM: '%d \u0430\u0439',
          y: '\u0431\u0456\u0440 \u0436\u044B\u043B',
          yy: '%d \u0436\u044B\u043B',
        },
        dayOfMonthOrdinalParse: /\d{1,2}-(ші|шы)/,
        ordinal: function (e) {
          var s = e % 10,
            i = e >= 100 ? 100 : null
          return e + (b[e] || b[s] || b[i])
        },
        week: {dow: 1, doy: 7},
      })
      var Ga = {
          1: '\u17E1',
          2: '\u17E2',
          3: '\u17E3',
          4: '\u17E4',
          5: '\u17E5',
          6: '\u17E6',
          7: '\u17E7',
          8: '\u17E8',
          9: '\u17E9',
          0: '\u17E0',
        },
        Zt = {
          '\u17E1': '1',
          '\u17E2': '2',
          '\u17E3': '3',
          '\u17E4': '4',
          '\u17E5': '5',
          '\u17E6': '6',
          '\u17E7': '7',
          '\u17E8': '8',
          '\u17E9': '9',
          '\u17E0': '0',
        }
      u.defineLocale('km', {
        months:
          '\u1798\u1780\u179A\u17B6_\u1780\u17BB\u1798\u17D2\u1797\u17C8_\u1798\u17B8\u1793\u17B6_\u1798\u17C1\u179F\u17B6_\u17A7\u179F\u1797\u17B6_\u1798\u17B7\u1790\u17BB\u1793\u17B6_\u1780\u1780\u17D2\u1780\u178A\u17B6_\u179F\u17B8\u17A0\u17B6_\u1780\u1789\u17D2\u1789\u17B6_\u178F\u17BB\u179B\u17B6_\u179C\u17B7\u1785\u17D2\u1786\u17B7\u1780\u17B6_\u1792\u17D2\u1793\u17BC'.split(
            '_',
          ),
        monthsShort:
          '\u1798\u1780\u179A\u17B6_\u1780\u17BB\u1798\u17D2\u1797\u17C8_\u1798\u17B8\u1793\u17B6_\u1798\u17C1\u179F\u17B6_\u17A7\u179F\u1797\u17B6_\u1798\u17B7\u1790\u17BB\u1793\u17B6_\u1780\u1780\u17D2\u1780\u178A\u17B6_\u179F\u17B8\u17A0\u17B6_\u1780\u1789\u17D2\u1789\u17B6_\u178F\u17BB\u179B\u17B6_\u179C\u17B7\u1785\u17D2\u1786\u17B7\u1780\u17B6_\u1792\u17D2\u1793\u17BC'.split(
            '_',
          ),
        weekdays:
          '\u17A2\u17B6\u1791\u17B7\u178F\u17D2\u1799_\u1785\u17D0\u1793\u17D2\u1791_\u17A2\u1784\u17D2\u1782\u17B6\u179A_\u1796\u17BB\u1792_\u1796\u17D2\u179A\u17A0\u179F\u17D2\u1794\u178F\u17B7\u17CD_\u179F\u17BB\u1780\u17D2\u179A_\u179F\u17C5\u179A\u17CD'.split(
            '_',
          ),
        weekdaysShort:
          '\u17A2\u17B6_\u1785_\u17A2_\u1796_\u1796\u17D2\u179A_\u179F\u17BB_\u179F'.split(
            '_',
          ),
        weekdaysMin:
          '\u17A2\u17B6_\u1785_\u17A2_\u1796_\u1796\u17D2\u179A_\u179F\u17BB_\u179F'.split(
            '_',
          ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        meridiemParse: /ព្រឹក|ល្ងាច/,
        isPM: function (e) {
          return e === '\u179B\u17D2\u1784\u17B6\u1785'
        },
        meridiem: function (e, s, i) {
          return e < 12
            ? '\u1796\u17D2\u179A\u17B9\u1780'
            : '\u179B\u17D2\u1784\u17B6\u1785'
        },
        calendar: {
          sameDay:
            '[\u1790\u17D2\u1784\u17C3\u1793\u17C1\u17C7 \u1798\u17C9\u17C4\u1784] LT',
          nextDay:
            '[\u179F\u17D2\u17A2\u17C2\u1780 \u1798\u17C9\u17C4\u1784] LT',
          nextWeek: 'dddd [\u1798\u17C9\u17C4\u1784] LT',
          lastDay:
            '[\u1798\u17D2\u179F\u17B7\u179B\u1798\u17B7\u1789 \u1798\u17C9\u17C4\u1784] LT',
          lastWeek:
            'dddd [\u179F\u1794\u17D2\u178F\u17B6\u17A0\u17CD\u1798\u17BB\u1793] [\u1798\u17C9\u17C4\u1784] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s\u1791\u17C0\u178F',
          past: '%s\u1798\u17BB\u1793',
          s: '\u1794\u17C9\u17BB\u1793\u17D2\u1798\u17B6\u1793\u179C\u17B7\u1793\u17B6\u1791\u17B8',
          ss: '%d \u179C\u17B7\u1793\u17B6\u1791\u17B8',
          m: '\u1798\u17BD\u1799\u1793\u17B6\u1791\u17B8',
          mm: '%d \u1793\u17B6\u1791\u17B8',
          h: '\u1798\u17BD\u1799\u1798\u17C9\u17C4\u1784',
          hh: '%d \u1798\u17C9\u17C4\u1784',
          d: '\u1798\u17BD\u1799\u1790\u17D2\u1784\u17C3',
          dd: '%d \u1790\u17D2\u1784\u17C3',
          M: '\u1798\u17BD\u1799\u1781\u17C2',
          MM: '%d \u1781\u17C2',
          y: '\u1798\u17BD\u1799\u1786\u17D2\u1793\u17B6\u17C6',
          yy: '%d \u1786\u17D2\u1793\u17B6\u17C6',
        },
        dayOfMonthOrdinalParse: /ទី\d{1,2}/,
        ordinal: '\u1791\u17B8%d',
        preparse: function (e) {
          return e.replace(/[១២៣៤៥៦៧៨៩០]/g, function (s) {
            return Zt[s]
          })
        },
        postformat: function (e) {
          return e.replace(/\d/g, function (s) {
            return Ga[s]
          })
        },
        week: {dow: 1, doy: 4},
      })
      var Lt = {
          1: '\u0CE7',
          2: '\u0CE8',
          3: '\u0CE9',
          4: '\u0CEA',
          5: '\u0CEB',
          6: '\u0CEC',
          7: '\u0CED',
          8: '\u0CEE',
          9: '\u0CEF',
          0: '\u0CE6',
        },
        Yt = {
          '\u0CE7': '1',
          '\u0CE8': '2',
          '\u0CE9': '3',
          '\u0CEA': '4',
          '\u0CEB': '5',
          '\u0CEC': '6',
          '\u0CED': '7',
          '\u0CEE': '8',
          '\u0CEF': '9',
          '\u0CE6': '0',
        }
      u.defineLocale('kn', {
        months:
          '\u0C9C\u0CA8\u0CB5\u0CB0\u0CBF_\u0CAB\u0CC6\u0CAC\u0CCD\u0CB0\u0CB5\u0CB0\u0CBF_\u0CAE\u0CBE\u0CB0\u0CCD\u0C9A\u0CCD_\u0C8F\u0CAA\u0CCD\u0CB0\u0CBF\u0CB2\u0CCD_\u0CAE\u0CC6\u0CD5_\u0C9C\u0CC2\u0CA8\u0CCD_\u0C9C\u0CC1\u0CB2\u0CC6\u0CD6_\u0C86\u0C97\u0CB8\u0CCD\u0C9F\u0CCD_\u0CB8\u0CC6\u0CAA\u0CCD\u0C9F\u0CC6\u0C82\u0CAC\u0CB0\u0CCD_\u0C85\u0C95\u0CCD\u0C9F\u0CC6\u0CC2\u0CD5\u0CAC\u0CB0\u0CCD_\u0CA8\u0CB5\u0CC6\u0C82\u0CAC\u0CB0\u0CCD_\u0CA1\u0CBF\u0CB8\u0CC6\u0C82\u0CAC\u0CB0\u0CCD'.split(
            '_',
          ),
        monthsShort:
          '\u0C9C\u0CA8_\u0CAB\u0CC6\u0CAC\u0CCD\u0CB0_\u0CAE\u0CBE\u0CB0\u0CCD\u0C9A\u0CCD_\u0C8F\u0CAA\u0CCD\u0CB0\u0CBF\u0CB2\u0CCD_\u0CAE\u0CC6\u0CD5_\u0C9C\u0CC2\u0CA8\u0CCD_\u0C9C\u0CC1\u0CB2\u0CC6\u0CD6_\u0C86\u0C97\u0CB8\u0CCD\u0C9F\u0CCD_\u0CB8\u0CC6\u0CAA\u0CCD\u0C9F\u0CC6\u0C82_\u0C85\u0C95\u0CCD\u0C9F\u0CC6\u0CC2\u0CD5_\u0CA8\u0CB5\u0CC6\u0C82_\u0CA1\u0CBF\u0CB8\u0CC6\u0C82'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          '\u0CAD\u0CBE\u0CA8\u0CC1\u0CB5\u0CBE\u0CB0_\u0CB8\u0CC6\u0CC2\u0CD5\u0CAE\u0CB5\u0CBE\u0CB0_\u0CAE\u0C82\u0C97\u0CB3\u0CB5\u0CBE\u0CB0_\u0CAC\u0CC1\u0CA7\u0CB5\u0CBE\u0CB0_\u0C97\u0CC1\u0CB0\u0CC1\u0CB5\u0CBE\u0CB0_\u0CB6\u0CC1\u0C95\u0CCD\u0CB0\u0CB5\u0CBE\u0CB0_\u0CB6\u0CA8\u0CBF\u0CB5\u0CBE\u0CB0'.split(
            '_',
          ),
        weekdaysShort:
          '\u0CAD\u0CBE\u0CA8\u0CC1_\u0CB8\u0CC6\u0CC2\u0CD5\u0CAE_\u0CAE\u0C82\u0C97\u0CB3_\u0CAC\u0CC1\u0CA7_\u0C97\u0CC1\u0CB0\u0CC1_\u0CB6\u0CC1\u0C95\u0CCD\u0CB0_\u0CB6\u0CA8\u0CBF'.split(
            '_',
          ),
        weekdaysMin:
          '\u0CAD\u0CBE_\u0CB8\u0CC6\u0CC2\u0CD5_\u0CAE\u0C82_\u0CAC\u0CC1_\u0C97\u0CC1_\u0CB6\u0CC1_\u0CB6'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'A h:mm',
          LTS: 'A h:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY, A h:mm',
          LLLL: 'dddd, D MMMM YYYY, A h:mm',
        },
        calendar: {
          sameDay: '[\u0C87\u0C82\u0CA6\u0CC1] LT',
          nextDay: '[\u0CA8\u0CBE\u0CB3\u0CC6] LT',
          nextWeek: 'dddd, LT',
          lastDay: '[\u0CA8\u0CBF\u0CA8\u0CCD\u0CA8\u0CC6] LT',
          lastWeek: '[\u0C95\u0CC6\u0CC2\u0CA8\u0CC6\u0CAF] dddd, LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u0CA8\u0C82\u0CA4\u0CB0',
          past: '%s \u0CB9\u0CBF\u0C82\u0CA6\u0CC6',
          s: '\u0C95\u0CC6\u0CB2\u0CB5\u0CC1 \u0C95\u0CCD\u0CB7\u0CA3\u0C97\u0CB3\u0CC1',
          ss: '%d \u0CB8\u0CC6\u0C95\u0CC6\u0C82\u0CA1\u0CC1\u0C97\u0CB3\u0CC1',
          m: '\u0C92\u0C82\u0CA6\u0CC1 \u0CA8\u0CBF\u0CAE\u0CBF\u0CB7',
          mm: '%d \u0CA8\u0CBF\u0CAE\u0CBF\u0CB7',
          h: '\u0C92\u0C82\u0CA6\u0CC1 \u0C97\u0C82\u0C9F\u0CC6',
          hh: '%d \u0C97\u0C82\u0C9F\u0CC6',
          d: '\u0C92\u0C82\u0CA6\u0CC1 \u0CA6\u0CBF\u0CA8',
          dd: '%d \u0CA6\u0CBF\u0CA8',
          M: '\u0C92\u0C82\u0CA6\u0CC1 \u0CA4\u0CBF\u0C82\u0C97\u0CB3\u0CC1',
          MM: '%d \u0CA4\u0CBF\u0C82\u0C97\u0CB3\u0CC1',
          y: '\u0C92\u0C82\u0CA6\u0CC1 \u0CB5\u0CB0\u0CCD\u0CB7',
          yy: '%d \u0CB5\u0CB0\u0CCD\u0CB7',
        },
        preparse: function (e) {
          return e.replace(/[೧೨೩೪೫೬೭೮೯೦]/g, function (s) {
            return Yt[s]
          })
        },
        postformat: function (e) {
          return e.replace(/\d/g, function (s) {
            return Lt[s]
          })
        },
        meridiemParse: /ರಾತ್ರಿ|ಬೆಳಿಗ್ಗೆ|ಮಧ್ಯಾಹ್ನ|ಸಂಜೆ/,
        meridiemHour: function (e, s) {
          if (
            (e === 12 && (e = 0), s === '\u0CB0\u0CBE\u0CA4\u0CCD\u0CB0\u0CBF')
          )
            return e < 4 ? e : e + 12
          if (s === '\u0CAC\u0CC6\u0CB3\u0CBF\u0C97\u0CCD\u0C97\u0CC6') return e
          if (s === '\u0CAE\u0CA7\u0CCD\u0CAF\u0CBE\u0CB9\u0CCD\u0CA8')
            return e >= 10 ? e : e + 12
          if (s === '\u0CB8\u0C82\u0C9C\u0CC6') return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u0CB0\u0CBE\u0CA4\u0CCD\u0CB0\u0CBF'
            : e < 10
              ? '\u0CAC\u0CC6\u0CB3\u0CBF\u0C97\u0CCD\u0C97\u0CC6'
              : e < 17
                ? '\u0CAE\u0CA7\u0CCD\u0CAF\u0CBE\u0CB9\u0CCD\u0CA8'
                : e < 20
                  ? '\u0CB8\u0C82\u0C9C\u0CC6'
                  : '\u0CB0\u0CBE\u0CA4\u0CCD\u0CB0\u0CBF'
        },
        dayOfMonthOrdinalParse: /\d{1,2}(ನೇ)/,
        ordinal: function (e) {
          return e + '\u0CA8\u0CC6\u0CD5'
        },
        week: {dow: 0, doy: 6},
      })
      u.defineLocale('ko', {
        months:
          '1\uC6D4_2\uC6D4_3\uC6D4_4\uC6D4_5\uC6D4_6\uC6D4_7\uC6D4_8\uC6D4_9\uC6D4_10\uC6D4_11\uC6D4_12\uC6D4'.split(
            '_',
          ),
        monthsShort:
          '1\uC6D4_2\uC6D4_3\uC6D4_4\uC6D4_5\uC6D4_6\uC6D4_7\uC6D4_8\uC6D4_9\uC6D4_10\uC6D4_11\uC6D4_12\uC6D4'.split(
            '_',
          ),
        weekdays:
          '\uC77C\uC694\uC77C_\uC6D4\uC694\uC77C_\uD654\uC694\uC77C_\uC218\uC694\uC77C_\uBAA9\uC694\uC77C_\uAE08\uC694\uC77C_\uD1A0\uC694\uC77C'.split(
            '_',
          ),
        weekdaysShort: '\uC77C_\uC6D4_\uD654_\uC218_\uBAA9_\uAE08_\uD1A0'.split(
          '_',
        ),
        weekdaysMin: '\uC77C_\uC6D4_\uD654_\uC218_\uBAA9_\uAE08_\uD1A0'.split(
          '_',
        ),
        longDateFormat: {
          LT: 'A h:mm',
          LTS: 'A h:mm:ss',
          L: 'YYYY.MM.DD.',
          LL: 'YYYY\uB144 MMMM D\uC77C',
          LLL: 'YYYY\uB144 MMMM D\uC77C A h:mm',
          LLLL: 'YYYY\uB144 MMMM D\uC77C dddd A h:mm',
          l: 'YYYY.MM.DD.',
          ll: 'YYYY\uB144 MMMM D\uC77C',
          lll: 'YYYY\uB144 MMMM D\uC77C A h:mm',
          llll: 'YYYY\uB144 MMMM D\uC77C dddd A h:mm',
        },
        calendar: {
          sameDay: '\uC624\uB298 LT',
          nextDay: '\uB0B4\uC77C LT',
          nextWeek: 'dddd LT',
          lastDay: '\uC5B4\uC81C LT',
          lastWeek: '\uC9C0\uB09C\uC8FC dddd LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \uD6C4',
          past: '%s \uC804',
          s: '\uBA87 \uCD08',
          ss: '%d\uCD08',
          m: '1\uBD84',
          mm: '%d\uBD84',
          h: '\uD55C \uC2DC\uAC04',
          hh: '%d\uC2DC\uAC04',
          d: '\uD558\uB8E8',
          dd: '%d\uC77C',
          M: '\uD55C \uB2EC',
          MM: '%d\uB2EC',
          y: '\uC77C \uB144',
          yy: '%d\uB144',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(일|월|주)/,
        ordinal: function (e, s) {
          switch (s) {
            case 'd':
            case 'D':
            case 'DDD':
              return e + '\uC77C'
            case 'M':
              return e + '\uC6D4'
            case 'w':
            case 'W':
              return e + '\uC8FC'
            default:
              return e
          }
        },
        meridiemParse: /오전|오후/,
        isPM: function (e) {
          return e === '\uC624\uD6C4'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? '\uC624\uC804' : '\uC624\uD6C4'
        },
      })
      function $(e, s, i, _) {
        var l = {
          s: ['\xE7end san\xEEye', '\xE7end san\xEEyeyan'],
          ss: [e + ' san\xEEye', e + ' san\xEEyeyan'],
          m: ['deq\xEEqeyek', 'deq\xEEqeyek\xEA'],
          mm: [e + ' deq\xEEqe', e + ' deq\xEEqeyan'],
          h: ['saetek', 'saetek\xEA'],
          hh: [e + ' saet', e + ' saetan'],
          d: ['rojek', 'rojek\xEA'],
          dd: [e + ' roj', e + ' rojan'],
          w: ['hefteyek', 'hefteyek\xEA'],
          ww: [e + ' hefte', e + ' hefteyan'],
          M: ['mehek', 'mehek\xEA'],
          MM: [e + ' meh', e + ' mehan'],
          y: ['salek', 'salek\xEA'],
          yy: [e + ' sal', e + ' salan'],
        }
        return s ? l[i][0] : l[i][1]
      }
      function Kt(e) {
        e = '' + e
        var s = e.substring(e.length - 1),
          i = e.length > 1 ? e.substring(e.length - 2) : ''
        return !(i == 12 || i == 13) &&
          (s == '2' || s == '3' || i == '50' || s == '70' || s == '80')
          ? 'y\xEA'
          : '\xEA'
      }
      u.defineLocale('ku-kmr', {
        months:
          'R\xEAbendan_Sibat_Adar_N\xEEsan_Gulan_Hez\xEEran_T\xEErmeh_Tebax_\xCElon_Cotmeh_Mijdar_Berfanbar'.split(
            '_',
          ),
        monthsShort:
          'R\xEAb_Sib_Ada_N\xEEs_Gul_Hez_T\xEEr_Teb_\xCElo_Cot_Mij_Ber'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'Yek\u015Fem_Du\u015Fem_S\xEA\u015Fem_\xC7ar\u015Fem_P\xEAnc\u015Fem_\xCEn_\u015Eem\xEE'.split(
            '_',
          ),
        weekdaysShort: 'Yek_Du_S\xEA_\xC7ar_P\xEAn_\xCEn_\u015Eem'.split('_'),
        weekdaysMin: 'Ye_Du_S\xEA_\xC7a_P\xEA_\xCEn_\u015Ee'.split('_'),
        meridiem: function (e, s, i) {
          return e < 12 ? (i ? 'bn' : 'BN') : i ? 'pn' : 'PN'
        },
        meridiemParse: /bn|BN|pn|PN/,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'Do MMMM[a] YYYY[an]',
          LLL: 'Do MMMM[a] YYYY[an] HH:mm',
          LLLL: 'dddd, Do MMMM[a] YYYY[an] HH:mm',
          ll: 'Do MMM[.] YYYY[an]',
          lll: 'Do MMM[.] YYYY[an] HH:mm',
          llll: 'ddd[.], Do MMM[.] YYYY[an] HH:mm',
        },
        calendar: {
          sameDay: '[\xCEro di saet] LT [de]',
          nextDay: '[Sib\xEA di saet] LT [de]',
          nextWeek: 'dddd [di saet] LT [de]',
          lastDay: '[Duh di saet] LT [de]',
          lastWeek: 'dddd[a bor\xEE di saet] LT [de]',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'di %s de',
          past: 'ber\xEE %s',
          s: $,
          ss: $,
          m: $,
          mm: $,
          h: $,
          hh: $,
          d: $,
          dd: $,
          w: $,
          ww: $,
          M: $,
          MM: $,
          y: $,
          yy: $,
        },
        dayOfMonthOrdinalParse: /\d{1,2}(?:yê|ê|\.)/,
        ordinal: function (e, s) {
          var i = s.toLowerCase()
          return i.includes('w') || i.includes('m') ? e + '.' : e + Kt(e)
        },
        week: {dow: 1, doy: 4},
      })
      var Qt = {
          1: '\u0661',
          2: '\u0662',
          3: '\u0663',
          4: '\u0664',
          5: '\u0665',
          6: '\u0666',
          7: '\u0667',
          8: '\u0668',
          9: '\u0669',
          0: '\u0660',
        },
        Xt = {
          '\u0661': '1',
          '\u0662': '2',
          '\u0663': '3',
          '\u0664': '4',
          '\u0665': '5',
          '\u0666': '6',
          '\u0667': '7',
          '\u0668': '8',
          '\u0669': '9',
          '\u0660': '0',
        },
        yt = [
          '\u06A9\u0627\u0646\u0648\u0646\u06CC \u062F\u0648\u0648\u06D5\u0645',
          '\u0634\u0648\u0628\u0627\u062A',
          '\u0626\u0627\u0632\u0627\u0631',
          '\u0646\u06CC\u0633\u0627\u0646',
          '\u0626\u0627\u06CC\u0627\u0631',
          '\u062D\u0648\u0632\u06D5\u06CC\u0631\u0627\u0646',
          '\u062A\u06D5\u0645\u0645\u0648\u0632',
          '\u0626\u0627\u0628',
          '\u0626\u06D5\u06CC\u0644\u0648\u0648\u0644',
          '\u062A\u0634\u0631\u06CC\u0646\u06CC \u06CC\u06D5\u0643\u06D5\u0645',
          '\u062A\u0634\u0631\u06CC\u0646\u06CC \u062F\u0648\u0648\u06D5\u0645',
          '\u0643\u0627\u0646\u0648\u0646\u06CC \u06CC\u06D5\u06A9\u06D5\u0645',
        ]
      u.defineLocale('ku', {
        months: yt,
        monthsShort: yt,
        weekdays:
          '\u06CC\u0647\u200C\u0643\u0634\u0647\u200C\u0645\u0645\u0647\u200C_\u062F\u0648\u0648\u0634\u0647\u200C\u0645\u0645\u0647\u200C_\u0633\u06CE\u0634\u0647\u200C\u0645\u0645\u0647\u200C_\u0686\u0648\u0627\u0631\u0634\u0647\u200C\u0645\u0645\u0647\u200C_\u067E\u06CE\u0646\u062C\u0634\u0647\u200C\u0645\u0645\u0647\u200C_\u0647\u0647\u200C\u06CC\u0646\u06CC_\u0634\u0647\u200C\u0645\u0645\u0647\u200C'.split(
            '_',
          ),
        weekdaysShort:
          '\u06CC\u0647\u200C\u0643\u0634\u0647\u200C\u0645_\u062F\u0648\u0648\u0634\u0647\u200C\u0645_\u0633\u06CE\u0634\u0647\u200C\u0645_\u0686\u0648\u0627\u0631\u0634\u0647\u200C\u0645_\u067E\u06CE\u0646\u062C\u0634\u0647\u200C\u0645_\u0647\u0647\u200C\u06CC\u0646\u06CC_\u0634\u0647\u200C\u0645\u0645\u0647\u200C'.split(
            '_',
          ),
        weekdaysMin: '\u06CC_\u062F_\u0633_\u0686_\u067E_\u0647_\u0634'.split(
          '_',
        ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        meridiemParse: /ئێواره‌|به‌یانی/,
        isPM: function (e) {
          return /ئێواره‌/.test(e)
        },
        meridiem: function (e, s, i) {
          return e < 12
            ? '\u0628\u0647\u200C\u06CC\u0627\u0646\u06CC'
            : '\u0626\u06CE\u0648\u0627\u0631\u0647\u200C'
        },
        calendar: {
          sameDay:
            '[\u0626\u0647\u200C\u0645\u0631\u06C6 \u0643\u0627\u062A\u0698\u0645\u06CE\u0631] LT',
          nextDay:
            '[\u0628\u0647\u200C\u06CC\u0627\u0646\u06CC \u0643\u0627\u062A\u0698\u0645\u06CE\u0631] LT',
          nextWeek: 'dddd [\u0643\u0627\u062A\u0698\u0645\u06CE\u0631] LT',
          lastDay:
            '[\u062F\u0648\u06CE\u0646\u06CE \u0643\u0627\u062A\u0698\u0645\u06CE\u0631] LT',
          lastWeek: 'dddd [\u0643\u0627\u062A\u0698\u0645\u06CE\u0631] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0644\u0647\u200C %s',
          past: '%s',
          s: '\u0686\u0647\u200C\u0646\u062F \u0686\u0631\u0643\u0647\u200C\u06CC\u0647\u200C\u0643',
          ss: '\u0686\u0631\u0643\u0647\u200C %d',
          m: '\u06CC\u0647\u200C\u0643 \u062E\u0648\u0644\u0647\u200C\u0643',
          mm: '%d \u062E\u0648\u0644\u0647\u200C\u0643',
          h: '\u06CC\u0647\u200C\u0643 \u0643\u0627\u062A\u0698\u0645\u06CE\u0631',
          hh: '%d \u0643\u0627\u062A\u0698\u0645\u06CE\u0631',
          d: '\u06CC\u0647\u200C\u0643 \u0695\u06C6\u0698',
          dd: '%d \u0695\u06C6\u0698',
          M: '\u06CC\u0647\u200C\u0643 \u0645\u0627\u0646\u06AF',
          MM: '%d \u0645\u0627\u0646\u06AF',
          y: '\u06CC\u0647\u200C\u0643 \u0633\u0627\u06B5',
          yy: '%d \u0633\u0627\u06B5',
        },
        preparse: function (e) {
          return e
            .replace(/[١٢٣٤٥٦٧٨٩٠]/g, function (s) {
              return Xt[s]
            })
            .replace(/،/g, ',')
        },
        postformat: function (e) {
          return e
            .replace(/\d/g, function (s) {
              return Qt[s]
            })
            .replace(/,/g, '\u060C')
        },
        week: {dow: 6, doy: 12},
      })
      var Va = {
        0: '-\u0447\u04AF',
        1: '-\u0447\u0438',
        2: '-\u0447\u0438',
        3: '-\u0447\u04AF',
        4: '-\u0447\u04AF',
        5: '-\u0447\u0438',
        6: '-\u0447\u044B',
        7: '-\u0447\u0438',
        8: '-\u0447\u0438',
        9: '-\u0447\u0443',
        10: '-\u0447\u0443',
        20: '-\u0447\u044B',
        30: '-\u0447\u0443',
        40: '-\u0447\u044B',
        50: '-\u0447\u04AF',
        60: '-\u0447\u044B',
        70: '-\u0447\u0438',
        80: '-\u0447\u0438',
        90: '-\u0447\u0443',
        100: '-\u0447\u04AF',
      }
      u.defineLocale('ky', {
        months:
          '\u044F\u043D\u0432\u0430\u0440\u044C_\u0444\u0435\u0432\u0440\u0430\u043B\u044C_\u043C\u0430\u0440\u0442_\u0430\u043F\u0440\u0435\u043B\u044C_\u043C\u0430\u0439_\u0438\u044E\u043D\u044C_\u0438\u044E\u043B\u044C_\u0430\u0432\u0433\u0443\u0441\u0442_\u0441\u0435\u043D\u0442\u044F\u0431\u0440\u044C_\u043E\u043A\u0442\u044F\u0431\u0440\u044C_\u043D\u043E\u044F\u0431\u0440\u044C_\u0434\u0435\u043A\u0430\u0431\u0440\u044C'.split(
            '_',
          ),
        monthsShort:
          '\u044F\u043D\u0432_\u0444\u0435\u0432_\u043C\u0430\u0440\u0442_\u0430\u043F\u0440_\u043C\u0430\u0439_\u0438\u044E\u043D\u044C_\u0438\u044E\u043B\u044C_\u0430\u0432\u0433_\u0441\u0435\u043D_\u043E\u043A\u0442_\u043D\u043E\u044F_\u0434\u0435\u043A'.split(
            '_',
          ),
        weekdays:
          '\u0416\u0435\u043A\u0448\u0435\u043C\u0431\u0438_\u0414\u04AF\u0439\u0448\u04E9\u043C\u0431\u04AF_\u0428\u0435\u0439\u0448\u0435\u043C\u0431\u0438_\u0428\u0430\u0440\u0448\u0435\u043C\u0431\u0438_\u0411\u0435\u0439\u0448\u0435\u043C\u0431\u0438_\u0416\u0443\u043C\u0430_\u0418\u0448\u0435\u043C\u0431\u0438'.split(
            '_',
          ),
        weekdaysShort:
          '\u0416\u0435\u043A_\u0414\u04AF\u0439_\u0428\u0435\u0439_\u0428\u0430\u0440_\u0411\u0435\u0439_\u0416\u0443\u043C_\u0418\u0448\u0435'.split(
            '_',
          ),
        weekdaysMin:
          '\u0416\u043A_\u0414\u0439_\u0428\u0439_\u0428\u0440_\u0411\u0439_\u0416\u043C_\u0418\u0448'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay:
            '[\u0411\u04AF\u0433\u04AF\u043D \u0441\u0430\u0430\u0442] LT',
          nextDay:
            '[\u042D\u0440\u0442\u0435\u04A3 \u0441\u0430\u0430\u0442] LT',
          nextWeek: 'dddd [\u0441\u0430\u0430\u0442] LT',
          lastDay:
            '[\u041A\u0435\u0447\u044D\u044D \u0441\u0430\u0430\u0442] LT',
          lastWeek:
            '[\u04E8\u0442\u043A\u04E9\u043D \u0430\u043F\u0442\u0430\u043D\u044B\u043D] dddd [\u043A\u04AF\u043D\u04AF] [\u0441\u0430\u0430\u0442] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u0438\u0447\u0438\u043D\u0434\u0435',
          past: '%s \u043C\u0443\u0440\u0443\u043D',
          s: '\u0431\u0438\u0440\u043D\u0435\u0447\u0435 \u0441\u0435\u043A\u0443\u043D\u0434',
          ss: '%d \u0441\u0435\u043A\u0443\u043D\u0434',
          m: '\u0431\u0438\u0440 \u043C\u04AF\u043D\u04E9\u0442',
          mm: '%d \u043C\u04AF\u043D\u04E9\u0442',
          h: '\u0431\u0438\u0440 \u0441\u0430\u0430\u0442',
          hh: '%d \u0441\u0430\u0430\u0442',
          d: '\u0431\u0438\u0440 \u043A\u04AF\u043D',
          dd: '%d \u043A\u04AF\u043D',
          M: '\u0431\u0438\u0440 \u0430\u0439',
          MM: '%d \u0430\u0439',
          y: '\u0431\u0438\u0440 \u0436\u044B\u043B',
          yy: '%d \u0436\u044B\u043B',
        },
        dayOfMonthOrdinalParse: /\d{1,2}-(чи|чы|чү|чу)/,
        ordinal: function (e) {
          var s = e % 10,
            i = e >= 100 ? 100 : null
          return e + (Va[e] || Va[s] || Va[i])
        },
        week: {dow: 1, doy: 7},
      })
      function Ie(e, s, i, _) {
        var l = {
          m: ['eng Minutt', 'enger Minutt'],
          h: ['eng Stonn', 'enger Stonn'],
          d: ['een Dag', 'engem Dag'],
          M: ['ee Mount', 'engem Mount'],
          y: ['ee Joer', 'engem Joer'],
        }
        return s ? l[i][0] : l[i][1]
      }
      function ft(e) {
        var s = e.substr(0, e.indexOf(' '))
        return $e(s) ? 'a ' + e : 'an ' + e
      }
      function es(e) {
        var s = e.substr(0, e.indexOf(' '))
        return $e(s) ? 'viru ' + e : 'virun ' + e
      }
      function $e(e) {
        if (((e = parseInt(e, 10)), isNaN(e))) return !1
        if (e < 0) return !0
        if (e < 10) return 4 <= e && e <= 7
        if (e < 100) {
          var s = e % 10,
            i = e / 10
          return $e(s === 0 ? i : s)
        } else if (e < 1e4) {
          for (; e >= 10;) e = e / 10
          return $e(e)
        } else return ((e = e / 1e3), $e(e))
      }
      u.defineLocale('lb', {
        months:
          'Januar_Februar_M\xE4erz_Abr\xEBll_Mee_Juni_Juli_August_September_Oktober_November_Dezember'.split(
            '_',
          ),
        monthsShort:
          'Jan._Febr._Mrz._Abr._Mee_Jun._Jul._Aug._Sept._Okt._Nov._Dez.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'Sonndeg_M\xE9indeg_D\xEBnschdeg_M\xEBttwoch_Donneschdeg_Freideg_Samschdeg'.split(
            '_',
          ),
        weekdaysShort: 'So._M\xE9._D\xEB._M\xEB._Do._Fr._Sa.'.split('_'),
        weekdaysMin: 'So_M\xE9_D\xEB_M\xEB_Do_Fr_Sa'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'H:mm [Auer]',
          LTS: 'H:mm:ss [Auer]',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY H:mm [Auer]',
          LLLL: 'dddd, D. MMMM YYYY H:mm [Auer]',
        },
        calendar: {
          sameDay: '[Haut um] LT',
          sameElse: 'L',
          nextDay: '[Muer um] LT',
          nextWeek: 'dddd [um] LT',
          lastDay: '[G\xEBschter um] LT',
          lastWeek: function () {
            switch (this.day()) {
              case 2:
              case 4:
                return '[Leschten] dddd [um] LT'
              default:
                return '[Leschte] dddd [um] LT'
            }
          },
        },
        relativeTime: {
          future: ft,
          past: es,
          s: 'e puer Sekonnen',
          ss: '%d Sekonnen',
          m: Ie,
          mm: '%d Minutten',
          h: Ie,
          hh: '%d Stonnen',
          d: Ie,
          dd: '%d Deeg',
          M: Ie,
          MM: '%d M\xE9int',
          y: Ie,
          yy: '%d Joer',
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('lo', {
        months:
          '\u0EA1\u0EB1\u0E87\u0E81\u0EAD\u0E99_\u0E81\u0EB8\u0EA1\u0E9E\u0EB2_\u0EA1\u0EB5\u0E99\u0EB2_\u0EC0\u0EA1\u0EAA\u0EB2_\u0E9E\u0EB6\u0E94\u0EAA\u0EB0\u0E9E\u0EB2_\u0EA1\u0EB4\u0E96\u0EB8\u0E99\u0EB2_\u0E81\u0ECD\u0EA5\u0EB0\u0E81\u0EBB\u0E94_\u0EAA\u0EB4\u0E87\u0EAB\u0EB2_\u0E81\u0EB1\u0E99\u0E8D\u0EB2_\u0E95\u0EB8\u0EA5\u0EB2_\u0E9E\u0EB0\u0E88\u0EB4\u0E81_\u0E97\u0EB1\u0E99\u0EA7\u0EB2'.split(
            '_',
          ),
        monthsShort:
          '\u0EA1\u0EB1\u0E87\u0E81\u0EAD\u0E99_\u0E81\u0EB8\u0EA1\u0E9E\u0EB2_\u0EA1\u0EB5\u0E99\u0EB2_\u0EC0\u0EA1\u0EAA\u0EB2_\u0E9E\u0EB6\u0E94\u0EAA\u0EB0\u0E9E\u0EB2_\u0EA1\u0EB4\u0E96\u0EB8\u0E99\u0EB2_\u0E81\u0ECD\u0EA5\u0EB0\u0E81\u0EBB\u0E94_\u0EAA\u0EB4\u0E87\u0EAB\u0EB2_\u0E81\u0EB1\u0E99\u0E8D\u0EB2_\u0E95\u0EB8\u0EA5\u0EB2_\u0E9E\u0EB0\u0E88\u0EB4\u0E81_\u0E97\u0EB1\u0E99\u0EA7\u0EB2'.split(
            '_',
          ),
        weekdays:
          '\u0EAD\u0EB2\u0E97\u0EB4\u0E94_\u0E88\u0EB1\u0E99_\u0EAD\u0EB1\u0E87\u0E84\u0EB2\u0E99_\u0E9E\u0EB8\u0E94_\u0E9E\u0EB0\u0EAB\u0EB1\u0E94_\u0EAA\u0EB8\u0E81_\u0EC0\u0EAA\u0EBB\u0EB2'.split(
            '_',
          ),
        weekdaysShort:
          '\u0E97\u0EB4\u0E94_\u0E88\u0EB1\u0E99_\u0EAD\u0EB1\u0E87\u0E84\u0EB2\u0E99_\u0E9E\u0EB8\u0E94_\u0E9E\u0EB0\u0EAB\u0EB1\u0E94_\u0EAA\u0EB8\u0E81_\u0EC0\u0EAA\u0EBB\u0EB2'.split(
            '_',
          ),
        weekdaysMin:
          '\u0E97_\u0E88_\u0EAD\u0E84_\u0E9E_\u0E9E\u0EAB_\u0EAA\u0E81_\u0EAA'.split(
            '_',
          ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: '\u0EA7\u0EB1\u0E99dddd D MMMM YYYY HH:mm',
        },
        meridiemParse: /ຕອນເຊົ້າ|ຕອນແລງ/,
        isPM: function (e) {
          return e === '\u0E95\u0EAD\u0E99\u0EC1\u0EA5\u0E87'
        },
        meridiem: function (e, s, i) {
          return e < 12
            ? '\u0E95\u0EAD\u0E99\u0EC0\u0E8A\u0EBB\u0EC9\u0EB2'
            : '\u0E95\u0EAD\u0E99\u0EC1\u0EA5\u0E87'
        },
        calendar: {
          sameDay:
            '[\u0EA1\u0EB7\u0EC9\u0E99\u0EB5\u0EC9\u0EC0\u0EA7\u0EA5\u0EB2] LT',
          nextDay:
            '[\u0EA1\u0EB7\u0EC9\u0EAD\u0EB7\u0EC8\u0E99\u0EC0\u0EA7\u0EA5\u0EB2] LT',
          nextWeek:
            '[\u0EA7\u0EB1\u0E99]dddd[\u0EDC\u0EC9\u0EB2\u0EC0\u0EA7\u0EA5\u0EB2] LT',
          lastDay:
            '[\u0EA1\u0EB7\u0EC9\u0EA7\u0EB2\u0E99\u0E99\u0EB5\u0EC9\u0EC0\u0EA7\u0EA5\u0EB2] LT',
          lastWeek:
            '[\u0EA7\u0EB1\u0E99]dddd[\u0EC1\u0EA5\u0EC9\u0EA7\u0E99\u0EB5\u0EC9\u0EC0\u0EA7\u0EA5\u0EB2] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0EAD\u0EB5\u0E81 %s',
          past: '%s\u0E9C\u0EC8\u0EB2\u0E99\u0EA1\u0EB2',
          s: '\u0E9A\u0ECD\u0EC8\u0EC0\u0E97\u0EBB\u0EC8\u0EB2\u0EC3\u0E94\u0EA7\u0EB4\u0E99\u0EB2\u0E97\u0EB5',
          ss: '%d \u0EA7\u0EB4\u0E99\u0EB2\u0E97\u0EB5',
          m: '1 \u0E99\u0EB2\u0E97\u0EB5',
          mm: '%d \u0E99\u0EB2\u0E97\u0EB5',
          h: '1 \u0E8A\u0EBB\u0EC8\u0EA7\u0EC2\u0EA1\u0E87',
          hh: '%d \u0E8A\u0EBB\u0EC8\u0EA7\u0EC2\u0EA1\u0E87',
          d: '1 \u0EA1\u0EB7\u0EC9',
          dd: '%d \u0EA1\u0EB7\u0EC9',
          M: '1 \u0EC0\u0E94\u0EB7\u0EAD\u0E99',
          MM: '%d \u0EC0\u0E94\u0EB7\u0EAD\u0E99',
          y: '1 \u0E9B\u0EB5',
          yy: '%d \u0E9B\u0EB5',
        },
        dayOfMonthOrdinalParse: /(ທີ່)\d{1,2}/,
        ordinal: function (e) {
          return '\u0E97\u0EB5\u0EC8' + e
        },
      })
      var as = {
        ss: 'sekund\u0117_sekund\u017Ei\u0173_sekundes',
        m: 'minut\u0117_minut\u0117s_minut\u0119',
        mm: 'minut\u0117s_minu\u010Di\u0173_minutes',
        h: 'valanda_valandos_valand\u0105',
        hh: 'valandos_valand\u0173_valandas',
        d: 'diena_dienos_dien\u0105',
        dd: 'dienos_dien\u0173_dienas',
        M: 'm\u0117nuo_m\u0117nesio_m\u0117nes\u012F',
        MM: 'm\u0117nesiai_m\u0117nesi\u0173_m\u0117nesius',
        y: 'metai_met\u0173_metus',
        yy: 'metai_met\u0173_metus',
      }
      function kt(e, s, i, _) {
        return s
          ? 'kelios sekund\u0117s'
          : _
            ? 'keli\u0173 sekund\u017Ei\u0173'
            : 'kelias sekundes'
      }
      function Ce(e, s, i, _) {
        return s ? ie(i)[0] : _ ? ie(i)[1] : ie(i)[2]
      }
      function Ue(e) {
        return e % 10 === 0 || (e > 10 && e < 20)
      }
      function ie(e) {
        return as[e].split('_')
      }
      function je(e, s, i, _) {
        var l = e + ' '
        return e === 1
          ? l + Ce(e, s, i[0], _)
          : s
            ? l + (Ue(e) ? ie(i)[1] : ie(i)[0])
            : _
              ? l + ie(i)[1]
              : l + (Ue(e) ? ie(i)[1] : ie(i)[2])
      }
      u.defineLocale('lt', {
        months: {
          format:
            'sausio_vasario_kovo_baland\u017Eio_gegu\u017E\u0117s_bir\u017Eelio_liepos_rugpj\u016B\u010Dio_rugs\u0117jo_spalio_lapkri\u010Dio_gruod\u017Eio'.split(
              '_',
            ),
          standalone:
            'sausis_vasaris_kovas_balandis_gegu\u017E\u0117_bir\u017Eelis_liepa_rugpj\u016Btis_rugs\u0117jis_spalis_lapkritis_gruodis'.split(
              '_',
            ),
          isFormat: /D[oD]?(\[[^[\]]*\]|\s)+MMMM?|MMMM?(\[[^[\]]*\]|\s)+D[oD]?/,
        },
        monthsShort: 'sau_vas_kov_bal_geg_bir_lie_rgp_rgs_spa_lap_grd'.split(
          '_',
        ),
        weekdays: {
          format:
            'sekmadien\u012F_pirmadien\u012F_antradien\u012F_tre\u010Diadien\u012F_ketvirtadien\u012F_penktadien\u012F_\u0161e\u0161tadien\u012F'.split(
              '_',
            ),
          standalone:
            'sekmadienis_pirmadienis_antradienis_tre\u010Diadienis_ketvirtadienis_penktadienis_\u0161e\u0161tadienis'.split(
              '_',
            ),
          isFormat: /dddd HH:mm/,
        },
        weekdaysShort: 'Sek_Pir_Ant_Tre_Ket_Pen_\u0160e\u0161'.split('_'),
        weekdaysMin: 'S_P_A_T_K_Pn_\u0160'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'YYYY-MM-DD',
          LL: 'YYYY [m.] MMMM D [d.]',
          LLL: 'YYYY [m.] MMMM D [d.], HH:mm [val.]',
          LLLL: 'YYYY [m.] MMMM D [d.], dddd, HH:mm [val.]',
          l: 'YYYY-MM-DD',
          ll: 'YYYY [m.] MMMM D [d.]',
          lll: 'YYYY [m.] MMMM D [d.], HH:mm [val.]',
          llll: 'YYYY [m.] MMMM D [d.], ddd, HH:mm [val.]',
        },
        calendar: {
          sameDay: '[\u0160iandien] LT',
          nextDay: '[Rytoj] LT',
          nextWeek: 'dddd LT',
          lastDay: '[Vakar] LT',
          lastWeek: '[Pra\u0117jus\u012F] dddd LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'po %s',
          past: 'prie\u0161 %s',
          s: kt,
          ss: je,
          m: Ce,
          mm: je,
          h: Ce,
          hh: je,
          d: Ce,
          dd: je,
          M: Ce,
          MM: je,
          y: Ce,
          yy: je,
        },
        dayOfMonthOrdinalParse: /\d{1,2}-oji/,
        ordinal: function (e) {
          return e + '-oji'
        },
        week: {dow: 1, doy: 4},
      })
      var Ge = {
        ss: 'sekundes_sekund\u0113m_sekunde_sekundes'.split('_'),
        m: 'min\u016Btes_min\u016Bt\u0113m_min\u016Bte_min\u016Btes'.split('_'),
        mm: 'min\u016Btes_min\u016Bt\u0113m_min\u016Bte_min\u016Btes'.split(
          '_',
        ),
        h: 'stundas_stund\u0101m_stunda_stundas'.split('_'),
        hh: 'stundas_stund\u0101m_stunda_stundas'.split('_'),
        d: 'dienas_dien\u0101m_diena_dienas'.split('_'),
        dd: 'dienas_dien\u0101m_diena_dienas'.split('_'),
        M: 'm\u0113ne\u0161a_m\u0113ne\u0161iem_m\u0113nesis_m\u0113ne\u0161i'.split(
          '_',
        ),
        MM: 'm\u0113ne\u0161a_m\u0113ne\u0161iem_m\u0113nesis_m\u0113ne\u0161i'.split(
          '_',
        ),
        y: 'gada_gadiem_gads_gadi'.split('_'),
        yy: 'gada_gadiem_gads_gadi'.split('_'),
      }
      function he(e, s, i) {
        return i
          ? s % 10 === 1 && s % 100 !== 11
            ? e[2]
            : e[3]
          : s % 10 === 1 && s % 100 !== 11
            ? e[0]
            : e[1]
      }
      function Ve(e, s, i) {
        return e + ' ' + he(Ge[i], e, s)
      }
      function ia(e, s, i) {
        return he(Ge[i], e, s)
      }
      function ts(e, s) {
        return s ? 'da\u017Eas sekundes' : 'da\u017E\u0101m sekund\u0113m'
      }
      u.defineLocale('lv', {
        months:
          'janv\u0101ris_febru\u0101ris_marts_apr\u012Blis_maijs_j\u016Bnijs_j\u016Blijs_augusts_septembris_oktobris_novembris_decembris'.split(
            '_',
          ),
        monthsShort:
          'jan_feb_mar_apr_mai_j\u016Bn_j\u016Bl_aug_sep_okt_nov_dec'.split(
            '_',
          ),
        weekdays:
          'sv\u0113tdiena_pirmdiena_otrdiena_tre\u0161diena_ceturtdiena_piektdiena_sestdiena'.split(
            '_',
          ),
        weekdaysShort: 'Sv_P_O_T_C_Pk_S'.split('_'),
        weekdaysMin: 'Sv_P_O_T_C_Pk_S'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY.',
          LL: 'YYYY. [gada] D. MMMM',
          LLL: 'YYYY. [gada] D. MMMM, HH:mm',
          LLLL: 'YYYY. [gada] D. MMMM, dddd, HH:mm',
        },
        calendar: {
          sameDay: '[\u0160odien pulksten] LT',
          nextDay: '[R\u012Bt pulksten] LT',
          nextWeek: 'dddd [pulksten] LT',
          lastDay: '[Vakar pulksten] LT',
          lastWeek: '[Pag\u0101ju\u0161\u0101] dddd [pulksten] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'p\u0113c %s',
          past: 'pirms %s',
          s: ts,
          ss: Ve,
          m: ia,
          mm: Ve,
          h: ia,
          hh: Ve,
          d: ia,
          dd: Ve,
          M: ia,
          MM: Ve,
          y: ia,
          yy: Ve,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      var ce = {
        words: {
          ss: ['sekund', 'sekunda', 'sekundi'],
          m: ['jedan minut', 'jednog minuta'],
          mm: ['minut', 'minuta', 'minuta'],
          h: ['jedan sat', 'jednog sata'],
          hh: ['sat', 'sata', 'sati'],
          dd: ['dan', 'dana', 'dana'],
          MM: ['mjesec', 'mjeseca', 'mjeseci'],
          yy: ['godina', 'godine', 'godina'],
        },
        correctGrammaticalCase: function (e, s) {
          return e === 1 ? s[0] : e >= 2 && e <= 4 ? s[1] : s[2]
        },
        translate: function (e, s, i) {
          var _ = ce.words[i]
          return i.length === 1
            ? s
              ? _[0]
              : _[1]
            : e + ' ' + ce.correctGrammaticalCase(e, _)
        },
      }
      u.defineLocale('me', {
        months:
          'januar_februar_mart_april_maj_jun_jul_avgust_septembar_oktobar_novembar_decembar'.split(
            '_',
          ),
        monthsShort:
          'jan._feb._mar._apr._maj_jun_jul_avg._sep._okt._nov._dec.'.split('_'),
        monthsParseExact: !0,
        weekdays:
          'nedjelja_ponedjeljak_utorak_srijeda_\u010Detvrtak_petak_subota'.split(
            '_',
          ),
        weekdaysShort: 'ned._pon._uto._sri._\u010Det._pet._sub.'.split('_'),
        weekdaysMin: 'ne_po_ut_sr_\u010De_pe_su'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY H:mm',
          LLLL: 'dddd, D. MMMM YYYY H:mm',
        },
        calendar: {
          sameDay: '[danas u] LT',
          nextDay: '[sjutra u] LT',
          nextWeek: function () {
            switch (this.day()) {
              case 0:
                return '[u] [nedjelju] [u] LT'
              case 3:
                return '[u] [srijedu] [u] LT'
              case 6:
                return '[u] [subotu] [u] LT'
              case 1:
              case 2:
              case 4:
              case 5:
                return '[u] dddd [u] LT'
            }
          },
          lastDay: '[ju\u010De u] LT',
          lastWeek: function () {
            var e = [
              '[pro\u0161le] [nedjelje] [u] LT',
              '[pro\u0161log] [ponedjeljka] [u] LT',
              '[pro\u0161log] [utorka] [u] LT',
              '[pro\u0161le] [srijede] [u] LT',
              '[pro\u0161log] [\u010Detvrtka] [u] LT',
              '[pro\u0161log] [petka] [u] LT',
              '[pro\u0161le] [subote] [u] LT',
            ]
            return e[this.day()]
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'za %s',
          past: 'prije %s',
          s: 'nekoliko sekundi',
          ss: ce.translate,
          m: ce.translate,
          mm: ce.translate,
          h: ce.translate,
          hh: ce.translate,
          d: 'dan',
          dd: ce.translate,
          M: 'mjesec',
          MM: ce.translate,
          y: 'godinu',
          yy: ce.translate,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('mi', {
        months:
          'Kohi-t\u0101te_Hui-tanguru_Pout\u016B-te-rangi_Paenga-wh\u0101wh\u0101_Haratua_Pipiri_H\u014Dngoingoi_Here-turi-k\u014Dk\u0101_Mahuru_Whiringa-\u0101-nuku_Whiringa-\u0101-rangi_Hakihea'.split(
            '_',
          ),
        monthsShort:
          'Kohi_Hui_Pou_Pae_Hara_Pipi_H\u014Dngoi_Here_Mahu_Whi-nu_Whi-ra_Haki'.split(
            '_',
          ),
        monthsRegex: /(?:['a-z\u0101\u014D\u016B]+-?){1,3}/i,
        monthsStrictRegex: /(?:['a-z\u0101\u014D\u016B]+-?){1,3}/i,
        monthsShortRegex: /(?:['a-z\u0101\u014D\u016B]+-?){1,3}/i,
        monthsShortStrictRegex: /(?:['a-z\u0101\u014D\u016B]+-?){1,2}/i,
        weekdays:
          'R\u0101tapu_Mane_T\u016Brei_Wenerei_T\u0101ite_Paraire_H\u0101tarei'.split(
            '_',
          ),
        weekdaysShort: 'Ta_Ma_T\u016B_We_T\u0101i_Pa_H\u0101'.split('_'),
        weekdaysMin: 'Ta_Ma_T\u016B_We_T\u0101i_Pa_H\u0101'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY [i] HH:mm',
          LLLL: 'dddd, D MMMM YYYY [i] HH:mm',
        },
        calendar: {
          sameDay: '[i teie mahana, i] LT',
          nextDay: '[apopo i] LT',
          nextWeek: 'dddd [i] LT',
          lastDay: '[inanahi i] LT',
          lastWeek: 'dddd [whakamutunga i] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'i roto i %s',
          past: '%s i mua',
          s: 'te h\u0113kona ruarua',
          ss: '%d h\u0113kona',
          m: 'he meneti',
          mm: '%d meneti',
          h: 'te haora',
          hh: '%d haora',
          d: 'he ra',
          dd: '%d ra',
          M: 'he marama',
          MM: '%d marama',
          y: 'he tau',
          yy: '%d tau',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%d\xBA',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('mk', {
        months:
          '\u0458\u0430\u043D\u0443\u0430\u0440\u0438_\u0444\u0435\u0432\u0440\u0443\u0430\u0440\u0438_\u043C\u0430\u0440\u0442_\u0430\u043F\u0440\u0438\u043B_\u043C\u0430\u0458_\u0458\u0443\u043D\u0438_\u0458\u0443\u043B\u0438_\u0430\u0432\u0433\u0443\u0441\u0442_\u0441\u0435\u043F\u0442\u0435\u043C\u0432\u0440\u0438_\u043E\u043A\u0442\u043E\u043C\u0432\u0440\u0438_\u043D\u043E\u0435\u043C\u0432\u0440\u0438_\u0434\u0435\u043A\u0435\u043C\u0432\u0440\u0438'.split(
            '_',
          ),
        monthsShort:
          '\u0458\u0430\u043D_\u0444\u0435\u0432_\u043C\u0430\u0440_\u0430\u043F\u0440_\u043C\u0430\u0458_\u0458\u0443\u043D_\u0458\u0443\u043B_\u0430\u0432\u0433_\u0441\u0435\u043F_\u043E\u043A\u0442_\u043D\u043E\u0435_\u0434\u0435\u043A'.split(
            '_',
          ),
        weekdays:
          '\u043D\u0435\u0434\u0435\u043B\u0430_\u043F\u043E\u043D\u0435\u0434\u0435\u043B\u043D\u0438\u043A_\u0432\u0442\u043E\u0440\u043D\u0438\u043A_\u0441\u0440\u0435\u0434\u0430_\u0447\u0435\u0442\u0432\u0440\u0442\u043E\u043A_\u043F\u0435\u0442\u043E\u043A_\u0441\u0430\u0431\u043E\u0442\u0430'.split(
            '_',
          ),
        weekdaysShort:
          '\u043D\u0435\u0434_\u043F\u043E\u043D_\u0432\u0442\u043E_\u0441\u0440\u0435_\u0447\u0435\u0442_\u043F\u0435\u0442_\u0441\u0430\u0431'.split(
            '_',
          ),
        weekdaysMin:
          '\u043De_\u043Fo_\u0432\u0442_\u0441\u0440_\u0447\u0435_\u043F\u0435_\u0441a'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'D.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY H:mm',
          LLLL: 'dddd, D MMMM YYYY H:mm',
        },
        calendar: {
          sameDay: '[\u0414\u0435\u043D\u0435\u0441 \u0432\u043E] LT',
          nextDay: '[\u0423\u0442\u0440\u0435 \u0432\u043E] LT',
          nextWeek: '[\u0412\u043E] dddd [\u0432\u043E] LT',
          lastDay: '[\u0412\u0447\u0435\u0440\u0430 \u0432\u043E] LT',
          lastWeek: function () {
            switch (this.day()) {
              case 0:
              case 3:
              case 6:
                return '[\u0418\u0437\u043C\u0438\u043D\u0430\u0442\u0430\u0442\u0430] dddd [\u0432\u043E] LT'
              case 1:
              case 2:
              case 4:
              case 5:
                return '[\u0418\u0437\u043C\u0438\u043D\u0430\u0442\u0438\u043E\u0442] dddd [\u0432\u043E] LT'
            }
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0437\u0430 %s',
          past: '\u043F\u0440\u0435\u0434 %s',
          s: '\u043D\u0435\u043A\u043E\u043B\u043A\u0443 \u0441\u0435\u043A\u0443\u043D\u0434\u0438',
          ss: '%d \u0441\u0435\u043A\u0443\u043D\u0434\u0438',
          m: '\u0435\u0434\u043D\u0430 \u043C\u0438\u043D\u0443\u0442\u0430',
          mm: '%d \u043C\u0438\u043D\u0443\u0442\u0438',
          h: '\u0435\u0434\u0435\u043D \u0447\u0430\u0441',
          hh: '%d \u0447\u0430\u0441\u0430',
          d: '\u0435\u0434\u0435\u043D \u0434\u0435\u043D',
          dd: '%d \u0434\u0435\u043D\u0430',
          M: '\u0435\u0434\u0435\u043D \u043C\u0435\u0441\u0435\u0446',
          MM: '%d \u043C\u0435\u0441\u0435\u0446\u0438',
          y: '\u0435\u0434\u043D\u0430 \u0433\u043E\u0434\u0438\u043D\u0430',
          yy: '%d \u0433\u043E\u0434\u0438\u043D\u0438',
        },
        dayOfMonthOrdinalParse: /\d{1,2}-(ев|ен|ти|ви|ри|ми)/,
        ordinal: function (e) {
          var s = e % 10,
            i = e % 100
          return e === 0
            ? e + '-\u0435\u0432'
            : i === 0
              ? e + '-\u0435\u043D'
              : i > 10 && i < 20
                ? e + '-\u0442\u0438'
                : s === 1
                  ? e + '-\u0432\u0438'
                  : s === 2
                    ? e + '-\u0440\u0438'
                    : s === 7 || s === 8
                      ? e + '-\u043C\u0438'
                      : e + '-\u0442\u0438'
        },
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('ml', {
        months:
          '\u0D1C\u0D28\u0D41\u0D35\u0D30\u0D3F_\u0D2B\u0D46\u0D2C\u0D4D\u0D30\u0D41\u0D35\u0D30\u0D3F_\u0D2E\u0D3E\u0D7C\u0D1A\u0D4D\u0D1A\u0D4D_\u0D0F\u0D2A\u0D4D\u0D30\u0D3F\u0D7D_\u0D2E\u0D47\u0D2F\u0D4D_\u0D1C\u0D42\u0D7A_\u0D1C\u0D42\u0D32\u0D48_\u0D13\u0D17\u0D38\u0D4D\u0D31\u0D4D\u0D31\u0D4D_\u0D38\u0D46\u0D2A\u0D4D\u0D31\u0D4D\u0D31\u0D02\u0D2C\u0D7C_\u0D12\u0D15\u0D4D\u0D1F\u0D4B\u0D2C\u0D7C_\u0D28\u0D35\u0D02\u0D2C\u0D7C_\u0D21\u0D3F\u0D38\u0D02\u0D2C\u0D7C'.split(
            '_',
          ),
        monthsShort:
          '\u0D1C\u0D28\u0D41._\u0D2B\u0D46\u0D2C\u0D4D\u0D30\u0D41._\u0D2E\u0D3E\u0D7C._\u0D0F\u0D2A\u0D4D\u0D30\u0D3F._\u0D2E\u0D47\u0D2F\u0D4D_\u0D1C\u0D42\u0D7A_\u0D1C\u0D42\u0D32\u0D48._\u0D13\u0D17._\u0D38\u0D46\u0D2A\u0D4D\u0D31\u0D4D\u0D31._\u0D12\u0D15\u0D4D\u0D1F\u0D4B._\u0D28\u0D35\u0D02._\u0D21\u0D3F\u0D38\u0D02.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          '\u0D1E\u0D3E\u0D2F\u0D31\u0D3E\u0D34\u0D4D\u0D1A_\u0D24\u0D3F\u0D19\u0D4D\u0D15\u0D33\u0D3E\u0D34\u0D4D\u0D1A_\u0D1A\u0D4A\u0D35\u0D4D\u0D35\u0D3E\u0D34\u0D4D\u0D1A_\u0D2C\u0D41\u0D27\u0D28\u0D3E\u0D34\u0D4D\u0D1A_\u0D35\u0D4D\u0D2F\u0D3E\u0D34\u0D3E\u0D34\u0D4D\u0D1A_\u0D35\u0D46\u0D33\u0D4D\u0D33\u0D3F\u0D2F\u0D3E\u0D34\u0D4D\u0D1A_\u0D36\u0D28\u0D3F\u0D2F\u0D3E\u0D34\u0D4D\u0D1A'.split(
            '_',
          ),
        weekdaysShort:
          '\u0D1E\u0D3E\u0D2F\u0D7C_\u0D24\u0D3F\u0D19\u0D4D\u0D15\u0D7E_\u0D1A\u0D4A\u0D35\u0D4D\u0D35_\u0D2C\u0D41\u0D27\u0D7B_\u0D35\u0D4D\u0D2F\u0D3E\u0D34\u0D02_\u0D35\u0D46\u0D33\u0D4D\u0D33\u0D3F_\u0D36\u0D28\u0D3F'.split(
            '_',
          ),
        weekdaysMin:
          '\u0D1E\u0D3E_\u0D24\u0D3F_\u0D1A\u0D4A_\u0D2C\u0D41_\u0D35\u0D4D\u0D2F\u0D3E_\u0D35\u0D46_\u0D36'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'A h:mm -\u0D28\u0D41',
          LTS: 'A h:mm:ss -\u0D28\u0D41',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY, A h:mm -\u0D28\u0D41',
          LLLL: 'dddd, D MMMM YYYY, A h:mm -\u0D28\u0D41',
        },
        calendar: {
          sameDay: '[\u0D07\u0D28\u0D4D\u0D28\u0D4D] LT',
          nextDay: '[\u0D28\u0D3E\u0D33\u0D46] LT',
          nextWeek: 'dddd, LT',
          lastDay: '[\u0D07\u0D28\u0D4D\u0D28\u0D32\u0D46] LT',
          lastWeek: '[\u0D15\u0D34\u0D3F\u0D1E\u0D4D\u0D1E] dddd, LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u0D15\u0D34\u0D3F\u0D1E\u0D4D\u0D1E\u0D4D',
          past: '%s \u0D2E\u0D41\u0D7B\u0D2A\u0D4D',
          s: '\u0D05\u0D7D\u0D2A \u0D28\u0D3F\u0D2E\u0D3F\u0D37\u0D19\u0D4D\u0D19\u0D7E',
          ss: '%d \u0D38\u0D46\u0D15\u0D4D\u0D15\u0D7B\u0D21\u0D4D',
          m: '\u0D12\u0D30\u0D41 \u0D2E\u0D3F\u0D28\u0D3F\u0D31\u0D4D\u0D31\u0D4D',
          mm: '%d \u0D2E\u0D3F\u0D28\u0D3F\u0D31\u0D4D\u0D31\u0D4D',
          h: '\u0D12\u0D30\u0D41 \u0D2E\u0D23\u0D3F\u0D15\u0D4D\u0D15\u0D42\u0D7C',
          hh: '%d \u0D2E\u0D23\u0D3F\u0D15\u0D4D\u0D15\u0D42\u0D7C',
          d: '\u0D12\u0D30\u0D41 \u0D26\u0D3F\u0D35\u0D38\u0D02',
          dd: '%d \u0D26\u0D3F\u0D35\u0D38\u0D02',
          M: '\u0D12\u0D30\u0D41 \u0D2E\u0D3E\u0D38\u0D02',
          MM: '%d \u0D2E\u0D3E\u0D38\u0D02',
          y: '\u0D12\u0D30\u0D41 \u0D35\u0D7C\u0D37\u0D02',
          yy: '%d \u0D35\u0D7C\u0D37\u0D02',
        },
        meridiemParse: /രാത്രി|രാവിലെ|ഉച്ച കഴിഞ്ഞ്|വൈകുന്നേരം|രാത്രി/i,
        meridiemHour: function (e, s) {
          return (
            e === 12 && (e = 0),
            (s === '\u0D30\u0D3E\u0D24\u0D4D\u0D30\u0D3F' && e >= 4) ||
            s ===
              '\u0D09\u0D1A\u0D4D\u0D1A \u0D15\u0D34\u0D3F\u0D1E\u0D4D\u0D1E\u0D4D' ||
            s === '\u0D35\u0D48\u0D15\u0D41\u0D28\u0D4D\u0D28\u0D47\u0D30\u0D02'
              ? e + 12
              : e
          )
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u0D30\u0D3E\u0D24\u0D4D\u0D30\u0D3F'
            : e < 12
              ? '\u0D30\u0D3E\u0D35\u0D3F\u0D32\u0D46'
              : e < 17
                ? '\u0D09\u0D1A\u0D4D\u0D1A \u0D15\u0D34\u0D3F\u0D1E\u0D4D\u0D1E\u0D4D'
                : e < 20
                  ? '\u0D35\u0D48\u0D15\u0D41\u0D28\u0D4D\u0D28\u0D47\u0D30\u0D02'
                  : '\u0D30\u0D3E\u0D24\u0D4D\u0D30\u0D3F'
        },
      })
      function se(e, s, i, _) {
        switch (i) {
          case 's':
            return s
              ? '\u0445\u044D\u0434\u0445\u044D\u043D \u0441\u0435\u043A\u0443\u043D\u0434'
              : '\u0445\u044D\u0434\u0445\u044D\u043D \u0441\u0435\u043A\u0443\u043D\u0434\u044B\u043D'
          case 'ss':
            return (
              e +
              (s
                ? ' \u0441\u0435\u043A\u0443\u043D\u0434'
                : ' \u0441\u0435\u043A\u0443\u043D\u0434\u044B\u043D')
            )
          case 'm':
          case 'mm':
            return (
              e +
              (s
                ? ' \u043C\u0438\u043D\u0443\u0442'
                : ' \u043C\u0438\u043D\u0443\u0442\u044B\u043D')
            )
          case 'h':
          case 'hh':
            return (
              e +
              (s
                ? ' \u0446\u0430\u0433'
                : ' \u0446\u0430\u0433\u0438\u0439\u043D')
            )
          case 'd':
          case 'dd':
            return (
              e +
              (s
                ? ' \u04E9\u0434\u04E9\u0440'
                : ' \u04E9\u0434\u0440\u0438\u0439\u043D')
            )
          case 'M':
          case 'MM':
            return (
              e +
              (s ? ' \u0441\u0430\u0440' : ' \u0441\u0430\u0440\u044B\u043D')
            )
          case 'y':
          case 'yy':
            return (
              e +
              (s
                ? ' \u0436\u0438\u043B'
                : ' \u0436\u0438\u043B\u0438\u0439\u043D')
            )
          default:
            return e
        }
      }
      u.defineLocale('mn', {
        months:
          '\u041D\u044D\u0433\u0434\u04AF\u0433\u044D\u044D\u0440 \u0441\u0430\u0440_\u0425\u043E\u0451\u0440\u0434\u0443\u0433\u0430\u0430\u0440 \u0441\u0430\u0440_\u0413\u0443\u0440\u0430\u0432\u0434\u0443\u0433\u0430\u0430\u0440 \u0441\u0430\u0440_\u0414\u04E9\u0440\u04E9\u0432\u0434\u04AF\u0433\u044D\u044D\u0440 \u0441\u0430\u0440_\u0422\u0430\u0432\u0434\u0443\u0433\u0430\u0430\u0440 \u0441\u0430\u0440_\u0417\u0443\u0440\u0433\u0430\u0434\u0443\u0433\u0430\u0430\u0440 \u0441\u0430\u0440_\u0414\u043E\u043B\u0434\u0443\u0433\u0430\u0430\u0440 \u0441\u0430\u0440_\u041D\u0430\u0439\u043C\u0434\u0443\u0433\u0430\u0430\u0440 \u0441\u0430\u0440_\u0415\u0441\u0434\u04AF\u0433\u044D\u044D\u0440 \u0441\u0430\u0440_\u0410\u0440\u0430\u0432\u0434\u0443\u0433\u0430\u0430\u0440 \u0441\u0430\u0440_\u0410\u0440\u0432\u0430\u043D \u043D\u044D\u0433\u0434\u04AF\u0433\u044D\u044D\u0440 \u0441\u0430\u0440_\u0410\u0440\u0432\u0430\u043D \u0445\u043E\u0451\u0440\u0434\u0443\u0433\u0430\u0430\u0440 \u0441\u0430\u0440'.split(
            '_',
          ),
        monthsShort:
          '1 \u0441\u0430\u0440_2 \u0441\u0430\u0440_3 \u0441\u0430\u0440_4 \u0441\u0430\u0440_5 \u0441\u0430\u0440_6 \u0441\u0430\u0440_7 \u0441\u0430\u0440_8 \u0441\u0430\u0440_9 \u0441\u0430\u0440_10 \u0441\u0430\u0440_11 \u0441\u0430\u0440_12 \u0441\u0430\u0440'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          '\u041D\u044F\u043C_\u0414\u0430\u0432\u0430\u0430_\u041C\u044F\u0433\u043C\u0430\u0440_\u041B\u0445\u0430\u0433\u0432\u0430_\u041F\u04AF\u0440\u044D\u0432_\u0411\u0430\u0430\u0441\u0430\u043D_\u0411\u044F\u043C\u0431\u0430'.split(
            '_',
          ),
        weekdaysShort:
          '\u041D\u044F\u043C_\u0414\u0430\u0432_\u041C\u044F\u0433_\u041B\u0445\u0430_\u041F\u04AF\u0440_\u0411\u0430\u0430_\u0411\u044F\u043C'.split(
            '_',
          ),
        weekdaysMin:
          '\u041D\u044F_\u0414\u0430_\u041C\u044F_\u041B\u0445_\u041F\u04AF_\u0411\u0430_\u0411\u044F'.split(
            '_',
          ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'YYYY-MM-DD',
          LL: 'YYYY \u043E\u043D\u044B MMMM\u044B\u043D D',
          LLL: 'YYYY \u043E\u043D\u044B MMMM\u044B\u043D D HH:mm',
          LLLL: 'dddd, YYYY \u043E\u043D\u044B MMMM\u044B\u043D D HH:mm',
        },
        meridiemParse: /ҮӨ|ҮХ/i,
        isPM: function (e) {
          return e === '\u04AE\u0425'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? '\u04AE\u04E8' : '\u04AE\u0425'
        },
        calendar: {
          sameDay: '[\u04E8\u043D\u04E9\u04E9\u0434\u04E9\u0440] LT',
          nextDay: '[\u041C\u0430\u0440\u0433\u0430\u0430\u0448] LT',
          nextWeek: '[\u0418\u0440\u044D\u0445] dddd LT',
          lastDay: '[\u04E8\u0447\u0438\u0433\u0434\u04E9\u0440] LT',
          lastWeek:
            '[\u04E8\u043D\u0433\u04E9\u0440\u0441\u04E9\u043D] dddd LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u0434\u0430\u0440\u0430\u0430',
          past: '%s \u04E9\u043C\u043D\u04E9',
          s: se,
          ss: se,
          m: se,
          mm: se,
          h: se,
          hh: se,
          d: se,
          dd: se,
          M: se,
          MM: se,
          y: se,
          yy: se,
        },
        dayOfMonthOrdinalParse: /\d{1,2} өдөр/,
        ordinal: function (e, s) {
          switch (s) {
            case 'd':
            case 'D':
            case 'DDD':
              return e + ' \u04E9\u0434\u04E9\u0440'
            default:
              return e
          }
        },
      })
      var ss = {
          1: '\u0967',
          2: '\u0968',
          3: '\u0969',
          4: '\u096A',
          5: '\u096B',
          6: '\u096C',
          7: '\u096D',
          8: '\u096E',
          9: '\u096F',
          0: '\u0966',
        },
        rs = {
          '\u0967': '1',
          '\u0968': '2',
          '\u0969': '3',
          '\u096A': '4',
          '\u096B': '5',
          '\u096C': '6',
          '\u096D': '7',
          '\u096E': '8',
          '\u096F': '9',
          '\u0966': '0',
        }
      function re(e, s, i, _) {
        var l = ''
        if (s)
          switch (i) {
            case 's':
              l = '\u0915\u093E\u0939\u0940 \u0938\u0947\u0915\u0902\u0926'
              break
            case 'ss':
              l = '%d \u0938\u0947\u0915\u0902\u0926'
              break
            case 'm':
              l = '\u090F\u0915 \u092E\u093F\u0928\u093F\u091F'
              break
            case 'mm':
              l = '%d \u092E\u093F\u0928\u093F\u091F\u0947'
              break
            case 'h':
              l = '\u090F\u0915 \u0924\u093E\u0938'
              break
            case 'hh':
              l = '%d \u0924\u093E\u0938'
              break
            case 'd':
              l = '\u090F\u0915 \u0926\u093F\u0935\u0938'
              break
            case 'dd':
              l = '%d \u0926\u093F\u0935\u0938'
              break
            case 'M':
              l = '\u090F\u0915 \u092E\u0939\u093F\u0928\u093E'
              break
            case 'MM':
              l = '%d \u092E\u0939\u093F\u0928\u0947'
              break
            case 'y':
              l = '\u090F\u0915 \u0935\u0930\u094D\u0937'
              break
            case 'yy':
              l = '%d \u0935\u0930\u094D\u0937\u0947'
              break
          }
        else
          switch (i) {
            case 's':
              l =
                '\u0915\u093E\u0939\u0940 \u0938\u0947\u0915\u0902\u0926\u093E\u0902'
              break
            case 'ss':
              l = '%d \u0938\u0947\u0915\u0902\u0926\u093E\u0902'
              break
            case 'm':
              l = '\u090F\u0915\u093E \u092E\u093F\u0928\u093F\u091F\u093E'
              break
            case 'mm':
              l = '%d \u092E\u093F\u0928\u093F\u091F\u093E\u0902'
              break
            case 'h':
              l = '\u090F\u0915\u093E \u0924\u093E\u0938\u093E'
              break
            case 'hh':
              l = '%d \u0924\u093E\u0938\u093E\u0902'
              break
            case 'd':
              l = '\u090F\u0915\u093E \u0926\u093F\u0935\u0938\u093E'
              break
            case 'dd':
              l = '%d \u0926\u093F\u0935\u0938\u093E\u0902'
              break
            case 'M':
              l =
                '\u090F\u0915\u093E \u092E\u0939\u093F\u0928\u094D\u092F\u093E'
              break
            case 'MM':
              l = '%d \u092E\u0939\u093F\u0928\u094D\u092F\u093E\u0902'
              break
            case 'y':
              l = '\u090F\u0915\u093E \u0935\u0930\u094D\u0937\u093E'
              break
            case 'yy':
              l = '%d \u0935\u0930\u094D\u0937\u093E\u0902'
              break
          }
        return l.replace(/%d/i, e)
      }
      u.defineLocale('mr', {
        months:
          '\u091C\u093E\u0928\u0947\u0935\u093E\u0930\u0940_\u092B\u0947\u092C\u094D\u0930\u0941\u0935\u093E\u0930\u0940_\u092E\u093E\u0930\u094D\u091A_\u090F\u092A\u094D\u0930\u093F\u0932_\u092E\u0947_\u091C\u0942\u0928_\u091C\u0941\u0932\u0948_\u0911\u0917\u0938\u094D\u091F_\u0938\u092A\u094D\u091F\u0947\u0902\u092C\u0930_\u0911\u0915\u094D\u091F\u094B\u092C\u0930_\u0928\u094B\u0935\u094D\u0939\u0947\u0902\u092C\u0930_\u0921\u093F\u0938\u0947\u0902\u092C\u0930'.split(
            '_',
          ),
        monthsShort:
          '\u091C\u093E\u0928\u0947._\u092B\u0947\u092C\u094D\u0930\u0941._\u092E\u093E\u0930\u094D\u091A._\u090F\u092A\u094D\u0930\u093F._\u092E\u0947._\u091C\u0942\u0928._\u091C\u0941\u0932\u0948._\u0911\u0917._\u0938\u092A\u094D\u091F\u0947\u0902._\u0911\u0915\u094D\u091F\u094B._\u0928\u094B\u0935\u094D\u0939\u0947\u0902._\u0921\u093F\u0938\u0947\u0902.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          '\u0930\u0935\u093F\u0935\u093E\u0930_\u0938\u094B\u092E\u0935\u093E\u0930_\u092E\u0902\u0917\u0933\u0935\u093E\u0930_\u092C\u0941\u0927\u0935\u093E\u0930_\u0917\u0941\u0930\u0942\u0935\u093E\u0930_\u0936\u0941\u0915\u094D\u0930\u0935\u093E\u0930_\u0936\u0928\u093F\u0935\u093E\u0930'.split(
            '_',
          ),
        weekdaysShort:
          '\u0930\u0935\u093F_\u0938\u094B\u092E_\u092E\u0902\u0917\u0933_\u092C\u0941\u0927_\u0917\u0941\u0930\u0942_\u0936\u0941\u0915\u094D\u0930_\u0936\u0928\u093F'.split(
            '_',
          ),
        weekdaysMin:
          '\u0930_\u0938\u094B_\u092E\u0902_\u092C\u0941_\u0917\u0941_\u0936\u0941_\u0936'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'A h:mm \u0935\u093E\u091C\u0924\u093E',
          LTS: 'A h:mm:ss \u0935\u093E\u091C\u0924\u093E',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY, A h:mm \u0935\u093E\u091C\u0924\u093E',
          LLLL: 'dddd, D MMMM YYYY, A h:mm \u0935\u093E\u091C\u0924\u093E',
        },
        calendar: {
          sameDay: '[\u0906\u091C] LT',
          nextDay: '[\u0909\u0926\u094D\u092F\u093E] LT',
          nextWeek: 'dddd, LT',
          lastDay: '[\u0915\u093E\u0932] LT',
          lastWeek: '[\u092E\u093E\u0917\u0940\u0932] dddd, LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s\u092E\u0927\u094D\u092F\u0947',
          past: '%s\u092A\u0942\u0930\u094D\u0935\u0940',
          s: re,
          ss: re,
          m: re,
          mm: re,
          h: re,
          hh: re,
          d: re,
          dd: re,
          M: re,
          MM: re,
          y: re,
          yy: re,
        },
        preparse: function (e) {
          return e.replace(/[१२३४५६७८९०]/g, function (s) {
            return rs[s]
          })
        },
        postformat: function (e) {
          return e.replace(/\d/g, function (s) {
            return ss[s]
          })
        },
        meridiemParse: /पहाटे|सकाळी|दुपारी|सायंकाळी|रात्री/,
        meridiemHour: function (e, s) {
          if (
            (e === 12 && (e = 0),
            s === '\u092A\u0939\u093E\u091F\u0947' ||
              s === '\u0938\u0915\u093E\u0933\u0940')
          )
            return e
          if (
            s === '\u0926\u0941\u092A\u093E\u0930\u0940' ||
            s === '\u0938\u093E\u092F\u0902\u0915\u093E\u0933\u0940' ||
            s === '\u0930\u093E\u0924\u094D\u0930\u0940'
          )
            return e >= 12 ? e : e + 12
        },
        meridiem: function (e, s, i) {
          return e >= 0 && e < 6
            ? '\u092A\u0939\u093E\u091F\u0947'
            : e < 12
              ? '\u0938\u0915\u093E\u0933\u0940'
              : e < 17
                ? '\u0926\u0941\u092A\u093E\u0930\u0940'
                : e < 20
                  ? '\u0938\u093E\u092F\u0902\u0915\u093E\u0933\u0940'
                  : '\u0930\u093E\u0924\u094D\u0930\u0940'
        },
        week: {dow: 0, doy: 6},
      })
      u.defineLocale('ms-my', {
        months:
          'Januari_Februari_Mac_April_Mei_Jun_Julai_Ogos_September_Oktober_November_Disember'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mac_Apr_Mei_Jun_Jul_Ogs_Sep_Okt_Nov_Dis'.split(
          '_',
        ),
        weekdays: 'Ahad_Isnin_Selasa_Rabu_Khamis_Jumaat_Sabtu'.split('_'),
        weekdaysShort: 'Ahd_Isn_Sel_Rab_Kha_Jum_Sab'.split('_'),
        weekdaysMin: 'Ah_Is_Sl_Rb_Km_Jm_Sb'.split('_'),
        longDateFormat: {
          LT: 'HH.mm',
          LTS: 'HH.mm.ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY [pukul] HH.mm',
          LLLL: 'dddd, D MMMM YYYY [pukul] HH.mm',
        },
        meridiemParse: /pagi|tengahari|petang|malam/,
        meridiemHour: function (e, s) {
          if ((e === 12 && (e = 0), s === 'pagi')) return e
          if (s === 'tengahari') return e >= 11 ? e : e + 12
          if (s === 'petang' || s === 'malam') return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 11
            ? 'pagi'
            : e < 15
              ? 'tengahari'
              : e < 19
                ? 'petang'
                : 'malam'
        },
        calendar: {
          sameDay: '[Hari ini pukul] LT',
          nextDay: '[Esok pukul] LT',
          nextWeek: 'dddd [pukul] LT',
          lastDay: '[Kelmarin pukul] LT',
          lastWeek: 'dddd [lepas pukul] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'dalam %s',
          past: '%s yang lepas',
          s: 'beberapa saat',
          ss: '%d saat',
          m: 'seminit',
          mm: '%d minit',
          h: 'sejam',
          hh: '%d jam',
          d: 'sehari',
          dd: '%d hari',
          M: 'sebulan',
          MM: '%d bulan',
          y: 'setahun',
          yy: '%d tahun',
        },
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('ms', {
        months:
          'Januari_Februari_Mac_April_Mei_Jun_Julai_Ogos_September_Oktober_November_Disember'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mac_Apr_Mei_Jun_Jul_Ogs_Sep_Okt_Nov_Dis'.split(
          '_',
        ),
        weekdays: 'Ahad_Isnin_Selasa_Rabu_Khamis_Jumaat_Sabtu'.split('_'),
        weekdaysShort: 'Ahd_Isn_Sel_Rab_Kha_Jum_Sab'.split('_'),
        weekdaysMin: 'Ah_Is_Sl_Rb_Km_Jm_Sb'.split('_'),
        longDateFormat: {
          LT: 'HH.mm',
          LTS: 'HH.mm.ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY [pukul] HH.mm',
          LLLL: 'dddd, D MMMM YYYY [pukul] HH.mm',
        },
        meridiemParse: /pagi|tengahari|petang|malam/,
        meridiemHour: function (e, s) {
          if ((e === 12 && (e = 0), s === 'pagi')) return e
          if (s === 'tengahari') return e >= 11 ? e : e + 12
          if (s === 'petang' || s === 'malam') return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 11
            ? 'pagi'
            : e < 15
              ? 'tengahari'
              : e < 19
                ? 'petang'
                : 'malam'
        },
        calendar: {
          sameDay: '[Hari ini pukul] LT',
          nextDay: '[Esok pukul] LT',
          nextWeek: 'dddd [pukul] LT',
          lastDay: '[Kelmarin pukul] LT',
          lastWeek: 'dddd [lepas pukul] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'dalam %s',
          past: '%s yang lepas',
          s: 'beberapa saat',
          ss: '%d saat',
          m: 'seminit',
          mm: '%d minit',
          h: 'sejam',
          hh: '%d jam',
          d: 'sehari',
          dd: '%d hari',
          M: 'sebulan',
          MM: '%d bulan',
          y: 'setahun',
          yy: '%d tahun',
        },
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('mt', {
        months:
          'Jannar_Frar_Marzu_April_Mejju_\u0120unju_Lulju_Awwissu_Settembru_Ottubru_Novembru_Di\u010Bembru'.split(
            '_',
          ),
        monthsShort:
          'Jan_Fra_Mar_Apr_Mej_\u0120un_Lul_Aww_Set_Ott_Nov_Di\u010B'.split(
            '_',
          ),
        weekdays:
          'Il-\u0126add_It-Tnejn_It-Tlieta_L-Erbg\u0127a_Il-\u0126amis_Il-\u0120img\u0127a_Is-Sibt'.split(
            '_',
          ),
        weekdaysShort: '\u0126ad_Tne_Tli_Erb_\u0126am_\u0120im_Sib'.split('_'),
        weekdaysMin: '\u0126a_Tn_Tl_Er_\u0126a_\u0120i_Si'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Illum fil-]LT',
          nextDay: '[G\u0127ada fil-]LT',
          nextWeek: 'dddd [fil-]LT',
          lastDay: '[Il-biera\u0127 fil-]LT',
          lastWeek: 'dddd [li g\u0127adda] [fil-]LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'f\u2019 %s',
          past: '%s ilu',
          s: 'ftit sekondi',
          ss: '%d sekondi',
          m: 'minuta',
          mm: '%d minuti',
          h: 'sieg\u0127a',
          hh: '%d sieg\u0127at',
          d: '\u0121urnata',
          dd: '%d \u0121ranet',
          M: 'xahar',
          MM: '%d xhur',
          y: 'sena',
          yy: '%d sni',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%d\xBA',
        week: {dow: 1, doy: 4},
      })
      var qa = {
          1: '\u1041',
          2: '\u1042',
          3: '\u1043',
          4: '\u1044',
          5: '\u1045',
          6: '\u1046',
          7: '\u1047',
          8: '\u1048',
          9: '\u1049',
          0: '\u1040',
        },
        ns = {
          '\u1041': '1',
          '\u1042': '2',
          '\u1043': '3',
          '\u1044': '4',
          '\u1045': '5',
          '\u1046': '6',
          '\u1047': '7',
          '\u1048': '8',
          '\u1049': '9',
          '\u1040': '0',
        }
      u.defineLocale('my', {
        months:
          '\u1007\u1014\u103A\u1014\u101D\u102B\u101B\u102E_\u1016\u1031\u1016\u1031\u102C\u103A\u101D\u102B\u101B\u102E_\u1019\u1010\u103A_\u1027\u1015\u103C\u102E_\u1019\u1031_\u1007\u103D\u1014\u103A_\u1007\u1030\u101C\u102D\u102F\u1004\u103A_\u101E\u103C\u1002\u102F\u1010\u103A_\u1005\u1000\u103A\u1010\u1004\u103A\u1018\u102C_\u1021\u1031\u102C\u1000\u103A\u1010\u102D\u102F\u1018\u102C_\u1014\u102D\u102F\u101D\u1004\u103A\u1018\u102C_\u1012\u102E\u1007\u1004\u103A\u1018\u102C'.split(
            '_',
          ),
        monthsShort:
          '\u1007\u1014\u103A_\u1016\u1031_\u1019\u1010\u103A_\u1015\u103C\u102E_\u1019\u1031_\u1007\u103D\u1014\u103A_\u101C\u102D\u102F\u1004\u103A_\u101E\u103C_\u1005\u1000\u103A_\u1021\u1031\u102C\u1000\u103A_\u1014\u102D\u102F_\u1012\u102E'.split(
            '_',
          ),
        weekdays:
          '\u1010\u1014\u1004\u103A\u1039\u1002\u1014\u103D\u1031_\u1010\u1014\u1004\u103A\u1039\u101C\u102C_\u1021\u1004\u103A\u1039\u1002\u102B_\u1017\u102F\u1012\u1039\u1013\u101F\u1030\u1038_\u1000\u103C\u102C\u101E\u1015\u1010\u1031\u1038_\u101E\u1031\u102C\u1000\u103C\u102C_\u1005\u1014\u1031'.split(
            '_',
          ),
        weekdaysShort:
          '\u1014\u103D\u1031_\u101C\u102C_\u1002\u102B_\u101F\u1030\u1038_\u1000\u103C\u102C_\u101E\u1031\u102C_\u1014\u1031'.split(
            '_',
          ),
        weekdaysMin:
          '\u1014\u103D\u1031_\u101C\u102C_\u1002\u102B_\u101F\u1030\u1038_\u1000\u103C\u102C_\u101E\u1031\u102C_\u1014\u1031'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[\u101A\u1014\u1031.] LT [\u1019\u103E\u102C]',
          nextDay:
            '[\u1019\u1014\u1000\u103A\u1016\u103C\u1014\u103A] LT [\u1019\u103E\u102C]',
          nextWeek: 'dddd LT [\u1019\u103E\u102C]',
          lastDay: '[\u1019\u1014\u1031.\u1000] LT [\u1019\u103E\u102C]',
          lastWeek:
            '[\u1015\u103C\u102E\u1038\u1001\u1032\u1037\u101E\u1031\u102C] dddd LT [\u1019\u103E\u102C]',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u101C\u102C\u1019\u100A\u103A\u1037 %s \u1019\u103E\u102C',
          past: '\u101C\u103D\u1014\u103A\u1001\u1032\u1037\u101E\u1031\u102C %s \u1000',
          s: '\u1005\u1000\u1039\u1000\u1014\u103A.\u1021\u1014\u100A\u103A\u1038\u1004\u101A\u103A',
          ss: '%d \u1005\u1000\u1039\u1000\u1014\u1037\u103A',
          m: '\u1010\u1005\u103A\u1019\u102D\u1014\u1005\u103A',
          mm: '%d \u1019\u102D\u1014\u1005\u103A',
          h: '\u1010\u1005\u103A\u1014\u102C\u101B\u102E',
          hh: '%d \u1014\u102C\u101B\u102E',
          d: '\u1010\u1005\u103A\u101B\u1000\u103A',
          dd: '%d \u101B\u1000\u103A',
          M: '\u1010\u1005\u103A\u101C',
          MM: '%d \u101C',
          y: '\u1010\u1005\u103A\u1014\u103E\u1005\u103A',
          yy: '%d \u1014\u103E\u1005\u103A',
        },
        preparse: function (e) {
          return e.replace(/[၁၂၃၄၅၆၇၈၉၀]/g, function (s) {
            return ns[s]
          })
        },
        postformat: function (e) {
          return e.replace(/\d/g, function (s) {
            return qa[s]
          })
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('nb', {
        months:
          'januar_februar_mars_april_mai_juni_juli_august_september_oktober_november_desember'.split(
            '_',
          ),
        monthsShort:
          'jan._feb._mars_apr._mai_juni_juli_aug._sep._okt._nov._des.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          's\xF8ndag_mandag_tirsdag_onsdag_torsdag_fredag_l\xF8rdag'.split('_'),
        weekdaysShort: 's\xF8._ma._ti._on._to._fr._l\xF8.'.split('_'),
        weekdaysMin: 's\xF8_ma_ti_on_to_fr_l\xF8'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY [kl.] HH:mm',
          LLLL: 'dddd D. MMMM YYYY [kl.] HH:mm',
        },
        calendar: {
          sameDay: '[i dag kl.] LT',
          nextDay: '[i morgen kl.] LT',
          nextWeek: 'dddd [kl.] LT',
          lastDay: '[i g\xE5r kl.] LT',
          lastWeek: '[forrige] dddd [kl.] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'om %s',
          past: '%s siden',
          s: 'noen sekunder',
          ss: '%d sekunder',
          m: 'ett minutt',
          mm: '%d minutter',
          h: '\xE9n time',
          hh: '%d timer',
          d: '\xE9n dag',
          dd: '%d dager',
          w: '\xE9n uke',
          ww: '%d uker',
          M: '\xE9n m\xE5ned',
          MM: '%d m\xE5neder',
          y: 'ett \xE5r',
          yy: '%d \xE5r',
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      var pt = {
          1: '\u0967',
          2: '\u0968',
          3: '\u0969',
          4: '\u096A',
          5: '\u096B',
          6: '\u096C',
          7: '\u096D',
          8: '\u096E',
          9: '\u096F',
          0: '\u0966',
        },
        ds = {
          '\u0967': '1',
          '\u0968': '2',
          '\u0969': '3',
          '\u096A': '4',
          '\u096B': '5',
          '\u096C': '6',
          '\u096D': '7',
          '\u096E': '8',
          '\u096F': '9',
          '\u0966': '0',
        }
      u.defineLocale('ne', {
        months:
          '\u091C\u0928\u0935\u0930\u0940_\u092B\u0947\u092C\u094D\u0930\u0941\u0935\u0930\u0940_\u092E\u093E\u0930\u094D\u091A_\u0905\u092A\u094D\u0930\u093F\u0932_\u092E\u0908_\u091C\u0941\u0928_\u091C\u0941\u0932\u093E\u0908_\u0905\u0917\u0937\u094D\u091F_\u0938\u0947\u092A\u094D\u091F\u0947\u092E\u094D\u092C\u0930_\u0905\u0915\u094D\u091F\u094B\u092C\u0930_\u0928\u094B\u092D\u0947\u092E\u094D\u092C\u0930_\u0921\u093F\u0938\u0947\u092E\u094D\u092C\u0930'.split(
            '_',
          ),
        monthsShort:
          '\u091C\u0928._\u092B\u0947\u092C\u094D\u0930\u0941._\u092E\u093E\u0930\u094D\u091A_\u0905\u092A\u094D\u0930\u093F._\u092E\u0908_\u091C\u0941\u0928_\u091C\u0941\u0932\u093E\u0908._\u0905\u0917._\u0938\u0947\u092A\u094D\u091F._\u0905\u0915\u094D\u091F\u094B._\u0928\u094B\u092D\u0947._\u0921\u093F\u0938\u0947.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          '\u0906\u0907\u0924\u092C\u093E\u0930_\u0938\u094B\u092E\u092C\u093E\u0930_\u092E\u0919\u094D\u0917\u0932\u092C\u093E\u0930_\u092C\u0941\u0927\u092C\u093E\u0930_\u092C\u093F\u0939\u093F\u092C\u093E\u0930_\u0936\u0941\u0915\u094D\u0930\u092C\u093E\u0930_\u0936\u0928\u093F\u092C\u093E\u0930'.split(
            '_',
          ),
        weekdaysShort:
          '\u0906\u0907\u0924._\u0938\u094B\u092E._\u092E\u0919\u094D\u0917\u0932._\u092C\u0941\u0927._\u092C\u093F\u0939\u093F._\u0936\u0941\u0915\u094D\u0930._\u0936\u0928\u093F.'.split(
            '_',
          ),
        weekdaysMin:
          '\u0906._\u0938\u094B._\u092E\u0902._\u092C\u0941._\u092C\u093F._\u0936\u0941._\u0936.'.split(
            '_',
          ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'A\u0915\u094B h:mm \u092C\u091C\u0947',
          LTS: 'A\u0915\u094B h:mm:ss \u092C\u091C\u0947',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY, A\u0915\u094B h:mm \u092C\u091C\u0947',
          LLLL: 'dddd, D MMMM YYYY, A\u0915\u094B h:mm \u092C\u091C\u0947',
        },
        preparse: function (e) {
          return e.replace(/[१२३४५६७८९०]/g, function (s) {
            return ds[s]
          })
        },
        postformat: function (e) {
          return e.replace(/\d/g, function (s) {
            return pt[s]
          })
        },
        meridiemParse: /राति|बिहान|दिउँसो|साँझ/,
        meridiemHour: function (e, s) {
          if ((e === 12 && (e = 0), s === '\u0930\u093E\u0924\u093F'))
            return e < 4 ? e : e + 12
          if (s === '\u092C\u093F\u0939\u093E\u0928') return e
          if (s === '\u0926\u093F\u0909\u0901\u0938\u094B')
            return e >= 10 ? e : e + 12
          if (s === '\u0938\u093E\u0901\u091D') return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 3
            ? '\u0930\u093E\u0924\u093F'
            : e < 12
              ? '\u092C\u093F\u0939\u093E\u0928'
              : e < 16
                ? '\u0926\u093F\u0909\u0901\u0938\u094B'
                : e < 20
                  ? '\u0938\u093E\u0901\u091D'
                  : '\u0930\u093E\u0924\u093F'
        },
        calendar: {
          sameDay: '[\u0906\u091C] LT',
          nextDay: '[\u092D\u094B\u0932\u093F] LT',
          nextWeek: '[\u0906\u0909\u0901\u0926\u094B] dddd[,] LT',
          lastDay: '[\u0939\u093F\u091C\u094B] LT',
          lastWeek: '[\u0917\u090F\u0915\u094B] dddd[,] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s\u092E\u093E',
          past: '%s \u0905\u0917\u093E\u0921\u093F',
          s: '\u0915\u0947\u0939\u0940 \u0915\u094D\u0937\u0923',
          ss: '%d \u0938\u0947\u0915\u0947\u0923\u094D\u0921',
          m: '\u090F\u0915 \u092E\u093F\u0928\u0947\u091F',
          mm: '%d \u092E\u093F\u0928\u0947\u091F',
          h: '\u090F\u0915 \u0918\u0923\u094D\u091F\u093E',
          hh: '%d \u0918\u0923\u094D\u091F\u093E',
          d: '\u090F\u0915 \u0926\u093F\u0928',
          dd: '%d \u0926\u093F\u0928',
          M: '\u090F\u0915 \u092E\u0939\u093F\u0928\u093E',
          MM: '%d \u092E\u0939\u093F\u0928\u093E',
          y: '\u090F\u0915 \u092C\u0930\u094D\u0937',
          yy: '%d \u092C\u0930\u094D\u0937',
        },
        week: {dow: 0, doy: 6},
      })
      var Dt =
          'jan._feb._mrt._apr._mei_jun._jul._aug._sep._okt._nov._dec.'.split(
            '_',
          ),
        is = 'jan_feb_mrt_apr_mei_jun_jul_aug_sep_okt_nov_dec'.split('_'),
        Ba = [
          /^jan/i,
          /^feb/i,
          /^(maart|mrt\.?)$/i,
          /^apr/i,
          /^mei$/i,
          /^jun[i.]?$/i,
          /^jul[i.]?$/i,
          /^aug/i,
          /^sep/i,
          /^okt/i,
          /^nov/i,
          /^dec/i,
        ],
        Tt =
          /^(januari|februari|maart|april|mei|ju[nl]i|augustus|september|oktober|november|december|jan\.?|feb\.?|mrt\.?|apr\.?|ju[nl]\.?|aug\.?|sep\.?|okt\.?|nov\.?|dec\.?)/i
      u.defineLocale('nl-be', {
        months:
          'januari_februari_maart_april_mei_juni_juli_augustus_september_oktober_november_december'.split(
            '_',
          ),
        monthsShort: function (e, s) {
          return e ? (/-MMM-/.test(s) ? is[e.month()] : Dt[e.month()]) : Dt
        },
        monthsRegex: Tt,
        monthsShortRegex: Tt,
        monthsStrictRegex:
          /^(januari|februari|maart|april|mei|ju[nl]i|augustus|september|oktober|november|december)/i,
        monthsShortStrictRegex:
          /^(jan\.?|feb\.?|mrt\.?|apr\.?|mei|ju[nl]\.?|aug\.?|sep\.?|okt\.?|nov\.?|dec\.?)/i,
        monthsParse: Ba,
        longMonthsParse: Ba,
        shortMonthsParse: Ba,
        weekdays:
          'zondag_maandag_dinsdag_woensdag_donderdag_vrijdag_zaterdag'.split(
            '_',
          ),
        weekdaysShort: 'zo._ma._di._wo._do._vr._za.'.split('_'),
        weekdaysMin: 'zo_ma_di_wo_do_vr_za'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[vandaag om] LT',
          nextDay: '[morgen om] LT',
          nextWeek: 'dddd [om] LT',
          lastDay: '[gisteren om] LT',
          lastWeek: '[afgelopen] dddd [om] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'over %s',
          past: '%s geleden',
          s: 'een paar seconden',
          ss: '%d seconden',
          m: '\xE9\xE9n minuut',
          mm: '%d minuten',
          h: '\xE9\xE9n uur',
          hh: '%d uur',
          d: '\xE9\xE9n dag',
          dd: '%d dagen',
          M: '\xE9\xE9n maand',
          MM: '%d maanden',
          y: '\xE9\xE9n jaar',
          yy: '%d jaar',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(ste|de)/,
        ordinal: function (e) {
          return e + (e === 1 || e === 8 || e >= 20 ? 'ste' : 'de')
        },
        week: {dow: 1, doy: 4},
      })
      var wt =
          'jan._feb._mrt._apr._mei_jun._jul._aug._sep._okt._nov._dec.'.split(
            '_',
          ),
        _s = 'jan_feb_mrt_apr_mei_jun_jul_aug_sep_okt_nov_dec'.split('_'),
        Za = [
          /^jan/i,
          /^feb/i,
          /^(maart|mrt\.?)$/i,
          /^apr/i,
          /^mei$/i,
          /^jun[i.]?$/i,
          /^jul[i.]?$/i,
          /^aug/i,
          /^sep/i,
          /^okt/i,
          /^nov/i,
          /^dec/i,
        ],
        gt =
          /^(januari|februari|maart|april|mei|ju[nl]i|augustus|september|oktober|november|december|jan\.?|feb\.?|mrt\.?|apr\.?|ju[nl]\.?|aug\.?|sep\.?|okt\.?|nov\.?|dec\.?)/i
      u.defineLocale('nl', {
        months:
          'januari_februari_maart_april_mei_juni_juli_augustus_september_oktober_november_december'.split(
            '_',
          ),
        monthsShort: function (e, s) {
          return e ? (/-MMM-/.test(s) ? _s[e.month()] : wt[e.month()]) : wt
        },
        monthsRegex: gt,
        monthsShortRegex: gt,
        monthsStrictRegex:
          /^(januari|februari|maart|april|mei|ju[nl]i|augustus|september|oktober|november|december)/i,
        monthsShortStrictRegex:
          /^(jan\.?|feb\.?|mrt\.?|apr\.?|mei|ju[nl]\.?|aug\.?|sep\.?|okt\.?|nov\.?|dec\.?)/i,
        monthsParse: Za,
        longMonthsParse: Za,
        shortMonthsParse: Za,
        weekdays:
          'zondag_maandag_dinsdag_woensdag_donderdag_vrijdag_zaterdag'.split(
            '_',
          ),
        weekdaysShort: 'zo._ma._di._wo._do._vr._za.'.split('_'),
        weekdaysMin: 'zo_ma_di_wo_do_vr_za'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD-MM-YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[vandaag om] LT',
          nextDay: '[morgen om] LT',
          nextWeek: 'dddd [om] LT',
          lastDay: '[gisteren om] LT',
          lastWeek: '[afgelopen] dddd [om] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'over %s',
          past: '%s geleden',
          s: 'een paar seconden',
          ss: '%d seconden',
          m: '\xE9\xE9n minuut',
          mm: '%d minuten',
          h: '\xE9\xE9n uur',
          hh: '%d uur',
          d: '\xE9\xE9n dag',
          dd: '%d dagen',
          w: '\xE9\xE9n week',
          ww: '%d weken',
          M: '\xE9\xE9n maand',
          MM: '%d maanden',
          y: '\xE9\xE9n jaar',
          yy: '%d jaar',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(ste|de)/,
        ordinal: function (e) {
          return e + (e === 1 || e === 8 || e >= 20 ? 'ste' : 'de')
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('nn', {
        months:
          'januar_februar_mars_april_mai_juni_juli_august_september_oktober_november_desember'.split(
            '_',
          ),
        monthsShort:
          'jan._feb._mars_apr._mai_juni_juli_aug._sep._okt._nov._des.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays: 'sundag_m\xE5ndag_tysdag_onsdag_torsdag_fredag_laurdag'.split(
          '_',
        ),
        weekdaysShort: 'su._m\xE5._ty._on._to._fr._lau.'.split('_'),
        weekdaysMin: 'su_m\xE5_ty_on_to_fr_la'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY [kl.] H:mm',
          LLLL: 'dddd D. MMMM YYYY [kl.] HH:mm',
        },
        calendar: {
          sameDay: '[I dag klokka] LT',
          nextDay: '[I morgon klokka] LT',
          nextWeek: 'dddd [klokka] LT',
          lastDay: '[I g\xE5r klokka] LT',
          lastWeek: '[F\xF8reg\xE5ande] dddd [klokka] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'om %s',
          past: '%s sidan',
          s: 'nokre sekund',
          ss: '%d sekund',
          m: 'eit minutt',
          mm: '%d minutt',
          h: 'ein time',
          hh: '%d timar',
          d: 'ein dag',
          dd: '%d dagar',
          w: 'ei veke',
          ww: '%d veker',
          M: 'ein m\xE5nad',
          MM: '%d m\xE5nader',
          y: 'eit \xE5r',
          yy: '%d \xE5r',
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('oc-lnc', {
        months: {
          standalone:
            'geni\xE8r_febri\xE8r_mar\xE7_abril_mai_junh_julhet_agost_setembre_oct\xF2bre_novembre_decembre'.split(
              '_',
            ),
          format:
            "de geni\xE8r_de febri\xE8r_de mar\xE7_d'abril_de mai_de junh_de julhet_d'agost_de setembre_d'oct\xF2bre_de novembre_de decembre".split(
              '_',
            ),
          isFormat: /D[oD]?(\s)+MMMM/,
        },
        monthsShort:
          'gen._febr._mar\xE7_abr._mai_junh_julh._ago._set._oct._nov._dec.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'dimenge_diluns_dimars_dim\xE8cres_dij\xF2us_divendres_dissabte'.split(
            '_',
          ),
        weekdaysShort: 'dg._dl._dm._dc._dj._dv._ds.'.split('_'),
        weekdaysMin: 'dg_dl_dm_dc_dj_dv_ds'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM [de] YYYY',
          ll: 'D MMM YYYY',
          LLL: 'D MMMM [de] YYYY [a] H:mm',
          lll: 'D MMM YYYY, H:mm',
          LLLL: 'dddd D MMMM [de] YYYY [a] H:mm',
          llll: 'ddd D MMM YYYY, H:mm',
        },
        calendar: {
          sameDay: '[u\xE8i a] LT',
          nextDay: '[deman a] LT',
          nextWeek: 'dddd [a] LT',
          lastDay: '[i\xE8r a] LT',
          lastWeek: 'dddd [passat a] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: "d'aqu\xED %s",
          past: 'fa %s',
          s: 'unas segondas',
          ss: '%d segondas',
          m: 'una minuta',
          mm: '%d minutas',
          h: 'una ora',
          hh: '%d oras',
          d: 'un jorn',
          dd: '%d jorns',
          M: 'un mes',
          MM: '%d meses',
          y: 'un an',
          yy: '%d ans',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(r|n|t|è|a)/,
        ordinal: function (e, s) {
          var i =
            e === 1
              ? 'r'
              : e === 2
                ? 'n'
                : e === 3
                  ? 'r'
                  : e === 4
                    ? 't'
                    : '\xE8'
          return ((s === 'w' || s === 'W') && (i = 'a'), e + i)
        },
        week: {dow: 1, doy: 4},
      })
      var os = {
          1: '\u0A67',
          2: '\u0A68',
          3: '\u0A69',
          4: '\u0A6A',
          5: '\u0A6B',
          6: '\u0A6C',
          7: '\u0A6D',
          8: '\u0A6E',
          9: '\u0A6F',
          0: '\u0A66',
        },
        ls = {
          '\u0A67': '1',
          '\u0A68': '2',
          '\u0A69': '3',
          '\u0A6A': '4',
          '\u0A6B': '5',
          '\u0A6C': '6',
          '\u0A6D': '7',
          '\u0A6E': '8',
          '\u0A6F': '9',
          '\u0A66': '0',
        }
      u.defineLocale('pa-in', {
        months:
          '\u0A1C\u0A28\u0A35\u0A30\u0A40_\u0A2B\u0A3C\u0A30\u0A35\u0A30\u0A40_\u0A2E\u0A3E\u0A30\u0A1A_\u0A05\u0A2A\u0A4D\u0A30\u0A48\u0A32_\u0A2E\u0A08_\u0A1C\u0A42\u0A28_\u0A1C\u0A41\u0A32\u0A3E\u0A08_\u0A05\u0A17\u0A38\u0A24_\u0A38\u0A24\u0A70\u0A2C\u0A30_\u0A05\u0A15\u0A24\u0A42\u0A2C\u0A30_\u0A28\u0A35\u0A70\u0A2C\u0A30_\u0A26\u0A38\u0A70\u0A2C\u0A30'.split(
            '_',
          ),
        monthsShort:
          '\u0A1C\u0A28\u0A35\u0A30\u0A40_\u0A2B\u0A3C\u0A30\u0A35\u0A30\u0A40_\u0A2E\u0A3E\u0A30\u0A1A_\u0A05\u0A2A\u0A4D\u0A30\u0A48\u0A32_\u0A2E\u0A08_\u0A1C\u0A42\u0A28_\u0A1C\u0A41\u0A32\u0A3E\u0A08_\u0A05\u0A17\u0A38\u0A24_\u0A38\u0A24\u0A70\u0A2C\u0A30_\u0A05\u0A15\u0A24\u0A42\u0A2C\u0A30_\u0A28\u0A35\u0A70\u0A2C\u0A30_\u0A26\u0A38\u0A70\u0A2C\u0A30'.split(
            '_',
          ),
        weekdays:
          '\u0A10\u0A24\u0A35\u0A3E\u0A30_\u0A38\u0A4B\u0A2E\u0A35\u0A3E\u0A30_\u0A2E\u0A70\u0A17\u0A32\u0A35\u0A3E\u0A30_\u0A2C\u0A41\u0A27\u0A35\u0A3E\u0A30_\u0A35\u0A40\u0A30\u0A35\u0A3E\u0A30_\u0A38\u0A3C\u0A41\u0A71\u0A15\u0A30\u0A35\u0A3E\u0A30_\u0A38\u0A3C\u0A28\u0A40\u0A1A\u0A30\u0A35\u0A3E\u0A30'.split(
            '_',
          ),
        weekdaysShort:
          '\u0A10\u0A24_\u0A38\u0A4B\u0A2E_\u0A2E\u0A70\u0A17\u0A32_\u0A2C\u0A41\u0A27_\u0A35\u0A40\u0A30_\u0A38\u0A3C\u0A41\u0A15\u0A30_\u0A38\u0A3C\u0A28\u0A40'.split(
            '_',
          ),
        weekdaysMin:
          '\u0A10\u0A24_\u0A38\u0A4B\u0A2E_\u0A2E\u0A70\u0A17\u0A32_\u0A2C\u0A41\u0A27_\u0A35\u0A40\u0A30_\u0A38\u0A3C\u0A41\u0A15\u0A30_\u0A38\u0A3C\u0A28\u0A40'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'A h:mm \u0A35\u0A1C\u0A47',
          LTS: 'A h:mm:ss \u0A35\u0A1C\u0A47',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY, A h:mm \u0A35\u0A1C\u0A47',
          LLLL: 'dddd, D MMMM YYYY, A h:mm \u0A35\u0A1C\u0A47',
        },
        calendar: {
          sameDay: '[\u0A05\u0A1C] LT',
          nextDay: '[\u0A15\u0A32] LT',
          nextWeek: '[\u0A05\u0A17\u0A32\u0A3E] dddd, LT',
          lastDay: '[\u0A15\u0A32] LT',
          lastWeek: '[\u0A2A\u0A3F\u0A1B\u0A32\u0A47] dddd, LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u0A35\u0A3F\u0A71\u0A1A',
          past: '%s \u0A2A\u0A3F\u0A1B\u0A32\u0A47',
          s: '\u0A15\u0A41\u0A1D \u0A38\u0A15\u0A3F\u0A70\u0A1F',
          ss: '%d \u0A38\u0A15\u0A3F\u0A70\u0A1F',
          m: '\u0A07\u0A15 \u0A2E\u0A3F\u0A70\u0A1F',
          mm: '%d \u0A2E\u0A3F\u0A70\u0A1F',
          h: '\u0A07\u0A71\u0A15 \u0A18\u0A70\u0A1F\u0A3E',
          hh: '%d \u0A18\u0A70\u0A1F\u0A47',
          d: '\u0A07\u0A71\u0A15 \u0A26\u0A3F\u0A28',
          dd: '%d \u0A26\u0A3F\u0A28',
          M: '\u0A07\u0A71\u0A15 \u0A2E\u0A39\u0A40\u0A28\u0A3E',
          MM: '%d \u0A2E\u0A39\u0A40\u0A28\u0A47',
          y: '\u0A07\u0A71\u0A15 \u0A38\u0A3E\u0A32',
          yy: '%d \u0A38\u0A3E\u0A32',
        },
        preparse: function (e) {
          return e.replace(/[੧੨੩੪੫੬੭੮੯੦]/g, function (s) {
            return ls[s]
          })
        },
        postformat: function (e) {
          return e.replace(/\d/g, function (s) {
            return os[s]
          })
        },
        meridiemParse: /ਰਾਤ|ਸਵੇਰ|ਦੁਪਹਿਰ|ਸ਼ਾਮ/,
        meridiemHour: function (e, s) {
          if ((e === 12 && (e = 0), s === '\u0A30\u0A3E\u0A24'))
            return e < 4 ? e : e + 12
          if (s === '\u0A38\u0A35\u0A47\u0A30') return e
          if (s === '\u0A26\u0A41\u0A2A\u0A39\u0A3F\u0A30')
            return e >= 10 ? e : e + 12
          if (s === '\u0A38\u0A3C\u0A3E\u0A2E') return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u0A30\u0A3E\u0A24'
            : e < 10
              ? '\u0A38\u0A35\u0A47\u0A30'
              : e < 17
                ? '\u0A26\u0A41\u0A2A\u0A39\u0A3F\u0A30'
                : e < 20
                  ? '\u0A38\u0A3C\u0A3E\u0A2E'
                  : '\u0A30\u0A3E\u0A24'
        },
        week: {dow: 0, doy: 6},
      })
      var vt =
          'stycze\u0144_luty_marzec_kwiecie\u0144_maj_czerwiec_lipiec_sierpie\u0144_wrzesie\u0144_pa\u017Adziernik_listopad_grudzie\u0144'.split(
            '_',
          ),
        us =
          'stycznia_lutego_marca_kwietnia_maja_czerwca_lipca_sierpnia_wrze\u015Bnia_pa\u017Adziernika_listopada_grudnia'.split(
            '_',
          ),
        Ka = [
          /^sty/i,
          /^lut/i,
          /^mar/i,
          /^kwi/i,
          /^maj/i,
          /^cze/i,
          /^lip/i,
          /^sie/i,
          /^wrz/i,
          /^paź/i,
          /^lis/i,
          /^gru/i,
        ]
      function qe(e) {
        return e % 10 < 5 && e % 10 > 1 && ~~(e / 10) % 10 !== 1
      }
      function Le(e, s, i) {
        var _ = e + ' '
        switch (i) {
          case 'ss':
            return _ + (qe(e) ? 'sekundy' : 'sekund')
          case 'm':
            return s ? 'minuta' : 'minut\u0119'
          case 'mm':
            return _ + (qe(e) ? 'minuty' : 'minut')
          case 'h':
            return s ? 'godzina' : 'godzin\u0119'
          case 'hh':
            return _ + (qe(e) ? 'godziny' : 'godzin')
          case 'ww':
            return _ + (qe(e) ? 'tygodnie' : 'tygodni')
          case 'MM':
            return _ + (qe(e) ? 'miesi\u0105ce' : 'miesi\u0119cy')
          case 'yy':
            return _ + (qe(e) ? 'lata' : 'lat')
        }
      }
      u.defineLocale('pl', {
        months: function (e, s) {
          return e ? (/D MMMM/.test(s) ? us[e.month()] : vt[e.month()]) : vt
        },
        monthsShort:
          'sty_lut_mar_kwi_maj_cze_lip_sie_wrz_pa\u017A_lis_gru'.split('_'),
        monthsParse: Ka,
        longMonthsParse: Ka,
        shortMonthsParse: Ka,
        weekdays:
          'niedziela_poniedzia\u0142ek_wtorek_\u015Broda_czwartek_pi\u0105tek_sobota'.split(
            '_',
          ),
        weekdaysShort: 'ndz_pon_wt_\u015Br_czw_pt_sob'.split('_'),
        weekdaysMin: 'Nd_Pn_Wt_\u015Ar_Cz_Pt_So'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Dzi\u015B o] LT',
          nextDay: '[Jutro o] LT',
          nextWeek: function () {
            switch (this.day()) {
              case 0:
                return '[W niedziel\u0119 o] LT'
              case 2:
                return '[We wtorek o] LT'
              case 3:
                return '[W \u015Brod\u0119 o] LT'
              case 6:
                return '[W sobot\u0119 o] LT'
              default:
                return '[W] dddd [o] LT'
            }
          },
          lastDay: '[Wczoraj o] LT',
          lastWeek: function () {
            switch (this.day()) {
              case 0:
                return '[W zesz\u0142\u0105 niedziel\u0119 o] LT'
              case 3:
                return '[W zesz\u0142\u0105 \u015Brod\u0119 o] LT'
              case 6:
                return '[W zesz\u0142\u0105 sobot\u0119 o] LT'
              default:
                return '[W zesz\u0142y] dddd [o] LT'
            }
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'za %s',
          past: '%s temu',
          s: 'kilka sekund',
          ss: Le,
          m: Le,
          mm: Le,
          h: Le,
          hh: Le,
          d: '1 dzie\u0144',
          dd: '%d dni',
          w: 'tydzie\u0144',
          ww: Le,
          M: 'miesi\u0105c',
          MM: Le,
          y: 'rok',
          yy: Le,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('pt-br', {
        months:
          'janeiro_fevereiro_mar\xE7o_abril_maio_junho_julho_agosto_setembro_outubro_novembro_dezembro'.split(
            '_',
          ),
        monthsShort: 'jan_fev_mar_abr_mai_jun_jul_ago_set_out_nov_dez'.split(
          '_',
        ),
        weekdays:
          'domingo_segunda-feira_ter\xE7a-feira_quarta-feira_quinta-feira_sexta-feira_s\xE1bado'.split(
            '_',
          ),
        weekdaysShort: 'dom_seg_ter_qua_qui_sex_s\xE1b'.split('_'),
        weekdaysMin: 'do_2\xAA_3\xAA_4\xAA_5\xAA_6\xAA_s\xE1'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D [de] MMMM [de] YYYY',
          LLL: 'D [de] MMMM [de] YYYY [\xE0s] HH:mm',
          LLLL: 'dddd, D [de] MMMM [de] YYYY [\xE0s] HH:mm',
        },
        calendar: {
          sameDay: '[Hoje \xE0s] LT',
          nextDay: '[Amanh\xE3 \xE0s] LT',
          nextWeek: 'dddd [\xE0s] LT',
          lastDay: '[Ontem \xE0s] LT',
          lastWeek: function () {
            return this.day() === 0 || this.day() === 6
              ? '[\xDAltimo] dddd [\xE0s] LT'
              : '[\xDAltima] dddd [\xE0s] LT'
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'em %s',
          past: 'h\xE1 %s',
          s: 'poucos segundos',
          ss: '%d segundos',
          m: 'um minuto',
          mm: '%d minutos',
          h: 'uma hora',
          hh: '%d horas',
          d: 'um dia',
          dd: '%d dias',
          M: 'um m\xEAs',
          MM: '%d meses',
          y: 'um ano',
          yy: '%d anos',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%d\xBA',
        invalidDate: 'Data inv\xE1lida',
      })
      u.defineLocale('pt', {
        months:
          'janeiro_fevereiro_mar\xE7o_abril_maio_junho_julho_agosto_setembro_outubro_novembro_dezembro'.split(
            '_',
          ),
        monthsShort: 'jan_fev_mar_abr_mai_jun_jul_ago_set_out_nov_dez'.split(
          '_',
        ),
        weekdays:
          'Domingo_Segunda-feira_Ter\xE7a-feira_Quarta-feira_Quinta-feira_Sexta-feira_S\xE1bado'.split(
            '_',
          ),
        weekdaysShort: 'Dom_Seg_Ter_Qua_Qui_Sex_S\xE1b'.split('_'),
        weekdaysMin: 'Do_2\xAA_3\xAA_4\xAA_5\xAA_6\xAA_S\xE1'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D [de] MMMM [de] YYYY',
          LLL: 'D [de] MMMM [de] YYYY HH:mm',
          LLLL: 'dddd, D [de] MMMM [de] YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Hoje \xE0s] LT',
          nextDay: '[Amanh\xE3 \xE0s] LT',
          nextWeek: 'dddd [\xE0s] LT',
          lastDay: '[Ontem \xE0s] LT',
          lastWeek: function () {
            return this.day() === 0 || this.day() === 6
              ? '[\xDAltimo] dddd [\xE0s] LT'
              : '[\xDAltima] dddd [\xE0s] LT'
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'em %s',
          past: 'h\xE1 %s',
          s: 'segundos',
          ss: '%d segundos',
          m: 'um minuto',
          mm: '%d minutos',
          h: 'uma hora',
          hh: '%d horas',
          d: 'um dia',
          dd: '%d dias',
          w: 'uma semana',
          ww: '%d semanas',
          M: 'um m\xEAs',
          MM: '%d meses',
          y: 'um ano',
          yy: '%d anos',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%d\xBA',
        week: {dow: 1, doy: 4},
      })
      function we(e, s, i) {
        var _ = {
            ss: 'secunde',
            mm: 'minute',
            hh: 'ore',
            dd: 'zile',
            ww: 's\u0103pt\u0103m\xE2ni',
            MM: 'luni',
            yy: 'ani',
          },
          l = ' '
        return (
          (e % 100 >= 20 || (e >= 100 && e % 100 === 0)) && (l = ' de '),
          e + l + _[i]
        )
      }
      u.defineLocale('ro', {
        months:
          'ianuarie_februarie_martie_aprilie_mai_iunie_iulie_august_septembrie_octombrie_noiembrie_decembrie'.split(
            '_',
          ),
        monthsShort:
          'ian._feb._mart._apr._mai_iun._iul._aug._sept._oct._nov._dec.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'duminic\u0103_luni_mar\u021Bi_miercuri_joi_vineri_s\xE2mb\u0103t\u0103'.split(
            '_',
          ),
        weekdaysShort: 'Dum_Lun_Mar_Mie_Joi_Vin_S\xE2m'.split('_'),
        weekdaysMin: 'Du_Lu_Ma_Mi_Jo_Vi_S\xE2'.split('_'),
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY H:mm',
          LLLL: 'dddd, D MMMM YYYY H:mm',
        },
        calendar: {
          sameDay: '[azi la] LT',
          nextDay: '[m\xE2ine la] LT',
          nextWeek: 'dddd [la] LT',
          lastDay: '[ieri la] LT',
          lastWeek: '[fosta] dddd [la] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'peste %s',
          past: '%s \xEEn urm\u0103',
          s: 'c\xE2teva secunde',
          ss: we,
          m: 'un minut',
          mm: we,
          h: 'o or\u0103',
          hh: we,
          d: 'o zi',
          dd: we,
          w: 'o s\u0103pt\u0103m\xE2n\u0103',
          ww: we,
          M: 'o lun\u0103',
          MM: we,
          y: 'un an',
          yy: we,
        },
        week: {dow: 1, doy: 7},
      })
      function ms(e, s) {
        var i = e.split('_')
        return s % 10 === 1 && s % 100 !== 11
          ? i[0]
          : s % 10 >= 2 && s % 10 <= 4 && (s % 100 < 10 || s % 100 >= 20)
            ? i[1]
            : i[2]
      }
      function ge(e, s, i) {
        var _ = {
          ss: s
            ? '\u0441\u0435\u043A\u0443\u043D\u0434\u0430_\u0441\u0435\u043A\u0443\u043D\u0434\u044B_\u0441\u0435\u043A\u0443\u043D\u0434'
            : '\u0441\u0435\u043A\u0443\u043D\u0434\u0443_\u0441\u0435\u043A\u0443\u043D\u0434\u044B_\u0441\u0435\u043A\u0443\u043D\u0434',
          mm: s
            ? '\u043C\u0438\u043D\u0443\u0442\u0430_\u043C\u0438\u043D\u0443\u0442\u044B_\u043C\u0438\u043D\u0443\u0442'
            : '\u043C\u0438\u043D\u0443\u0442\u0443_\u043C\u0438\u043D\u0443\u0442\u044B_\u043C\u0438\u043D\u0443\u0442',
          hh: '\u0447\u0430\u0441_\u0447\u0430\u0441\u0430_\u0447\u0430\u0441\u043E\u0432',
          dd: '\u0434\u0435\u043D\u044C_\u0434\u043D\u044F_\u0434\u043D\u0435\u0439',
          ww: '\u043D\u0435\u0434\u0435\u043B\u044F_\u043D\u0435\u0434\u0435\u043B\u0438_\u043D\u0435\u0434\u0435\u043B\u044C',
          MM: '\u043C\u0435\u0441\u044F\u0446_\u043C\u0435\u0441\u044F\u0446\u0430_\u043C\u0435\u0441\u044F\u0446\u0435\u0432',
          yy: '\u0433\u043E\u0434_\u0433\u043E\u0434\u0430_\u043B\u0435\u0442',
        }
        return i === 'm'
          ? s
            ? '\u043C\u0438\u043D\u0443\u0442\u0430'
            : '\u043C\u0438\u043D\u0443\u0442\u0443'
          : e + ' ' + ms(_[i], +e)
      }
      var ga = [
        /^янв/i,
        /^фев/i,
        /^мар/i,
        /^апр/i,
        /^ма[йя]/i,
        /^июн/i,
        /^июл/i,
        /^авг/i,
        /^сен/i,
        /^окт/i,
        /^ноя/i,
        /^дек/i,
      ]
      u.defineLocale('ru', {
        months: {
          format:
            '\u044F\u043D\u0432\u0430\u0440\u044F_\u0444\u0435\u0432\u0440\u0430\u043B\u044F_\u043C\u0430\u0440\u0442\u0430_\u0430\u043F\u0440\u0435\u043B\u044F_\u043C\u0430\u044F_\u0438\u044E\u043D\u044F_\u0438\u044E\u043B\u044F_\u0430\u0432\u0433\u0443\u0441\u0442\u0430_\u0441\u0435\u043D\u0442\u044F\u0431\u0440\u044F_\u043E\u043A\u0442\u044F\u0431\u0440\u044F_\u043D\u043E\u044F\u0431\u0440\u044F_\u0434\u0435\u043A\u0430\u0431\u0440\u044F'.split(
              '_',
            ),
          standalone:
            '\u044F\u043D\u0432\u0430\u0440\u044C_\u0444\u0435\u0432\u0440\u0430\u043B\u044C_\u043C\u0430\u0440\u0442_\u0430\u043F\u0440\u0435\u043B\u044C_\u043C\u0430\u0439_\u0438\u044E\u043D\u044C_\u0438\u044E\u043B\u044C_\u0430\u0432\u0433\u0443\u0441\u0442_\u0441\u0435\u043D\u0442\u044F\u0431\u0440\u044C_\u043E\u043A\u0442\u044F\u0431\u0440\u044C_\u043D\u043E\u044F\u0431\u0440\u044C_\u0434\u0435\u043A\u0430\u0431\u0440\u044C'.split(
              '_',
            ),
        },
        monthsShort: {
          format:
            '\u044F\u043D\u0432._\u0444\u0435\u0432\u0440._\u043C\u0430\u0440._\u0430\u043F\u0440._\u043C\u0430\u044F_\u0438\u044E\u043D\u044F_\u0438\u044E\u043B\u044F_\u0430\u0432\u0433._\u0441\u0435\u043D\u0442._\u043E\u043A\u0442._\u043D\u043E\u044F\u0431._\u0434\u0435\u043A.'.split(
              '_',
            ),
          standalone:
            '\u044F\u043D\u0432._\u0444\u0435\u0432\u0440._\u043C\u0430\u0440\u0442_\u0430\u043F\u0440._\u043C\u0430\u0439_\u0438\u044E\u043D\u044C_\u0438\u044E\u043B\u044C_\u0430\u0432\u0433._\u0441\u0435\u043D\u0442._\u043E\u043A\u0442._\u043D\u043E\u044F\u0431._\u0434\u0435\u043A.'.split(
              '_',
            ),
        },
        weekdays: {
          standalone:
            '\u0432\u043E\u0441\u043A\u0440\u0435\u0441\u0435\u043D\u044C\u0435_\u043F\u043E\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u0438\u043A_\u0432\u0442\u043E\u0440\u043D\u0438\u043A_\u0441\u0440\u0435\u0434\u0430_\u0447\u0435\u0442\u0432\u0435\u0440\u0433_\u043F\u044F\u0442\u043D\u0438\u0446\u0430_\u0441\u0443\u0431\u0431\u043E\u0442\u0430'.split(
              '_',
            ),
          format:
            '\u0432\u043E\u0441\u043A\u0440\u0435\u0441\u0435\u043D\u044C\u0435_\u043F\u043E\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u0438\u043A_\u0432\u0442\u043E\u0440\u043D\u0438\u043A_\u0441\u0440\u0435\u0434\u0443_\u0447\u0435\u0442\u0432\u0435\u0440\u0433_\u043F\u044F\u0442\u043D\u0438\u0446\u0443_\u0441\u0443\u0431\u0431\u043E\u0442\u0443'.split(
              '_',
            ),
          isFormat: /\[ ?[Вв] ?(?:прошлую|следующую|эту)? ?] ?dddd/,
        },
        weekdaysShort:
          '\u0432\u0441_\u043F\u043D_\u0432\u0442_\u0441\u0440_\u0447\u0442_\u043F\u0442_\u0441\u0431'.split(
            '_',
          ),
        weekdaysMin:
          '\u0432\u0441_\u043F\u043D_\u0432\u0442_\u0441\u0440_\u0447\u0442_\u043F\u0442_\u0441\u0431'.split(
            '_',
          ),
        monthsParse: ga,
        longMonthsParse: ga,
        shortMonthsParse: ga,
        monthsRegex:
          /^(январ[ья]|янв\.?|феврал[ья]|февр?\.?|марта?|мар\.?|апрел[ья]|апр\.?|ма[йя]|июн[ья]|июн\.?|июл[ья]|июл\.?|августа?|авг\.?|сентябр[ья]|сент?\.?|октябр[ья]|окт\.?|ноябр[ья]|нояб?\.?|декабр[ья]|дек\.?)/i,
        monthsShortRegex:
          /^(январ[ья]|янв\.?|феврал[ья]|февр?\.?|марта?|мар\.?|апрел[ья]|апр\.?|ма[йя]|июн[ья]|июн\.?|июл[ья]|июл\.?|августа?|авг\.?|сентябр[ья]|сент?\.?|октябр[ья]|окт\.?|ноябр[ья]|нояб?\.?|декабр[ья]|дек\.?)/i,
        monthsStrictRegex:
          /^(январ[яь]|феврал[яь]|марта?|апрел[яь]|ма[яй]|июн[яь]|июл[яь]|августа?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь])/i,
        monthsShortStrictRegex:
          /^(янв\.|февр?\.|мар[т.]|апр\.|ма[яй]|июн[ья.]|июл[ья.]|авг\.|сент?\.|окт\.|нояб?\.|дек\.)/i,
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY \u0433.',
          LLL: 'D MMMM YYYY \u0433., H:mm',
          LLLL: 'dddd, D MMMM YYYY \u0433., H:mm',
        },
        calendar: {
          sameDay: '[\u0421\u0435\u0433\u043E\u0434\u043D\u044F, \u0432] LT',
          nextDay: '[\u0417\u0430\u0432\u0442\u0440\u0430, \u0432] LT',
          lastDay: '[\u0412\u0447\u0435\u0440\u0430, \u0432] LT',
          nextWeek: function (e) {
            if (e.week() !== this.week())
              switch (this.day()) {
                case 0:
                  return '[\u0412 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0435] dddd, [\u0432] LT'
                case 1:
                case 2:
                case 4:
                  return '[\u0412 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439] dddd, [\u0432] LT'
                case 3:
                case 5:
                case 6:
                  return '[\u0412 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0443\u044E] dddd, [\u0432] LT'
              }
            else
              return this.day() === 2
                ? '[\u0412\u043E] dddd, [\u0432] LT'
                : '[\u0412] dddd, [\u0432] LT'
          },
          lastWeek: function (e) {
            if (e.week() !== this.week())
              switch (this.day()) {
                case 0:
                  return '[\u0412 \u043F\u0440\u043E\u0448\u043B\u043E\u0435] dddd, [\u0432] LT'
                case 1:
                case 2:
                case 4:
                  return '[\u0412 \u043F\u0440\u043E\u0448\u043B\u044B\u0439] dddd, [\u0432] LT'
                case 3:
                case 5:
                case 6:
                  return '[\u0412 \u043F\u0440\u043E\u0448\u043B\u0443\u044E] dddd, [\u0432] LT'
              }
            else
              return this.day() === 2
                ? '[\u0412\u043E] dddd, [\u0432] LT'
                : '[\u0412] dddd, [\u0432] LT'
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0447\u0435\u0440\u0435\u0437 %s',
          past: '%s \u043D\u0430\u0437\u0430\u0434',
          s: '\u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0435\u043A\u0443\u043D\u0434',
          ss: ge,
          m: ge,
          mm: ge,
          h: '\u0447\u0430\u0441',
          hh: ge,
          d: '\u0434\u0435\u043D\u044C',
          dd: ge,
          w: '\u043D\u0435\u0434\u0435\u043B\u044F',
          ww: ge,
          M: '\u043C\u0435\u0441\u044F\u0446',
          MM: ge,
          y: '\u0433\u043E\u0434',
          yy: ge,
        },
        meridiemParse: /ночи|утра|дня|вечера/i,
        isPM: function (e) {
          return /^(дня|вечера)$/.test(e)
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u043D\u043E\u0447\u0438'
            : e < 12
              ? '\u0443\u0442\u0440\u0430'
              : e < 17
                ? '\u0434\u043D\u044F'
                : '\u0432\u0435\u0447\u0435\u0440\u0430'
        },
        dayOfMonthOrdinalParse: /\d{1,2}-(й|го|я)/,
        ordinal: function (e, s) {
          switch (s) {
            case 'M':
            case 'd':
            case 'DDD':
              return e + '-\u0439'
            case 'D':
              return e + '-\u0433\u043E'
            case 'w':
            case 'W':
              return e + '-\u044F'
            default:
              return e
          }
        },
        week: {dow: 1, doy: 4},
      })
      var Ht = [
          '\u062C\u0646\u0648\u0631\u064A',
          '\u0641\u064A\u0628\u0631\u0648\u0631\u064A',
          '\u0645\u0627\u0631\u0686',
          '\u0627\u067E\u0631\u064A\u0644',
          '\u0645\u0626\u064A',
          '\u062C\u0648\u0646',
          '\u062C\u0648\u0644\u0627\u0621\u0650',
          '\u0622\u06AF\u0633\u067D',
          '\u0633\u064A\u067E\u067D\u0645\u0628\u0631',
          '\u0622\u06AA\u067D\u0648\u0628\u0631',
          '\u0646\u0648\u0645\u0628\u0631',
          '\u068A\u0633\u0645\u0628\u0631',
        ],
        Qa = [
          '\u0622\u0686\u0631',
          '\u0633\u0648\u0645\u0631',
          '\u0627\u06B1\u0627\u0631\u0648',
          '\u0627\u0631\u0628\u0639',
          '\u062E\u0645\u064A\u0633',
          '\u062C\u0645\u0639',
          '\u0687\u0646\u0687\u0631',
        ]
      u.defineLocale('sd', {
        months: Ht,
        monthsShort: Ht,
        weekdays: Qa,
        weekdaysShort: Qa,
        weekdaysMin: Qa,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd\u060C D MMMM YYYY HH:mm',
        },
        meridiemParse: /صبح|شام/,
        isPM: function (e) {
          return e === '\u0634\u0627\u0645'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? '\u0635\u0628\u062D' : '\u0634\u0627\u0645'
        },
        calendar: {
          sameDay: '[\u0627\u0684] LT',
          nextDay: '[\u0633\u0680\u0627\u06BB\u064A] LT',
          nextWeek:
            'dddd [\u0627\u06B3\u064A\u0646 \u0647\u0641\u062A\u064A \u062A\u064A] LT',
          lastDay: '[\u06AA\u0627\u0644\u0647\u0647] LT',
          lastWeek:
            '[\u06AF\u0632\u0631\u064A\u0644 \u0647\u0641\u062A\u064A] dddd [\u062A\u064A] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u067E\u0648\u0621',
          past: '%s \u0627\u06B3',
          s: '\u0686\u0646\u062F \u0633\u064A\u06AA\u0646\u068A',
          ss: '%d \u0633\u064A\u06AA\u0646\u068A',
          m: '\u0647\u06AA \u0645\u0646\u067D',
          mm: '%d \u0645\u0646\u067D',
          h: '\u0647\u06AA \u06AA\u0644\u0627\u06AA',
          hh: '%d \u06AA\u0644\u0627\u06AA',
          d: '\u0647\u06AA \u068F\u064A\u0646\u0647\u0646',
          dd: '%d \u068F\u064A\u0646\u0647\u0646',
          M: '\u0647\u06AA \u0645\u0647\u064A\u0646\u0648',
          MM: '%d \u0645\u0647\u064A\u0646\u0627',
          y: '\u0647\u06AA \u0633\u0627\u0644',
          yy: '%d \u0633\u0627\u0644',
        },
        preparse: function (e) {
          return e.replace(/،/g, ',')
        },
        postformat: function (e) {
          return e.replace(/,/g, '\u060C')
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('se', {
        months:
          'o\u0111\u0111ajagem\xE1nnu_guovvam\xE1nnu_njuk\u010Dam\xE1nnu_cuo\u014Bom\xE1nnu_miessem\xE1nnu_geassem\xE1nnu_suoidnem\xE1nnu_borgem\xE1nnu_\u010Dak\u010Dam\xE1nnu_golggotm\xE1nnu_sk\xE1bmam\xE1nnu_juovlam\xE1nnu'.split(
            '_',
          ),
        monthsShort:
          'o\u0111\u0111j_guov_njuk_cuo_mies_geas_suoi_borg_\u010Dak\u010D_golg_sk\xE1b_juov'.split(
            '_',
          ),
        weekdays:
          'sotnabeaivi_vuoss\xE1rga_ma\u014B\u014Beb\xE1rga_gaskavahkku_duorastat_bearjadat_l\xE1vvardat'.split(
            '_',
          ),
        weekdaysShort: 'sotn_vuos_ma\u014B_gask_duor_bear_l\xE1v'.split('_'),
        weekdaysMin: 's_v_m_g_d_b_L'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'MMMM D. [b.] YYYY',
          LLL: 'MMMM D. [b.] YYYY [ti.] HH:mm',
          LLLL: 'dddd, MMMM D. [b.] YYYY [ti.] HH:mm',
        },
        calendar: {
          sameDay: '[otne ti] LT',
          nextDay: '[ihttin ti] LT',
          nextWeek: 'dddd [ti] LT',
          lastDay: '[ikte ti] LT',
          lastWeek: '[ovddit] dddd [ti] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s gea\u017Ees',
          past: 'ma\u014Bit %s',
          s: 'moadde sekunddat',
          ss: '%d sekunddat',
          m: 'okta minuhta',
          mm: '%d minuhtat',
          h: 'okta diimmu',
          hh: '%d diimmut',
          d: 'okta beaivi',
          dd: '%d beaivvit',
          M: 'okta m\xE1nnu',
          MM: '%d m\xE1nut',
          y: 'okta jahki',
          yy: '%d jagit',
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('si', {
        months:
          '\u0DA2\u0DB1\u0DC0\u0DCF\u0DBB\u0DD2_\u0DB4\u0DD9\u0DB6\u0DBB\u0DC0\u0DCF\u0DBB\u0DD2_\u0DB8\u0DCF\u0DBB\u0DCA\u0DAD\u0DD4_\u0D85\u0DB4\u0DCA\u200D\u0DBB\u0DDA\u0DBD\u0DCA_\u0DB8\u0DD0\u0DBA\u0DD2_\u0DA2\u0DD6\u0DB1\u0DD2_\u0DA2\u0DD6\u0DBD\u0DD2_\u0D85\u0D9C\u0DDD\u0DC3\u0DCA\u0DAD\u0DD4_\u0DC3\u0DD0\u0DB4\u0DCA\u0DAD\u0DD0\u0DB8\u0DCA\u0DB6\u0DBB\u0DCA_\u0D94\u0D9A\u0DCA\u0DAD\u0DDD\u0DB6\u0DBB\u0DCA_\u0DB1\u0DDC\u0DC0\u0DD0\u0DB8\u0DCA\u0DB6\u0DBB\u0DCA_\u0DAF\u0DD9\u0DC3\u0DD0\u0DB8\u0DCA\u0DB6\u0DBB\u0DCA'.split(
            '_',
          ),
        monthsShort:
          '\u0DA2\u0DB1_\u0DB4\u0DD9\u0DB6_\u0DB8\u0DCF\u0DBB\u0DCA_\u0D85\u0DB4\u0DCA_\u0DB8\u0DD0\u0DBA\u0DD2_\u0DA2\u0DD6\u0DB1\u0DD2_\u0DA2\u0DD6\u0DBD\u0DD2_\u0D85\u0D9C\u0DDD_\u0DC3\u0DD0\u0DB4\u0DCA_\u0D94\u0D9A\u0DCA_\u0DB1\u0DDC\u0DC0\u0DD0_\u0DAF\u0DD9\u0DC3\u0DD0'.split(
            '_',
          ),
        weekdays:
          '\u0D89\u0DBB\u0DD2\u0DAF\u0DCF_\u0DC3\u0DB3\u0DD4\u0DAF\u0DCF_\u0D85\u0D9F\u0DC4\u0DBB\u0DD4\u0DC0\u0DCF\u0DAF\u0DCF_\u0DB6\u0DAF\u0DCF\u0DAF\u0DCF_\u0DB6\u0DCA\u200D\u0DBB\u0DC4\u0DC3\u0DCA\u0DB4\u0DAD\u0DD2\u0DB1\u0DCA\u0DAF\u0DCF_\u0DC3\u0DD2\u0D9A\u0DD4\u0DBB\u0DCF\u0DAF\u0DCF_\u0DC3\u0DD9\u0DB1\u0DC3\u0DD4\u0DBB\u0DCF\u0DAF\u0DCF'.split(
            '_',
          ),
        weekdaysShort:
          '\u0D89\u0DBB\u0DD2_\u0DC3\u0DB3\u0DD4_\u0D85\u0D9F_\u0DB6\u0DAF\u0DCF_\u0DB6\u0DCA\u200D\u0DBB\u0DC4_\u0DC3\u0DD2\u0D9A\u0DD4_\u0DC3\u0DD9\u0DB1'.split(
            '_',
          ),
        weekdaysMin:
          '\u0D89_\u0DC3_\u0D85_\u0DB6_\u0DB6\u0DCA\u200D\u0DBB_\u0DC3\u0DD2_\u0DC3\u0DD9'.split(
            '_',
          ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'a h:mm',
          LTS: 'a h:mm:ss',
          L: 'YYYY/MM/DD',
          LL: 'YYYY MMMM D',
          LLL: 'YYYY MMMM D, a h:mm',
          LLLL: 'YYYY MMMM D [\u0DC0\u0DD0\u0DB1\u0DD2] dddd, a h:mm:ss',
        },
        calendar: {
          sameDay: '[\u0D85\u0DAF] LT[\u0DA7]',
          nextDay: '[\u0DC4\u0DD9\u0DA7] LT[\u0DA7]',
          nextWeek: 'dddd LT[\u0DA7]',
          lastDay: '[\u0D8A\u0DBA\u0DDA] LT[\u0DA7]',
          lastWeek: '[\u0DB4\u0DC3\u0DD4\u0D9C\u0DD2\u0DBA] dddd LT[\u0DA7]',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s\u0D9A\u0DD2\u0DB1\u0DCA',
          past: '%s\u0D9A\u0DA7 \u0DB4\u0DD9\u0DBB',
          s: '\u0DAD\u0DAD\u0DCA\u0DB4\u0DBB \u0D9A\u0DD2\u0DC4\u0DD2\u0DB4\u0DBA',
          ss: '\u0DAD\u0DAD\u0DCA\u0DB4\u0DBB %d',
          m: '\u0DB8\u0DD2\u0DB1\u0DD2\u0DAD\u0DCA\u0DAD\u0DD4\u0DC0',
          mm: '\u0DB8\u0DD2\u0DB1\u0DD2\u0DAD\u0DCA\u0DAD\u0DD4 %d',
          h: '\u0DB4\u0DD0\u0DBA',
          hh: '\u0DB4\u0DD0\u0DBA %d',
          d: '\u0DAF\u0DD2\u0DB1\u0DBA',
          dd: '\u0DAF\u0DD2\u0DB1 %d',
          M: '\u0DB8\u0DCF\u0DC3\u0DBA',
          MM: '\u0DB8\u0DCF\u0DC3 %d',
          y: '\u0DC0\u0DC3\u0DBB',
          yy: '\u0DC0\u0DC3\u0DBB %d',
        },
        dayOfMonthOrdinalParse: /\d{1,2} වැනි/,
        ordinal: function (e) {
          return e + ' \u0DC0\u0DD0\u0DB1\u0DD2'
        },
        meridiemParse: /පෙර වරු|පස් වරු|පෙ.ව|ප.ව./,
        isPM: function (e) {
          return (
            e === '\u0DB4.\u0DC0.' ||
            e === '\u0DB4\u0DC3\u0DCA \u0DC0\u0DBB\u0DD4'
          )
        },
        meridiem: function (e, s, i) {
          return e > 11
            ? i
              ? '\u0DB4.\u0DC0.'
              : '\u0DB4\u0DC3\u0DCA \u0DC0\u0DBB\u0DD4'
            : i
              ? '\u0DB4\u0DD9.\u0DC0.'
              : '\u0DB4\u0DD9\u0DBB \u0DC0\u0DBB\u0DD4'
        },
      })
      var Ms =
          'janu\xE1r_febru\xE1r_marec_apr\xEDl_m\xE1j_j\xFAn_j\xFAl_august_september_okt\xF3ber_november_december'.split(
            '_',
          ),
        hs = 'jan_feb_mar_apr_m\xE1j_j\xFAn_j\xFAl_aug_sep_okt_nov_dec'.split(
          '_',
        )
      function xe(e) {
        return e > 1 && e < 5
      }
      function p(e, s, i, _) {
        var l = e + ' '
        switch (i) {
          case 's':
            return s || _ ? 'p\xE1r sek\xFAnd' : 'p\xE1r sekundami'
          case 'ss':
            return s || _
              ? l + (xe(e) ? 'sekundy' : 'sek\xFAnd')
              : l + 'sekundami'
          case 'm':
            return s ? 'min\xFAta' : _ ? 'min\xFAtu' : 'min\xFAtou'
          case 'mm':
            return s || _
              ? l + (xe(e) ? 'min\xFAty' : 'min\xFAt')
              : l + 'min\xFAtami'
          case 'h':
            return s ? 'hodina' : _ ? 'hodinu' : 'hodinou'
          case 'hh':
            return s || _ ? l + (xe(e) ? 'hodiny' : 'hod\xEDn') : l + 'hodinami'
          case 'd':
            return s || _ ? 'de\u0148' : 'd\u0148om'
          case 'dd':
            return s || _ ? l + (xe(e) ? 'dni' : 'dn\xED') : l + 'd\u0148ami'
          case 'M':
            return s || _ ? 'mesiac' : 'mesiacom'
          case 'MM':
            return s || _
              ? l + (xe(e) ? 'mesiace' : 'mesiacov')
              : l + 'mesiacmi'
          case 'y':
            return s || _ ? 'rok' : 'rokom'
          case 'yy':
            return s || _ ? l + (xe(e) ? 'roky' : 'rokov') : l + 'rokmi'
        }
      }
      u.defineLocale('sk', {
        months: Ms,
        monthsShort: hs,
        weekdays:
          'nede\u013Ea_pondelok_utorok_streda_\u0161tvrtok_piatok_sobota'.split(
            '_',
          ),
        weekdaysShort: 'ne_po_ut_st_\u0161t_pi_so'.split('_'),
        weekdaysMin: 'ne_po_ut_st_\u0161t_pi_so'.split('_'),
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY H:mm',
          LLLL: 'dddd D. MMMM YYYY H:mm',
        },
        calendar: {
          sameDay: '[dnes o] LT',
          nextDay: '[zajtra o] LT',
          nextWeek: function () {
            switch (this.day()) {
              case 0:
                return '[v nede\u013Eu o] LT'
              case 1:
              case 2:
                return '[v] dddd [o] LT'
              case 3:
                return '[v stredu o] LT'
              case 4:
                return '[vo \u0161tvrtok o] LT'
              case 5:
                return '[v piatok o] LT'
              case 6:
                return '[v sobotu o] LT'
            }
          },
          lastDay: '[v\u010Dera o] LT',
          lastWeek: function () {
            switch (this.day()) {
              case 0:
                return '[minul\xFA nede\u013Eu o] LT'
              case 1:
              case 2:
                return '[minul\xFD] dddd [o] LT'
              case 3:
                return '[minul\xFA stredu o] LT'
              case 4:
              case 5:
                return '[minul\xFD] dddd [o] LT'
              case 6:
                return '[minul\xFA sobotu o] LT'
            }
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'za %s',
          past: 'pred %s',
          s: p,
          ss: p,
          m: p,
          mm: p,
          h: p,
          hh: p,
          d: p,
          dd: p,
          M: p,
          MM: p,
          y: p,
          yy: p,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      function N(e, s, i, _) {
        var l = e + ' '
        switch (i) {
          case 's':
            return s || _ ? 'nekaj sekund' : 'nekaj sekundami'
          case 'ss':
            return (
              e === 1
                ? (l += s ? 'sekundo' : 'sekundi')
                : e === 2
                  ? (l += s || _ ? 'sekundi' : 'sekundah')
                  : e < 5
                    ? (l += s || _ ? 'sekunde' : 'sekundah')
                    : (l += 'sekund'),
              l
            )
          case 'm':
            return s ? 'ena minuta' : 'eno minuto'
          case 'mm':
            return (
              e === 1
                ? (l += s ? 'minuta' : 'minuto')
                : e === 2
                  ? (l += s || _ ? 'minuti' : 'minutama')
                  : e < 5
                    ? (l += s || _ ? 'minute' : 'minutami')
                    : (l += s || _ ? 'minut' : 'minutami'),
              l
            )
          case 'h':
            return s ? 'ena ura' : 'eno uro'
          case 'hh':
            return (
              e === 1
                ? (l += s ? 'ura' : 'uro')
                : e === 2
                  ? (l += s || _ ? 'uri' : 'urama')
                  : e < 5
                    ? (l += s || _ ? 'ure' : 'urami')
                    : (l += s || _ ? 'ur' : 'urami'),
              l
            )
          case 'd':
            return s || _ ? 'en dan' : 'enim dnem'
          case 'dd':
            return (
              e === 1
                ? (l += s || _ ? 'dan' : 'dnem')
                : e === 2
                  ? (l += s || _ ? 'dni' : 'dnevoma')
                  : (l += s || _ ? 'dni' : 'dnevi'),
              l
            )
          case 'M':
            return s || _ ? 'en mesec' : 'enim mesecem'
          case 'MM':
            return (
              e === 1
                ? (l += s || _ ? 'mesec' : 'mesecem')
                : e === 2
                  ? (l += s || _ ? 'meseca' : 'mesecema')
                  : e < 5
                    ? (l += s || _ ? 'mesece' : 'meseci')
                    : (l += s || _ ? 'mesecev' : 'meseci'),
              l
            )
          case 'y':
            return s || _ ? 'eno leto' : 'enim letom'
          case 'yy':
            return (
              e === 1
                ? (l += s || _ ? 'leto' : 'letom')
                : e === 2
                  ? (l += s || _ ? 'leti' : 'letoma')
                  : e < 5
                    ? (l += s || _ ? 'leta' : 'leti')
                    : (l += s || _ ? 'let' : 'leti'),
              l
            )
        }
      }
      u.defineLocale('sl', {
        months:
          'januar_februar_marec_april_maj_junij_julij_avgust_september_oktober_november_december'.split(
            '_',
          ),
        monthsShort:
          'jan._feb._mar._apr._maj._jun._jul._avg._sep._okt._nov._dec.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'nedelja_ponedeljek_torek_sreda_\u010Detrtek_petek_sobota'.split('_'),
        weekdaysShort: 'ned._pon._tor._sre._\u010Det._pet._sob.'.split('_'),
        weekdaysMin: 'ne_po_to_sr_\u010De_pe_so'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD. MM. YYYY',
          LL: 'D. MMMM YYYY',
          LLL: 'D. MMMM YYYY H:mm',
          LLLL: 'dddd, D. MMMM YYYY H:mm',
        },
        calendar: {
          sameDay: '[danes ob] LT',
          nextDay: '[jutri ob] LT',
          nextWeek: function () {
            switch (this.day()) {
              case 0:
                return '[v] [nedeljo] [ob] LT'
              case 3:
                return '[v] [sredo] [ob] LT'
              case 6:
                return '[v] [soboto] [ob] LT'
              case 1:
              case 2:
              case 4:
              case 5:
                return '[v] dddd [ob] LT'
            }
          },
          lastDay: '[v\u010Deraj ob] LT',
          lastWeek: function () {
            switch (this.day()) {
              case 0:
                return '[prej\u0161njo] [nedeljo] [ob] LT'
              case 3:
                return '[prej\u0161njo] [sredo] [ob] LT'
              case 6:
                return '[prej\u0161njo] [soboto] [ob] LT'
              case 1:
              case 2:
              case 4:
              case 5:
                return '[prej\u0161nji] dddd [ob] LT'
            }
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u010Dez %s',
          past: 'pred %s',
          s: N,
          ss: N,
          m: N,
          mm: N,
          h: N,
          hh: N,
          d: N,
          dd: N,
          M: N,
          MM: N,
          y: N,
          yy: N,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('sq', {
        months:
          'Janar_Shkurt_Mars_Prill_Maj_Qershor_Korrik_Gusht_Shtator_Tetor_N\xEBntor_Dhjetor'.split(
            '_',
          ),
        monthsShort: 'Jan_Shk_Mar_Pri_Maj_Qer_Kor_Gus_Sht_Tet_N\xEBn_Dhj'.split(
          '_',
        ),
        weekdays:
          'E Diel_E H\xEBn\xEB_E Mart\xEB_E M\xEBrkur\xEB_E Enjte_E Premte_E Shtun\xEB'.split(
            '_',
          ),
        weekdaysShort: 'Die_H\xEBn_Mar_M\xEBr_Enj_Pre_Sht'.split('_'),
        weekdaysMin: 'D_H_Ma_M\xEB_E_P_Sh'.split('_'),
        weekdaysParseExact: !0,
        meridiemParse: /PD|MD/,
        isPM: function (e) {
          return e.charAt(0) === 'M'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? 'PD' : 'MD'
        },
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Sot n\xEB] LT',
          nextDay: '[Nes\xEBr n\xEB] LT',
          nextWeek: 'dddd [n\xEB] LT',
          lastDay: '[Dje n\xEB] LT',
          lastWeek: 'dddd [e kaluar n\xEB] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'n\xEB %s',
          past: '%s m\xEB par\xEB',
          s: 'disa sekonda',
          ss: '%d sekonda',
          m: 'nj\xEB minut\xEB',
          mm: '%d minuta',
          h: 'nj\xEB or\xEB',
          hh: '%d or\xEB',
          d: 'nj\xEB dit\xEB',
          dd: '%d dit\xEB',
          M: 'nj\xEB muaj',
          MM: '%d muaj',
          y: 'nj\xEB vit',
          yy: '%d vite',
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      var F = {
        words: {
          ss: [
            '\u0441\u0435\u043A\u0443\u043D\u0434\u0430',
            '\u0441\u0435\u043A\u0443\u043D\u0434\u0435',
            '\u0441\u0435\u043A\u0443\u043D\u0434\u0438',
          ],
          m: [
            '\u0458\u0435\u0434\u0430\u043D \u043C\u0438\u043D\u0443\u0442',
            '\u0458\u0435\u0434\u043D\u043E\u0433 \u043C\u0438\u043D\u0443\u0442\u0430',
          ],
          mm: [
            '\u043C\u0438\u043D\u0443\u0442',
            '\u043C\u0438\u043D\u0443\u0442\u0430',
            '\u043C\u0438\u043D\u0443\u0442\u0430',
          ],
          h: [
            '\u0458\u0435\u0434\u0430\u043D \u0441\u0430\u0442',
            '\u0458\u0435\u0434\u043D\u043E\u0433 \u0441\u0430\u0442\u0430',
          ],
          hh: [
            '\u0441\u0430\u0442',
            '\u0441\u0430\u0442\u0430',
            '\u0441\u0430\u0442\u0438',
          ],
          d: [
            '\u0458\u0435\u0434\u0430\u043D \u0434\u0430\u043D',
            '\u0458\u0435\u0434\u043D\u043E\u0433 \u0434\u0430\u043D\u0430',
          ],
          dd: [
            '\u0434\u0430\u043D',
            '\u0434\u0430\u043D\u0430',
            '\u0434\u0430\u043D\u0430',
          ],
          M: [
            '\u0458\u0435\u0434\u0430\u043D \u043C\u0435\u0441\u0435\u0446',
            '\u0458\u0435\u0434\u043D\u043E\u0433 \u043C\u0435\u0441\u0435\u0446\u0430',
          ],
          MM: [
            '\u043C\u0435\u0441\u0435\u0446',
            '\u043C\u0435\u0441\u0435\u0446\u0430',
            '\u043C\u0435\u0441\u0435\u0446\u0438',
          ],
          y: [
            '\u0458\u0435\u0434\u043D\u0443 \u0433\u043E\u0434\u0438\u043D\u0443',
            '\u0458\u0435\u0434\u043D\u0435 \u0433\u043E\u0434\u0438\u043D\u0435',
          ],
          yy: [
            '\u0433\u043E\u0434\u0438\u043D\u0443',
            '\u0433\u043E\u0434\u0438\u043D\u0435',
            '\u0433\u043E\u0434\u0438\u043D\u0430',
          ],
        },
        correctGrammaticalCase: function (e, s) {
          return e % 10 >= 1 && e % 10 <= 4 && (e % 100 < 10 || e % 100 >= 20)
            ? e % 10 === 1
              ? s[0]
              : s[1]
            : s[2]
        },
        translate: function (e, s, i, _) {
          var l = F.words[i],
            K
          return i.length === 1
            ? i === 'y' && s
              ? '\u0458\u0435\u0434\u043D\u0430 \u0433\u043E\u0434\u0438\u043D\u0430'
              : _ || s
                ? l[0]
                : l[1]
            : ((K = F.correctGrammaticalCase(e, l)),
              i === 'yy' && s && K === '\u0433\u043E\u0434\u0438\u043D\u0443'
                ? e + ' \u0433\u043E\u0434\u0438\u043D\u0430'
                : e + ' ' + K)
        },
      }
      u.defineLocale('sr-cyrl', {
        months:
          '\u0458\u0430\u043D\u0443\u0430\u0440_\u0444\u0435\u0431\u0440\u0443\u0430\u0440_\u043C\u0430\u0440\u0442_\u0430\u043F\u0440\u0438\u043B_\u043C\u0430\u0458_\u0458\u0443\u043D_\u0458\u0443\u043B_\u0430\u0432\u0433\u0443\u0441\u0442_\u0441\u0435\u043F\u0442\u0435\u043C\u0431\u0430\u0440_\u043E\u043A\u0442\u043E\u0431\u0430\u0440_\u043D\u043E\u0432\u0435\u043C\u0431\u0430\u0440_\u0434\u0435\u0446\u0435\u043C\u0431\u0430\u0440'.split(
            '_',
          ),
        monthsShort:
          '\u0458\u0430\u043D._\u0444\u0435\u0431._\u043C\u0430\u0440._\u0430\u043F\u0440._\u043C\u0430\u0458_\u0458\u0443\u043D_\u0458\u0443\u043B_\u0430\u0432\u0433._\u0441\u0435\u043F._\u043E\u043A\u0442._\u043D\u043E\u0432._\u0434\u0435\u0446.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          '\u043D\u0435\u0434\u0435\u0459\u0430_\u043F\u043E\u043D\u0435\u0434\u0435\u0459\u0430\u043A_\u0443\u0442\u043E\u0440\u0430\u043A_\u0441\u0440\u0435\u0434\u0430_\u0447\u0435\u0442\u0432\u0440\u0442\u0430\u043A_\u043F\u0435\u0442\u0430\u043A_\u0441\u0443\u0431\u043E\u0442\u0430'.split(
            '_',
          ),
        weekdaysShort:
          '\u043D\u0435\u0434._\u043F\u043E\u043D._\u0443\u0442\u043E._\u0441\u0440\u0435._\u0447\u0435\u0442._\u043F\u0435\u0442._\u0441\u0443\u0431.'.split(
            '_',
          ),
        weekdaysMin:
          '\u043D\u0435_\u043F\u043E_\u0443\u0442_\u0441\u0440_\u0447\u0435_\u043F\u0435_\u0441\u0443'.split(
            '_',
          ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'D. M. YYYY.',
          LL: 'D. MMMM YYYY.',
          LLL: 'D. MMMM YYYY. H:mm',
          LLLL: 'dddd, D. MMMM YYYY. H:mm',
        },
        calendar: {
          sameDay: '[\u0434\u0430\u043D\u0430\u0441 \u0443] LT',
          nextDay: '[\u0441\u0443\u0442\u0440\u0430 \u0443] LT',
          nextWeek: function () {
            switch (this.day()) {
              case 0:
                return '[\u0443] [\u043D\u0435\u0434\u0435\u0459\u0443] [\u0443] LT'
              case 3:
                return '[\u0443] [\u0441\u0440\u0435\u0434\u0443] [\u0443] LT'
              case 6:
                return '[\u0443] [\u0441\u0443\u0431\u043E\u0442\u0443] [\u0443] LT'
              case 1:
              case 2:
              case 4:
              case 5:
                return '[\u0443] dddd [\u0443] LT'
            }
          },
          lastDay: '[\u0458\u0443\u0447\u0435 \u0443] LT',
          lastWeek: function () {
            var e = [
              '[\u043F\u0440\u043E\u0448\u043B\u0435] [\u043D\u0435\u0434\u0435\u0459\u0435] [\u0443] LT',
              '[\u043F\u0440\u043E\u0448\u043B\u043E\u0433] [\u043F\u043E\u043D\u0435\u0434\u0435\u0459\u043A\u0430] [\u0443] LT',
              '[\u043F\u0440\u043E\u0448\u043B\u043E\u0433] [\u0443\u0442\u043E\u0440\u043A\u0430] [\u0443] LT',
              '[\u043F\u0440\u043E\u0448\u043B\u0435] [\u0441\u0440\u0435\u0434\u0435] [\u0443] LT',
              '[\u043F\u0440\u043E\u0448\u043B\u043E\u0433] [\u0447\u0435\u0442\u0432\u0440\u0442\u043A\u0430] [\u0443] LT',
              '[\u043F\u0440\u043E\u0448\u043B\u043E\u0433] [\u043F\u0435\u0442\u043A\u0430] [\u0443] LT',
              '[\u043F\u0440\u043E\u0448\u043B\u0435] [\u0441\u0443\u0431\u043E\u0442\u0435] [\u0443] LT',
            ]
            return e[this.day()]
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0437\u0430 %s',
          past: '\u043F\u0440\u0435 %s',
          s: '\u043D\u0435\u043A\u043E\u043B\u0438\u043A\u043E \u0441\u0435\u043A\u0443\u043D\u0434\u0438',
          ss: F.translate,
          m: F.translate,
          mm: F.translate,
          h: F.translate,
          hh: F.translate,
          d: F.translate,
          dd: F.translate,
          M: F.translate,
          MM: F.translate,
          y: F.translate,
          yy: F.translate,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 7},
      })
      var Z = {
        words: {
          ss: ['sekunda', 'sekunde', 'sekundi'],
          m: ['jedan minut', 'jednog minuta'],
          mm: ['minut', 'minuta', 'minuta'],
          h: ['jedan sat', 'jednog sata'],
          hh: ['sat', 'sata', 'sati'],
          d: ['jedan dan', 'jednog dana'],
          dd: ['dan', 'dana', 'dana'],
          M: ['jedan mesec', 'jednog meseca'],
          MM: ['mesec', 'meseca', 'meseci'],
          y: ['jednu godinu', 'jedne godine'],
          yy: ['godinu', 'godine', 'godina'],
        },
        correctGrammaticalCase: function (e, s) {
          return e % 10 >= 1 && e % 10 <= 4 && (e % 100 < 10 || e % 100 >= 20)
            ? e % 10 === 1
              ? s[0]
              : s[1]
            : s[2]
        },
        translate: function (e, s, i, _) {
          var l = Z.words[i],
            K
          return i.length === 1
            ? i === 'y' && s
              ? 'jedna godina'
              : _ || s
                ? l[0]
                : l[1]
            : ((K = Z.correctGrammaticalCase(e, l)),
              i === 'yy' && s && K === 'godinu' ? e + ' godina' : e + ' ' + K)
        },
      }
      u.defineLocale('sr', {
        months:
          'januar_februar_mart_april_maj_jun_jul_avgust_septembar_oktobar_novembar_decembar'.split(
            '_',
          ),
        monthsShort:
          'jan._feb._mar._apr._maj_jun_jul_avg._sep._okt._nov._dec.'.split('_'),
        monthsParseExact: !0,
        weekdays:
          'nedelja_ponedeljak_utorak_sreda_\u010Detvrtak_petak_subota'.split(
            '_',
          ),
        weekdaysShort: 'ned._pon._uto._sre._\u010Det._pet._sub.'.split('_'),
        weekdaysMin: 'ne_po_ut_sr_\u010De_pe_su'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'D. M. YYYY.',
          LL: 'D. MMMM YYYY.',
          LLL: 'D. MMMM YYYY. H:mm',
          LLLL: 'dddd, D. MMMM YYYY. H:mm',
        },
        calendar: {
          sameDay: '[danas u] LT',
          nextDay: '[sutra u] LT',
          nextWeek: function () {
            switch (this.day()) {
              case 0:
                return '[u] [nedelju] [u] LT'
              case 3:
                return '[u] [sredu] [u] LT'
              case 6:
                return '[u] [subotu] [u] LT'
              case 1:
              case 2:
              case 4:
              case 5:
                return '[u] dddd [u] LT'
            }
          },
          lastDay: '[ju\u010De u] LT',
          lastWeek: function () {
            var e = [
              '[pro\u0161le] [nedelje] [u] LT',
              '[pro\u0161log] [ponedeljka] [u] LT',
              '[pro\u0161log] [utorka] [u] LT',
              '[pro\u0161le] [srede] [u] LT',
              '[pro\u0161log] [\u010Detvrtka] [u] LT',
              '[pro\u0161log] [petka] [u] LT',
              '[pro\u0161le] [subote] [u] LT',
            ]
            return e[this.day()]
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: 'za %s',
          past: 'pre %s',
          s: 'nekoliko sekundi',
          ss: Z.translate,
          m: Z.translate,
          mm: Z.translate,
          h: Z.translate,
          hh: Z.translate,
          d: Z.translate,
          dd: Z.translate,
          M: Z.translate,
          MM: Z.translate,
          y: Z.translate,
          yy: Z.translate,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('ss', {
        months:
          "Bhimbidvwane_Indlovana_Indlov'lenkhulu_Mabasa_Inkhwekhweti_Inhlaba_Kholwane_Ingci_Inyoni_Imphala_Lweti_Ingongoni".split(
            '_',
          ),
        monthsShort: 'Bhi_Ina_Inu_Mab_Ink_Inh_Kho_Igc_Iny_Imp_Lwe_Igo'.split(
          '_',
        ),
        weekdays:
          'Lisontfo_Umsombuluko_Lesibili_Lesitsatfu_Lesine_Lesihlanu_Umgcibelo'.split(
            '_',
          ),
        weekdaysShort: 'Lis_Umb_Lsb_Les_Lsi_Lsh_Umg'.split('_'),
        weekdaysMin: 'Li_Us_Lb_Lt_Ls_Lh_Ug'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'h:mm A',
          LTS: 'h:mm:ss A',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY h:mm A',
          LLLL: 'dddd, D MMMM YYYY h:mm A',
        },
        calendar: {
          sameDay: '[Namuhla nga] LT',
          nextDay: '[Kusasa nga] LT',
          nextWeek: 'dddd [nga] LT',
          lastDay: '[Itolo nga] LT',
          lastWeek: 'dddd [leliphelile] [nga] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'nga %s',
          past: 'wenteka nga %s',
          s: 'emizuzwana lomcane',
          ss: '%d mzuzwana',
          m: 'umzuzu',
          mm: '%d emizuzu',
          h: 'lihora',
          hh: '%d emahora',
          d: 'lilanga',
          dd: '%d emalanga',
          M: 'inyanga',
          MM: '%d tinyanga',
          y: 'umnyaka',
          yy: '%d iminyaka',
        },
        meridiemParse: /ekuseni|emini|entsambama|ebusuku/,
        meridiem: function (e, s, i) {
          return e < 11
            ? 'ekuseni'
            : e < 15
              ? 'emini'
              : e < 19
                ? 'entsambama'
                : 'ebusuku'
        },
        meridiemHour: function (e, s) {
          if ((e === 12 && (e = 0), s === 'ekuseni')) return e
          if (s === 'emini') return e >= 11 ? e : e + 12
          if (s === 'entsambama' || s === 'ebusuku') return e === 0 ? 0 : e + 12
        },
        dayOfMonthOrdinalParse: /\d{1,2}/,
        ordinal: '%d',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('sv', {
        months:
          'januari_februari_mars_april_maj_juni_juli_augusti_september_oktober_november_december'.split(
            '_',
          ),
        monthsShort: 'jan_feb_mar_apr_maj_jun_jul_aug_sep_okt_nov_dec'.split(
          '_',
        ),
        weekdays:
          's\xF6ndag_m\xE5ndag_tisdag_onsdag_torsdag_fredag_l\xF6rdag'.split(
            '_',
          ),
        weekdaysShort: 's\xF6n_m\xE5n_tis_ons_tor_fre_l\xF6r'.split('_'),
        weekdaysMin: 's\xF6_m\xE5_ti_on_to_fr_l\xF6'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'YYYY-MM-DD',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY [kl.] HH:mm',
          LLLL: 'dddd D MMMM YYYY [kl.] HH:mm',
          lll: 'D MMM YYYY HH:mm',
          llll: 'ddd D MMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Idag] LT',
          nextDay: '[Imorgon] LT',
          lastDay: '[Ig\xE5r] LT',
          nextWeek: '[P\xE5] dddd LT',
          lastWeek: '[I] dddd[s] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'om %s',
          past: 'f\xF6r %s sedan',
          s: 'n\xE5gra sekunder',
          ss: '%d sekunder',
          m: 'en minut',
          mm: '%d minuter',
          h: 'en timme',
          hh: '%d timmar',
          d: 'en dag',
          dd: '%d dagar',
          M: 'en m\xE5nad',
          MM: '%d m\xE5nader',
          y: 'ett \xE5r',
          yy: '%d \xE5r',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(:e|:a)/,
        ordinal: function (e) {
          var s = e % 10,
            i =
              ~~((e % 100) / 10) === 1 ? ':e' : s === 1 || s === 2 ? ':a' : ':e'
          return e + i
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('sw', {
        months:
          'Januari_Februari_Machi_Aprili_Mei_Juni_Julai_Agosti_Septemba_Oktoba_Novemba_Desemba'.split(
            '_',
          ),
        monthsShort: 'Jan_Feb_Mac_Apr_Mei_Jun_Jul_Ago_Sep_Okt_Nov_Des'.split(
          '_',
        ),
        weekdays:
          'Jumapili_Jumatatu_Jumanne_Jumatano_Alhamisi_Ijumaa_Jumamosi'.split(
            '_',
          ),
        weekdaysShort: 'Jpl_Jtat_Jnne_Jtan_Alh_Ijm_Jmos'.split('_'),
        weekdaysMin: 'J2_J3_J4_J5_Al_Ij_J1'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'hh:mm A',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[leo saa] LT',
          nextDay: '[kesho saa] LT',
          nextWeek: '[wiki ijayo] dddd [saat] LT',
          lastDay: '[jana] LT',
          lastWeek: '[wiki iliyopita] dddd [saat] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s baadaye',
          past: 'tokea %s',
          s: 'hivi punde',
          ss: 'sekunde %d',
          m: 'dakika moja',
          mm: 'dakika %d',
          h: 'saa limoja',
          hh: 'masaa %d',
          d: 'siku moja',
          dd: 'siku %d',
          M: 'mwezi mmoja',
          MM: 'miezi %d',
          y: 'mwaka mmoja',
          yy: 'miaka %d',
        },
        week: {dow: 1, doy: 7},
      })
      var St = {
          1: '\u0BE7',
          2: '\u0BE8',
          3: '\u0BE9',
          4: '\u0BEA',
          5: '\u0BEB',
          6: '\u0BEC',
          7: '\u0BED',
          8: '\u0BEE',
          9: '\u0BEF',
          0: '\u0BE6',
        },
        cs = {
          '\u0BE7': '1',
          '\u0BE8': '2',
          '\u0BE9': '3',
          '\u0BEA': '4',
          '\u0BEB': '5',
          '\u0BEC': '6',
          '\u0BED': '7',
          '\u0BEE': '8',
          '\u0BEF': '9',
          '\u0BE6': '0',
        }
      u.defineLocale('ta', {
        months:
          '\u0B9C\u0BA9\u0BB5\u0BB0\u0BBF_\u0BAA\u0BBF\u0BAA\u0BCD\u0BB0\u0BB5\u0BB0\u0BBF_\u0BAE\u0BBE\u0BB0\u0BCD\u0B9A\u0BCD_\u0B8F\u0BAA\u0BCD\u0BB0\u0BB2\u0BCD_\u0BAE\u0BC7_\u0B9C\u0BC2\u0BA9\u0BCD_\u0B9C\u0BC2\u0BB2\u0BC8_\u0B86\u0B95\u0BB8\u0BCD\u0B9F\u0BCD_\u0B9A\u0BC6\u0BAA\u0BCD\u0B9F\u0BC6\u0BAE\u0BCD\u0BAA\u0BB0\u0BCD_\u0B85\u0B95\u0BCD\u0B9F\u0BC7\u0BBE\u0BAA\u0BB0\u0BCD_\u0BA8\u0BB5\u0BAE\u0BCD\u0BAA\u0BB0\u0BCD_\u0B9F\u0BBF\u0B9A\u0BAE\u0BCD\u0BAA\u0BB0\u0BCD'.split(
            '_',
          ),
        monthsShort:
          '\u0B9C\u0BA9\u0BB5\u0BB0\u0BBF_\u0BAA\u0BBF\u0BAA\u0BCD\u0BB0\u0BB5\u0BB0\u0BBF_\u0BAE\u0BBE\u0BB0\u0BCD\u0B9A\u0BCD_\u0B8F\u0BAA\u0BCD\u0BB0\u0BB2\u0BCD_\u0BAE\u0BC7_\u0B9C\u0BC2\u0BA9\u0BCD_\u0B9C\u0BC2\u0BB2\u0BC8_\u0B86\u0B95\u0BB8\u0BCD\u0B9F\u0BCD_\u0B9A\u0BC6\u0BAA\u0BCD\u0B9F\u0BC6\u0BAE\u0BCD\u0BAA\u0BB0\u0BCD_\u0B85\u0B95\u0BCD\u0B9F\u0BC7\u0BBE\u0BAA\u0BB0\u0BCD_\u0BA8\u0BB5\u0BAE\u0BCD\u0BAA\u0BB0\u0BCD_\u0B9F\u0BBF\u0B9A\u0BAE\u0BCD\u0BAA\u0BB0\u0BCD'.split(
            '_',
          ),
        weekdays:
          '\u0B9E\u0BBE\u0BAF\u0BBF\u0BB1\u0BCD\u0BB1\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB4\u0BAE\u0BC8_\u0BA4\u0BBF\u0B99\u0BCD\u0B95\u0B9F\u0BCD\u0B95\u0BBF\u0BB4\u0BAE\u0BC8_\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD\u0B95\u0BBF\u0BB4\u0BAE\u0BC8_\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD\u0B95\u0BBF\u0BB4\u0BAE\u0BC8_\u0BB5\u0BBF\u0BAF\u0BBE\u0BB4\u0B95\u0BCD\u0B95\u0BBF\u0BB4\u0BAE\u0BC8_\u0BB5\u0BC6\u0BB3\u0BCD\u0BB3\u0BBF\u0B95\u0BCD\u0B95\u0BBF\u0BB4\u0BAE\u0BC8_\u0B9A\u0BA9\u0BBF\u0B95\u0BCD\u0B95\u0BBF\u0BB4\u0BAE\u0BC8'.split(
            '_',
          ),
        weekdaysShort:
          '\u0B9E\u0BBE\u0BAF\u0BBF\u0BB1\u0BC1_\u0BA4\u0BBF\u0B99\u0BCD\u0B95\u0BB3\u0BCD_\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD_\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD_\u0BB5\u0BBF\u0BAF\u0BBE\u0BB4\u0BA9\u0BCD_\u0BB5\u0BC6\u0BB3\u0BCD\u0BB3\u0BBF_\u0B9A\u0BA9\u0BBF'.split(
            '_',
          ),
        weekdaysMin:
          '\u0B9E\u0BBE_\u0BA4\u0BBF_\u0B9A\u0BC6_\u0BAA\u0BC1_\u0BB5\u0BBF_\u0BB5\u0BC6_\u0B9A'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY, HH:mm',
          LLLL: 'dddd, D MMMM YYYY, HH:mm',
        },
        calendar: {
          sameDay: '[\u0B87\u0BA9\u0BCD\u0BB1\u0BC1] LT',
          nextDay: '[\u0BA8\u0BBE\u0BB3\u0BC8] LT',
          nextWeek: 'dddd, LT',
          lastDay: '[\u0BA8\u0BC7\u0BB1\u0BCD\u0BB1\u0BC1] LT',
          lastWeek:
            '[\u0B95\u0B9F\u0BA8\u0BCD\u0BA4 \u0BB5\u0BBE\u0BB0\u0BAE\u0BCD] dddd, LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u0B87\u0BB2\u0BCD',
          past: '%s \u0BAE\u0BC1\u0BA9\u0BCD',
          s: '\u0B92\u0BB0\u0BC1 \u0B9A\u0BBF\u0BB2 \u0BB5\u0BBF\u0BA8\u0BBE\u0B9F\u0BBF\u0B95\u0BB3\u0BCD',
          ss: '%d \u0BB5\u0BBF\u0BA8\u0BBE\u0B9F\u0BBF\u0B95\u0BB3\u0BCD',
          m: '\u0B92\u0BB0\u0BC1 \u0BA8\u0BBF\u0BAE\u0BBF\u0B9F\u0BAE\u0BCD',
          mm: '%d \u0BA8\u0BBF\u0BAE\u0BBF\u0B9F\u0B99\u0BCD\u0B95\u0BB3\u0BCD',
          h: '\u0B92\u0BB0\u0BC1 \u0BAE\u0BA3\u0BBF \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD',
          hh: '%d \u0BAE\u0BA3\u0BBF \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD',
          d: '\u0B92\u0BB0\u0BC1 \u0BA8\u0BBE\u0BB3\u0BCD',
          dd: '%d \u0BA8\u0BBE\u0B9F\u0BCD\u0B95\u0BB3\u0BCD',
          M: '\u0B92\u0BB0\u0BC1 \u0BAE\u0BBE\u0BA4\u0BAE\u0BCD',
          MM: '%d \u0BAE\u0BBE\u0BA4\u0B99\u0BCD\u0B95\u0BB3\u0BCD',
          y: '\u0B92\u0BB0\u0BC1 \u0BB5\u0BB0\u0BC1\u0B9F\u0BAE\u0BCD',
          yy: '%d \u0B86\u0BA3\u0BCD\u0B9F\u0BC1\u0B95\u0BB3\u0BCD',
        },
        dayOfMonthOrdinalParse: /\d{1,2}வது/,
        ordinal: function (e) {
          return e + '\u0BB5\u0BA4\u0BC1'
        },
        preparse: function (e) {
          return e.replace(/[௧௨௩௪௫௬௭௮௯௦]/g, function (s) {
            return cs[s]
          })
        },
        postformat: function (e) {
          return e.replace(/\d/g, function (s) {
            return St[s]
          })
        },
        meridiemParse: /யாமம்|வைகறை|காலை|நண்பகல்|எற்பாடு|மாலை/,
        meridiem: function (e, s, i) {
          return e < 2
            ? ' \u0BAF\u0BBE\u0BAE\u0BAE\u0BCD'
            : e < 6
              ? ' \u0BB5\u0BC8\u0B95\u0BB1\u0BC8'
              : e < 10
                ? ' \u0B95\u0BBE\u0BB2\u0BC8'
                : e < 14
                  ? ' \u0BA8\u0BA3\u0BCD\u0BAA\u0B95\u0BB2\u0BCD'
                  : e < 18
                    ? ' \u0B8E\u0BB1\u0BCD\u0BAA\u0BBE\u0B9F\u0BC1'
                    : e < 22
                      ? ' \u0BAE\u0BBE\u0BB2\u0BC8'
                      : ' \u0BAF\u0BBE\u0BAE\u0BAE\u0BCD'
        },
        meridiemHour: function (e, s) {
          return (
            e === 12 && (e = 0),
            s === '\u0BAF\u0BBE\u0BAE\u0BAE\u0BCD'
              ? e < 2
                ? e
                : e + 12
              : s === '\u0BB5\u0BC8\u0B95\u0BB1\u0BC8' ||
                  s === '\u0B95\u0BBE\u0BB2\u0BC8' ||
                  (s === '\u0BA8\u0BA3\u0BCD\u0BAA\u0B95\u0BB2\u0BCD' &&
                    e >= 10)
                ? e
                : e + 12
          )
        },
        week: {dow: 0, doy: 6},
      })
      u.defineLocale('te', {
        months:
          '\u0C1C\u0C28\u0C35\u0C30\u0C3F_\u0C2B\u0C3F\u0C2C\u0C4D\u0C30\u0C35\u0C30\u0C3F_\u0C2E\u0C3E\u0C30\u0C4D\u0C1A\u0C3F_\u0C0F\u0C2A\u0C4D\u0C30\u0C3F\u0C32\u0C4D_\u0C2E\u0C47_\u0C1C\u0C42\u0C28\u0C4D_\u0C1C\u0C41\u0C32\u0C48_\u0C06\u0C17\u0C38\u0C4D\u0C1F\u0C41_\u0C38\u0C46\u0C2A\u0C4D\u0C1F\u0C46\u0C02\u0C2C\u0C30\u0C4D_\u0C05\u0C15\u0C4D\u0C1F\u0C4B\u0C2C\u0C30\u0C4D_\u0C28\u0C35\u0C02\u0C2C\u0C30\u0C4D_\u0C21\u0C3F\u0C38\u0C46\u0C02\u0C2C\u0C30\u0C4D'.split(
            '_',
          ),
        monthsShort:
          '\u0C1C\u0C28._\u0C2B\u0C3F\u0C2C\u0C4D\u0C30._\u0C2E\u0C3E\u0C30\u0C4D\u0C1A\u0C3F_\u0C0F\u0C2A\u0C4D\u0C30\u0C3F._\u0C2E\u0C47_\u0C1C\u0C42\u0C28\u0C4D_\u0C1C\u0C41\u0C32\u0C48_\u0C06\u0C17._\u0C38\u0C46\u0C2A\u0C4D._\u0C05\u0C15\u0C4D\u0C1F\u0C4B._\u0C28\u0C35._\u0C21\u0C3F\u0C38\u0C46.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          '\u0C06\u0C26\u0C3F\u0C35\u0C3E\u0C30\u0C02_\u0C38\u0C4B\u0C2E\u0C35\u0C3E\u0C30\u0C02_\u0C2E\u0C02\u0C17\u0C33\u0C35\u0C3E\u0C30\u0C02_\u0C2C\u0C41\u0C27\u0C35\u0C3E\u0C30\u0C02_\u0C17\u0C41\u0C30\u0C41\u0C35\u0C3E\u0C30\u0C02_\u0C36\u0C41\u0C15\u0C4D\u0C30\u0C35\u0C3E\u0C30\u0C02_\u0C36\u0C28\u0C3F\u0C35\u0C3E\u0C30\u0C02'.split(
            '_',
          ),
        weekdaysShort:
          '\u0C06\u0C26\u0C3F_\u0C38\u0C4B\u0C2E_\u0C2E\u0C02\u0C17\u0C33_\u0C2C\u0C41\u0C27_\u0C17\u0C41\u0C30\u0C41_\u0C36\u0C41\u0C15\u0C4D\u0C30_\u0C36\u0C28\u0C3F'.split(
            '_',
          ),
        weekdaysMin:
          '\u0C06_\u0C38\u0C4B_\u0C2E\u0C02_\u0C2C\u0C41_\u0C17\u0C41_\u0C36\u0C41_\u0C36'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'A h:mm',
          LTS: 'A h:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY, A h:mm',
          LLLL: 'dddd, D MMMM YYYY, A h:mm',
        },
        calendar: {
          sameDay: '[\u0C28\u0C47\u0C21\u0C41] LT',
          nextDay: '[\u0C30\u0C47\u0C2A\u0C41] LT',
          nextWeek: 'dddd, LT',
          lastDay: '[\u0C28\u0C3F\u0C28\u0C4D\u0C28] LT',
          lastWeek: '[\u0C17\u0C24] dddd, LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u0C32\u0C4B',
          past: '%s \u0C15\u0C4D\u0C30\u0C3F\u0C24\u0C02',
          s: '\u0C15\u0C4A\u0C28\u0C4D\u0C28\u0C3F \u0C15\u0C4D\u0C37\u0C23\u0C3E\u0C32\u0C41',
          ss: '%d \u0C38\u0C46\u0C15\u0C28\u0C4D\u0C32\u0C41',
          m: '\u0C12\u0C15 \u0C28\u0C3F\u0C2E\u0C3F\u0C37\u0C02',
          mm: '%d \u0C28\u0C3F\u0C2E\u0C3F\u0C37\u0C3E\u0C32\u0C41',
          h: '\u0C12\u0C15 \u0C17\u0C02\u0C1F',
          hh: '%d \u0C17\u0C02\u0C1F\u0C32\u0C41',
          d: '\u0C12\u0C15 \u0C30\u0C4B\u0C1C\u0C41',
          dd: '%d \u0C30\u0C4B\u0C1C\u0C41\u0C32\u0C41',
          M: '\u0C12\u0C15 \u0C28\u0C46\u0C32',
          MM: '%d \u0C28\u0C46\u0C32\u0C32\u0C41',
          y: '\u0C12\u0C15 \u0C38\u0C02\u0C35\u0C24\u0C4D\u0C38\u0C30\u0C02',
          yy: '%d \u0C38\u0C02\u0C35\u0C24\u0C4D\u0C38\u0C30\u0C3E\u0C32\u0C41',
        },
        dayOfMonthOrdinalParse: /\d{1,2}వ/,
        ordinal: '%d\u0C35',
        meridiemParse: /రాత్రి|ఉదయం|మధ్యాహ్నం|సాయంత్రం/,
        meridiemHour: function (e, s) {
          if (
            (e === 12 && (e = 0), s === '\u0C30\u0C3E\u0C24\u0C4D\u0C30\u0C3F')
          )
            return e < 4 ? e : e + 12
          if (s === '\u0C09\u0C26\u0C2F\u0C02') return e
          if (s === '\u0C2E\u0C27\u0C4D\u0C2F\u0C3E\u0C39\u0C4D\u0C28\u0C02')
            return e >= 10 ? e : e + 12
          if (s === '\u0C38\u0C3E\u0C2F\u0C02\u0C24\u0C4D\u0C30\u0C02')
            return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u0C30\u0C3E\u0C24\u0C4D\u0C30\u0C3F'
            : e < 10
              ? '\u0C09\u0C26\u0C2F\u0C02'
              : e < 17
                ? '\u0C2E\u0C27\u0C4D\u0C2F\u0C3E\u0C39\u0C4D\u0C28\u0C02'
                : e < 20
                  ? '\u0C38\u0C3E\u0C2F\u0C02\u0C24\u0C4D\u0C30\u0C02'
                  : '\u0C30\u0C3E\u0C24\u0C4D\u0C30\u0C3F'
        },
        week: {dow: 0, doy: 6},
      })
      u.defineLocale('tet', {
        months:
          'Janeiru_Fevereiru_Marsu_Abril_Maiu_Ju\xF1u_Jullu_Agustu_Setembru_Outubru_Novembru_Dezembru'.split(
            '_',
          ),
        monthsShort: 'Jan_Fev_Mar_Abr_Mai_Jun_Jul_Ago_Set_Out_Nov_Dez'.split(
          '_',
        ),
        weekdays: 'Domingu_Segunda_Tersa_Kuarta_Kinta_Sesta_Sabadu'.split('_'),
        weekdaysShort: 'Dom_Seg_Ters_Kua_Kint_Sest_Sab'.split('_'),
        weekdaysMin: 'Do_Seg_Te_Ku_Ki_Ses_Sa'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[Ohin iha] LT',
          nextDay: '[Aban iha] LT',
          nextWeek: 'dddd [iha] LT',
          lastDay: '[Horiseik iha] LT',
          lastWeek: 'dddd [semana kotuk] [iha] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'iha %s',
          past: '%s liuba',
          s: 'segundu balun',
          ss: 'segundu %d',
          m: 'minutu ida',
          mm: 'minutu %d',
          h: 'oras ida',
          hh: 'oras %d',
          d: 'loron ida',
          dd: 'loron %d',
          M: 'fulan ida',
          MM: 'fulan %d',
          y: 'tinan ida',
          yy: 'tinan %d',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(st|nd|rd|th)/,
        ordinal: function (e) {
          var s = e % 10,
            i =
              ~~((e % 100) / 10) === 1
                ? 'th'
                : s === 1
                  ? 'st'
                  : s === 2
                    ? 'nd'
                    : s === 3
                      ? 'rd'
                      : 'th'
          return e + i
        },
        week: {dow: 1, doy: 4},
      })
      var Xa = {
        0: '-\u0443\u043C',
        1: '-\u0443\u043C',
        2: '-\u044E\u043C',
        3: '-\u044E\u043C',
        4: '-\u0443\u043C',
        5: '-\u0443\u043C',
        6: '-\u0443\u043C',
        7: '-\u0443\u043C',
        8: '-\u0443\u043C',
        9: '-\u0443\u043C',
        10: '-\u0443\u043C',
        12: '-\u0443\u043C',
        13: '-\u0443\u043C',
        20: '-\u0443\u043C',
        30: '-\u044E\u043C',
        40: '-\u0443\u043C',
        50: '-\u0443\u043C',
        60: '-\u0443\u043C',
        70: '-\u0443\u043C',
        80: '-\u0443\u043C',
        90: '-\u0443\u043C',
        100: '-\u0443\u043C',
      }
      u.defineLocale('tg', {
        months: {
          format:
            '\u044F\u043D\u0432\u0430\u0440\u0438_\u0444\u0435\u0432\u0440\u0430\u043B\u0438_\u043C\u0430\u0440\u0442\u0438_\u0430\u043F\u0440\u0435\u043B\u0438_\u043C\u0430\u0439\u0438_\u0438\u044E\u043D\u0438_\u0438\u044E\u043B\u0438_\u0430\u0432\u0433\u0443\u0441\u0442\u0438_\u0441\u0435\u043D\u0442\u044F\u0431\u0440\u0438_\u043E\u043A\u0442\u044F\u0431\u0440\u0438_\u043D\u043E\u044F\u0431\u0440\u0438_\u0434\u0435\u043A\u0430\u0431\u0440\u0438'.split(
              '_',
            ),
          standalone:
            '\u044F\u043D\u0432\u0430\u0440_\u0444\u0435\u0432\u0440\u0430\u043B_\u043C\u0430\u0440\u0442_\u0430\u043F\u0440\u0435\u043B_\u043C\u0430\u0439_\u0438\u044E\u043D_\u0438\u044E\u043B_\u0430\u0432\u0433\u0443\u0441\u0442_\u0441\u0435\u043D\u0442\u044F\u0431\u0440_\u043E\u043A\u0442\u044F\u0431\u0440_\u043D\u043E\u044F\u0431\u0440_\u0434\u0435\u043A\u0430\u0431\u0440'.split(
              '_',
            ),
        },
        monthsShort:
          '\u044F\u043D\u0432_\u0444\u0435\u0432_\u043C\u0430\u0440_\u0430\u043F\u0440_\u043C\u0430\u0439_\u0438\u044E\u043D_\u0438\u044E\u043B_\u0430\u0432\u0433_\u0441\u0435\u043D_\u043E\u043A\u0442_\u043D\u043E\u044F_\u0434\u0435\u043A'.split(
            '_',
          ),
        weekdays:
          '\u044F\u043A\u0448\u0430\u043D\u0431\u0435_\u0434\u0443\u0448\u0430\u043D\u0431\u0435_\u0441\u0435\u0448\u0430\u043D\u0431\u0435_\u0447\u043E\u0440\u0448\u0430\u043D\u0431\u0435_\u043F\u0430\u043D\u04B7\u0448\u0430\u043D\u0431\u0435_\u04B7\u0443\u043C\u044A\u0430_\u0448\u0430\u043D\u0431\u0435'.split(
            '_',
          ),
        weekdaysShort:
          '\u044F\u0448\u0431_\u0434\u0448\u0431_\u0441\u0448\u0431_\u0447\u0448\u0431_\u043F\u0448\u0431_\u04B7\u0443\u043C_\u0448\u043D\u0431'.split(
            '_',
          ),
        weekdaysMin:
          '\u044F\u0448_\u0434\u0448_\u0441\u0448_\u0447\u0448_\u043F\u0448_\u04B7\u043C_\u0448\u0431'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay:
            '[\u0418\u043C\u0440\u04EF\u0437 \u0441\u043E\u0430\u0442\u0438] LT',
          nextDay:
            '[\u0424\u0430\u0440\u0434\u043E \u0441\u043E\u0430\u0442\u0438] LT',
          lastDay:
            '[\u0414\u0438\u0440\u04EF\u0437 \u0441\u043E\u0430\u0442\u0438] LT',
          nextWeek:
            'dddd[\u0438] [\u04B3\u0430\u0444\u0442\u0430\u0438 \u043E\u044F\u043D\u0434\u0430 \u0441\u043E\u0430\u0442\u0438] LT',
          lastWeek:
            'dddd[\u0438] [\u04B3\u0430\u0444\u0442\u0430\u0438 \u0433\u0443\u0437\u0430\u0448\u0442\u0430 \u0441\u043E\u0430\u0442\u0438] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0431\u0430\u044A\u0434\u0438 %s',
          past: '%s \u043F\u0435\u0448',
          s: '\u044F\u043A\u0447\u0430\u043D\u0434 \u0441\u043E\u043D\u0438\u044F',
          m: '\u044F\u043A \u0434\u0430\u049B\u0438\u049B\u0430',
          mm: '%d \u0434\u0430\u049B\u0438\u049B\u0430',
          h: '\u044F\u043A \u0441\u043E\u0430\u0442',
          hh: '%d \u0441\u043E\u0430\u0442',
          d: '\u044F\u043A \u0440\u04EF\u0437',
          dd: '%d \u0440\u04EF\u0437',
          M: '\u044F\u043A \u043C\u043E\u04B3',
          MM: '%d \u043C\u043E\u04B3',
          y: '\u044F\u043A \u0441\u043E\u043B',
          yy: '%d \u0441\u043E\u043B',
        },
        meridiemParse: /шаб|субҳ|рӯз|бегоҳ/,
        meridiemHour: function (e, s) {
          if ((e === 12 && (e = 0), s === '\u0448\u0430\u0431'))
            return e < 4 ? e : e + 12
          if (s === '\u0441\u0443\u0431\u04B3') return e
          if (s === '\u0440\u04EF\u0437') return e >= 11 ? e : e + 12
          if (s === '\u0431\u0435\u0433\u043E\u04B3') return e + 12
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u0448\u0430\u0431'
            : e < 11
              ? '\u0441\u0443\u0431\u04B3'
              : e < 16
                ? '\u0440\u04EF\u0437'
                : e < 19
                  ? '\u0431\u0435\u0433\u043E\u04B3'
                  : '\u0448\u0430\u0431'
        },
        dayOfMonthOrdinalParse: /\d{1,2}-(ум|юм)/,
        ordinal: function (e) {
          var s = e % 10,
            i = e >= 100 ? 100 : null
          return e + (Xa[e] || Xa[s] || Xa[i])
        },
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('th', {
        months:
          '\u0E21\u0E01\u0E23\u0E32\u0E04\u0E21_\u0E01\u0E38\u0E21\u0E20\u0E32\u0E1E\u0E31\u0E19\u0E18\u0E4C_\u0E21\u0E35\u0E19\u0E32\u0E04\u0E21_\u0E40\u0E21\u0E29\u0E32\u0E22\u0E19_\u0E1E\u0E24\u0E29\u0E20\u0E32\u0E04\u0E21_\u0E21\u0E34\u0E16\u0E38\u0E19\u0E32\u0E22\u0E19_\u0E01\u0E23\u0E01\u0E0E\u0E32\u0E04\u0E21_\u0E2A\u0E34\u0E07\u0E2B\u0E32\u0E04\u0E21_\u0E01\u0E31\u0E19\u0E22\u0E32\u0E22\u0E19_\u0E15\u0E38\u0E25\u0E32\u0E04\u0E21_\u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19_\u0E18\u0E31\u0E19\u0E27\u0E32\u0E04\u0E21'.split(
            '_',
          ),
        monthsShort:
          '\u0E21.\u0E04._\u0E01.\u0E1E._\u0E21\u0E35.\u0E04._\u0E40\u0E21.\u0E22._\u0E1E.\u0E04._\u0E21\u0E34.\u0E22._\u0E01.\u0E04._\u0E2A.\u0E04._\u0E01.\u0E22._\u0E15.\u0E04._\u0E1E.\u0E22._\u0E18.\u0E04.'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          '\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C_\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C_\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23_\u0E1E\u0E38\u0E18_\u0E1E\u0E24\u0E2B\u0E31\u0E2A\u0E1A\u0E14\u0E35_\u0E28\u0E38\u0E01\u0E23\u0E4C_\u0E40\u0E2A\u0E32\u0E23\u0E4C'.split(
            '_',
          ),
        weekdaysShort:
          '\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C_\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C_\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23_\u0E1E\u0E38\u0E18_\u0E1E\u0E24\u0E2B\u0E31\u0E2A_\u0E28\u0E38\u0E01\u0E23\u0E4C_\u0E40\u0E2A\u0E32\u0E23\u0E4C'.split(
            '_',
          ),
        weekdaysMin:
          '\u0E2D\u0E32._\u0E08._\u0E2D._\u0E1E._\u0E1E\u0E24._\u0E28._\u0E2A.'.split(
            '_',
          ),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'H:mm',
          LTS: 'H:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY \u0E40\u0E27\u0E25\u0E32 H:mm',
          LLLL: '\u0E27\u0E31\u0E19dddd\u0E17\u0E35\u0E48 D MMMM YYYY \u0E40\u0E27\u0E25\u0E32 H:mm',
        },
        meridiemParse: /ก่อนเที่ยง|หลังเที่ยง/,
        isPM: function (e) {
          return (
            e === '\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E07'
          )
        },
        meridiem: function (e, s, i) {
          return e < 12
            ? '\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E17\u0E35\u0E48\u0E22\u0E07'
            : '\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E07'
        },
        calendar: {
          sameDay:
            '[\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49 \u0E40\u0E27\u0E25\u0E32] LT',
          nextDay:
            '[\u0E1E\u0E23\u0E38\u0E48\u0E07\u0E19\u0E35\u0E49 \u0E40\u0E27\u0E25\u0E32] LT',
          nextWeek:
            'dddd[\u0E2B\u0E19\u0E49\u0E32 \u0E40\u0E27\u0E25\u0E32] LT',
          lastDay:
            '[\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E27\u0E32\u0E19\u0E19\u0E35\u0E49 \u0E40\u0E27\u0E25\u0E32] LT',
          lastWeek:
            '[\u0E27\u0E31\u0E19]dddd[\u0E17\u0E35\u0E48\u0E41\u0E25\u0E49\u0E27 \u0E40\u0E27\u0E25\u0E32] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0E2D\u0E35\u0E01 %s',
          past: '%s\u0E17\u0E35\u0E48\u0E41\u0E25\u0E49\u0E27',
          s: '\u0E44\u0E21\u0E48\u0E01\u0E35\u0E48\u0E27\u0E34\u0E19\u0E32\u0E17\u0E35',
          ss: '%d \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35',
          m: '1 \u0E19\u0E32\u0E17\u0E35',
          mm: '%d \u0E19\u0E32\u0E17\u0E35',
          h: '1 \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07',
          hh: '%d \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07',
          d: '1 \u0E27\u0E31\u0E19',
          dd: '%d \u0E27\u0E31\u0E19',
          w: '1 \u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C',
          ww: '%d \u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C',
          M: '1 \u0E40\u0E14\u0E37\u0E2D\u0E19',
          MM: '%d \u0E40\u0E14\u0E37\u0E2D\u0E19',
          y: '1 \u0E1B\u0E35',
          yy: '%d \u0E1B\u0E35',
        },
      })
      var Be = {
        1: "'inji",
        5: "'inji",
        8: "'inji",
        70: "'inji",
        80: "'inji",
        2: "'nji",
        7: "'nji",
        20: "'nji",
        50: "'nji",
        3: "'\xFCnji",
        4: "'\xFCnji",
        100: "'\xFCnji",
        6: "'njy",
        9: "'unjy",
        10: "'unjy",
        30: "'unjy",
        60: "'ynjy",
        90: "'ynjy",
      }
      u.defineLocale('tk', {
        months:
          '\xDDanwar_Fewral_Mart_Aprel_Ma\xFD_I\xFDun_I\xFDul_Awgust_Sent\xFDabr_Okt\xFDabr_No\xFDabr_Dekabr'.split(
            '_',
          ),
        monthsShort:
          '\xDDan_Few_Mar_Apr_Ma\xFD_I\xFDn_I\xFDl_Awg_Sen_Okt_No\xFD_Dek'.split(
            '_',
          ),
        weekdays:
          '\xDDek\u015Fenbe_Du\u015Fenbe_Si\u015Fenbe_\xC7ar\u015Fenbe_Pen\u015Fenbe_Anna_\u015Eenbe'.split(
            '_',
          ),
        weekdaysShort: '\xDDek_Du\u015F_Si\u015F_\xC7ar_Pen_Ann_\u015Een'.split(
          '_',
        ),
        weekdaysMin: '\xDDk_D\u015F_S\u015F_\xC7r_Pn_An_\u015En'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[bug\xFCn sagat] LT',
          nextDay: '[ertir sagat] LT',
          nextWeek: '[indiki] dddd [sagat] LT',
          lastDay: '[d\xFC\xFDn] LT',
          lastWeek: '[ge\xE7en] dddd [sagat] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s so\u0148',
          past: '%s \xF6\u0148',
          s: 'birn\xE4\xE7e sekunt',
          m: 'bir minut',
          mm: '%d minut',
          h: 'bir sagat',
          hh: '%d sagat',
          d: 'bir g\xFCn',
          dd: '%d g\xFCn',
          M: 'bir a\xFD',
          MM: '%d a\xFD',
          y: 'bir \xFDyl',
          yy: '%d \xFDyl',
        },
        ordinal: function (e, s) {
          switch (s) {
            case 'd':
            case 'D':
            case 'Do':
            case 'DD':
              return e
            default:
              if (e === 0) return e + "'unjy"
              var i = e % 10,
                _ = (e % 100) - i,
                l = e >= 100 ? 100 : null
              return e + (Be[i] || Be[_] || Be[l])
          }
        },
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('tl-ph', {
        months:
          'Enero_Pebrero_Marso_Abril_Mayo_Hunyo_Hulyo_Agosto_Setyembre_Oktubre_Nobyembre_Disyembre'.split(
            '_',
          ),
        monthsShort: 'Ene_Peb_Mar_Abr_May_Hun_Hul_Ago_Set_Okt_Nob_Dis'.split(
          '_',
        ),
        weekdays:
          'Linggo_Lunes_Martes_Miyerkules_Huwebes_Biyernes_Sabado'.split('_'),
        weekdaysShort: 'Lin_Lun_Mar_Miy_Huw_Biy_Sab'.split('_'),
        weekdaysMin: 'Li_Lu_Ma_Mi_Hu_Bi_Sab'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'MM/D/YYYY',
          LL: 'MMMM D, YYYY',
          LLL: 'MMMM D, YYYY HH:mm',
          LLLL: 'dddd, MMMM DD, YYYY HH:mm',
        },
        calendar: {
          sameDay: 'LT [ngayong araw]',
          nextDay: '[Bukas ng] LT',
          nextWeek: 'LT [sa susunod na] dddd',
          lastDay: 'LT [kahapon]',
          lastWeek: 'LT [noong nakaraang] dddd',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'sa loob ng %s',
          past: '%s ang nakalipas',
          s: 'ilang segundo',
          ss: '%d segundo',
          m: 'isang minuto',
          mm: '%d minuto',
          h: 'isang oras',
          hh: '%d oras',
          d: 'isang araw',
          dd: '%d araw',
          M: 'isang buwan',
          MM: '%d buwan',
          y: 'isang taon',
          yy: '%d taon',
        },
        dayOfMonthOrdinalParse: /\d{1,2}/,
        ordinal: function (e) {
          return e
        },
        week: {dow: 1, doy: 4},
      })
      var Ye = 'pagh_wa\u2019_cha\u2019_wej_loS_vagh_jav_Soch_chorgh_Hut'.split(
        '_',
      )
      function et(e) {
        var s = e
        return (
          (s =
            e.indexOf('jaj') !== -1
              ? s.slice(0, -3) + 'leS'
              : e.indexOf('jar') !== -1
                ? s.slice(0, -3) + 'waQ'
                : e.indexOf('DIS') !== -1
                  ? s.slice(0, -3) + 'nem'
                  : s + ' pIq'),
          s
        )
      }
      function Ls(e) {
        var s = e
        return (
          (s =
            e.indexOf('jaj') !== -1
              ? s.slice(0, -3) + 'Hu\u2019'
              : e.indexOf('jar') !== -1
                ? s.slice(0, -3) + 'wen'
                : e.indexOf('DIS') !== -1
                  ? s.slice(0, -3) + 'ben'
                  : s + ' ret'),
          s
        )
      }
      function C(e, s, i, _) {
        var l = Ys(e)
        switch (i) {
          case 'ss':
            return l + ' lup'
          case 'mm':
            return l + ' tup'
          case 'hh':
            return l + ' rep'
          case 'dd':
            return l + ' jaj'
          case 'MM':
            return l + ' jar'
          case 'yy':
            return l + ' DIS'
        }
      }
      function Ys(e) {
        var s = Math.floor((e % 1e3) / 100),
          i = Math.floor((e % 100) / 10),
          _ = e % 10,
          l = ''
        return (
          s > 0 && (l += Ye[s] + 'vatlh'),
          i > 0 && (l += (l !== '' ? ' ' : '') + Ye[i] + 'maH'),
          _ > 0 && (l += (l !== '' ? ' ' : '') + Ye[_]),
          l === '' ? 'pagh' : l
        )
      }
      u.defineLocale('tlh', {
        months:
          'tera\u2019 jar wa\u2019_tera\u2019 jar cha\u2019_tera\u2019 jar wej_tera\u2019 jar loS_tera\u2019 jar vagh_tera\u2019 jar jav_tera\u2019 jar Soch_tera\u2019 jar chorgh_tera\u2019 jar Hut_tera\u2019 jar wa\u2019maH_tera\u2019 jar wa\u2019maH wa\u2019_tera\u2019 jar wa\u2019maH cha\u2019'.split(
            '_',
          ),
        monthsShort:
          'jar wa\u2019_jar cha\u2019_jar wej_jar loS_jar vagh_jar jav_jar Soch_jar chorgh_jar Hut_jar wa\u2019maH_jar wa\u2019maH wa\u2019_jar wa\u2019maH cha\u2019'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'lojmItjaj_DaSjaj_povjaj_ghItlhjaj_loghjaj_buqjaj_ghInjaj'.split('_'),
        weekdaysShort:
          'lojmItjaj_DaSjaj_povjaj_ghItlhjaj_loghjaj_buqjaj_ghInjaj'.split('_'),
        weekdaysMin:
          'lojmItjaj_DaSjaj_povjaj_ghItlhjaj_loghjaj_buqjaj_ghInjaj'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[DaHjaj] LT',
          nextDay: '[wa\u2019leS] LT',
          nextWeek: 'LLL',
          lastDay: '[wa\u2019Hu\u2019] LT',
          lastWeek: 'LLL',
          sameElse: 'L',
        },
        relativeTime: {
          future: et,
          past: Ls,
          s: 'puS lup',
          ss: C,
          m: 'wa\u2019 tup',
          mm: C,
          h: 'wa\u2019 rep',
          hh: C,
          d: 'wa\u2019 jaj',
          dd: C,
          M: 'wa\u2019 jar',
          MM: C,
          y: 'wa\u2019 DIS',
          yy: C,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      var _a = {
        1: "'inci",
        5: "'inci",
        8: "'inci",
        70: "'inci",
        80: "'inci",
        2: "'nci",
        7: "'nci",
        20: "'nci",
        50: "'nci",
        3: "'\xFCnc\xFC",
        4: "'\xFCnc\xFC",
        100: "'\xFCnc\xFC",
        6: "'nc\u0131",
        9: "'uncu",
        10: "'uncu",
        30: "'uncu",
        60: "'\u0131nc\u0131",
        90: "'\u0131nc\u0131",
      }
      u.defineLocale('tr', {
        months:
          'Ocak_\u015Eubat_Mart_Nisan_May\u0131s_Haziran_Temmuz_A\u011Fustos_Eyl\xFCl_Ekim_Kas\u0131m_Aral\u0131k'.split(
            '_',
          ),
        monthsShort:
          'Oca_\u015Eub_Mar_Nis_May_Haz_Tem_A\u011Fu_Eyl_Eki_Kas_Ara'.split(
            '_',
          ),
        weekdays:
          'Pazar_Pazartesi_Sal\u0131_\xC7ar\u015Famba_Per\u015Fembe_Cuma_Cumartesi'.split(
            '_',
          ),
        weekdaysShort: 'Paz_Pzt_Sal_\xC7ar_Per_Cum_Cmt'.split('_'),
        weekdaysMin: 'Pz_Pt_Sa_\xC7a_Pe_Cu_Ct'.split('_'),
        meridiem: function (e, s, i) {
          return e < 12 ? (i ? '\xF6\xF6' : '\xD6\xD6') : i ? '\xF6s' : '\xD6S'
        },
        meridiemParse: /öö|ÖÖ|ös|ÖS/,
        isPM: function (e) {
          return e === '\xF6s' || e === '\xD6S'
        },
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[bug\xFCn saat] LT',
          nextDay: '[yar\u0131n saat] LT',
          nextWeek: '[gelecek] dddd [saat] LT',
          lastDay: '[d\xFCn] LT',
          lastWeek: '[ge\xE7en] dddd [saat] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s sonra',
          past: '%s \xF6nce',
          s: 'birka\xE7 saniye',
          ss: '%d saniye',
          m: 'bir dakika',
          mm: '%d dakika',
          h: 'bir saat',
          hh: '%d saat',
          d: 'bir g\xFCn',
          dd: '%d g\xFCn',
          w: 'bir hafta',
          ww: '%d hafta',
          M: 'bir ay',
          MM: '%d ay',
          y: 'bir y\u0131l',
          yy: '%d y\u0131l',
        },
        ordinal: function (e, s) {
          switch (s) {
            case 'd':
            case 'D':
            case 'Do':
            case 'DD':
              return e
            default:
              if (e === 0) return e + "'\u0131nc\u0131"
              var i = e % 10,
                _ = (e % 100) - i,
                l = e >= 100 ? 100 : null
              return e + (_a[i] || _a[_] || _a[l])
          }
        },
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('tzl', {
        months:
          'Januar_Fevraglh_Mar\xE7_Avr\xEFu_Mai_G\xFCn_Julia_Guscht_Setemvar_Listop\xE4ts_Noemvar_Zecemvar'.split(
            '_',
          ),
        monthsShort: 'Jan_Fev_Mar_Avr_Mai_G\xFCn_Jul_Gus_Set_Lis_Noe_Zec'.split(
          '_',
        ),
        weekdays:
          'S\xFAladi_L\xFAne\xE7i_Maitzi_M\xE1rcuri_Xh\xFAadi_Vi\xE9ner\xE7i_S\xE1turi'.split(
            '_',
          ),
        weekdaysShort: 'S\xFAl_L\xFAn_Mai_M\xE1r_Xh\xFA_Vi\xE9_S\xE1t'.split(
          '_',
        ),
        weekdaysMin: 'S\xFA_L\xFA_Ma_M\xE1_Xh_Vi_S\xE1'.split('_'),
        longDateFormat: {
          LT: 'HH.mm',
          LTS: 'HH.mm.ss',
          L: 'DD.MM.YYYY',
          LL: 'D. MMMM [dallas] YYYY',
          LLL: 'D. MMMM [dallas] YYYY HH.mm',
          LLLL: 'dddd, [li] D. MMMM [dallas] YYYY HH.mm',
        },
        meridiemParse: /d'o|d'a/i,
        isPM: function (e) {
          return e.toLowerCase() === "d'o"
        },
        meridiem: function (e, s, i) {
          return e > 11 ? (i ? "d'o" : "D'O") : i ? "d'a" : "D'A"
        },
        calendar: {
          sameDay: '[oxhi \xE0] LT',
          nextDay: '[dem\xE0 \xE0] LT',
          nextWeek: 'dddd [\xE0] LT',
          lastDay: '[ieiri \xE0] LT',
          lastWeek: '[s\xFCr el] dddd [lasteu \xE0] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'osprei %s',
          past: 'ja%s',
          s: ne,
          ss: ne,
          m: ne,
          mm: ne,
          h: ne,
          hh: ne,
          d: ne,
          dd: ne,
          M: ne,
          MM: ne,
          y: ne,
          yy: ne,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {dow: 1, doy: 4},
      })
      function ne(e, s, i, _) {
        var l = {
          s: ['viensas secunds', "'iensas secunds"],
          ss: [e + ' secunds', '' + e + ' secunds'],
          m: ["'n m\xEDut", "'iens m\xEDut"],
          mm: [e + ' m\xEDuts', '' + e + ' m\xEDuts'],
          h: ["'n \xFEora", "'iensa \xFEora"],
          hh: [e + ' \xFEoras', '' + e + ' \xFEoras'],
          d: ["'n ziua", "'iensa ziua"],
          dd: [e + ' ziuas', '' + e + ' ziuas'],
          M: ["'n mes", "'iens mes"],
          MM: [e + ' mesen', '' + e + ' mesen'],
          y: ["'n ar", "'iens ar"],
          yy: [e + ' ars', '' + e + ' ars'],
        }
        return _ || s ? l[i][0] : l[i][1]
      }
      u.defineLocale('tzm-latn', {
        months:
          'innayr_br\u02E4ayr\u02E4_mar\u02E4s\u02E4_ibrir_mayyw_ywnyw_ywlywz_\u0263w\u0161t_\u0161wtanbir_kt\u02E4wbr\u02E4_nwwanbir_dwjnbir'.split(
            '_',
          ),
        monthsShort:
          'innayr_br\u02E4ayr\u02E4_mar\u02E4s\u02E4_ibrir_mayyw_ywnyw_ywlywz_\u0263w\u0161t_\u0161wtanbir_kt\u02E4wbr\u02E4_nwwanbir_dwjnbir'.split(
            '_',
          ),
        weekdays: 'asamas_aynas_asinas_akras_akwas_asimwas_asi\u1E0Dyas'.split(
          '_',
        ),
        weekdaysShort:
          'asamas_aynas_asinas_akras_akwas_asimwas_asi\u1E0Dyas'.split('_'),
        weekdaysMin:
          'asamas_aynas_asinas_akras_akwas_asimwas_asi\u1E0Dyas'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[asdkh g] LT',
          nextDay: '[aska g] LT',
          nextWeek: 'dddd [g] LT',
          lastDay: '[assant g] LT',
          lastWeek: 'dddd [g] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'dadkh s yan %s',
          past: 'yan %s',
          s: 'imik',
          ss: '%d imik',
          m: 'minu\u1E0D',
          mm: '%d minu\u1E0D',
          h: 'sa\u025Ba',
          hh: '%d tassa\u025Bin',
          d: 'ass',
          dd: '%d ossan',
          M: 'ayowr',
          MM: '%d iyyirn',
          y: 'asgas',
          yy: '%d isgasn',
        },
        week: {dow: 6, doy: 12},
      })
      u.defineLocale('tzm', {
        months:
          '\u2D49\u2D4F\u2D4F\u2D30\u2D62\u2D54_\u2D31\u2D55\u2D30\u2D62\u2D55_\u2D4E\u2D30\u2D55\u2D5A_\u2D49\u2D31\u2D54\u2D49\u2D54_\u2D4E\u2D30\u2D62\u2D62\u2D53_\u2D62\u2D53\u2D4F\u2D62\u2D53_\u2D62\u2D53\u2D4D\u2D62\u2D53\u2D63_\u2D56\u2D53\u2D5B\u2D5C_\u2D5B\u2D53\u2D5C\u2D30\u2D4F\u2D31\u2D49\u2D54_\u2D3D\u2D5F\u2D53\u2D31\u2D55_\u2D4F\u2D53\u2D61\u2D30\u2D4F\u2D31\u2D49\u2D54_\u2D37\u2D53\u2D4A\u2D4F\u2D31\u2D49\u2D54'.split(
            '_',
          ),
        monthsShort:
          '\u2D49\u2D4F\u2D4F\u2D30\u2D62\u2D54_\u2D31\u2D55\u2D30\u2D62\u2D55_\u2D4E\u2D30\u2D55\u2D5A_\u2D49\u2D31\u2D54\u2D49\u2D54_\u2D4E\u2D30\u2D62\u2D62\u2D53_\u2D62\u2D53\u2D4F\u2D62\u2D53_\u2D62\u2D53\u2D4D\u2D62\u2D53\u2D63_\u2D56\u2D53\u2D5B\u2D5C_\u2D5B\u2D53\u2D5C\u2D30\u2D4F\u2D31\u2D49\u2D54_\u2D3D\u2D5F\u2D53\u2D31\u2D55_\u2D4F\u2D53\u2D61\u2D30\u2D4F\u2D31\u2D49\u2D54_\u2D37\u2D53\u2D4A\u2D4F\u2D31\u2D49\u2D54'.split(
            '_',
          ),
        weekdays:
          '\u2D30\u2D59\u2D30\u2D4E\u2D30\u2D59_\u2D30\u2D62\u2D4F\u2D30\u2D59_\u2D30\u2D59\u2D49\u2D4F\u2D30\u2D59_\u2D30\u2D3D\u2D54\u2D30\u2D59_\u2D30\u2D3D\u2D61\u2D30\u2D59_\u2D30\u2D59\u2D49\u2D4E\u2D61\u2D30\u2D59_\u2D30\u2D59\u2D49\u2D39\u2D62\u2D30\u2D59'.split(
            '_',
          ),
        weekdaysShort:
          '\u2D30\u2D59\u2D30\u2D4E\u2D30\u2D59_\u2D30\u2D62\u2D4F\u2D30\u2D59_\u2D30\u2D59\u2D49\u2D4F\u2D30\u2D59_\u2D30\u2D3D\u2D54\u2D30\u2D59_\u2D30\u2D3D\u2D61\u2D30\u2D59_\u2D30\u2D59\u2D49\u2D4E\u2D61\u2D30\u2D59_\u2D30\u2D59\u2D49\u2D39\u2D62\u2D30\u2D59'.split(
            '_',
          ),
        weekdaysMin:
          '\u2D30\u2D59\u2D30\u2D4E\u2D30\u2D59_\u2D30\u2D62\u2D4F\u2D30\u2D59_\u2D30\u2D59\u2D49\u2D4F\u2D30\u2D59_\u2D30\u2D3D\u2D54\u2D30\u2D59_\u2D30\u2D3D\u2D61\u2D30\u2D59_\u2D30\u2D59\u2D49\u2D4E\u2D61\u2D30\u2D59_\u2D30\u2D59\u2D49\u2D39\u2D62\u2D30\u2D59'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[\u2D30\u2D59\u2D37\u2D45 \u2D34] LT',
          nextDay: '[\u2D30\u2D59\u2D3D\u2D30 \u2D34] LT',
          nextWeek: 'dddd [\u2D34] LT',
          lastDay: '[\u2D30\u2D5A\u2D30\u2D4F\u2D5C \u2D34] LT',
          lastWeek: 'dddd [\u2D34] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u2D37\u2D30\u2D37\u2D45 \u2D59 \u2D62\u2D30\u2D4F %s',
          past: '\u2D62\u2D30\u2D4F %s',
          s: '\u2D49\u2D4E\u2D49\u2D3D',
          ss: '%d \u2D49\u2D4E\u2D49\u2D3D',
          m: '\u2D4E\u2D49\u2D4F\u2D53\u2D3A',
          mm: '%d \u2D4E\u2D49\u2D4F\u2D53\u2D3A',
          h: '\u2D59\u2D30\u2D44\u2D30',
          hh: '%d \u2D5C\u2D30\u2D59\u2D59\u2D30\u2D44\u2D49\u2D4F',
          d: '\u2D30\u2D59\u2D59',
          dd: '%d o\u2D59\u2D59\u2D30\u2D4F',
          M: '\u2D30\u2D62o\u2D53\u2D54',
          MM: '%d \u2D49\u2D62\u2D62\u2D49\u2D54\u2D4F',
          y: '\u2D30\u2D59\u2D33\u2D30\u2D59',
          yy: '%d \u2D49\u2D59\u2D33\u2D30\u2D59\u2D4F',
        },
        week: {dow: 6, doy: 12},
      })
      u.defineLocale('ug-cn', {
        months:
          '\u064A\u0627\u0646\u06CB\u0627\u0631_\u0641\u06D0\u06CB\u0631\u0627\u0644_\u0645\u0627\u0631\u062A_\u0626\u0627\u067E\u0631\u06D0\u0644_\u0645\u0627\u064A_\u0626\u0649\u064A\u06C7\u0646_\u0626\u0649\u064A\u06C7\u0644_\u0626\u0627\u06CB\u063A\u06C7\u0633\u062A_\u0633\u06D0\u0646\u062A\u06D5\u0628\u0649\u0631_\u0626\u06C6\u0643\u062A\u06D5\u0628\u0649\u0631_\u0646\u0648\u064A\u0627\u0628\u0649\u0631_\u062F\u06D0\u0643\u0627\u0628\u0649\u0631'.split(
            '_',
          ),
        monthsShort:
          '\u064A\u0627\u0646\u06CB\u0627\u0631_\u0641\u06D0\u06CB\u0631\u0627\u0644_\u0645\u0627\u0631\u062A_\u0626\u0627\u067E\u0631\u06D0\u0644_\u0645\u0627\u064A_\u0626\u0649\u064A\u06C7\u0646_\u0626\u0649\u064A\u06C7\u0644_\u0626\u0627\u06CB\u063A\u06C7\u0633\u062A_\u0633\u06D0\u0646\u062A\u06D5\u0628\u0649\u0631_\u0626\u06C6\u0643\u062A\u06D5\u0628\u0649\u0631_\u0646\u0648\u064A\u0627\u0628\u0649\u0631_\u062F\u06D0\u0643\u0627\u0628\u0649\u0631'.split(
            '_',
          ),
        weekdays:
          '\u064A\u06D5\u0643\u0634\u06D5\u0646\u0628\u06D5_\u062F\u06C8\u0634\u06D5\u0646\u0628\u06D5_\u0633\u06D5\u064A\u0634\u06D5\u0646\u0628\u06D5_\u0686\u0627\u0631\u0634\u06D5\u0646\u0628\u06D5_\u067E\u06D5\u064A\u0634\u06D5\u0646\u0628\u06D5_\u062C\u06C8\u0645\u06D5_\u0634\u06D5\u0646\u0628\u06D5'.split(
            '_',
          ),
        weekdaysShort:
          '\u064A\u06D5_\u062F\u06C8_\u0633\u06D5_\u0686\u0627_\u067E\u06D5_\u062C\u06C8_\u0634\u06D5'.split(
            '_',
          ),
        weekdaysMin:
          '\u064A\u06D5_\u062F\u06C8_\u0633\u06D5_\u0686\u0627_\u067E\u06D5_\u062C\u06C8_\u0634\u06D5'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'YYYY-MM-DD',
          LL: 'YYYY-\u064A\u0649\u0644\u0649M-\u0626\u0627\u064A\u0646\u0649\u06ADD-\u0643\u06C8\u0646\u0649',
          LLL: 'YYYY-\u064A\u0649\u0644\u0649M-\u0626\u0627\u064A\u0646\u0649\u06ADD-\u0643\u06C8\u0646\u0649\u060C HH:mm',
          LLLL: 'dddd\u060C YYYY-\u064A\u0649\u0644\u0649M-\u0626\u0627\u064A\u0646\u0649\u06ADD-\u0643\u06C8\u0646\u0649\u060C HH:mm',
        },
        meridiemParse: /يېرىم كېچە|سەھەر|چۈشتىن بۇرۇن|چۈش|چۈشتىن كېيىن|كەچ/,
        meridiemHour: function (e, s) {
          return (
            e === 12 && (e = 0),
            s === '\u064A\u06D0\u0631\u0649\u0645 \u0643\u06D0\u0686\u06D5' ||
            s === '\u0633\u06D5\u06BE\u06D5\u0631' ||
            s ===
              '\u0686\u06C8\u0634\u062A\u0649\u0646 \u0628\u06C7\u0631\u06C7\u0646'
              ? e
              : s ===
                    '\u0686\u06C8\u0634\u062A\u0649\u0646 \u0643\u06D0\u064A\u0649\u0646' ||
                  s === '\u0643\u06D5\u0686'
                ? e + 12
                : e >= 11
                  ? e
                  : e + 12
          )
        },
        meridiem: function (e, s, i) {
          var _ = e * 100 + s
          return _ < 600
            ? '\u064A\u06D0\u0631\u0649\u0645 \u0643\u06D0\u0686\u06D5'
            : _ < 900
              ? '\u0633\u06D5\u06BE\u06D5\u0631'
              : _ < 1130
                ? '\u0686\u06C8\u0634\u062A\u0649\u0646 \u0628\u06C7\u0631\u06C7\u0646'
                : _ < 1230
                  ? '\u0686\u06C8\u0634'
                  : _ < 1800
                    ? '\u0686\u06C8\u0634\u062A\u0649\u0646 \u0643\u06D0\u064A\u0649\u0646'
                    : '\u0643\u06D5\u0686'
        },
        calendar: {
          sameDay:
            '[\u0628\u06C8\u06AF\u06C8\u0646 \u0633\u0627\u0626\u06D5\u062A] LT',
          nextDay:
            '[\u0626\u06D5\u062A\u06D5 \u0633\u0627\u0626\u06D5\u062A] LT',
          nextWeek:
            '[\u0643\u06D0\u0644\u06D5\u0631\u0643\u0649] dddd [\u0633\u0627\u0626\u06D5\u062A] LT',
          lastDay: '[\u062A\u06C6\u0646\u06C8\u06AF\u06C8\u0646] LT',
          lastWeek:
            '[\u0626\u0627\u0644\u062F\u0649\u0646\u0642\u0649] dddd [\u0633\u0627\u0626\u06D5\u062A] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u0643\u06D0\u064A\u0649\u0646',
          past: '%s \u0628\u06C7\u0631\u06C7\u0646',
          s: '\u0646\u06D5\u0686\u0686\u06D5 \u0633\u06D0\u0643\u0648\u0646\u062A',
          ss: '%d \u0633\u06D0\u0643\u0648\u0646\u062A',
          m: '\u0628\u0649\u0631 \u0645\u0649\u0646\u06C7\u062A',
          mm: '%d \u0645\u0649\u0646\u06C7\u062A',
          h: '\u0628\u0649\u0631 \u0633\u0627\u0626\u06D5\u062A',
          hh: '%d \u0633\u0627\u0626\u06D5\u062A',
          d: '\u0628\u0649\u0631 \u0643\u06C8\u0646',
          dd: '%d \u0643\u06C8\u0646',
          M: '\u0628\u0649\u0631 \u0626\u0627\u064A',
          MM: '%d \u0626\u0627\u064A',
          y: '\u0628\u0649\u0631 \u064A\u0649\u0644',
          yy: '%d \u064A\u0649\u0644',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(-كۈنى|-ئاي|-ھەپتە)/,
        ordinal: function (e, s) {
          switch (s) {
            case 'd':
            case 'D':
            case 'DDD':
              return e + '-\u0643\u06C8\u0646\u0649'
            case 'w':
            case 'W':
              return e + '-\u06BE\u06D5\u067E\u062A\u06D5'
            default:
              return e
          }
        },
        preparse: function (e) {
          return e.replace(/،/g, ',')
        },
        postformat: function (e) {
          return e.replace(/,/g, '\u060C')
        },
        week: {dow: 1, doy: 7},
      })
      function ys(e, s) {
        var i = e.split('_')
        return s % 10 === 1 && s % 100 !== 11
          ? i[0]
          : s % 10 >= 2 && s % 10 <= 4 && (s % 100 < 10 || s % 100 >= 20)
            ? i[1]
            : i[2]
      }
      function Pe(e, s, i) {
        var _ = {
          ss: s
            ? '\u0441\u0435\u043A\u0443\u043D\u0434\u0430_\u0441\u0435\u043A\u0443\u043D\u0434\u0438_\u0441\u0435\u043A\u0443\u043D\u0434'
            : '\u0441\u0435\u043A\u0443\u043D\u0434\u0443_\u0441\u0435\u043A\u0443\u043D\u0434\u0438_\u0441\u0435\u043A\u0443\u043D\u0434',
          mm: s
            ? '\u0445\u0432\u0438\u043B\u0438\u043D\u0430_\u0445\u0432\u0438\u043B\u0438\u043D\u0438_\u0445\u0432\u0438\u043B\u0438\u043D'
            : '\u0445\u0432\u0438\u043B\u0438\u043D\u0443_\u0445\u0432\u0438\u043B\u0438\u043D\u0438_\u0445\u0432\u0438\u043B\u0438\u043D',
          hh: s
            ? '\u0433\u043E\u0434\u0438\u043D\u0430_\u0433\u043E\u0434\u0438\u043D\u0438_\u0433\u043E\u0434\u0438\u043D'
            : '\u0433\u043E\u0434\u0438\u043D\u0443_\u0433\u043E\u0434\u0438\u043D\u0438_\u0433\u043E\u0434\u0438\u043D',
          dd: '\u0434\u0435\u043D\u044C_\u0434\u043D\u0456_\u0434\u043D\u0456\u0432',
          MM: '\u043C\u0456\u0441\u044F\u0446\u044C_\u043C\u0456\u0441\u044F\u0446\u0456_\u043C\u0456\u0441\u044F\u0446\u0456\u0432',
          yy: '\u0440\u0456\u043A_\u0440\u043E\u043A\u0438_\u0440\u043E\u043A\u0456\u0432',
        }
        return i === 'm'
          ? s
            ? '\u0445\u0432\u0438\u043B\u0438\u043D\u0430'
            : '\u0445\u0432\u0438\u043B\u0438\u043D\u0443'
          : i === 'h'
            ? s
              ? '\u0433\u043E\u0434\u0438\u043D\u0430'
              : '\u0433\u043E\u0434\u0438\u043D\u0443'
            : e + ' ' + ys(_[i], +e)
      }
      function va(e, s) {
        var i = {
            nominative:
              '\u043D\u0435\u0434\u0456\u043B\u044F_\u043F\u043E\u043D\u0435\u0434\u0456\u043B\u043E\u043A_\u0432\u0456\u0432\u0442\u043E\u0440\u043E\u043A_\u0441\u0435\u0440\u0435\u0434\u0430_\u0447\u0435\u0442\u0432\u0435\u0440_\u043F\u2019\u044F\u0442\u043D\u0438\u0446\u044F_\u0441\u0443\u0431\u043E\u0442\u0430'.split(
                '_',
              ),
            accusative:
              '\u043D\u0435\u0434\u0456\u043B\u044E_\u043F\u043E\u043D\u0435\u0434\u0456\u043B\u043E\u043A_\u0432\u0456\u0432\u0442\u043E\u0440\u043E\u043A_\u0441\u0435\u0440\u0435\u0434\u0443_\u0447\u0435\u0442\u0432\u0435\u0440_\u043F\u2019\u044F\u0442\u043D\u0438\u0446\u044E_\u0441\u0443\u0431\u043E\u0442\u0443'.split(
                '_',
              ),
            genitive:
              '\u043D\u0435\u0434\u0456\u043B\u0456_\u043F\u043E\u043D\u0435\u0434\u0456\u043B\u043A\u0430_\u0432\u0456\u0432\u0442\u043E\u0440\u043A\u0430_\u0441\u0435\u0440\u0435\u0434\u0438_\u0447\u0435\u0442\u0432\u0435\u0440\u0433\u0430_\u043F\u2019\u044F\u0442\u043D\u0438\u0446\u0456_\u0441\u0443\u0431\u043E\u0442\u0438'.split(
                '_',
              ),
          },
          _
        return e === !0
          ? i.nominative.slice(1, 7).concat(i.nominative.slice(0, 1))
          : e
            ? ((_ = /(\[[ВвУу]\]) ?dddd/.test(s)
                ? 'accusative'
                : /\[?(?:минулої|наступної)? ?\] ?dddd/.test(s)
                  ? 'genitive'
                  : 'nominative'),
              i[_][e.day()])
            : i.nominative
      }
      function He(e) {
        return function () {
          return e + '\u043E' + (this.hours() === 11 ? '\u0431' : '') + '] LT'
        }
      }
      u.defineLocale('uk', {
        months: {
          format:
            '\u0441\u0456\u0447\u043D\u044F_\u043B\u044E\u0442\u043E\u0433\u043E_\u0431\u0435\u0440\u0435\u0437\u043D\u044F_\u043A\u0432\u0456\u0442\u043D\u044F_\u0442\u0440\u0430\u0432\u043D\u044F_\u0447\u0435\u0440\u0432\u043D\u044F_\u043B\u0438\u043F\u043D\u044F_\u0441\u0435\u0440\u043F\u043D\u044F_\u0432\u0435\u0440\u0435\u0441\u043D\u044F_\u0436\u043E\u0432\u0442\u043D\u044F_\u043B\u0438\u0441\u0442\u043E\u043F\u0430\u0434\u0430_\u0433\u0440\u0443\u0434\u043D\u044F'.split(
              '_',
            ),
          standalone:
            '\u0441\u0456\u0447\u0435\u043D\u044C_\u043B\u044E\u0442\u0438\u0439_\u0431\u0435\u0440\u0435\u0437\u0435\u043D\u044C_\u043A\u0432\u0456\u0442\u0435\u043D\u044C_\u0442\u0440\u0430\u0432\u0435\u043D\u044C_\u0447\u0435\u0440\u0432\u0435\u043D\u044C_\u043B\u0438\u043F\u0435\u043D\u044C_\u0441\u0435\u0440\u043F\u0435\u043D\u044C_\u0432\u0435\u0440\u0435\u0441\u0435\u043D\u044C_\u0436\u043E\u0432\u0442\u0435\u043D\u044C_\u043B\u0438\u0441\u0442\u043E\u043F\u0430\u0434_\u0433\u0440\u0443\u0434\u0435\u043D\u044C'.split(
              '_',
            ),
        },
        monthsShort:
          '\u0441\u0456\u0447_\u043B\u044E\u0442_\u0431\u0435\u0440_\u043A\u0432\u0456\u0442_\u0442\u0440\u0430\u0432_\u0447\u0435\u0440\u0432_\u043B\u0438\u043F_\u0441\u0435\u0440\u043F_\u0432\u0435\u0440_\u0436\u043E\u0432\u0442_\u043B\u0438\u0441\u0442_\u0433\u0440\u0443\u0434'.split(
            '_',
          ),
        weekdays: va,
        weekdaysShort:
          '\u043D\u0434_\u043F\u043D_\u0432\u0442_\u0441\u0440_\u0447\u0442_\u043F\u0442_\u0441\u0431'.split(
            '_',
          ),
        weekdaysMin:
          '\u043D\u0434_\u043F\u043D_\u0432\u0442_\u0441\u0440_\u0447\u0442_\u043F\u0442_\u0441\u0431'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD.MM.YYYY',
          LL: 'D MMMM YYYY \u0440.',
          LLL: 'D MMMM YYYY \u0440., HH:mm',
          LLLL: 'dddd, D MMMM YYYY \u0440., HH:mm',
        },
        calendar: {
          sameDay: He('[\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456 '),
          nextDay: He('[\u0417\u0430\u0432\u0442\u0440\u0430 '),
          lastDay: He('[\u0412\u0447\u043E\u0440\u0430 '),
          nextWeek: He('[\u0423] dddd ['),
          lastWeek: function () {
            switch (this.day()) {
              case 0:
              case 3:
              case 5:
              case 6:
                return He(
                  '[\u041C\u0438\u043D\u0443\u043B\u043E\u0457] dddd [',
                ).call(this)
              case 1:
              case 2:
              case 4:
                return He(
                  '[\u041C\u0438\u043D\u0443\u043B\u043E\u0433\u043E] dddd [',
                ).call(this)
            }
          },
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u0437\u0430 %s',
          past: '%s \u0442\u043E\u043C\u0443',
          s: '\u0434\u0435\u043A\u0456\u043B\u044C\u043A\u0430 \u0441\u0435\u043A\u0443\u043D\u0434',
          ss: Pe,
          m: Pe,
          mm: Pe,
          h: '\u0433\u043E\u0434\u0438\u043D\u0443',
          hh: Pe,
          d: '\u0434\u0435\u043D\u044C',
          dd: Pe,
          M: '\u043C\u0456\u0441\u044F\u0446\u044C',
          MM: Pe,
          y: '\u0440\u0456\u043A',
          yy: Pe,
        },
        meridiemParse: /ночі|ранку|дня|вечора/,
        isPM: function (e) {
          return /^(дня|вечора)$/.test(e)
        },
        meridiem: function (e, s, i) {
          return e < 4
            ? '\u043D\u043E\u0447\u0456'
            : e < 12
              ? '\u0440\u0430\u043D\u043A\u0443'
              : e < 17
                ? '\u0434\u043D\u044F'
                : '\u0432\u0435\u0447\u043E\u0440\u0430'
        },
        dayOfMonthOrdinalParse: /\d{1,2}-(й|го)/,
        ordinal: function (e, s) {
          switch (s) {
            case 'M':
            case 'd':
            case 'DDD':
            case 'w':
            case 'W':
              return e + '-\u0439'
            case 'D':
              return e + '-\u0433\u043E'
            default:
              return e
          }
        },
        week: {dow: 1, doy: 7},
      })
      var bt = [
          '\u062C\u0646\u0648\u0631\u06CC',
          '\u0641\u0631\u0648\u0631\u06CC',
          '\u0645\u0627\u0631\u0686',
          '\u0627\u067E\u0631\u06CC\u0644',
          '\u0645\u0626\u06CC',
          '\u062C\u0648\u0646',
          '\u062C\u0648\u0644\u0627\u0626\u06CC',
          '\u0627\u06AF\u0633\u062A',
          '\u0633\u062A\u0645\u0628\u0631',
          '\u0627\u06A9\u062A\u0648\u0628\u0631',
          '\u0646\u0648\u0645\u0628\u0631',
          '\u062F\u0633\u0645\u0628\u0631',
        ],
        at = [
          '\u0627\u062A\u0648\u0627\u0631',
          '\u067E\u06CC\u0631',
          '\u0645\u0646\u06AF\u0644',
          '\u0628\u062F\u06BE',
          '\u062C\u0645\u0639\u0631\u0627\u062A',
          '\u062C\u0645\u0639\u06C1',
          '\u06C1\u0641\u062A\u06C1',
        ]
      u.defineLocale('ur', {
        months: bt,
        monthsShort: bt,
        weekdays: at,
        weekdaysShort: at,
        weekdaysMin: at,
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd\u060C D MMMM YYYY HH:mm',
        },
        meridiemParse: /صبح|شام/,
        isPM: function (e) {
          return e === '\u0634\u0627\u0645'
        },
        meridiem: function (e, s, i) {
          return e < 12 ? '\u0635\u0628\u062D' : '\u0634\u0627\u0645'
        },
        calendar: {
          sameDay: '[\u0622\u062C \u0628\u0648\u0642\u062A] LT',
          nextDay: '[\u06A9\u0644 \u0628\u0648\u0642\u062A] LT',
          nextWeek: 'dddd [\u0628\u0648\u0642\u062A] LT',
          lastDay:
            '[\u06AF\u0630\u0634\u062A\u06C1 \u0631\u0648\u0632 \u0628\u0648\u0642\u062A] LT',
          lastWeek:
            '[\u06AF\u0630\u0634\u062A\u06C1] dddd [\u0628\u0648\u0642\u062A] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s \u0628\u0639\u062F',
          past: '%s \u0642\u0628\u0644',
          s: '\u0686\u0646\u062F \u0633\u06CC\u06A9\u0646\u0688',
          ss: '%d \u0633\u06CC\u06A9\u0646\u0688',
          m: '\u0627\u06CC\u06A9 \u0645\u0646\u0679',
          mm: '%d \u0645\u0646\u0679',
          h: '\u0627\u06CC\u06A9 \u06AF\u06BE\u0646\u0679\u06C1',
          hh: '%d \u06AF\u06BE\u0646\u0679\u06D2',
          d: '\u0627\u06CC\u06A9 \u062F\u0646',
          dd: '%d \u062F\u0646',
          M: '\u0627\u06CC\u06A9 \u0645\u0627\u06C1',
          MM: '%d \u0645\u0627\u06C1',
          y: '\u0627\u06CC\u06A9 \u0633\u0627\u0644',
          yy: '%d \u0633\u0627\u0644',
        },
        preparse: function (e) {
          return e.replace(/،/g, ',')
        },
        postformat: function (e) {
          return e.replace(/,/g, '\u060C')
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('uz-latn', {
        months:
          'Yanvar_Fevral_Mart_Aprel_May_Iyun_Iyul_Avgust_Sentabr_Oktabr_Noyabr_Dekabr'.split(
            '_',
          ),
        monthsShort: 'Yan_Fev_Mar_Apr_May_Iyun_Iyul_Avg_Sen_Okt_Noy_Dek'.split(
          '_',
        ),
        weekdays:
          'Yakshanba_Dushanba_Seshanba_Chorshanba_Payshanba_Juma_Shanba'.split(
            '_',
          ),
        weekdaysShort: 'Yak_Dush_Sesh_Chor_Pay_Jum_Shan'.split('_'),
        weekdaysMin: 'Ya_Du_Se_Cho_Pa_Ju_Sha'.split('_'),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'D MMMM YYYY, dddd HH:mm',
        },
        calendar: {
          sameDay: '[Bugun soat] LT [da]',
          nextDay: '[Ertaga] LT [da]',
          nextWeek: 'dddd [kuni soat] LT [da]',
          lastDay: '[Kecha soat] LT [da]',
          lastWeek: "[O'tgan] dddd [kuni soat] LT [da]",
          sameElse: 'L',
        },
        relativeTime: {
          future: 'Yaqin %s ichida',
          past: 'Bir necha %s oldin',
          s: 'soniya',
          ss: '%d soniya',
          m: 'bir daqiqa',
          mm: '%d daqiqa',
          h: 'bir soat',
          hh: '%d soat',
          d: 'bir kun',
          dd: '%d kun',
          M: 'bir oy',
          MM: '%d oy',
          y: 'bir yil',
          yy: '%d yil',
        },
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('uz', {
        months:
          '\u044F\u043D\u0432\u0430\u0440_\u0444\u0435\u0432\u0440\u0430\u043B_\u043C\u0430\u0440\u0442_\u0430\u043F\u0440\u0435\u043B_\u043C\u0430\u0439_\u0438\u044E\u043D_\u0438\u044E\u043B_\u0430\u0432\u0433\u0443\u0441\u0442_\u0441\u0435\u043D\u0442\u044F\u0431\u0440_\u043E\u043A\u0442\u044F\u0431\u0440_\u043D\u043E\u044F\u0431\u0440_\u0434\u0435\u043A\u0430\u0431\u0440'.split(
            '_',
          ),
        monthsShort:
          '\u044F\u043D\u0432_\u0444\u0435\u0432_\u043C\u0430\u0440_\u0430\u043F\u0440_\u043C\u0430\u0439_\u0438\u044E\u043D_\u0438\u044E\u043B_\u0430\u0432\u0433_\u0441\u0435\u043D_\u043E\u043A\u0442_\u043D\u043E\u044F_\u0434\u0435\u043A'.split(
            '_',
          ),
        weekdays:
          '\u042F\u043A\u0448\u0430\u043D\u0431\u0430_\u0414\u0443\u0448\u0430\u043D\u0431\u0430_\u0421\u0435\u0448\u0430\u043D\u0431\u0430_\u0427\u043E\u0440\u0448\u0430\u043D\u0431\u0430_\u041F\u0430\u0439\u0448\u0430\u043D\u0431\u0430_\u0416\u0443\u043C\u0430_\u0428\u0430\u043D\u0431\u0430'.split(
            '_',
          ),
        weekdaysShort:
          '\u042F\u043A\u0448_\u0414\u0443\u0448_\u0421\u0435\u0448_\u0427\u043E\u0440_\u041F\u0430\u0439_\u0416\u0443\u043C_\u0428\u0430\u043D'.split(
            '_',
          ),
        weekdaysMin:
          '\u042F\u043A_\u0414\u0443_\u0421\u0435_\u0427\u043E_\u041F\u0430_\u0416\u0443_\u0428\u0430'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'D MMMM YYYY, dddd HH:mm',
        },
        calendar: {
          sameDay:
            '[\u0411\u0443\u0433\u0443\u043D \u0441\u043E\u0430\u0442] LT [\u0434\u0430]',
          nextDay: '[\u042D\u0440\u0442\u0430\u0433\u0430] LT [\u0434\u0430]',
          nextWeek:
            'dddd [\u043A\u0443\u043D\u0438 \u0441\u043E\u0430\u0442] LT [\u0434\u0430]',
          lastDay:
            '[\u041A\u0435\u0447\u0430 \u0441\u043E\u0430\u0442] LT [\u0434\u0430]',
          lastWeek:
            '[\u0423\u0442\u0433\u0430\u043D] dddd [\u043A\u0443\u043D\u0438 \u0441\u043E\u0430\u0442] LT [\u0434\u0430]',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\u042F\u043A\u0438\u043D %s \u0438\u0447\u0438\u0434\u0430',
          past: '\u0411\u0438\u0440 \u043D\u0435\u0447\u0430 %s \u043E\u043B\u0434\u0438\u043D',
          s: '\u0444\u0443\u0440\u0441\u0430\u0442',
          ss: '%d \u0444\u0443\u0440\u0441\u0430\u0442',
          m: '\u0431\u0438\u0440 \u0434\u0430\u043A\u0438\u043A\u0430',
          mm: '%d \u0434\u0430\u043A\u0438\u043A\u0430',
          h: '\u0431\u0438\u0440 \u0441\u043E\u0430\u0442',
          hh: '%d \u0441\u043E\u0430\u0442',
          d: '\u0431\u0438\u0440 \u043A\u0443\u043D',
          dd: '%d \u043A\u0443\u043D',
          M: '\u0431\u0438\u0440 \u043E\u0439',
          MM: '%d \u043E\u0439',
          y: '\u0431\u0438\u0440 \u0439\u0438\u043B',
          yy: '%d \u0439\u0438\u043B',
        },
        week: {dow: 1, doy: 7},
      })
      u.defineLocale('vi', {
        months:
          'th\xE1ng 1_th\xE1ng 2_th\xE1ng 3_th\xE1ng 4_th\xE1ng 5_th\xE1ng 6_th\xE1ng 7_th\xE1ng 8_th\xE1ng 9_th\xE1ng 10_th\xE1ng 11_th\xE1ng 12'.split(
            '_',
          ),
        monthsShort:
          'Thg 01_Thg 02_Thg 03_Thg 04_Thg 05_Thg 06_Thg 07_Thg 08_Thg 09_Thg 10_Thg 11_Thg 12'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'ch\u1EE7 nh\u1EADt_th\u1EE9 hai_th\u1EE9 ba_th\u1EE9 t\u01B0_th\u1EE9 n\u0103m_th\u1EE9 s\xE1u_th\u1EE9 b\u1EA3y'.split(
            '_',
          ),
        weekdaysShort: 'CN_T2_T3_T4_T5_T6_T7'.split('_'),
        weekdaysMin: 'CN_T2_T3_T4_T5_T6_T7'.split('_'),
        weekdaysParseExact: !0,
        meridiemParse: /sa|ch/i,
        isPM: function (e) {
          return /^ch$/i.test(e)
        },
        meridiem: function (e, s, i) {
          return e < 12 ? (i ? 'sa' : 'SA') : i ? 'ch' : 'CH'
        },
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM [n\u0103m] YYYY',
          LLL: 'D MMMM [n\u0103m] YYYY HH:mm',
          LLLL: 'dddd, D MMMM [n\u0103m] YYYY HH:mm',
          l: 'DD/M/YYYY',
          ll: 'D MMM YYYY',
          lll: 'D MMM YYYY HH:mm',
          llll: 'ddd, D MMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[H\xF4m nay l\xFAc] LT',
          nextDay: '[Ng\xE0y mai l\xFAc] LT',
          nextWeek: 'dddd [tu\u1EA7n t\u1EDBi l\xFAc] LT',
          lastDay: '[H\xF4m qua l\xFAc] LT',
          lastWeek: 'dddd [tu\u1EA7n tr\u01B0\u1EDBc l\xFAc] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '%s t\u1EDBi',
          past: '%s tr\u01B0\u1EDBc',
          s: 'v\xE0i gi\xE2y',
          ss: '%d gi\xE2y',
          m: 'm\u1ED9t ph\xFAt',
          mm: '%d ph\xFAt',
          h: 'm\u1ED9t gi\u1EDD',
          hh: '%d gi\u1EDD',
          d: 'm\u1ED9t ng\xE0y',
          dd: '%d ng\xE0y',
          w: 'm\u1ED9t tu\u1EA7n',
          ww: '%d tu\u1EA7n',
          M: 'm\u1ED9t th\xE1ng',
          MM: '%d th\xE1ng',
          y: 'm\u1ED9t n\u0103m',
          yy: '%d n\u0103m',
        },
        dayOfMonthOrdinalParse: /\d{1,2}/,
        ordinal: function (e) {
          return e
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('x-pseudo', {
        months:
          'J~\xE1\xF1\xFA\xE1~r\xFD_F~\xE9br\xFA~\xE1r\xFD_~M\xE1rc~h_\xC1p~r\xEDl_~M\xE1\xFD_~J\xFA\xF1\xE9~_J\xFAl~\xFD_\xC1\xFA~g\xFAst~_S\xE9p~t\xE9mb~\xE9r_\xD3~ct\xF3b~\xE9r_\xD1~\xF3v\xE9m~b\xE9r_~D\xE9c\xE9~mb\xE9r'.split(
            '_',
          ),
        monthsShort:
          'J~\xE1\xF1_~F\xE9b_~M\xE1r_~\xC1pr_~M\xE1\xFD_~J\xFA\xF1_~J\xFAl_~\xC1\xFAg_~S\xE9p_~\xD3ct_~\xD1\xF3v_~D\xE9c'.split(
            '_',
          ),
        monthsParseExact: !0,
        weekdays:
          'S~\xFA\xF1d\xE1~\xFD_M\xF3~\xF1d\xE1\xFD~_T\xFA\xE9~sd\xE1\xFD~_W\xE9d~\xF1\xE9sd~\xE1\xFD_T~h\xFArs~d\xE1\xFD_~Fr\xEDd~\xE1\xFD_S~\xE1t\xFAr~d\xE1\xFD'.split(
            '_',
          ),
        weekdaysShort:
          'S~\xFA\xF1_~M\xF3\xF1_~T\xFA\xE9_~W\xE9d_~Th\xFA_~Fr\xED_~S\xE1t'.split(
            '_',
          ),
        weekdaysMin: 'S~\xFA_M\xF3~_T\xFA_~W\xE9_T~h_Fr~_S\xE1'.split('_'),
        weekdaysParseExact: !0,
        longDateFormat: {
          LT: 'HH:mm',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY HH:mm',
          LLLL: 'dddd, D MMMM YYYY HH:mm',
        },
        calendar: {
          sameDay: '[T~\xF3d\xE1~\xFD \xE1t] LT',
          nextDay: '[T~\xF3m\xF3~rr\xF3~w \xE1t] LT',
          nextWeek: 'dddd [\xE1t] LT',
          lastDay: '[\xDD~\xE9st~\xE9rd\xE1~\xFD \xE1t] LT',
          lastWeek: '[L~\xE1st] dddd [\xE1t] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: '\xED~\xF1 %s',
          past: '%s \xE1~g\xF3',
          s: '\xE1 ~f\xE9w ~s\xE9c\xF3~\xF1ds',
          ss: '%d s~\xE9c\xF3\xF1~ds',
          m: '\xE1 ~m\xED\xF1~\xFAt\xE9',
          mm: '%d m~\xED\xF1\xFA~t\xE9s',
          h: '\xE1~\xF1 h\xF3~\xFAr',
          hh: '%d h~\xF3\xFArs',
          d: '\xE1 ~d\xE1\xFD',
          dd: '%d d~\xE1\xFDs',
          M: '\xE1 ~m\xF3\xF1~th',
          MM: '%d m~\xF3\xF1t~hs',
          y: '\xE1 ~\xFD\xE9\xE1r',
          yy: '%d \xFD~\xE9\xE1rs',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal: function (e) {
          var s = e % 10,
            i =
              ~~((e % 100) / 10) === 1
                ? 'th'
                : s === 1
                  ? 'st'
                  : s === 2
                    ? 'nd'
                    : s === 3
                      ? 'rd'
                      : 'th'
          return e + i
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('yo', {
        months:
          'S\u1EB9\u0301r\u1EB9\u0301_E\u0300re\u0300le\u0300_\u1EB8r\u1EB9\u0300na\u0300_I\u0300gbe\u0301_E\u0300bibi_O\u0300ku\u0300du_Ag\u1EB9mo_O\u0300gu\u0301n_Owewe_\u1ECC\u0300wa\u0300ra\u0300_Be\u0301lu\u0301_\u1ECC\u0300p\u1EB9\u0300\u0300'.split(
            '_',
          ),
        monthsShort:
          'S\u1EB9\u0301r_E\u0300rl_\u1EB8rn_I\u0300gb_E\u0300bi_O\u0300ku\u0300_Ag\u1EB9_O\u0300gu\u0301_Owe_\u1ECC\u0300wa\u0300_Be\u0301l_\u1ECC\u0300p\u1EB9\u0300\u0300'.split(
            '_',
          ),
        weekdays:
          'A\u0300i\u0300ku\u0301_Aje\u0301_I\u0300s\u1EB9\u0301gun_\u1ECCj\u1ECD\u0301ru\u0301_\u1ECCj\u1ECD\u0301b\u1ECD_\u1EB8ti\u0300_A\u0300ba\u0301m\u1EB9\u0301ta'.split(
            '_',
          ),
        weekdaysShort:
          'A\u0300i\u0300k_Aje\u0301_I\u0300s\u1EB9\u0301_\u1ECCjr_\u1ECCjb_\u1EB8ti\u0300_A\u0300ba\u0301'.split(
            '_',
          ),
        weekdaysMin:
          'A\u0300i\u0300_Aj_I\u0300s_\u1ECCr_\u1ECCb_\u1EB8t_A\u0300b'.split(
            '_',
          ),
        longDateFormat: {
          LT: 'h:mm A',
          LTS: 'h:mm:ss A',
          L: 'DD/MM/YYYY',
          LL: 'D MMMM YYYY',
          LLL: 'D MMMM YYYY h:mm A',
          LLLL: 'dddd, D MMMM YYYY h:mm A',
        },
        calendar: {
          sameDay: '[O\u0300ni\u0300 ni] LT',
          nextDay: '[\u1ECC\u0300la ni] LT',
          nextWeek: "dddd [\u1ECCs\u1EB9\u0300 to\u0301n'b\u1ECD] [ni] LT",
          lastDay: '[A\u0300na ni] LT',
          lastWeek: 'dddd [\u1ECCs\u1EB9\u0300 to\u0301l\u1ECD\u0301] [ni] LT',
          sameElse: 'L',
        },
        relativeTime: {
          future: 'ni\u0301 %s',
          past: '%s k\u1ECDja\u0301',
          s: 'i\u0300s\u1EB9ju\u0301 aaya\u0301 die',
          ss: 'aaya\u0301 %d',
          m: 'i\u0300s\u1EB9ju\u0301 kan',
          mm: 'i\u0300s\u1EB9ju\u0301 %d',
          h: 'wa\u0301kati kan',
          hh: 'wa\u0301kati %d',
          d: '\u1ECDj\u1ECD\u0301 kan',
          dd: '\u1ECDj\u1ECD\u0301 %d',
          M: 'osu\u0300 kan',
          MM: 'osu\u0300 %d',
          y: '\u1ECDdu\u0301n kan',
          yy: '\u1ECDdu\u0301n %d',
        },
        dayOfMonthOrdinalParse: /ọjọ́\s\d{1,2}/,
        ordinal: '\u1ECDj\u1ECD\u0301 %d',
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('zh-cn', {
        months:
          '\u4E00\u6708_\u4E8C\u6708_\u4E09\u6708_\u56DB\u6708_\u4E94\u6708_\u516D\u6708_\u4E03\u6708_\u516B\u6708_\u4E5D\u6708_\u5341\u6708_\u5341\u4E00\u6708_\u5341\u4E8C\u6708'.split(
            '_',
          ),
        monthsShort:
          '1\u6708_2\u6708_3\u6708_4\u6708_5\u6708_6\u6708_7\u6708_8\u6708_9\u6708_10\u6708_11\u6708_12\u6708'.split(
            '_',
          ),
        weekdays:
          '\u661F\u671F\u65E5_\u661F\u671F\u4E00_\u661F\u671F\u4E8C_\u661F\u671F\u4E09_\u661F\u671F\u56DB_\u661F\u671F\u4E94_\u661F\u671F\u516D'.split(
            '_',
          ),
        weekdaysShort:
          '\u5468\u65E5_\u5468\u4E00_\u5468\u4E8C_\u5468\u4E09_\u5468\u56DB_\u5468\u4E94_\u5468\u516D'.split(
            '_',
          ),
        weekdaysMin: '\u65E5_\u4E00_\u4E8C_\u4E09_\u56DB_\u4E94_\u516D'.split(
          '_',
        ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'YYYY/MM/DD',
          LL: 'YYYY\u5E74M\u6708D\u65E5',
          LLL: 'YYYY\u5E74M\u6708D\u65E5Ah\u70B9mm\u5206',
          LLLL: 'YYYY\u5E74M\u6708D\u65E5ddddAh\u70B9mm\u5206',
          l: 'YYYY/M/D',
          ll: 'YYYY\u5E74M\u6708D\u65E5',
          lll: 'YYYY\u5E74M\u6708D\u65E5 HH:mm',
          llll: 'YYYY\u5E74M\u6708D\u65E5dddd HH:mm',
        },
        meridiemParse: /凌晨|早上|上午|中午|下午|晚上/,
        meridiemHour: function (e, s) {
          return (
            e === 12 && (e = 0),
            s === '\u51CC\u6668' || s === '\u65E9\u4E0A' || s === '\u4E0A\u5348'
              ? e
              : s === '\u4E0B\u5348' || s === '\u665A\u4E0A'
                ? e + 12
                : e >= 11
                  ? e
                  : e + 12
          )
        },
        meridiem: function (e, s, i) {
          var _ = e * 100 + s
          return _ < 600
            ? '\u51CC\u6668'
            : _ < 900
              ? '\u65E9\u4E0A'
              : _ < 1130
                ? '\u4E0A\u5348'
                : _ < 1230
                  ? '\u4E2D\u5348'
                  : _ < 1800
                    ? '\u4E0B\u5348'
                    : '\u665A\u4E0A'
        },
        calendar: {
          sameDay: '[\u4ECA\u5929]LT',
          nextDay: '[\u660E\u5929]LT',
          nextWeek: function (e) {
            return e.week() !== this.week() ? '[\u4E0B]dddLT' : '[\u672C]dddLT'
          },
          lastDay: '[\u6628\u5929]LT',
          lastWeek: function (e) {
            return this.week() !== e.week() ? '[\u4E0A]dddLT' : '[\u672C]dddLT'
          },
          sameElse: 'L',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(日|月|周)/,
        ordinal: function (e, s) {
          switch (s) {
            case 'd':
            case 'D':
            case 'DDD':
              return e + '\u65E5'
            case 'M':
              return e + '\u6708'
            case 'w':
            case 'W':
              return e + '\u5468'
            default:
              return e
          }
        },
        relativeTime: {
          future: '%s\u540E',
          past: '%s\u524D',
          s: '\u51E0\u79D2',
          ss: '%d \u79D2',
          m: '1 \u5206\u949F',
          mm: '%d \u5206\u949F',
          h: '1 \u5C0F\u65F6',
          hh: '%d \u5C0F\u65F6',
          d: '1 \u5929',
          dd: '%d \u5929',
          w: '1 \u5468',
          ww: '%d \u5468',
          M: '1 \u4E2A\u6708',
          MM: '%d \u4E2A\u6708',
          y: '1 \u5E74',
          yy: '%d \u5E74',
        },
        week: {dow: 1, doy: 4},
      })
      u.defineLocale('zh-hk', {
        months:
          '\u4E00\u6708_\u4E8C\u6708_\u4E09\u6708_\u56DB\u6708_\u4E94\u6708_\u516D\u6708_\u4E03\u6708_\u516B\u6708_\u4E5D\u6708_\u5341\u6708_\u5341\u4E00\u6708_\u5341\u4E8C\u6708'.split(
            '_',
          ),
        monthsShort:
          '1\u6708_2\u6708_3\u6708_4\u6708_5\u6708_6\u6708_7\u6708_8\u6708_9\u6708_10\u6708_11\u6708_12\u6708'.split(
            '_',
          ),
        weekdays:
          '\u661F\u671F\u65E5_\u661F\u671F\u4E00_\u661F\u671F\u4E8C_\u661F\u671F\u4E09_\u661F\u671F\u56DB_\u661F\u671F\u4E94_\u661F\u671F\u516D'.split(
            '_',
          ),
        weekdaysShort:
          '\u9031\u65E5_\u9031\u4E00_\u9031\u4E8C_\u9031\u4E09_\u9031\u56DB_\u9031\u4E94_\u9031\u516D'.split(
            '_',
          ),
        weekdaysMin: '\u65E5_\u4E00_\u4E8C_\u4E09_\u56DB_\u4E94_\u516D'.split(
          '_',
        ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'YYYY/MM/DD',
          LL: 'YYYY\u5E74M\u6708D\u65E5',
          LLL: 'YYYY\u5E74M\u6708D\u65E5 HH:mm',
          LLLL: 'YYYY\u5E74M\u6708D\u65E5dddd HH:mm',
          l: 'YYYY/M/D',
          ll: 'YYYY\u5E74M\u6708D\u65E5',
          lll: 'YYYY\u5E74M\u6708D\u65E5 HH:mm',
          llll: 'YYYY\u5E74M\u6708D\u65E5dddd HH:mm',
        },
        meridiemParse: /凌晨|早上|上午|中午|下午|晚上/,
        meridiemHour: function (e, s) {
          if (
            (e === 12 && (e = 0),
            s === '\u51CC\u6668' ||
              s === '\u65E9\u4E0A' ||
              s === '\u4E0A\u5348')
          )
            return e
          if (s === '\u4E2D\u5348') return e >= 11 ? e : e + 12
          if (s === '\u4E0B\u5348' || s === '\u665A\u4E0A') return e + 12
        },
        meridiem: function (e, s, i) {
          var _ = e * 100 + s
          return _ < 600
            ? '\u51CC\u6668'
            : _ < 900
              ? '\u65E9\u4E0A'
              : _ < 1200
                ? '\u4E0A\u5348'
                : _ === 1200
                  ? '\u4E2D\u5348'
                  : _ < 1800
                    ? '\u4E0B\u5348'
                    : '\u665A\u4E0A'
        },
        calendar: {
          sameDay: '[\u4ECA\u5929]LT',
          nextDay: '[\u660E\u5929]LT',
          nextWeek: '[\u4E0B]ddddLT',
          lastDay: '[\u6628\u5929]LT',
          lastWeek: '[\u4E0A]ddddLT',
          sameElse: 'L',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(日|月|週)/,
        ordinal: function (e, s) {
          switch (s) {
            case 'd':
            case 'D':
            case 'DDD':
              return e + '\u65E5'
            case 'M':
              return e + '\u6708'
            case 'w':
            case 'W':
              return e + '\u9031'
            default:
              return e
          }
        },
        relativeTime: {
          future: '%s\u5F8C',
          past: '%s\u524D',
          s: '\u5E7E\u79D2',
          ss: '%d \u79D2',
          m: '1 \u5206\u9418',
          mm: '%d \u5206\u9418',
          h: '1 \u5C0F\u6642',
          hh: '%d \u5C0F\u6642',
          d: '1 \u5929',
          dd: '%d \u5929',
          M: '1 \u500B\u6708',
          MM: '%d \u500B\u6708',
          y: '1 \u5E74',
          yy: '%d \u5E74',
        },
      })
      u.defineLocale('zh-mo', {
        months:
          '\u4E00\u6708_\u4E8C\u6708_\u4E09\u6708_\u56DB\u6708_\u4E94\u6708_\u516D\u6708_\u4E03\u6708_\u516B\u6708_\u4E5D\u6708_\u5341\u6708_\u5341\u4E00\u6708_\u5341\u4E8C\u6708'.split(
            '_',
          ),
        monthsShort:
          '1\u6708_2\u6708_3\u6708_4\u6708_5\u6708_6\u6708_7\u6708_8\u6708_9\u6708_10\u6708_11\u6708_12\u6708'.split(
            '_',
          ),
        weekdays:
          '\u661F\u671F\u65E5_\u661F\u671F\u4E00_\u661F\u671F\u4E8C_\u661F\u671F\u4E09_\u661F\u671F\u56DB_\u661F\u671F\u4E94_\u661F\u671F\u516D'.split(
            '_',
          ),
        weekdaysShort:
          '\u9031\u65E5_\u9031\u4E00_\u9031\u4E8C_\u9031\u4E09_\u9031\u56DB_\u9031\u4E94_\u9031\u516D'.split(
            '_',
          ),
        weekdaysMin: '\u65E5_\u4E00_\u4E8C_\u4E09_\u56DB_\u4E94_\u516D'.split(
          '_',
        ),
        longDateFormat: {
          LT: 'HH:mm',
          LTS: 'HH:mm:ss',
          L: 'DD/MM/YYYY',
          LL: 'YYYY\u5E74M\u6708D\u65E5',
          LLL: 'YYYY\u5E74M\u6708D\u65E5 HH:mm',
          LLLL: 'YYYY\u5E74M\u6708D\u65E5dddd HH:mm',
          l: 'D/M/YYYY',
          ll: 'YYYY\u5E74M\u6708D\u65E5',
          lll: 'YYYY\u5E74M\u6708D\u65E5 HH:mm',
          llll: 'YYYY\u5E74M\u6708D\u65E5dddd HH:mm',
        },
        meridiemParse: /凌晨|早上|上午|中午|下午|晚上/,
        meridiemHour: function (e, s) {
          if (
            (e === 12 && (e = 0),
            s === '\u51CC\u6668' ||
              s === '\u65E9\u4E0A' ||
              s === '\u4E0A\u5348')
          )
            return e
          if (s === '\u4E2D\u5348') return e >= 11 ? e : e + 12
          if (s === '\u4E0B\u5348' || s === '\u665A\u4E0A') return e + 12
        },
        meridiem: function (e, s, i) {
          var _ = e * 100 + s
          return _ < 600
            ? '\u51CC\u6668'
            : _ < 900
              ? '\u65E9\u4E0A'
              : _ < 1130
                ? '\u4E0A\u5348'
                : _ < 1230
                  ? '\u4E2D\u5348'
                  : _ < 1800
                    ? '\u4E0B\u5348'
                    : '\u665A\u4E0A'
        },
        calendar: {
          sameDay: '[\u4ECA\u5929] LT',
          nextDay: '[\u660E\u5929] LT',
          nextWeek: '[\u4E0B]dddd LT',
          lastDay: '[\u6628\u5929] LT',
          lastWeek: '[\u4E0A]dddd LT',
          sameElse: 'L',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(日|月|週)/,
        ordinal: function (e, s) {
          switch (s) {
            case 'd':
            case 'D':
            case 'DDD':
              return e + '\u65E5'
            case 'M':
              return e + '\u6708'
            case 'w':
            case 'W':
              return e + '\u9031'
            default:
              return e
          }
        },
        relativeTime: {
          future: '%s\u5167',
          past: '%s\u524D',
          s: '\u5E7E\u79D2',
          ss: '%d \u79D2',
          m: '1 \u5206\u9418',
          mm: '%d \u5206\u9418',
          h: '1 \u5C0F\u6642',
          hh: '%d \u5C0F\u6642',
          d: '1 \u5929',
          dd: '%d \u5929',
          M: '1 \u500B\u6708',
          MM: '%d \u500B\u6708',
          y: '1 \u5E74',
          yy: '%d \u5E74',
        },
      })
      return (
        u.defineLocale('zh-tw', {
          months:
            '\u4E00\u6708_\u4E8C\u6708_\u4E09\u6708_\u56DB\u6708_\u4E94\u6708_\u516D\u6708_\u4E03\u6708_\u516B\u6708_\u4E5D\u6708_\u5341\u6708_\u5341\u4E00\u6708_\u5341\u4E8C\u6708'.split(
              '_',
            ),
          monthsShort:
            '1\u6708_2\u6708_3\u6708_4\u6708_5\u6708_6\u6708_7\u6708_8\u6708_9\u6708_10\u6708_11\u6708_12\u6708'.split(
              '_',
            ),
          weekdays:
            '\u661F\u671F\u65E5_\u661F\u671F\u4E00_\u661F\u671F\u4E8C_\u661F\u671F\u4E09_\u661F\u671F\u56DB_\u661F\u671F\u4E94_\u661F\u671F\u516D'.split(
              '_',
            ),
          weekdaysShort:
            '\u9031\u65E5_\u9031\u4E00_\u9031\u4E8C_\u9031\u4E09_\u9031\u56DB_\u9031\u4E94_\u9031\u516D'.split(
              '_',
            ),
          weekdaysMin: '\u65E5_\u4E00_\u4E8C_\u4E09_\u56DB_\u4E94_\u516D'.split(
            '_',
          ),
          longDateFormat: {
            LT: 'HH:mm',
            LTS: 'HH:mm:ss',
            L: 'YYYY/MM/DD',
            LL: 'YYYY\u5E74M\u6708D\u65E5',
            LLL: 'YYYY\u5E74M\u6708D\u65E5 HH:mm',
            LLLL: 'YYYY\u5E74M\u6708D\u65E5dddd HH:mm',
            l: 'YYYY/M/D',
            ll: 'YYYY\u5E74M\u6708D\u65E5',
            lll: 'YYYY\u5E74M\u6708D\u65E5 HH:mm',
            llll: 'YYYY\u5E74M\u6708D\u65E5dddd HH:mm',
          },
          meridiemParse: /凌晨|早上|上午|中午|下午|晚上/,
          meridiemHour: function (e, s) {
            if (
              (e === 12 && (e = 0),
              s === '\u51CC\u6668' ||
                s === '\u65E9\u4E0A' ||
                s === '\u4E0A\u5348')
            )
              return e
            if (s === '\u4E2D\u5348') return e >= 11 ? e : e + 12
            if (s === '\u4E0B\u5348' || s === '\u665A\u4E0A') return e + 12
          },
          meridiem: function (e, s, i) {
            var _ = e * 100 + s
            return _ < 600
              ? '\u51CC\u6668'
              : _ < 900
                ? '\u65E9\u4E0A'
                : _ < 1130
                  ? '\u4E0A\u5348'
                  : _ < 1230
                    ? '\u4E2D\u5348'
                    : _ < 1800
                      ? '\u4E0B\u5348'
                      : '\u665A\u4E0A'
          },
          calendar: {
            sameDay: '[\u4ECA\u5929] LT',
            nextDay: '[\u660E\u5929] LT',
            nextWeek: '[\u4E0B]dddd LT',
            lastDay: '[\u6628\u5929] LT',
            lastWeek: '[\u4E0A]dddd LT',
            sameElse: 'L',
          },
          dayOfMonthOrdinalParse: /\d{1,2}(日|月|週)/,
          ordinal: function (e, s) {
            switch (s) {
              case 'd':
              case 'D':
              case 'DDD':
                return e + '\u65E5'
              case 'M':
                return e + '\u6708'
              case 'w':
              case 'W':
                return e + '\u9031'
              default:
                return e
            }
          },
          relativeTime: {
            future: '%s\u5F8C',
            past: '%s\u524D',
            s: '\u5E7E\u79D2',
            ss: '%d \u79D2',
            m: '1 \u5206\u9418',
            mm: '%d \u5206\u9418',
            h: '1 \u5C0F\u6642',
            hh: '%d \u5C0F\u6642',
            d: '1 \u5929',
            dd: '%d \u5929',
            M: '1 \u500B\u6708',
            MM: '%d \u500B\u6708',
            y: '1 \u5E74',
            yy: '%d \u5E74',
          },
        }),
        u.locale('en'),
        u
      )
    })
  })
  var Jd = dr(xs(), 1),
    $d = dr(_r(), 1)
  globalThis.__libResult = null
  performance.mark('payload-evaluated')
})()
/*! Bundled license information:

moment/moment.js:
  (*! moment.js *)
  (*! version : 2.30.1 *)
  (*! authors : Tim Wood, Iskren Chernev, Moment.js contributors *)
  (*! license : MIT *)
  (*! momentjs.com *)

moment/min/locales.js:
  (*! moment.js locale configuration *)
*/
