/* eslint-disable */
/**
 * browser Util
 * Created by lichao on 16/12/09.
 */

var deviceTypes = ['Android', 'iPhone', 'iPad', 'iPod', 'Windows Phone', 'PC'];

function currentDevice() {
  var userAgentInfo = navigator.userAgent;
  for (var v = 0; v < deviceTypes.length; v++) {
    var i = userAgentInfo.indexOf(deviceTypes[v]);
    if (i > 0) {
      return v;
    }
  }
  return deviceTypes.length - 1;
}

function getInternetExplorerVersion() {
  var rv = 0;
  var ua;
  var re;
  if (!!window.ActiveXObject || 'ActiveXObject' in window) {
    if (navigator.appName == 'Microsoft Internet Explorer') {
      ua = navigator.userAgent;
      re = /MSIE ([0-9]{1,}[\.0-9]{0,})/;
      if (re.exec(ua) !== null) {
        rv = parseFloat(RegExp.$1);
      }
    } else if (navigator.appName == 'Netscape') {
      ua = navigator.userAgent;
      re = /Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/;
      if (re.exec(ua) !== null) {
        rv = parseFloat(RegExp.$1);
      }
    }
  }
  return rv;
}

var sim = false;
try {
  sim = window.parent && window.parent.getOSName;
} catch (err) {

}

var Browser = {
  IE: getInternetExplorerVersion(),
  IE6: (navigator.appVersion.indexOf('MSIE 6.0') != -1 && document.compatMode != 'BackCompat'),
  IE7: (navigator.appVersion.indexOf('MSIE 7.0') != -1 && document.compatMode != 'BackCompat') || (document.compatMode != 'BackCompat' && document.documentMode == 7),
  IE8: (document.compatMode != 'BackCompat' && document.documentMode == 8),
  IE9: (document.compatMode != 'BackCompat' && document.documentMode == 9),
  IE10: (document.compatMode != 'BackCompat' && document.documentMode == 10),
  IE11: (getInternetExplorerVersion() == 11),
  FF: (!window.ActiveXObject && !('ActiveXObject' in window)) && navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') == -1,
  Safari: navigator.userAgent.indexOf('Safari') > 0,
  hasTouch: 'ontouchstart' in window,
  isAndroid: (/android/gi).test(navigator.appVersion),
  isIphone: (/iphone/gi).test(navigator.appVersion),
  isIpad: (/ipad/gi).test(navigator.appVersion),
  deviceType: deviceTypes[currentDevice()],
  isSimulator: sim,
  isWeChat: navigator.userAgent.indexOf('MicroMessenger') >= 0,
  isPCFromUserAgent: deviceTypes[currentDevice()] === 'PC',
  isMobileFromUserAgent: (deviceTypes[currentDevice()] === 'Android') || (deviceTypes[currentDevice()] === 'iPhone') || (deviceTypes[currentDevice()] === 'Windows Phone'),
  isIOS: (deviceTypes[currentDevice()] === 'iPad') || (deviceTypes[currentDevice()] === 'iPod') || (deviceTypes[currentDevice()] === 'iPhone')
};

// 获得当前浏览器JS的版本
Browser.getJsVersion = function (){    
    var n = navigator;    
    var u = n.userAgent;    
    var apn = n.appName;   
    var v = n.appVersion;    
    var ie = v.indexOf('MSIE ');    
    if (ie > 0){
        apv = parseInt(i = v.substring(ie + 5));        
        if (apv > 3) {
            apv = parseFloat(i);
        }
    } else {
        apv = parseFloat(v);
    }
    var isie = (apn == 'Microsoft Internet Explorer');    
    var ismac = (u.indexOf('Mac') >= 0);    
    var javascriptVersion = "1.0";    
    if (String && String.prototype) {
        javascriptVersion = '1.1';        
        if (javascriptVersion.match) {
            javascriptVersion = '1.2';            
            var tm = new Date;            
            if (tm.setUTCDate) {
                javascriptVersion = '1.3';                
                if (isie && ismac && apv >= 5) 
                javascriptVersion = '1.4';                
                var pn = 0;                
                if (pn.toPrecision) {
                    javascriptVersion = '1.5';
                    a = new Array;                    
                    if (a.forEach) {
                        javascriptVersion = '1.6';
                        i = 0;
                        o = new Object;
                        tcf = new Function('o', 'var e,i=0;try{i=new Iterator(o)}catch(e){}return i');
                        i = tcf(o);                        
                        if (i && i.next) {
                            javascriptVersion = '1.7';
                        }
                    }
                }
            }
        }
    }    
    return javascriptVersion;
}

export default Browser;
