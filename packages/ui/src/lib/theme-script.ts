export const THEME_KEY = 'noted.theme';

export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='dark')t='light';document.documentElement.dataset.theme=t}catch(e){}})()`;
