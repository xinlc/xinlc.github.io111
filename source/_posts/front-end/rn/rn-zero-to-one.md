
---
title: React Native 之 从0到1
date: 2019-08-03 10:31:00
categories: RN
tags: 
  - template
---

React Native 从入门到入坑！
项目[模板](https://github.com/xinlc/react-native-typescript-template)
<!--more-->

## 环境搭建
### IOS
- 系统：MacOS
- XCode：10.3
- RN：0.60
- 使用 [Homebrew](https://brew.sh/) 安装软件

安装相关软件：
```bash
brew install node       # 推荐使用 nvm 管理 node
brew install yarn       # 使用 yarn 管理 npm
brew install watchman   # 文件监听
brew install cocoapods  # ios 依赖管理
brew tap AdoptOpenJDK/openjdk
brew cask install adoptopenjdk8
```

初始化项目：
```bash
# 安装 cli
yarn global add react-native-cli

# 初始化项目, 安装pods文件可能需要翻墙
react-native init AwesomeProject
# or
react-native init AwesomeProject --version X.XX.X
```

运行：
```bash
cd AwesomeProject
react-native run-ios
```

### Android
- 下载安装 [Android Studio](https://developer.android.com/studio/index.html)
- `Android Studio` 默认安装最新的 `Android SDK`。可以通过 `Android Studio` 中的 `SDK Manager` 安装其他 Android SDK。
- 配置环境变量, `$HOME/.bashrc` (推荐使用 `zsh`) 加入如下内容：
```bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### VSCode
推荐安装：
- `ESLint`
- `Prettier`
- `TabNine`
- `Reactjs code snippets`
- `React-Native/React/Redux snippets for es6/es7`
- `Project Manager`
- `Search node_modules`
- `Guides`
- `Color Highlight`
- `vscode-icons`
- `Import Cose`

添加配置如下：
```json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    {
      "language": "typescript",
      "autoFix": true
    },
    {
      "language": "typescriptreact",
      "autoFix": true
    }
  ]

}
```

## [react-native-typescript-template](https://github.com/xinlc/react-native-typescript-template) 使用
项目使用的技术栈：
- 使用 `TypeScript` 开发，用了就知道，比 `Flow` 好很多。
- 函数式组件 [React Hooks](https://reactjs.org/docs/hooks-intro.html)
- `redux` 状态管理。
- `redux-saga` 解决组件副作用，业务抽离。
- `react-native-router-flux` Router管理。
- `ant-design` 组件库。
- `axios` http 管理。

```bash
# 1. 克隆本项目
git clone https://github.com/xinlc/react-native-typescript-template

# 2. 安装依赖
# RN 0.60 支持自动Link, https://github.com/react-native-community/cli/blob/master/docs/autolinking.m
# 字体需要单独 Link
react-native link
react-native link @ant-design/icons-react-native

yarn install

# 可能需要翻墙
cd ios & pod install

3. 运行
# Development server
yarn start

# IOS
react-native run-ios

# Android
react-native run-android 

```

Debugger 相关命令：
```bash
react-devtools
adb reverse tcp:8097 tcp:8097

adb devices
adb -s <device name> reverse tcp:8081 tcp:8081
adb reverse tcp:8081 tcp:8081

adb shell input keyevent 82
```

## TypeScript 配置
[tsconfig.json](https://github.com/xinlc/react-native-typescript-template/blob/master/tsconfig.json) 参考

1. 安装相关依赖：
```bash
yarn add --dev typescript
yarn add --dev react-native-typescript-transformer
yarn tsc --init --pretty --jsx react
touch rn-cli.config.js
yarn add --dev @types/react @types/react-native
```

2. 配置 `rn-cli.config.js`, 没有就在项目根目录下新建。
```js
module.exports = {
  getTransformModulePath() {
    return require.resolve('react-native-typescript-transformer');
  },
  getSourceExts() {
    return ['ts', 'tsx'];
  },
};
```

3. 项目根目录的 `index.js` 需要使用 `.js` 扩展，其他文件就可以使用 `.ts` 或 `.tsx` 了。


## 图标&启动图设置
推荐使用[图标工厂](https://icon.wuruihong.com/)

### 图标
#### IOS
在 XCode 中：
1. 点击 `Images.scassets` 删除 `Appicon`。
2. 将生成好的 `AppIcon.appiconset` 拖入 `Images.scassets` 空白面板。

#### Android
1. 替换 `android/app/src/main/res` 下的图标
2. 修改 `android/app/src/main/AndroidManifest.xml`
```diff
...
  <application
    android:name=".MainApplication"
    android:label="@string/app_name"
    android:icon="@mipmap/ic_launcher"
-    android:roundIcon="@mipmap/ic_launcher_round"
    android:allowBackup="false
...

```

### 启动图
这里使用 [react-native-splash-screen](https://github.com/crazycodeboy/react-native-splash-screen)

```bash
# 安装
yarn add react-native-splash-screen
```

#### IOS
1. 重新安装 `Pods` 依赖
```bash
cd ios & pod install
```
2. 更新 `AppDelegate.m` 并添加如下内容
```Objective-C
#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import "RNSplashScreen.h"  // here

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    // ...other code

    [RNSplashScreen show];  // here
    // or
    //[RNSplashScreen showSplash:@"LaunchScreen" inRootView:rootView];
    return YES;
}

