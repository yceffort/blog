"use strict";var NumberFlowBundle=(()=>{var V=Object.defineProperty;var ce=Object.getOwnPropertyDescriptor;var de=Object.getOwnPropertyNames;var he=Object.prototype.hasOwnProperty;var fe=(r,t)=>{for(var e in t)V(r,e,{get:t[e],enumerable:!0})},ye=(r,t,e,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of de(t))!he.call(r,i)&&i!==e&&V(r,i,{get:()=>t[i],enumerable:!(n=ce(t,i))||n.enumerable});return r};var ge=r=>ye(V({},"__esModule",{value:!0}),r);var Ee={};fe(Ee,{CONNECT_EVENT:()=>me,Digit:()=>K,UPDATE_EVENT:()=>ue,canAnimate:()=>J,continuous:()=>le,default:()=>k,define:()=>L,formatToData:()=>R,prefersReducedMotion:()=>N,renderInnerHTML:()=>Pe,styles:()=>xe});var b=(r,t,e)=>{let n=document.createElement(r),[i,s]=Array.isArray(t)?[void 0,t]:[t,e];return i&&Object.assign(n,i),s==null||s.forEach(a=>n.appendChild(a)),n},Q=(r,t)=>{var e,n;return t==="left"?r.offsetLeft:((n=(e=r.offsetParent instanceof HTMLElement?r.offsetParent:null)==null?void 0:e.offsetWidth)!=null?n:0)-r.offsetWidth-r.offsetLeft},ee=r=>r.offsetWidth>0&&r.offsetHeight>0,L=(r,t)=>{typeof HTMLElement!="undefined"&&typeof customElements!="undefined"&&!customElements.get(r)&&customElements.define(r,t)};function te(r,t,{reverse:e=!1}={}){let n=r.length;for(let i=e?n-1:0;e?i>=0:i<n;e?i--:i++)t(r[i],i)}function R(r,t,e,n){let i=t.formatToParts(r);e&&i.unshift({type:"prefix",value:e}),n&&i.push({type:"suffix",value:n});let s=[],a=[],o=[],l=[],d={},c=m=>{var p;return`${m}:${d[m]=((p=d[m])!=null?p:-1)+1}`},u="",h=!1,f=!1;for(let m of i){u+=m.value;let p=m.type==="minusSign"||m.type==="plusSign"?"sign":m.type;p==="integer"?(h=!0,a.push(...m.value.split("").map(g=>({type:p,value:parseInt(g)})))):p==="group"?a.push({type:p,value:m.value}):p==="decimal"?(f=!0,o.push({type:p,value:m.value,key:c(p)})):p==="fraction"?o.push(...m.value.split("").map(g=>({type:p,value:parseInt(g),key:c(p),pos:-1-d[p]}))):(h||f?l:s).push({type:p,value:m.value,key:c(p)})}let y=[];for(let m=a.length-1;m>=0;m--){let p=a[m];y.unshift(p.type==="integer"?{...p,key:c(p.type),pos:d[p.type]}:{...p,key:c(p.type)})}return{pre:s,integer:y,fraction:o,post:l,valueAsString:u,value:typeof r=="string"?parseFloat(r):r}}var ie=String.raw,M=String.raw;var W=(()=>{try{document.createElement("div").animate({opacity:0},{easing:"linear(0, 1)"})}catch{return!1}return!0})(),ne=typeof CSS!="undefined"&&CSS.supports&&CSS.supports("line-height","mod(1,1)"),N=typeof matchMedia!="undefined"?matchMedia("(prefers-reduced-motion: reduce)"):null,$="--_number-flow-d-opacity",be="--_number-flow-d-width",ve="--_number-flow-dx",re="--_number-flow-d",se=(()=>{try{return CSS.registerProperty({name:$,syntax:"<number>",inherits:!1,initialValue:"0"}),CSS.registerProperty({name:ve,syntax:"<length>",inherits:!0,initialValue:"0px"}),CSS.registerProperty({name:be,syntax:"<number>",inherits:!1,initialValue:"0"}),CSS.registerProperty({name:re,syntax:"<number>",inherits:!0,initialValue:"0"}),!0}catch{return!1}})(),S="round(nearest, calc(var(--number-flow-mask-height, 0.25em) / 2), 1px)",v=`calc(${S} * 2)`,j="var(--number-flow-mask-width, 0.5em)",x=`calc(${j} / var(--scale-x))`,C="#000 0, transparent 71%",_e=M`
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

	:host([data-will-change]) :is(.number, .number__inner, .section, .digit, .digit__num, .symbol) {
		will-change: transform;
	}

	.number {
		--scale-x: 1;

		margin: 0 calc(-1 * ${j});
		position: relative; /* for z-index */

		/* overflow: clip; /* helpful to not affect page layout, but breaks baseline alignment in Safari :/ */
		/* -webkit- prefixed properties have better support than unprefixed ones: */
		-webkit-mask-image:
			/* Horizontal: */
			linear-gradient(
				to right,
				transparent 0,
				#000 ${x},
				#000 calc(100% - ${x}),
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
			/* TL corner */ radial-gradient(at bottom right, ${C}),
			/* TR corner */ radial-gradient(at bottom left, ${C}),
			/* BR corner */ radial-gradient(at top left, ${C}),
			/* BL corner */ radial-gradient(at top right, ${C});
		-webkit-mask-size:
			100% calc(100% - ${v} * 2),
			calc(100% - ${x} * 2) 100%,
			${x} ${v},
			${x} ${v},
			${x} ${v},
			${x} ${v};
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
		padding: ${S} ${j};
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
		--c: var(--current) + var(${re});
	}

	.digit__num,
	.number .section::after {
		padding: ${S} 0;
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
		opacity: calc(1 + var(${$}));
	}
	:host([data-number-flow-legacy]) .number,
	:host([data-number-flow-legacy]) .number__inner {
		transform: none;
	}
	:host([data-number-flow-legacy]) .number {
		-webkit-mask-image: none;
		overflow: hidden;
	}
	:host([data-number-flow-legacy]) .digit__num {
		transform: none;
	}
	:host([data-number-flow-legacy]) .digit__num[inert] {
		transform: translateX(-50%);
	}
	:host([data-number-flow-legacy]) .digit.is-spinning .digit__num:not([data-number-flow-spin]) {
		visibility: hidden;
	}
	:host([data-number-flow-legacy]) .animate-presence {
		opacity: 1;
	}
`,D=_e;var ae=typeof HTMLElement!="undefined"?HTMLElement:class{},B=M`
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
		padding: ${S} 0;
	}

	.symbol {
		white-space: pre; /* some symbols are spaces or thin spaces */
	}
`,we=r=>`<span class="${r.type==="integer"||r.type==="fraction"?"digit":"symbol"}" part="${r.type==="integer"||r.type==="fraction"?`digit ${r.type}-digit`:`symbol ${r.type}`}">${r.value}</span>`,F=(r,t)=>`<span part="${t}">${r.reduce((e,n)=>e+we(n),"")}</span>`,z=(r="")=>M`
	:where(number-flow${r}) {
		line-height: 1;
	}

	number-flow${r} > span {
		font-kerning: none;
		display: inline-block;
		padding: ${v} 0;
	}
`,X=(r,{nonce:t,elementSuffix:e}={})=>ie`<template shadowroot="open" shadowrootmode="open"
			><style${t?` nonce="${t}"`:""}>${B}</style
			><span role="img" aria-label="${r.valueAsString}"
				>${F(r.pre,"left")}<span part="number" class="number"
					>${F(r.integer,"integer")}${F(r.fraction,"fraction")}</span
				>${F(r.post,"right")}</span
			></template
		><style${t?` nonce="${t}"`:""}>${z(e)}</style
		><span>${r.valueAsString}</span>`;var oe=(r,t)=>r==null?t:t==null?r:Math.max(r,t);var q=new WeakMap,le={onUpdate(r,t,e){if(q.set(e,void 0),!e.computedTrend)return;let n=t.integer.concat(t.fraction).filter(o=>o.type==="integer"||o.type==="fraction"),i=r.integer.concat(r.fraction).filter(o=>o.type==="integer"||o.type==="fraction"),s=n.find(o=>!i.find(l=>l.pos===o.pos&&l.value===o.value)),a=i.find(o=>!n.find(l=>o.pos===l.pos&&o.value===l.value));q.set(e,oe(s==null?void 0:s.pos,a==null?void 0:a.pos))},getDelta(r,t,e){let n=r-t,i=q.get(e.flow);if(!n&&i!=null&&i>=e.pos)return e.length*e.flow.computedTrend}};var _=ne&&W&&se,J=typeof Element!="undefined"&&typeof Element.prototype.animate=="function",E=class extends ae{constructor(){super();this.created=!1;this.batched=!1;this._preUpdated=!1;this._animations=new Set;this._animationWrites=[];let{animated:e,...n}=this.constructor.defaultProps;this._animated=this.computedAnimated=e,Object.assign(this,n)}get animated(){return this._animated}set animated(e){this.animated!==e&&(this._animated=e,this._animations.forEach(n=>n.finish()))}set data(e){var l,d,c;if(e==null||e===this._data)return;let{pre:n,integer:i,fraction:s,post:a,value:o}=e;if(this.created){let u=this._data;this._data=e,this.computedTrend=typeof this.trend=="function"?this.trend(u.value,o):this.trend,this.computedAnimated=J&&this._animated&&(!this.respectMotionPreference||!((d=N)!=null&&d.matches))&&ee(this)&&this.ownerDocument.visibilityState==="visible",(c=this.plugins)==null||c.forEach(h=>{var f;return(f=h.onUpdate)==null?void 0:f.call(h,e,u,this)}),this.batched||this.willUpdate(),this._pre.update(n),this._num.update({integer:i,fraction:s}),this._post.update(a),this.batched||this.didUpdate()}else{this._data=e,this.attachShadow({mode:"open"}),_||this.setAttribute("data-number-flow-legacy","");try{(l=this._internals)!=null||(this._internals=this.attachInternals()),this._internals.role="img"}catch{}let u=document.createElement("style");this.nonce&&(u.nonce=this.nonce),u.textContent=D,this.shadowRoot.appendChild(u),this._pre=new I(this,n,{justify:"right",part:"left"}),this.shadowRoot.appendChild(this._pre.el),this._num=new Y(this,i,s),this.shadowRoot.appendChild(this._num.el),this._post=new I(this,a,{justify:"left",part:"right"}),this.shadowRoot.appendChild(this._post.el),this.created=!0}try{this._internals.ariaLabel=e.valueAsString}catch{}}willUpdate(){var e;this._preUpdated=J&&this._animated&&(!this.respectMotionPreference||!((e=N)!=null&&e.matches))&&this.ownerDocument.visibilityState==="visible",this._preUpdated&&(this._pre.willUpdate(),this._num.willUpdate(),this._post.willUpdate())}animateElement(e,n,i){let s={...i};!W&&typeof s.easing=="string"&&s.easing.startsWith("linear(")&&(s.easing="cubic-bezier(.2, .8, .2, 1)"),_||delete s.composite;let a=e.animate(n,s);return this._animations.add(a),a.finished.then(()=>this._animations.delete(a),()=>this._animations.delete(a)),a}queueAnimation(e){this._animationWrites.push(e)}didUpdate(){if(!this.computedAnimated||!this._preUpdated)return;this._abortAnimationsFinish?this._abortAnimationsFinish.abort():this.dispatchEvent(new Event("animationsstart")),this._pre.didUpdate(),this._num.didUpdate(),this._post.didUpdate();let e=this._animationWrites;this._animationWrites=[],e.forEach(i=>i());let n=new AbortController;Promise.all(Array.from(this._animations,i=>i.finished.catch(()=>{}))).then(()=>{n.signal.aborted||(this.dispatchEvent(new Event("animationsfinish")),this._abortAnimationsFinish=void 0)}),this._abortAnimationsFinish=n}};E.defaultProps={transformTiming:{duration:900,easing:"linear(0,.005,.019,.039,.066,.096,.129,.165,.202,.24,.278,.316,.354,.39,.426,.461,.494,.526,.557,.586,.614,.64,.665,.689,.711,.731,.751,.769,.786,.802,.817,.831,.844,.856,.867,.877,.887,.896,.904,.912,.919,.925,.931,.937,.942,.947,.951,.955,.959,.962,.965,.968,.971,.973,.976,.978,.98,.981,.983,.984,.986,.987,.988,.989,.99,.991,.992,.992,.993,.994,.994,.995,.995,.996,.996,.9963,.9967,.9969,.9972,.9975,.9977,.9979,.9981,.9982,.9984,.9985,.9987,.9988,.9989,1)"},spinTiming:void 0,opacityTiming:{duration:450,easing:"ease-out"},animated:!0,trend:(e,n)=>Math.sign(n-e),respectMotionPreference:!0,plugins:void 0,digits:void 0};var Y=class{constructor(t,e,n,{className:i,...s}={}){this.flow=t;this._integer=new U(t,e,{justify:"right",part:"integer"}),this._fraction=new U(t,n,{justify:"left",part:"fraction"}),this._inner=b("span",{className:"number__inner"},[this._integer.el,this._fraction.el]),this.el=b("span",{...s,part:"number",className:`number ${i!=null?i:""}`},[this._inner])}willUpdate(){this._prevWidth=this.el.offsetWidth,this._prevLeft=this.el.getBoundingClientRect().left,this._integer.willUpdate(),this._fraction.willUpdate()}update({integer:t,fraction:e}){this._integer.update(t),this._fraction.update(e)}didUpdate(){let t=this.el.getBoundingClientRect();this._integer.didUpdate(),this._fraction.didUpdate();let e=this._prevLeft-t.left,n=this.el.offsetWidth,i=this._prevWidth-n;if(!_||!e&&!i||!n)return;let s=(n+i)/n;s<=0||this.flow.queueAnimation(()=>{let a=[],o=[];for(let l=0;l<=10;l++){let d=1-l/10,c=e*d,u=1+(s-1)*d;a.push({transform:`translateX(${c}px) scaleX(${u})`}),o.push({transform:`scaleX(${1/u}) translateX(${-c}px)`})}this.flow.animateElement(this.el,a,{...this.flow.transformTiming,composite:"accumulate"}),this.flow.animateElement(this._inner,o,{...this.flow.transformTiming,composite:"accumulate"})})}},H=class{constructor(t,e,{justify:n,className:i,...s},a){this.flow=t;this.children=new Map;this.onCharRemove=t=>()=>{this.children.delete(t)};this.justify=n;let o=e.map(l=>this.addChar(l).el);this.el=b("span",{...s,className:`section section--justify-${n} ${i!=null?i:""}`},a?a(o):o)}addChar(t,{startDigitsAtZero:e=!1,...n}={}){let i=t.type==="integer"||t.type==="fraction"?new K(this,t.type,e?0:t.value,t.pos,{...n,onRemove:this.onCharRemove(t.key)}):new Z(this,t.type,t.value,{...n,onRemove:this.onCharRemove(t.key)});return this.children.set(t.key,i),i}unpop(t){t.el.hasAttribute("inert")&&(t.el.removeAttribute("inert"),t.el.style.top="",t.el.style[this.justify]="")}pop(t){Array.from(t.values(),n=>({char:n,top:n.el.offsetTop,side:Q(n.el,this.justify)})).forEach(({char:n,top:i,side:s})=>{n.el.style.top=`${i}px`,n.el.style[this.justify]=`${s}px`}),t.forEach(n=>{n.el.setAttribute("inert",""),n.present=!1})}addNewAndUpdateExisting(t){if(t.length===this.children.size){let a=this.el.firstElementChild;if(t.every(l=>{let d=this.children.get(l.key);return!d||!d.present||d.el!==a||d.el.hasAttribute("inert")?!1:(a=a.nextElementSibling,!0)})){t.forEach(l=>this.children.get(l.key).update(l.value));return}}let e=new Map,n=new Map,i=this.justify==="left",s=i?"prepend":"append";if(te(t,a=>{let o;this.children.has(a.key)?(o=this.children.get(a.key),n.set(a,o),this.unpop(o),o.present=!0):(o=this.addChar(a,{startDigitsAtZero:!0,animateIn:!0}),e.set(a,o)),this.el[s](o.el)},{reverse:i}),this.flow.computedAnimated&&e.size){let a=this.el.getBoundingClientRect();e.forEach(o=>{o.willUpdate(a)})}e.forEach((a,o)=>{a.update(o.value)}),n.forEach((a,o)=>{a.update(o.value)})}willUpdate(){let t=this.el.getBoundingClientRect();this._prevOffset=t[this.justify],this.children.forEach(e=>e.willUpdate(t))}didUpdate(){let t=this.el.getBoundingClientRect();this.children.forEach(i=>i.didUpdate(t));let e=t[this.justify],n=this._prevOffset-e;n&&this.children.size&&this.flow.queueAnimation(()=>this.flow.animateElement(this.el,{transform:[`translateX(${n}px)`,"none"]},{...this.flow.transformTiming,composite:"accumulate"}))}},U=class extends H{update(t){let e=new Map,n=new Set(t.map(i=>i.key));this.children.forEach((i,s)=>{n.has(s)||e.set(s,i),this.unpop(i)}),this.addNewAndUpdateExisting(t),e.forEach(i=>{i instanceof K&&i.update(0)}),this.pop(e)}},I=class extends H{update(t){let e=new Map,n=new Set(t.map(i=>i.key));this.children.forEach((i,s)=>{n.has(s)||e.set(s,i)}),this.pop(e),this.addNewAndUpdateExisting(t)}},A=class{constructor(t,e,{onRemove:n,animateIn:i=!1}={}){this.flow=t;this.el=e;this._present=!0;this._remove=()=>{var t;this.el.remove(),(t=this._onRemove)==null||t.call(this)};this.el.classList.add("animate-presence"),this.flow.computedAnimated&&i&&this.flow.animateElement(this.el,{[_?$:"opacity"]:_?[-.9999,0]:[0,1]},{...this.flow.opacityTiming,composite:"accumulate"}),this._onRemove=n}get present(){return this._present}set present(t){if(this._present!==t){if(this._present=t,t?this.el.removeAttribute("inert"):this.el.setAttribute("inert",""),!this.flow.computedAnimated){t||this._remove();return}_?this.el.style.setProperty("--_number-flow-d-opacity",t?"0":"-.999"):this.el.style.opacity=t?"1":"0",this.flow.animateElement(this.el,{[_?$:"opacity"]:_?t?[-.9999,0]:[.999,0]:t?[0,1]:[1,0]},{...this.flow.opacityTiming,composite:"accumulate"}),t?this.flow.removeEventListener("animationsfinish",this._remove):this.flow.addEventListener("animationsfinish",this._remove,{once:!0})}}},O=class extends A{constructor(e,n,i,s){super(e.flow,i,s);this.section=e;this.value=n;this.el=i}},K=class extends O{constructor(e,n,i,s,a){var c,u,h;let o=((h=(u=(c=e.flow.digits)==null?void 0:c[s])==null?void 0:u.max)!=null?h:9)+1,l=Array.from({length:o}).map((f,y)=>{let m=b("span",{className:"digit__num"},[document.createTextNode(String(y))]);return y!==i&&m.setAttribute("inert",""),m.style.setProperty("--n",String(y)),m}),d=b("span",{part:`digit ${n}-digit`,className:"digit"},l);d.style.setProperty("--current",String(i)),d.style.setProperty("--length",String(o));super(e,i,d,a);this.pos=s;this._legacySpinning=[];this._onAnimationsFinish=()=>{this.el.classList.remove("is-spinning")};this._numbers=l,this.length=o}willUpdate(e){let n=this.el.getBoundingClientRect();this._prevValue=this.value;let i=n[this.section.justify]-e[this.section.justify],s=n.width/2;this._prevCenter=this.section.justify==="left"?i+s:i-s}update(e){var n,i;this.value!==e&&(this.el.style.setProperty("--current",String(e)),(n=this._numbers[this.value])==null||n.setAttribute("inert",""),(i=this._numbers[e])==null||i.removeAttribute("inert")),this.value=e}didUpdate(e){let n=this.el.getBoundingClientRect(),i=n[this.section.justify]-e[this.section.justify],s=n.width/2,a=this.section.justify==="left"?i+s:i-s,o=this._prevCenter-a;o&&this.flow.queueAnimation(()=>this.flow.animateElement(this.el,{transform:[`translateX(${o}px)`,"none"]},{...this.flow.transformTiming,composite:"accumulate"}));let l=this.getDelta();if(!l)return;let d=this._prevValue;this.flow.queueAnimation(()=>{if(this.el.classList.add("is-spinning"),_){let c=Math.min(100,Math.max(1,Math.ceil(Math.abs(l)))),u=(h,f)=>{let y=((h-f)%this.length+this.length)%this.length;return y>=this.length/2&&(y-=this.length),Math.max(-1,Math.min(1,y))};this._numbers.forEach((h,f)=>{var g;let y=f===this.value?"":"translateX(-50%) ",m=[],p=!1;for(let P=0;P<=c;P++){let T=d+l*P/c,G=u(f,T);Math.abs(G)<1&&(p=!0),m.push({transform:`${y}translateY(${G*100}%)`,offset:P/c})}p&&this.flow.animateElement(h,m,(g=this.flow.spinTiming)!=null?g:this.flow.transformTiming)})}else{let c=this._prevValue;this._legacySpinning.forEach(u=>u.removeAttribute("data-number-flow-spin")),this._legacySpinning=[],(c===this.value?[c]:[c,this.value]).forEach(u=>{var g;let h=this._numbers[u];if(!h)return;h.setAttribute("data-number-flow-spin",""),this._legacySpinning.push(h);let f=P=>{let T=((u-P)%this.length+this.length)%this.length;return T>=this.length/2&&(T-=this.length),Math.max(-1,Math.min(1,T))*100},y=f(this.value),m=f(c);u===this.value&&(m=Math.sign(l)*100),u===c&&(m=0);let p=u===this.value?"":"translateX(-50%) ";this.flow.animateElement(h,{transform:[`${p}translateY(${m}%)`,`${p}translateY(${y}%)`]},(g=this.flow.spinTiming)!=null?g:this.flow.transformTiming)})}this.flow.addEventListener("animationsfinish",this._onAnimationsFinish,{once:!0})})}getDelta(){var i;if(this.flow.plugins)for(let s of this.flow.plugins){let a=(i=s.getDelta)==null?void 0:i.call(s,this.value,this._prevValue,this);if(a!=null)return a}let e=this.value-this._prevValue,n=this.flow.computedTrend||Math.sign(e);return n<0&&this.value>this._prevValue?this.value-this.length-this._prevValue:n>0&&this.value<this._prevValue?this.length-this._prevValue+this.value:e}},Z=class extends O{constructor(e,n,i,s){let a=b("span",{className:"symbol__value",textContent:i});super(e,i,b("span",{part:`symbol ${n}`,className:"symbol"},[a]),s);this.type=n;this._children=new Map;this._onChildRemove=e=>()=>{this._children.delete(e)};this._children.set(i,new A(this.flow,a,{onRemove:this._onChildRemove(i)}))}willUpdate(e){if(this.type==="decimal")return;let n=this.el.getBoundingClientRect();this._prevOffset=n[this.section.justify]-e[this.section.justify]}update(e){if(this.value!==e){let n=this._children.get(this.value);n&&(n.present=!1);let i=this._children.get(e);if(i)i.present=!0;else{let s=b("span",{className:"symbol__value",textContent:e});this.el.appendChild(s),this._children.set(e,new A(this.flow,s,{animateIn:!0,onRemove:this._onChildRemove(e)}))}}this.value=e}didUpdate(e){if(this.type==="decimal")return;let i=this.el.getBoundingClientRect()[this.section.justify]-e[this.section.justify],s=this._prevOffset-i;s&&this.flow.queueAnimation(()=>this.flow.animateElement(this.el,{transform:[`translateX(${s}px)`,"none"]},{...this.flow.transformTiming,composite:"accumulate"}))}};var pe=r=>[B,z(r),D];var xe=pe(),me="number-flow-connect",ue="number-flow-update",Pe=(r,{locales:t,format:e,numberPrefix:n,numberSuffix:i,nonce:s}={})=>{let a=R(r,new Intl.NumberFormat(t,e),n,i);return X(a,{nonce:s})},k=class extends E{constructor(){super(...arguments);this.connected=!1}connectedCallback(){this.connected=!0,this.dispatchEvent(new Event(me,{bubbles:!0}))}disconnectedCallback(){this.connected=!1}get value(){return this._value}update(e){(!this._formatter||this._prevFormat!==this.format||this._prevLocales!==this.locales)&&(this._formatter=new Intl.NumberFormat(this.locales,this.format),this._prevFormat=this.format,this._prevLocales=this.locales),e!=null&&(this._value=e),this.dispatchEvent(new Event(ue,{bubbles:!0})),this.data=R(this._value,this._formatter,this.numberPrefix,this.numberSuffix)}};L("number-flow",k);return ge(Ee);})();
