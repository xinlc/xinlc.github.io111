
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
- `Android Studio` 默认安装最新的 `Android SDK`。可以通过 `Android Studio` 中的 `SDK Manager` 安装其他 Android SDK。`Preferences → Appearance & Behavior → System Settings → Android SDK.`
- 从SDK Manager中选择`SDK Platforms`选项卡，然后选中右下角`Show Package Details`。查找并展开`Android 9 (Pie)`，然后确保选中以下项目：
- `Android SDK Platform 28`
- `Intel x86 Atom_64 System Image` 或 `Google APIs Intel x86 Atom System Image`
- 选择`SDK Tools`选项卡，然后选中右下角`Show Package Details`。查找并展开`Android SDK Build-Tools`，然后选中`28.0.3`。最后，点击`Apply`下载并安装`Android SDK`和相关的构建工具。
- 配置环境变量, `$HOME/.bashrc` (推荐使用 `zsh`, `$HOME/.zshrc`) 加入如下内容：
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
#### 为 App 签名
1. 生成私有签名密钥 `keytool`。
- 在Windows上keytool运行在 `C:\Program Files\Java\jdkx.x.x_x\bin`
- 在Mac上，如果不确定`jdk bin`文件夹的位置，可以运行下面命令
```bash
# 1. 输入下面命，会返回jdk文件夹
/usr/libexec/java_home # 返回/Library/Java/JavaVirtualMachines/jdkX.X.X_XXX.jdk/Contents/Home

# 2. 此命令会提示输入密钥库和密钥，然后它将密钥库生成为一个名为my-release-key.keystore文件。
# 密钥库包含一个密钥，有效期为10000天。别名是稍后在签署应用时使用的名称。
keytool -genkeypair -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 或用下面这条命令
# sudo keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```
> 注意：请记住将密钥库文件保密, 最好不要上传到版本控制里。

3. 配置`gradle`变量
- 将`my-release-key.keystore`文件放在`android/app`项目文件夹中的目录下。
- 编辑文件`~/.gradle/gradle.properties`或`android/gradle.properties`，并添加以下内容（替换*****为正确的密钥库密码, 别名和密钥密码）
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=*****
MYAPP_RELEASE_KEY_PASSWORD=*****
```

4. 将签名配置添加到应用程序的gradle配置中, 编辑`android/app/build.gradle`项目文件夹中的文件，然后添加签名配置
```gradle
...
android {
  ...
  defaultConfig { ... }
  signingConfigs {
    release {
      if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
        storeFile file(MYAPP_RELEASE_STORE_FILE)
        storePassword MYAPP_RELEASE_STORE_PASSWORD
        keyAlias MYAPP_RELEASE_KEY_ALIAS
        keyPassword MYAPP_RELEASE_KEY_PASSWORD
      }
    }
  }
  buildTypes {
    release {
      ...
      signingConfig signingConfigs.release
    }
  }
}
...

```
5. 生成发布APK
```bash
cd android

./gradlew assembleRelease
#./gradlew bundleRelease
```

## 性能调优
### 移除 `console.log` 语句
在运行打好了离线包的应用时，控制台打印语句可能会极大地拖累 JavaScript 线程。
使用 `babel-plugin-transform-remove-console` 来移除`console.*`

```bash
# 安装插件
yarn add --dev babel-plugin-transform-remove-console
```
然后在项目根目录下编辑（或者是新建）一个名为 `babel.config.js`或`.babelrc` 的文件，在其中加入：
```json
{
  "env": {
    "production": {
      "plugins": ["transform-remove-console"]
    }
  }
}
```

### 拆包(RAM bundles)和内联引用
如果你有一个较为庞大的应用程序，你可能要考虑使用RAM(Random Access Modules，随机存取模块）格式的 bundle 和内联引用。这对于具有大量页面的应用程序是非常有用的，这些页面在应用程序的典型使用过程中可能不会被打开。通常对于启动后一段时间内不需要大量代码的应用程序来说是非常有用的。例如应用程序包含复杂的配置文件屏幕或较少使用的功能，但大多数会话只涉及访问应用程序的主屏幕更新。我们可以通过使用RAM格式来优化bundle的加载，并且内联引用这些功能和页面（当它们被实际使用时）

#### 加载 JavaScript
在 react-native 执行 JS 代码之前，必须将代码加载到内存中并进行解析。如果你加载了一个 50MB 的 bundle，那么所有的 50mb 都必须被加载和解析才能被执行。RAM 格式的 bundle 则对此进行了优化，即启动时只加载 50MB 中实际需要的部分，之后再逐渐按需加载更多的包。

#### 内联引用
内联引用(require 代替 import)可以延迟模块或文件的加载，直到实际需要该文件。一个基本的例子看起来像这样：

##### 优化前
```js
import React, { Component } from 'react';
import { Text } from 'react-native';
// ... import some very expensive modules

