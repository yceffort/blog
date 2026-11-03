"use strict";var NumberFlowBundle=(()=>{var me=Object.defineProperty;var Ye=Object.getOwnPropertyDescriptor;var qe=Object.getOwnPropertyNames;var Ze=Object.prototype.hasOwnProperty;var Ge=(n,e)=>{for(var t in e)me(n,t,{get:e[t],enumerable:!0})},Qe=(n,e,t,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of qe(e))!Ze.call(n,i)&&i!==t&&me(n,i,{get:()=>e[i],enumerable:!(r=Ye(e,i))||r.enumerable});return n};var et=n=>Qe(me({},"__esModule",{value:!0}),n);var ct={};Ge(ct,{CONNECT_EVENT:()=>ze,Digit:()=>V,UPDATE_EVENT:()=>Xe,canAnimate:()=>ie,continuous:()=>We,default:()=>U,define:()=>W,formatToData:()=>B,onPrefersReducedMotionChange:()=>Ke,prefersReducedMotion:()=>C,renderInnerHTML:()=>mt,styles:()=>pt});var E=(n,e,t)=>{let r=document.createElement(n),[i,s]=Array.isArray(e)?[void 0,e]:[e,t];return i&&Object.assign(r,i),s==null||s.forEach(a=>r.appendChild(a)),r},Se=(n,e)=>{var t,r;return e==="left"?n.offsetLeft:((r=(t=n.offsetParent instanceof HTMLElement?n.offsetParent:null)==null?void 0:t.offsetWidth)!=null?r:0)-n.offsetWidth-n.offsetLeft},Ne=n=>{let e=n.getBoundingClientRect(),t=n.ownerDocument.defaultView;return e.width>0&&e.height>0&&(!t||e.bottom>0&&e.right>0&&e.top<t.innerHeight&&e.left<t.innerWidth)},W=(n,e)=>{typeof HTMLElement!="undefined"&&typeof customElements!="undefined"&&!customElements.get(n)&&customElements.define(n,e)};function $e(n,e,{reverse:t=!1}={}){let r=n.length;for(let i=t?r-1:0;t?i>=0:i<r;t?i--:i++)e(n[i],i)}function B(n,e,t,r){let i=e.formatToParts(n);t&&i.unshift({type:"prefix",value:t}),r&&i.push({type:"suffix",value:r});let s=[],a=[],p=[],u=[],y={},o=c=>{var h;return`${c}:${y[c]=((h=y[c])!=null?h:-1)+1}`},l="",f=!1,d=!1;for(let c of i){l+=c.value;let h=c.type==="minusSign"||c.type==="plusSign"?"sign":c.type;h==="integer"?(f=!0,a.push(...c.value.split("").map(g=>({type:h,value:parseInt(g)})))):h==="group"?a.push({type:h,value:c.value}):h==="decimal"?(d=!0,p.push({type:h,value:c.value,key:o(h)})):h==="fraction"?p.push(...c.value.split("").map(g=>({type:h,value:parseInt(g),key:o(h),pos:-1-y[h]}))):(f||d?u:s).push({type:h,value:c.value,key:o(h)})}let m=[];for(let c=a.length-1;c>=0;c--){let h=a[c];m.unshift(h.type==="integer"?{...h,key:o(h.type),pos:y[h.type]}:{...h,key:o(h.type)})}return{pre:s,integer:m,fraction:p,post:u,valueAsString:l,value:typeof n=="string"?parseFloat(n):n}}var ke=String.raw,v=String.raw;var Ae=(()=>{try{document.createElement("div").animate({opacity:0},{easing:"linear(0, 1)"})}catch{return!1}return!0})(),De=typeof CSS!="undefined"&&CSS.supports&&CSS.supports("line-height","mod(1,1)"),C=typeof matchMedia!="undefined"?matchMedia("(prefers-reduced-motion: reduce)"):null,Ke=n=>{let e=C;return e?e.addEventListener?(e.addEventListener("change",n),()=>e.removeEventListener("change",n)):(e.addListener(n),()=>e.removeListener(n)):()=>{}},R="--_number-flow-d-opacity",Y="--_number-flow-d-width",L="--_number-flow-dx",tt="--_number-flow-spin",Ce=(()=>{try{let n=(e,t,r,i)=>{try{CSS.registerProperty({name:e,syntax:t,inherits:r,initialValue:i})}catch(s){if((s==null?void 0:s.name)!=="InvalidModificationError")throw s}};return n(R,"<number>",!1,"0"),n(L,"<length>",!0,"0px"),n(Y,"<number>",!1,"0"),n(tt,"<number>",!1,"0"),!0}catch{return!1}})(),ce="calc(var(--number-flow-mask-height, 0.25em) / 2)",K=`round(nearest, ${ce}, 1px)`,J=`calc(${K} * 2)`,q=n=>v`
	@supports not (top: round(nearest, 1px, 1px)) {
		${n(ce,`calc(${ce} * 2)`)}
	}
`,X="var(--number-flow-mask-width, 0.5em)",k=`calc(${X} / var(--scale-x))`,z="#000 0, transparent 71%",Le=n=>v`
	/* Horizontal: */
	linear-gradient(
		to right,
		transparent 0,
		#000 ${k},
		#000 calc(100% - ${k}),
		transparent
	),
	/* Vertical: */
	linear-gradient(
		to bottom,
		transparent 0,
		#000 ${n},
		#000 calc(100% - ${n}),
		transparent 100%
	),
	/* TL corner */ radial-gradient(at bottom right, ${z}),
	/* TR corner */ radial-gradient(at bottom left, ${z}),
	/* BR corner */ radial-gradient(at top left, ${z}),
	/* BL corner */ radial-gradient(at top right, ${z})
`,Re=n=>v`
	100% calc(100% - ${n} * 2),
	calc(100% - ${k} * 2) 100%,
	${k} ${n},
	${k} ${n},
	${k} ${n},
	${k} ${n}
`,nt=v`
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

	/* Avoid :is() for older engines: */
	:host([data-will-change]) .number,
	:host([data-will-change]) .number__inner,
	:host([data-will-change]) .section,
	:host([data-will-change]) .digit,
	:host([data-will-change]) .digit__num,
	:host([data-will-change]) .symbol {
		will-change: transform;
	}

	.number {
		--scale-x: calc(1 + var(${Y}) / var(--width));
		transform: translateX(var(${L})) scaleX(var(--scale-x));

		margin: 0 calc(-1 * ${X});
		position: relative; /* for z-index */

		/* overflow: clip; /* helpful to not affect page layout, but breaks baseline alignment in Safari :/ */
		/* -webkit- prefixed properties have better support than unprefixed ones: */
		-webkit-mask-image: ${Le(J)};
		-webkit-mask-size: ${Re(J)};
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

	/*
	 * Only .number and .number__inner use these, but they inherit, so while the number animates
	 * every descendant would be recalculated each frame. Stop them here:
	 */
	.number__inner > * {
		${L}: 0px;
		--scale-x: initial;
	}

	.number__inner {
		padding: ${K} ${X};
		/* invert parent's: */
		transform: scaleX(calc(1 / var(--scale-x))) translateX(calc(-1 * var(${L})));
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
		/* Static position only; spinning positions are written to --y from JS: */
		--c: var(--current);
	}

	.digit__num,
	.number .section::after {
		padding: ${K} 0;
	}

	.digit__num {
		display: inline-block;
		/* Claude + https://buildui.com/recipes/animated-counter */
		--offset-raw: mod(var(--length) + var(--n) - mod(var(--c), var(--length)), var(--length));
		--offset: calc(
			var(--offset-raw) - var(--length) * round(down, var(--offset-raw) / (var(--length) / 2), 1)
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
		/* Matches the registered initial value; prevents inheritance where it can't be registered: */
		${R}: 0;
		opacity: calc(1 + var(${R}));
	}

	${q((n,e)=>v`
			.number {
				-webkit-mask-image: ${Le(e)};
				-webkit-mask-size: ${Re(e)};
			}
			.number__inner {
				padding: ${n} ${X};
			}
			.digit__num,
			.number .section::after {
				padding: ${n} 0;
			}
		`)}
`,Z=nt;var Oe=typeof HTMLElement!="undefined"?HTMLElement:class{},ue=v`
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
		padding: ${K} 0;
	}

	.symbol {
		white-space: pre; /* some symbols are spaces or thin spaces */
	}

	${q(n=>v`
			.number,
			.digit {
				padding: ${n} 0;
			}
		`)}
`,rt=n=>`<span class="${n.type==="integer"||n.type==="fraction"?"digit":"symbol"}" part="${n.type==="integer"||n.type==="fraction"?`digit ${n.type}-digit`:`symbol ${n.type}`}">${n.value}</span>`,G=(n,e)=>`<span part="${e}">${n.reduce((t,r)=>t+rt(r),"")}</span>`,he=(n="")=>v`
	:where(number-flow${n}) {
		line-height: 1;
	}

	number-flow${n} > span {
		font-kerning: none;
		display: inline-block;
		padding: ${J} 0;
	}

	${q((e,t)=>v`
			number-flow${n} > span {
				padding: ${t} 0;
			}
		`)}
`,de=(n,{nonce:e,elementSuffix:t}={})=>ke`<template shadowroot="open" shadowrootmode="open"
			><style${e?` nonce="${e}"`:""}>${ue}</style
			><span role="img" aria-label="${n.valueAsString}"
				>${G(n.pre,"left")}<span part="number" class="number"
					>${G(n.integer,"integer")}${G(n.fraction,"fraction")}</span
				>${G(n.post,"right")}</span
			></template
		><style${e?` nonce="${e}"`:""}>${he(t)}</style
		><span>${n.valueAsString}</span>`;var F=n=>n,O=(n,e,t,r)=>{let i=3*n,s=3*(t-n)-i,a=1-i-s,p=3*e,u=3*(r-e)-p,y=1-p-u,o=m=>((a*m+s)*m+i)*m,l=m=>((y*m+u)*m+p)*m,f=m=>(3*a*m+2*s)*m+i,d=m=>{let c=m;for(let x=0;x<8;x++){let _=o(c)-m;if(Math.abs(_)<1e-7)return c;let T=f(c);if(Math.abs(T)<1e-6)break;c-=_/T}let h=0,g=1;for(c=m;h<g;){let x=o(c);if(Math.abs(x-m)<1e-7)break;m>x?h=c:g=c;let _=(h+g)/2;if(_===c)break;c=_}return c};return m=>m<=0||m>=1?m:l(d(m))},fe=(n,e="end")=>{let t=e==="start"||e==="jump-start"||e==="jump-both",r=e==="jump-both"?n+1:e==="jump-none"?n-1:n;return r<1?F:i=>{let s=Math.floor(i*n);return t&&s++,i>=0&&s<0&&(s=0),i<=1&&s>r&&(s=r),s/r}},it=n=>{var a,p,u,y;let e=[];for(let o of n){let[l,...f]=o.split(/\s+/);f.length?f.forEach(d=>e.push({y:parseFloat(l),x:parseFloat(d)/100})):e.push({y:parseFloat(l)})}if(e.length<2||e.some(o=>isNaN(o.y)))return F;(p=(a=e[0]).x)!=null||(a.x=0),(y=(u=e[e.length-1]).x)!=null||(u.x=1);let t=e[0].x;for(let o of e)o.x!=null&&(t=o.x=Math.max(o.x,t));for(let o=1;o<e.length;o++){if(e[o].x!=null)continue;let l=o;for(;e[l].x==null;)l++;let f=e[o-1].x,d=e[l].x;for(let m=o;m<l;m++)e[m].x=f+(d-f)*(m-o+1)/(l-o+1)}let r=e.map(o=>o.x),i=e.map(o=>o.y),s=r.length-1;return o=>{let l=0;for(;l<s-1&&o>=r[l+1];)l++;let f=r[l],d=r[l+1];return o===d||d===f?i[l+1]:i[l]+(i[l+1]-i[l])*(o-f)/(d-f)}},Fe={linear:F,ease:O(.25,.1,.25,1),"ease-in":O(.42,0,1,1),"ease-out":O(0,0,.58,1),"ease-in-out":O(.42,0,.58,1),"step-start":fe(1,"start"),"step-end":fe(1,"end")},st=n=>{let e=n.trim().toLowerCase();if(Fe[e])return Fe[e];let t=/^([a-z-]+)\((.*)\)$/.exec(e);if(!t)return F;let r=t[2].split(",").map(i=>i.trim());if(t[1]==="linear")return it(r);if(t[1]==="cubic-bezier"&&r.length===4){let[i,s,a,p]=r.map(Number);if([i,s,a,p].every(u=>!isNaN(u)))return O(i,s,a,p)}if(t[1]==="steps"){let i=parseInt(r[0]);if(i>0)return fe(i,r[1])}return F},He=new Map,je=(n="linear")=>{let e=He.get(n);return e||He.set(n,e=st(n)),e};var j=De&&Ae&&Ce,ie=j||typeof requestAnimationFrame=="function";function M(n,e,t,r){j?at(n,e,t,r):t.d!==0&&new ve(n,e,t,r)}var ye=new WeakMap,ge=new WeakMap,xe=n=>n.playState==="finished"||n.playState==="idle",H=(n,e)=>{var i;let t=n==null?void 0:n.animations[0];if(!t||xe(t))return 0;let r=(i=t.effect)==null?void 0:i.getComputedTiming().progress;return r==null?0:n.from[e]*(1-r)};function at(n,e,t,r){var p,u,y,o;let i=ye.get(e);i||ye.set(e,i={});let s=i,a=(l,f,d)=>{var h;if((h=s[l])==null||h.animations.forEach(g=>xe(g)||g.cancel()),delete s[l],f.every(g=>!g))return;let m=d();s[l]={animations:m,from:f};let c=ge.get(n);c||ge.set(n,c=new Set),m.forEach(g=>c.add(g))};if(t.x!=null){let l=S(t.x+H(s.x,0));a("x",[l],()=>[e.animate({transform:[`translateX(${l}px)`,"none"]},r)])}if(t.o!=null){let l=1+((u=(p=te.get(e))==null?void 0:p.o)!=null?u:0),f=S(t.o+H(s.o,0));a("o",[f],()=>[e.animate({opacity:[l+f,l]},r)])}if(t.dx!=null||t.dw!=null){let l=e.firstElementChild,f=A(e.style.getPropertyValue("--width"),1)||1,d=S(((y=t.dx)!=null?y:0)+H(s.n,0)),m=S(((o=t.dw)!=null?o:0)+H(s.n,1));a("n",[d,m],()=>{let c=[];for(let h=0;h<=8;h++){let g=1-h/8;c.push({offset:h/8,transform:`scaleX(${1/(1+m*g/f)}) translateX(${-d*g}px)`})}return[e.animate({transform:[`translateX(${d}px) scaleX(${1+m/f})`,"translateX(0px) scaleX(1)"]},r),l.animate(c,r)]})}if(t.d!=null){let l=S(t.d+H(s.s,0));a("s",[l],()=>ot(e,l,r))}}function ot(n,e,t){let r=n.children,i=r.length,s=A(n.style.getPropertyValue("--current")),a=Math.sign(e),p=[],u=y=>{let o=_e(y,i),l=o<i/2?o:o-i;return S(Math.min(Math.max(l*100,-100),100))};for(let y=0;y<i;y++){let o=r[y],l=y-s,f=l-e,d=Math.min(f,l),m=Math.max(f,l),c=[],h=!1;for(let b=Math.floor((d-i)/i);b<=Math.ceil((m+i)/i);b++){let w=b*i;w-1<m&&w+1>d&&(h=!0);for(let[$,Je]of[[w-1,!1],[w+1,!1],[w+i/2,!0]])$>d&&$<m&&c.push([$,Je])}if(!h)continue;let g=b=>o.hasAttribute("inert")?`translateX(-50%) translateY(${b}%)`:`translateY(${b}%)`,x=b=>(b-f)/e,_=1e-6,T=[{offset:0,transform:g(u(f+a*_))}];c.sort((b,w)=>x(b[0])-x(w[0])).forEach(([b,w])=>{let $=x(b);w?(T.push({offset:$,transform:g(u(b-a*_))}),T.push({offset:$,transform:g(u(b+a*_))})):T.push({offset:$,transform:g(u(b))})}),T.push({offset:1,transform:g(u(l-a*_))}),p.push(o.animate(T,t))}return p}function we(n){if(j){let t=ge.get(n);return t?(t.forEach(r=>xe(r)&&t.delete(r)),Array.from(t)):[]}let e=ee.get(n);return e?Array.from(e):[]}function Pe(n,e){let t=te.get(n);t||te.set(n,t={}),t.o=e,j?n.style.setProperty(R,String(e)):re(n,["o"],be())}var be=()=>performance.now(),te=new WeakMap,N=new Map,ee=new WeakMap,A=(n,e=0)=>{let t=Number(n);return isFinite(t)?t:e},ve=class{constructor(e,t,r,i){this.owner=e;this.el=t;this.deltas=r;this._start=be();this._done=!1;this.finished=new Promise(p=>this._resolve=p),this._delay=A(i.delay),this._duration=Math.max(A(i.duration),0),this._end=this._start+this._delay+this._duration+A(i.endDelay),this._easing=je(i.easing);let s=N.get(t);s||N.set(t,s=[]),s.push(this);let a=ee.get(e);a||ee.set(e,a=new Set),a.add(this),re(t,Object.keys(r),this._start),ne||(ne=requestAnimationFrame(Ie))}value(e,t){let r=Math.max(t-this._start,0)-this._delay,i=this.deltas[e];return this._done||i==null||r<0||r>=this._duration?0:i*(1-this._easing(r/this._duration))}_complete(){var t;if(this._done)return;this._done=!0;let e=N.get(this.el);e&&(e.splice(e.indexOf(this),1),e.length||N.delete(this.el)),(t=ee.get(this.owner))==null||t.delete(this),this._resolve()}finish(){this._done||(this._complete(),re(this.el,Object.keys(this.deltas),be()))}},ne=0;function Ie(n){ne=0,N.forEach((e,t)=>{let r=new Set;e.slice().forEach(i=>{Object.keys(i.deltas).forEach(s=>r.add(s)),n>=i._end&&i._complete()}),re(t,Array.from(r),n)}),N.size&&(ne=requestAnimationFrame(Ie))}var S=n=>Math.round(n*1e4)/1e4;function re(n,e,t){let r=N.get(n),i=n.style;e.forEach(s=>{var u,y;let a=(y=(u=te.get(n))==null?void 0:u[s])!=null?y:0,p=!1;r==null||r.forEach(o=>{o.deltas[s]!=null&&(p=!0,a+=o.value(s,t))}),a=S(a),s==="x"?i.transform=a?`translateX(${a}px)`:"":s==="dx"?i.setProperty(L,`${a}px`):s==="dw"?i.setProperty(Y,String(a)):s==="o"?i.setProperty(R,String(a)):lt(n,a,p)})}var _e=(n,e)=>(n%e+e)%e,Q=new WeakMap;function lt(n,e,t){let r=n.children,i=r.length,s=A(n.style.getPropertyValue("--current"))+e;for(let a=0;a<i;a++){let p=r[a];if(!t){Q.has(p)&&(p.style.removeProperty("--y"),Q.delete(p));continue}let u=_e(i+a-_e(s,i),i),y=u-i*Math.floor(u/(i/2)),o=`${S(Math.min(Math.max(y*100,-100),100))}%`;Q.get(p)!==o&&(p.style.setProperty("--y",o),Q.set(p,o))}}function Ve(n){var e,t;if(Pe(n,0),j){let r=ye.get(n);(e=r==null?void 0:r.o)==null||e.animations.forEach(i=>i.cancel()),r&&delete r.o}else(t=N.get(n))==null||t.slice().forEach(r=>r.deltas.o!=null&&r.finish())}var Ue=(n,e)=>n==null?e:e==null?n:Math.max(n,e);var Ee=new WeakMap,We={onUpdate(n,e,t){if(Ee.set(t,void 0),!t.computedTrend)return;let r=e.integer.concat(e.fraction).filter(p=>p.type==="integer"||p.type==="fraction"),i=n.integer.concat(n.fraction).filter(p=>p.type==="integer"||p.type==="fraction"),s=r.find(p=>!i.find(u=>u.pos===p.pos&&u.value===p.value)),a=i.find(p=>!r.find(u=>p.pos===u.pos&&p.value===u.value));Ee.set(t,Ue(s==null?void 0:s.pos,a==null?void 0:a.pos))},getDelta(n,e,t){let r=n-e,i=Ee.get(t.flow);if(!r&&i!=null&&i>=t.pos)return t.length*t.flow.computedTrend}};var D=class extends Oe{constructor(){super();this.created=!1;this.batched=!1;this._preUpdated=!1;let{animated:t,...r}=this.constructor.defaultProps;this._animated=this.computedAnimated=t,Object.assign(this,r)}get animated(){return this._animated}set animated(t){this.animated!==t&&(this._animated=t,we(this).forEach(r=>r.finish()))}set data(t){var u,y;if(t==null||t===this._data)return;let{pre:r,integer:i,fraction:s,post:a,value:p}=t;if(this.created){let o=this._data;if(this._data=t,se(r,o.pre)&&se(i,o.integer)&&se(s,o.fraction)&&se(a,o.post)){this._preUpdated=!1;return}this.batched||this.willUpdate(),this.computedTrend=typeof this.trend=="function"?this.trend(o.value,p):this.trend,this.computedAnimated=this._preUpdated&&this._canAnimateNow(),(y=this.plugins)==null||y.forEach(d=>{var m;return(m=d.onUpdate)==null?void 0:m.call(d,t,o,this)});let l=[this._pre,this._num.integer,this._num.fraction,this._post],f=[r,i,s,a];l.forEach((d,m)=>d.prepare(f[m])),l.forEach(d=>d.insert()),l.forEach(d=>d.updateValues()),l.forEach(d=>d.measureChanges()),l.forEach(d=>d.popRemoved()),this.batched||this.didUpdate()}else{this._data=t,this.attachShadow({mode:"open"});try{(u=this._internals)!=null||(this._internals=this.attachInternals()),this._internals.role="img"}catch{}let o=document.createElement("style");this.nonce&&(o.nonce=this.nonce),o.textContent=Z,this.shadowRoot.appendChild(o),this._pre=new le(this,r,{justify:"right",part:"left"}),this.shadowRoot.appendChild(this._pre.el),this._num=new Me(this,i,s),this.shadowRoot.appendChild(this._num.el),this._post=new le(this,a,{justify:"left",part:"right"}),this.shadowRoot.appendChild(this._post.el),this.created=!0}try{this._internals.ariaLabel=t.valueAsString}catch{}}_canAnimateNow(){var t;return ie&&this._animated&&(!this.respectMotionPreference||!((t=C)!=null&&t.matches))&&this.ownerDocument.visibilityState==="visible"}willUpdate(){this._preUpdated=this._canAnimateNow()&&Ne(this),this._preUpdated&&(this._pre.willUpdate(),this._num.willUpdate(),this._post.willUpdate())}didUpdate(){let t=this._preUpdated;if(this._preUpdated=!1,!this.computedAnimated||!t)return;this._animationsToken||this.dispatchEvent(new Event("animationsstart")),this._pre.measure(),this._num.measure(),this._post.measure(),this._pre.animate(),this._num.animate(),this._post.animate();let r=this._animationsToken={};Promise.all(we(this).map(i=>i.finished.catch(()=>{}))).then(()=>{this._animationsToken===r&&(this._animationsToken=void 0,this.dispatchEvent(new Event("animationsfinish")))})}};D.defaultProps={transformTiming:{duration:900,easing:"linear(0,.005,.019,.039,.066,.096,.129,.165,.202,.24,.278,.316,.354,.39,.426,.461,.494,.526,.557,.586,.614,.64,.665,.689,.711,.731,.751,.769,.786,.802,.817,.831,.844,.856,.867,.877,.887,.896,.904,.912,.919,.925,.931,.937,.942,.947,.951,.955,.959,.962,.965,.968,.971,.973,.976,.978,.98,.981,.983,.984,.986,.987,.988,.989,.99,.991,.992,.992,.993,.994,.994,.995,.995,.996,.996,.9963,.9967,.9969,.9972,.9975,.9977,.9979,.9981,.9982,.9984,.9985,.9987,.9988,.9989,1)"},spinTiming:void 0,opacityTiming:{duration:450,easing:"ease-out"},animated:!0,trend:(t,r)=>Math.sign(r-t),respectMotionPreference:!0,plugins:void 0,digits:void 0};var se=(n,e)=>n.length===e.length&&n.every((t,r)=>t.key===e[r].key&&t.value===e[r].value),Me=class{constructor(e,t,r,{className:i,...s}={}){this.flow=e;this._dx=0;this._width=0;this.integer=new oe(e,t,{justify:"right",part:"integer"}),this.fraction=new oe(e,r,{justify:"left",part:"fraction"}),this._inner=E("span",{className:"number__inner"},[this.integer.el,this.fraction.el]),this.el=E("span",{...s,part:"number",className:`number ${i!=null?i:""}`},[this._inner])}willUpdate(){this._prevWidth=this.el.offsetWidth,this._prevLeft=this.el.getBoundingClientRect().left,this.integer.willUpdate(),this.fraction.willUpdate()}measure(){let e=this.el.getBoundingClientRect();this.integer.measure(),this.fraction.measure(),this._dx=this._prevLeft-e.left,this._width=this.el.offsetWidth}animate(){this.integer.animate(),this.fraction.animate();let e=this._width,t=this._prevWidth-e;this.el.style.setProperty("--width",String(e)),(this._dx||t)&&M(this.flow,this.el,{dx:this._dx,dw:t},this.flow.transformTiming)}},ae=class{constructor(e,t,{justify:r,className:i,...s},a){this.flow=e;this.children=new Map;this.onCharRemove=e=>()=>{this.children.delete(e)};this._parts=[];this._removed=new Map;this._added=new Map;this._updated=new Map;this._popped=[];this._dx=0;this.justify=r;let p=t.map(u=>this.addChar(u).el);this.el=E("span",{...s,className:`section section--justify-${r} ${i!=null?i:""}`},a?a(p):p)}addChar(e,{startDigitsAtZero:t=!1,...r}={}){let i=e.type==="integer"||e.type==="fraction"?new V(this,e.type,t?0:e.value,e.pos,{...r,onRemove:this.onCharRemove(e.key)}):new Te(this,e.type,e.value,{...r,onRemove:this.onCharRemove(e.key)});return this.children.set(e.key,i),i}unpop(e){e.present||(e.el.removeAttribute("inert"),e.el.style.top="",e.el.style[this.justify]="")}_measurePop(){this._popped=[],this._removed.forEach(e=>{(this.flow.computedAnimated||!e.present)&&this._popped.push([e,e.el.offsetTop,Se(e.el,this.justify)])})}_pop(){this._popped.forEach(([e,t,r])=>{e.el.style.top=`${t}px`,e.el.style[this.justify]=`${r}px`}),this._removed.forEach(e=>{e.el.setAttribute("inert",""),e.present=!1})}prepare(e){this._parts=e;let t=new Set(e.map(r=>r.key));this._removed=new Map,this.children.forEach((r,i)=>{t.has(i)||this._removed.set(i,r)}),this.popFirst&&this._measurePop()}insert(){this.popFirst?this._pop():this.children.forEach(t=>this.unpop(t)),this._added=new Map,this._updated=new Map;let e=this._parts.map(t=>{let r=this.children.get(t.key);return r?(this._updated.set(t,r),this.unpop(r),r.present=!0):(r=this.addChar(t,{startDigitsAtZero:!0,animateIn:!0}),r.prepareStart(),this._added.set(t,r)),r.el});if(this.justify==="left"){let t=null;e.forEach(r=>{let i=t?t.nextSibling:this.el.firstChild;i!==r&&this.el.insertBefore(r,i),t=r})}else{let t=null;$e(e,r=>{(r.parentNode!==this.el||r.nextSibling!==t)&&this.el.insertBefore(r,t),t=r},{reverse:!0})}}updateValues(){this._added.forEach((e,t)=>e.update(t.value)),this._updated.forEach((e,t)=>e.update(t.value)),this.popFirst||this._removed.forEach(e=>{e instanceof V&&e.update(0)})}measureChanges(){if(this.flow.computedAnimated&&this._added.size){let e=this.el.getBoundingClientRect();this._added.forEach(t=>t.measureStart(e))}this.popFirst||this._measurePop()}popRemoved(){this.popFirst||this._pop()}willUpdate(){let e=this.el.getBoundingClientRect();this._prevOffset=e[this.justify],this.children.forEach(t=>t.willUpdate(e))}measure(){let e=this.el.getBoundingClientRect();this.children.forEach(t=>t.measure(e)),this._dx=this._prevOffset-e[this.justify]}animate(){this.children.forEach(e=>e.animate()),this._dx&&this.children.size&&M(this.flow,this.el,{x:this._dx},this.flow.transformTiming)}},oe=class extends ae{constructor(){super(...arguments);this.popFirst=!1}},le=class extends ae{constructor(){super(...arguments);this.popFirst=!0}},I=class{constructor(e,t,{onRemove:r,animateIn:i=!1}={}){this.flow=e;this.el=t;this._present=!0;this._remove=()=>{var e;this.el.remove(),(e=this._onRemove)==null||e.call(this)};this.el.classList.add("animate-presence"),this.flow.computedAnimated&&i&&M(this.flow,this.el,{o:-.9999},this.flow.opacityTiming),this._onRemove=r}get present(){return this._present}set present(e){if(this._present!==e){if(this._present=e,e?this.el.removeAttribute("inert"):this.el.setAttribute("inert",""),!this.flow.computedAnimated){e?(Ve(this.el),this.flow.removeEventListener("animationsfinish",this._remove)):this._remove();return}Pe(this.el,e?0:-.999),M(this.flow,this.el,{o:e?-.9999:.999},this.flow.opacityTiming),e?this.flow.removeEventListener("animationsfinish",this._remove):this.flow.addEventListener("animationsfinish",this._remove,{once:!0})}}},pe=class extends I{constructor(t,r,i,s){super(t.flow,i,s);this.section=t;this.value=r;this.el=i}willUpdate(t){this.prepareStart(),this.measureStart(t)}didUpdate(t){this.measure(t),this.animate()}},V=class extends pe{constructor(t,r,i,s,a){var o,l,f;let p=((f=(l=(o=t.flow.digits)==null?void 0:o[s])==null?void 0:l.max)!=null?f:9)+1,u=Array.from({length:p}).map((d,m)=>{let c=E("span",{className:"digit__num"},[document.createTextNode(String(m))]);return m!==i&&c.setAttribute("inert",""),c.style.setProperty("--n",String(m)),c}),y=E("span",{part:`digit ${r}-digit`,className:"digit"},u);y.style.setProperty("--current",String(i)),y.style.setProperty("--length",String(p));super(t,i,y,a);this.pos=s;this._dx=0;this._onAnimationsFinish=()=>{this.el.classList.remove("is-spinning")};this._numbers=u,this.length=p}prepareStart(){this._prevValue=this.value}measureStart(t){let r=this.el.getBoundingClientRect(),i=r[this.section.justify]-t[this.section.justify],s=r.width/2;this._prevCenter=this.section.justify==="left"?i+s:i-s}update(t){var r,i;t!==this.value&&(this.el.style.setProperty("--current",String(t)),(r=this._numbers[this.value])==null||r.setAttribute("inert",""),(i=this._numbers[t])==null||i.removeAttribute("inert"),this.value=t)}measure(t){let r=this.el.getBoundingClientRect(),i=r[this.section.justify]-t[this.section.justify],s=r.width/2,a=this.section.justify==="left"?i+s:i-s;this._dx=this._prevCenter-a}animate(){var r,i;this._dx&&M(this.flow,this.el,{x:this._dx},this.flow.transformTiming);let t=this.getDelta();if(!t){this.value!==this._prevValue&&M(this.flow,this.el,{d:0},(r=this.flow.spinTiming)!=null?r:this.flow.transformTiming);return}this.el.classList.add("is-spinning"),M(this.flow,this.el,{d:-t},(i=this.flow.spinTiming)!=null?i:this.flow.transformTiming),this.flow.addEventListener("animationsfinish",this._onAnimationsFinish,{once:!0})}getDelta(){var i;if(this.flow.plugins)for(let s of this.flow.plugins){let a=(i=s.getDelta)==null?void 0:i.call(s,this.value,this._prevValue,this);if(a!=null)return a}let t=this.value-this._prevValue,r=this.flow.computedTrend||Math.sign(t);return r<0&&this.value>this._prevValue?this.value-this.length-this._prevValue:r>0&&this.value<this._prevValue?this.length-this._prevValue+this.value:t}},Te=class extends pe{constructor(t,r,i,s){let a=E("span",{className:"symbol__value",textContent:i});super(t,i,E("span",{part:`symbol ${r}`,className:"symbol"},[a]),s);this.type=r;this._children=new Map;this._onChildRemove=t=>()=>{this._children.delete(t)};this._dx=0;this._children.set(i,new I(this.flow,a,{onRemove:this._onChildRemove(i)}))}prepareStart(){}measureStart(t){if(this.type==="decimal")return;let r=this.el.getBoundingClientRect();this._prevOffset=r[this.section.justify]-t[this.section.justify]}update(t){if(this.value!==t){let r=this._children.get(this.value);r&&(r.present=!1);let i=this._children.get(t);if(i)i.present=!0;else{let s=E("span",{className:"symbol__value",textContent:t});this.el.appendChild(s),this._children.set(t,new I(this.flow,s,{animateIn:!0,onRemove:this._onChildRemove(t)}))}}this.value=t}measure(t){if(this.type==="decimal")return;let i=this.el.getBoundingClientRect()[this.section.justify]-t[this.section.justify];this._dx=this._prevOffset-i}animate(){this.type!=="decimal"&&this._dx&&M(this.flow,this.el,{x:this._dx},this.flow.transformTiming)}};var Be=n=>[ue,he(n),Z];var pt=Be(),ze="number-flow-connect",Xe="number-flow-update",mt=(n,{locales:e,format:t,numberPrefix:r,numberSuffix:i,nonce:s}={})=>{let a=B(n,new Intl.NumberFormat(e,t),r,i);return de(a,{nonce:s})},U=class extends D{constructor(){super(...arguments);this.connected=!1}connectedCallback(){this.connected=!0,this.dispatchEvent(new Event(ze,{bubbles:!0}))}disconnectedCallback(){this.connected=!1}get value(){return this._value}update(t){(!this._formatter||this._prevFormat!==this.format||this._prevLocales!==this.locales)&&(this._formatter=new Intl.NumberFormat(this.locales,this.format),this._prevFormat=this.format,this._prevLocales=this.locales),t!=null&&(this._value=t),this.dispatchEvent(new Event(Xe,{bubbles:!0})),this.data=B(this._value,this._formatter,this.numberPrefix,this.numberSuffix)}};W("number-flow",U);return et(ct);})();
