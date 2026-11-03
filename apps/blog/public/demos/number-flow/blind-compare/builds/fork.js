"use strict";var NumberFlowBundle=(()=>{var ge=Object.defineProperty;var St=Object.getOwnPropertyDescriptor;var kt=Object.getOwnPropertyNames;var Ct=Object.prototype.hasOwnProperty;var At=(t,e)=>{for(var n in e)ge(t,n,{get:e[n],enumerable:!0})},$t=(t,e,n,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of kt(e))!Ct.call(t,i)&&i!==n&&ge(t,i,{get:()=>e[i],enumerable:!(r=St(e,i))||r.enumerable});return t};var Rt=t=>$t(ge({},"__esModule",{value:!0}),t);var un={};At(un,{CONNECT_EVENT:()=>Pt,Digit:()=>re,UPDATE_EVENT:()=>Mt,canAnimate:()=>Oe,continuous:()=>Et,default:()=>ie,define:()=>fe,formatToData:()=>ce,prefersReducedMotion:()=>q,renderInnerHTML:()=>ln,setEngineMode:()=>gt,styles:()=>an,supportsNativeAnimations:()=>Ve});var S=!0;var ze=String.raw,V=String.raw;var qe=S&&(()=>{try{document.createElement("div").animate({opacity:0},{easing:"linear(0, 1)"})}catch{return!1}return!0})(),Ye=S&&typeof CSS!="undefined"&&CSS.supports&&CSS.supports("line-height","mod(1,1)"),q=S&&typeof matchMedia!="undefined"?matchMedia("(prefers-reduced-motion: reduce)"):null,M="--_number-flow-d-opacity",k="--_number-flow-d-width",P="--_number-flow-dx",R="--_number-flow-d",Lt=({name:t,syntax:e,inherits:n,initialValue:r})=>{let i=e==="<length>"?"7px":"0.5",s=document.createElement("div"),a=s.appendChild(document.createElement("div"));s.style.setProperty(t,i),document.documentElement.appendChild(s);let l=getComputedStyle(s).getPropertyValue(t)===i&&getComputedStyle(a).getPropertyValue(t)===(n?i:r);return s.remove(),l},Ft=t=>{try{return CSS.registerProperty(t),!0}catch(e){return(e==null?void 0:e.name)!=="InvalidModificationError"?!1:Lt(t)}},Je=[{name:M,syntax:"<number>",inherits:!1,initialValue:"0"},{name:P,syntax:"<length>",inherits:!0,initialValue:"0px"},{name:k,syntax:"<number>",inherits:!1,initialValue:"0"},{name:R,syntax:"<number>",inherits:!0,initialValue:"0"}].map(Ft).every(Boolean),X="round(nearest, calc(var(--number-flow-mask-height, 0.25em) / 2), 1px)",ae=`calc(${X} * 2)`,le="calc(var(--number-flow-mask-height, 0.25em) / 2)",ue="var(--number-flow-mask-height, 0.25em)",oe="var(--number-flow-mask-width, 0.5em)",j=`calc(${oe} / var(--scale-x))`,se="#000 0, transparent 71%",Be=t=>V`
	/* Horizontal: */
	linear-gradient(
			to right,
			transparent 0,
			#000 ${j},
			#000 calc(100% - ${j}),
			transparent
		),
		/* Vertical: */
			linear-gradient(
				to bottom,
				transparent 0,
				#000 ${t},
				#000 calc(100% - ${t}),
				transparent 100%
			),
		/* TL corner */ radial-gradient(at bottom right, ${se}),
		/* TR corner */ radial-gradient(at bottom left, ${se}),
		/* BR corner */ radial-gradient(at top left, ${se}),
		/* BL corner */ radial-gradient(at top right, ${se})
`,Xe=t=>V`
	100% calc(100% - ${t} * 2),
	calc(100% - ${j} * 2) 100%,
	${j} ${t},
	${j} ${t},
	${j} ${t},
	${j} ${t}
`,Dt=V`
  :host {
    display: inline-block;
    direction: ltr;
    white-space: nowrap;
    isolation: isolate; /* for .number z-index */
    /* Technically this is only needed on the .number, but applying it here makes the ::selection the same height for the whole element: */
    line-height: 1;
  }

  .number,
  .number__inner {
    display: inline-block;
    transform-origin: left top;
  }

  :host([data-will-change])
    :is(.number, .number__inner, .section, .digit, .digit__num, .symbol) {
    will-change: transform;
  }

  .number {
    --scale-x: calc(1 + var(${k}) / var(--width));
    transform: translateX(var(${P})) scaleX(var(--scale-x));

    margin: 0 calc(-1 * ${oe});
    position: relative; /* for z-index */

    /* overflow: clip; /* helpful to not affect page layout, but breaks baseline alignment in Safari :/ */
    /* -webkit- prefixed properties have better support than unprefixed ones: */
    -webkit-mask-image: ${Be(ue)};
    -webkit-mask-size: ${Xe(ue)};
    -webkit-mask-position:
      center,
      center,
      top left,
      top right,
      bottom right,
      bottom left;
    -webkit-mask-repeat: no-repeat;
  }

  /* Small improvement for ::selection when not animating: */
  /* Reverted because you can see it change when char height < 1em: */
  /*.number:not(:has(.digit.is-spinning)) {
		-webkit-mask-image: none;
	}*/

  .number__inner {
    padding: ${le} ${oe};
    /* invert parent's: */
    transform: scaleX(calc(1 / var(--scale-x)))
      translateX(calc(-1 * var(${P})));
  }

  /* Only .number and .number__inner read these. Stopping them here keeps an
     animating width or offset from restyling every digit on every frame: */
  .number__inner > .section {
    --scale-x: 1;
    ${P}: 0px;
  }

  /* Put number underneath other sections. Negative z-index messed up text cursor and selection, weirdly: */
  :host > :not(.number) {
    z-index: 5;
  }

  .section,
  .symbol {
    display: inline-block;
    /* for exiting (> [inert]): */
    position: relative;
    isolation: isolate; /* also helpful for mix-blend-mode in symbol__value */
  }

  .section::after {
    /*
		 * We seem to need some type of character to ensure baseline alignment continues working
		 * even when empty
		 */
    content: '\200b'; /* zero-width space */
    display: inline-block;
  }

  .section--justify-left {
    transform-origin: center left;
  }

  .section--justify-right {
    transform-origin: center right;
  }

  .section > [inert],
  .symbol > [inert] {
    margin: 0 !important; /* to override any user styles */
    position: absolute !important; /* ^ */
    z-index: -1;
  }

  .digit {
    display: inline-block;
    position: relative;
    --c: var(--current) + var(${R});
  }

  .digit__num,
  .number .section::after {
    padding: ${le} 0;
  }

  .digit__num {
    display: inline-block;
    /* Claude + https://buildui.com/recipes/animated-counter */
    --offset-raw: mod(
      var(--length) + var(--n) - mod(var(--c), var(--length)),
      var(--length)
    );
    --offset: calc(
      var(--offset-raw) - var(--length) *
        round(down, var(--offset-raw) / (var(--length) / 2), 1)
    );
    /* Technically we just need var(--offset)*100%, but clamping should reduce the layer size: */
    --y: clamp(-100%, var(--offset) * 100%, 100%);
    transform: translateY(var(--y));
  }

  .digit__num[inert] {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%) translateY(var(--y));
  }

  .digit:not(.is-spinning) .digit__num[inert] {
    display: none;
  }

  .symbol__value {
    display: inline-block;
    mix-blend-mode: plus-lighter; /* better crossfades e.g. + <-> - */
    white-space: pre; /* some symbols are spaces or thin spaces */
  }

  .section--justify-left .symbol > [inert] {
    left: 0;
  }

  .section--justify-right .symbol > [inert] {
    right: 0;
  }

  .animate-presence {
    opacity: calc(1 + var(${M}));
  }

  /*
	 * round() versions for Safari subpixel alignment. A double declaration
	 * doesn't work here: the values contain var(), so old browsers can't
	 * reject them at parse time — the later declaration would win the cascade
	 * and then die at computed-value time, unsetting the property entirely.
	 * The @supports probe must therefore be var()-free:
	 */
  @supports (padding: round(nearest, 0.125em, 1px)) {
    .number {
      -webkit-mask-image: ${Be(ae)};
      -webkit-mask-size: ${Xe(ae)};
    }

    .number__inner {
      padding: ${X} ${oe};
    }

    .digit__num,
    .number .section::after {
      padding: ${X} 0;
    }
  }
`,pe=Dt;var Ge=S&&typeof HTMLElement!="undefined"?HTMLElement:class{},ve=V`
  :host {
    display: inline-block;
    direction: ltr;
    white-space: nowrap;
    line-height: 1;
  }

  span {
    display: inline-block;
  }

  :host([data-will-change]) span {
    will-change: transform;
  }

  .number,
  .digit {
    padding: ${le} 0;
  }

  /* var()-free probe; see styles.ts for why a double declaration won't work: */
  @supports (padding: round(nearest, 0.125em, 1px)) {
    .number,
    .digit {
      padding: ${X} 0;
    }
  }

  .symbol {
    white-space: pre; /* some symbols are spaces or thin spaces */
  }
`,Kt={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},be=t=>String(t).replace(/[&<>"']/g,e=>Kt[e]),Vt=t=>`<span class="${t.type==="integer"||t.type==="fraction"?"digit":"symbol"}" part="${t.type==="integer"||t.type==="fraction"?`digit ${t.type}-digit`:`symbol ${t.type}`}">${be(t.value)}</span>`,me=(t,e)=>`<span part="${e}">${t.reduce((n,r)=>n+Vt(r),"")}</span>`,_e=(t="")=>{let e=t.replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g,n=>`\\${n.codePointAt(0).toString(16)} `);return V`
    :where(number-flow${e}) {
      line-height: 1;
    }

    number-flow${e} > span {
      font-kerning: none;
      display: inline-block;
      padding: ${ue} 0;
    }

    @supports (padding: round(nearest, 0.25em, 1px)) {
      number-flow${e} > span {
        padding: ${ae} 0;
      }
    }
  `},xe=(t,{nonce:e,elementSuffix:n}={})=>{let r=e?` nonce="${be(e)}"`:"",i=be(t.valueAsString);return ze`<template shadowroot="open" shadowrootmode="open"
			><style${r}>${ve}</style
			><span role="img" aria-label="${i}"
				>${me(t.pre,"left")}<span part="number" class="number"
					>${me(t.integer,"integer")}${me(t.fraction,"fraction")}</span
				>${me(t.post,"right")}</span
			></template
		><style${r}>${_e(n)}</style
		><span>${i}</span>`};var Ze=t=>[ve,_e(t),pe];function ce(t,e,n,r){let i=e.formatToParts(t);n&&i.unshift({type:"prefix",value:n}),r&&i.push({type:"suffix",value:r});let s=[],a=[],l=[],m=[],d={},u=f=>{var y;return`${f}:${d[f]=((y=d[f])!=null?y:-1)+1}`},p="",h=!1,o=!1;for(let f of i){p+=f.value;let y=f.type==="minusSign"||f.type==="plusSign"?"sign":f.type;y==="integer"?(h=!0,a.push(...f.value.split("").map(T=>({type:y,value:parseInt(T)})))):y==="group"?a.push({type:y,value:f.value}):y==="decimal"?(o=!0,l.push({type:y,value:f.value,key:u(y)})):y==="fraction"?l.push(...f.value.split("").map(T=>({type:y,value:parseInt(T),key:u(y),pos:-1-d[y]}))):(h||o?m:s).push({type:y,value:f.value,key:u(y)})}let c=[];for(let f=a.length-1;f>=0;f--){let y=a[f];c.unshift(y.type==="integer"?{...y,key:u(y.type),pos:d[y.type]}:{...y,key:u(y.type)})}return{pre:s,integer:c,fraction:l,post:m,valueAsString:p,value:typeof t=="string"?parseFloat(t):t}}var de=t=>t,jt=(t,e,n,r)=>{if(t===e&&n===r)return de;let i=(u,p)=>1-3*p+3*u,s=(u,p)=>3*p-6*u,a=u=>3*u,l=(u,p,h)=>((i(p,h)*u+s(p,h))*u+a(p))*u,m=(u,p,h)=>3*i(p,h)*u*u+2*s(p,h)*u+a(p),d=u=>{let p=u;for(let h=0;h<8;h++){let o=m(p,t,n);if(o===0)break;p-=(l(p,t,n)-u)/o,p=Math.min(1,Math.max(0,p))}if(Math.abs(l(p,t,n)-u)>1e-5){let h=0,o=1;for(p=u;o-h>1e-7;)p=(h+o)/2,l(p,t,n)<u?h=p:o=p}return p};return u=>u<=0?0:u>=1?1:l(d(u),e,r)},It=t=>{let e=[];for(let s of t.split(",")){let a=s.trim().split(/\s+/).filter(Boolean);if(!a.length)return null;let l=parseFloat(a[0]);if(isNaN(l))return null;let m=a.slice(1).map(d=>d.endsWith("%")?parseFloat(d)/100:NaN);if(m.some(isNaN)||m.length>2)return null;m.length===0?e.push({v:l,pos:null}):m.forEach(d=>e.push({v:l,pos:d}))}if(e.length<2)return null;e[0].pos==null&&(e[0].pos=0),e[e.length-1].pos==null&&(e[e.length-1].pos=1);let n=0;for(let s=1;s<e.length;s++)if(e[s].pos!=null){e[s].pos=Math.max(e[s].pos,e[n].pos);let a=s-n;for(let l=n+1;l<s;l++)e[l].pos=e[n].pos+(e[s].pos-e[n].pos)*(l-n)/a;n=s}let r=e;return{fn:s=>{if(s<=r[0].pos)return r[0].v;if(s>=r[r.length-1].pos)return r[r.length-1].v;let a=0,l=r.length-1;for(;l-a>1;){let u=a+l>>1;r[u].pos<=s?a=u:l=u}let m=r[a],d=r[l];return d.pos===m.pos?d.v:m.v+(d.v-m.v)*(s-m.pos)/(d.pos-m.pos)},stops:r.map(s=>s.pos),overshoots:r.some(s=>s.v<0||s.v>1)}},Ht=(t,e)=>n=>{if(n>=1)return 1;if(n<=0)return 0;let r=Math.floor(n*t);switch(e){case"start":case"jump-start":return Math.min(1,(r+1)/t);case"jump-none":return Math.min(1,r/(t-1));case"jump-both":return(r+1)/(t+1);default:return r/t}},Y=(t,e,n,r)=>({fn:jt(t,e,n,r),stops:t===e&&n===r?[0,1]:null,overshoots:e<0||e>1||r<0||r>1}),we=(t,e)=>({fn:Ht(t,e),stops:null,overshoots:!1,discrete:!0}),Ot={linear:()=>({fn:de,stops:[0,1],overshoots:!1}),ease:()=>Y(.25,.1,.25,1),"ease-in":()=>Y(.42,0,1,1),"ease-out":()=>Y(0,0,.58,1),"ease-in-out":()=>Y(.42,0,.58,1),"step-start":()=>we(1,"start"),"step-end":()=>we(1,"end")},Wt=t=>{let e=t.trim(),n=Ot[e];if(n)return n();let r=/^([a-z-]+)\((.*)\)$/i.exec(e);if(!r)return null;let[,i,s]=r;if(i==="linear")return It(s);if(i==="cubic-bezier"){let a=s.split(",").map(l=>parseFloat(l));if(a.length===4&&a.every(l=>!isNaN(l)))return Y(a[0],a[1],a[2],a[3])}else if(i==="steps"){let[a,l]=s.split(",").map(d=>d.trim()),m=parseInt(a);if(m>0&&!(m===1&&l==="jump-none"))return we(m,l!=null?l:"end")}return null},z=new Map,Ut=64,Qe=!1,et=t=>{if(z.has(t))return z.get(t);let e=Wt(t);return z.size>=Ut&&z.delete(z.keys().next().value),z.set(t,e),e},tt=t=>{if(!t)return de;let e=et(t);return e?e.fn:(Qe||(Qe=!0,console.warn(`[number-flow] Unsupported easing "${t}", falling back to linear.`)),de)},nt=t=>{let e=et(t);return e&&!e.discrete?e:null};var ke=(t,e,n)=>Math.max(t,Math.min(e,n)),Me=(t,e)=>(t%e+e)%e,Ce=(t,e,n)=>{let r=Me(e+n-Me(t,e),e),i=r-e*Math.floor(r/(e/2));return ke(-1,i,1)*100},zt=t=>{var e,n;return typeof t=="number"?t:parseFloat((n=(e=/-?\d*\.?\d+(?:e[+-]?\d+)?/i.exec(t))==null?void 0:e[0])!=null?n:"0")},G=new WeakMap,rt=new WeakMap,Ee=new WeakMap,pt=new WeakMap,mt=new WeakMap,Te=(t,e)=>{let n=t.get(e);return n||t.set(e,n=new Set),n},Pe=(t,e,n,r)=>{let i=e.animate(n,r);return Te(mt,t).add(i),i},Ae=t=>{let e=mt.get(t);return e?(e.forEach(n=>{$e(n)||e.delete(n)}),Array.from(e)):[]},it=(t,e)=>{var r;let n=rt.get(t);return n||rt.set(t,n={}),(r=n[e])!=null?r:n[e]={kind:e,el:t,contribs:[],anims:[],inputs:"",legacy:[]}},Bt=t=>{let e=Object.keys(t),n=r=>zt(t[r][0]);if(e.length===1){if(e[0]==="transform")return{kind:"tx",from:[n("transform")]};if(e[0]===R)return{kind:"spin",from:[n(R)]};if(e[0]===M)return{kind:"opacity",from:[n(M)]}}else if(e.length===2&&P in t&&k in t)return{kind:"number",from:[n(P),n(k)]};return{kind:null,from:[]}},ct=(t,e,n,r)=>{let i=G.get(t);i||G.set(t,i=[]),i.push({el:e,keyframes:n,timing:r,...Bt(n)})},Z=t=>{G.delete(t)},Xt=(t,[e,n])=>t==="tx"?{transform:[`translateX(${e}px)`,"none"]}:t==="number"?{[P]:[`${e}px`,"0px"],[k]:[n,0]}:{[t==="spin"?R:M]:[e,0]},qt=(t,e)=>{var i,s,a,l,m,d,u,p;let n=typeof e.easing=="string"?e.easing:"linear",r=nt(n);return!r||typeof e.duration!="number"||!(e.duration>0)||!isFinite(e.duration)||((i=e.iterations)!=null?i:1)!==1||((s=e.iterationStart)!=null?s:0)!==0||((a=e.direction)!=null?a:"normal")!=="normal"||!["auto","none"].includes((l=e.fill)!=null?l:"auto")||!isFinite((m=e.delay)!=null?m:0)||!isFinite((d=e.endDelay)!=null?d:0)?null:{from:t,start:0,delay:(u=e.delay)!=null?u:0,duration:e.duration,endDelay:(p=e.endDelay)!=null?p:0,easing:n,ease:r.fn,stops:r.stops,overshoots:r.overshoots}},$e=t=>t.playState!=="finished"&&t.playState!=="idle",dt=t=>{let e=t.anims[0];if(!e||!$e(e))return null;let n=e.currentTime;return typeof n=="number"?n:null},Se=t=>t.start+t.delay+t.duration,Yt=(t,e)=>t.map(n=>({...n,start:n.start-e})).filter(n=>Se(n)>0),st=/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/,Re=t=>parseFloat(t.style.getPropertyValue(M))||0,ft=t=>{let{el:e,kind:n}=t;if(n==="tx")return getComputedStyle(e).transform!=="none";if(n==="opacity")return Math.abs(parseFloat(getComputedStyle(e).opacity)-ke(0,1+Re(e),1))>1e-6;if(n==="number"){let r=e.firstElementChild;return!r||!st.test(getComputedStyle(e).transform)||!st.test(getComputedStyle(r).transform)}return!1},Jt=t=>{var e;return t.kind==="number"&&!(parseFloat(t.el.style.getPropertyValue("--width"))>0)||((e=t.authorStyled)!=null?e:ft(t))},Ne=t=>{let e=pt.get(t);e==null||e.forEach(n=>{if(!n.el.isConnected){e.delete(n);return}n.kind==="spin"&&(n.unit=n.el.offsetHeight||100),dt(n)==null&&(n.authorStyled=ft(n))})},ot=t=>{let{el:e,kind:n}=t;return n==="spin"?[e.style.getPropertyValue("--current"),...Array.from(e.children,r=>+r.hasAttribute("inert"))].join():n==="number"?e.style.getPropertyValue("--width"):n==="opacity"?String(Re(e)):""},I=.01,Gt=1e-4,Zt=1/512,Le=t=>{var u,p,h;let e=(u=G.get(t))!=null?u:[];G.delete(t);let n=new Map,r=[];e.forEach(o=>{if(!o.kind){r.push(o);return}let c=it(o.el,o.kind),f=n.get(c);f?f.push(o):n.set(c,[o])}),(p=Ee.get(t))==null||p.forEach(o=>{n.has(o)||n.set(o,[])});let i=Te(pt,t);n.forEach((o,c)=>i.add(c));let s=[],a=[],l=(o,c)=>{var f;return s.push({ch:o,contribs:c,unit:o.kind==="spin"?(f=o.unit)!=null?f:o.el.offsetHeight||100:1})};n.forEach((o,c)=>{var W;c.legacy=c.legacy.filter($e);let f=dt(c),y=f==null?[]:Yt(c.contribs,f);if(!o.length){y.length?ot(c)!==c.inputs&&l(c,y):(W=Ee.get(t))==null||W.delete(c);return}let T=o.map(g=>qt(g.from,g.timing));c.legacy.length||T.some(g=>!g)||!y.length&&Jt(c)?(y.length&&a.push({ch:c,contribs:y}),r.push(...o)):l(c,y.concat(T))});let m=(h=document.timeline)==null?void 0:h.currentTime;a.forEach(({ch:o,contribs:c})=>{o.anims.forEach(f=>f.finish()),o.anims=[],o.contribs=[],c.forEach(f=>{let y=Pe(t,o.el,Xt(o.kind,f.from),{duration:f.duration,delay:f.delay,endDelay:f.endDelay,easing:f.easing,composite:"accumulate"});typeof m=="number"&&(y.startTime=m+f.start),o.legacy.push(y)})}),r.forEach(o=>{let c=Pe(t,o.el,o.keyframes,{...o.timing,composite:"accumulate"});if(o.kind){let f=it(o.el,o.kind);f.legacy.push(c),i.add(f)}});let d=new Map;s.forEach(({ch:o,contribs:c,unit:f})=>{o.anims.forEach(y=>y.finish()),o.contribs=c,o.inputs=ot(o),o.anims=en(o,c,f,d).map(({el:y,keyframes:T,timing:W})=>{let g=Pe(t,y,T,W);return typeof m=="number"&&(g.startTime=m),g}),o.kind==="spin"&&Te(Ee,t).add(o)}),i.forEach(o=>{o.authorStyled=void 0,o.unit=void 0})},at=1e3/240,Qt=64,lt=(t,e)=>{let n=t.map(u=>[u.start,u.delay,u.duration,u.endDelay,u.easing].join()).join("|"),r=e.get(n);if(r)return r;let i=Math.max(...t.map(Se)),s=[0,i];t.forEach(u=>{let p=u.start+u.delay,h=p+u.duration;if(s.push(p,h),u.stops)u.stops.forEach(o=>s.push(p+o*u.duration));else for(let o=p+at;o<h;o+=at)s.push(o)}),s.sort((u,p)=>u-p);let a=(u,p)=>t.map(h=>{let o=(u-h.start-h.delay)/h.duration;return(p?o<=0||o>1:o<0||o>=1)?0:1-h.ease(o)}),l=[],m=[],d=NaN;return s.forEach(u=>{if(!(u<0||u>i||u===d)&&(d=u,u>0&&(l.push(u/i),m.push(a(u,!0))),u<i)){let p=a(u,!1),h=m[m.length-1];(!h||p.some((o,c)=>o!==h[c]))&&(l.push(u/i),m.push(p))}}),r={x:l,w:m,end:i,endDelay:Math.max(0,Math.max(...t.map(u=>Se(u)+u.endDelay))-i)},e.set(n,r),r},en=(t,e,n,r)=>{let i=e[0].from.length,s=e.length===1?e[0]:null,a,l,m=0,d=0,u=!!s&&s.start===0&&!(s.overshoots&&(t.kind==="spin"||t.kind==="number"));if(u){let g=t.kind==="number"?Qt:1;a=[];for(let v=0;v<=g;v++)a.push({x:v/g,v:s.from.map(b=>b*(1-v/g))});l={duration:s.duration,delay:s.delay,endDelay:s.endDelay,easing:s.easing}}else{let g=lt(e,r);a=g.x.map((v,b)=>({x:v,v:Array.from({length:i},(C,A)=>e.reduce(($,D,K)=>$+D.from[A]*g.w[b][K],0))})),m=g.end,d=g.endDelay,l={duration:m,endDelay:d,easing:"linear"}}let{el:p}=t;if(t.kind==="number"){let g=parseFloat(p.style.getPropertyValue("--width")),v=p.firstElementChild,b=_=>1+_/g,C=J(a.map(_=>[_.x,_.v[0],b(_.v[1])]),[I,I/g]).map(([_,w,E])=>({offset:_,transform:`translateX(${w}px) scaleX(${E})`})),A=J(a.map(_=>[_.x,1/b(_.v[1]),-_.v[0]]),[I/g,I]).map(([_,w,E])=>({offset:_,transform:`scaleX(${w}) translateX(${E}px)`})),$=[{el:p,keyframes:C,timing:l},{el:v,keyframes:A,timing:l}],D=lt(e,r),K=D.x.map((_,w)=>[_*D.end,e.reduce((E,U,Tt)=>E+U.from[1]*D.w[w][Tt],0)]),x=-1;if(K.forEach(([,_],w)=>{Math.abs(1-1/b(_))>Zt&&(x=w)}),x>=0){let _=K[x+1][0];$.push({el:p,keyframes:J(K.slice(0,x+2).map(([w,E])=>[w/_,E]),[I]).map(([w,E])=>({offset:w,[k]:E})),timing:{duration:_}})}return $}let h=a.map(g=>g.v[0]),o=Math.min(...h),c=Math.max(...h),f=[],y;if(t.kind==="tx")y=I,f.push({el:p,F:g=>g,breaks:()=>[],frame:g=>({transform:`translateX(${g}px)`})});else if(t.kind==="opacity"){y=Gt;let g=Re(p);f.push({el:p,F:v=>ke(0,1+g+v,1),breaks:(v,b)=>[-1-g,-g].filter(C=>C>v&&C<b),frame:v=>({opacity:v})})}else{y=I/n;let g=parseFloat(p.style.getPropertyValue("--current"))||0,v=Array.from(p.children),b=v.length;v.forEach((C,A)=>{let $=[A-1,A+1,A-b/2].map(x=>Me(x-g,b)),D=$[0]+Math.floor((o-2-$[0])/b+1)*b;if(!(c>o&&(b<=2||D<c)))return;let K=C.hasAttribute("inert");f.push({el:C,F:x=>Ce(g+x,b,A),breaks:(x,_)=>{let w=[];return $.forEach(E=>{for(let U=Math.ceil((x-E)/b);E+U*b<_;U++)E+U*b>x&&w.push(E+U*b)}),w},frame:x=>({transform:K?`translateX(-50%) translateY(${x}%)`:`translateY(${x}%)`})})})}let T=!u&&c>o,W=T?{duration:m,endDelay:d,easing:`linear(${J(a.map(g=>[g.x,(g.v[0]-o)/(c-o)]),[y/(c-o)]).map(([g,v])=>`${v} ${g*100}%`).join(", ")})`}:l;return f.map(({el:g,F:v,breaks:b,frame:C})=>({el:g,keyframes:(T?ut([{x:0,v:[o]},{x:1,v:[c]}],v,b):J(ut(a,v,b),[y])).map(([A,$])=>({offset:A,...C($)})),timing:W}))},ut=(t,e,n)=>{let r=[],i=(a,l)=>{let m=r[r.length-1];(!m||m[0]!==a||m[1]!==l)&&r.push([a,l])},s=(a,l)=>{let m=e(a+l*1e-9*Math.max(1,Math.abs(a)));return Math.abs(m-e(a))<1e-4?e(a):m};for(let a=0;a<t.length-1;a++){let l=t[a],m=t[a+1],d=l.v[0],u=m.v[0],p=Math.sign(u-d);if(i(l.x,s(d,p)),p){let h=n(Math.min(d,u),Math.max(d,u));h.sort((o,c)=>(o-c)*p),h.forEach(o=>{let c=l.x+(o-d)/(u-d)*(m.x-l.x);i(c,s(o,-p)),i(c,s(o,p))})}i(m.x,s(u,-p))}return r},J=(t,e)=>{if(t.length<=2)return t;let n=[t[0]],r=t[0],i=[],s=[],a=()=>{i=e.map(()=>-1/0),s=e.map(()=>1/0)};a();for(let l=1;l<t.length-1;l++){let m=t[l],d=t[l+1],u=m[0]-r[0],p=!u||d[0]===m[0];if(!p){let h=d[0]-r[0];for(let o=0;o<e.length;o++){i[o]=Math.max(i[o],(m[o+1]-e[o]-r[o+1])/u),s[o]=Math.min(s[o],(m[o+1]+e[o]-r[o+1])/u);let c=(d[o+1]-r[o+1])/h;(c<i[o]||c>s[o])&&(p=!0)}}p&&(n.push(m),r=m,a())}return n.push(t[t.length-1]),n};var Ve=Ye&&qe&&Je,Fe="auto",gt=t=>{Fe=t},L=()=>Fe==="native"||Fe==="auto"&&Ve,tn=(t,e,n)=>Math.max(t,Math.min(e,n)),nn={transform:(t,e,n)=>{t.style.transform=n||!e?"":`translateX(${e}px)`},[P]:(t,e)=>{t.style.setProperty(P,`${e}px`)},[k]:(t,e)=>{let n=parseFloat(t.style.getPropertyValue("--width"));t.style.setProperty("--scale-x",String(n>0?1+e/n:1))},[M]:(t,e,n)=>{if(n){t.style.opacity="";return}let r=parseFloat(t.style.getPropertyValue(M))||0;t.style.opacity=String(tn(0,1+r+e,1))},[R]:(t,e)=>{let n=parseFloat(t.style.getPropertyValue("--current"))||0,r=t.children.length,i=n+e;for(let s=0;s<r;s++)t.children[s].style.setProperty("--y",`${Ce(i,r,s)}%`)}},De=class{constructor(e,n){this.el=e;this.applier=n;this.anims=new Set}apply(e){let n=0;this.anims.forEach(r=>{n+=r.valueAt(e),r.done&&this.anims.delete(r)}),this.applier(this.el,n,this.anims.size===0),this.anims.size===0&&Q.delete(this)}},Ke=class{constructor(e,n,r,i,s,a){this._channel=e;this._scope=n;this._from=r;this._start=i;this._duration=s;this._ease=a;this.done=!1;this.finished=new Promise(l=>{this._resolve=l})}valueAt(e){if(this.done)return 0;let n=(e-this._start)/this._duration;return n<0?0:n>=1?(this._finish(),0):this._from*(1-this._ease(n))}_finish(){var e;this.done=!0,(e=ee.get(this._scope))==null||e.delete(this),this._resolve()}finish(){this.done||(this._finish(),this._channel.apply(performance.now()))}},Q=new Set,ht=new WeakMap,ee=new WeakMap,H=null,O=null,yt=()=>{H!=null&&(cancelAnimationFrame(H),H=null),O!=null&&(clearTimeout(O),O=null);let t=performance.now();Q.forEach(e=>e.apply(t)),Q.size&&bt()},bt=()=>{H!=null||(H=requestAnimationFrame(yt)),O!=null||(O=setTimeout(yt,34))},rn=t=>{var e,n;return typeof t=="number"?t:parseFloat((n=(e=/-?\d*\.?\d+(?:e[+-]?\d+)?/i.exec(t))==null?void 0:e[0])!=null?n:"0")},F=(t,e,n,r)=>{var d;if(L()){ct(t,e,n,r);return}let i=typeof r.duration=="number"?r.duration:0,s=(d=r.delay)!=null?d:0,a=tt(typeof r.easing=="string"?r.easing:void 0),l=performance.now(),m=ee.get(t);m||ee.set(t,m=new Set);for(let u in n){let p=nn[u];if(!p)continue;let h=ht.get(e);h||ht.set(e,h=new Map);let o=h.get(u);o||h.set(u,o=new De(e,p));let c=rn(n[u][0]),f=new Ke(o,t,c,l+s,i,a);if(i<=0){o.anims.add(f),Q.add(o),f.finish();continue}o.anims.add(f),m.add(f),Q.add(o),bt()}},je=t=>{let e=ee.get(t);e&&Array.from(e).forEach(n=>n.finish())},vt=t=>{let e=ee.get(t);return e?Array.from(e,n=>n.finished):[]};var N=(t,e,n)=>{let r=document.createElement(t),[i,s]=Array.isArray(e)?[void 0,e]:[e,n];return i&&Object.assign(r,i),s==null||s.forEach(a=>r.appendChild(a)),r},_t=(t,e)=>{var n,r;return e==="left"?t.offsetLeft:((r=(n=t.offsetParent instanceof HTMLElement?t.offsetParent:null)==null?void 0:n.offsetWidth)!=null?r:0)-t.offsetWidth-t.offsetLeft},Ie=t=>t.offsetWidth>0&&t.offsetHeight>0,fe=(t,e)=>{S&&typeof HTMLElement!="undefined"&&typeof customElements!="undefined"&&!customElements.get(t)&&customElements.define(t,e)};function xt(t,e,{reverse:n=!1}={}){let r=t.length;for(let i=n?r-1:0;n?i>=0:i<r;n?i--:i++)e(t[i],i)}var wt=(t,e)=>t==null?e:e==null?t:Math.max(t,e);var He=new WeakMap,Et={onUpdate(t,e,n){if(He.set(n,void 0),!n.computedTrend)return;let r=e.integer.concat(e.fraction).filter(l=>l.type==="integer"||l.type==="fraction"),i=t.integer.concat(t.fraction).filter(l=>l.type==="integer"||l.type==="fraction"),s=r.find(l=>!i.find(m=>m.pos===l.pos&&m.value===l.value)),a=i.find(l=>!r.find(m=>l.pos===m.pos&&l.value===m.value));He.set(n,wt(s==null?void 0:s.pos,a==null?void 0:a.pos))},getDelta(t,e,n){let r=t-e,i=He.get(n.flow);if(!r&&i!=null&&i>=n.pos)return n.length*n.flow.computedTrend}};var Oe=S&&typeof requestAnimationFrame!="undefined",B=class extends Ge{constructor(){super();this.created=!1;this.batched=!1;this._preUpdated=!1;let{animated:n,...r}=this.constructor.defaultProps;this._animated=this.computedAnimated=n,Object.assign(this,r)}get animated(){return this._animated}set animated(n){var r;this.animated!==n&&(this._animated=n,L()?(Z(this),(r=this.shadowRoot)==null||r.getAnimations().forEach(i=>i.finish())):je(this))}set data(n){var m,d,u;if(n==null||n===this._data)return;let{pre:r,integer:i,fraction:s,post:a,value:l}=n;if(this.created){let p=this._data;this._data=n,this.computedTrend=typeof this.trend=="function"?this.trend(p.value,l):this.trend,this.computedAnimated=Oe&&this._animated&&(!this.respectMotionPreference||!((d=q)!=null&&d.matches))&&Ie(this)&&this.ownerDocument.visibilityState==="visible",(u=this.plugins)==null||u.forEach(o=>{var c;return(c=o.onUpdate)==null?void 0:c.call(o,n,p,this)}),this.batched||this.willUpdate(),this._pre.update(r),this._num.update({integer:i,fraction:s}),this._post.update(a);let h=[this._pre,this._num,this._post];h.forEach(o=>o.measureAdded()),h.forEach(o=>o.updateValues()),this._num.measureRemoved(),this._num.popRemoved(),this.batched||this.didUpdate()}else{this._data=n,this.attachShadow({mode:"open"});try{(m=this._internals)!=null||(this._internals=this.attachInternals()),this._internals.role="img"}catch{}let p=document.createElement("style");this.nonce&&(p.nonce=this.nonce),p.textContent=pe,this.shadowRoot.appendChild(p),this._pre=new te(this,r,{justify:"right",part:"left"}),this.shadowRoot.appendChild(this._pre.el),this._num=new We(this,i,s),this.shadowRoot.appendChild(this._num.el),this._post=new te(this,a,{justify:"left",part:"right"}),this.shadowRoot.appendChild(this._post.el),this.created=!0}this._internals&&"ariaLabel"in this._internals?this._internals.ariaLabel=n.valueAsString:(this.setAttribute("role","img"),this.setAttribute("aria-label",n.valueAsString))}willUpdate(){var n;Z(this),this._preUpdated=Oe&&this._animated&&(!this.respectMotionPreference||!((n=q)!=null&&n.matches))&&this.ownerDocument.visibilityState==="visible"&&Ie(this),this._preUpdated&&(this._pre.willUpdate(),this._num.willUpdate(),this._post.willUpdate())}didUpdate(){var a;if(!this.computedAnimated||!this._preUpdated){L()?(Z(this),(a=this.shadowRoot)==null||a.getAnimations().forEach(l=>l.finish())):je(this);return}this._abortAnimationsFinish?this._abortAnimationsFinish.abort():this.dispatchEvent(new Event("animationsstart"));let r=[this._pre,this._num,this._post].map(l=>l.measure());L()&&Ne(this),r.forEach(l=>l()),L()&&Le(this);let i=new AbortController,s=L()?Ae(this).map(l=>l.finished):vt(this);Promise.all(s).then(()=>{i.signal.aborted||(this.dispatchEvent(new Event("animationsfinish")),this._abortAnimationsFinish=void 0)}),this._abortAnimationsFinish=i}};B.defaultProps={transformTiming:{duration:900,easing:"linear(0,.005,.019,.039,.066,.096,.129,.165,.202,.24,.278,.316,.354,.39,.426,.461,.494,.526,.557,.586,.614,.64,.665,.689,.711,.731,.751,.769,.786,.802,.817,.831,.844,.856,.867,.877,.887,.896,.904,.912,.919,.925,.931,.937,.942,.947,.951,.955,.959,.962,.965,.968,.971,.973,.976,.978,.98,.981,.983,.984,.986,.987,.988,.989,.99,.991,.992,.992,.993,.994,.994,.995,.995,.996,.996,.9963,.9967,.9969,.9972,.9975,.9977,.9979,.9981,.9982,.9984,.9985,.9987,.9988,.9989,1)"},spinTiming:void 0,opacityTiming:{duration:450,easing:"ease-out"},animated:!0,trend:(n,r)=>Math.sign(r-n),respectMotionPreference:!0,plugins:void 0,digits:void 0};var We=class{constructor(e,n,r,{className:i,...s}={}){this.flow=e;this._integer=new he(e,n,{justify:"right",part:"integer"}),this._fraction=new he(e,r,{justify:"left",part:"fraction"}),this._inner=N("span",{className:"number__inner"},[this._integer.el,this._fraction.el]),this.el=N("span",{...s,part:"number",className:`number ${i!=null?i:""}`},[this._inner]),L()||(this.el.style.setProperty("--scale-x","1"),this.el.style.setProperty(P,"0px"))}willUpdate(){this._prevWidth=this.el.offsetWidth,this._prevLeft=this.el.getBoundingClientRect().left,this._integer.willUpdate(),this._fraction.willUpdate()}update({integer:e,fraction:n}){this._integer.update(e),this._fraction.update(n)}measureAdded(){this._integer.measureAdded(),this._fraction.measureAdded()}updateValues(){this._integer.updateValues(),this._fraction.updateValues()}measureRemoved(){this._integer.measureRemoved(),this._fraction.measureRemoved()}popRemoved(){this._integer.popRemoved(),this._fraction.popRemoved()}measure(){let e=this.el.getBoundingClientRect(),n=[this._integer.measure(),this._fraction.measure()],r=this._prevLeft-e.left,i=this.el.offsetWidth,s=this._prevWidth-i;return()=>{n.forEach(a=>a()),this.el.style.setProperty("--width",String(i)),F(this.flow,this.el,{[P]:[`${r}px`,"0px"],[k]:[s,0]},this.flow.transformTiming)}}},sn=t=>new Set(t.map(e=>e.key)),on=()=>{},te=class{constructor(e,n,{justify:r,className:i,...s},a){this.flow=e;this.children=new Map;this.onCharRemove=e=>()=>{this.children.delete(e)};this._added=new Map;this._updated=new Map;this.justify=r;let l=n.map(m=>this.addChar(m).el);this.el=N("span",{...s,className:`section section--justify-${r} ${i!=null?i:""}`},a?a(l):l)}addChar(e,{startDigitsAtZero:n=!1,...r}={}){let i=e.type==="integer"||e.type==="fraction"?new re(this,e.type,n?0:e.value,e.pos,{...r,onRemove:this.onCharRemove(e.key)}):new Ue(this,e.type,e.value,{...r,onRemove:this.onCharRemove(e.key)});return this.children.set(e.key,i),i}update(e){let n=sn(e);this.children.forEach((s,a)=>{n.has(a)||this.remove(s)});let r=this.justify==="left",i=r?"prepend":"append";xt(e,s=>{let a;this.children.has(s.key)?(a=this.children.get(s.key),this._updated.set(a,s.value),a.unpop(),a.present=!0):(a=this.addChar(s,{startDigitsAtZero:!0,animateIn:!0}),this._added.set(a,s.value)),this.el[i](a.el)},{reverse:r})}remove(e){e.present&&e.pop()}measureAdded(){if(!this._added.size||!this.flow.computedAnimated)return;let e=this.el.getBoundingClientRect();this._added.forEach((n,r)=>r.willUpdate(e))}updateValues(){this._added.forEach((e,n)=>n.update(e)),this._updated.forEach((e,n)=>n.update(e)),this._added.clear(),this._updated.clear()}willUpdate(){let e=this.el.getBoundingClientRect();this._prevOffset=e[this.justify],this.children.forEach(n=>n.willUpdate(e))}measure(){let e=this.el.getBoundingClientRect(),n=Array.from(this.children.values(),i=>i.measure(e)),r=this._prevOffset-e[this.justify];return()=>{n.forEach(i=>i()),r&&this.children.size&&F(this.flow,this.el,{transform:[`translateX(${r}px)`,"none"]},this.flow.transformTiming)}}},he=class extends te{constructor(){super(...arguments);this._removed=[]}remove(n){n.unpop(),this._removed.push(n)}updateValues(){super.updateValues(),this._removed.forEach(n=>{n instanceof re&&n.update(0)})}measureRemoved(){this.flow.computedAnimated&&this._removed.forEach(n=>n.measureLayout())}popRemoved(){this._removed.forEach(n=>n.pop()),this._removed=[]}},ne=class{constructor(e,n,{onRemove:r,animateIn:i=!1}={}){this.flow=e;this.el=n;this._present=!0;this._remove=()=>{var e;this.el.remove(),(e=this._onRemove)==null||e.call(this)};this.el.classList.add("animate-presence"),this.flow.computedAnimated&&i&&F(this.flow,this.el,{[M]:[-.9999,0]},this.flow.opacityTiming),this._onRemove=r}get present(){return this._present}set present(e){if(this._present!==e){if(this._present=e,e?this.el.removeAttribute("inert"):this.el.setAttribute("inert",""),!this.flow.computedAnimated){e||this._remove();return}this.el.style.setProperty(M,e?"0":"-.999"),F(this.flow,this.el,{[M]:e?[-.9999,0]:[.999,0]},this.flow.opacityTiming),e?this.flow.removeEventListener("animationsfinish",this._remove):this.flow.addEventListener("animationsfinish",this._remove,{once:!0})}}},ye=class extends ne{constructor(n,r,i,s){super(n.flow,i,s);this.section=n;this.value=r;this.el=i}measureLayout(){this._top=this.el.offsetTop,this._offset=_t(this.el,this.section.justify)}pop(){this._top!=null&&(this.el.style.top=`${this._top}px`,this.el.style[this.section.justify]=`${this._offset}px`),this.el.setAttribute("inert",""),this.present=!1}unpop(){this.el.removeAttribute("inert"),this.el.style.top="",this.el.style[this.section.justify]=""}},re=class extends ye{constructor(n,r,i,s,a){var u,p,h;let l=((h=(p=(u=n.flow.digits)==null?void 0:u[s])==null?void 0:p.max)!=null?h:9)+1,m=Array.from({length:l}).map((o,c)=>{let f=N("span",{className:"digit__num"},[document.createTextNode(String(c))]);return c!==i&&f.setAttribute("inert",""),f.style.setProperty("--n",String(c)),f}),d=N("span",{part:`digit ${r}-digit`,className:"digit"},m);d.style.setProperty("--current",String(i)),d.style.setProperty("--length",String(l));super(n,i,d,a);this.pos=s;this._onAnimationsFinish=()=>{this.el.classList.remove("is-spinning"),this._numbers.forEach(n=>n.style.removeProperty("--y"))};this._numbers=m,this.length=l}willUpdate(n){let r=this.el.getBoundingClientRect();this._prevValue=this.value;let i=r[this.section.justify]-n[this.section.justify],s=r.width/2;this._prevCenter=this.section.justify==="left"?i+s:i-s}update(n){this.el.style.setProperty("--current",String(n)),this._numbers.forEach((r,i)=>i===n?r.removeAttribute("inert"):r.setAttribute("inert","")),this.value=n}measure(n){let r=this.el.getBoundingClientRect(),i=r[this.section.justify]-n[this.section.justify],s=r.width/2,a=this.section.justify==="left"?i+s:i-s,l=this._prevCenter-a;return()=>{var d;l&&F(this.flow,this.el,{transform:[`translateX(${l}px)`,"none"]},this.flow.transformTiming);let m=this.getDelta();m&&(this.el.classList.add("is-spinning"),F(this.flow,this.el,{[R]:[-m,0]},(d=this.flow.spinTiming)!=null?d:this.flow.transformTiming),this.flow.addEventListener("animationsfinish",this._onAnimationsFinish,{once:!0}))}}getDelta(){var i;if(this.flow.plugins)for(let s of this.flow.plugins){let a=(i=s.getDelta)==null?void 0:i.call(s,this.value,this._prevValue,this);if(a!=null)return a}let n=this.value-this._prevValue,r=this.flow.computedTrend||Math.sign(n);return r<0&&this.value>this._prevValue?this.value-this.length-this._prevValue:r>0&&this.value<this._prevValue?this.length-this._prevValue+this.value:n}},Ue=class extends ye{constructor(n,r,i,s){let a=N("span",{className:"symbol__value",textContent:i});super(n,i,N("span",{part:`symbol ${r}`,className:"symbol"},[a]),s);this.type=r;this._children=new Map;this._onChildRemove=n=>()=>{this._children.delete(n)};this._children.set(i,new ne(this.flow,a,{onRemove:this._onChildRemove(i)}))}willUpdate(n){if(this.measureLayout(),this.type==="decimal")return;let r=this.el.getBoundingClientRect();this._prevOffset=r[this.section.justify]-n[this.section.justify]}update(n){if(this.value!==n){let r=this._children.get(this.value);r&&(r.present=!1);let i=this._children.get(n);if(i)i.present=!0;else{let s=N("span",{className:"symbol__value",textContent:n});this.el.appendChild(s),this._children.set(n,new ne(this.flow,s,{animateIn:!0,onRemove:this._onChildRemove(n)}))}}this.value=n}measure(n){if(this.type==="decimal")return on;let i=this.el.getBoundingClientRect()[this.section.justify]-n[this.section.justify],s=this._prevOffset-i;return()=>{s&&F(this.flow,this.el,{transform:[`translateX(${s}px)`,"none"]},this.flow.transformTiming)}}};var an=Ze(),Pt="number-flow-connect",Mt="number-flow-update",ln=(t,{locales:e,format:n,numberPrefix:r,numberSuffix:i,nonce:s}={})=>{let a=ce(t,new Intl.NumberFormat(e,n),r,i);return xe(a,{nonce:s})},ie=class extends B{constructor(){super(...arguments);this.connected=!1}connectedCallback(){this.connected=!0,this.dispatchEvent(new Event(Pt,{bubbles:!0}))}disconnectedCallback(){this.connected=!1}get value(){return this._value}update(n){let r=this.format?JSON.stringify(this.format):"",i=this.locales?JSON.stringify(Intl.getCanonicalLocales(this.locales)):"";(!this._formatter||this._prevFormat!==r||this._prevLocales!==i)&&(this._formatter=new Intl.NumberFormat(this.locales,this.format),this._prevFormat=r,this._prevLocales=i),n!=null&&(this._value=n),this.dispatchEvent(new Event(Mt,{bubbles:!0})),this.data=ce(this._value,this._formatter,this.numberPrefix,this.numberSuffix)}};fe("number-flow",ie);return Rt(un);})();
