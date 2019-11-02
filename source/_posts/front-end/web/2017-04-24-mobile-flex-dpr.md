---
layout: post
title: "移动端高清适配方案"
date: 2017-04-24 17:15:00 +0800
categories: Web
tags:
  - mobile
  - css
  - js
---

移动端高清适配方案

<!--more-->

## 背景

公司前端在用[React](https://facebook.github.io/react/)，找了几个基于 React 组件 UI 库 [Ant Design Mobile](https://mobile.ant.design/index-cn)、[SUI Mobile](http://m.sui.taobao.org/components/)、[amaze UI](http://amazeui.org)。由于`antd-mobile`支持`React Native`(公司也在用 RN) 最终选择`antd-mobile`。上来就遇到个[高清方案](https://github.com/ant-design/ant-design-mobile/wiki/antd-mobile-0.8-以上版本「高清」方案设置)的坑 o_O||

## 要解决的问题

1. retina 和非 retina 手机图片显示问题  
   问题：普通屏幕下的图片显示在 retina 屏幕中可能会导致图片模糊。  
   解决：最好的解决办法是在不同的 dpr 下，加载不同尺寸的图片。通过 css 媒体查询或者通过 javascript 条件判断都可以。(不考虑流量的情况可以 `两倍图片(@2x)，然后图片容器缩小50%`)
2. retina 下，border: 1px 问题  
   问题：border 根据设计师的要求为 retina 下的 border 物理像素 1px，此时的 css 像素应为 0.5px，这是 retina 下(dpr=2)下能显示的最小单位。然而，无奈并不是所有手机浏览器都能识别 border: 0.5px;，ios7 以下，android 等其他系统里，0.5px 会被当成为 0px 处理  
   解决：照常写`border-bottom: 1px solid #ddd;` 通过`transform: scaleY(.5)`缩小 0.5 倍来达到 0.5px 的效果，但是这写很麻烦。最好的解决是`页面scale`方案 例如：对于 iphone5(dpr=2)，添加如下的 meta 标签，设置 viewport(scale 0.5)

```html
<meta
  name="viewport"
  content="width=640,initial-scale=0.5,maximum-scale=0.5, minimum-scale=0.5,user-scalable=no"
/>
```

3. 多屏适配布局问题  
   移动端布局，为了适配各种大屏手机，目前最好用的方案莫过于使用相对单位 rem。  
   基于 rem 的原理，我们要做的就是: 针对不同手机屏幕尺寸和 dpr 动态的改变根节点 html 的 font-size 大小(基准值)。

## 用 javascript 方式一起解决上面三个问题

```js
var dpr, rem, scale;
var docEl = document.documentElement;
var fontEl = document.createElement("style");
var metaEl = document.querySelector('meta[name="viewport"]');

dpr = window.devicePixelRatio || 1;
rem = (docEl.clientWidth * dpr) / 10;
scale = 1 / dpr;

// 设置viewport，进行缩放，达到高清效果
metaEl.setAttribute(
  "content",
  "width=" +
    dpr * docEl.clientWidth +
    ",initial-scale=" +
    scale +
    ",maximum-scale=" +
    scale +
    ", minimum-scale=" +
    scale +
    ",user-scalable=no"
);

// 设置data-dpr属性，留作的css hack之用
docEl.setAttribute("data-dpr", dpr);

// 动态写入样式
docEl.firstElementChild.appendChild(fontEl);
fontEl.innerHTML = "html{font-size:" + rem + "px!important;}";

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
(function(doc, win) {
  var html = doc.documentElement,
    resizeEvt = "orientationchange" in window ? "orientationchange" : "resize",
    recalc = function() {
      var clientWidth = html.clientWidth;
      if (clientWidth) html.style.fontSize = clientWidth / 10 + "px";
    };
  if (doc.addEventListener) {
    win.addEventListener(resizeEvt, recalc, false);
    doc.addEventListener("DOMContentLoaded", recalc, false);
  }
  recalc();
})(document, window);
```

## 另外两种比较好的高清方案：

1. [antd mobile 0.8 以上版本「高清」方案设置](https://github.com/ant-design/ant-design-mobile/wiki/antd-mobile-0.8-%E4%BB%A5%E4%B8%8A%E7%89%88%E6%9C%AC%E3%80%8C%E9%AB%98%E6%B8%85%E3%80%8D%E6%96%B9%E6%A1%88%E8%AE%BE%E7%BD%AE)
2. [手淘的一个插件](https://github.com/amfe/lib-flexible)

两种方案优缺点：

1. 优点：font-size 可以使用 rem（根 size 根据 dpr 50，100，150）  
   缺点：由于不是根据 clientWidth 动态修改 html font-size，需要伸缩的盒子就不能使用 rem
   例如: width 就需要使用 flex 布局或百分比；height 最好不要给 可以写 min-height
2. 优点: 除了 font-size 不可以使用 rem，其他样式都可以使用 rem 因为是动态修改 html font-size  
   缺点：字体不能使用 rem，会出现 13.xx，15.xx，需要写很多 data-dpr font-size

## 概念阐述

**_物理像素(physical pixel)_**  
一个物理像素是显示器(手机屏幕)上最小的物理显示单元，在操作系统的调度下，每一个设备像素都有自己的颜色值和亮度值。

**_设备独立像素(density-independent pixel)_**  
设备独立像素(也叫密度无关像素)，可以认为是计算机坐标系统中得一个点，这个点代表一个可以由程序使用的虚拟像素(比如: css 像素)，然后由相关系统转换为物理像素。

所以说，物理像素和设备独立像素之间存在着一定的对应关系，这就是接下来要说的设备像素比。

**_设备像素比(device pixel ratio )_**  
设备像素比(简称 dpr)定义了物理像素和设备独立像素的对应关系，它的值可以按如下的公式的得到：

```js
设备像素比 = 物理像素 / 设备独立像素; // 在某一方向上，x方向或者y方向
```

在 javascript 中，可以通过 window.devicePixelRatio 获取到当前设备的 dpr。

在 css 中，可以通过-webkit-device-pixel-ratio，-webkit-min-device-pixel-ratio 和 -webkit-max-device-pixel-ratio 进行媒体查询，对不同 dpr 的设备，做一些样式适配(这里只针对 webkit 内核的浏览器和 webview)。

## css 中的 1px 并不等于设备的 1px

在 css 中我们一般使用 px 作为单位，在桌面浏览器中 css 的 1 个像素往往都是对应着电脑屏幕的 1 个物理像素，这可能会造成我们的一个错觉，那就是 css 中的像素就是设备的物理像素。但实际情况却并非如此，css 中的像素只是一个抽象的单位，在不同的设备或不同的环境中，css 中的 1px 所代表的设备物理像素是不同的。在为桌面浏览器设计的网页中，我们无需对这个津津计较，但在移动设备上，必须弄明白这点。在早先的移动设备中，屏幕像素密度都比较低，如 iphone3，它的分辨率为 320x480，在 iphone3 上，一个 css 像素确实是等于一个屏幕物理像素的。后来随着技术的发展，移动设备的屏幕像素密度越来越高，从 iphone4 开始，苹果公司便推出了所谓的 Retina 屏，分辨率提高了一倍，变成 640x960，但屏幕尺寸却没变化，这就意味着同样大小的屏幕上，像素却多了一倍，这时，一个 css 像素是等于两个物理像素的。其他品牌的移动设备也是这个道理。例如安卓设备根据屏幕像素密度可分为 ldpi、mdpi、hdpi、xhdpi 等不同的等级，分辨率也是五花八门，安卓设备上的一个 css 像素相当于多少个屏幕物理像素，也因设备的不同而不同，没有一个定论。

还有一个因素也会引起 css 中 px 的变化，那就是用户缩放。例如，当用户把页面放大一倍，那么 css 中 1px 所代表的物理像素也会增加一倍；反之把页面缩小一倍，css 中 1px 所代表的物理像素也会减少一倍。

在移动端浏览器中以及某些桌面浏览器中，window 对象有一个`devicePixelRatio`属性，它的官方的定义为：设备物理像素和设备独立像素的比例，也就是 `devicePixelRatio = 物理像素 / 独立像素`。css 中的 px 就可以看做是设备的独立像素，所以通过 devicePixelRatio，我们可以知道该设备上一个 css 像素代表多少个物理像素。例如，在 Retina 屏的 iphone 上，devicePixelRatio 的值为 2，也就是说 1 个 css 像素相当于 2 个物理像素。

## viewport

在移动设备上进行网页的重构或开发，首先得搞明白的就是移动设备上的 viewport 了，只有明白了 viewport 的概念以及弄清楚了跟 viewport 有关的 meta 标签的使用，才能更好地让我们的网页适配或响应各种不同分辨率的移动设备。

### viewport 概念

移动设备上的 viewport 是设备屏幕上用来显示网页的那部分区域，再具体一点就是浏览器上用来显示网页的那部分区域，但 viewport 又不局限于浏览器可视区域的大小，它可能比浏览器的可视区域大，也可能比浏览器的可视区域小。在默认情况下，移动设备上的 viewport 都是大于浏览器可视区域的，这是因为移动设备的分辨率相对于 PC 来说都比较小，所以为了能在移动设备上正常显示那些为 PC 浏览器设计的网站，移动设备上的浏览器都会把自己默认的 viewport 设为 980px 或 1024px（也可能是其它值，由设备本身决定），但后果是浏览器出现横向滚动条，因为浏览器可视区域的宽度比默认的 viewport 的宽度小。

### 三个 viewport 的理论

[ppk](https://www.quirksmode.org)大神对于移动设备上的 viewport 有着非常多的研究（[第一篇](https://www.quirksmode.org/mobile/viewports.html)，[第二篇](https://www.quirksmode.org/mobile/viewports2.html)，[第三篇](https://www.quirksmode.org/mobile/metaviewport/)），有兴趣的同学可以去看一下。ppk 认为，移动设备上有三个 viewport。

#### layout viewport

如果把移动设备上浏览器的可视区域设为 viewport 的话，某些网站会因为 viewport 太窄而显示错乱，所以这些浏览器就默认会把 viewport 设为一个较宽的值，比如 980px，使得即使是那些为 PC 浏览器设计的网站也能在移动设备浏览器上正常显示。这个浏览器默认的 viewport 叫做 `layout viewport`。layout viewport 的宽度可以通过 `document.documentElement.clientWidth`来获取。

#### visual viewport

layout viewport 的宽度是大于浏览器可视区域的宽度的，所以还需要一个 viewport 来代表浏览器可视区域的大小，这个 viewport 叫做 `visual viewport`。visual viewport 的宽度可以通过  `window.innerWidth`来获取。

#### ideal viewport

`ideal viewport`是一个能完美适配移动设备的 viewport。首先，不需要缩放和横向滚动条就能正常查看网站的所有内容；其次，显示的文字、图片大小合适，如 14px 的文字不会因为在一个高密度像素的屏幕里显示得太小而无法看清，无论是在何种密度屏幕，何种分辨率下，显示出来的大小都差不多。这个 viewport 叫做 `ideal viewport`。

`ideal viewport`并没有一个固定的尺寸，不同的设备有不同的`ideal viewport`。例如，iphone6 的 ideal viewport 宽度是`375px`，无论它的屏幕宽度是 375 还是 750, 也就是说，在 iphone 中，css 中的 375px 就代表 iphone 屏幕的宽度。

ideal viewport 的意义在于，无论在何种分辨率的屏幕下，针对 ideal viewport 而设计的网站，不需要缩放和横向滚动条都可以完美地呈现给用户。

### 利用 meta 标签对 viewport 进行控制

移动设备默认的 viewport 是 layout viewport，也就是那个比屏幕要宽的 viewport，但在进行移动设备网站的开发时，我们需要的是 ideal viewport。那么怎么才能得到 ideal viewport 呢？这就该轮到 meta 标签出场了。

我们在开发移动设备的网站时，最常见的的一个动作就是把下面这个东西复制到我们的 head 标签中：

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
/>
```

该 meta 标签的作用是让当前 viewport 的宽度等于设备的宽度，同时不允许用户手动缩放。也许允不允许用户缩放不同的网站有不同的要求，但让 viewport 的宽度等于设备的宽度，这个应该是大家都想要的效果，如果你不这样的设定的话，那就会使用那个比屏幕宽的默认 viewport，也就是说会出现横向滚动条。

meta viewport 标签首先是由苹果公司在其 safari 浏览器中引入的，目的就是解决移动设备的 viewport 问题。后来安卓以及各大浏览器厂商也都纷纷效仿，引入对 meta viewport 的支持。

### meta viewport 属性

| 属性           | 说明                                                              |
| -------------- | ----------------------------------------------------------------- |
| width          | 设置 layout viewport 的宽度，为一个正整数，或字符串"width-device" |
| initial-scale  | 设置页面的初始缩放值，为一个数字，可以带小数                      |
| minimum-scale  | 允许用户的最小缩放值，为一个数字，可以带小数                      |
| maximum-scale  | 允许用户的最大缩放值，为一个数字，可以带小数                      |
| height         | 设置 layout viewport 的高度                                       |
| user-scalable  | 是否允许用户进行缩放，值为"no"或"yes"                             |

---

## 参考

- [移动端高清、多屏适配方案](http://div.io/topic/1092)
- [可伸缩布局方案](https://github.com/amfe/lib-flexible)
- [antd mobile 0.8 以上版本「高清」方案设置](https://github.com/ant-design/ant-design-mobile/wiki/antd-mobile-0.8-以上版本「高清」方案设置)
- [viewport meta](https://developer.mozilla.org/zh-CN/docs/Mobile/Viewport_meta_tag)
