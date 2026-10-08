// next-themes는 localStorage의 theme을 읽는다. 두 사이트가 공유하는 tw-theme 쿠키를
// 첫 렌더 전에 옮겨 두어, 다른 사이트에서 바꾼 테마로 바로 그려지게 한다.
export const THEME_COOKIE_SCRIPT =
  "(function(){try{var m=document.cookie.match(/(?:^|;\\s*)tw-theme=([^;]+)/);if(m){localStorage.setItem('theme',decodeURIComponent(m[1]));}}catch(e){}})();"
