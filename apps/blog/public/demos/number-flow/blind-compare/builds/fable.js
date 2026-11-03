"use strict";var NumberFlowBundle=(()=>{var q=Object.defineProperty;var De=Object.getOwnPropertyDescriptor;var Ce=Object.getOwnPropertyNames;var Fe=Object.prototype.hasOwnProperty;var He=(n,e)=>{for(var t in e)q(n,t,{get:e[t],enumerable:!0})},Oe=(n,e,t,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of Ce(e))!Fe.call(n,r)&&r!==t&&q(n,r,{get:()=>e[r],enumerable:!(i=De(e,r))||i.enumerable});return n};var Ve=n=>Oe(q({},"__esModule",{value:!0}),n);var qe={};He(qe,{CONNECT_EVENT:()=>ke,Digit:()=>D,UPDATE_EVENT:()=>Ke,canAnimate:()=>Le,continuous:()=>Ne,default:()=>C,define:()=>F,formatToData:()=>O,getFormatter:()=>H,prefersReducedMotion:()=>T,renderInnerHTML:()=>Qe,styles:()=>Xe});var _=(n,e,t)=>{let i=document.createElement(n),[r,s]=Array.isArray(e)?[void 0,e]:[e,t];return r&&Object.assign(i,r),s==null||s.forEach(a=>i.appendChild(a)),i},ce=(n,e)=>{var t,i;return e==="left"?n.offsetLeft:((i=(t=n.offsetParent instanceof HTMLElement?n.offsetParent:null)==null?void 0:t.offsetWidth)!=null?i:0)-n.offsetWidth-n.offsetLeft},fe=n=>n.offsetWidth>0&&n.offsetHeight>0,F=(n,e)=>{typeof HTMLElement!="undefined"&&typeof customElements!="undefined"&&!customElements.get(n)&&customElements.define(n,e)};var ye=new Map;function H(n,e){let t=`${n?JSON.stringify(n):""}:${e?JSON.stringify(e):""}`,i=ye.get(t);return i||ye.set(t,i=new Intl.NumberFormat(n,e)),i}function O(n,e,t,i){let r=e.formatToParts(n);t&&r.unshift({type:"prefix",value:t}),i&&r.push({type:"suffix",value:i});let s=[],a=[],u=[],l=[],p={},o=c=>{var d;return`${c}:${p[c]=((d=p[c])!=null?d:-1)+1}`},m="",h=!1,f=!1;for(let c of r){m+=c.value;let d=c.type==="minusSign"||c.type==="plusSign"?"sign":c.type;d==="integer"?(h=!0,a.push(...c.value.split("").map(M=>({type:d,value:parseInt(M)})))):d==="group"?a.push({type:d,value:c.value}):d==="decimal"?(f=!0,u.push({type:d,value:c.value,key:o(d)})):d==="fraction"?u.push(...c.value.split("").map(M=>({type:d,value:parseInt(M),key:o(d),pos:-1-p[d]}))):(h||f?l:s).push({type:d,value:c.value,key:o(d)})}let y=[];for(let c=a.length-1;c>=0;c--){let d=a[c];y.push(d.type==="integer"?{...d,key:o(d.type),pos:p[d.type]}:{...d,key:o(d.type)})}return y.reverse(),{pre:s,integer:y,fraction:u,post:l,valueAsString:m,value:typeof n=="string"?parseFloat(n):n}}var be=String.raw,A=String.raw;var Ie=(()=>{try{document.createElement("div").animate({opacity:0},{easing:"linear(0, 1)"})}catch{return!1}return!0})(),T=typeof matchMedia!="undefined"?matchMedia("(prefers-reduced-motion: reduce)"):null;if(T&&!T.addEventListener){let n=T;n.addEventListener=((e,t)=>n.addListener(t)),n.removeEventListener=((e,t)=>n.removeListener(t))}var E="--_number-flow-d-opacity",I="--_number-flow-d-width",L="--_number-flow-dx",Ue=(()=>{try{return CSS.registerProperty({name:E,syntax:"<number>",inherits:!1,initialValue:"0"}),CSS.registerProperty({name:L,syntax:"<length>",inherits:!0,initialValue:"0px"}),CSS.registerProperty({name:I,syntax:"<number>",inherits:!1,initialValue:"0"}),!0}catch{return!1}})(),S=Ie&&Ue,Y="--_number-flow-hmh",ge="calc(var(--number-flow-mask-height, 0.25em) / 2)",R=`var(${Y})`,v=`calc(${R} * 2)`,U=n=>A`
	${n} {
		${Y}: ${ge};
	}

	@supports (line-height: round(nearest, 1px, 1px)) {
		${n} {
			${Y}: round(nearest, ${ge}, 1px);
		}
	}
`,Z="var(--number-flow-mask-width, 0.5em)",P=`calc(${Z} / var(--scale-x))`,V="#000 0, transparent 71%",je=A`
	:host {
		display: inline-block;
		direction: ltr;
		white-space: nowrap;
		isolation: isolate; /* for .number z-index */
		/* Technically this is only needed on the .number, but applying it here makes the ::selection the same height for the whole element: */
		line-height: 1;
	}

	${U(":host")}

	.number,
	.number__inner {
		display: inline-block;
		transform-origin: left top;
	}

	/* Spelled out instead of :is() for old browsers: */
	:host([data-will-change]) .number,
	:host([data-will-change]) .number__inner,
	:host([data-will-change]) .section,
	:host([data-will-change]) .digit,
	:host([data-will-change]) .digit__num,
	:host([data-will-change]) .symbol {
		will-change: transform;
	}

	.number {
		--scale-x: calc(1 + var(${I}, 0) / var(--width));
		transform: translateX(var(${L}, 0px)) scaleX(var(--scale-x));

		margin: 0 calc(-1 * ${Z});
		position: relative; /* for z-index */

		/* overflow: clip; /* helpful to not affect page layout, but breaks baseline alignment in Safari :/ */
		/* -webkit- prefixed properties have better support than unprefixed ones: */
		-webkit-mask-image:
			/* Horizontal: */
			linear-gradient(
				to right,
				transparent 0,
				#000 ${P},
				#000 calc(100% - ${P}),
				transparent
			),
			/* Vertical: */
				linear-gradient(
					to bottom,
					transparent 0,
					#000 ${v},
					#000 calc(100% - ${v}),
					transparent 100%
				),
			/* TL corner */ radial-gradient(at bottom right, ${V}),
			/* TR corner */ radial-gradient(at bottom left, ${V}),
			/* BR corner */ radial-gradient(at top left, ${V}),
			/* BL corner */ radial-gradient(at top right, ${V});
		-webkit-mask-size:
			100% calc(100% - ${v} * 2),
			calc(100% - ${P} * 2) 100%,
			${P} ${v},
			${P} ${v},
			${P} ${v},
			${P} ${v};
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
		padding: ${R} ${Z};
		/* invert parent's (has to be computed per frame to be exact, hence the vars): */
		transform: scaleX(calc(1 / var(--scale-x))) translateX(calc(-1 * var(${L}, 0px)));
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
	}

	.digit__num,
	.number .section::after {
		padding: ${R} 0;
	}

	/* The numbers are positioned (translateY) inline by Digit, and spun with transform animations: */
	.digit__num {
		display: inline-block;
	}

	.digit__num[inert] {
		position: absolute;
		top: 0;
		left: 50%;
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
		opacity: calc(1 + var(${E}, 0));
	}
`,j=je;var _e=typeof HTMLElement!="undefined"?HTMLElement:class{},G=A`
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

	${U(":host")}

	.number,
	.digit {
		padding: ${R} 0;
	}

	.symbol {
		white-space: pre; /* some symbols are spaces or thin spaces */
	}
`,We=n=>`<span class="${n.type==="integer"||n.type==="fraction"?"digit":"symbol"}" part="${n.type==="integer"||n.type==="fraction"?`digit ${n.type}-digit`:`symbol ${n.type}`}">${n.value}</span>`,W=(n,e)=>`<span part="${e}">${n.reduce((t,i)=>t+We(i),"")}</span>`,ee=(n="")=>A`
	:where(number-flow${n}) {
		line-height: 1;
	}

	${U(`number-flow${n}`)}

	number-flow${n} > span {
		font-kerning: none;
		display: inline-block;
		padding: ${v} 0;
	}
`,te=(n,{nonce:e,elementSuffix:t}={})=>be`<template shadowroot="open" shadowrootmode="open"
			><style${e?` nonce="${e}"`:""}>${G}</style
			><span role="img" aria-label="${n.valueAsString}"
				>${W(n.pre,"left")}<span part="number" class="number"
					>${W(n.integer,"integer")}${W(n.fraction,"fraction")}</span
				>${W(n.post,"right")}</span
			></template
		><style${e?` nonce="${e}"`:""}>${ee(t)}</style
		><span>${n.valueAsString}</span>`;var oe=n=>n<0?0:n>1?1:n,ve=(n,e,t,i)=>{if(n===e&&t===i)return oe;let r=(o,m)=>1-3*m+3*o,s=(o,m)=>3*m-6*o,a=o=>3*o,u=(o,m,h)=>((r(m,h)*o+s(m,h))*o+a(m))*o,l=(o,m,h)=>3*r(m,h)*o*o+2*s(m,h)*o+a(m),p=o=>{let m=o;for(let y=0;y<8;y++){let c=l(m,n,t);if(c===0)break;let d=u(m,n,t)-o;if(Math.abs(d)<1e-6)return m;m-=d/c}let h=0,f=1;for(m=o;h<f;){let y=u(m,n,t)-o;if(Math.abs(y)<1e-6)return m;y>0?f=m:h=m,m=(h+f)/2}return m};return o=>o<=0?0:o>=1?1:u(p(o),e,i)},Be=n=>{var s,a,u;let e=[],t=[];for(let l of n.split(",")){let[p,...o]=l.trim().split(/\s+/),m=parseFloat(p);if(isNaN(m))continue;let h=o.map(f=>parseFloat(f)/100);h.length||h.push(NaN);for(let f of h)e.push(m),t.push(isNaN(f)?void 0:f)}let i=e.length;if(i<2)return oe;(s=t[0])!=null||(t[0]=0),(u=t[a=i-1])!=null||(t[a]=1);for(let l=1;l<i;l++){if(t[l]==null){let p=l+1;for(;t[p]==null;)p++;let o=t[l-1],m=t[p];for(let h=l;h<p;h++)t[h]=o+(m-o)*(h-l+1)/(p-l+1);l=p}t[l]<t[l-1]&&(t[l]=t[l-1])}let r=t;return l=>{if(l<=r[0])return e[0];if(l>=r[i-1])return e[i-1];let p=1;for(;r[p]<l;)p++;let o=r[p-1],m=r[p];return o===m?e[p]:e[p-1]+(e[p]-e[p-1])*(l-o)/(m-o)}},we={ease:[.25,.1,.25,1],"ease-in":[.42,0,1,1],"ease-out":[0,0,.58,1],"ease-in-out":[.42,0,.58,1]},xe=new Map,le=(n="linear")=>{n=n.trim();let e=xe.get(n);if(!e){let t;if(n in we)e=ve(...we[n]);else if(t=/^cubic-bezier\((.+)\)$/.exec(n)){let[i=0,r=0,s=1,a=1]=t[1].split(",").map(parseFloat);e=ve(i,r,s,a)}else(t=/^linear\((.+)\)$/.exec(n))?e=Be(t[1]):e=oe;xe.set(n,e)}return e},N=new Set,ne=new Set,re=0,Je=n=>{re=0,N.forEach(e=>e._tick(n)),ne.forEach(e=>e.render()),ne.clear(),N.size&&B()},B=()=>{re||(re=requestAnimationFrame(Je))},ie=()=>performance.now(),se=class{constructor(e){this._apply=e;this._base=0;this._anims=new Set}get base(){return this._base}set base(e){this._base!==e&&(this._base=e,this.render())}get value(){let e=this._base;return this._anims.forEach(t=>e+=t.contribution),e}render(){let e=this.value;e!==this._last&&(this._last=e,this._apply(e))}animate(e,t,i){return new ae(this,e,t,i)}},ze=n=>{if(typeof n=="number")return n;let e=parseFloat(String(n));return isNaN(e)?0:e},ae=class{constructor(e,t,i,r){this._channel=e;this.from=t;this._registry=r;this._startTime=null;this._holdTime=0;this.playState="running";var s;this.finished=new Promise(a=>this._resolve=a),this._duration=ze(i.duration),this._delay=(s=i.delay)!=null?s:0,this._easing=le(i.easing),e._anims.add(this),r==null||r.add(this),N.add(this),e.render(),this._duration+this._delay<=0?this.finish():B()}get _end(){return this._delay+this._duration}get currentTime(){var e;return(e=this._holdTime)!=null?e:ie()-this._startTime}set currentTime(e){if(e!=null){if(this.playState==="finished"||this.playState==="idle"){e<this._end&&this._restart(e);return}this._startTime==null?this._holdTime=e:this._startTime=ie()-e,this._tick(ie()),this._channel.render()}}get contribution(){let e=this.currentTime;return e==null||e<this._delay||e>=this._end?0:this.from*(1-this._easing((e-this._delay)/this._duration))}_tick(e){var t;this.playState==="running"&&(this._startTime==null&&(this._startTime=e-((t=this._holdTime)!=null?t:0),this._holdTime=null),e-this._startTime>=this._end&&this.finish()),ne.add(this._channel)}_done(e){var t;this.playState=e,N.delete(this),this._channel._anims.delete(this),(t=this._registry)==null||t.delete(this),this._channel.render(),this._resolve(this)}pause(){this.playState==="running"&&(this._holdTime=this.currentTime,this._startTime=null,this.playState="paused")}_restart(e){var t;this._holdTime=e,this._startTime=null,this._channel._anims.add(this),(t=this._registry)==null||t.add(this),this.playState="running",N.add(this),B()}play(){if(this.playState!=="running"){if(this.playState!=="paused"){this._restart(0);return}this.playState="running",N.add(this),B()}}finish(){this.playState!=="finished"&&(this._holdTime=this._end,this._startTime=null,this._done("finished"))}cancel(){this.playState!=="idle"&&(this._holdTime=0,this._startTime=null,this._done("idle"))}},Pe=new WeakMap,k=(n,e,t="",i)=>{let r=Pe.get(n);r||Pe.set(n,r=new Map);let s=r.get(e);return s||r.set(e,s=new se(i!=null?i:e==="transform"?a=>{n.style.transform=Math.abs(a)<1e-6?"":`translateX(${a}px)`}:a=>{n.style.setProperty(e,a+t)})),s},Te=n=>typeof n=="number"?n:parseFloat(n.replace(/^[a-z]+\(/i,""))||0,Ee=n=>typeof n=="string"&&/px\)?$/.test(n)?"px":"";var Se=(n,e)=>n==null?e:e==null?n:Math.max(n,e);var me=new WeakMap,Me=n=>n.integer.concat(n.fraction).filter(e=>e.type==="integer"||e.type==="fraction"),Ae=n=>new Map(n.map(e=>[e.pos,e.value])),Ne={onUpdate(n,e,t){if(me.set(t,void 0),!t.computedTrend)return;let i=Me(e),r=Me(n),s=Ae(r),a=Ae(i),u=i.find(p=>s.get(p.pos)!==p.value),l=r.find(p=>a.get(p.pos)!==p.value);me.set(t,Se(u==null?void 0:u.pos,l==null?void 0:l.pos))},getDelta(n,e,t){let i=n-e,r=me.get(t.flow);if(!i&&r!=null&&r>=t.pos)return t.length*t.flow.computedTrend}};var Le=typeof requestAnimationFrame=="function",$=class extends _e{constructor(){super();this.created=!1;this._ownsAriaLabel=!1;this.batched=!1;this._animations=new Set;this._preUpdated=!1;this._measured=!1;let{animated:t,...i}=this.constructor.defaultProps;this._animated=this.computedAnimated=t,Object.assign(this,i)}get animated(){return this._animated}set animated(t){this.animated!==t&&(this._animated=t,this._getAnimations().forEach(i=>i.finish()))}_getAnimations(){var t,i;return S?(i=(t=this.shadowRoot)==null?void 0:t.getAnimations())!=null?i:[]:Array.from(this._animations)}startAnimation(t,i,r){if(S){t.animate(i,{...r,composite:"accumulate"});return}for(let s in i){let a=i[s][0];k(t,s,Ee(a)).animate(Te(a),r,this._animations)}}setAnimatedBase(t,i,r){S?t.style.setProperty(i,String(r)):k(t,i).base=r}set data(t){var l,p;if(t==null||t===this._data)return;let{pre:i,integer:r,fraction:s,post:a,value:u}=t;if(this.created){let o=this._data;this._data=t,this.computedTrend=typeof this.trend=="function"?this.trend(o.value,u):this.trend,this.batched||this.willUpdate(),this.computedAnimated=this._preUpdated&&this._animated,(p=this.plugins)==null||p.forEach(h=>{var f;return(f=h.onUpdate)==null?void 0:f.call(h,t,o,this)});let m=[this._pre,this._num,this._post];this._pre.prepare(i),this._num.prepare(r,s),this._post.prepare(a),m.forEach(h=>h.update()),this.computedAnimated&&m.forEach(h=>h.measureAdded()),m.forEach(h=>h.commit()),m.forEach(h=>h.measureRemoved()),m.forEach(h=>h.popRemoved()),this.batched||this.didUpdate()}else{this._data=t,this.attachShadow({mode:"open"});try{if((l=this._internals)!=null||(this._internals=this.attachInternals()),!("ariaLabel"in this._internals))throw 0;this._internals.role="img"}catch{this._internals=void 0,this.hasAttribute("role")||this.setAttribute("role","img"),this._ownsAriaLabel=!this.hasAttribute("aria-label")}let o=document.createElement("style");this.nonce&&(o.nonce=this.nonce),o.textContent=j,this.shadowRoot.appendChild(o),this._pre=new X(this,i,{justify:"right",part:"left"}),this.shadowRoot.appendChild(this._pre.el),this._num=new pe(this,r,s),this.shadowRoot.appendChild(this._num.el),this._post=new X(this,a,{justify:"left",part:"right"}),this.shadowRoot.appendChild(this._post.el),this.created=!0}try{this._internals.ariaLabel=t.valueAsString}catch{this._ownsAriaLabel&&this.setAttribute("aria-label",t.valueAsString)}}willUpdate(){var t;this._preUpdated=Le&&this._animated&&(!this.respectMotionPreference||!((t=T)!=null&&t.matches))&&this.ownerDocument.visibilityState==="visible"&&fe(this),this._preUpdated&&(this._pre.willUpdate(),this._num.willUpdate(),this._post.willUpdate())}measureUpdate(){!this.computedAnimated||!this._preUpdated||(this._preUpdated=!1,this._pre.measure(),this._num.measure(),this._post.measure(),this._measured=!0)}commitUpdate(){if(!this._measured)return;this._measured=!1,this._finishToken||this.dispatchEvent(new Event("animationsstart")),this._pre.animate(),this._num.animate(),this._post.animate();let t=this._finishToken={};Promise.all(this._getAnimations().map(i=>i.finished)).then(()=>{this._finishToken===t&&(this._finishToken=void 0,this.dispatchEvent(new Event("animationsfinish")))})}didUpdate(){this.measureUpdate(),this.commitUpdate()}};$.defaultProps={transformTiming:{duration:900,easing:"linear(0,.005,.019,.039,.066,.096,.129,.165,.202,.24,.278,.316,.354,.39,.426,.461,.494,.526,.557,.586,.614,.64,.665,.689,.711,.731,.751,.769,.786,.802,.817,.831,.844,.856,.867,.877,.887,.896,.904,.912,.919,.925,.931,.937,.942,.947,.951,.955,.959,.962,.965,.968,.971,.973,.976,.978,.98,.981,.983,.984,.986,.987,.988,.989,.99,.991,.992,.992,.993,.994,.994,.995,.995,.996,.996,.9963,.9967,.9969,.9972,.9975,.9977,.9979,.9981,.9982,.9984,.9985,.9987,.9988,.9989,1)"},spinTiming:void 0,opacityTiming:{duration:450,easing:"ease-out"},animated:!0,trend:(t,i)=>Math.sign(i-t),respectMotionPreference:!0,plugins:void 0,digits:void 0};var pe=class{constructor(e,t,i,{className:r,...s}={}){this.flow=e;this._integer=new z(e,t,{justify:"right",part:"integer"}),this._fraction=new z(e,i,{justify:"left",part:"fraction"}),this._inner=_("span",{className:"number__inner"},[this._integer.el,this._fraction.el]),this.el=_("span",{...s,part:"number",className:`number ${r!=null?r:""}`},[this._inner])}willUpdate(){this._prevWidth=this.el.offsetWidth,this._prevLeft=this.el.getBoundingClientRect().left,this._integer.willUpdate(),this._fraction.willUpdate()}prepare(e,t){this._integer.prepare(e),this._fraction.prepare(t)}update(){this._integer.update(),this._fraction.update()}measureAdded(){this._integer.measureAdded(),this._fraction.measureAdded()}commit(){this._integer.commit(),this._fraction.commit()}measureRemoved(){this._integer.measureRemoved(),this._fraction.measureRemoved()}popRemoved(){this._integer.popRemoved(),this._fraction.popRemoved()}measure(){let e=this.el.getBoundingClientRect();this._dx=this._prevLeft-e.left;let t=this._width=this.el.offsetWidth;this._dWidth=this._prevWidth-t,this._integer.measure(),this._fraction.measure()}animate(){this._integer.animate(),this._fraction.animate();let e=this._width,t=this._dx,i=this._dWidth;e!==this._lastWidth&&(this._lastWidth=e,this.el.style.setProperty("--width",String(e))),!(!t&&!i)&&this.flow.startAnimation(this.el,{[L]:[`${t}px`,"0px"],[I]:[i,0]},this.flow.transformTiming)}},J=class{constructor(e,t,{justify:i,className:r,...s},a){this.flow=e;this.children=new Map;this.parts=[];this.added=new Map;this.updated=new Map;this.removed=new Map;this.onCharRemove=e=>()=>{this.children.delete(e)};this.justify=i;let u=t.map(l=>this.addChar(l).el);this.el=_("span",{...s,className:`section section--justify-${i} ${r!=null?r:""}`},a?a(u):u)}addChar(e,{startDigitsAtZero:t=!1,...i}={}){let r=e.type==="integer"||e.type==="fraction"?new D(this,e.type,t?0:e.value,e.pos,{...i,onRemove:this.onCharRemove(e.key)}):new he(this,e.type,e.value,{...i,onRemove:this.onCharRemove(e.key)});return this.children.set(e.key,r),r}unpop(e){e.el.removeAttribute("inert"),e.el.style.top="",e.el.style[this.justify]=""}measurePop(e){this.flow.computedAnimated&&e.forEach(t=>{t.popTop=t.el.offsetTop,t.popOffset=ce(t.el,this.justify)})}pop(e){let t=this.flow.computedAnimated;e.forEach(i=>{t&&(i.el.style.top=`${i.popTop}px`,i.el.style[this.justify]=`${i.popOffset}px`,i.el.setAttribute("inert","")),i.present=!1})}prepare(e){this.parts=e,this.removed.clear();let t=new Set;for(let i of e)t.add(i.key);this.children.forEach((i,r)=>{t.has(r)||this.removed.set(r,i)})}reconcile(){this.added.clear(),this.updated.clear();let e=this.parts.map(r=>{let s=this.children.get(r.key);return s?(this.updated.set(r,s),s.present||(this.unpop(s),s.present=!0)):(s=this.addChar(r,{startDigitsAtZero:!0,animateIn:!0}),this.added.set(r,s)),s}),t=new Set;e.forEach(r=>t.add(r.el));let i=this.el.firstChild;e.forEach(r=>{for(;i&&i!==r.el&&!t.has(i);)i=i.nextSibling;i===r.el?i=i.nextSibling:this.el.insertBefore(r.el,i)})}measureAdded(){if(!this.added.size)return;let e=this.el.getBoundingClientRect();this.added.forEach(t=>t.willUpdate(e))}commit(){this.added.forEach((e,t)=>e.update(t.value)),this.updated.forEach((e,t)=>e.update(t.value))}measureRemoved(){}popRemoved(){}willUpdate(){let e=this.el.getBoundingClientRect();this._prevOffset=e[this.justify],this.children.forEach(t=>t.willUpdate(e))}measure(){let e=this.el.getBoundingClientRect();this._dx=this._prevOffset-e[this.justify],this.children.forEach(t=>t.measure(e))}animate(){this.children.forEach(e=>e.animate()),this._dx&&this.children.size&&this.flow.startAnimation(this.el,{transform:[`translateX(${this._dx}px)`,"none"]},this.flow.transformTiming)}},z=class extends J{update(){this.removed.forEach(e=>{e.present||this.unpop(e)}),this.reconcile()}commit(){super.commit(),this.removed.forEach(e=>{e instanceof D&&e.update(0)})}measureRemoved(){this.measurePop(this.removed)}popRemoved(){this.pop(this.removed)}},X=class extends J{prepare(e){super.prepare(e),this.removed.forEach((t,i)=>{t.present||this.removed.delete(i)}),this.measurePop(this.removed)}update(){this.pop(this.removed),this.reconcile()}},K=class{constructor(e,t,{onRemove:i,animateIn:r=!1}={}){this.flow=e;this.el=t;this._present=!0;this._remove=()=>{var e;this.el.remove(),(e=this._onRemove)==null||e.call(this)};this.el.classList.add("animate-presence"),S||k(t,E,"",s=>{t.style.opacity=String(1+s)}),this.flow.computedAnimated&&r&&this.flow.startAnimation(this.el,{[E]:[-.9999,0]},this.flow.opacityTiming),this._onRemove=i}get present(){return this._present}set present(e){if(this._present!==e){if(this._present=e,e?this.el.removeAttribute("inert"):this.el.setAttribute("inert",""),!this.flow.computedAnimated){e||this._remove();return}this.flow.setAnimatedBase(this.el,E,e?0:-.999),this.flow.startAnimation(this.el,{[E]:e?[-.9999,0]:[.999,0]},this.flow.opacityTiming),e?this.flow.removeEventListener("animationsfinish",this._remove):this.flow.addEventListener("animationsfinish",this._remove,{once:!0})}}},Q=class extends K{constructor(t,i,r,s){super(t.flow,r,s);this.section=t;this.value=i;this.el=r}},$e="spin",D=class extends Q{constructor(t,i,r,s,a){var o,m,h;let u=((h=(m=(o=t.flow.digits)==null?void 0:o[s])==null?void 0:m.max)!=null?h:9)+1,l=Array.from({length:u}).map((f,y)=>{let c=_("span",{className:"digit__num"},[document.createTextNode(String(y))]);return y!==r&&c.setAttribute("inert",""),c}),p=_("span",{part:`digit ${i}-digit`,className:"digit"},l);super(t,r,p,a);this.pos=s;this._rendered=[];this._spinFrom=0;this._spinTo=0;this._spinAnimations=[];this._onAnimationsFinish=()=>{this.el.classList.remove("is-spinning")};this._numbers=l,this.length=u,S||(this._delta=k(p,$e,"",f=>this._render(f))),this._render(0)}_render(t){let i=this.length,r=(a,u)=>(a%u+u)%u,s=r(this.value+t,i);for(let a=0;a<i;a++){let u=r(i+a-s,i);u-=i*Math.floor(u/(i/2));let l=Math.max(-100,Math.min(100,u*100)),p=`${a===this.value?"":"translateX(-50%) "}translateY(${l}%)`;this._rendered[a]!==p&&(this._rendered[a]=p,this._numbers[a].style.transform=p)}}willUpdate(t){let i=this.el.getBoundingClientRect();this._prevValue=this.value;let r=i[this.section.justify]-t[this.section.justify],s=i.width/2;this._prevCenter=this.section.justify==="left"?r+s:r-s}update(t){var i,r,s,a;t!==this.value&&((i=this._numbers[this.value])==null||i.setAttribute("inert",""),(r=this._numbers[t])==null||r.removeAttribute("inert"),this.value=t,this._render((a=(s=this._delta)==null?void 0:s.value)!=null?a:0))}measure(t){let i=this.el.getBoundingClientRect(),r=i[this.section.justify]-t[this.section.justify],s=i.width/2,a=this.section.justify==="left"?r+s:r-s;this._dx=this._prevCenter-a}animate(){var r;this._dx&&this.flow.startAnimation(this.el,{transform:[`translateX(${this._dx}px)`,"none"]},this.flow.transformTiming);let t=this.getDelta();if(!t)return;this.el.classList.add("is-spinning");let i=(r=this.flow.spinTiming)!=null?r:this.flow.transformTiming;S?this._spin(t,i):this.flow.startAnimation(this.el,{[$e]:[-t,0]},i),this.flow.addEventListener("animationsfinish",this._onAnimationsFinish,{once:!0})}_spin(t,i){var l,p;let r=this._prevValue,s=r+t,a=this._spinAnimations[0];if(a&&a.playState!=="finished"&&a.playState!=="idle"){let o=(p=(l=a.effect)==null?void 0:l.getComputedTiming().progress)!=null?p:0;r=this._spinFrom+(this._spinTo-this._spinFrom)*this._spinEasing(o),s=this._spinTo+t}this._spinAnimations.forEach(o=>o.finish()),this._spinAnimations=[],this._spinFrom=r,this._spinTo=s,this._spinEasing=le(i.easing);let u=s-r;u&&this._numbers.forEach((o,m)=>{let h=this._path(m,r,u);h&&this._spinAnimations.push(o.animate(h,i))})}_path(t,i,r){let s=this.length,a=s/2,u=b=>{let g=b-s*Math.floor((b+a)/s);return Math.max(-100,Math.min(100,g*100))},l=t-i,p=Math.min(l,l-r),o=Math.max(l,l-r),m=new Set([0,1]);for(let b of[-1,1,a])for(let g=b+Math.ceil((p-b)/s)*s;g<=o;g+=s){let w=(l-g)/r;w>0&&w<1&&m.add(w)}let h=t===this.value?"":"translateX(-50%) ",f=[],y=!1,c,d=(b,g)=>{c&&c.u!==b&&c.y!==g&&(y=!0),c={u:b,y:g},f.push({transform:`${h}translateY(${g}%)`,offset:b})},M=Array.from(m).sort((b,g)=>b-g);return M.forEach((b,g)=>{let w=l-r*b,ue=u(g===0?w:w+r*1e-7),de=g===M.length-1?u(w):u(w-r*1e-7);d(b,ue),de!==ue&&d(b,de)}),y?f:void 0}getDelta(){var r;if(this.flow.plugins)for(let s of this.flow.plugins){let a=(r=s.getDelta)==null?void 0:r.call(s,this.value,this._prevValue,this);if(a!=null)return a}let t=this.value-this._prevValue,i=this.flow.computedTrend||Math.sign(t);return i<0&&this.value>this._prevValue?this.value-this.length-this._prevValue:i>0&&this.value<this._prevValue?this.length-this._prevValue+this.value:t}},he=class extends Q{constructor(t,i,r,s){let a=_("span",{className:"symbol__value",textContent:r});super(t,r,_("span",{part:`symbol ${i}`,className:"symbol"},[a]),s);this.type=i;this._children=new Map;this._onChildRemove=t=>()=>{this._children.delete(t)};this._children.set(r,new K(this.flow,a,{onRemove:this._onChildRemove(r)}))}willUpdate(t){if(this.type==="decimal")return;let i=this.el.getBoundingClientRect();this._prevOffset=i[this.section.justify]-t[this.section.justify]}update(t){if(this.value!==t){let i=this._children.get(this.value);i&&(i.present=!1);let r=this._children.get(t);if(r)r.present=!0;else{let s=_("span",{className:"symbol__value",textContent:t});this.el.appendChild(s),this._children.set(t,new K(this.flow,s,{animateIn:!0,onRemove:this._onChildRemove(t)}))}}this.value=t}measure(t){if(this.type==="decimal")return;let r=this.el.getBoundingClientRect()[this.section.justify]-t[this.section.justify];this._dx=this._prevOffset-r}animate(){this._dx&&this.flow.startAnimation(this.el,{transform:[`translateX(${this._dx}px)`,"none"]},this.flow.transformTiming)}};var Re=n=>[G,ee(n),j];var Xe=Re(),ke="number-flow-connect",Ke="number-flow-update",Qe=(n,{locales:e,format:t,numberPrefix:i,numberSuffix:r,nonce:s}={})=>{let a=O(n,H(e,t),i,r);return te(a,{nonce:s})},C=class extends ${constructor(){super(...arguments);this.connected=!1}connectedCallback(){this.connected=!0,this.dispatchEvent(new Event(ke,{bubbles:!0}))}disconnectedCallback(){this.connected=!1}get value(){return this._value}update(t){(!this._formatter||this._prevFormat!==this.format||this._prevLocales!==this.locales)&&(this._formatter=H(this.locales,this.format),this._prevFormat=this.format,this._prevLocales=this.locales),t!=null&&(this._value=t),this.dispatchEvent(new Event(Ke,{bubbles:!0})),this.data=O(this._value,this._formatter,this.numberPrefix,this.numberSuffix)}};F("number-flow",C);return Ve(qe);})();
