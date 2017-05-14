---
layout: post
title:  "移动端高清适配方案"
date:   2017-04-24 17:15:00 +0800
categories: Web
tags:
  - mobile
  - css
  - js
---
# 移动端高清适配方案
> 主要参考 [移动端高清、多屏适配方案](http://div.io/topic/1092) 写的非常详细，以下只是为了方便自己记忆理解。

### 背景
公司前端在用[React](https://facebook.github.io/react/)，找了几个基于React 组件UI库 [Ant Design Mobile](https://mobile.ant.design/index-cn)、[SUI Mobile](http://m.sui.taobao.org/components/)、[amaze UI](http://amazeui.org)。由于`antd-mobile`支持`React Native`(公司也在用RN) 最终选择`antd-mobile`。上来就遇到个[高清方案](https://github.com/ant-design/ant-design-mobile/wiki/antd-mobile-0.8-以上版本「高清」方案设置)的坑 o_O||

### 要解决的问题
1. retina和非retina手机图片显示问题  
问题：普通屏幕下的图片显示在retina屏幕中可能会导致图片模糊。  
解决：最好的解决办法是在不同的dpr下，加载不同尺寸的图片。通过css媒体查询或者通过javascript条件判断都可以。(不考虑流量的情况可以 `两倍图片(@2x)，然后图片容器缩小50%`)
2. retina下，border: 1px问题  
问题：border根据设计师的要求为retina下的border物理像素1px，此时的css像素应为0.5px，这是retina下(dpr=2)下能显示的最小单位。然而，无奈并不是所有手机浏览器都能识别border: 0.5px;，ios7以下，android等其他系统里，0.5px会被当成为0px处理  
解决：照常写`border-bottom: 1px solid #ddd;` 通过`transform: scaleY(.5)`缩小0.5倍来达到0.5px的效果，但是这写很麻烦。最好的解决是`页面scale`方案 例如：对于iphone5(dpr=2)，添加如下的meta标签，设置viewport(scale 0.5) 

```html
<meta name="viewport" content="width=640,initial-scale=0.5,maximum-scale=0.5, minimum-scale=0.5,user-scalable=no">
```
3. 多屏适配布局问题  
移动端布局，为了适配各种大屏手机，目前最好用的方案莫过于使用相对单位rem。   
基于rem的原理，我们要做的就是: 针对不同手机屏幕尺寸和dpr动态的改变根节点html 的font-size大小(基准值)。
  
### 用javascript方式一起解决上面三个问题
```js
var dpr, rem, scale;
var docEl = document.documentElement;
var fontEl = document.createElement('style');
var metaEl = document.querySelector('meta[name="viewport"]');

dpr = window.devicePixelRatio || 1;
rem = docEl.clientWidth * dpr / 10;
scale = 1 / dpr;


// 设置viewport，进行缩放，达到高清效果
metaEl.setAttribute('content', 'width=' + dpr * docEl.clientWidth + ',initial-scale=' + scale + ',maximum-scale=' + scale + ', minimum-scale=' + scale + ',user-scalable=no');

// 设置data-dpr属性，留作的css hack之用
docEl.setAttribute('data-dpr', dpr);

// 动态写入样式
docEl.firstElementChild.appendChild(fontEl);
fontEl.innerHTML = 'html{font-size:' + rem + 'px!important;}';

// 给js调用的，某一dpr下rem和px之间的转换函数
window.rem2px = function(v) {
v = parseFloat(v);
return v * rem;
};
window.px2rem = function(v) {
    v = parseFloat(v);
    return v / rem;
};

window.dpr = dpr;
window.rem = rem;
```
动态根据窗口变化修改`html fontSize`
```js
(function (doc, win) {
  var html = doc.documentElement,
    resizeEvt = 'orientationchange' in window ? 'orientationchange' : 'resize',
    recalc = function () {
      var clientWidth = html.clientWidth;
      if (clientWidth) html.style.fontSize = clientWidth / 10 + 'px';
    };
  if (doc.addEventListener) {
    win.addEventListener(resizeEvt, recalc, false);
    doc.addEventListener('DOMContentLoaded', recalc, false);
  }
  recalc();
})(document, window);
```


### 另外两种比较好的高清方案：
1. [antd mobile 0.8 以上版本「高清」方案设置](https://github.com/ant-design/ant-design-mobile/wiki/antd-mobile-0.8-%E4%BB%A5%E4%B8%8A%E7%89%88%E6%9C%AC%E3%80%8C%E9%AB%98%E6%B8%85%E3%80%8D%E6%96%B9%E6%A1%88%E8%AE%BE%E7%BD%AE)
2. [手淘的一个插件](https://github.com/amfe/lib-flexible)

两种方案优缺点：
1. 优点：font-size 可以使用rem（根size根据dpr 50，100，150）  
   缺点：由于不是根据clientWidth动态修改html font-size，需要伸缩的盒子就不能使用rem
        例如: width就需要使用flex布局或百分比；height最好不要给 可以写min-height
2. 优点: 除了font-size 不可以使用rem，其他样式都可以使用rem 因为是动态修改html font-size   
   缺点：字体不能使用rem，会出现13.xx，15.xx，需要写很多 data-dpr font-size


### 概念阐述
***物理像素(physical pixel)***  
一个物理像素是显示器(手机屏幕)上最小的物理显示单元，在操作系统的调度下，每一个设备像素都有自己的颜色值和亮度值。

***设备独立像素(density-independent pixel)***  
设备独立像素(也叫密度无关像素)，可以认为是计算机坐标系统中得一个点，这个点代表一个可以由程序使用的虚拟像素(比如: css像素)，然后由相关系统转换为物理像素。

所以说，物理像素和设备独立像素之间存在着一定的对应关系，这就是接下来要说的设备像素比。

***设备像素比(device pixel ratio )***  
设备像素比(简称dpr)定义了物理像素和设备独立像素的对应关系，它的值可以按如下的公式的得到：

```js
设备像素比 = 物理像素 / 设备独立像素 // 在某一方向上，x方向或者y方向
```

在javascript中，可以通过window.devicePixelRatio获取到当前设备的dpr。

在css中，可以通过-webkit-device-pixel-ratio，-webkit-min-device-pixel-ratio和 -webkit-max-device-pixel-ratio进行媒体查询，对不同dpr的设备，做一些样式适配(这里只针对webkit内核的浏览器和webview)。

---



## 参考资料
- [移动端高清、多屏适配方案](http://div.io/topic/1092)
- [可伸缩布局方案](https://github.com/amfe/lib-flexible)
- [antd mobile 0.8 以上版本「高清」方案设置](https://github.com/ant-design/ant-design-mobile/wiki/antd-mobile-0.8-以上版本「高清」方案设置)