 export default function() {
    const ua = navigator.userAgent,
    isWindowsPhone = /(?:Windows Phone)/.test(ua),
    isSymbian = /(?:SymbianOS)/.test(ua) || isWindowsPhone, 
    isAndroid = /(?:Android)/.test(ua), 
    isFireFox = /(?:Firefox)/.test(ua), 
    isTablet = /(?:iPad|PlayBook)/.test(ua) || (isAndroid && !/(?:Mobile)/.test(ua)) || (isFireFox && /(?:Tablet)/.test(ua)),
    isPhone = /(?:iPhone)/.test(ua) && !isTablet,
    isPc = !isPhone && !isAndroid && !isSymbian;
    return {
         isTablet: isTablet,
         isPhone: isPhone,
         isAndroid : isAndroid,
         isPc : isPc
    };
}