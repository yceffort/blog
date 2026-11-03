"use strict";var NumberFlowBundle=(()=>{var ee=Object.defineProperty;var Fe=Object.getOwnPropertyDescriptor;var He=Object.getOwnPropertyNames;var Ue=Object.prototype.hasOwnProperty;var Ie=(r,t)=>{for(var e in t)ee(r,e,{get:t[e],enumerable:!0})},je=(r,t,e,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of He(t))!Ue.call(r,i)&&i!==e&&ee(r,i,{get:()=>t[i],enumerable:!(n=Fe(t,i))||n.enumerable});return r};var Oe=r=>je(ee({},"__esModule",{value:!0}),r);var Qe={};Ie(Qe,{CONNECT_EVENT:()=>Ce,Digit:()=>U,UPDATE_EVENT:()=>Re,canAnimate:()=>pe,continuous:()=>Ae,default:()=>I,define:()=>j,formatToData:()=>V,getFormatter:()=>W,onMediaChange:()=>fe,prefersReducedMotion:()=>K,renderInnerHTML:()=>Ye,sameData:()=>te,styles:()=>Je});var v=(r,t,e)=>{let n=document.createElement(r),[i,s]=Array.isArray(t)?[void 0,t]:[t,e];return i&&Object.assign(n,i),s==null||s.forEach(o=>n.appendChild(o)),n},he=(r,t)=>{var e,n;return t==="left"?r.offsetLeft:((n=(e=r.offsetParent instanceof HTMLElement?r.offsetParent:null)==null?void 0:e.offsetWidth)!=null?n:0)-r.offsetWidth-r.offsetLeft},de=r=>r.offsetWidth>0&&r.offsetHeight>0,j=(r,t)=>{typeof HTMLElement!="undefined"&&typeof customElements!="undefined"&&!customElements.get(r)&&customElements.define(r,t)};var fe=(r,t)=>r?r.addEventListener?(r.addEventListener("change",t),()=>r.removeEventListener("change",t)):(r.addListener(t),()=>r.removeListener(t)):()=>{};function ye(r,t,{reverse:e=!1}={}){let n=r.length;for(let i=e?n-1:0;e?i>=0:i<n;e?i--:i++)t(r[i],i)}function V(r,t,e,n){let i=t.formatToParts(r);e&&i.unshift({type:"prefix",value:e}),n&&i.push({type:"suffix",value:n});let s=[],o=[],a=[],p=[],l={},u=c=>{var m;return`${c}:${l[c]=((m=l[c])!=null?m:-1)+1}`},h="",f=!1,y=!1;for(let c of i){h+=c.value;let m=c.type==="minusSign"||c.type==="plusSign"?"sign":c.type;m==="integer"?(f=!0,o.push(...c.value.split("").map(P=>({type:m,value:parseInt(P)})))):m==="group"?o.push({type:m,value:c.value}):m==="decimal"?(y=!0,a.push({type:m,value:c.value,key:u(m)})):m==="fraction"?a.push(...c.value.split("").map(P=>({type:m,value:parseInt(P),key:u(m),pos:-1-l[m]}))):(f||y?p:s).push({type:m,value:c.value,key:u(m)})}let b=[];for(let c=o.length-1;c>=0;c--){let m=o[c];b.unshift(m.type==="integer"?{...m,key:u(m.type),pos:l[m.type]}:{...m,key:u(m.type)})}return{pre:s,integer:b,fraction:a,post:p,valueAsString:h,value:typeof r=="string"?parseFloat(r):r}}var O=new Map;function W(r,t){if(!(r==null||typeof r=="string"||Array.isArray(r)&&r.every(s=>typeof s=="string")))return new Intl.NumberFormat(r,t);let n=JSON.stringify([r,t]),i=O.get(n);return i||(O.size>=50&&O.clear(),O.set(n,i=new Intl.NumberFormat(r,t))),i}function te(r,t){if(r.valueAsString!==t.valueAsString)return!1;for(let e of["pre","integer","fraction","post"]){let n=r[e],i=t[e];if(n.length!==i.length)return!1;for(let s=0;s<n.length;s++)if(n[s].key!==i[s].key||n[s].value!==i[s].value)return!1}return!0}var be=String.raw,C=String.raw;var ge=(()=>{try{document.createElement("div").animate({opacity:0},{easing:"linear(0, 1)"})}catch{return!1}return!0})(),_e=typeof CSS!="undefined"&&CSS.supports&&CSS.supports("line-height","mod(1,1)"),Ve=!!0||typeof CSS!="undefined"&&!!CSS.supports&&CSS.supports("width","round(nearest, 1px, 1px)"),K=typeof matchMedia!="undefined"?matchMedia("(prefers-reduced-motion: reduce)"):null,N="--_number-flow-d-opacity",D="--_number-flow-d-width",S="--_number-flow-dx",ve="--_number-flow-d",we=(()=>{try{return CSS.registerProperty({name:N,syntax:"<number>",inherits:!1,initialValue:"0"}),CSS.registerProperty({name:S,syntax:"<length>",inherits:!1,initialValue:"0px"}),CSS.registerProperty({name:D,syntax:"<number>",inherits:!1,initialValue:"0"}),CSS.registerProperty({name:ve,syntax:"<number>",inherits:!0,initialValue:"0"}),!0}catch{return!1}})(),R=Ve?"round(nearest, calc(var(--number-flow-mask-height, 0.25em) / 2), 1px)":"calc(var(--number-flow-mask-height, 0.25em) / 2)",w=`calc(${R} * 2)`,ie="var(--number-flow-mask-width, 0.5em)",ne=`1 + var(${D}) / var(--width)`,M=`calc(${ie} / (${ne}))`,B="#000 0, transparent 71%",We=C`
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

	:host([data-will-change]) .number,
	:host([data-will-change]) .number__inner,
	:host([data-will-change]) .section,
	:host([data-will-change]) .digit,
	:host([data-will-change]) .digit__num,
	:host([data-will-change]) .symbol {
		will-change: transform;
	}

	.number {
		transform: translateX(var(${S})) scaleX(calc(${ne}));

		margin: 0 calc(-1 * ${ie});
		position: relative; /* for z-index */

		/* overflow: clip; /* helpful to not affect page layout, but breaks baseline alignment in Safari :/ */
		/* -webkit- prefixed properties have better support than unprefixed ones: */
		-webkit-mask-image:
			/* Horizontal: */
			linear-gradient(
				to right,
				transparent 0,
				#000 ${M},
				#000 calc(100% - ${M}),
				transparent
			),
			/* Vertical: */
				linear-gradient(
					to bottom,
					transparent 0,
					#000 ${w},
					#000 calc(100% - ${w}),
					transparent 100%
				),
			/* TL corner */ radial-gradient(at bottom right, ${B}),
			/* TR corner */ radial-gradient(at bottom left, ${B}),
			/* BR corner */ radial-gradient(at top left, ${B}),
			/* BL corner */ radial-gradient(at top right, ${B});
		-webkit-mask-size:
			100% calc(100% - ${w} * 2),
			calc(100% - ${M} * 2) 100%,
			${M} ${w},
			${M} ${w},
			${M} ${w},
			${M} ${w};
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
		padding: ${R} ${ie};
		/* invert parent's: */
		transform: scaleX(calc(1 / (${ne}))) translateX(calc(-1 * var(${S})));
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
		--c: var(--current) + var(${ve});
	}

	.digit__num,
	.number .section::after {
		padding: ${R} 0;
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
		opacity: calc(1 + var(${N}));
	}
`,z=We;var xe=typeof HTMLElement!="undefined"?HTMLElement:class{},re=C`
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
		padding: ${R} 0;
	}

	.symbol {
		white-space: pre; /* some symbols are spaces or thin spaces */
	}
`,Be=r=>`<span class="${r.type==="integer"||r.type==="fraction"?"digit":"symbol"}" part="${r.type==="integer"||r.type==="fraction"?`digit ${r.type}-digit`:`symbol ${r.type}`}">${r.value}</span>`,X=(r,t)=>`<span part="${t}">${r.reduce((e,n)=>e+Be(n),"")}</span>`,se=(r="")=>C`
	:where(number-flow${r}) {
		line-height: 1;
	}

	number-flow${r} > span {
		font-kerning: none;
		display: inline-block;
		padding: ${w} 0;
	}
`,oe=(r,{nonce:t,elementSuffix:e}={})=>be`<template shadowroot="open" shadowrootmode="open"
			><style${t?` nonce="${t}"`:""}>${re}</style
			><span role="img" aria-label="${r.valueAsString}"
				>${X(r.pre,"left")}<span part="number" class="number"
					>${X(r.integer,"integer")}${X(r.fraction,"fraction")}</span
				>${X(r.post,"right")}</span
			></template
		><style${t?` nonce="${t}"`:""}>${se(e)}</style
		><span>${r.valueAsString}</span>`;var Me=r=>r,Pe={ease:[.25,.1,.25,1],"ease-in":[.42,0,1,1],"ease-out":[0,0,.58,1],"ease-in-out":[.42,0,.58,1]},Ee=(r,t,e,n)=>{let i=(s,o,a)=>3*s*(1-a)*(1-a)*a+3*o*(1-a)*a*a+a*a*a;return s=>{if(s<=0)return 0;if(s>=1)return 1;let o=0,a=1,p=s;for(let l=0;l<24;l++){let u=i(r,e,p);if(Math.abs(u-s)<1e-5)break;u<s?o=p:a=p,p=(o+a)/2}return i(t,n,p)}},ze=r=>{let t=[],e=[];r.forEach(s=>{let[o,...a]=s.trim().split(/\s+/),p=a.map(l=>parseFloat(l)/100);p.forEach(l=>{t.push(parseFloat(o)),e.push(l)}),p.length||(t.push(parseFloat(o)),e.push(void 0))});let n=t.length;if(n<2||t.some(isNaN))return Me;e[0]==null&&(e[0]=0),e[n-1]==null&&(e[n-1]=1);let i=e[0];for(let s=1;s<n;s++)e[s]!=null&&(i=e[s]=Math.max(e[s],i));for(let s=1;s<n-1;s++){if(e[s]!=null)continue;let o=s;for(;e[o]==null;)o++;let a=e[s-1],p=e[o];for(let l=s;l<o;l++)e[l]=a+(p-a)*(l-s+1)/(o-s+1);s=o}return s=>{if(s<=e[0])return t[0];for(let o=1;o<n;o++)if(s<=e[o]){let a=e[o]-e[o-1];return a?t[o-1]+(t[o]-t[o-1])*(s-e[o-1])/a:t[o]}return t[n-1]}},ae={},Xe=(r="linear")=>{let t=r.trim();if(ae[t])return ae[t];let e=Me,n=/^([a-z-]+)\((.*)\)$/.exec(t);if(n){let i=n[2].split(",");if(n[1]==="linear")e=ze(i);else if(n[1]==="cubic-bezier"&&i.length===4){let[s,o,a,p]=i.map(parseFloat);e=Ee(s,o,a,p)}}else Pe[t]&&(e=Ee(...Pe[t]));return ae[t]=e},T=new Set,k,Te=()=>{k=void 0;let r=performance.now();T.forEach(t=>{t._tick(r)||T.delete(t)}),T.size&&(k=requestAnimationFrame(Te))},x=class{constructor(t,e){this.owner=t;this._apply=e;this._anims=[]}run(t,{duration:e,delay:n,easing:i}){let s,o=new Promise(a=>s=a);this._anims.push({from:t,start:performance.now(),delay:Number(n)||0,duration:typeof e=="number"?e:0,ease:Xe(i),promise:o,resolve:s}),this._last=void 0,T.add(this),this._tick(performance.now()),k!=null||(k=requestAnimationFrame(Te))}_tick(t){let e=0;this._anims=this._anims.filter(i=>{let s=i.duration>0?(t-i.start-i.delay)/i.duration:1;return s>=1?(i.resolve(),!1):(e+=s<=0?i.from:i.from*(1-i.ease(s)),!0)});let n=this._anims.length===0;return(n||e!==this._last)&&this._apply(e,n),this._last=e,this._anims.length>0}finish(){this._tick(1/0),T.delete(this)}_settled(){return this._anims.map(t=>t.promise)}},Se=r=>{T.forEach(t=>{t.owner===r&&t.finish()})},Ne=r=>{let t=[];return T.forEach(e=>{e.owner===r&&t.push(...e._settled())}),Promise.all(t)};var ke=(r,t)=>r==null?t:t==null?r:Math.max(r,t);var le=new WeakMap,Ae={onUpdate(r,t,e){if(le.set(e,void 0),!e.computedTrend)return;let n=t.integer.concat(t.fraction).filter(a=>a.type==="integer"||a.type==="fraction"),i=r.integer.concat(r.fraction).filter(a=>a.type==="integer"||a.type==="fraction"),s=n.find(a=>!i.find(p=>p.pos===a.pos&&p.value===a.value)),o=i.find(a=>!n.find(p=>a.pos===p.pos&&a.value===p.value));le.set(e,ke(s==null?void 0:s.pos,o==null?void 0:o.pos))},getDelta(r,t,e){let n=r-t,i=le.get(e.flow);if(!n&&i!=null&&i>=e.pos)return e.length*e.flow.computedTrend}};var L=_e&&ge&&we,pe=L||typeof requestAnimationFrame=="function"&&typeof performance!="undefined"&&typeof HTMLElement!="undefined"&&typeof HTMLElement.prototype.attachShadow=="function",ue=(r,t)=>(r%t+t)%t,Le=(r,t,e)=>{let n=ue(e+r-ue(t,e),e),i=n-e*Math.floor(n/(e/2));return Math.max(-100,Math.min(100,i*100))},F=class{constructor(t,e){this._flow=t;this._el=e}run(t){var e;if(L){this._flow._play(this._el,{transform:[`translateX(${t}px)`,"none"]},this._flow.transformTiming);return}(e=this._channel)!=null||(this._channel=new x(this._flow,n=>{this._el.style.transform=n?`translateX(${n}px)`:""})),this._channel.run(t,this._flow.transformTiming)}},A=class extends xe{constructor(){super();this.created=!1;this.batched=!1;this._preUpdated=!1;this._anims=new Set;this._writes=[];let{animated:e,...n}=this.constructor.defaultProps;this._animated=this.computedAnimated=e,Object.assign(this,n)}get animated(){return this._animated}set animated(e){this.animated!==e&&(this._animated=e,this._anims.forEach(n=>n.finish()),Se(this))}set data(e){var p,l,u;if(e==null||e===this._data)return;if(this.created&&te(this._data,e)){this._data=e,this.computedAnimated=!1;return}let{pre:n,integer:i,fraction:s,post:o,value:a}=e;if(this.created){let h=this._data;this._data=e,this.computedTrend=typeof this.trend=="function"?this.trend(h.value,a):this.trend,this.computedAnimated=pe&&this._animated&&(!this.respectMotionPreference||!((l=K)!=null&&l.matches))&&de(this)&&this.ownerDocument.visibilityState==="visible",(u=this.plugins)==null||u.forEach(f=>{var y;return(y=f.onUpdate)==null?void 0:y.call(f,e,h,this)}),this.batched||this.willUpdate(),this._pre.update(n),this._num.update({integer:i,fraction:s}),this._post.update(o),this.batched||this.didUpdate()}else{this._data=e,this.attachShadow({mode:"open"});try{(p=this._internals)!=null||(this._internals=this.attachInternals()),this._internals.role="img"}catch{}let h=document.createElement("style");this.nonce&&(h.nonce=this.nonce),h.textContent=z,this.shadowRoot.appendChild(h),this._pre=new Q(this,n,{justify:"right",part:"left"}),this.shadowRoot.appendChild(this._pre.el),this._num=new me(this,i,s),this.shadowRoot.appendChild(this._num.el),this._post=new Q(this,o,{justify:"left",part:"right"}),this.shadowRoot.appendChild(this._post.el),this.created=!0}try{if(!this._internals||!("ariaLabel"in this._internals))throw 0;this._internals.ariaLabel=e.valueAsString}catch{this.hasAttribute("role")||this.setAttribute("role","img"),this.setAttribute("aria-label",e.valueAsString)}}willUpdate(){var e;this._preUpdated=pe&&this._animated&&(!this.respectMotionPreference||!((e=K)!=null&&e.matches))&&this.ownerDocument.visibilityState==="visible",this._preUpdated&&(this._pre.willUpdate(),this._num.willUpdate(),this._post.willUpdate())}_play(e,n,i,s="accumulate"){let o=e.animate(n,{...i,composite:s});this._anims.add(o);let a=()=>{this._anims.delete(o)};return o.finished.then(a,a),o}_cancel(e){this._anims.delete(e),e.cancel()}_defer(e){this._writes.push(e)}didUpdate(){if(!this.computedAnimated||!this._preUpdated)return;this._abortAnimationsFinish?this._abortAnimationsFinish.abort():this.dispatchEvent(new Event("animationsstart")),this._pre.didUpdate(),this._num.didUpdate(),this._post.didUpdate();let e=this._writes;this._writes=[],e.forEach(i=>i());let n=new AbortController;(L?Promise.all(Array.from(this._anims,i=>i.finished.catch(()=>{}))):Ne(this)).then(()=>{n.signal.aborted||(this.dispatchEvent(new Event("animationsfinish")),this._abortAnimationsFinish=void 0)}),this._abortAnimationsFinish=n}};A.defaultProps={transformTiming:{duration:900,easing:"linear(0,.005,.019,.039,.066,.096,.129,.165,.202,.24,.278,.316,.354,.39,.426,.461,.494,.526,.557,.586,.614,.64,.665,.689,.711,.731,.751,.769,.786,.802,.817,.831,.844,.856,.867,.877,.887,.896,.904,.912,.919,.925,.931,.937,.942,.947,.951,.955,.959,.962,.965,.968,.971,.973,.976,.978,.98,.981,.983,.984,.986,.987,.988,.989,.99,.991,.992,.992,.993,.994,.994,.995,.995,.996,.996,.9963,.9967,.9969,.9972,.9975,.9977,.9979,.9981,.9982,.9984,.9985,.9987,.9988,.9989,1)"},spinTiming:void 0,opacityTiming:{duration:450,easing:"ease-out"},animated:!0,trend:(e,n)=>Math.sign(n-e),respectMotionPreference:!0,plugins:void 0,digits:void 0};var me=class{constructor(t,e,n,{className:i,...s}={}){this.flow=t;this._dx=0;this._dWidth=0;this._writeVars=()=>{[this.el,this._inner].forEach(t=>{t.style.setProperty(S,`${this._dx}px`),t.style.setProperty(D,String(this._dWidth))})};this._dxChannel=new x(this.flow,t=>{this._dx=t,this._writeVars()});this._widthChannel=new x(this.flow,t=>{this._dWidth=t,this._writeVars()});this._integer=new Y(t,e,{justify:"right",part:"integer"}),this._fraction=new Y(t,n,{justify:"left",part:"fraction"}),this._inner=v("span",{className:"number__inner"},[this._integer.el,this._fraction.el]),this.el=v("span",{...s,part:"number",className:`number ${i!=null?i:""}`},[this._inner])}willUpdate(){this._prevWidth=this.el.offsetWidth,this._prevLeft=this.el.getBoundingClientRect().left,this._integer.willUpdate(),this._fraction.willUpdate()}update({integer:t,fraction:e}){this._integer.update(t),this._fraction.update(e)}didUpdate(){let t=this.el.getBoundingClientRect();this._integer.didUpdate(),this._fraction.didUpdate();let e=this._prevLeft-t.left,n=this.el.offsetWidth,i=this._prevWidth-n;this.flow._defer(()=>{this.el.style.setProperty("--width",String(n)),L?[this.el,this._inner].forEach(s=>this.flow._play(s,{[S]:[`${e}px`,"0px"],[D]:[i,0]},this.flow.transformTiming)):(this._dxChannel.run(e,this.flow.transformTiming),this._widthChannel.run(i,this.flow.transformTiming))})}},J=class{constructor(t,e,{justify:n,className:i,...s},o){this.flow=t;this.children=new Map;this.onCharRemove=t=>()=>{this.children.delete(t)};this.justify=n;let a=e.map(p=>this.addChar(p).el);this.el=v("span",{...s,className:`section section--justify-${n} ${i!=null?i:""}`},o?o(a):a)}addChar(t,{startDigitsAtZero:e=!1,...n}={}){let i=t.type==="integer"||t.type==="fraction"?new U(this,t.type,e?0:t.value,t.pos,{...n,onRemove:this.onCharRemove(t.key)}):new ce(this,t.type,t.value,{...n,onRemove:this.onCharRemove(t.key)});return this.children.set(t.key,i),i}unpop(t){t.el.hasAttribute("inert")&&(t.el.removeAttribute("inert"),t.el.style.top="",t.el.style[this.justify]="")}pop(t){t.forEach(e=>{e.el.style.top=`${e.el.offsetTop}px`,e.el.style[this.justify]=`${he(e.el,this.justify)}px`}),t.forEach(e=>{e.el.setAttribute("inert",""),e.present=!1})}addNewAndUpdateExisting(t){let e=new Map,n=new Map,i=this.justify==="left",s=i?"prepend":"append",o=this.el.children,a=i?0:o.length-t.length,p=a>=0&&t.every((l,u)=>{let h=this.children.get(l.key);return h&&o[a+u]===h.el});if(ye(t,l=>{let u;this.children.has(l.key)?(u=this.children.get(l.key),n.set(l,u),this.unpop(u),u.present=!0):(u=this.addChar(l,{startDigitsAtZero:!0,animateIn:!0}),e.set(l,u)),p||this.el[s](u.el)},{reverse:i}),this.flow.computedAnimated&&e.size){let l=this.el.getBoundingClientRect();e.forEach(u=>{u.willUpdate(l)})}e.forEach((l,u)=>{l.update(u.value)}),n.forEach((l,u)=>{l.update(u.value)})}willUpdate(){let t=this.el.getBoundingClientRect();this._prevOffset=t[this.justify],this.children.forEach(e=>e.willUpdate(t))}didUpdate(){let t=this.el.getBoundingClientRect();this.children.forEach(i=>i.didUpdate(t));let e=t[this.justify],n=this._prevOffset-e;n&&this.children.size&&this.flow._defer(()=>{var i;return((i=this._slide)!=null?i:this._slide=new F(this.flow,this.el)).run(n)})}},Y=class extends J{update(t){let e=new Map,n=new Set(t.map(i=>i.key));this.children.forEach((i,s)=>{n.has(s)||e.set(s,i),this.unpop(i)}),this.addNewAndUpdateExisting(t),e.forEach(i=>{i instanceof U&&i.update(0)}),this.pop(e)}},Q=class extends J{update(t){let e=new Map,n=new Set(t.map(i=>i.key));this.children.forEach((i,s)=>{n.has(s)||e.set(s,i)}),this.pop(e),this.addNewAndUpdateExisting(t)}},H=class{constructor(t,e,{onRemove:n,animateIn:i=!1}={}){this.flow=t;this.el=e;this._present=!0;this._opacityBase=0;this._remove=()=>{var t;this.el.remove(),(t=this._onRemove)==null||t.call(this)};this.el.classList.add("animate-presence"),this.flow.computedAnimated&&i&&this._fade(-.9999,0),this._onRemove=n}_fade(t,e){var n;if(L){this.flow._play(this.el,{[N]:[t,0]},this.flow.opacityTiming);return}this._opacityBase=e,(n=this._opacityChannel)!=null||(this._opacityChannel=new x(this.flow,i=>{this.el.style.setProperty(N,String(this._opacityBase+i))})),this._opacityChannel.run(t,this.flow.opacityTiming)}get present(){return this._present}set present(t){if(this._present!==t){if(this._present=t,t?this.el.removeAttribute("inert"):this.el.setAttribute("inert",""),!this.flow.computedAnimated){t||this._remove();return}this.el.style.setProperty(N,t?"0":"-.999"),this._fade(t?-.9999:.999,t?0:-.999),t?this.flow.removeEventListener("animationsfinish",this._remove):this.flow.addEventListener("animationsfinish",this._remove,{once:!0})}}},Z=class extends H{constructor(e,n,i,s){super(e.flow,i,s);this.section=e;this.value=n;this.el=i}},U=class extends Z{constructor(e,n,i,s,o){var u,h,f;let a=((f=(h=(u=e.flow.digits)==null?void 0:u[s])==null?void 0:h.max)!=null?f:9)+1,p=Array.from({length:a}).map((y,b)=>{let c=v("span",{className:"digit__num"},[document.createTextNode(String(b))]);return b!==i&&c.setAttribute("inert",""),c.style.setProperty("--n",String(b)),c}),l=v("span",{part:`digit ${n}-digit`,className:"digit"},p);l.style.setProperty("--current",String(i)),l.style.setProperty("--length",String(a));super(e,i,l,o);this.pos=s;this._transforms=[];this._spinAnims=[];this._spinFrom=0;this._positionNumbers=(e,n)=>{let{length:i}=this,s=ue(this.value+e,i);this._numbers.forEach((o,a)=>{let p="";if(!n){let l=Le(a,s,i);p=`${o.hasAttribute("inert")?"translateX(-50%) ":""}translateY(${l}%)`}this._transforms[a]!==p&&(o.style.transform=this._transforms[a]=p)})};this._onAnimationsFinish=()=>{this.el.classList.remove("is-spinning")};this._numbers=p,this.length=a}willUpdate(e){let n=this.el.getBoundingClientRect();this._prevValue=this.value;let i=n[this.section.justify]-e[this.section.justify],s=n.width/2;this._prevCenter=this.section.justify==="left"?i+s:i-s}update(e){e!==this.value&&(this.el.style.setProperty("--current",String(e)),this._numbers.forEach((n,i)=>i===e?n.removeAttribute("inert"):n.setAttribute("inert","")),this.value=e)}didUpdate(e){let n=this.el.getBoundingClientRect(),i=n[this.section.justify]-e[this.section.justify],s=n.width/2,o=this.section.justify==="left"?i+s:i-s,a=this._prevCenter-o,p=this.getDelta();this.flow._defer(()=>{var u,h,f;if(a&&((u=this._slide)!=null?u:this._slide=new F(this.flow,this.el)).run(a),!p)return;this.el.classList.add("is-spinning");let l=(h=this.flow.spinTiming)!=null?h:this.flow.transformTiming;L?this._spinModern(-p,l):((f=this._spin)!=null||(this._spin=new x(this.flow,this._positionNumbers)),this._spin.run(-p,l)),this.flow.addEventListener("animationsfinish",this._onAnimationsFinish,{once:!0})})}_spinModern(e,n){var h,f;let i=this._spinAnims.filter(y=>y.playState!=="finished");if(i.length){let y=(f=(h=i[0].effect)==null?void 0:h.getComputedTiming().progress)!=null?f:0;e+=this._spinFrom*(1-Number(y)),i.forEach(b=>this.flow._cancel(b))}if(this._spinAnims=[],this._spinFrom=e,!e)return;let{length:s}=this,o=this.value,a=o+e,p=Math.min(a,o),l=Math.max(a,o),u=1e-5;this._numbers.forEach((y,b)=>{let c=[],m=[],P=(d,g)=>{for(let q=Math.ceil((d-l)/s);q<=Math.floor((d-p)/s);q++){let G=(d-q*s-a)/(o-a);G>u&&G<1-u&&g.push(G)}};P(b-1,c),P(b+1,c),P(b-s/2,m);let E=[],$=d=>{let g=Math.min(1-u/2,Math.max(u/2,d));E.push([d,Le(b,a+(o-a)*g,s)])};$(0),c.forEach($),m.forEach(d=>{$(d-u),$(d+u)}),$(1),E.sort((d,g)=>d[0]-g[0]);let Ke=d=>m.some(g=>Math.abs(E[d][0]-g)<=u*1.01);if(!E.some(([,d],g)=>Math.abs(d)<100||g&&d!==E[g-1][1]&&!Ke(g)))return;let De=y.hasAttribute("inert")?"translateX(-50%) ":"";this._spinAnims.push(this.flow._play(y,{transform:E.map(([,d])=>`${De}translateY(${d}%)`),offset:E.map(([d])=>d)},n,"replace"))})}getDelta(){var i;if(this.flow.plugins)for(let s of this.flow.plugins){let o=(i=s.getDelta)==null?void 0:i.call(s,this.value,this._prevValue,this);if(o!=null)return o}let e=this.value-this._prevValue,n=this.flow.computedTrend||Math.sign(e);return n<0&&this.value>this._prevValue?this.value-this.length-this._prevValue:n>0&&this.value<this._prevValue?this.length-this._prevValue+this.value:e}},ce=class extends Z{constructor(e,n,i,s){let o=v("span",{className:"symbol__value",textContent:i});super(e,i,v("span",{part:`symbol ${n}`,className:"symbol"},[o]),s);this.type=n;this._children=new Map;this._onChildRemove=e=>()=>{this._children.delete(e)};this._children.set(i,new H(this.flow,o,{onRemove:this._onChildRemove(i)}))}willUpdate(e){if(this.type==="decimal")return;let n=this.el.getBoundingClientRect();this._prevOffset=n[this.section.justify]-e[this.section.justify]}update(e){if(this.value!==e){let n=this._children.get(this.value);n&&(n.present=!1);let i=this._children.get(e);if(i)i.present=!0;else{let s=v("span",{className:"symbol__value",textContent:e});this.el.appendChild(s),this._children.set(e,new H(this.flow,s,{animateIn:!0,onRemove:this._onChildRemove(e)}))}}this.value=e}didUpdate(e){if(this.type==="decimal")return;let i=this.el.getBoundingClientRect()[this.section.justify]-e[this.section.justify],s=this._prevOffset-i;s&&this.flow._defer(()=>{var o;return((o=this._slide)!=null?o:this._slide=new F(this.flow,this.el)).run(s)})}};var $e=r=>[re,se(r),z];var Je=$e(),Ce="number-flow-connect",Re="number-flow-update",Ye=(r,{locales:t,format:e,numberPrefix:n,numberSuffix:i,nonce:s}={})=>{let o=V(r,W(t,e),n,i);return oe(o,{nonce:s})},I=class extends A{constructor(){super(...arguments);this.connected=!1}connectedCallback(){this.connected=!0,this.dispatchEvent(new Event(Ce,{bubbles:!0}))}disconnectedCallback(){this.connected=!1}get value(){return this._value}update(e){(!this._formatter||this._prevFormat!==this.format||this._prevLocales!==this.locales)&&(this._formatter=W(this.locales,this.format),this._prevFormat=this.format,this._prevLocales=this.locales),e!=null&&(this._value=e),this.dispatchEvent(new Event(Re,{bubbles:!0})),this.data=V(this._value,this._formatter,this.numberPrefix,this.numberSuffix)}};j("number-flow",I);return Oe(Qe);})();
