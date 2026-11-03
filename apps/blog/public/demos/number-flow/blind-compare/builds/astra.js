"use strict";var NumberFlowBundle=(()=>{var oe=Object.defineProperty;var je=Object.getOwnPropertyDescriptor;var He=Object.getOwnPropertyNames;var Ve=Object.prototype.hasOwnProperty;var Oe=(n,t)=>{for(var e in t)oe(n,e,{get:t[e],enumerable:!0})},Ue=(n,t,e,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of He(t))!Ve.call(n,r)&&r!==e&&oe(n,r,{get:()=>t[r],enumerable:!(i=je(t,r))||i.enumerable});return n};var Ie=n=>Ue(oe({},"__esModule",{value:!0}),n);var Ge={};Oe(Ge,{CONNECT_EVENT:()=>Ce,Digit:()=>X,UPDATE_EVENT:()=>Fe,canAnimate:()=>B,continuous:()=>Ke,default:()=>Y,define:()=>Q,formatToData:()=>ee,prefersReducedMotion:()=>D,renderInnerHTML:()=>Ze,styles:()=>qe});var we=String.raw,K=String.raw;var xe=(()=>{try{document.createElement("div").animate({opacity:0},{easing:"linear(0, 1)"}).cancel()}catch{return!1}return!0})(),Pe=typeof CSS!="undefined"&&CSS.supports&&CSS.supports("line-height","mod(1,1)"),D=typeof matchMedia!="undefined"?matchMedia("(prefers-reduced-motion: reduce)"):null,O="--_number-flow-d-opacity",q="--_number-flow-d-width",V="--_number-flow-dx",C="--_number-flow-d",Te=(()=>{let n=t=>{try{CSS.registerProperty(t)}catch(e){if(!(e instanceof DOMException)||e.name!=="InvalidModificationError")throw e}};try{return n({name:O,syntax:"<number>",inherits:!1,initialValue:"0"}),n({name:V,syntax:"<length>",inherits:!0,initialValue:"0px"}),n({name:q,syntax:"<number>",inherits:!1,initialValue:"0"}),n({name:C,syntax:"<number>",inherits:!0,initialValue:"0"}),!0}catch{return!1}})(),S="var(--_number-flow-half-mask-height, calc(var(--number-flow-mask-height, 0.25em) / 2))",le=K`
	@supports (padding: round(nearest, 1px, 1px)) {
		:host {
			--_number-flow-half-mask-height: round(
				nearest,
				calc(var(--number-flow-mask-height, 0.25em) / 2),
				1px
			);
		}
	}
`,T=`calc(${S} * 2)`,H="var(--number-flow-mask-width, 0.5em)",k=`calc(${H} / var(--scale-x))`,J="#000 0, transparent 71%",We=K`
	${le}
	:host {
		display: inline-block;
		direction: ltr;
		white-space: nowrap;
		isolation: isolate; /* for .number z-index */
		/* Technically this is only needed on the .number, but applying it here makes the ::selection the same height for the whole element: */
		line-height: 1;
	}

	.animation-timer {
		position: absolute;
		top: 0;
		left: 0;
		width: 1px;
		height: 1px;
		pointer-events: none;
		opacity: 0;
		background: #000;
	}

	.number,
	.number__inner {
		display: inline-block;
		transform-origin: left top;
	}

	:host([data-will-change]) span {
		will-change: transform;
	}

	.number {
		--scale-x: calc(1 + var(${q}, 0) / var(--width, 1));
		transform: translateX(var(${V}, 0px)) scaleX(var(--scale-x));

		margin: 0 calc(-1 * ${H});
		position: relative; /* for z-index */

		/* overflow: clip; /* helpful to not affect page layout, but breaks baseline alignment in Safari :/ */
		/* -webkit- prefixed properties have better support than unprefixed ones: */
		-webkit-mask-image:
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
					#000 ${T},
					#000 calc(100% - ${T}),
					transparent 100%
				),
			/* TL corner */ radial-gradient(at bottom right, ${J}),
			/* TR corner */ radial-gradient(at bottom left, ${J}),
			/* BR corner */ radial-gradient(at top left, ${J}),
			/* BL corner */ radial-gradient(at top right, ${J});
		-webkit-mask-size:
			100% calc(100% - ${T} * 2),
			calc(100% - ${k} * 2) 100%,
			${k} ${T},
			${k} ${T},
			${k} ${T},
			${k} ${T};
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
		padding: ${S} ${H};
		/* invert parent's: */
		transform: scaleX(calc(1 / var(--scale-x))) translateX(calc(-1 * var(${V}, 0px)));
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
		padding: ${S} 0;
	}

	.digit__num {
		display: inline-block;
	}

	.digit__num[inert] {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%) translateY(100%);
	}

	.digit:not(.is-spinning) .digit__num[inert] {
		display: none;
	}

	/* Clip the rolling text without changing the inline baseline or scroll extent. */
	.digit__viewport {
		position: absolute;
		top: calc(-1 * ${S});
		bottom: calc(-1 * ${S});
		left: calc(-1 * ${H});
		right: calc(-1 * ${H});
		overflow: hidden;
		pointer-events: none;
	}

	.digit__strip {
		position: absolute;
		top: ${S};
		left: 50%;
		white-space: pre;
		text-align: center;
		width: max-content;
		pointer-events: none;
		-webkit-user-select: none;
		user-select: none;
	}

	.digit:not(.is-compositor-spinning) > .digit__viewport {
		display: none;
	}

	.digit.is-compositor-spinning > .digit__num {
		opacity: 0;
	}

	.digit.is-compositor-spinning > .digit__num[inert] {
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
		opacity: calc(1 + var(${O}, 0));
	}
`,Z=We;var R=Te&&xe&&Pe,B=typeof requestAnimationFrame=="function",F=new Set,$=0;function Se(n){$=0,F.forEach(t=>t(n)),F.size&&($=requestAnimationFrame(Se))}var U=new Map;function Be(n="linear"){let t=U.get(n);return t||(t=ze(n),U.size>=32&&U.delete(U.keys().next().value),U.set(n,t)),t}function ze(n){var r,s,a,o,y,u;if(n.startsWith("linear(")){let l=[];for(let h of n.slice(7,-1).split(",")){let[m,...c]=h.trim().split(/\s+/);if(!c.length)l.push({value:Number(m)});else for(let f of c)l.push({value:Number(m),at:parseFloat(f)/100})}if(l.length>=2&&l.every(h=>Number.isFinite(h.value))){(s=(r=l[0]).at)!=null||(r.at=0),(o=(a=l[l.length-1]).at)!=null||(a.at=1);let h=0;for(let m=1;m<l.length;m++)if(l[m].at!=null){l[m].at=Math.max(l[h].at,l[m].at);for(let c=h+1;c<m;c++)l[c].at=l[h].at+(l[m].at-l[h].at)*(c-h)/(m-h);h=m}return m=>{let c=1;for(;c<l.length-1&&l[c].at<=m;)c++;let f=l[c-1],p=l[c];return p.at===f.at?p.value:f.value+(p.value-f.value)*(m-f.at)/(p.at-f.at)}}}let e=(y={ease:[.25,.1,.25,1],"ease-in":[.42,0,1,1],"ease-out":[0,0,.58,1],"ease-in-out":[.42,0,.58,1]}[n])!=null?y:n.startsWith("cubic-bezier(")?n.slice(13,-1).split(",").map(Number):void 0;if((e==null?void 0:e.length)===4){let[l,h,m,c]=e,f=(p,d,g)=>3*(1-p)**2*p*d+3*(1-p)*p*p*g+p**3;return p=>{let d=0,g=1;for(let P=0;P<16;P++){let E=(d+g)/2;f(E,l,m)<p?d=E:g=E}return f((d+g)/2,h,c)}}let i=/^steps\((\d+)(?:,\s*(start|end|jump-start|jump-end|jump-none|jump-both))?\)$/.exec(n);if(i||n==="step-start"||n==="step-end"){let l=i?Number(i[1]):1,h=(u=i==null?void 0:i[2])!=null?u:n==="step-start"?"start":"end",m=h.endsWith("start")||h==="jump-both",c=l+(h==="jump-both"?1:h==="jump-none"?-1:0);return f=>Math.max(0,Math.min(1,(Math.floor(f*l)+(m?1:0))/c))}return l=>l}var Me=new WeakMap;function Ne(n,t,e,i){var ge,be,ve;if(R&&!i)return G(n.animate(Object.keys(t).length?t:{transform:["translateX(0px)","translateX(0px)"]},e));let r=Me.get(n);r||Me.set(n,r=new Map);let s={},a=Object.keys(t).map(b=>{let _=t[b],w=parseFloat(String(_[0]).replace("translateX(","")),x=r.get(b);return x||r.set(b,x=new Map),{property:b,from:w,valuesByAnimation:x}}),o=(b,_=!1)=>{for(let{property:w,from:x,valuesByAnimation:N}of a){_?N.delete(s):N.set(s,x*(1-b));let A=0;if(N.forEach(L=>A+=L),w===C&&i)i(A);else if(w==="transform")n.style.transform=A?`translateX(${A}px)`:"";else{let L=w==="--_number-flow-d-opacity"&&n.hasAttribute("inert")?-.999:0;n.style.setProperty(w,`${L+A}${w==="--_number-flow-dx"?"px":""}`)}}},y=typeof e.duration=="number"?e.duration:0,u=(ge=e.delay)!=null?ge:0,l=Be(e.easing),h=performance.now(),m=(be=e.iterations)!=null?be:1,c=y*m,f=Math.max(0,u+c+((ve=e.endDelay)!=null?ve:0)),p=b=>{var L,_e;let _=(y?Math.max(0,Math.min(b,c))/y:m)+((L=e.iterationStart)!=null?L:0),w=Math.floor(_),x=_%1;b>=c&&x===0&&_>0&&(w--,x=1);let N=(_e=e.direction)!=null?_e:"normal",A=N==="reverse"||N==="alternate"&&w%2===1||N==="alternate-reverse"&&w%2===0;return l(A?1-x:x)},d,g=new Promise(b=>d=b),P=!1,E=()=>{P||(P=!0,F.delete(ae),o(Number.isFinite(c)?p(c):1,!Number.isFinite(c)||e.fill!=="forwards"&&e.fill!=="both"),d(),!F.size&&$&&(cancelAnimationFrame($),$=0))},ae=b=>{let _=b-h-u;b-h>=f?E():_<0&&e.fill!=="backwards"&&e.fill!=="both"||_>=c&&e.fill!=="forwards"&&e.fill!=="both"?o(1,!0):o(p(_))};return ae(h),P||F.add(ae),F.size&&!$&&($=requestAnimationFrame(Se)),{finished:g,finish:E}}function G(n){return{finish:()=>{var t;((t=n.effect)==null?void 0:t.getComputedTiming().endTime)===1/0?n.cancel():n.finish()},finished:n.finished.then(()=>{},()=>{})}}function pe(n,t,e){var a,o;if(!R||t<3||Math.abs(n)>t*2||!Number.isInteger(n)||!["auto","none"].includes((a=e.fill)!=null?a:"auto"))return!1;let i=(o=e.easing)!=null?o:"linear",r=I.get(i);if(r!==void 0)return r;let s=Xe(i);return I.size>=16&&I.delete(I.keys().next().value),I.set(i,s),s}var I=new Map;function Xe(n){var e,i;if(["linear","ease","ease-in","ease-out","ease-in-out","step-start","step-end"].includes(n)||/^steps\(/.test(n))return!0;if(n.startsWith("linear("))return n.slice(7,-1).split(",").every(r=>{let s=Number(r.trim().split(/\s+/)[0]);return s>=0&&s<=1});let t=(i=(e=/^cubic-bezier\(([^)]+)\)$/.exec(n))==null?void 0:e[1])==null?void 0:i.split(",").map(Number);return!!t&&t.length===4&&t[1]>=0&&t[1]<=1&&t[3]>=0&&t[3]<=1}var W=new Map,Ee=new WeakMap,Ye=["delay","direction","duration","easing","endDelay","fill","iterationStart","iterations"];function me(n){let t=Ee.get(n),e=t==null?void 0:t.template;if(!t||Ye.some(i=>t.values[i]!==n[i])){let i=JSON.stringify(n);e=W.get(i),e||(e=new KeyframeEffect(null,[],n),W.size>=16&&W.delete(W.keys().next().value),W.set(i,e)),Ee.set(n,{values:{...n},template:e})}return(i,r)=>{let s=new KeyframeEffect(e);s.target=i,s.setKeyframes(r);let a=new Animation(s,i.ownerDocument.timeline);return a.play(),a}}var v=(n,t,e)=>{let i=document.createElement(n),[r,s]=Array.isArray(t)?[void 0,t]:[t,e];return r&&Object.assign(i,r),s==null||s.forEach(a=>i.appendChild(a)),i},Ae=(n,t)=>{var e,i;return t==="left"?n.offsetLeft:((i=(e=n.offsetParent instanceof HTMLElement?n.offsetParent:null)==null?void 0:e.offsetWidth)!=null?i:0)-n.offsetWidth-n.offsetLeft},ke=n=>n.offsetWidth>0&&n.offsetHeight>0,Q=(n,t)=>{typeof HTMLElement!="undefined"&&typeof customElements!="undefined"&&!customElements.get(n)&&customElements.define(n,t)};function $e(n,t,{reverse:e=!1}={}){let i=n.length;for(let r=e?i-1:0;e?r>=0:r<i;e?r--:r++)t(n[r],r)}function ee(n,t,e,i){let r=t.formatToParts(n);e&&r.unshift({type:"prefix",value:e}),i&&r.push({type:"suffix",value:i});let s=[],a=[],o=[],y=[],u={},l=p=>{var d;return`${p}:${u[p]=((d=u[p])!=null?d:-1)+1}`},h="",m=!1,c=!1;for(let p of r){h+=p.value;let d=p.type==="minusSign"||p.type==="plusSign"?"sign":p.type;d==="integer"?(m=!0,a.push(...p.value.split("").map(g=>({type:d,value:parseInt(g)})))):d==="group"?a.push({type:d,value:p.value}):d==="decimal"?(c=!0,o.push({type:d,value:p.value,key:l(d)})):d==="fraction"?o.push(...p.value.split("").map(g=>({type:d,value:parseInt(g),key:l(d),pos:-1-u[d]}))):(m||c?y:s).push({type:d,value:p.value,key:l(d)})}let f=[];for(let p=a.length-1;p>=0;p--){let d=a[p];f.push(d.type==="integer"?{...d,key:l(d.type),pos:u[d.type]}:{...d,key:l(d.type)})}return f.reverse(),{pre:s,integer:f,fraction:o,post:y,valueAsString:h,value:typeof n=="string"?parseFloat(n):n}}var Re=typeof HTMLElement!="undefined"?HTMLElement:class{},ce=K`
	${le}
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
`,Je=n=>`<span class="${n.type==="integer"||n.type==="fraction"?"digit":"symbol"}" part="${n.type==="integer"||n.type==="fraction"?`digit ${n.type}-digit`:`symbol ${n.type}`}">${n.value}</span>`,te=(n,t)=>`<span part="${t}">${n.reduce((e,i)=>e+Je(i),"")}</span>`,ue=(n="")=>K`
	:where(number-flow${n}) {
		line-height: 1;
	}

	number-flow${n} > span {
		font-kerning: none;
		display: inline-block;
		padding: ${T} 0;
	}
`,de=(n,{nonce:t,elementSuffix:e}={})=>we`<template shadowroot="open" shadowrootmode="open"
			><style${t?` nonce="${t}"`:""}>${ce}</style
			><span role="img" aria-label="${n.valueAsString}"
				>${te(n.pre,"left")}<span part="number" class="number"
					>${te(n.integer,"integer")}${te(n.fraction,"fraction")}</span
				>${te(n.post,"right")}</span
			></template
		><style${t?` nonce="${t}"`:""}>${ue(e)}</style
		><span>${n.valueAsString}</span>`;var Le=(n,t)=>n==null?t:t==null?n:Math.max(n,t);var he=new WeakMap,Ke={onUpdate(n,t,e){if(he.set(e,void 0),!e.computedTrend)return;let i=t.integer.concat(t.fraction).filter(u=>u.type==="integer"||u.type==="fraction"),r=n.integer.concat(n.fraction).filter(u=>u.type==="integer"||u.type==="fraction"),s=new Map(i.map(u=>[u.pos,u.value])),a=new Map(r.map(u=>[u.pos,u.value])),o=i.find(u=>a.get(u.pos)!==u.value),y=r.find(u=>s.get(u.pos)!==u.value);he.set(e,Le(o==null?void 0:o.pos,y==null?void 0:y.pos))},getDelta(n,t,e){let i=n-t,r=he.get(e.flow);if(!i&&r!=null&&r>=e.pos)return e.length*e.flow.computedTrend}};var j=class extends Re{constructor(){super();this.created=!1;this.batched=!1;this._preUpdated=!1;this._animations=new Set;let{animated:e,...i}=this.constructor.defaultProps;this._animated=this.computedAnimated=e,Object.assign(this,i)}get animated(){return this._animated}set animated(e){this.animated!==e&&(this._animated=e,this._animations.forEach(i=>i.finish()))}disconnectedCallback(){this._animations.forEach(e=>e.finish())}set data(e){var y,u,l,h,m;if(e==null||e===this._data)return;let{pre:i,integer:r,fraction:s,post:a,value:o}=e;if(this.created){let c=this._data;this._data=e,this.computedTrend=typeof this.trend=="function"?this.trend(c.value,o):this.trend,this.computedAnimated=B&&this._animated&&(!this.respectMotionPreference||!((h=D)!=null&&h.matches))&&ke(this)&&this.ownerDocument.visibilityState==="visible",(m=this.plugins)==null||m.forEach(f=>{var p;return(p=f.onUpdate)==null?void 0:p.call(f,e,c,this)}),!this.batched&&this.computedAnimated&&this.willUpdate(),this._pre.update(i),this._num.update({integer:r,fraction:s}),this._post.update(a),this.batched||this.didUpdate()}else{this._data=e,this.attachShadow({mode:"open"});try{(y=this._internals)!=null||(this._internals=this.attachInternals()),this._internals.role="img"}catch{}let c=document.createElement("style");if(this.nonce&&(c.nonce=this.nonce),c.textContent=Z,this.shadowRoot.appendChild(c),this._pre=new re(this,i,{justify:"right",part:"left"}),this.shadowRoot.appendChild(this._pre.el),this._num=new fe(this,r,s),this.shadowRoot.appendChild(this._num.el),this._post=new re(this,a,{justify:"left",part:"right"}),this.shadowRoot.appendChild(this._post.el),this.created=!0,R&&this._animated&&(!this.respectMotionPreference||!((u=D)!=null&&u.matches))){let f=(l=this.spinTiming)!=null?l:this.transformTiming;try{pe(1,10,f)&&me(f)}catch{}}}try{this._internals.ariaLabel=e.valueAsString}catch{this.setAttribute("role","img"),this.setAttribute("aria-label",e.valueAsString)}}willUpdate(){var e;this._preUpdated=B&&this._animated&&(!this.respectMotionPreference||!((e=D)!=null&&e.matches))&&this.ownerDocument.visibilityState==="visible",this._preUpdated&&(this._pre.willUpdate(),this._num.willUpdate(),this._post.willUpdate())}_write(e){this._writes?this._writes.push(e):e()}_trackAnimation(e){this._animations.add(e),e.finished.then(()=>this._animations.delete(e))}_animate(e,i,r,s){this._write(()=>{R&&!s&&!Object.keys(i).length?(this._animationTimer||(this._animationTimer=v("span",{className:"animation-timer"}),this._animationTimer.setAttribute("aria-hidden","true"),this.shadowRoot.appendChild(this._animationTimer)),this._trackAnimation(G(this._animationTimer.animate({opacity:[0,0]},{...r,composite:"replace"})))):this._trackAnimation(Ne(e,i,r,s))})}didUpdate(){if(!this.computedAnimated||!this._preUpdated)return;this._abortAnimationsFinish?this._abortAnimationsFinish.abort():this.dispatchEvent(new Event("animationsstart")),this._writes=[];try{this._pre.didUpdate(),this._num.didUpdate(),this._post.didUpdate()}finally{let i=this._writes;this._writes=void 0,i.forEach(r=>r())}let e=new AbortController;Promise.all(Array.from(this._animations,i=>i.finished)).then(()=>{e.signal.aborted||(this._abortAnimationsFinish=void 0,this.dispatchEvent(new Event("animationsfinish")))}),this._abortAnimationsFinish=e}};j.defaultProps={transformTiming:{duration:900,easing:"linear(0,.005,.019,.039,.066,.096,.129,.165,.202,.24,.278,.316,.354,.39,.426,.461,.494,.526,.557,.586,.614,.64,.665,.689,.711,.731,.751,.769,.786,.802,.817,.831,.844,.856,.867,.877,.887,.896,.904,.912,.919,.925,.931,.937,.942,.947,.951,.955,.959,.962,.965,.968,.971,.973,.976,.978,.98,.981,.983,.984,.986,.987,.988,.989,.99,.991,.992,.992,.993,.994,.994,.995,.995,.996,.996,.9963,.9967,.9969,.9972,.9975,.9977,.9979,.9981,.9982,.9984,.9985,.9987,.9988,.9989,1)"},spinTiming:void 0,opacityTiming:{duration:450,easing:"ease-out"},animated:!0,trend:(e,i)=>Math.sign(i-e),respectMotionPreference:!0,plugins:void 0,digits:void 0};var fe=class{constructor(t,e,i,{className:r,...s}={}){this.flow=t;this._integer=new ne(t,e,{justify:"right",part:"integer"}),this._fraction=new ne(t,i,{justify:"left",part:"fraction"}),this._inner=v("span",{className:"number__inner"},[this._integer.el,this._fraction.el]),this.el=v("span",{...s,part:"number",className:`number ${r!=null?r:""}`},[this._inner])}willUpdate(){this._prevWidth=this.el.offsetWidth,this._prevLeft=this.el.getBoundingClientRect().left,this._integer.willUpdate(),this._fraction.willUpdate()}update({integer:t,fraction:e}){this._integer.update(t),this._fraction.update(e)}didUpdate(){let t=this.el.getBoundingClientRect(),e=this.el.offsetWidth;this._integer.didUpdate(),this._fraction.didUpdate();let i=this._prevLeft-t.left,r=this._prevWidth-e,s=String(e||1);this.el.style.getPropertyValue("--width")!==s&&this.flow._write(()=>this.el.style.setProperty("--width",s)),this.flow._animate(this.el,{...i?{[V]:[`${i}px`,"0px"]}:{},...r?{[q]:[r,0]}:{}},{...this.flow.transformTiming,composite:"accumulate"})}},ie=class{constructor(t,e,{justify:i,className:r,...s},a){this.flow=t;this.children=new Map;this.onCharRemove=t=>()=>{this.children.delete(t)};this.justify=i;let o=e.map(y=>this.addChar(y).el);this.el=v("span",{...s,className:`section section--justify-${i} ${r!=null?r:""}`},a?a(o):o)}addChar(t,{startDigitsAtZero:e=!1,...i}={}){let r=t.type==="integer"||t.type==="fraction"?new X(this,t.type,e?0:t.value,t.pos,{...i,onRemove:this.onCharRemove(t.key)}):new ye(this,t.type,t.value,{...i,onRemove:this.onCharRemove(t.key)});return this.children.set(t.key,r),r}unpop(t){t.el.hasAttribute("inert")&&(t.el.removeAttribute("inert"),t.el.style.top="",t.el.style[this.justify]="")}pop(t){(this.flow.computedAnimated?Array.from(t.values(),i=>({char:i,top:i.el.offsetTop,side:Ae(i.el,this.justify)})):[]).forEach(({char:i,top:r,side:s})=>{i.el.style.top=`${r}px`,i.el.style[this.justify]=`${s}px`}),t.forEach(i=>{i.el.setAttribute("inert",""),i.present=!1})}addNewAndUpdateExisting(t){let e=new Map,i=new Map,r=this.justify==="right",s=r?this.el.lastChild:this.el.firstChild;if($e(t,a=>{let o;this.children.has(a.key)?(o=this.children.get(a.key),i.set(a,o),this.unpop(o),o.present=!0):(o=this.addChar(a,{startDigitsAtZero:!0,animateIn:!0}),e.set(a,o)),o.el!==s&&this.el.insertBefore(o.el,r?s?s.nextSibling:this.el.firstChild:s),s=r?o.el.previousSibling:o.el.nextSibling},{reverse:r}),this.flow.computedAnimated&&e.size){let a=this.el.getBoundingClientRect();e.forEach(o=>{o.willUpdate(a)})}e.forEach((a,o)=>{a.update(o.value)}),i.forEach((a,o)=>{a.update(o.value)})}willUpdate(){let t=this.el.getBoundingClientRect();this._prevOffset=t[this.justify],this.children.forEach(e=>e.willUpdate(t))}didUpdate(){let t=this.el.getBoundingClientRect();this.children.forEach(r=>r.didUpdate(t));let e=t[this.justify],i=this._prevOffset-e;i&&this.children.size&&this.flow._animate(this.el,{transform:[`translateX(${i}px)`,"none"]},{...this.flow.transformTiming,composite:"accumulate"})}},ne=class extends ie{update(t){let e=new Map,i=new Set(t.map(r=>r.key));this.children.forEach((r,s)=>{i.has(s)||e.set(s,r),this.unpop(r)}),this.addNewAndUpdateExisting(t),e.forEach(r=>{r instanceof X&&r.update(0)}),this.pop(e)}},re=class extends ie{update(t){let e=new Map,i=new Set(t.map(r=>r.key));this.children.forEach((r,s)=>{i.has(s)||e.set(s,r)}),this.pop(e),this.addNewAndUpdateExisting(t)}},z=class{constructor(t,e,{onRemove:i,animateIn:r=!1}={}){this.flow=t;this.el=e;this._present=!0;this._remove=()=>{var t;this.el.remove(),(t=this._onRemove)==null||t.call(this)};this.el.classList.add("animate-presence"),this.flow.computedAnimated&&r&&this.flow._animate(this.el,{[O]:[-.9999,0]},{...this.flow.opacityTiming,composite:"accumulate"}),this._onRemove=i}get present(){return this._present}set present(t){if(this._present!==t){if(this._present=t,t?this.el.removeAttribute("inert"):this.el.setAttribute("inert",""),!this.flow.computedAnimated){t||this._remove();return}this.el.style.setProperty("--_number-flow-d-opacity",t?"0":"-.999"),this.flow._animate(this.el,{[O]:t?[-.9999,0]:[.999,0]},{...this.flow.opacityTiming,composite:"accumulate"}),t?this.flow.removeEventListener("animationsfinish",this._remove):this.flow.addEventListener("animationsfinish",this._remove,{once:!0})}}},se=class extends z{constructor(e,i,r,s){super(e.flow,r,s);this.section=e;this.value=i;this.el=r}},X=class extends se{constructor(e,i,r,s,a){var l,h,m;let o=((m=(h=(l=e.flow.digits)==null?void 0:l[s])==null?void 0:h.max)!=null?m:9)+1,y=Array.from({length:o}).map((c,f)=>{let p=v("span",{className:"digit__num"},[document.createTextNode(String(f))]);return f!==r&&p.setAttribute("inert",""),p}),u=v("span",{part:`digit ${i}-digit`,className:"digit"},y);super(e,r,u,a);this.pos=s;this._renderedY=[];this._delta=0;this._renderDigits=(e=this._delta)=>{this._delta=e;let i=this.value+e;this._numbers.forEach((r,s)=>{let a=((s-i)%this.length+this.length)%this.length;a>=this.length/2&&(a-=this.length);let o=Math.max(-1,Math.min(1,a))*100,y=this._renderedValue!==this.value&&(s===this._renderedValue||s===this.value);(this._renderedY[s]!==o||y)&&(r.style.transform=`${s===this.value?"":"translateX(-50%) "}translateY(${o}%)`,this._renderedY[s]=o)}),this._renderedValue=this.value};this._jsSpinning=!1;this._onAnimationsFinish=()=>{this.el.classList.remove("is-spinning","is-compositor-spinning"),this._nativeSpin=void 0,this._jsSpinning=this._delta!==0};this._numbers=y,this.length=o,R?this._renderRestingDigit():this._renderDigits()}willUpdate(e){let i=this.el.getBoundingClientRect();this._prevValue=this.value;let r=i[this.section.justify]-e[this.section.justify],s=i.width/2;this._prevCenter=this.section.justify==="left"?r+s:r-s}update(e){var i,r;this.value!==e&&((i=this._numbers[this.value])==null||i.setAttribute("inert",""),(r=this._numbers[e])==null||r.removeAttribute("inert"),this.value=e,R&&!this._jsSpinning?this._renderRestingDigit():this._renderDigits())}_renderRestingDigit(){let e=this._numbers[this.value];e&&e.style.transform!=="translateY(0%)"&&(e.style.transform="translateY(0%)"),this._renderedY=[],this._renderedValue=void 0}didUpdate(e){var h;let i=this.el.getBoundingClientRect(),r=i[this.section.justify]-e[this.section.justify],s=i.width/2,a=this.section.justify==="left"?r+s:r-s,o=this._prevCenter-a;o&&this.flow._animate(this.el,{transform:[`translateX(${o}px)`,"none"]},{...this.flow.transformTiming,composite:"accumulate"});let y=this.getDelta();if(!y){this._nativeSpin&&this.value!==this._prevValue&&this.flow._write(()=>this._handoffNativeSpin());return}let u=(h=this.flow.spinTiming)!=null?h:this.flow.transformTiming,l=0;if(!this._jsSpinning&&this._numbers[this.value]&&pe(y,this.length,u)){let m=getComputedStyle(this._numbers[this.value]);l=parseFloat(m.height),m.boxSizing!=="border-box"&&(l+=parseFloat(m.paddingTop)+parseFloat(m.paddingBottom)+parseFloat(m.borderTopWidth)+parseFloat(m.borderBottomWidth))}this.flow._write(()=>{this.el.classList.add("is-spinning");let m=this._nativeSpin;if(m&&m.animations[0].playState!=="finished"&&this._handoffNativeSpin(),this._nativeSpin=void 0,!this._jsSpinning&&l>0){let c=this.value-y,f=Math.min(c,this.value)-1,p=Math.abs(y)+3;if(!this._strip){this._strip=v("span",{className:"digit__strip"}),this._strip.setAttribute("aria-hidden","true");let P=v("span",{className:"digit__viewport"},[this._strip]);this.el.appendChild(P)}let d=Array.from({length:p},(P,E)=>String(((f+E)%this.length+this.length)%this.length)).join(`
`);this._strip.textContent!==d&&(this._strip.textContent=d),this._strip.style.height=this._strip.style.lineHeight=`${l}px`,this._strip.style.transform=`translateX(-50%) translateY(${-(this.value-f)*100}%)`,this.el.classList.add("is-compositor-spinning");let g=me(u)(this._strip,[{transform:`translateX(-50%) translateY(${-(c-f)*100}%)`},{transform:`translateX(-50%) translateY(${-(this.value-f)*100}%)`}]);this.flow._trackAnimation(G(g)),this._nativeSpin={animations:[g],delta:y,timing:{...u}}}else this.el.classList.remove("is-compositor-spinning"),this._jsSpinning=!0,this.flow._animate(this.el,{[C]:[-y,0]},u,this._renderDigits)}),this.flow.addEventListener("animationsfinish",this._onAnimationsFinish,{once:!0})}_handoffNativeSpin(){var i,r;let e=this._nativeSpin;if(e.animations[0].playState!=="finished"){let s=Number((i=e.animations[0].currentTime)!=null?i:0);this._jsSpinning=!0,this.flow._animate(this.el,{[C]:[-e.delta,0]},{...e.timing,delay:((r=e.timing.delay)!=null?r:0)-s},this._renderDigits),e.animations.forEach(a=>a.cancel())}this._nativeSpin=void 0,this.el.classList.remove("is-compositor-spinning"),this._renderDigits()}getDelta(){var r;if(this.flow.plugins)for(let s of this.flow.plugins){let a=(r=s.getDelta)==null?void 0:r.call(s,this.value,this._prevValue,this);if(a!=null)return a}let e=this.value-this._prevValue,i=this.flow.computedTrend||Math.sign(e);return i<0&&this.value>this._prevValue?this.value-this.length-this._prevValue:i>0&&this.value<this._prevValue?this.length-this._prevValue+this.value:e}},ye=class extends se{constructor(e,i,r,s){let a=v("span",{className:"symbol__value",textContent:r});super(e,r,v("span",{part:`symbol ${i}`,className:"symbol"},[a]),s);this.type=i;this._children=new Map;this._onChildRemove=e=>()=>{this._children.delete(e)};this._children.set(r,new z(this.flow,a,{onRemove:this._onChildRemove(r)}))}willUpdate(e){if(this.type==="decimal")return;let i=this.el.getBoundingClientRect();this._prevOffset=i[this.section.justify]-e[this.section.justify]}update(e){if(this.value!==e){let i=this._children.get(this.value);i&&(i.present=!1);let r=this._children.get(e);if(r)r.present=!0;else{let s=v("span",{className:"symbol__value",textContent:e});this.el.appendChild(s),this._children.set(e,new z(this.flow,s,{animateIn:!0,onRemove:this._onChildRemove(e)}))}}this.value=e}didUpdate(e){if(this.type==="decimal")return;let r=this.el.getBoundingClientRect()[this.section.justify]-e[this.section.justify],s=this._prevOffset-r;s&&this.flow._animate(this.el,{transform:[`translateX(${s}px)`,"none"]},{...this.flow.transformTiming,composite:"accumulate"})}};var De=n=>[ce,ue(n),Z];var qe=De(),Ce="number-flow-connect",Fe="number-flow-update",Ze=(n,{locales:t,format:e,numberPrefix:i,numberSuffix:r,nonce:s}={})=>{let a=ee(n,new Intl.NumberFormat(t,e),i,r);return de(a,{nonce:s})},Y=class extends j{constructor(){super(...arguments);this.connected=!1}connectedCallback(){this.connected=!0,this.dispatchEvent(new Event(Ce,{bubbles:!0}))}disconnectedCallback(){super.disconnectedCallback(),this.connected=!1}get value(){return this._value}update(e){(!this._formatter||this._prevFormat!==this.format||this._prevLocales!==this.locales)&&(this._formatter=new Intl.NumberFormat(this.locales,this.format),this._prevFormat=this.format,this._prevLocales=this.locales),e!=null&&(this._value=e),this.dispatchEvent(new Event(Fe,{bubbles:!0})),this.data=ee(this._value,this._formatter,this.numberPrefix,this.numberSuffix)}};Q("number-flow",Y);return Ie(Ge);})();
