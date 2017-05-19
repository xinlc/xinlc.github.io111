---
layout: post
title:  "JavaScript 常用代码片段"
date:   2017-04-25 10:00:00 +0800
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
const completed = function () {
  document.removeEventListener( "DOMContentLoaded", completed );
	window.removeEventListener( "load", completed );
  ready();
};

if ( document.readyState === "complete" ||
    ( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {
    // Handle it asynchronously to allow scripts the opportunity to delay ready
    window.setTimeout( ready );
} else {
    // Use the handy event callback
    document.addEventListener( "DOMContentLoaded", completed );
    // A fallback to window.onload, that will always work
    window.addEventListener( "load", completed );
}
```
<!--more-->
## HTML5图片压缩 或使用[localResizeIMG](https://github.com/think2011/localResizeIMG)

```js
const image = new Image();
const canvas = document.createElement("canvas");
const ctx = canvas.getContext('2d');
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

## js获取search参数

```js
window.getUrlParam = function (name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
    var r = window.location.search.substr(1).match(reg);  //匹配目标参数
    if (r != null) return decodeURI(r[2]); return null; //返回参数值
}
```

## 获得URL中GET参数值

```js
// 用法：如果地址是 test.htm?t1=1&t2=2&t3=3, 那么能取得：GET["t1"], GET["t2"], GET["t3"]
function get_get(){ 
    querystr = window.location.href.split("?")
    if(querystr[1]){
        GETs = querystr[1].split("&");
        GET = [];
        for(i=0;i<GETs.length;i++){
              tmp_arr = GETs.split("=")
              key=tmp_arr[0]
              GET[key] = tmp_arr[1]
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
(function () {
  if (typeof window.CustomEvent === 'function') 
    return false;
  
  function CustomEvent(event, params) {
    params = params || {
      bubbles: false,
      cancelable: false,
      detail: undefined
    };
    let evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  }

  CustomEvent.prototype = window.Event.prototype;

  window.CustomEvent = CustomEvent;
}());


// Event
const Event = function (el) {
  return new _Event(el);
};

const _Event = function (el) {
  this.el = (el && el.nodeType == 1)
    ? el
    : document;
};

_Event.prototype = {
  constructor: this,
  addEvent: function (type, fn, capture) {
    this.el.addEventListener(type, fn, capture);
    return this;
  },
  fireEvent: function (type) {
    const ev = new CustomEvent(type);
    this.el.dispatchEvent(ev);
    return this;
  },
  removeEvent: function (type, fn, capture) {
    this.el.removeEventListener(type, fn, capture || false);
    return this;
  }
};

// window.EventUtil = Event; // 全局接口
export default Event;

```

## js 高精度计算

```js
//除法函数，用来得到精确的除法结果 
//说明：javascript的除法结果会有误差，在两个浮点数相除的时候会比较明显。这个函数返回较为精确的除法结果。 
//调用：accDiv(arg1,arg2) 
//返回值：arg1除以arg2的精确结果

function accDiv(arg1,arg2){ 
var t1=0,t2=0,r1,r2; 
try{t1=arg1.toString().split(".")[1].length}catch(e){} 
try{t2=arg2.toString().split(".")[1].length}catch(e){} 
with(Math){ 
r1=Number(arg1.toString().replace(".","")) 
r2=Number(arg2.toString().replace(".","")) 
return (r1/r2)*pow(10,t2-t1); 
} 
} 
//给Number类型增加一个div方法，调用起来更加方便。 
Number.prototype.div = function (arg){ 
return accDiv(this, arg); 
} 


//乘法函数，用来得到精确的乘法结果 
//说明：javascript的乘法结果会有误差，在两个浮点数相乘的时候会比较明显。这个函数返回较为精确的乘法结果。 
//调用：accMul(arg1,arg2) 
//返回值：arg1乘以arg2的精确结果 

function accMul(arg1,arg2) 
{ 
var m=0,s1=arg1.toString(),s2=arg2.toString(); 
try{m+=s1.split(".")[1].length}catch(e){} 
try{m+=s2.split(".")[1].length}catch(e){} 
return Number(s1.replace(".",""))*Number(s2.replace(".",""))/Math.pow(10,m) 
} 
//给Number类型增加一个mul方法，调用起来更加方便。 
Number.prototype.mul = function (arg){ 
return accMul(arg, this); 
} 


//加法函数，用来得到精确的加法结果 
//说明：javascript的加法结果会有误差，在两个浮点数相加的时候会比较明显。这个函数返回较为精确的加法结果。 
//调用：accAdd(arg1,arg2) 
//返回值：arg1加上arg2的精确结果 

function accAdd(arg1,arg2){ 
var r1,r2,m; 
try{r1=arg1.toString().split(".")[1].length}catch(e){r1=0} 
try{r2=arg2.toString().split(".")[1].length}catch(e){r2=0} 
m=Math.pow(10,Math.max(r1,r2)) 
return (arg1*m+arg2*m)/m 
} 
//给Number类型增加一个add方法，调用起来更加方便。 
Number.prototype.add = function (arg){ 
return accAdd(arg,this); 
}

//在你要用的地方包含这些函数，然后调用它来计算就可以了。 
//比如你要计算：7*0.8 ，则改成 (7).mul(8) 
//其它运算类似，就可以得到比较精确的结果。


//减法函数
function Subtr(arg1,arg2){
     var r1,r2,m,n;
     try{r1=arg1.toString().split(".")[1].length}catch(e){r1=0}
     try{r2=arg2.toString().split(".")[1].length}catch(e){r2=0}
     m=Math.pow(10,Math.max(r1,r2));
     //last modify by deeka
     //动态控制精度长度
     n=(r1>=r2)?r1:r2;
     return ((arg1*m-arg2*m)/m).toFixed(n);
}
```

## 根据生日计算星座

```js
/**
 * Leo：根据生日计算星座
 * @param  {[type]} birthday [description]
 * @return {[type]}          [description]
 */
Utils.calConstellation = (birthday) => {
  if (birthday == null || birthday == '') {
    return '';
  }
  const date = new Date(birthday);// new Date(String(birthday).replace(/\-/g,'/'));
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const s = '魔羯座水瓶座双鱼座牡羊座金牛座双子座巨蟹座狮子座处女座天秤座天蝎座射手座魔羯座';
  const arr = [20, 19, 21, 21, 21, 22, 23, 23, 23, 23, 22, 22];
  return s.substr(month * 3 - (day < arr[month - 1] ? 3 : 0), 3);
};
```
## 计算年龄

```js
Utils.calAge = (birthday) => {
  let age = 0;
  if (birthday) {
    const aDate = new Date();
    const thisYear = aDate.getFullYear();
    const thisMonth = aDate.getMonth() + 1;
    const thisDay = aDate.getDate();
    const brith = new Date(birthday);// new Date(String(birthday).replace(/\-/g,'/'));
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

## 格式化Date

```js
/**
 * @param  {Date} date
 * @param  {String} fmt
 * @return {String}
 */
Utils.dateFormat = (date, fmt = 'yyyy-MM-dd') => {
  if (Object.prototype.toString.call(date) === '[object String]') {
    if (date.indexOf('-') != -1) {
      // 为了兼容ios 日期必须把 yyyy-mm-dd 转换为 yyyy/mm/dd
      date = date.replace(/\-/g, '/');  // eslint-disable-line
      if (date.lastIndexOf('.') != -1) { // 去掉毫秒
        date = date.substring(0, date.lastIndexOf('.'));
      }
    }
  }
  if (Object.prototype.toString.call(date) !== '[object Date]') {
    date = new Date(date);
  }
  const o = {
    'M+': date.getMonth() + 1,                 // 月份
    'd+': date.getDate(),                    // 日
    'h+': date.getHours(),                   // 小时
    'm+': date.getMinutes(),                 // 分
    's+': date.getSeconds(),                 // 秒
    'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
    S: date.getMilliseconds()             // 毫秒
  };
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (`${date.getFullYear()}`).substr(4 - RegExp.$1.length));
  }
  for (const k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : ((`00${o[k]}`).substr((`${o[k]}`).length)));
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
  const toDate = (date) => {
    if (Object.prototype.toString.call(date) === '[object String]') {
      if (date.indexOf('-') != -1) {
        // 为了兼容ios 日期必须把 yyyy-mm-dd 转换为 yyyy/mm/dd
        date = date.replace(/\-/g, '/'); // eslint-disable-line
        if (date.lastIndexOf('.') != -1) { // 去掉毫秒
          date = date.substring(0, date.lastIndexOf('.'));
        }
      }
    }
    if (Object.prototype.toString.call(date) !== '[object Date]') {
      date = new Date(date);
    }
    return date;
  };

  const dtStart = toDate(start);
  const dtEnd = toDate(end);

  switch (strInterval) {
  case 's':
    return parseInt((dtEnd - dtStart) / 1000);
  case 'n':
    return parseInt((dtEnd - dtStart) / 60000);
  case 'h':
    return parseInt((dtEnd - dtStart) / 3600000);
  case 'd':
    return parseInt((dtEnd - dtStart) / 86400000);
  case 'w':
    return parseInt((dtEnd - dtStart) / (86400000 * 7));
  case 'm':
    return (dtEnd.getMonth() + 1) + ((dtEnd.getFullYear() - dtStart.getFullYear()) * 12) - (dtStart.getMonth() + 1);
  // return dtEnd.getMonth() - dtStart.getMonth();
  case 'y':
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
## 生成UUID

```js
Utils.generateUUID = () => {
  let d = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (d + Math.random() * 16) % 16 | 0; // eslint-disable-line
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);  // eslint-disable-line
  });
  return uuid;
};
```

## js对象深拷贝

```js
Utils.deepCopy = (p, _c) => {
  const c = _c || {};
  for (const i in p) {
    if (!p.hasOwnProperty(i)) { // eslint-disable-line
      continue; // eslint-disable-line
    }
    if (typeof p[i] === 'object') {
      c[i] = (p[i].constructor === Array) ? [] : {};
      Utils.deepCopy(p[i], c[i]);
    } else {
      c[i] = p[i];
    }
  }
  return c;
};
```

## 返回指定范围的随机数(m-n之间)的公式

```js
Math.random()*(n-m)+m
```

## 随机数时间戳

```js
function uniqueId(){
    var a=Math.random,b=parseInt;
    return Number(new Date()).toString()+b(10*a())+b(10*a())+b(10*a());
}
```

## 防止被Iframe嵌套

```js
if(top != self){
    location.href = "about:blank";
}
```

## [iOS，Safari浏览器，input等表单focus后fixed元素错位问题](https://www.snip2code.com/Snippet/176582/--iOS-Safari----input---focus-fixed-----)

```js
if( /iPhone|iPod|iPad/i.test(navigator.userAgent) ) {
  $(document).on('focus', 'input, textarea', function(){
     $('header').css("position", 'absolute');
     $('footer').css("position", 'absolute');
  });
  
  $(document).on('blur', 'input, textarea', function(){
    $('header').css("position", 'fixed');
    $('footer').css("position", 'fixed');
  });
} 
```

## 得到地理位置

```js
function getLocation(callback){
  if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        function(p){
            callback(p.coords.latitude, p.coords.longitude);
        },
        function(e){
            var msg = e.code + "\n" + e.message;
        }
      );
  }
}
```

## 获取js所在路径

```js
function getJsDir (src) {
    var script = null;
    if (src) {
        script = [].filter.call(document.scripts, function (v) {
            return v.src.indexOf(src) !== -1;
        })[0];
    } else {
        script = document.scripts[document.scripts.length - 1];
    }
    return script ? script.src.substr(0, script.src.lastIndexOf('/')) : script;
}
```

## 从全局捕获错误

```js
window.onerror = function (errMsg, scriptURI, lineNumber, columnNumber, errorObj) {
    setTimeout(function () {
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

## 转义html标签

```js
function HtmlEncode(text) {
    return text.replace(/&/g, '&').replace(/\"/g, '"').replace(/</g, '<').replace(/>/g, '>')
}
```

## cookie 操作

```js
// 设置cookie值
function setCookie(name, value, Hours) {
    var d = new Date();
    var offset = 8;
    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    var nd = utc + (3600000 * offset);
    var exp = new Date(nd);
    exp.setTime(exp.getTime() + Hours * 60 * 60 * 1000);
    document.cookie = name + "=" + escape(value) + ";path=/;expires=" + exp.toGMTString() + ";domain=360doc.com;"
}

//获取cookie值
function getCookie(name) {
    var arr = document.cookie.match(new RegExp("(^| )" + name + "=([^;]*)(;|$)"));
    if (arr != null) return unescape(arr[2]);
    return null
}
```

## 加载样式文件表

```js
function LoadStyle(url) {
    try {
        document.createStyleSheet(url)
    } catch(e) {
        var cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.type = 'text/css';
        cssLink.href = url;
        var head = document.getElementsByTagName('head')[0];
        head.appendChild(cssLink)
    }
}
```

## 返回脚本内容

```js
function evalscript(s) {
    if(s.indexOf('<script') == -1) return s;
    var p = /<script[^\>]*?>([^\x00]*?)<\/script>/ig;
    var arr = [];
    while(arr = p.exec(s)) {
        var p1 = /<script[^\>]*?src=\"([^\>]*?)\"[^\>]*?(reload=\"1\")?(?:charset=\"([\w\-]+?)\")?><\/script>/i;
        var arr1 = [];
        arr1 = p1.exec(arr[0]);
        if(arr1) {
            appendscript(arr1[1], '', arr1[2], arr1[3]);
        } else {
            p1 = /<script(.*?)>([^\x00]+?)<\/script>/i;
            arr1 = p1.exec(arr[0]);
            appendscript('', arr1[2], arr1[1].indexOf('reload=') != -1);
        }
    }
    return s;
}
```

## 清除脚本内容

```js
function stripscript(s) {
    return s.replace(/<script.*?>.*?<\/script>/ig, '');
}
```

## 动态加载脚本文件

```js
function appendscript(src, text, reload, charset) {
    var id = hash(src + text);
    if(!reload && in_array(id, evalscripts)) return;
    if(reload && $(id)) {
        $(id).parentNode.removeChild($(id));
    }
 
    evalscripts.push(id);
    var scriptNode = document.createElement("script");
    scriptNode.type = "text/javascript";
    scriptNode.id = id;
    scriptNode.charset = charset ? charset : (BROWSER.firefox ? document.characterSet : document.charset);
    try {
        if(src) {
            scriptNode.src = src;
            scriptNode.onloadDone = false;
            scriptNode.onload = function () {
                scriptNode.onloadDone = true;
                JSLOADED[src] = 1;
             };
             scriptNode.onreadystatechange = function () {
                 if((scriptNode.readyState == 'loaded' || scriptNode.readyState == 'complete') && !scriptNode.onloadDone) {
                    scriptNode.onloadDone = true;
                    JSLOADED[src] = 1;
                }
             };
        } else if(text){
            scriptNode.text = text;
        }
        document.getElementsByTagName('head')[0].appendChild(scriptNode);
    } catch(e) {}
}
```

## 检验URL链接是否有效

```js
function getUrlState(URL){ 
    var xmlhttp = new ActiveXObject("microsoft.xmlhttp"); 
    xmlhttp.Open("GET",URL, false);  
    try{  
            xmlhttp.Send(); 
    }catch(e){
    }finally{ 
        var result = xmlhttp.responseText; 
        if(result){
            if(xmlhttp.Status==200){ 
                return(true); 
             }else{ 
                   return(false); 
             } 
         }else{ 
             return(false); 
         } 
    }
}
```

## 获取页面高度

```js
// 获取页面高度
function getPageHeight(){
    var g = document, a = g.body, f = g.documentElement, d = g.compatMode == "BackCompat"
                    ? a
                    : g.documentElement;
    return Math.max(f.scrollHeight, a.scrollHeight, d.clientHeight);
}

//获取页面可视宽度 
function getPageViewWidth(){
    var d = document, a = d.compatMode == "BackCompat" ? 
                          d.body: d.documentElement;
    return a.clientWidth;
}

//获取页面宽度
function getPageWidth(){
    var g = document, a = g.body, f = g.documentElement, d = g.compatMode == "BackCompat"?
                          a: g.documentElement;
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
            if ((d.scrollTop + b.scrollTop) == 0) clearInterval(btn.timer, window.onscroll = set);
            }, 10);
    };
    function set() {
        btn.style.display = (d.scrollTop + b.scrollTop > 100) ? 'block': "none"
    }
};
backTop('goTop');
```

## 数组去重

```js
String.prototype.unique=function(){
    var x=this.split(/[\r\n]+/);
    var y='';
    for(var i=0;i<x.length;i++){
        if(!new RegExp("^"+x.replace(/([^\w])/ig,"\\$1")+"$","igm").test(y)){
            y+=x+"\r\n"
        }
    }
    return y
};
```

## 按字典顺序，对每行进行数组排序
```js

