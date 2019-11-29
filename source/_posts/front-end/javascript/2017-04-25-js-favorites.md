---
layout: post
title: "JavaScript 常用代码片段"
date: 2017-04-25 10:00:00 +0800
categories: JavaScript
tags:
  - js
---

# JavaScript 常用代码片段

---

## document ready

```js
const ready = function() {
  // ...
};
const completed = function() {
  document.removeEventListener("DOMContentLoaded", completed);
  window.removeEventListener("load", completed);
  ready();
};

if (
  document.readyState === "complete" ||
  (document.readyState !== "loading" && !document.documentElement.doScroll)
) {
  // Handle it asynchronously to allow scripts the opportunity to delay ready
  window.setTimeout(ready);
} else {
  // Use the handy event callback
  document.addEventListener("DOMContentLoaded", completed);
  // A fallback to window.onload, that will always work
  window.addEventListener("load", completed);
}
```

<!--more-->

## HTML5 图片压缩 或使用[localResizeIMG](https://github.com/think2011/localResizeIMG)

```js
const image = new Image();
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const file = files[0].file;
const reader = new FileReader(); // 读取客户端上的文件
reader.onload = function() {
  const url = reader.result; // 读取到的文件内容.这个属性只在读取操作完成之后才有效,并且数据的格式取决于读取操作是由哪个方法发起的.所以必须使用reader.onload，
  image.src = url; // reader读取的文件内容是base64,利用这个url就能实现上传前预览图片
};

image.onload = function() {
  var w = image.naturalWidth,
    h = image.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(image, 0, 0, w, h, 0, 0, w, h);
  var adata = canvas.toDataURL("image/jpeg", 0.1);
  console.log(adata.length);
};
reader.readAsDataURL(file);
```

## js 获取 search 参数

```js
window.getUrlParam = function(name) {
  var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
  var r = window.location.search.substr(1).match(reg); //匹配目标参数
  if (r != null) return decodeURI(r[2]);
  return null; //返回参数值
};

const getUrlParameters = url =>
  url
    .match(/([^?=&]+)(=([^&]*))/g)
    .reduce(
      (a, v) => (
        (a[v.slice(0, v.indexOf("="))] = v.slice(v.indexOf("=") + 1)), a
      ),
      {}
    );
// getUrlParameters('http://url.com/page?name=Adam&surname=Smith') -> {name: 'Adam', surname: 'Smith'}
```

## 获得 URL 中 GET 参数值

```js
// 用法：如果地址是 test.htm?t1=1&t2=2&t3=3, 那么能取得：GET["t1"], GET["t2"], GET["t3"]
function get_get() {
  querystr = window.location.href.split("?");
  if (querystr[1]) {
    GETs = querystr[1].split("&");
    GET = [];
    for (i = 0; i < GETs.length; i++) {
      tmp_arr = GETs.split("=");
      key = tmp_arr[0];
      GET[key] = tmp_arr[1];
    }
  }
  return querystr[1];
}
```

## 阻止事件冒泡

