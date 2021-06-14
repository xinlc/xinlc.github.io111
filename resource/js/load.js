// JS 加载到顶部LoadJS
function loadJS(url, fn) {
  var ss = document.getElementsByName('script'),
    loaded = false;
  for (var i = 0, len = ss.length; i < len; i++) {
    if (ss[i].src && ss[i].getAttribute('src') == url) {
      loaded = true;
      break;
    }
  }
  if (loaded) {
    if (fn && typeof fn != 'undefined' && fn instanceof Function)
      fn();
    return false;
  }
  var s = document.createElement('script'),
    b = false;
  s.setAttribute('type', 'text/javascript');
  s.setAttribute('src', url);
  s.onload = s.onreadystatechange = function () {
    if (!b && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {
      b = true;
      if (fn && typeof fn != 'undefined' && fn instanceof Function)
        fn();
    }
  };
  document.getElementsByTagName('head')[0].appendChild(s);
},
bind:
function (objId, eventType, callBack) {  //适用于任何浏览器的绑定
  var obj = document.getElementById(objId);
  if (obj.addEventListener) {
    obj.addEventListener(eventType, callBack, false);
  } else if (window.attachEvent) {
    obj.attachEvent('on' + eventType, callBack);
  } else {
    obj['on' + eventType] = callBack;
  }
}
function JSLoad(args) {
  s = document.createElement("script");
  s.setAttribute("type", "text/javascript");
  s.setAttribute("src", args.url);
  s.onload = s.onreadystatechange = function () {
    if (!s.readyState || s.readyState == "loaded" || s.readyState == "complete") {
      if (typeof args.callback == "function")
        args.callback(this, args);
      s.onload = s.onreadystatechange = null;
      try {
        s.parentNode && s.parentNode.removeChild(s);
      } catch (e) { }
    }
  };
  document.getElementsByTagName("head")[0].appendChild(s);
}


// 清空 LoadJS 加载到顶部的js引用

function ClearHeadJs(src) {
  var js = document.getElementsByTagName('head')[0].children;
  var obj = null;
  for (var i = 0; i < js.length; i++) {
    if (js[i].tagName.toLowerCase() == "script" && js[i].attributes['src'].value.indexOf(src) > 0) {
      obj = js[i];
    }
  }
  document.getElementsByTagName('head')[0].removeChild(obj);
};


// js 动态移除 head 里的 js 引用

var ClearHeadJs = function (src) {
    var js = document.getElementsByTagName('head')[0].children;
    var obj = null;
    for (var i = 0; i < js.length; i++) {
    if (js[i].tagName.toLowerCase() == "script" && js[i].attributes['src'].value.indexOf(src) > 0) {
        obj = js[i];
    }
    }
    document.getElementsByTagName('head')[0].removeChild(obj);
};