function SetSort(){
    var text=K1.value.split(/[\r\n]/).sort().join("\r\n");//顺序
    var test=K1.value.split(/[\r\n]/).sort().reverse().join("\r\n");//反序
    K1.value=K1.value!=text?text:test;
}
```

## 字符串反序输出

```js
function IsReverse(text){
    return text.split('').reverse().join('');
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
        var dw = new Array("零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"); //整数部分用
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
                if (n == '0') sum = 0;
              }
              if (len - i - 1 >= 0) { //在数字范围内
                if (k1 != 3) { //加小单位
                      if (bn != 0) {
                        str = dw1[k1].concat(str);
                      }
                      k1++;
                } else { //不加小单位，加大单位
                      k1 = 0;
                      var temp = str.charAt(0);
                      if (temp == "万" || temp == "亿") //若大单位前没有数字则舍去大单位
                      str = str.substr(1, str.length - 1);
                      str = dw2[k2].concat(str);
                      sum = 0;
                }
              }
              if (k1 == 3){ //小单位到千则大单位进一
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
    } catch(e) {
        return "0元";
    }
    return str;
}
//拆分整数与小数
function splits(tranvalue) {
    var value = new Array('', '');
    temp = tranvalue.split(".");
    for (var i = 0; i < temp.length; i++) {
        value = temp;
    }
    return value;
}
```

## HTML5全屏

```js
function fullscreen(element) {
    if(element.requestFullscreen) {
        element.requestFullscreen();
    } else if(element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if(element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if(element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}
fullscreen(document.documentElement)
```

## js获取验证码倒计时效果

```js
function getCode(obj,n){
    var t=obj.value;
    (function(){
        if(n>0){
            obj.disabled=true
            obj.value='倒计时'+(n--)+'秒';
            setTimeout(arguments.callee,1000);
        }else{
            obj.disabled=false;
            obj.value=t;    
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

## JS继承的实现方式 [参考](http://www.cnblogs.com/humin/p/4556820.html)

```js
// 定义一个动物类
function Animal (name) {
  // 属性
  this.name = name || 'Animal';
  // 实例方法
  this.sleep = function(){
    console.log(this.name + '正在睡觉！');
  }
}
// 原型方法
Animal.prototype.eat = function(food) {
  console.log(this.name + '正在吃：' + food);
};

// 1. 原型链继承
function Cat(){ 
}
Cat.prototype = new Animal();
Cat.prototype.name = 'cat';

//　Test Code
var cat = new Cat();
console.log(cat.name);
console.log(cat.eat('fish'));
console.log(cat.sleep());
console.log(cat instanceof Animal); //true 
console.log(cat instanceof Cat); //true

// 2.构造继承
function Cat(name){
  Animal.call(this);
  this.name = name || 'Tom';
}

// Test Code
var cat = new Cat();
console.log(cat.name);
console.log(cat.sleep());
console.log(cat instanceof Animal); // false
console.log(cat instanceof Cat); // true

// 3.寄生组合继承
function Cat(name){
  Animal.call(this);
  this.name = name || 'Tom';
}
(function(){
  // 创建一个没有实例方法的类
  var Super = function(){};
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

## H5页检测手机是否安装app 相关流程 [参考](https://segmentfault.com/a/1190000009123583)

```js
export const openApp = function(openUrl, callback) {
    //检查app是否打开
    function checkOpen(cb){
        var _clickTime = +(new Date());
        function check(elsTime) {
            if ( elsTime > 3000 || document.hidden || document.webkitHidden) {
                cb(1);
            } else {
                cb(0);
            }
        }
        //启动间隔20ms运行的定时器，并检测累计消耗时间是否超过3000ms，超过则结束
        var _count = 0, intHandle;
        intHandle = setInterval(function(){
            _count++;        
            var elsTime = +(new Date()) - _clickTime;
            if (_count>=100 || elsTime > 3000 ) {
                clearInterval(intHandle);
                check(elsTime);
            }
        }, 20);
    }
   
    //在iframe 中打开APP
    var ifr = document.createElement('iframe');
    ifr.src = openUrl;
    ifr.style.display = 'none';

    if (callback) {
      //客户端检测微信直接跳应用宝链接
      var browser = BrowserInfo();
      //使用微链接
      var encodeUri = encodeURIComponent(openUrl);

      if (browser.isWeixin) {
        window.location.href = '你的微链url&android_schema='+encodeUri;
      }else{
        checkOpen(function(opened){
            callback && callback(opened);
        });
     
      }
    }
    
    document.body.appendChild(ifr);      
    setTimeout(function() {
        document.body.removeChild(ifr);
    }, 2000);  

}
```

## [柯里化函数](https://segmentfault.com/a/1190000008263193)

```js
 var curring = function(fn){
    var _args = [];        
    return function cb(){
        if(arguments.length === 0) {                
            return fn.apply(this, _args);
        }            
        Array.prototype.push.apply(_args, [].slice.call(arguments));       
        
        return cb;
    }

}
            
var multi = function(){
    
    var total = 0;        
    var argsArray = Array.prototype.slice.call(arguments);
        argsArray.forEach(function(item){
            total += item;
        })   
    return total
};    

var calc = curring(multi);

calc(1,2)(3)(4,5,6);    console.log(calc()); //空白调用时才真正计算
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

- [检查浏览器环境](/resource/js/browser.js)
- [storage Utils](/resource/js/storage.js)
- [常用正则](/resource/js/validator.js)
- [原生对象方法](/resource/js/prototyp-js-Util.js)
- [js 常用排序算法](/resource/js/js-sort.js)
- [react-native Utils](/resource/js/RN-CommonUtil.js)
- [JavaScript奇技淫巧44招](https://chensd.com/2015-01/45-useful-javascript-tips-tricks-and-best-practices.html)