[return false](http://stackoverflow.com/questions/1357118/event-preventdefault-vs-return-false)

```js
// event.preventDefault()会阻挡预设要发生的事件.
// event.stopPropagation()会阻挡发生冒泡事件.
// 而return false则是前面两者的事情他都会做：
// 他会做event.preventDefault();
// 他会做event.stopPropagation();
// 停止callback function的执行并且立即return回来
```

## js 自定义事件 [参考](http://www.zhangxinxu.com/wordpress/2012/04/js-dom自定义事件/)

```js
/**
 * 自定义dom 事件
 * EventUtil  全局接口
 * addEvent
 * fireEvent
 * removeEvent
 * Created by lichao on 17/03/30.
 */

// Polyfill CustomEvent
(function() {
  if (typeof window.CustomEvent === "function") return false;

  function CustomEvent(event, params) {
    params = params || {
      bubbles: false,
      cancelable: false,
      detail: undefined
    };
    let evt = document.createEvent("CustomEvent");
    evt.initCustomEvent(
      event,
      params.bubbles,
      params.cancelable,
      params.detail
    );
    return evt;
  }

  CustomEvent.prototype = window.Event.prototype;

  window.CustomEvent = CustomEvent;
})();

// Event
const Event = function(el) {
  return new _Event(el);
};

const _Event = function(el) {
  this.el = el && el.nodeType == 1 ? el : document;
};

_Event.prototype = {
  constructor: this,
  addEvent: function(type, fn, capture) {
    this.el.addEventListener(type, fn, capture);
    return this;
  },
  fireEvent: function(type) {
    const ev = new CustomEvent(type);
    this.el.dispatchEvent(ev);
    return this;
  },
  removeEvent: function(type, fn, capture) {
    this.el.removeEventListener(type, fn, capture || false);
    return this;
  }
};

// window.EventUtil = Event; // 全局接口
export default Event;
```

## js 高精度计算

建议使用[decimal.js](https://github.com/MikeMcl/decimal.js)

```js
//除法函数，用来得到精确的除法结果
//说明：javascript的除法结果会有误差，在两个浮点数相除的时候会比较明显。这个函数返回较为精确的除法结果。
//调用：accDiv(arg1,arg2)
//返回值：arg1除以arg2的精确结果

function accDiv(arg1, arg2) {
  var t1 = 0,
    t2 = 0,
    r1,
    r2;
  try {
    t1 = arg1.toString().split(".")[1].length;
  } catch (e) {}
  try {
    t2 = arg2.toString().split(".")[1].length;
  } catch (e) {}
  with (Math) {
    r1 = Number(arg1.toString().replace(".", ""));
    r2 = Number(arg2.toString().replace(".", ""));
    return (r1 / r2) * pow(10, t2 - t1);
  }
}
//给Number类型增加一个div方法，调用起来更加方便。
Number.prototype.div = function(arg) {
  return accDiv(this, arg);
};

//乘法函数，用来得到精确的乘法结果
//说明：javascript的乘法结果会有误差，在两个浮点数相乘的时候会比较明显。这个函数返回较为精确的乘法结果。
//调用：accMul(arg1,arg2)
//返回值：arg1乘以arg2的精确结果

function accMul(arg1, arg2) {
  var m = 0,
    s1 = arg1.toString(),
    s2 = arg2.toString();
  try {
    m += s1.split(".")[1].length;
  } catch (e) {}
  try {
    m += s2.split(".")[1].length;
  } catch (e) {}
  return (
    (Number(s1.replace(".", "")) * Number(s2.replace(".", ""))) /
    Math.pow(10, m)
  );
}
//给Number类型增加一个mul方法，调用起来更加方便。
Number.prototype.mul = function(arg) {
  return accMul(arg, this);
};

//加法函数，用来得到精确的加法结果
//说明：javascript的加法结果会有误差，在两个浮点数相加的时候会比较明显。这个函数返回较为精确的加法结果。
//调用：accAdd(arg1,arg2)
//返回值：arg1加上arg2的精确结果

function accAdd(arg1, arg2) {
  var r1, r2, m;
  try {
    r1 = arg1.toString().split(".")[1].length;
  } catch (e) {
    r1 = 0;
  }
  try {
    r2 = arg2.toString().split(".")[1].length;
  } catch (e) {
    r2 = 0;
  }
  m = Math.pow(10, Math.max(r1, r2));
  return (arg1 * m + arg2 * m) / m;
}
//给Number类型增加一个add方法，调用起来更加方便。
Number.prototype.add = function(arg) {
  return accAdd(arg, this);
};

//在你要用的地方包含这些函数，然后调用它来计算就可以了。
//比如你要计算：7*0.8 ，则改成 (7).mul(8)
//其它运算类似，就可以得到比较精确的结果。

//减法函数
function Subtr(arg1, arg2) {
  var r1, r2, m, n;
  try {
    r1 = arg1.toString().split(".")[1].length;
  } catch (e) {
    r1 = 0;
  }
  try {
    r2 = arg2.toString().split(".")[1].length;
  } catch (e) {
    r2 = 0;
  }
  m = Math.pow(10, Math.max(r1, r2));
  //last modify by deeka
  //动态控制精度长度
  n = r1 >= r2 ? r1 : r2;
  return ((arg1 * m - arg2 * m) / m).toFixed(n);
}
```

## 根据生日计算星座

```js
/**
 * Leo：根据生日计算星座
 * @param  {[type]} birthday [description]
 * @return {[type]}          [description]
 */
Utils.calConstellation = birthday => {
  if (birthday == null || birthday == "") {
    return "";
  }
  const date = new Date(birthday); // new Date(String(birthday).replace(/\-/g,'/'));
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const s =
    "魔羯座水瓶座双鱼座牡羊座金牛座双子座巨蟹座狮子座处女座天秤座天蝎座射手座魔羯座";
  const arr = [20, 19, 21, 21, 21, 22, 23, 23, 23, 23, 22, 22];
  return s.substr(month * 3 - (day < arr[month - 1] ? 3 : 0), 3);
};
```

## 计算年龄

```js
Utils.calAge = birthday => {
  let age = 0;
  if (birthday) {
    const aDate = new Date();
    const thisYear = aDate.getFullYear();
    const thisMonth = aDate.getMonth() + 1;
    const thisDay = aDate.getDate();
    const brith = new Date(birthday); // new Date(String(birthday).replace(/\-/g,'/'));
    const brithy = brith.getFullYear();
    const brithm = brith.getMonth() + 1;
    const brithd = brith.getDate();
    if (thisYear - brithy > 0) {
      if (thisMonth - brithm > 0) {
        age = thisYear - brithy;
      } else if (thisMonth - brithm < 0) {
        age = thisYear - brithy - 1;
      } else if (thisDay - brithd >= 0) {
        age = thisYear - brithy;
      } else {
        age = thisYear - brithy - 1;
      }
    }
  }
  return String(age);
};
```

## 格式化 Date ([建议使用 moment](https://github.com/moment/moment/))

```js
/**
 * @param  {Date} date
 * @param  {String} fmt
 * @return {String}
 */
Utils.dateFormat = (date, fmt = "yyyy-MM-dd") => {
  if (Object.prototype.toString.call(date) === "[object String]") {
    if (date.indexOf("-") != -1) {
      // 为了兼容ios 日期必须把 yyyy-mm-dd 转换为 yyyy/mm/dd
      date = date.replace(/\-/g, "/"); // eslint-disable-line
      if (date.lastIndexOf(".") != -1) {
        // 去掉毫秒
        date = date.substring(0, date.lastIndexOf("."));
      }
    }
  }
  if (Object.prototype.toString.call(date) !== "[object Date]") {
    date = new Date(date);
  }
  const o = {
    "M+": date.getMonth() + 1, // 月份
    "d+": date.getDate(), // 日
    "h+": date.getHours(), // 小时
    "m+": date.getMinutes(), // 分
    "s+": date.getSeconds(), // 秒
    "q+": Math.floor((date.getMonth() + 3) / 3), // 季度
    S: date.getMilliseconds() // 毫秒
  };
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(
      RegExp.$1,
      `${date.getFullYear()}`.substr(4 - RegExp.$1.length)
    );
  }
  for (const k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? o[k] : `00${o[k]}`.substr(`${o[k]}`.length)
      );
    }
  }
  return fmt;
};
```

## Date diff

```js
/**
 * @param {String} strInterval {y|m|w|d|h|n|s}
 * @param {String|Date} dtStart
 * @param {String|Date} dtEnd
 */
Utils.dateDiff = (strInterval, start, end) => {
  const toDate = date => {
    if (Object.prototype.toString.call(date) === "[object String]") {
      if (date.indexOf("-") != -1) {
        // 为了兼容ios 日期必须把 yyyy-mm-dd 转换为 yyyy/mm/dd
        date = date.replace(/\-/g, "/"); // eslint-disable-line
        if (date.lastIndexOf(".") != -1) {
          // 去掉毫秒
          date = date.substring(0, date.lastIndexOf("."));
        }
      }
    }
    if (Object.prototype.toString.call(date) !== "[object Date]") {
      date = new Date(date);
    }
    return date;
  };

  const dtStart = toDate(start);
  const dtEnd = toDate(end);

  switch (strInterval) {
    case "s":
      return parseInt((dtEnd - dtStart) / 1000);
    case "n":
      return parseInt((dtEnd - dtStart) / 60000);
    case "h":
      return parseInt((dtEnd - dtStart) / 3600000);
    case "d":
      return parseInt((dtEnd - dtStart) / 86400000);
    case "w":
      return parseInt((dtEnd - dtStart) / (86400000 * 7));
    case "m":
      return (
        dtEnd.getMonth() +
        1 +
        (dtEnd.getFullYear() - dtStart.getFullYear()) * 12 -
        (dtStart.getMonth() + 1)
      );
    // return dtEnd.getMonth() - dtStart.getMonth();
    case "y":
      return dtEnd.getFullYear() - dtStart.getFullYear();
    default:
      return null;
  }
};
```

## 截取字符串并支持`emoji`

```js
// 支持4个字节 emoji
Utils.StringToArray = function (str) {
  let index = 0;
  const length = str.length;
  const output = [];
  while (index < length) {
    const charCode = str.charCodeAt(index);
    const character = str.charAt(index);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      output.push(character + str.charAt(++index));
    } else {
      output.push(character);
    }
    index++;
  }
  return output;
};

Utils.limitStr = (str = '', length) => {
  str = str.trim().replace('\n', '');
  const arr = Utils.StringToArray(str);
  return arr.length > length ? `${arr.splice(0, length).join('')}...` : str;
}

// 另一种
function cutstr(str, len) {
    var temp,
        icount = 0,
        patrn = /[^\x00-\xff]/，
        strre = "";
    for (var i = 0; i < str.length; i++) {
        if (icount < len - 1) {
            temp = str.substr(i, 1);
                if (patrn.exec(temp) == null) {
                   icount = icount + 1
            } else {
                icount = icount + 2
            }
            strre += temp
            } else {
            break;
        }
    }
    return strre + "..."
}
```

## 生成 UUID

```js
Utils.generateUUID = () => {
  let d = new Date().getTime();
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (d + Math.random() * 16) % 16 | 0; // eslint-disable-line
    d = Math.floor(d / 16);
    return (c == "x" ? r : (r & 0x7) | 0x8).toString(16); // eslint-disable-line
  });
  return uuid;
};
```

## 生成 4 位 id

```js
var id = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
```

## js 对象深拷贝

```js
Utils.deepCopy = (p, _c) => {
  const c = _c || {};
  for (const i in p) {
    if (!p.hasOwnProperty(i)) {
      // eslint-disable-line
      continue; // eslint-disable-line
    }
    if (typeof p[i] === "object") {
      c[i] = p[i].constructor === Array ? [] : {};
      Utils.deepCopy(p[i], c[i]);
    } else {
      c[i] = p[i];
    }
  }
  return c;
};
```

## 返回指定范围的随机数(m-n 之间)的公式

```js
console.log(Math.random() * (n - m) + m);

const randomInRange = (min, max) => Math.random() * (max - min) + min;
// randomInRange(2,10) -> 6.0211363285087005

const randomIntegerInRange = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
// randomIntegerInRange(0, 5) -> 2
```

## 随机数时间戳

```js
function uniqueId() {
  var a = Math.random,
    b = parseInt;
  return (
    Number(new Date()).toString() + b(10 * a()) + b(10 * a()) + b(10 * a())
  );
}
```

## 防止被 Iframe 嵌套

```js
if (top != self) {
  location.href = "about:blank";
}
```

## [iOS，Safari 浏览器，input 等表单 focus 后 fixed 元素错位问题](https://www.snip2code.com/Snippet/176582/--iOS-Safari----input---focus-fixed-----)

```js
if (/iPhone|iPod|iPad/i.test(navigator.userAgent)) {
  $(document).on("focus", "input, textarea", function() {
    $("header").css("position", "absolute");
    $("footer").css("position", "absolute");
  });

  $(document).on("blur", "input, textarea", function() {
    $("header").css("position", "fixed");
    $("footer").css("position", "fixed");
  });
}
```

## 得到地理位置

```js
function getLocation(callback) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(p) {
        callback(p.coords.latitude, p.coords.longitude);
      },
      function(e) {
        var msg = e.code + "\n" + e.message;
      }
    );
  }
}
```

## 获取 js 所在路径

```js
function getJsDir(src) {
  var script = null;
  if (src) {
    script = [].filter.call(document.scripts, function(v) {
      return v.src.indexOf(src) !== -1;
    })[0];
  } else {
    script = document.scripts[document.scripts.length - 1];
  }
  return script ? script.src.substr(0, script.src.lastIndexOf("/")) : script;
}
```

## 从全局捕获错误

```js
window.onerror = function(
  errMsg,
  scriptURI,
  lineNumber,
  columnNumber,
  errorObj
) {
  setTimeout(function() {
    var rst = {
      "错误信息：": errMsg,
      "出错文件：": scriptURI,
      "出错行号：": lineNumber,
      "出错列号：": columnNumber,
      "错误详情：": errorObj
    };

    alert(JSON.stringify(rst, null, 10));
  });
};
```

## 转义 html 标签

```js
function HtmlEncode(text) {
  return text
    .replace(/&/g, "&")
    .replace(/\"/g, '"')
    .replace(/</g, "<")
    .replace(/>/g, ">");
}
```

## cookie 操作

```js
// 设置cookie值
function setCookie(name, value, Hours) {
  var d = new Date();
  var offset = 8;
  var utc = d.getTime() + d.getTimezoneOffset() * 60000;
  var nd = utc + 3600000 * offset;
  var exp = new Date(nd);
  exp.setTime(exp.getTime() + Hours * 60 * 60 * 1000);
  document.cookie =
    name +
    "=" +
    escape(value) +
    ";path=/;expires=" +
    exp.toGMTString() +
    ";domain=360doc.com;";
}

//获取cookie值
function getCookie(name) {
  var arr = document.cookie.match(new RegExp("(^| )" + name + "=([^;]*)(;|$)"));
  if (arr != null) return unescape(arr[2]);
  return null;
}
```

## 加载样式文件表

```js
function LoadStyle(url) {
  try {
    document.createStyleSheet(url);
  } catch (e) {
    var cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.type = "text/css";
    cssLink.href = url;
    var head = document.getElementsByTagName("head")[0];
    head.appendChild(cssLink);
  }
}
```

## 返回脚本内容

```js
function evalscript(s) {
  if (s.indexOf("<script") == -1) return s;
  var p = /<script[^\>]*?>([^\x00]*?)<\/script>/gi;
  var arr = [];
  while ((arr = p.exec(s))) {
    var p1 = /<script[^\>]*?src=\"([^\>]*?)\"[^\>]*?(reload=\"1\")?(?:charset=\"([\w\-]+?)\")?><\/script>/i;
    var arr1 = [];
    arr1 = p1.exec(arr[0]);
    if (arr1) {
      appendscript(arr1[1], "", arr1[2], arr1[3]);
    } else {
      p1 = /<script(.*?)>([^\x00]+?)<\/script>/i;
      arr1 = p1.exec(arr[0]);
      appendscript("", arr1[2], arr1[1].indexOf("reload=") != -1);
    }
  }
  return s;
}
```

## 清除脚本内容

```js
function stripscript(s) {
  return s.replace(/<script.*?>.*?<\/script>/gi, "");
}
```

## 动态加载脚本文件

```js
function appendscript(src, text, reload, charset) {
  var id = hash(src + text);
  if (!reload && in_array(id, evalscripts)) return;
  if (reload && $(id)) {
    $(id).parentNode.removeChild($(id));
  }

  evalscripts.push(id);
  var scriptNode = document.createElement("script");
  scriptNode.type = "text/javascript";
  scriptNode.id = id;
  scriptNode.charset = charset
    ? charset
    : BROWSER.firefox
    ? document.characterSet
    : document.charset;
  try {
    if (src) {
      scriptNode.src = src;
      scriptNode.onloadDone = false;
      scriptNode.onload = function() {
        scriptNode.onloadDone = true;
        JSLOADED[src] = 1;
      };
      scriptNode.onreadystatechange = function() {
        if (
          (scriptNode.readyState == "loaded" ||
            scriptNode.readyState == "complete") &&
          !scriptNode.onloadDone
        ) {
          scriptNode.onloadDone = true;
          JSLOADED[src] = 1;
        }
      };
    } else if (text) {
      scriptNode.text = text;
    }
    document.getElementsByTagName("head")[0].appendChild(scriptNode);
  } catch (e) {}
}
```

## 检验 URL 链接是否有效

```js
function getUrlState(URL) {
  var xmlhttp = new ActiveXObject("microsoft.xmlhttp");
  xmlhttp.Open("GET", URL, false);
  try {
    xmlhttp.Send();
  } catch (e) {
  } finally {
    var result = xmlhttp.responseText;
    if (result) {
      if (xmlhttp.Status == 200) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
}
```

## 获取页面高度

```js
// 获取页面高度
function getPageHeight() {
  var g = document,
    a = g.body,
    f = g.documentElement,
    d = g.compatMode == "BackCompat" ? a : g.documentElement;
  return Math.max(f.scrollHeight, a.scrollHeight, d.clientHeight);
}

//获取页面可视宽度
function getPageViewWidth() {
  var d = document,
    a = d.compatMode == "BackCompat" ? d.body : d.documentElement;
  return a.clientWidth;
}

//获取页面宽度
function getPageWidth() {
  var g = document,
    a = g.body,
    f = g.documentElement,
    d = g.compatMode == "BackCompat" ? a : g.documentElement;
  return Math.max(f.scrollWidth, a.scrollWidth, d.clientWidth);
}
```

## 返回顶部的通用方法

```js
function backTop(btnId) {
  var btn = document.getElementById(btnId);
  var d = document.documentElement;
  var b = document.body;
  window.onscroll = set;
  btn.style.display = "none";
  btn.onclick = function() {
    btn.style.display = "none";
    window.onscroll = null;
    this.timer = setInterval(function() {
      d.scrollTop -= Math.ceil((d.scrollTop + b.scrollTop) * 0.1);
      b.scrollTop -= Math.ceil((d.scrollTop + b.scrollTop) * 0.1);
      if (d.scrollTop + b.scrollTop == 0)
        clearInterval(btn.timer, (window.onscroll = set));
    }, 10);
  };
  function set() {
    btn.style.display = d.scrollTop + b.scrollTop > 100 ? "block" : "none";
  }
}
backTop("goTop");
```

## 数组去重

```js
String.prototype.unique = function() {
  var x = this.split(/[\r\n]+/);
  var y = "";
  for (var i = 0; i < x.length; i++) {
    if (
      !new RegExp("^" + x.replace(/([^\w])/gi, "\\$1") + "$", "igm").test(y)
    ) {
      y += x + "\r\n";
    }
  }
  return y;
};

const unique = arr => [...new Set(arr)];
// unique([1,2,2,3,4,4,5]) -> [1,2,3,4,5]
```

## 按字典顺序，对每行进行数组排序

```js
function SetSort() {
  var text = K1.value
    .split(/[\r\n]/)
    .sort()
    .join("\r\n"); //顺序
  var test = K1.value
    .split(/[\r\n]/)
    .sort()
    .reverse()
    .join("\r\n"); //反序
  K1.value = K1.value != text ? text : test;
}
```

## 字符串反序输出

```js
function IsReverse(text) {
  return text
    .split("")
    .reverse()
    .join("");
}
```

## 金额大写转换函数

```js
//格式转换
function transform(tranvalue) {
  try {
    var i = 1;
    var dw2 = new Array("", "万", "亿"); //大单位
    var dw1 = new Array("拾", "佰", "仟"); //小单位
    var dw = new Array(
      "零",
      "壹",
      "贰",
      "叁",
      "肆",
      "伍",
      "陆",
      "柒",
      "捌",
      "玖"
    ); //整数部分用
    //以下是小写转换成大写显示在合计大写的文本框中
    //分离整数与小数
    var source = splits(tranvalue);
    var num = source[0];
    var dig = source[1];
    //转换整数部分
    var k1 = 0; //计小单位
    var k2 = 0; //计大单位
    var sum = 0;
    var str = "";
    var len = source[0].length; //整数的长度
    for (i = 1; i <= len; i++) {
      var n = source[0].charAt(len - i); //取得某个位数上的数字
      var bn = 0;
      if (len - i - 1 >= 0) {
        bn = source[0].charAt(len - i - 1); //取得某个位数前一位上的数字
      }
      sum = sum + Number(n);
      if (sum != 0) {
        str = dw[Number(n)].concat(str); //取得该数字对应的大写数字，并插入到str字符串的前面
        if (n == "0") sum = 0;
      }
      if (len - i - 1 >= 0) {
        //在数字范围内
        if (k1 != 3) {
          //加小单位
          if (bn != 0) {
            str = dw1[k1].concat(str);
          }
          k1++;
        } else {
          //不加小单位，加大单位
          k1 = 0;
          var temp = str.charAt(0);
          if (temp == "万" || temp == "亿")
            //若大单位前没有数字则舍去大单位
            str = str.substr(1, str.length - 1);
          str = dw2[k2].concat(str);
          sum = 0;
        }
      }
      if (k1 == 3) {
        //小单位到千则大单位进一
        k2++;
      }
    }
    //转换小数部分
    var strdig = "";
    if (dig != "") {
      var n = dig.charAt(0);
      if (n != 0) {
        strdig += dw[Number(n)] + "角"; //加数字
      }
      var n = dig.charAt(1);
      if (n != 0) {
        strdig += dw[Number(n)] + "分"; //加数字
      }
    }
    str += "元" + strdig;
  } catch (e) {
    return "0元";
  }
  return str;
}
//拆分整数与小数
function splits(tranvalue) {
  var value = new Array("", "");
  temp = tranvalue.split(".");
  for (var i = 0; i < temp.length; i++) {
    value = temp;
  }
  return value;
}
```

## HTML5 全屏

```js
function fullscreen(element) {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}
fullscreen(document.documentElement);
```

## js 获取验证码倒计时效果

```js
function getCode(obj, n) {
  var t = obj.value;
  (function() {
    if (n > 0) {
      obj.disabled = true;
      obj.value = "倒计时" + n-- + "秒";
      setTimeout(arguments.callee, 1000);
    } else {
      obj.disabled = false;
      obj.value = t;
    }
  })();
}
```

## 加入收藏夹代码

```js
<script type="text/javascript">
function AddFavorite(sURL,sTitle){
    try{
        window.external.addFavorite(sURL, sTitle);
    }catch (e){
        try{
            window.sidebar.addPanel(sTitle, sURL, "");
        }catch (e){
            alert("加入收藏失败，请使用Ctrl+D进行添加");
        }
    }
}
</script>
<a href=”javascript:favorite(‘李刚的学习专栏’,’http://blog.csdn.net/ligang2585116’)”>加入收藏</a>
```

## js 绑定事件 适用于任何浏览器的元素绑定

```js
function eventBind(obj, eventType, callBack) {
  if (obj.addEventListener) {
    obj.addEventListener(eventType, callBack, false);
  } else if (window.attachEvent) {
    obj.attachEvent("on" + eventType, callBack);
  } else {
    obj["on" + eventType] = callBack;
  }
}
eventBind(document, "click", bodyClick);

// 移除事件
this.moveBind = function(objId, eventType, callBack) {
  var obj = document.getElementById(objId);
  if (obj.removeEventListener) {
    obj.removeEventListener(eventType, callBack, false);
  } else if (window.detachEvent) {
    obj.detachEvent("on" + eventType, callBack);
  } else {
    obj["on" + eventType] = null;
  }
};
```

## 获取当前点击事件的 Object 对象

```js
function getEvent() {
  if (document.all) {
    return window.event; //如果是ie
  }
  func = getEvent.caller;
  while (func != null) {
    var arg0 = func.arguments[0];
    if (arg0) {
      if (
        arg0.constructor == Event ||
        arg0.constructor == MouseEvent ||
        (typeof arg0 == "object" && arg0.preventDefault && arg0.stopPropagation)
      ) {
        return arg0;
      }
    }
    func = func.caller;
  }
  return null;
}
```

## 按 Ctrl + Entert 直接提交表单

```js
document.body.onkeydown = function(evt) {
  evt = evt ? evt : window.event ? window.event : null;
  if (13 == evt.keyCode && evt.ctrlKey) {
    evt.returnValue = false;
    evt.cancel = true;
    PostData();
  }
};
```

## JS 弹出新窗口全屏

```js
var tmp = window.open("about:blank", "", "fullscreen=1");
tmp.moveTo(0, 0);
tmp.resizeTo(screen.width + 20, screen.height);
tmp.focus();
tmp.location.href =
  "http://www.che168.com/pinggu/eva_" + msgResult.message[0] + ".html";
var config_ =
  "left=0,top=0,width=" +
  window.screen.Width +
  ",height=" +
  window.screen.Height;
window.open(
  "http://www.che168.com/pinggu/eva_" + msgResult.message[0] + ".html",
  "winHanle",
  config_
);
//模拟form提交打开新页面
var f = document.createElement("form");
f.setAttribute(
  "action",
  "http://www.che168.com/pinggu/eva_" + msgResult.message[0] + ".html"
);
f.target = "_blank";
document.body.appendChild(f);
f.submit();
```

## JS 继承的实现方式 [参考](http://www.cnblogs.com/humin/p/4556820.html)

```js
// 定义一个动物类
function Animal(name) {
  // 属性
  this.name = name || "Animal";
  // 实例方法
  this.sleep = function() {
    console.log(this.name + "正在睡觉！");
  };
}
// 原型方法
Animal.prototype.eat = function(food) {
  console.log(this.name + "正在吃：" + food);
};

// 1. 原型链继承
function Cat() {}
Cat.prototype = new Animal();
Cat.prototype.name = "cat";

//　Test Code
var cat = new Cat();
console.log(cat.name);
console.log(cat.eat("fish"));
console.log(cat.sleep());
console.log(cat instanceof Animal); //true
console.log(cat instanceof Cat); //true

// 2.构造继承
function Cat(name) {
  Animal.call(this);
  this.name = name || "Tom";
}

// Test Code
var cat = new Cat();
console.log(cat.name);
console.log(cat.sleep());
console.log(cat instanceof Animal); // false
console.log(cat instanceof Cat); // true

// 3.寄生组合继承
function Cat(name) {
  Animal.call(this);
  this.name = name || "Tom";
}
(function() {
  // 创建一个没有实例方法的类
  var Super = function() {};
  Super.prototype = Animal.prototype;
  //将实例作为子类的原型
  Cat.prototype = new Super();
})();

// Test Code
var cat = new Cat();
console.log(cat.name);
console.log(cat.sleep());
console.log(cat instanceof Animal); // true
console.log(cat instanceof Cat); //true
```

## H5 页检测手机是否安装 app 相关流程 [参考](https://segmentfault.com/a/1190000009123583)

```js
export const openApp = function(openUrl, callback) {
  //检查app是否打开
  function checkOpen(cb) {
    var _clickTime = +new Date();
    function check(elsTime) {
      if (elsTime > 3000 || document.hidden || document.webkitHidden) {
        cb(1);
      } else {
        cb(0);
      }
    }
    //启动间隔20ms运行的定时器，并检测累计消耗时间是否超过3000ms，超过则结束
    var _count = 0,
      intHandle;
    intHandle = setInterval(function() {
      _count++;
      var elsTime = +new Date() - _clickTime;
      if (_count >= 100 || elsTime > 3000) {
        clearInterval(intHandle);
        check(elsTime);
      }
    }, 20);
  }

  //在iframe 中打开APP
  var ifr = document.createElement("iframe");
  ifr.src = openUrl;
  ifr.style.display = "none";

  if (callback) {
    //客户端检测微信直接跳应用宝链接
    var browser = BrowserInfo();
    //使用微链接
    var encodeUri = encodeURIComponent(openUrl);

    if (browser.isWeixin) {
      window.location.href = "你的微链url&android_schema=" + encodeUri;
    } else {
      checkOpen(function(opened) {
        callback && callback(opened);
      });
    }
  }

  document.body.appendChild(ifr);
  setTimeout(function() {
    document.body.removeChild(ifr);
  }, 2000);
};
```

## 获取滚动位置

如果已定义，请使用 pageXOffset 和 pageYOffset，否则使用 scrollLeft 和 scrollTop，可以省略 el 来使用 window 的默认值。

```js
const getScrollPos = (el = window) => ({
  x: el.pageXOffset !== undefined ? el.pageXOffset : el.scrollLeft,
  y: el.pageYOffset !== undefined ? el.pageYOffset : el.scrollTop
});
// getScrollPos() -> {x: 0, y: 200}
```

## 滚动到顶部

使用 document.documentElement.scrollTop 或 document.body.scrollTop 获取到顶部的距离。
从顶部滚动一小部分距离。
使用 window.requestAnimationFrame（）来滚动。

```js
const scrollToTop = _ => {
  const c = document.documentElement.scrollTop || document.body.scrollTop;
  if (c > 0) {
    window.requestAnimationFrame(scrollToTop);
    window.scrollTo(0, c - c / 8);
  }
};
// scrollToTop()
```

## [柯里化函数](https://segmentfault.com/a/1190000008263193)

```js
var curring = function(fn) {
  var _args = [];
  return function cb() {
    if (arguments.length === 0) {
      return fn.apply(this, _args);
    }
    Array.prototype.push.apply(_args, [].slice.call(arguments));

    return cb;
  };
};

var multi = function() {
  var total = 0;
  var argsArray = Array.prototype.slice.call(arguments);
  argsArray.forEach(function(item) {
    total += item;
  });
  return total;
};

var calc = curring(multi);

calc(1, 2)(3)(4, 5, 6);
console.log(calc()); //空白调用时才真正计算
```

## js 判断是否含有 emoij

```js
function isEmojiCharacter(substring) {

  for (var i = 0; i < substring.length; i++) {
    var hs = substring.charCodeAt(i);
    if (0xd800 <= hs && hs <= 0xdbff) {
      if (substring.length > 1) {
        var ls = substring.charCodeAt(i + 1);
        var uc = ((hs - 0xd800) * 0x400) + (ls - 0xdc00) + 0x10000;
        if (0x1d000 <= uc && uc <= 0x1f77f) {
          return true;
        }
      }
    } else if (substring.length > 1) {
      var ls = substring.charCodeAt(i + 1);
      if (ls == 0x20e3) {
        return true;
      }
    } else {
      if (0x2100 <= hs && hs <= 0x27ff) {
        return true;
      } else if (0x2B05 <= hs && hs <= 0x2b07) {
        return true;
      } else if (0x2934 <= hs && hs <= 0x2935) {
        return true;
      } else if (0x3297 <= hs && hs <= 0x3299) {
        return true;
      } else if (hs == 0xa9 || hs == 0xae || hs == 0x303d || hs == 0x3030 || hs == 0x2b55 || hs == 0x2b1c || hs == 0x2b1b || hs == 0x2b50) {
        return true;
      }
    }
  }
}

// 过滤掉表情：
function filteremoji() {
  var ranges = ['\ud83c[\udf00-\udfff]', '\ud83d[\udc00-\ude4f]', '\ud83d[\ude80-\udeff]'];
  var emojireg = $("#emoji_input").val();
  emojireg = emojireg.replace(new RegExp(ranges.join('|'), 'g'), ''));
}
```

## 树状结构转 list

```js
// 把树状结构转list， value => key
Utils.option2remap = (options, prefix) => {
  const _map = {};
  for (let i = 0; i < options.length; i++) {
    if (typeof options[i] == "object") {
      _map[(prefix || "") + options[i].label] = options[i].value;
      if (options[i].children) {
        let _prefix = prefix || "";
        if (options[i].label.indexOf("省") === -1)
          _prefix += `${options[i].label}$`;
        const _childMap = Utils.option2remap(options[i].children, _prefix);
        Object.assign(_map, _childMap);
      }
    }
  }
  return _map;
};

// 把树状结构转list
Utils.option2map = (options, prefix) => {
  const _map = {};
  for (let i = 0; i < options.length; i++) {
    if (typeof options[i] == "object") {
      _map[(prefix || "") + options[i].label] = options[i].value;
      if (options[i].children) {
        const _childMap = Utils.option2map(
          options[i].children,
          `${(prefix || "") + options[i].value}$`
        );
        Object.assign(_map, _childMap);
      }
    }
  }
  return _map;
};
```

## 解决事件快速点击

```js
/**
 * 指定时间内只能调用一次
 * @param functionTobeCalled 被包装的方法
 * @param interval 时间间隔，可省略，默认600毫秒
 * @example onClick={(params: any) => callOnceInInterval(() => click(params))}
 */
let isCalled = false;
let timer: any;
const callOnceInInterval = (functionTobeCalled: () => void, interval = 600) => {
  if (!isCalled) {
    isCalled = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      isCalled = false;
    }, interval);
    return functionTobeCalled();
  }
  return null;
};
```

## canvas 动态获取字体大小

```js
// 1920/19.2/100*16 = 16   随视图缩小而缩小
// 16/1920*100*19.2 = 16   相反
const base = 1920 / 100;
const w = document.documentElement.clientWidth || 1920;
const dpr = window.devicePixelRatio || 1;
const getFontSize = size => {
  return Math.round((w / base / 100) * size * dpr);
  // xxx.toFixed(fixedDigits);
};
```

## `px` `pt`互转

```js
96dpi   1px = 1/96in
		1pt = 1/72in                 1in = 72pt

		1px = 0.75pt = 1/96*72in     72/96 = 0.75pt
		1pt = 1.33px = 1*96/72       96/72 = 1.33px

all     px = pt * DPI / 72
        pt = px / DPI * 72

px to pd
160ppi 是标准

公式：pd to px
     pd * (ppi / 160) = px

     px to pd
     px / (ppi / 160) = pd

1pd * (320ppi / 160ppi) = 2px
2px / (320ppi / 16oppi) = 1pd

```

## px vw 互转

```js
// px to vw
宽度(vw) =  100 / 1920px * 60px;
宽度(vw) =  1 / 1920px * 100 * 60px;
高度(vh) = 100 / 1080px * 40px;

// vw to px
宽度(px) =  1920px / 100 * 3.125vw;
高度(px) = 1080px / 100 * 3.703vh;
```

## 进制转换

```js
//十进制转其他
var x = 110;
console.log(x);
console.log(x.toString(8));
console.log(x.toString(32));
console.log(x.toString(16));

//其他转十进制
var x = "110";
console.log(parseInt(x, 2));
console.log(parseInt(x, 8));
console.log(parseInt(x, 16));

//其他转其他
//先用parseInt转成十进制再用toString转到目标进制
console.log(String.fromCharCode(parseInt(141, 8)));
console.log(parseInt("ff", 16).toString(2));
```

## unicode 转换

```js

function toUnicode(data) {
	var str ='';
	for(var i = 0; i < data.length; i++){
		str += "\\u" + parseInt(data[i].charCodeAt(0), 10).toString(16);
	}
	return str;
}
function toHanzi(data) {
	data = data.split("\u");
	var str ='';
	for(var i = 0; i < data.length; i++) {
		str += String.fromCharCode(parseInt(data[i], 16).toString(10));
	}
	return str;
}

// escape unescape 版
var UnicodeConverter = {
	encodeUnicode:function(str){
		return escape(str).toLocaleLowerCase().replace(/%u/gi,'\\u');
	},
	decodeUnicode:function(str){
		return unescape(str.replace(/\\u/gi,'%u'));
	}
};

// 只转换汉字，避免转换回车，空格，换行，tab
function toUnicode(s){
	return s.replace(/([\u4E00-\u9FA5]|[\uFE30-\uFFA0])/g, function(newStr) {
		return "\\u" + newStr.charCodeAt(0).toString(16);
　});
}

// 用 eval 解码
var str = "\\u6211\\u662Funicode\\u7F16\\u7801";
str = eval("'" + str + "'"); // "我是unicode编码"
```

## 节流/去抖 （建议使用 Lodash.js 或 Underscore.js）

```js
/*
 * 频率控制 返回函数连续调用时，fn 执行频率限定为每多少时间执行一次
 * @param fn {function}  需要调用的函数
 * @param delay  {number}    延迟时间，单位毫秒
 * @param immediate  {bool} 给 immediate参数传递false 绑定的函数先执行，而不是delay后后执行。
 * @return {function}实际调用函数
 */
var throttle = function(fn, delay, immediate, debounce) {
  var curr = +new Date(), //当前事件
    last_call = 0,
    last_exec = 0,
    timer = null,
    diff, //时间差
    context, //上下文
    args,
    exec = function() {
      last_exec = curr;
      fn.apply(context, args);
    };
  return function() {
    curr = +new Date();
    (context = this),
      (args = arguments),
      (diff = curr - (debounce ? last_call : last_exec) - delay);
    clearTimeout(timer);
    if (debounce) {
      if (immediate) {
        timer = setTimeout(exec, delay);
      } else if (diff >= 0) {
        exec();
      }
    } else {
      if (diff >= 0) {
        exec();
      } else if (immediate) {
        timer = setTimeout(exec, -diff);
      }
    }
    last_call = curr;
  };
};

/*
 * 空闲控制 返回函数连续调用时，空闲时间必须大于或等于 delay，fn 才会执行
 * @param fn {function}  要调用的函数
 * @param delay   {number}    空闲时间
 * @param immediate  {bool} 给 immediate参数传递false 绑定的函数先执行，而不是delay后后执行。
 * @return {function}实际调用函数
 */

var debounce = function(fn, delay, immediate) {
  return throttle(fn, delay, immediate, true);
};
```

## 数组平均数

使用 reduce（）将每个值添加到累加器，初始值为 0，总和除以数组长度。

```js
const average = arr => arr.reduce((acc, val) => acc + val, 0) / arr.length;
// average([1,2,3]) -> 2
```

## 大写每个单词的首字母

使用 replace（）匹配每个单词的第一个字符，并使用 toUpperCase（）来将其大写。

```js
const capitalizeEveryWord = str =>
  str.replace(/\b[a-z]/g, char => char.toUpperCase());
// capitalizeEveryWord('hello world!') -> 'Hello World!'
```

## 首字母大写

```js
const capitalize = (str, lowerRest = false) =>
  str.slice(0, 1).toUpperCase() +
  (lowerRest ? str.slice(1).toLowerCase() : str.slice(1));
// capitalize('myName', true) -> 'Myname'
```

## 计数数组中值的出现次数

每次遇到数组中的特定值时，使用 reduce（）来递增计数器。

```js
const countOccurrences = (arr, value) =>
  arr.reduce((a, v) => (v === value ? a + 1 : a + 0), 0);
// countOccurrences([1,1,2,1,2,3], 1) -> 3
```

## 数组之间的区别

从 b 创建一个 Set，然后在 a 上使用 Array.filter（），只保留 b 中不包含的值。

```js
const difference = (a, b) => {
  const s = new Set(b);
  return a.filter(x => !s.has(x));
};
// difference([1,2,3], [1,2]) -> [3]
```

## 数组之间的相似性

```js
const similarity = (arr, values) => arr.filter(v => values.includes(v));
// similarity([1,2,3], [1,2,4]) -> [1,2]
```

## 转义正则表达式

使用 replace（）来转义特殊字符。

```js
const escapeRegExp = str => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// escapeRegExp('(test)') -> \\(test\\)
```

## 阶乘

使用递归。如果 n 小于或等于 1，则返回 1。否则返回 n 和 n - 1 的阶乘的乘积。

```js
const factorial = n => (n <= 1 ? 1 : n * factorial(n - 1));
// factorial(6) -> 720
```

## 斐波那契数组生成器

创建一个特定长度的空数组，初始化前两个值（0 和 1）。使用 Array.reduce（）向数组中添加值，后面的一个数等于前面两个数相加之和（前两个除外）。

```js
const fibonacci = n =>
  Array(n)
    .fill(0)
    .reduce(
      (acc, val, i) => acc.concat(i > 1 ? acc[i - 1] + acc[i - 2] : i),
      []
    );
// fibonacci(5) -> [0,1,1,2,3]
```

## 过滤数组中的非唯一值

将 Array.filter（）用于仅包含唯一值的数组。

```js
const filterNonUnique = arr =>
  arr.filter(i => arr.indexOf(i) === arr.lastIndexOf(i));
// filterNonUnique([1,2,2,3,4,4,5]) -> [1,3,5]
```

## Flatten 数组

使用 reduce（）来获取数组中的所有元素，并使用 concat（）来使它们 flatten。

```js
const flatten = arr => arr.reduce((a, v) => a.concat(v), []);
// flatten([1,[2],3,4]) -> [1,2,3,4]
```

## 从数组中获取最大值和最小值

```js
const arrayMax = arr => Math.max(...arr);
// arrayMax([10, 1, 5]) -> 10

const arrayMin = arr => Math.min(...arr);
// arrayMin([10, 1, 5]) -> 1
```

## 最大公约数（GCD）

使用递归。基本情况是当 y 等于 0 时。在这种情况下，返回 x。否则，返回 y 的 GCD 和 x / y 的其余部分。

```js
const gcd = (x, y) => (!y ? x : gcd(y, x % y));
// gcd (8, 36) -> 4
```

## 用 range 初始化数组

使用 Array（end-start）创建所需长度的数组，使用 map（）来填充范围中的所需值，可以省略 start 使用默认值 0。

```js
const initializeArrayRange = (end, start = 0) =>
  Array.apply(null, Array(end - start)).map((v, i) => i + start);
// initializeArrayRange(5) -> [0,1,2,3,4]
```

## 用值初始化数组

使用 Array（n）创建所需长度的数组，fill(v)以填充所需的值，可以忽略 value 使用默认值 0。

```js
const initializeArray = (n, value = 0) => Array(n).fill(value);
// initializeArray(5, 2) -> [2,2,2,2,2]
```

## 测试功能所花费的时间

使用 performance.now（）获取函数的开始和结束时间，console.log（）所花费的时间。第一个参数是函数名，随后的参数传递给函数。

```js
const timeTaken = callback => {
  console.time("timeTaken");
  const r = callback();
  console.timeEnd("timeTaken");
  return r;
};
// timeTaken(() => Math.pow(2, 10)) -> 1024
// (logged): timeTaken: 0.02099609375ms
```

## 按字符串排序（按字母顺序排列）

```js
const sortCharactersInString = str =>
  str
    .split("")
    .sort((a, b) => a.localeCompare(b))
    .join("");
// sortCharactersInString('cabbage') -> 'aabbceg'
```

## 来自键值对的对象

```js
const objectFromPairs = arr => arr.reduce((a, v) => ((a[v[0]] = v[1]), a), {});
// objectFromPairs([['a',1],['b',2]]) -> {a: 1, b: 2}
```

## 管道

使用 Array.reduce（）通过函数传递值。

```js
const pipe = (...funcs) => arg => funcs.reduce((acc, func) => func(acc), arg);
// pipe(btoa, x => x.toUpperCase())("Test") -> "VGVZDA=="
```

## Powerset

```js
const powerset = arr =>
  arr.reduce((a, v) => a.concat(a.map(r => [v].concat(r))), [[]]);
// powerset([1,2]) -> [[], [1], [2], [2,1]]
```

## 随机化数组的顺序

```js
const shuffle = arr => arr.sort(() => Math.random() - 0.5);
// shuffle([1,2,3]) -> [2,3,1]
```

## RGB 到十六进制

使用按位左移运算符（<<）和 toString（16），然后 padStart（6，“0”）将给定的 RGB 参数转换为十六进制字符串以获得 6 位十六进制值。

```js
const rgbToHex = (r, g, b) =>
  ((r << 16) + (g << 8) + b).toString(16).padStart(6, "0");
// rgbToHex(255, 165, 1) -> 'ffa501'
```

## 打开新窗口

```js
/**
 * @param {Sting} url
 * @param {Sting} title
 * @param {Number} w
 * @param {Number} h
 */
export default function openWindow(url, title, w, h) {
  // Fixes dual-screen position                            Most browsers       Firefox
  const dualScreenLeft =
    window.screenLeft !== undefined ? window.screenLeft : screen.left;
  const dualScreenTop =
    window.screenTop !== undefined ? window.screenTop : screen.top;

  const width = window.innerWidth
    ? window.innerWidth
    : document.documentElement.clientWidth
    ? document.documentElement.clientWidth
    : screen.width;
  const height = window.innerHeight
    ? window.innerHeight
    : document.documentElement.clientHeight
    ? document.documentElement.clientHeight
    : screen.height;

  const left = width / 2 - w / 2 + dualScreenLeft;
  const top = height / 2 - h / 2 + dualScreenTop;
  const newWindow = window.open(
    url,
    title,
    "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=yes, copyhistory=no, width=" +
      w +
      ", height=" +
      h +
      ", top=" +
      top +
      ", left=" +
      left
  );

  // Puts focus on the newWindow
  if (window.focus) {
    newWindow.focus();
  }
}
```

## scroll to

```js
Math.easeInOutQuad = function(t, b, c, d) {
  t /= d / 2;
  if (t < 1) {
    return (c / 2) * t * t + b;
  }
  t--;
  return (-c / 2) * (t * (t - 2) - 1) + b;
};

// requestAnimationFrame for Smart Animating http://goo.gl/sx5sts
var requestAnimFrame = (function() {
  return (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000 / 60);
    }
  );
})();

/**
 * Because it's so fucking difficult to detect the scrolling element, just move them all
 * @param {number} amount
 */
function move(amount) {
  document.documentElement.scrollTop = amount;
  document.body.parentNode.scrollTop = amount;
  document.body.scrollTop = amount;
}

function position() {
  return (
    document.documentElement.scrollTop ||
    document.body.parentNode.scrollTop ||
    document.body.scrollTop
  );
}

/**
 * @param {number} to
 * @param {number} duration
 * @param {Function} callback
 */
export function scrollTo(to, duration, callback) {
  const start = position();
  const change = to - start;
  const increment = 20;
  let currentTime = 0;
  duration = typeof duration === "undefined" ? 500 : duration;
  var animateScroll = function() {
    // increment the time
    currentTime += increment;
    // find the value with the quadratic in-out easing function
    var val = Math.easeInOutQuad(currentTime, start, change, duration);
    // move the document.body
    move(val);
    // do the animation unless its over
    if (currentTime < duration) {
      requestAnimFrame(animateScroll);
    } else {
      if (callback && typeof callback === "function") {
        // the animation is done so lets callback
        callback();
      }
    }
  };
  animateScroll();
}
```

## 下载图片的几种方式

```js
function exportImageAct(imgUrl, imgName) {
  if (!!window.ActiveXObject || "ActiveXObject" in window) {
    aLinkDownload(imgUrl, imgName); // IE浏览器
  } else if (navigator.userAgent.indexOf("Firefox") !== -1) {
    imageCanvasAlink(imgUrl, imgName); // 火狐浏览器
  } else if (navigator.userAgent.indexOf("Chrome") !== -1) {
    fileUrlDownload(imgUrl, imgName); // Chrome内核浏览器
  } else {
    aLinkDownload(imgUrl, imgName);
  }
}

// 注意：download 由于浏览器安全策略不支持跨域
// 接口返回文件流 chrome 浏览器会识别不了类型
function aLinkDownload(url, imgName) {
  var a = document.createElement("a");
  let event = new MouseEvent("click");
  a.href = url;
  if (imgName) {
    a.download = imgName + ".jpg";
  } else {
    a.download = "down_load.jpg";
  }
  // a.click();火狐浏览器不触发
  a.dispatchEvent(event);
}

// 下载文件流的方式 火狐浏览器会默认XML格式，无法定义文件类型
function fileUrlDownload(url, imgName) {
  console.log(url, itemData);
  var xhr = new XMLHttpRequest();
  xhr.responseType = "blob"; // 返回类型blob
  xhr.onload = function () {
    // 定义请求完成的处理函数
    if (this.status === 200) {
      var blob = this.response;
      var reader = new FileReader();
      reader.readAsDataURL(blob); // 转换为base64，可以直接放入a标签href
      reader.onload = function (e) {
        var str = e.target.result;
        var type = str.substring(str.indexOf("/") + 1, str.indexOf(";"));
        var a = document.createElement("a"); // 转换完成，创建一个a标签用于下载
        let event = new MouseEvent("click");
        if (imgName) {
          a.download = imgName + "." + type;
        } else {
          a.download = "down_load.jpg";
        }
        a.href = e.target.result;
        a.dispatchEvent(event);
      };
    } else if (this.status === 504) {
      alert("导出失败，请求超时");
    } else {
      alert("导出失败");
    }
  };
  xhr.open("get", url, true);
  //此处为兼容后端中间件，设置请求头，文件格式
  xhr.setRequestHeader(
    "Accept",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3"
  );
  xhr.send();
}

// 通过canvas转换
function imageCanvasAlink(src, imgName) {
  // 通过Images对象
  let image = new Image();
  image.setAttribute("crossOrigin", "anonymous");
  image.onload = function (e) {
    let canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    let context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, image.width, image.height);
    // window.navigator.msSaveBlob(canvas.msToBlob(), 'image.jpg');
    let url = canvas.toDataURL("image/png");
    let a = document.createElement("a");
    let event = new MouseEvent("click");
    if (imgName) {
      a.download = imgName + ".jpg";
    } else {
      a.download = "down_load.jpg";
    }
    a.href = url;
    // 触发a的单击事件
    a.dispatchEvent(event);
  };
  // 获取img上的src值，赋值之后，完成之后会调用 onload事件
  image.src = src;
}
```

- [30-seconds-of-code](https://github.com/Chalarangelo/30-seconds-of-code)
- [检查浏览器环境](/resource/js/browser.js)
- [storage Utils](/resource/js/storage.js)
- [常用正则](/resource/js/validator.js)
- [原生对象方法](/resource/js/prototyp-js-Util.js)
- [js 常用排序算法](/resource/js/js-sort.js)
- [react-native Utils](/resource/js/RN-CommonUtil.js)
- [JavaScript 奇技淫巧 44 招](https://chensd.com/2015-01/45-useful-javascript-tips-tricks-and-best-practices.html)