@end
```
3. 添加 `LaunchImage`
- 点击 `Images.scassets` 右测空白面板，右键 `App Icons & Launch Images` ➜ 
`New IOS Launch Image`
- 可以在属性中去掉一些不需要支持的版本
- 把切好的图愉快的拖入对应框中吧

4. 设置为 `Launch Image`启动
- 点击 `LaunchScreen.xib` ➜ `View` ➜ `Use as Launch Screen`
- `General` ➜ `App Icons and Launch Iamges` ➜ `Launch Images Source` 选择 `LaunchImage`
- 清空 `Launch Screen File`

5. 在你的首页中关闭闪屏
```js
import SplashScreen from 'react-native-splash-screen';
export default class WelcomePage extends Component {
  componentDidMount() {
    // do stuff while splash screen is shown
    // After having done stuff (such as async tasks) hide the splash screen
    SplashScreen.hide();
  }
}
```

#### Android

1. 更新 `MainActivity.java` 并添加如下内

```java
import android.os.Bundle; // here
import com.facebook.react.ReactActivity;
import org.devio.rn.splashscreen.SplashScreen; // here

public class MainActivity extends ReactActivity {
   @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.show(this);  // here
        super.onCreate(savedInstanceState);
    }
    // ...other code
}
```

2. 在 `app/src/main/res/layout` 中创建 `launch_screen.xml` 并添加如下内容
```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:orientation="vertical" android:layout_width="match_parent"
    android:layout_height="match_parent">
    <ImageView android:layout_width="match_parent" android:layout_height="match_parent" android:src="@drawable/launch_screen" android:scaleType="centerCrop" />
</RelativeLayout>
```
3. 添加 `launch_screen.png` 到 `drawable-xxx`
4. 在 `app/src/main/res/values/colors.xml` 添加如下内容
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="primary_dark">#000000</color>
</resources>
```

> P.S. 在 Android 闪屏效果不是很好，会有一瞬间白屏。可以在 `MainActivity` 上加背景图。

## 打包发布
### IOS
待完善……
### Android
待完善……

## 常见问题
持续更新中……
### IOS

#### 添加简体字语言包
在 XCode 中点击你的项目 ➜ `PROJECT` ➜ `你的项目名` ➜ `Info` ➜ `Localizations` ➜ `Chinese(Simplified)`

### Android

#### 关闭PNG合法性检查
```gradle
android {
  ...
  // fix appt is not a png issue when build
  aaptOptions {
    cruncherEnabled = false
  }
  ...
}
```


## 参考
- [react-native](https://facebook.github.io/react-native/)
- [react-native-components](https://facebook.github.io/react-native/docs/view)
- [react-native-router-flux](https://github.com/aksonov/react-native-router-flux)
- [react-navigation](https://reactnavigation.org/docs/en/getting-started.html)
- [react-native-vector-icons](https://github.com/oblador/react-native-vector-icons)
- [ant-design-mobile](https://mobile.ant.design/index-cn)
- [react-native-splash-screen](https://github.com/crazycodeboy/react-native-splash-screen)
- [redux](https://github.com/reactjs/redux)
- [redux-cn](https://www.redux.org.cn)
- [react-redux](http://cn.redux.js.org/docs/react-redux/)
- [redux-sage](https://redux-saga-in-chinese.js.org)
- [TypeScript](https://github.com/microsoft/TypeScript)
- [TypeSearch](https://github.com/Microsoft/TypeSearch)
- [axios](https://github.com/axios/axios)
- [immutable](https://github.com/immutable-js/immutable-js)
- [moment](https://github.com/moment/moment/)
- [lodash](https://www.lodashjs.com/docs/latest)
- [yarn](https://github.com/yarnpkg/yarn)