"use strict";var NumberFlowBundle=(()=>{var O=Object.defineProperty;var me=Object.getOwnPropertyDescriptor;var ce=Object.getOwnPropertyNames;var de=Object.prototype.hasOwnProperty;var ue=(r,t)=>{for(var e in t)O(r,e,{get:t[e],enumerable:!0})},he=(r,t,e,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of ce(t))!de.call(r,n)&&n!==e&&O(r,n,{get:()=>t[n],enumerable:!(i=me(t,n))||i.enumerable});return r};var fe=r=>he(O({},"__esModule",{value:!0}),r);var _e={};ue(_e,{CONNECT_EVENT:()=>le,Digit:()=>M,UPDATE_EVENT:()=>pe,canAnimate:()=>J,continuous:()=>ae,default:()=>$,define:()=>R,formatToData:()=>L,prefersReducedMotion:()=>E,renderInnerHTML:()=>ve,styles:()=>be});var f=(r,t,e)=>{let i=document.createElement(r),[n,s]=Array.isArray(t)?[void 0,t]:[t,e];return n&&Object.assign(i,n),s==null||s.forEach(o=>i.appendChild(o)),i},G=(r,t)=>{var e,i;return t==="left"?r.offsetLeft:((i=(e=r.offsetParent instanceof HTMLElement?r.offsetParent:null)==null?void 0:e.offsetWidth)!=null?i:0)-r.offsetWidth-r.offsetLeft},q=r=>r.offsetWidth>0&&r.offsetHeight>0,R=(r,t)=>{typeof HTMLElement!="undefined"&&typeof customElements!="undefined"&&!customElements.get(r)&&customElements.define(r,t)};function Q(r,t,{reverse:e=!1}={}){let i=r.length;for(let n=e?i-1:0;e?n>=0:n<i;e?n--:n++)t(r[n],n)}function L(r,t,e,i){let n=t.formatToParts(r);e&&n.unshift({type:"prefix",value:e}),i&&n.push({type:"suffix",value:i});let s=[],o=[],a=[],m=[],c={},u=p=>{var l;return`${p}:${c[p]=((l=c[p])!=null?l:-1)+1}`},d="",h=!1,v=!1;for(let p of n){d+=p.value;let l=p.type==="minusSign"||p.type==="plusSign"?"sign":p.type;l==="integer"?(h=!0,o.push(...p.value.split("").map(I=>({type:l,value:parseInt(I)})))):l==="group"?o.push({type:l,value:p.value}):l==="decimal"?(v=!0,a.push({type:l,value:p.value,key:u(l)})):l==="fraction"?a.push(...p.value.split("").map(I=>({type:l,value:parseInt(I),key:u(l),pos:-1-c[l]}))):(h||v?m:s).push({type:l,value:p.value,key:u(l)})}let _=[];for(let p=o.length-1;p>=0;p--){let l=o[p];_.unshift(l.type==="integer"?{...l,key:u(l.type),pos:c[l.type]}:{...l,key:u(l.type)})}return{pre:s,integer:_,fraction:a,post:m,valueAsString:d,value:typeof r=="string"?parseFloat(r):r}}var ee=String.raw,w=String.raw;var te=(()=>{try{document.createElement("div").animate({opacity:0},{easing:"linear(0, 1)"})}catch{return!1}return!0})(),ie=typeof CSS!="undefined"&&CSS.supports&&CSS.supports("line-height","mod(1,1)"),E=typeof matchMedia!="undefined"?matchMedia("(prefers-reduced-motion: reduce)"):null,S="--_number-flow-d-opacity",k="--_number-flow-d-width",P="--_number-flow-dx",C="--_number-flow-d",ne=(()=>{try{return CSS.registerProperty({name:S,syntax:"<number>",inherits:!1,initialValue:"0"}),CSS.registerProperty({name:P,syntax:"<length>",inherits:!0,initialValue:"0px"}),CSS.registerProperty({name:k,syntax:"<number>",inherits:!1,initialValue:"0"}),CSS.registerProperty({name:C,syntax:"<number>",inherits:!0,initialValue:"0"}),!0}catch{return!1}})(),T="round(nearest, calc(var(--number-flow-mask-height, 0.25em) / 2), 1px)",y=`calc(${T} * 2)`,j="var(--number-flow-mask-width, 0.5em)",b=`calc(${j} / var(--scale-x))`,K="#000 0, transparent 71%",ye=w`
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
		--scale-x: calc(1 + var(${k}) / var(--width));
		transform: translateX(var(${P})) scaleX(var(--scale-x));

		margin: 0 calc(-1 * ${j});
		position: relative; /* for z-index */

		/* overflow: clip; /* helpful to not affect page layout, but breaks baseline alignment in Safari :/ */
		/* -webkit- prefixed properties have better support than unprefixed ones: */
		-webkit-mask-image:
			/* Horizontal: */
			linear-gradient(
				to right,
				transparent 0,
				#000 ${b},
				#000 calc(100% - ${b}),
				transparent
			),
			/* Vertical: */
				linear-gradient(
					to bottom,
					transparent 0,
					#000 ${y},
					#000 calc(100% - ${y}),
					transparent 100%
				),
			/* TL corner */ radial-gradient(at bottom right, ${K}),
			/* TR corner */ radial-gradient(at bottom left, ${K}),
			/* BR corner */ radial-gradient(at top left, ${K}),
			/* BL corner */ radial-gradient(at top right, ${K});
		-webkit-mask-size:
			100% calc(100% - ${y} * 2),
			calc(100% - ${b} * 2) 100%,
			${b} ${y},
			${b} ${y},
			${b} ${y},
			${b} ${y};
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
		padding: ${T} ${j};
		/* invert parent's: */
		transform: scaleX(calc(1 / var(--scale-x))) translateX(calc(-1 * var(${P})));
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
		--c: var(--current) + var(${C});
	}

	.digit__num,
	.number .section::after {
		padding: ${T} 0;
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
		opacity: calc(1 + var(${S}));
	}
`,A=ye;var re=typeof HTMLElement!="undefined"?HTMLElement:class{},W=w`
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
		padding: ${T} 0;
	}

	.symbol {
		white-space: pre; /* some symbols are spaces or thin spaces */
	}
`,ge=r=>`<span class="${r.type==="integer"||r.type==="fraction"?"digit":"symbol"}" part="${r.type==="integer"||r.type==="fraction"?`digit ${r.type}-digit`:`symbol ${r.type}`}">${r.value}</span>`,D=(r,t)=>`<span part="${t}">${r.reduce((e,i)=>e+ge(i),"")}</span>`,B=(r="")=>w`
	:where(number-flow${r}) {
		line-height: 1;
	}

	number-flow${r} > span {
		font-kerning: none;
		display: inline-block;
		padding: ${y} 0;
	}
`,z=(r,{nonce:t,elementSuffix:e}={})=>ee`<template shadowroot="open" shadowrootmode="open"
			><style${t?` nonce="${t}"`:""}>${W}</style
			><span role="img" aria-label="${r.valueAsString}"
				>${D(r.pre,"left")}<span part="number" class="number"
					>${D(r.integer,"integer")}${D(r.fraction,"fraction")}</span
				>${D(r.post,"right")}</span
			></template
		><style${t?` nonce="${t}"`:""}>${B(e)}</style
		><span>${r.valueAsString}</span>`;var se=(r,t)=>r==null?t:t==null?r:Math.max(r,t);var X=new WeakMap,ae={onUpdate(r,t,e){if(X.set(e,void 0),!e.computedTrend)return;let i=t.integer.concat(t.fraction).filter(a=>a.type==="integer"||a.type==="fraction"),n=r.integer.concat(r.fraction).filter(a=>a.type==="integer"||a.type==="fraction"),s=i.find(a=>!n.find(m=>m.pos===a.pos&&m.value===a.value)),o=n.find(a=>!i.find(m=>a.pos===m.pos&&a.value===m.value));X.set(e,se(s==null?void 0:s.pos,o==null?void 0:o.pos))},getDelta(r,t,e){let i=r-t,n=X.get(e.flow);if(!i&&n!=null&&n>=e.pos)return e.length*e.flow.computedTrend}};var J=ie&&te&&ne,x=class extends re{constructor(){super();this.created=!1;this.batched=!1;this._preUpdated=!1;let{animated:e,...i}=this.constructor.defaultProps;this._animated=this.computedAnimated=e,Object.assign(this,i)}get animated(){return this._animated}set animated(e){var i;this.animated!==e&&(this._animated=e,(i=this.shadowRoot)==null||i.getAnimations().forEach(n=>n.finish()))}set data(e){var m,c,u;if(e==null||e===this._data)return;let{pre:i,integer:n,fraction:s,post:o,value:a}=e;if(this.created){let d=this._data;this._data=e,this.computedTrend=typeof this.trend=="function"?this.trend(d.value,a):this.trend,this.computedAnimated=J&&this._animated&&(!this.respectMotionPreference||!((c=E)!=null&&c.matches))&&q(this)&&this.ownerDocument.visibilityState==="visible",(u=this.plugins)==null||u.forEach(h=>{var v;return(v=h.onUpdate)==null?void 0:v.call(h,e,d,this)}),this.batched||this.willUpdate(),this._pre.update(i),this._num.update({integer:n,fraction:s}),this._post.update(o),this.batched||this.didUpdate()}else{this._data=e,this.attachShadow({mode:"open"});try{(m=this._internals)!=null||(this._internals=this.attachInternals()),this._internals.role="img"}catch{}let d=document.createElement("style");this.nonce&&(d.nonce=this.nonce),d.textContent=A,this.shadowRoot.appendChild(d),this._pre=new H(this,i,{justify:"right",part:"left"}),this.shadowRoot.appendChild(this._pre.el),this._num=new Y(this,n,s),this.shadowRoot.appendChild(this._num.el),this._post=new H(this,o,{justify:"left",part:"right"}),this.shadowRoot.appendChild(this._post.el),this.created=!0}try{this._internals.ariaLabel=e.valueAsString}catch{}}willUpdate(){var e;this._preUpdated=J&&this._animated&&(!this.respectMotionPreference||!((e=E)!=null&&e.matches))&&this.ownerDocument.visibilityState==="visible",this._preUpdated&&(this._pre.willUpdate(),this._num.willUpdate(),this._post.willUpdate())}didUpdate(){if(!this.computedAnimated||!this._preUpdated)return;this._abortAnimationsFinish?this._abortAnimationsFinish.abort():this.dispatchEvent(new Event("animationsstart")),this._pre.didUpdate(),this._num.didUpdate(),this._post.didUpdate();let e=new AbortController;Promise.all(this.shadowRoot.getAnimations().map(i=>i.finished)).then(()=>{e.signal.aborted||(this.dispatchEvent(new Event("animationsfinish")),this._abortAnimationsFinish=void 0)}),this._abortAnimationsFinish=e}};x.defaultProps={transformTiming:{duration:900,easing:"linear(0,.005,.019,.039,.066,.096,.129,.165,.202,.24,.278,.316,.354,.39,.426,.461,.494,.526,.557,.586,.614,.64,.665,.689,.711,.731,.751,.769,.786,.802,.817,.831,.844,.856,.867,.877,.887,.896,.904,.912,.919,.925,.931,.937,.942,.947,.951,.955,.959,.962,.965,.968,.971,.973,.976,.978,.98,.981,.983,.984,.986,.987,.988,.989,.99,.991,.992,.992,.993,.994,.994,.995,.995,.996,.996,.9963,.9967,.9969,.9972,.9975,.9977,.9979,.9981,.9982,.9984,.9985,.9987,.9988,.9989,1)"},spinTiming:void 0,opacityTiming:{duration:450,easing:"ease-out"},animated:!0,trend:(e,i)=>Math.sign(i-e),respectMotionPreference:!0,plugins:void 0,digits:void 0};var Y=class{constructor(t,e,i,{className:n,...s}={}){this.flow=t;this._integer=new U(t,e,{justify:"right",part:"integer"}),this._fraction=new U(t,i,{justify:"left",part:"fraction"}),this._inner=f("span",{className:"number__inner"},[this._integer.el,this._fraction.el]),this.el=f("span",{...s,part:"number",className:`number ${n!=null?n:""}`},[this._inner])}willUpdate(){this._prevWidth=this.el.offsetWidth,this._prevLeft=this.el.getBoundingClientRect().left,this._integer.willUpdate(),this._fraction.willUpdate()}update({integer:t,fraction:e}){this._integer.update(t),this._fraction.update(e)}didUpdate(){let t=this.el.getBoundingClientRect();this._integer.didUpdate(),this._fraction.didUpdate();let e=this._prevLeft-t.left,i=this.el.offsetWidth,n=this._prevWidth-i;this.el.style.setProperty("--width",String(i)),this.el.animate({[P]:[`${e}px`,"0px"],[k]:[n,0]},{...this.flow.transformTiming,composite:"accumulate"})}},F=class{constructor(t,e,{justify:i,className:n,...s},o){this.flow=t;this.children=new Map;this.onCharRemove=t=>()=>{this.children.delete(t)};this.justify=i;let a=e.map(m=>this.addChar(m).el);this.el=f("span",{...s,className:`section section--justify-${i} ${n!=null?n:""}`},o?o(a):a)}addChar(t,{startDigitsAtZero:e=!1,...i}={}){let n=t.type==="integer"||t.type==="fraction"?new M(this,t.type,e?0:t.value,t.pos,{...i,onRemove:this.onCharRemove(t.key)}):new Z(this,t.type,t.value,{...i,onRemove:this.onCharRemove(t.key)});return this.children.set(t.key,n),n}unpop(t){t.el.removeAttribute("inert"),t.el.style.top="",t.el.style[this.justify]=""}pop(t){t.forEach(e=>{e.el.style.top=`${e.el.offsetTop}px`,e.el.style[this.justify]=`${G(e.el,this.justify)}px`}),t.forEach(e=>{e.el.setAttribute("inert",""),e.present=!1})}addNewAndUpdateExisting(t){let e=new Map,i=new Map,n=this.justify==="left",s=n?"prepend":"append";if(Q(t,o=>{let a;this.children.has(o.key)?(a=this.children.get(o.key),i.set(o,a),this.unpop(a),a.present=!0):(a=this.addChar(o,{startDigitsAtZero:!0,animateIn:!0}),e.set(o,a)),this.el[s](a.el)},{reverse:n}),this.flow.computedAnimated){let o=this.el.getBoundingClientRect();e.forEach(a=>{a.willUpdate(o)})}e.forEach((o,a)=>{o.update(a.value)}),i.forEach((o,a)=>{o.update(a.value)})}willUpdate(){let t=this.el.getBoundingClientRect();this._prevOffset=t[this.justify],this.children.forEach(e=>e.willUpdate(t))}didUpdate(){let t=this.el.getBoundingClientRect();this.children.forEach(n=>n.didUpdate(t));let e=t[this.justify],i=this._prevOffset-e;i&&this.children.size&&this.el.animate({transform:[`translateX(${i}px)`,"none"]},{...this.flow.transformTiming,composite:"accumulate"})}},U=class extends F{update(t){let e=new Map;this.children.forEach((i,n)=>{t.find(s=>s.key===n)||e.set(n,i),this.unpop(i)}),this.addNewAndUpdateExisting(t),e.forEach(i=>{i instanceof M&&i.update(0)}),this.pop(e)}},H=class extends F{update(t){let e=new Map;this.children.forEach((i,n)=>{t.find(s=>s.key===n)||e.set(n,i)}),this.pop(e),this.addNewAndUpdateExisting(t)}},N=class{constructor(t,e,{onRemove:i,animateIn:n=!1}={}){this.flow=t;this.el=e;this._present=!0;this._remove=()=>{var t;this.el.remove(),(t=this._onRemove)==null||t.call(this)};this.el.classList.add("animate-presence"),this.flow.computedAnimated&&n&&this.el.animate({[S]:[-.9999,0]},{...this.flow.opacityTiming,composite:"accumulate"}),this._onRemove=i}get present(){return this._present}set present(t){if(this._present!==t){if(this._present=t,t?this.el.removeAttribute("inert"):this.el.setAttribute("inert",""),!this.flow.computedAnimated){t||this._remove();return}this.el.style.setProperty("--_number-flow-d-opacity",t?"0":"-.999"),this.el.animate({[S]:t?[-.9999,0]:[.999,0]},{...this.flow.opacityTiming,composite:"accumulate"}),t?this.flow.removeEventListener("animationsfinish",this._remove):this.flow.addEventListener("animationsfinish",this._remove,{once:!0})}}},V=class extends N{constructor(e,i,n,s){super(e.flow,n,s);this.section=e;this.value=i;this.el=n}},M=class extends V{constructor(e,i,n,s,o){var u,d,h;let a=((h=(d=(u=e.flow.digits)==null?void 0:u[s])==null?void 0:d.max)!=null?h:9)+1,m=Array.from({length:a}).map((v,_)=>{let p=f("span",{className:"digit__num"},[document.createTextNode(String(_))]);return _!==n&&p.setAttribute("inert",""),p.style.setProperty("--n",String(_)),p}),c=f("span",{part:`digit ${i}-digit`,className:"digit"},m);c.style.setProperty("--current",String(n)),c.style.setProperty("--length",String(a));super(e,n,c,o);this.pos=s;this._onAnimationsFinish=()=>{this.el.classList.remove("is-spinning")};this._numbers=m,this.length=a}willUpdate(e){let i=this.el.getBoundingClientRect();this._prevValue=this.value;let n=i[this.section.justify]-e[this.section.justify],s=i.width/2;this._prevCenter=this.section.justify==="left"?n+s:n-s}update(e){this.el.style.setProperty("--current",String(e)),this._numbers.forEach((i,n)=>n===e?i.removeAttribute("inert"):i.setAttribute("inert","")),this.value=e}didUpdate(e){var c;let i=this.el.getBoundingClientRect(),n=i[this.section.justify]-e[this.section.justify],s=i.width/2,o=this.section.justify==="left"?n+s:n-s,a=this._prevCenter-o;a&&this.el.animate({transform:[`translateX(${a}px)`,"none"]},{...this.flow.transformTiming,composite:"accumulate"});let m=this.getDelta();m&&(this.el.classList.add("is-spinning"),this.el.animate({[C]:[-m,0]},{...(c=this.flow.spinTiming)!=null?c:this.flow.transformTiming,composite:"accumulate"}),this.flow.addEventListener("animationsfinish",this._onAnimationsFinish,{once:!0}))}getDelta(){var n;if(this.flow.plugins)for(let s of this.flow.plugins){let o=(n=s.getDelta)==null?void 0:n.call(s,this.value,this._prevValue,this);if(o!=null)return o}let e=this.value-this._prevValue,i=this.flow.computedTrend||Math.sign(e);return i<0&&this.value>this._prevValue?this.value-this.length-this._prevValue:i>0&&this.value<this._prevValue?this.length-this._prevValue+this.value:e}},Z=class extends V{constructor(e,i,n,s){let o=f("span",{className:"symbol__value",textContent:n});super(e,n,f("span",{part:`symbol ${i}`,className:"symbol"},[o]),s);this.type=i;this._children=new Map;this._onChildRemove=e=>()=>{this._children.delete(e)};this._children.set(n,new N(this.flow,o,{onRemove:this._onChildRemove(n)}))}willUpdate(e){if(this.type==="decimal")return;let i=this.el.getBoundingClientRect();this._prevOffset=i[this.section.justify]-e[this.section.justify]}update(e){if(this.value!==e){let i=this._children.get(this.value);i&&(i.present=!1);let n=this._children.get(e);if(n)n.present=!0;else{let s=f("span",{className:"symbol__value",textContent:e});this.el.appendChild(s),this._children.set(e,new N(this.flow,s,{animateIn:!0,onRemove:this._onChildRemove(e)}))}}this.value=e}didUpdate(e){if(this.type==="decimal")return;let n=this.el.getBoundingClientRect()[this.section.justify]-e[this.section.justify],s=this._prevOffset-n;s&&this.el.animate({transform:[`translateX(${s}px)`,"none"]},{...this.flow.transformTiming,composite:"accumulate"})}};var oe=r=>[W,B(r),A];var be=oe(),le="number-flow-connect",pe="number-flow-update",ve=(r,{locales:t,format:e,numberPrefix:i,numberSuffix:n,nonce:s}={})=>{let o=L(r,new Intl.NumberFormat(t,e),i,n);return z(o,{nonce:s})},$=class extends x{constructor(){super(...arguments);this.connected=!1}connectedCallback(){this.connected=!0,this.dispatchEvent(new Event(le,{bubbles:!0}))}disconnectedCallback(){this.connected=!1}get value(){return this._value}update(e){(!this._formatter||this._prevFormat!==this.format||this._prevLocales!==this.locales)&&(this._formatter=new Intl.NumberFormat(this.locales,this.format),this._prevFormat=this.format,this._prevLocales=this.locales),e!=null&&(this._value=e),this.dispatchEvent(new Event(pe,{bubbles:!0})),this.data=L(this._value,this._formatter,this.numberPrefix,this.numberSuffix)}};R("number-flow",$);return fe(_e);})();