// You may want to log at the file level to verify when this is happening
console.log('VeryExpensive component loaded');

export default class VeryExpensive extends Component {
  // lots and lots of code
  render() {
    return <Text>Very Expensive Component</Text>;
  }
}
```

##### 优化后
```js
import React, { Component } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';

let VeryExpensive = null;

export default class Optimized extends Component {
  state = { needsExpensive: false };

  didPress = () => {
    if (VeryExpensive == null) {
      VeryExpensive = require('./VeryExpensive').default;
    }

    this.setState(() => ({
      needsExpensive: true,
    }));
  };

  render() {
    return (
      <View style={{ marginTop: 20 }}>
        <TouchableOpacity onPress={this.didPress}>
          <Text>Load</Text>
        </TouchableOpacity>
        {this.state.needsExpensive ? <VeryExpensive /> : null}
      </View>
    );
  }
}
```
> 即便不使用 RAM 格式，内联引用也会使启动时间减少，因为优化后的代码只有在第一次 require 时才会执行。

#### 启用 RAM 格式

在 iOS 上使用 RAM 格式将创建一个简单的索引文件，React Native 将根据此文件一次加载一个模块。在 Android 上，默认情况下它会为每个模块创建一组文件。你可以像 iOS 一样，强制 Android 只创建一个文件，但使用多个文件可以提高性能，并降低内存占用。

在 Xcode 中启用 RAM 格式，需要编辑 `build phase` 里的`"Bundle React Native code and images"`。在`../node_modules/react-native/scripts/react-native-xcode.sh`中添加 `export BUNDLE_COMMAND="ram-bundle"`:

```bash
export BUNDLE_COMMAND="ram-bundle"
export NODE_BINARY=node
../node_modules/react-native/scripts/react-native-xcode.sh
```

在 Android 上启用 RAM 格式，需要编辑 `android/app/build.gradle` 文件。在`apply from: "../../node_modules/react-native/react.gradle"`之前修改或添加`project.ext.react`：

```gradle
project.ext.react = [
  bundleCommand: "ram-bundle",
]
```

如果在 Android 上，你想使用单个索引文件（如前所述），请在 Android 上使用以下行：

```gradle
project.ext.react = [
  bundleCommand: "ram-bundle",
  extraPackagerArgs: ["--indexed-ram-bundle"]
]
```

#### 配置预加载及内联引用

现在我们已经启用了RAM格式，然而调用`require`会造成额外的开销。因为当遇到尚未加载的模块时，`require`需要通过bridge来发送消息。这主要会影响到启动速度，因为在应用程序加载初始模块时可能触发相当大量的请求调用。幸运的是，我们可以配置一部分模块进行预加载。为了做到这一点，你将需要实现某种形式的内联引用。

#### 调试预加载的模块

在您的根文件 (index.(ios|android).js) 中，您可以在初始导入(initial imports)之后添加以下内容：

```js
const modules = require.getModules();
const moduleIds = Object.keys(modules);
const loadedModuleNames = moduleIds
  .filter(moduleId => modules[moduleId].isInitialized)
  .map(moduleId => modules[moduleId].verboseName);
const waitingModuleNames = moduleIds
  .filter(moduleId => !modules[moduleId].isInitialized)
  .map(moduleId => modules[moduleId].verboseName);

// make sure that the modules you expect to be waiting are actually waiting
console.log(
  'loaded:',
  loadedModuleNames.length,
  'waiting:',
  waitingModuleNames.length
);

// grab this text blob, and put it in a file named packager/modulePaths.js
console.log(`module.exports = ${JSON.stringify(loadedModuleNames.sort())};`);
```

当你运行你的应用程序时，你可以查看 console 控制台，有多少模块已经加载，有多少模块在等待。你可能想查看 moduleNames，看看是否有任何意外。注意在首次 import 时调用的内联引用。你可能需要检查和重构，以确保只有你想要的模块在启动时加载。请注意，您可以根据需要修改 Systrace 对象，以帮助调试有问题的引用。

```js
require.Systrace.beginEvent = (message) => {
  if(message.includes(problematicModule)) {
    throw new Error();
  }
}
```

虽然每个 App 各有不同，但只加载第一个页面所需的模块是有普适意义的。当你满意时，把 loadedModuleNames 的输出放到 packager/modulePaths.js 文件中。

#### 更新配置文件(metro.config.js)
现在我们需要在项目的根目录中更新`metro.config.js`来使用我们新生成的`modulePaths.js`文件:

```js
const modulePaths = require('./packager/modulePaths');
const resolve = require('path').resolve;
const fs = require('fs');

// Update the following line if the root folder of your app is somewhere else.
// const ROOT_FOLDER = resolve(__dirname, '..');
const ROOT_FOLDER = resolve(__dirname, '.');

const config = {
  transformer: {
    getTransformOptions: () => {
      const moduleMap = {};
      modulePaths.forEach(path => {
        if (fs.existsSync(path)) {
          moduleMap[resolve(path)] = true;
        }
      });
      return {
        preloadedModules: moduleMap,
        transform: { inlineRequires: { blacklist: moduleMap } },
      };
    },
  },
  projectRoot: ROOT_FOLDER,
};

module.exports = config;
```

在启用RAM格式之后，配置文件中的`preloadedModules`条目指示哪些模块需要预加载。当 bundle 被加载时，这些模块立即被加载，甚至在任何 requires 执行之前。blacklist 表明这些模块不应该被要求内联引用，因为它们是预加载的，所以使用内联没有性能优势。实际上每次解析内联引用 JavaScript 都会花费额外的时间。

## 常见问题
持续更新中……

### RN Issues
#### FlatList 中 使用 TextInput, 会自动失去焦点。
- [issues/23916](https://github.com/facebook/react-native/issues/23916)
解决：
> 加入 FlatList.removeClippedSubviews={false}

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

#### android 9 release 打包不能联网(http)
[android-9.0-changes-28](https://developer.android.google.cn/about/versions/pie/android-9.0-changes-28)


默认情况下启用网络传输层安全协议 (TLS)   
如果你的应用以 Android 9 或更高版本为目标平台，则默认情况下 isCleartextTrafficPermitted() 函数返回 false。 如果你的应用需要为特定域名启用明文，您必须在应用的网络安全性配置中针对这些域名将 cleartextTrafficPermitted 显式设置为 true。

在`src/main/res`中创建`xml`文件夹，并创建`network_security_config.xml`文件:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
```
在`src/main/androidManifest.xml` 添加:
```xml
...
<application
  ...
  android:networkSecurityConfig="@xml/network_security_config"
  ...
  >
    ...
</application>
...
```

#### Chrome调试时 setTimeout 和 setInterval 失效
[issues/9436](https://github.com/facebook/react-native/issues/9436)

解决：
- 关闭调试
- 需要将调试计算机与设备同步。在您的计算机上执行：

```bash
adb shell su root "date `date +%m%d%H%M%Y.%S`"
```

#### 生成Release包之前最好先运行 react-native run-android，别问为什么……

## RN 常用组件库
- [js-coach](https://js.coach/) `查找第三方库` 
- [react-native-router-flux](https://github.com/aksonov/react-native-router-flux) `声明式路由` 
- [react-navigation](https://reactnavigation.org/docs/en/getting-started.html) `官方推荐路由` 
- [react-native-vector-icons](https://github.com/oblador/react-native-vector-icons) `字体图标，可自定义` 
- [react-native-splash-screen](https://github.com/crazycodeboy/react-native-splash-screen) `闪屏` 
- [react-native-camera](https://github.com/react-native-community/react-native-camera) `相机，可扫二维码` 
- [react-native-image-crop-picker](https://github.com/ivpusic/react-native-image-crop-picker) `图片选中，可裁剪` 
- [react-native-permissions](https://github.com/react-native-community/react-native-permissions) `获取权限` 
- [react-native-calendars](https://github.com/wix/react-native-calendars) `日历组件` 
- [react-native-contacts](https://github.com/rt2zz/react-native-contacts) `获取通讯录` 
- [react-native-device-info](https://github.com/react-native-community/react-native-device-info) `获取设备信息` 
- [react-native-image-gallery](https://github.com/archriss/react-native-image-gallery) `图片浏览` 
- [code push](https://github.com/Microsoft/react-native-code-push) `APP热更新` 
- [moment](https://github.com/moment/moment/) `日期处理` 
- [axios](https://github.com/axios/axios) `http库` 
- [immutable](https://github.com/immutable-js/immutable-js) `不可变数据` 
- [lodash](https://www.lodashjs.com/docs/latest) `常用工具库` 

## 参考
- [react](https://reactjs.org/)
- [react-native](https://facebook.github.io/react-native/)
- [react-native-components](https://facebook.github.io/react-native/docs/view)
- [ant-design-mobile](https://mobile.ant.design/index-cn)
- [redux](https://github.com/reactjs/redux)
- [redux-cn](https://www.redux.org.cn)
- [react-redux](https://react-redux.js.org/)
- [redux-sage](https://redux-saga-in-chinese.js.org)
- [iron-redux](https://github.com/nefe/iron-redux)
- [redux-actions](https://github.com/redux-utilities/redux-actions)
- [TypeScript](https://github.com/microsoft/TypeScript)
- [TypeSearch](https://github.com/Microsoft/TypeSearch)
- [yarn](https://github.com/yarnpkg/yarn)
- [dva](https://github.com/dvajs/dva)
- [mobx](https://github.com/mobxjs/mobx)