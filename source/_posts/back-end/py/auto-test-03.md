---
title: 测试开发入门与实战（三）
date: 2021-07-07 09:36:00
categories: Python
tags:
  - Testing
---

自动化测试 POM 设计，DDT。

<!--more-->

## 如虎添翼，API 和 UI 自动化测试融合

### 为什么要融合 API 测试和 UI 测试？

当你完成了第一个 Web 自动化测试框架和 API 自动化测试框架的搭建后，你会考虑这样一个问题：“这两个框架能融合吗？”

我们在分层测试那个章节讲过，在测试中，应该不断地去调整我们的测试用例，把测试的能力下沉，也就是**多做底层的测试**。那么如果我们能够实现 Web 自动化测试框架和 API 自动化测试框架的融合，这就意味着**针对同一个功能， 不必 API 层覆盖一次，UI 层再覆盖一次**。

还有自动化测试在日常工作中，除去用于日常的功能回归外，还有一部分核心业务对应的测试用例是用作 Smoke Test。特别是自动化测试集成到 CI/CD 平台后，开发人员的每一次代码提交，都将会触发这个测试，如果这个测试不通过，那么开发的代码是无法提交到 develop 分支的。

**这就带来了以下显而易见的需求。**

- 确保构建失败一定不是由自动化测试代码本身引起的。

当开发人员提交新代码时，构建系统依据最新的代码打包进行环境部署，之后将在这个环境上调用自动化测试来确保新的代码没有问题。

当测试失败，开发的代码必然不能提交，于是开发将会仔细检查出错的位置来寻找出错的 root cause。如果有多次发现错误的原因是由测试代码本身引起的，那么必然会招致开发人员反感，进而影响自动化测试跟 CI/CD 系统进一步集成。

- 如何缩短自动化测试代码的整体运行时长？

自动化测试代码的整体运行时间越短越好，开发等待测试验证的时间越短，越认可测试这一工种；反之，测试人员的产出不仅得不到认可，还会客观上拖慢发布速度，降低开发效率。整体来说，这部分验证以 5~10 分钟最好，最好不要超过 30 分钟。

**那么怎么让自动化测试脚本的运行既稳定又耗时短呢？**

- 尽可能多地把核心业务放到 API 层进行功能验收。

这个容易理解，即多个接口请求串连，以达到验证业务功能的目的。

- 端到端自动化测试， “非测试部分”尽量用 API 请求代替。

日常测试，特别是在 UI 自动化测试中，非测试部分往往占据了比测试部分还要多的时间，我们知道链条越长，越容易出问题，故必须把“非测试部分”简化。

什么是“非测试部分”？一切自动化测试都遵循如下顺序：各种操作使应用程序到达待测试状态 — 开始测试 — 测试验证。 在这个顺序中，“开始测试”前的所有操作都属于非测试部分，这部分最好用 API 代替。

> 举个例子，我们要测试下单功能，只有下单这个操作本身才是我们的测试范围， 在下单之前的所有操作，例如用户注册—用户登录—用户绑卡—选定商品，这一系列操作都属于“非测试部分”。

### API 测试和 UI 测试融合的关键点

我们来看下阻挠这两个框架融合的关键点在哪里？仍然以下单为例， 我们的步骤是：**用户注册 — 用户登录 — 用户绑卡 — 选定商品—下单 — 验证下单成功**。黑色粗体部分应该简化，尽可能少的占用我们的测试时间，因为它们不是本次测试的目标。

我们可以直接操作 DB 或者通过 API 接口请求来简化，那么这两种方式孰优孰劣呢？

先看下直接操作 DB，创建一个账户并绑定银行卡，选定好商品。这个速度很快，但直接 DB 操作通常比较麻烦，特别是数据表的关联太多，还容易出错。

那么就剩下 API 接口请求了，假设我们 API 接口请求全部操作成功了，现在应用程序已经到达待测试状态，我们需要通过 UI 自动化测试来继续后续的操作。

那么问题来了，如何才能直接操作浏览器继续下单呢？服务器允许我直接访问下单页面吗？下单时服务器知道是我在下单吗？

我们来逐一解答。要下单，我必须知道我买了哪些商品，下单的 URL 链接要有。假设我有下单的 URL 链接，我可以直接通过浏览器直接访问这个链接，但是通常应用程序必须要求我登录才行；假设我登录了，我下单但同时别人也在下单， 服务器能区分哪个订单是我下的，哪个订单是别人下的吗？

**于是所有这些问题都指向：如何在会话（Session）中保持登录态？**

### 在会话中保持登录态

我们都知道 HTTP 协议是无状态的协议，多个 HTTP 请求之间，是不会保存状态信息的。也就说，你发一个请求过来，服务器不知道是你发的还是别人发的，要想保持这个登录的状态，必须有 Cookie、Session 甚至 Token 的支持才行。

- **Cookie**：为了辨别用户身份进行 Session 跟踪，而储存在用户本地终端上的数据（通常经过加密），由用户客户端计算机暂时或永久保存。

- **Session**：称为“会话控制”。

Session 对象存储特定用户会话所需的属性及配置信息。当用户在应用程序的 Web 页之间跳转时，存储在 Session 对象中的变量将不会丢失，而是在整个用户会话中一直存在下去。当用户请求来自应用程序的 Web 页时，如果该用户还没有会话，则 Web 服务器将自动创建一个 Session 对象。当会话过期或被放弃后，服务器将终止该会话。

- **Token**：是服务端生成的一串字符串，作为客户端进行请求的一个标识。

当用户第一次登录后，服务器生成一个token并将此token返回给客户端，以后客户端只需带上这个token前来请求数据即可，无须再次带上用户名和密码。

### 融合 API 测试和 UI 自动化测试 — 代码实践

通过上面小节的学习，我们已经知道关键点在于登录态的保持。而把 API 测试和 UI 测试融合， 我们还需要：

- 各个接口请求之间保持登录态；
- 各个 UI 请求中保持登录态；
- 当从 API 请求切换到 UI 操作时，登录态应该从接口请求中带过来。

第一点，各个接口请求之间保持登录态，可以通过 requests.Session() 完成。

第二点，假设我们操作浏览器登录，那么登录后，浏览器的 Cookies 里会保存维持登录状态的 cookie。那么唯一的问题就出现了——如何不通过浏览器登录，而把 API 登录后的状态保存到浏览器 cookie 里？

下面我们来看一个真实的例子：假设我要访问 https://ones.ai/project/ 这个网站，我的需求是登录后检查我的项目 VIPTEST 是否存在，如下图所示：

下面直接上代码，看下我是如何融合 API 和 UI 测试的。

```python
# test_ones.py
# -*- coding: utf-8 -*- 
import json

import requests
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
# 把获取的cookie转换成Selenium/WebDriver能识别的格式
def cookie_to_selenium_format(cookie):
    cookie_selenium_mapping = {'path': '', 'secure': '', 'name': '', 'value': '', 'expires': ''}
    cookie_dict = {}
    if getattr(cookie, 'domain_initial_dot'):
        cookie_dict['domain'] = '.' + getattr(cookie, 'domain')
    else:
        cookie_dict['domain'] = getattr(cookie, 'domain')
    for k in list(cookie_selenium_mapping.keys()):
        key = k
        value = getattr(cookie, k)
        cookie_dict[key] = value
    return cookie_dict

class TestOneAI:
    # 在pytest里，针对一个类方法的setup为setup_method,
    # setup_method作用同unittest里的setUp()
    def setup_method(self, method):
        self.s = requests.Session()
        self.login_url = 'https://ones.ai/project/api/project/auth/login'
        self.home_page = 'https://ones.ai/project/#/home/project'
        self.header = {
            "user-agent": "user-agent: Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36",
            "content-type": "application/json"}
        self.driver = webdriver.Chrome()
    # 使用了pytest里的参数化
    @pytest.mark.parametrize('login_data, project_name', [({"password": "iTestingIsGood", "email": "pleasefollowiTesting@outlook.com"}, {"project_name":"VIPTEST"})])
    def test_merge_api_ui(self, login_data, project_name):
        # 接口登录
        result = self.s.post(self.login_url, data=json.dumps(login_data), headers=self.header)
        # 断言登录成功
        assert result.status_code == 200
        assert json.loads(result.text)["user"]["email"].lower() == login_data["email"]
        # 根据实际情况解析cookies，此处需结合业务场景
        all_cookies = self.s.cookies._cookies[".ones.ai"]["/"]

        # 删除所有cookies
        self.driver.get(self.home_page)
        self.driver.delete_all_cookies()

        # 把接口登录后的cookie塞到Selenium driver里去，传递登录状态
        for k, v in all_cookies.items():
            self.driver.add_cookie(cookie_to_selenium_format(v))

        # 再次访问目标页面，此时登录状态已经传递过来了
        self.driver.get(self.home_page)

        # 查找项目元素，获取元素的值，并进行断言
        # 注意，此时我浏览器操作就不需再登录了
        try:
            element = WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[class="company-title-text"]')))
            # 断言我的项目存在
            assert element.get_attribute("innerHTML") == project_name["project_name"]
        except TimeoutError:
            raise TimeoutError('Run time out')
    # 在pytest里，针对一个类方法的teardown为teardown_method,
    # teardown_method作用同unittest里的dearDown()
    def teardown_method(self, method):
        self.s.close()
        self.driver.quit()
```

直接在命令行执行：

```bash
pytest test_ones.py
```

### 融合 API 测试和 UI 自动化测试 — 代码解析

上面这段代码不算复杂，我来逐一解释下：

1. 首先，我创建了一个 .py 文件在 lagouAPITest 下的 tests 文件夹中，名为 test_ones.py.

2. 接着，我定义了一个方法 cookie_to_selenium_format 用来进行 cookie 解析和转换。

为什么要定义这个方法？ 因为通过接口 requests.Session() 发送请求拿到的 cookies 格式，与通过浏览器（self.driver.get_cookies()）拿到的 cookies 格式是不一样的。接口请求拿到的 cookie 要想在浏览器里使用，必须转换成浏览器支持的格式。

> cookie_to_selenium_format 是一个通用的方法，你同样可以将其用到其他网站。

3. 其次，我创建了一个测试类 TestOneAI，并设置了 setup 和 teardown 操作。

setup_method 用于测试开始前初始化 requests.Session() 实例，以及 WebDriver 实例，并且指定了接口请求使用的接口地址和通过 UI 直接访问的页面地址。teardown_method 用于测试结束后关闭 Session，以及 WebDriver 实例。

4. 然后，我创建了我们的测试方法 test_merge_api_ui。

在这个测试方法里，我首先是要 self.s，即 requests.Session() 进行**接口登录；登录成功后，我解析获取到的 cookies，并通过刚刚提到的函数 cookie_to_selenium_format 转换为 Selenium/webDriver 可以识别的 cookie 格式；然后把拿到的每一个 cookie，使用 Selenium 里的 add_cookie 方法塞到浏览器的 Driver 里**。因为这些 cookies 中保留了登录的信息，所以当此操作完成后，我再使用浏览器进行页面操作，就无须登录了。

由此，API 测试和 UI 测试就融合了。在后续测试中，我可以按照需要或者直接发送接口请求，或者通过 UI 访问，就都不会出错了。因为登录信息已经在 self.s.cookies 和 self.driver 里保存了。

## 如何使用 Page Object 设计模型？

### 什么是 PageObject 设计模型？

PageObject 设计模型是在自动化测试过程中普遍采用的一种设计模式。它通过对页面对象（实际的 UI 页面，或者是逻辑上的页面）进行抽象，使得你的代码能在页面元素发生改变时，**尽量少地更改，以最大程度地支持代码重用和避免代码冗余。**

### PageObject 设计模型的特征

目前，并没有一种统一的格式（format）来告诉你如何设计 PageObject，只要你设计的代码将页面元素和测试代码分离，你都可以说你使用了 PageObject。

一般情况下，实现了 PageObject 的代码往往具备如下特征：

1. 页面封装成 Page 类，页面元素为 Page 类的成员元素，页面功能放在 Page 类方法里。

将一个页面（或者待测试对象）封装成一个类（Class），把它称作 Page 类。Page 类里包括了这个页面（或者待测试对象）上的所有的元素，以及针对页面元素的操作方法（单步操作或者多步操作，一般会定义类方法）。注意：这个Page 类里仅仅包括当前页面，一般不包括针对其他页面的操作。

2. 针对这个 Page 类定义一个测试类，在测试类调用 Page 类的各个类方法完成测试。

也就是测试代码和被测试页面的页面代码解耦，当页面本身发生变化，例如元素定位发生改变、页面布局改变后，仅需要更改相对应的 Page 类的代码，而无须更改测试类的代码。

PageObject 模式减少了代码冗余，可以使业务流程变得清晰易读，降低了测试代码维护成本。

### PageObject 的实现

根据上述特点，我们来看下一个 PageObject 的经典设计：

![1][1]

可以看到，在**测试类**里，我们会定义许多**测试方法**，这些测试方法里，会含有对**页面对象实例**的调用；而**页面对象实例**，是通过**页面对象**类进行初始化操作生成的；对于许**多页面对象类**都存在的通用操作，我们会提取到**页面对象基类**里。

通过这种方法，我们就实现了：

- 一个页面元素在整个项目中，仅存在一处定义，其他都是调用；
- Page 类通用的操作进一步提取到 BasePage 类，减少了代码冗余。

### PageObject 的 Python 库

在 Python 里，有专门针对 PageObject 的 Python 库 Page Objects。使用 Page Objects 可以迅速实现 PageObject 模式，下面来看下 Page Objects 库的使用。

- 安装：

```python
pip install page_objects
```

- 应用：

```python
# 以下为官方示例
>>> from page_objects import PageObject, PageElement
>>> from selenium import webdriver
>>> class LoginPage(PageObject):
        username = PageElement(id_='username')
        password = PageElement(name='password')
        login = PageElement(css='input[type="submit"]')
>>> driver = webdriver.PhantomJS()
>>> driver.get("http://example.com")
>>> page = LoginPage(driver)
>>> page.username = 'secret'
>>> page.password = 'squirrel'
>>> assert page.username.text == 'secret'
>>> page.login.click()
```

### 项目实战 —— PageObject 应用

好，我们不仅了解了 PageObject 的理论，也了解了 page_objects 这个 Python 库的使用。

现在，我们给我们的项目应用 pageObject 模型。

#### 第一步：改造项目结构

我们来按照 PageObject 的实现来改造我们的项目结构。改造前，我们的目录结构：

```bash
|--lagouAPITest
    |--tests
        |--test_ones.py
        |--__init__.py
    |--common
        |--__init__.py
```

使用 PageObject 改造后，我们期望的目录结构：

```bash
|--lagouAPITest
    |--pages
        |--ones.py
        |--base_page.py
    |--tests
        |--test_ones.py
        |--__init__.py
    |--common
        |--__init__.py
```

改造后，我们把原本的 tests 目录下的 test_ones.py 里关于页面元素的操作全部剥离到 pages 文件夹下的 ones.py 里，然后针对可能的公用的操作，我们进一步抽象到 base_page.py 里去。

下面先看下原来 tests 文件夹下 test_ones.py 的内容：

```python
# -*- coding: utf-8 -*-
import json
import requests
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def cookie_to_selenium_format(cookie):
    cookie_selenium_mapping = {'path': '', 'secure': '', 'name': '', 'value': '', 'expires': ''}
    cookie_dict = {}
    if getattr(cookie, 'domain_initial_dot'):
        cookie_dict['domain'] = '.' + getattr(cookie, 'domain')
    else:
        cookie_dict['domain'] = getattr(cookie, 'domain')
    for k in list(cookie_selenium_mapping.keys()):
        key = k
        value = getattr(cookie, k)
        cookie_dict[key] = value
    return cookie_dict

class TestOneAI:
    # 在pytest里，针对一个类方法的setup为setup_method,
    # setup_method作用同unittest里的setUp()
    def setup_method(self, method):
        self.s = requests.Session()
        self.login_url = 'https://ones.ai/project/api/project/auth/login'
        self.home_page = 'https://ones.ai/project/#/home/project'
        self.header = {
            "user-agent": "user-agent: Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36",
            "content-type": "application/json"}
        self.driver = webdriver.Chrome()
    @pytest.mark.parametrize('login_data, project_name', [({"password": "iTestingIsGood", "email": "pleasefollowiTesting@outlook.com"}, {"project_name":"VIPTEST"})])
    def test_merge_api_ui(self, login_data, project_name):
        result = self.s.post(self.login_url, data=json.dumps(login_data), headers=self.header)
        assert result.status_code == 200
        assert json.loads(result.text)["user"]["email"].lower() == login_data["email"]
        all_cookies = self.s.cookies._cookies[".ones.ai"]["/"]
        self.driver.get(self.home_page)
        self.driver.delete_all_cookies()
        for k, v in all_cookies.items():
            print(v)
            print(type(v))
            self.driver.add_cookie(cookie_to_selenium_format(v))
        self.driver.get(self.home_page)
        try:
            element = WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[class="company-title-text"]')))
            assert element.get_attribute("innerHTML") == project_name["project_name"]
        except TimeoutError:
            raise TimeoutError('Run time out')
    # 在pytest里，针对一个类方法的teardown为teardown_method,
    # teardown_method作用同unittest里的dearDown()
    def teardown_method(self, method):
        self.s.close()
        self.driver.quit()
```

#### 第二步，创建 Page 类

首先把跟页面有关的全部操作都放到 Page 类里，pages/ones.py 的代码如下：

```python
# -*- coding: utf-8 -*-
import json
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from page_objects import PageObject, PageElement

def cookie_to_selenium_format(cookie):
    cookie_selenium_mapping = {'path': '', 'secure': '', 'name': '', 'value': '', 'expires': ''}
    cookie_dict = {}
    if getattr(cookie, 'domain_initial_dot'):
        cookie_dict['domain'] = '.' + getattr(cookie, 'domain')
    else:
        cookie_dict['domain'] = getattr(cookie, 'domain')
    for k in list(cookie_selenium_mapping.keys()):
        key = k
        value = getattr(cookie, k)
        cookie_dict[key] = value
    return cookie_dict

class OneAI(PageObject):
    # 使用page_objects库把元素locator， 元素定位，元素操作分离
    # 元素定位的字符串
    PROJECT_NAME_LOCATOR = '[class="company-title-text"]'
    NEW_PROJECT_LOCATOR = '.ones-btn.ones-btn-primary'

    # 元素定位
    new_project = PageElement(css=NEW_PROJECT_LOCATOR)
    # 通过构造函数初始化浏览器driver，requests.Session()
    # 通过api_login方法直接带登录态到达待测试页面开始测试
    def __init__(self, login_credential, target_page):
        self.login_url = 'https://ones.ai/project/api/project/auth/login'
        self.header = {
            "user-agent": "user-agent: Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36",
            "content-type": "application/json"}
        self.s = requests.Session()
        self.driver = webdriver.Chrome()
        self.api_login(login_credential, target_page)
    # 融合API测试和UI测试，并传递登录态到浏览器Driver供使用
    def api_login(self, login_credential, target_page):
        target_url = json.loads(json.dumps(target_page))
        try:
            result = self.s.post(self.login_url, data=json.dumps(login_credential), headers=self.header)
            assert result.status_code == 200
            assert json.loads(result.text)["user"]["email"].lower() == login_credential["email"]
        except Exception:
            raise Exception("Login Failed, please check!")
        all_cookies = self.s.cookies._cookies[".ones.ai"]["/"]
        self.driver.get(target_url["target_page"])
        self.driver.delete_all_cookies()
        for k, v in all_cookies.items():
            self.driver.add_cookie(cookie_to_selenium_format(v))
        self.driver.get(target_url["target_page"])
        return self.driver
    # 功能函数
    def get_project_name(self):
        try:
            project_name = WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, self.PROJECT_NAME_LOCATOR)))
            return project_name.get_attribute("innerHTML")
        except TimeoutError:
            raise TimeoutError('Run time out')
```

我们来看下这个 ones.py 文件：

- 首先，我在其中定义了一个方法 cookie_to_selenium_format，这个方法是把通过 requests.Session() 拿到的 cookies 转换成 Selenium/WebDrvier 认可的格式，这个函数跟我们的 Page 类无关，所以我把它放在 Page 类外；

- 接着，我定义了 OneAI 这个 Page 类，并且按照 page_objects 这个库的推荐写法写了元素的定位。注意，我把元素的 Locator 本身，以及元素、元素操作都分离开了。这样当有任意一个修改时，都不影响另外两个；

- 然后我又写了类方法，一个是用于拿登录态直接通过浏览器访问页面的函数 api_login，还有一个就是获取 project_name 的文本的函数 get_project_name。

至此，我的第一版 Page 类就创建完毕，**但注意我这个 Page 类里是不包括测试的方法的。**

#### 第三步， 更新 TestPage 类

Page 类创建好，我们就要创建 Page 类对应的测试类。更改 tests 文件夹下的 test_ones.py 文件，更改后的内容如下：

```python
# -*- coding: utf-8 -*-
import pytest
from pages.ones import OneAI

class TestOneAI:
    # 注意，需要email和密码需要更改成你自己的账户密码
    @pytest.mark.parametrize('login_data, project_name, target_page', [({"password": "iTestingIsGood", "email": "pleasefollowiTesting@outlook.com"}, {"project_name":"VIPTEST"}, {"target_page": "https://ones.ai/project/#/home/project"})])
    def test_project_name_txt(self, login_data, project_name, target_page):
        print(login_data)
        one_page = OneAI(login_data, target_page)
        actual_project_name = one_page.get_project_name()
        assert actual_project_name == project_name["project_name"]
```

你可以看到，这个测试类就变得非常简洁。它只包括一个测试方法，即 test_project_name_txt。这个函数用来测试我们拿到的 project name 是不是等于我们提供的那个值，即 VIPTEST。

**你需要注意，在测试类中，应该仅仅包括对 Page 类的各种方法的调用，而不能在测试类中直接去操作测试类对象生成新的功能。**

我们在命令行运行下，输入以下命令：

```bash
D:\_Automation\lagouAPITest>pytest tests/test_ones.py
```

至此，Page 类和 TestPage 类的解耦已经完成。

#### 第四步， 提炼 BasePage 类

至此，PageObject 模式我们已经应用到我们的项目中了，不过你发现没有，我们的 Page 类里还有很多可以优化的地方，比如 cookie_to_selenium_format 这个方法，它不属于某一个具体的 Page 类，但又可以被多个 Page 类调用。

再比如，初始化浏览器 Driver 的代码，和初始化 requests.Session() 的代码也不属于某一个具体的 Page，但是我们把它放入了 Page 里，所以，我们继续优化，在 pages 文件夹下创建 base_page 类，把跟 page 无关的操作都提炼出来。

pages/base_page.py 文件的内容如下：

```python
# -*- coding: utf-8 -*-
import json
import requests
from selenium import webdriver
from page_objects import PageObject, PageElement

def cookie_to_selenium_format(cookie):
    cookie_selenium_mapping = {'path': '', 'secure': '', 'name': '', 'value': '', 'expires': ''}
    cookie_dict = {}
    if getattr(cookie, 'domain_initial_dot'):
        cookie_dict['domain'] = '.' + getattr(cookie, 'domain')
    else:
        cookie_dict['domain'] = getattr(cookie, 'domain')
    for k in list(cookie_selenium_mapping.keys()):
        key = k
        value = getattr(cookie, k)
        cookie_dict[key] = value
    return cookie_dict

class BasePage(PageObject):
    def __init__(self, login_credential, target_page):
        self.login_url = 'https://ones.ai/project/api/project/auth/login'
        self.header = {
            "user-agent": "user-agent: Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36",
            "content-type": "application/json"}
        self.s = requests.Session()
        self.driver = webdriver.Chrome()
        self._api_login(login_credential, target_page)
    def _api_login(self, login_credential, target_page):
        target_url = json.loads(json.dumps(target_page))
        try:
            result = self.s.post(self.login_url, data=json.dumps(login_credential), headers=self.header)
            assert result.status_code == 200
            assert json.loads(result.text)["user"]["email"].lower() == login_credential["email"]
        except Exception:
            raise Exception("Login Failed, please check!")
        all_cookies = self.s.cookies._cookies[".ones.ai"]["/"]
        self.driver.get(target_url["target_page"])
        self.driver.delete_all_cookies()
        for k, v in all_cookies.items():
            self.driver.add_cookie(cookie_to_selenium_format(v))
        self.driver.get(target_url["target_page"])
        return self.driver
```

在 BasePage 这个类里，我把跟具体的某一个 page 的操作都剔除掉，仅仅留下共用的部分，比如初始化浏览器 driver、初始化 requests.Session()，然后我把用于登录后传递登录态的方法 api_login 改成一个类保护方法_api_login（即只允许 BasePage 的类实例和它的子类实例能访问_api_login 方法）。

这个时候，我们的 pages 文件夹下的 ones.py 也要做相应更改，更新后的 pages/ones.py 的内容如下：

```python
# -*- coding: utf-8 -*-
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from page_objects import PageObject, PageElement
from pages.base_page import BasePage

class OneAI(BasePage):
    PROJECT_NAME_LOCATOR = '[class="company-title-text"]'
    NEW_PROJECT_LOCATOR = '.ones-btn.ones-btn-primary'
    new_project = PageElement(css=NEW_PROJECT_LOCATOR)
    def __init__(self, login_credential, target_page):
        super().__init__(login_credential, target_page)
    def get_project_name(self):
        try:
            project_name = WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, self.PROJECT_NAME_LOCATOR)))
            return project_name.get_attribute("innerHTML")
        except TimeoutError:
            raise TimeoutError('Run time out')
```

可以看到。我们的 Page 类进一步简化，只包括 Page 本身的元素、对象和操作，而不包括其他的部分，比如对浏览器 Driver 的初始化、对 requests.Session() 的初始化、登录等操作了。

#### 第五步， 打造通用性测试框架

好了，本节课到现在，我们已经把 PageObject 模式的应用全部掌握了。现在来看看我们的框架，你觉得还有改进的空间吗？

```bash
|--lagouAPITest
    |--pages
        |--ones.py
        |--base_page.py
    |--tests
        |--test_ones.py
        |--__init__.py
    |--common
        |--__init__.py
```

当然有改进空间了， 再看看 base_page.py 这个文件。既然是 base_page，那么只应该跟 page 有关系，可是我们把初始化浏览器 driver、初始化 requests.Session() 这样的操作也放进去了，是不是不太合理？还有万一以后的浏览器测试不用 Selenium/WebDriver 了呢？

那么假设以后我们的浏览器测试不用Selenium/webDriver了，还有，万一有比 requests 更好用的HTTP库了呢？所以，有必要进一步拆分。

于是，我们的框架结构就变成如下的样子：

```bash
|--lagouAPITest
    |--pages
        |--ones.py
        |--baidu.py
        |--base_page.py
    |--tests
        |--test_ones.py
        |--test_baidu.py
        |--__init__.py
    |--common
        |--__init__.py
        |--selenium_helper.py
        |--requests_helper.py
```

把 BasePage 这个类里的关于 Selenium/WebDriver 和 Requests 的操作分别拆分到 selenium_helper.py 里和 requests_helper.py 里去。

selenium_helper.py 的内容如下：

```python
__author__ = 'kevin'
from selenium import webdriver

class SeleniumHelper(object):
    @staticmethod
    def initial_driver(browser_name='chrome'):
        browser_name = browser_name.lower()
        if browser_name not in {'chrome', 'firefox', 'ff', 'ie'}:
            browser_name = 'chrome'
        if browser_name == 'chrome':
            browser = webdriver.Chrome()
        elif browser_name in ('firefox', 'ff'):
            browser = webdriver.Firefox()
        elif browser_name == 'ie':
            webdriver.Ie()
        browser.maximize_window()
        browser.implicitly_wait(60)
        return browser
    @staticmethod
    def cookie_to_selenium_format(cookie):
        cookie_selenium_mapping = {'path': '', 'secure': '', 'name': '', 'value': '', 'expires': ''}
        cookie_dict = {}
        if getattr(cookie, 'domain_initial_dot'):
            cookie_dict['domain'] = '.' + getattr(cookie, 'domain')
        else:
            cookie_dict['domain'] = getattr(cookie, 'domain')
        for k in list(cookie_selenium_mapping.keys()):
            key = k
            value = getattr(cookie, k)
            cookie_dict[key] = value
        return cookie_dict
```

selenium_helper.py 里包括了所有针对 Selenium 的操作，以后针对浏览器的各种操作全部都放在这个文件。

requests_helper.py 里的代码，更新后如下：

```python
import json
import traceback
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning
# Disable https security warning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

class SharedAPI(object):
    def __init__(self):
        self.s = requests.session()
        self.login_url = 'https://ones.ai/project/api/project/auth/login'
        self.header = {
            "user-agent": "user-agent: Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36",
            "content-type": "application/json"}
    def login(self, login_credential):
        try:
            result = self.s.post(self.login_url, data=json.dumps(login_credential), headers=self.header, verify=False)
            if int(result.status_code) == 200:
                pass
            else:
                raise Exception('login failed')
            return result
        except RuntimeError:
            traceback.print_exc()
    def post_api(self, url, **kwargs):
        return self.s.post(url, **kwargs)
    def get_api(self, url, **kwargs):
        return self.s.get(url, **kwargs)
```

requests_helper.py 里包括所有对 requests 这个库的操作。

最后，我们还需要更新下 base_page.py，base_page.py 更新后，内容如下：

```python
# -*- coding: utf-8 -*-
import json
import traceback
import requests
from selenium import webdriver
from page_objects import PageObject, PageElement
from common.requests_helper import SharedAPI
from common.selenium_helper import SeleniumHelper

class BasePage(PageObject):
    def __init__(self, login_credential, target_page):
        self.api_driver = SharedAPI()
        self.loginResult = self.api_driver.login(login_credential)
        self.driver = SeleniumHelper.initial_driver()
        self._api_login(login_credential, target_page)
    def _api_login(self, login_credential, target_page):
        target_url = json.loads(json.dumps(target_page))
        assert json.loads(self.loginResult.text)["user"]["email"].lower() == login_credential["email"]
        all_cookies = self.loginResult.cookies._cookies[".ones.ai"]["/"]
        self.driver.get(target_url["target_page"])
        self.driver.delete_all_cookies()
        for k, v in all_cookies.items():
            self.driver.add_cookie(SeleniumHelper.cookie_to_selenium_format(v))
        self.driver.get(target_url["target_page"])
        return self.driver
```

可以看到，在更新后的 base_page.py 里，我们初始化 requests.Session() 和浏览器的 Driver 的方式是通过调用 SharedAPI 和 SeleniumHelper 这两个类。然后 BasePage 这个类里现在只包括各个 Page 类可以共用的函数，而不再包括无关的操作。

其他文件无须更改。

通过如下命令运行：

```bash
D:\_Automation\lagouAPITest>pytest --alluredir=./allure_reports
```

然后使用命令行进入到你的项目根目录下，执行如下语句：

```bash
D:\_Automation\lagouAPITest>allure serve allure_reports
```

接着你的默认浏览器会自动打开测试报告。

好的，大功告成。

你发现没有，通过这个方式，我们就把自动化测试框架进行了框架代码和业务代码的剥离。此后我们的框架不仅看起来结构清晰，而且也变得跟业务松耦合。当你需要在新项目应用自动化的时候，仅仅把 pages 和 tests 这两个文件夹更换，便能够一“秒”搭建新的测试框架。

## DDT：博采众长，数据驱动的秘诀（一）

### 什么是数据驱动？

数据驱动，指在自动化测试中处理测试数据的方式。

通常测试数据与功能函数分离，存储在**功能函数的外部位置**。在自动化测试运行时，数据驱动框架会读取数据源中的数据，把**数据作为参数传递到功能函数中**，并会根据数据的条数**多次运行同一个功能函数**。

数据驱动的数据源可以是函数外的数据集合、CSV 文件、Excel 表格、TXT 文件，以及数据库等。

### 数据驱动的好处有哪些？

#### 1.数据驱动能够减少重复代码

下面我们通过一个例子来看下数据驱动是如何减少代码重复的。

```python
# 伪代码，仅供演示
def book_order(user, product, num):
    # 你的函数逻辑
    pass

# 如果没有数据驱动，你的代码是这样的：
book_order('张三', '前端自动化测试框架Cypress从入门到精通', 1)
book_order('李四', '测试开发入门与实战', 1)
book_order('王五', '[测试开发入门与实战,前端自动化测试框架Cypress从入门到精通]', 50)
```

没有数据驱动时，并且同一个功能函数存在多个测试数据，你只能多次调用这个功能函数；另外一旦某一个测试数据有更改/删除，你需要在函数调用里去更改相应的测试数据，非常不方便。

但有了测试驱动时，你的代码可能是下面这个样子。

```python
# data_book指向一个文件，这个文件里存储有你所有的测数据。
data_book = './tests/data/testdata.csv'
# dataDrivenDecorator是你实现数据驱动的装饰器
@dataDrivenDecorator(data_book)
def book_order(user, product, num):
    # 你的函数逻辑
    pass
```

这种情况下， 你无须进行多次调用，而且当你的测试数据发生改变时， 你仅需要更改数据源文件的数据就可以了。

#### 2.数据所属的测试用例失败，不会影响到其他测试数据对应的测试用例

同样举一个例子，没有数据驱动之前，假设我们有这样的一个函数：

```python
test_data = [0, 1, 0, 1]

def test_without_data_driven(records):
    for x in records:
        assert x > 0

test_without_data_driven(test_data)
```

当你运行这段代码时，因为 test_data 的第一个值是 0， 它不大于 0。所以断言失败，所有 test_data 这个函数 0 后面的测试数据都没有执行。

如果有了数据驱动，则数据驱动会把这一个测试按照测试数据分解成多个测试，所有第一个测试数据失败不也会影响到后面的测试结果。

**了解了数据驱动的众多好处，我们来看下在 Python 中，应用比较广泛的两个数据驱动的框架。一个是 DDT（Data-Driven Tests），它是 unittest 框架中实现数据驱动的不二之选；另外一个是 parameterized，它是 pytest 能够实现数据驱动的秘诀。**

### DDT 含有哪些装饰器

1. 一个类装饰器

ddt 这个类装饰器必须装饰在 TestCase 的子类上，TestCase 是 unittest 框架中的一个基类，它实现了 Test Runner 驱动测试运行所需的接口（interface）。

2. 两个方法装饰器

分别是 data 和 file_data。其中 data 装饰器，直接提供测试数据；file_data 装饰器则从 JSON 或 YAML 文件加载测试数据。

DDT 的使用步骤如下：

- 使用 @ddt 装饰你的测试类；
- 使用 @data 或者 @file_data 装饰你需要数据驱动的测试方法；
- 如一组测试数据有多个参数，则需 unpack，使用 @unpack 装饰你的测试方法。

### DDT 使用详解

先安装 DDT：

```python
pip install ddt
```

然后我以 lagouAPITest 框架里，tests 文件夹下的 test_baidu.py 这个文件为例，来讲解下 ddt 的使用。

#### 1.ddt 直接提供数据

```python
# coding=utf-8
from ddt import ddt, data, file_data, unpack
from selenium import webdriver
import unittest
import time
# ddt一定是装饰在TestCase的子类上
@ddt
class Baidu(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(30)
        self.base_url = "http://www.baidu.com/"
    # data表示data是直接提供的。
    # unpack表示，对于每一组数据，如果它的值是list或者tuple，那么就分拆成独立的参数。
    @data(['iTesting', 'iTesting'], ['helloqa.com', 'iTesting'])
    @unpack
    def test_baidu_search(self, search_string, expect_string):
        driver = self.driver
        driver.get(self.base_url + "/")
        driver.find_element_by_id("kw").send_keys(search_string)
        driver.find_element_by_id("su").click()
        time.sleep(2)
        search_results = driver.find_element_by_xpath('//*[@id="1"]/h3/a').get_attribute('innerHTML')
        print(search_results)
        self.assertEqual(expect_string in search_results, True)
    def tearDown(self):
        self.driver.quit()

if __name__ == "__main__":
    unittest.main(verbosity=2)
```

在这个例子中，我直接使用了 @data 装饰器。在这个装饰器中，我给出了测试的 2 组数据，分别是 `['iTesting', 'iTesting']` 和 `['helloqa.com', 'iTesting']`；然后我使用 @unpack 装饰器把每一组数据的数据 unpack 成一个个的参数传给我的函数 test_baidu_search。

直接运行这个文件。

你注意下，虽然我们只有一个测试用例 test_baidu_search。但在生成的测试报告里，显示“Run 2 tests in 17.172s”，也就是 test_baidu_search 运行了 2 次，这就是 DDT 在起作用。

这是多组参数，每组多个数据的情况，如果每组仅有一个数据呢？你仅需要更改如下：

```python
# 如仅有一个参数，那么直接在data里写参数就好。
# 仅有一个参数的情况下，无须再用@unpack装饰测试方法。 
@data('data1', 'data2')
```

#### 2.ddt 使用函数提供数据

ddt 直接提供数据，除去上述的直接把数据写在 @data() 的参数中外，还有一个情况，即数据先从函数获取，然后再写入 @data() 的参数中。

```python
# coding=utf-8
from ddt import ddt, data, file_data, unpack
from selenium import webdriver
import unittest
import time
def get_test_data():
    # 这里写你获取测试数据的业务逻辑。
    # 获取到后，把数据返回即可。
    # 注意，如果多组数据，需要返回类似([数据1-参数1， 数据1-参数2]，[数据2-参数1， 数据2-参数2])这样的格式，方便ddt.data()解析
    results = ['iTesting', 'iTesting'], ['helloqa.com', 'iTesting']
    return results
# ddt一定是装饰在TestCase的子类上
@ddt
class Baidu(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(30)
        self.base_url = "http://www.baidu.com/"

    # data表示data是直接提供的。注意data里的参数我写了函数get_test_data()的返回值，并且以*为前缀，代表返回的是可变参数。
    # unpack表示，对于每一组数据，如果它的值是list或者tuple，那么就分拆成独立的参数。
    @data(*get_test_data())
    @unpack
    def test_baidu_search(self, search_string, expect_string):
        driver = self.driver
        driver.get(self.base_url + "/")
        driver.find_element_by_id("kw").send_keys(search_string)
        driver.find_element_by_id("su").click()
        time.sleep(2)
        search_results = driver.find_element_by_xpath('//*[@id="1"]/h3/a').get_attribute('innerHTML')
        print(search_results)
        self.assertEqual(expect_string in search_results, True)

    def tearDown(self):
        self.driver.quit()



if __name__ == "__main__":
    unittest.main(verbosi
```

在本例中，我创建了一个函数 get_test_data() 用于获取我的测试数据。这个函数可以带参数，也可以不带参数，具体需要根据你的业务逻辑来。

> 注意：get_test_data() 的返回值，一定需要遵守 ddt.data() 可接受的数据格式。即：一组数据，每个数据为单个的值；多组数据，每组数据为一个列表或者一个字典。

#### 3.ddt 使用文件提供数据 — JSON 和 YAML

除了使用 @ddt 直接提供数据，DDT 还支持通过文件加载数据。

不过默认只支持两种格式 YAML 和 JSON，只有以“.yml” 或者“.yaml” 结尾的会被认作 YAML 文件，其他格式都将被认为是 JSON 文件。

- **使用 JSON 文件**

如果把上述用例改成使用 JSON 文件，则我们的用例看起来是这样的：

```bash
|--lagouAPITest
    |-- .....
    |--tests
        |--test_baidu.py
        |--test_baidu.json
        |--__init__.py
```

首先，我们创建一个跟 test_baidu.py 同名的文件 test_baidu.json，内容如下：

```json
{ "case1": {
  "search_string": "itesting",
  "expect_string": "iTesting"
  },
  "case2": {
  "search_string": "itesting",
  "expect_string": "iTesting"
  }
}
```

然后更新 test_baidu.py，更新后的代码如下所示：

```python
# -*- coding: utf-8 -*-
from ddt import ddt, data, file_data, unpack
from selenium import webdriver
import unittest
import time

@ddt
class Baidu(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(30)
        self.base_url = "http://www.baidu.com/"

    # 此处测试数据从文件读取，使用@file_data装饰器
    # 文件路径是相对于Baidu这个测试类的相对路径
    # 使用外部文件方式Load数据无须使用unpack
    @file_data('test_baidu.json')
    def test_baidu_search(self, search_string, expect_string):
        driver = self.driver
        driver.get(self.base_url + "/")
        driver.find_element_by_id("kw").send_keys(search_string)
        driver.find_element_by_id("su").click()
        time.sleep(2)
        search_results = driver.find_element_by_xpath('//*[@id="1"]/h3/a').get_attribute('innerHTML')
        print(search_results)
        self.assertEqual(expect_string in search_results, True)
    def tearDown(self):
        self.driver.quit()

if __name__ == "__main__":
    unittest.main(verbosity=2)
```

可以看到，使用 @file_data 这个装饰器，与使用 @data 的装饰器有一点不同：

（1）@file_data 这个装饰器里，文件的路径是相对于这个测试类本身来说的。在本例中为 Baidu 这个测试类所处的文件的相对位置；

（2）使用 @file_data 无须使用 unpack，即使同一组数据的参数有多个。

- **使用 YAML 文件**

如果想在 python 中使用 yaml 文件，则需要安装 PyYAML。

```bash
pip install pyyaml
```

安装好后，我们在test_baidu.json的同级目录下，创建一个文件test_baidu.yaml，内容如下：

```yaml
"case1":
  "search_string": "itesting"
  "expect_string": "iTesting"
 
"case2": 
  "search_string": "itesting"
  "expect_string": "iTesting"
```

然后，我们更改 test_baidu.py，更改后的内容如下：

```python
# -*- coding: utf-8 -*-
from ddt import ddt, data, file_data, unpack
from selenium import webdriver
import unittest
import time
# 使用yaml文件前先尝试导入，导入失败则将skip使用yaml数据驱动的测试用例
try:
    import yaml
except ImportError:
    have_yaml_support = False
else:
    have_yaml_support = True
needs_yaml = unittest.skipUnless(
    have_yaml_support, "Need YAML to run this test"
)

@ddt
class Baidu(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(30)
        self.base_url = "http://www.baidu.com/"
    # 使用yaml文件必须使用@needs_yaml装饰
    @needs_yaml
    @file_data('test_baidu.yaml')
    def test_baidu_search(self, search_string, expect_string):
        driver = self.driver
        driver.get(self.base_url + "/")
        driver.find_element_by_id("kw").send_keys(search_string)
        driver.find_element_by_id("su").click()
        time.sleep(2)
        search_results = driver.find_element_by_xpath('//*[@id="1"]/h3/a').get_attribute('innerHTML')
        print(search_results)
        self.assertEqual(expect_string in search_results, True)
    def tearDown(self):
        self.driver.quit()

if __name__ == "__main__":
    unittest.main(verbosity=2)
```

你可以看到，与使用 JSON 文件不同， 使用 YAML 文件必须要先安装 PyYaml。然后为了防止 yaml 导入失败，我定义了 needs_yaml 这个装饰器，用来给我的程序加个安全判断。如果导入失败，则所有以 needs_yaml 装饰的测试用例将不会执行。

#### 4.ddt 使用文件提供数据 — 其他格式数据文件

因为 ddt 默认只支持 JSON 和 YAML 格式的数据。但是我想使用其他数据格式怎么办？

常用的方式有如下两种：

- 先读取其他格式的文件（例如 Excel 格式），然后创建 ddt 支持的 JSON 或者 YAML 文件，最后把获取到的数据写入这个文件，再使用 @file_data() 即可；

- 创建一个函数，在函数中读取其他格式的文件并获取数据，将数据直接返回为 @ddt.data() 支持的格式调用即可。

### DDT 的原理解析

了解了 ddt 的使用，不知你有没有想过如下问题：

- ddt 是如何把你的测试数据转给你的测试用例的？
- 当你的一组数据有多个参数时，ddt 是如何 unpack 的？
- 当你有多组数据时，ddt 拆分测试用例是如何命名的？

下面我们就来一一揭晓 ddt 实现数据驱动的秘密。

其实 ddt 的实现核心就是`@ddt(cls)` **这个装饰器，而这个装饰器的核心代码是 wrapper这个内函数**，下面我直接把 wrapper 的源码贴上来，我们一起看看：

```python
def wrapper(cls):
    # 先遍历被装饰类的name, 和func
    # 对于func，先看被装饰的是DATA_ATTR还是FILE_ATTR
    for name, func in list(cls.__dict__.items()):
        # 如果被装饰的是DATA_ATTR
        if hasattr(func, DATA_ATTR):
            #获取@data提供数据的index和内容并且遍历它们
            for i, v in enumerate(getattr(func, DATA_ATTR)):
                # 重新生成新的测试函数名，这个函数名会展示在测试报告中
                test_name = mk_test_name(
                    name,
                    getattr(v, "__name__", v),
                    i,
                    fmt_test_name
                )
                test_data_docstring = _get_test_data_docstring(func, v)
                # 如果类函数被@unpack装饰
                if hasattr(func, UNPACK_ATTR):
                    # 如果提供的数据是tuple或者list
                    if isinstance(v, tuple) or isinstance(v, list):
                        # 则添加一个case到测试类中
                        # list或tuple传不定数目的值， 用*v即可。
                        add_test(
                            cls,
                            test_name,
                            test_data_docstring,
                            func,
                            *v
                        )
                    else:
                        # unpack dictionary
                        # 添加一个case到测试类中
                        # dict中传不定数目的值，用**v
                        add_test(
                            cls,
                            test_name,
                            test_data_docstring,
                            func,
                            **v
                        )
                else:
                    # 如不需要unpack，则直接添加一个case到测试类
                    add_test(cls, test_name, test_data_docstring, func, v)
            # 删除原来的测试类
            delattr(cls, name)
        # 如果被装饰的是file_data
        elif hasattr(func, FILE_ATTR):
            # 获取file的名称
            file_attr = getattr(func, FILE_ATTR)
            # 根据process_file_data解析这个文件
            # 在解析的最后，会调用mk_test_name生成多个测试用例
            process_file_data(cls, name, func, file_attr)
            # 测试用例生成后，会删除原来的测试用例
            delattr(cls, name)
    return cls
```

来分析下这段代码， 对于每一个被 `@ddt` 装饰的测试类，ddt 首先去**遍历**测试类的自有属性，从而得出这个测试类**有哪些测试方法**，这部分主要靠这条语句：

```python
# wrapper源码第4行
for name, func in list(cls.__dict__.items()):
```

然后，ddt 去判断所有的 func（即类函数）里，有没有装饰器 @data 或者 @file_data，主要靠这两条语句：

```python
# 被@data装饰， wrapper源码第6行
if hasattr(func, DATA_ATTR):
# 被file_data 装饰，wrapper源码第47行
elif hasattr(func, FILE_ATTR):
```

接着程序会进入两条分支：被 @data 装饰，即由 ddt 直接提供数据；被 @file_data 装饰，即数据由外部文件提供。

#### 1.被 @data 装饰，即由 ddt 直接提供数据

如果数据是直接通过 @data 提供的，那么为每一组数据新生成一个测试用例名称。

```python
# 在本例中， i， v的第一次循环，值为 
# i:0 v:['iTesting', 'iTesting']
# wrapper源码第8行
for i, v in enumerate(getattr(func, DATA_ATTR)):
    test_name = mk_test_name(
        name,
        getattr(v, "__name__", v),
        i,
        fmt_test_name
    )
```

test_name 生成使用的是函数 mk_test_name。

> 注意：ddt 在此时实现了把你的测试数据转给你的测试用例。 其实不是通过传递，而是通过把测试数据拆分，并且生成新测试用例的方式来达成的。

而在函数 mk_test_name 里，ddt 更是把原来的测试函数通过特定的规则，拆分成不同的测试函数。

```python
test_name = mk_test_name(name,getattr(v, "__name__", v),i,fmt_test_name)
```

mk_test_name 的参数里：

- name 是原测试函数的名字
- v 是我们的一组测试数据
- i 是这组数据的 index
- fmt_test_name 指定新的 test 函数的名字的格式，这个格式是按照原来测试函数名 index 第一个测试数据_第二个测试数据这样的格式。

例如，我们的测试数据 `['iTesting'，'iTesting']` 会被转换成`test_baidu_search_1_['iTesting'， 'iTesting']'`，但是由于符号 `'['` 和 `''` 以及 `'`，`'` 是不合法的字符，故会被 `'_'` 替换，故最终新生成的测试用例名是`test_baidu_search_1___iTesting____iTesting__` 这块的逻辑在函数 mk_test_name 的最后两行：

```python
# ddt内容函数mk_test_name，test_name处理逻辑如下
test_name = "{0}_{1}_{2}".format(name, index, value)
return re.sub(r'\W|^(?=\d)', '_', test_name)
```

紧接着，ddt 又去查找你的测试类函数，看它有没有被 @unpack 装饰。如果有，就意味着我们的测试类函数有多个参数，这个时候就需要把我们的测试数据 unpack，这样我们的测试类函数的各个参数才能接收到传入的值。

这样，ddt 把上一步生成的 test_name 和刚刚 unpack 的值（数据是 list、tuple，还是 dictionary，决定了 unpack 采用 *v 还是 **v），通过 add_test 来新生成一个测试用例，注册到我们的测试类下面，所有这些动作是在下面这段代码里完成的。

```python
# wrapper源码里的18行到43行
if hasattr(func, UNPACK_ATTR):
    if isinstance(v, tuple) or isinstance(v, list):
        add_test(
            cls,
            test_name,
            test_data_docstring,
            func,
            *v
        )
    else:
        # unpack dictionary
        add_test(
            cls,
            test_name,
            test_data_docstring,
            func,
            **v
        )
else:
    add_test(cls, test_name, test_data_docstring, func, v)
```

注意：

- 这个时候测试类中是多了测试函数的，多了多少个，要取决于 ddt 提供的测试数据的组数，有几组就生成几个测试用例，并且都注册到原测试类中去；

- unpack 其实就是为了把一个测试用例的多个测试数据全部传入新生成的测试函数中去，这些测试数据和测试函数的参数一一对应。

最后，ddt 会把最初的那个原始测试类方法给删除（因为原测试函数已经根据各组数据变成了新的测试函数）。

```python
# wrapper源码45行
delattr(cls, name)
```

通过这样的方式，ddt 根据测试数据的组数，通过函数 mk_test_name 生成多组测试用例，并通过 add_test 函数注册到 unittest的TestSuite 里去。

#### 2.被 @file_data 装饰，即数据由外部文件提供

如果测试函数被 @file_data 装饰，ddt 则会先获取 file_data 里的数据文件名称，然后通过函数 process_file_data 里进行下一步处理。

```python
# wrapper源码的第49到52行
file_attr = getattr(func, FILE_ATTR)
process_file_data(cls, name, func, file_attr)
```


看起来只有短短的两行，其实 ddt 在函数 process_file_data 内部做了很多操作。
首先 ddt 会先拿到我们提供的数据文件的绝对地址，并通过后缀名判断它是 yaml 文件还是 json 文件，然后分别调用 yaml 或者 json 的 load 方法拿到文件里提供的数据。

拿到数据后，最终也是通过 mk_test_name 函数和 add_test 函数，生成多条测试用例，并且注册到 unittest 的 TestSuite 里去。

最后一样是删除原来的测试函数：

```python
# wrapper源码54行
delattr(cls, name)
```

这就是 ddt 的整个实现逻辑了。

## DDT：博采众长，数据驱动的秘诀（二）

### pytest.mark.parametrize 实现数据驱动

pytest.mark.parametrize 是 pytest 的内置装饰器，它允许你在 function 或者 class 上定义多组参数和 fixture 来实现数据驱动。

@pytest.mark.parametrize() 装饰器接收两个参数：第一个参数以**字符串**的形式存在，它代表能被**被测试函数**所能接受的参数，如果被测试函数有多个参数，则以逗号分隔；第二个参数用于**保存**测试数据。如果只有一组数据，以列表的形式存在，如果有多组数据，以列表嵌套元组的形式存在（例如`[0,1]`或者`[(0,1), (1,2)]`）。

下面来看两组例子。

#### 1.pytest.mark.parametrize 单参数

```python
# test_sample.py
import pytest

@pytest.mark.parametrize("number", [1, 0])
def test_equal(number):
    assert number == 1

if __name__ == "__main__":
    pytest.main([])
```

以上是单参数的一个例子，在这个例子中，test_equal 函数接收一个参数 number，这个参数有两组数据，分别是 1 和 0。

> 注意：装饰器 pytest.mark.parametrize 的第一个参数里的参数名称必须与测试函数中的参数称保持一致。

在 Pycharm 中，使用右键选择运行这段代码，结果如下：

```bash
== test session starts ===
test_sample.py::test_equal[1]   PASSED           [ 50%]
test_sample.py::test_equal[0]   FAILED           [100%]
=== short test summary info ===
FAILED 1.py::test_equal[0] - assert 0 == 1
== 1 failed, 1 passed in 0.10s ===
```

可以看到，函数 test_equal 提供了两组参数 1 和 0，所以它也执行了 2 次。

#### 2.pytest.mark.parametrize 多参数

pytest.mark.parametrize 不仅支持单个参数，也可以支持多个参数，多个参数比较常见，因为在日常工作中，我们提供测试数据，不仅仅包括用于测试的数据， 还包括用于验证的数据，所以多参数还是比较常见的。

pytest.mark.parametrize 可以轻松支持多参数，请看下面的例子。

```python
# -*- coding: utf-8 -*-
# test_baidu.py
import time
import pytest
from selenium import webdriver

@pytest.mark.baidu
class TestBaidu:
    def setup_method(self):
        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(30)
        self.base_url = "http://www.baidu.com/"
    @pytest.mark.parametrize('search_string, expect_string', [('iTesting', 'iTesting'), ('helloqa.com', 'iTesting')])
    def test_baidu_search(self, search_string, expect_string):
        driver = self.driver
        driver.get(self.base_url + "/")
        driver.find_element_by_id("kw").send_keys(search_string)
        driver.find_element_by_id("su").click()
        time.sleep(2)
        search_results = driver.find_element_by_xpath('//*[@id="1"]/h3/a').get_attribute('innerHTML')
        assert (expect_string in search_results) is True
    def teardown_method(self):
        self.driver.quit()

if __name__ == "__main__":
    pytest.main(["-m", "baidu", "-s", "-v", "-k", "test_baidu_search", "test_baidu.py"])
```

上面这段代码，其实就是我们在前面课程里常用的测试文件 test_baidu.py，在这个测试文件里，我的被测试函数 test_baidu_search 有两个参数，分别是 search_string 和 expect_string。那么对应着，在 pytest.mark.parametrize 这个装饰器的第一个参数里，也包含 search_string 和 expect_string。

### pytest.fixture 扩展数据驱动

概括地说，无论是什么形式的测试都只包括三个步骤：测试前的准备—执行测试—测试后的清理。在日常的测试中，测试前的准备通常就是测试需要的前置条件，它可以是简单的登录操作、联合查询数据库操作，甚至是逻辑复杂的函数操作。

像 unittest 框架一样，在 pytest 中你也可以通过使用 setup 和 tear down 来完成你的测试前置工作。例如，使用 setup_method、setup_class、setup_module 来分别完成测试类方法、测试类，以及测试 module 的 setup；使用 teardown_method、teardown_class、teardown_module 来分别完成测试类方法、测试类，以及测试 module 清理操作。

但是这种方式存在缺陷。 例如，在同一个测试类中，存在多个测试方法，假设每一个测试方法需要不同的 setup 或者 teardown 函数，此时该怎么办呢？

又比如，setup 和 teardown 其实都属于测试夹具（Test Fixtures），如果我想把所有测试夹具全部放到一个函数中去管理，能做到吗？

**pytest 考虑到了这种情况，并且提供了一个更加高级的功能，那就是 fixture 装饰器。**

fixtures 可用作初始化测试服务、数据和状态，也常常用来在测试执行前/后进行测试的前置/后置操作。 fixtures 可作为共享数据使用，也可被其他函数、模块、类或者整个项目，甚至另外的 fixtures 调用。

#### 1.fixtures 语法

pytest.fixtures 的语法如下：

```python
fixture(scope="function", params=None, autouse=False, ids=None, name=None)
```

其中，fixture 的 5 个参数如下。

- **scope：用于控制 fixture 的作用范**

这个参数有以下四个级别：

function：在每一个 function 或者类方法中都会调用（默认）。

class：在每一个类中只调用一次。

module：每一个 .py 文件调用一次；该文件内可以有多个 function 和 class。

session：一个 session 调用一次。

- **params：一个可选的参数列表**

params 以可选的参数列表形式存在。在测试函数中使用时，可通过 request.param 接收设置的返回值（即 params 列表里的值）。params 中有多少元素，在测试时，引用此 fixture 的函数就会调用几次。

- `autouse：是否自动执行****设置的 fixtures`

当 autouse 为 True 时，测试函数即使不调用 fixture 装饰器，定义的 fixture 函数也会被执行。

- **ids：指定每个字符串 id**

当有多个 params 时，针对每一个 param，可以指定 id，这个 id 将变为测试用例名字的一部分。如果没有提供 id，则 id 将自动生成。

- **name：fixture 的名称**

name 是 fixtures 的名称， 它默认是你装饰的那个 fixture 函数的名称。你可以通过 name 参数来更改这个 fixture 名称，更改后，如果这个 fixture 被调用，则使用你更改过的名称即可。

#### 2.fixtures 用法

fixtures 有多种使用方式，下面我们来逐一讲解。

**（1）通过 fixture 函数名直接使用**

```python
# 在lagouAPITest项目下新建一个文件，命名为 test_fixture_usage.py
import pytest
# 首先， 在fixture函数上，加@pytest.fixture()
@pytest.fixture()
def my_method():
    print('This is itesting Speaking')

# 其次，把fixture函数的函数名作为参数，传入被测试用例
def test_use_fixtures(my_method):
    print('Please follow iTesting from wechat')
```

通过 fixture 函数名使用 fixture 的步骤是：

- 在 fixture 函数上，加 @pytest.fixture()，上例中 my_method 这个方法将作为 fixture 使用；

- 把 fixture 函数的函数名作为参数，传入被测试用例。 注意，函数 test_use_fixtures 的入参必须是 my_method 这个方法名，跟 fixture 函数保持一致。

在命令行中通过如下方式运行上段代码：

```bash
D:\_Automation\lagouAPITest>pytest tests/test_fixture_usage.py
```

运行后你会发现，my_method 即定义的 fixture 的方法先于测试函数的其他语句开始执行。

**（2）通过 usefixtures 装饰器使用**

通过把 fixture 作为测试函数入参的方式，可以达到为每一个测试函数配置不同的 setup/tear down 的需求，但这样会让 fixture 和我的测试函数耦合在一块，不利于测试函数的重用。

故 pytest 提供了 pytest.mark.usefixtures 这个装饰器，下面这段代码演示了 usefixtures 的用法。

```python
# 在lagouAPITest项目下新建一个文件，命名为test_fixture_usage.py
import pytest

@pytest.fixture()
def my_method():
    print('This is iTesting Speaking')

# 函数直接使用fixture
@pytest.mark.usefixtures('my_method')
def test_use_fixtures():
    print('Please follow iTesting from wechat')

class TestClass1:
    # 类方法使用fixture
    @pytest.mark.usefixtures('my_method')
    def test_class_method_usage(self):
        print('[classMethod]Please follow iTesting from wechat')

# 类直接使用fixture
@pytest.mark.usefixtures('my_method')
class TestClass2:
    def test_method_usage_01(self):
        pass
    def test_method_usage_02(self):
        pass
```

由这段代码你可以看到，usefixtures 可以被函数、类方法，以及类调用。

**（3）fixture 多参数使用**

上述使用方式实现了使不同的测试函数调用不同的测试 fixtures，那么如果我们 fixture 带参数怎么办？看下面的代码：

```python
import pytest

@pytest.fixture(params=['hello', 'iTesting'])
def my_method(request):
    return request.param

def test_use_fixtures_01(my_method):
    print('\n this is the 1st test')
    print(my_method)

@pytest.mark.usefixtures('my_method')
def test_use_fixtures_02():
    print('\n this is the 2nd test')
    # 注意，如果我在这里想通过print(my_mthod)来打印出fixuture提供的参数，是不行的， 因为使用usefixtures无法获取fixture的返回值，如需要fixture的返回值，则需用test_use_fixtures_01那样的调用方式
```

执行这段代码，你将会看到有 4 条测试用例被执行。由此可见，pytest 通过 fixture 和其参数 params 实现了数据驱动。

**（4）通过 autouse 参数隐式使用**

以上方式实现了 fixtures 和测试函数的松耦合，但是仍然存在问题：每个测试函数都需要显式声明要用哪个 fixtures。

基于此，pytest 提供了autouse 参数，允许我们在不调用 fixture 装饰器的情况下使用定义的fixture，请看下面的例子：

```python
# 在lagouAPITest项目下新建一个文件，命名为test_fixture_usage.py
import pytest

@pytest.fixture(params=['hello', 'iTesting'], autouse=True, ids=['test1', 'test2'], name='test')
def my_method(request):
    print(request.param)

def test_use_fixtures_01():
    print('\n this is the 1st test')

def test_use_fixtures_02():
    print('\n this is the 2nd test')
```

在命令行中通过如下方式运行上段代码：

```bash
D:\_Automation\lagouAPITest>pytest tests/test_fixture_usage.py -s --alluredir=./allure_reports
```

测试执行完成后，通过以下方式打开生成的 allure 报告：

```bash
# 以Win10为例：
1. 使用快捷键 Win + R 调起运行提示框
2. 输入“cmd”进入到命令行
3. 切换目录到项目根目录，本例中在D:\_Automation\lagouAPITest>
4. 输入命令生成allure报告
allure serve allure_reports
```

由此可以看出，当你定义了 fixture 函数，并且 autouse 为 True 时，无须显式的在测试函数中声明要使用 fixture（在本例中，你看不到 my_method 这个 fixture 在测试方法中被显式调用）。 定义的 fixture 将在 pytest.fixtures 指定的范围内，对其下的每一个测试函数都应用 fixture。

在本例中，scope 参数没有定义，将使用默认值“function”， 即每一个测试函数都会执行， 而我们的 params 又提供了两组参数，所以共 4 条测试用例被执行。

请注意下测试用例名称，针对每一个测试用例，因为我指定了 ids 为 ['test1', 'test2']， 故测试用例名中也包括了指定的 id。

**（5）多 fixture 笛卡尔积使用**

当你有多个 fixture 需要叠加使用时， 可以叠加使用。注意：此方式将把 fixure 的各组参数以笛卡尔积的形式组织，以下列代码为例，执行将生成 4 条测试。

```python
import pytest

class TestClass:
    @pytest.fixture(params=['hello', 'iTesting'], autouse=True)
    def my_method1(self, request):
        print('\nthe param are:{}'.format(request.param))
        return request.param
    @pytest.fixture(params=['VIPTEST', 'is good'], autouse=True)
    def my_method2(self, request):
        print('\nthe param are:{}'.format(request.param))
        return request.param
    def test_use_fixtures_01(self):
        pass
```

**（6）使用 conftest.py 来共享 fixture**

通过上面的学习，我们掌握了如何在同一个文件中进行 fixture 的定义、共享和使用。但在日常工作测试中，我们常常需要**在全局范围内使用同一个测试前置操作**。例如，测试开始时首先进行登录操作，接着连接数据库。

这种情况下，我们就需要使用 conftest.py。在 conftest.py 中定义的 fixture 不需要进行 import，pytest 会自动查找使用。 pytest 查找 fixture 的顺序是首先查找测试类（Class），接着查找测试模块（Module），然后是 conftest.py 文件，最后是内置或者第三方插件。

下面来看下如何使用 conftest.py。

- 假设我们有如下的目录结构：

```bash
|--lagouAPITest
    |--tests
        |--test_fixture1.py
        |--test_baidu_fixture_sample.py
        |--conftest.py
        |--__init__.py
```

其中，conftest.py 的代码如下：

```python
# conftest.py
import pytest
from selenium import webdriver
import requests

@pytest.fixture(scope="session")
# 此方法名可以是你登录的业务代码，也可以是其他，这里暂命名为login
def login():
    driver = webdriver.Chrome()
    driver.implicitly_wait(30)
    base_url = "http://www.baidu.com/"
    s = requests.Session()
    yield driver, s, base_url
    print('turn off browser driver')
    driver.quit()
    print('turn off requests driver')
    s.close()

@pytest.fixture(scope="function", autouse=True)
def connect_db():
    print('connecting db')
    # 此处写你的链接db的业务逻辑
    pass
```

test_fixture1.py 中代码如下：

```python
# test_fixture1.py
import pytest
class TestClass:
    def test_use_fixtures_01(self, login):
        print('\nI am data:{}'.format(login))
```

test_baidu_fixture_sample.py 文件的代码如下：

```python
# -*- coding: utf-8 -*-

import time
import pytest

@pytest.mark.baidu
class TestBaidu:
    @pytest.mark.parametrize('search_string, expect_string', [('iTesting', 'iTesting'), ('helloqa.com', 'iTesting')])
    def test_baidu_search(self, login, search_string, expect_string):
        driver, s, base_url = login
        driver.get(base_url + "/")
        driver.find_element_by_id("kw").send_keys(search_string)
        driver.find_element_by_id("su").click()
        time.sleep(2)
        search_results = driver.find_element_by_xpath('//*[@id="1"]/h3/a').get_attribute('innerHTML')
        print(search_results)
        assert (expect_string in search_results) is True

if __name__ == "__main__":
    pytest.main([])
```

在命令行中通过如下代码执行：

```bash
D:\_Automation\lagouAPITest>pytest -s -q --tb=no  tests
```

你可以注意到，connecting db 这条语句被打印了三次，是因为我在 conftest.py 里把 connect_db 这个 fixture 的 scope 设置为 function 且 autouse 的属性值是 True。而 turn off browser driver，turn off requests driver 这两条语句仅仅执行了一次，是因为 login 这个 fixture 的 scope 是 session，故它在整个 session 中仅仅执行了一次。

另外请注意下在 fixture login 中，有如下的语句：

```python
...
...
yield driver, s, base_url
print('turn off browser driver')
driver.quit()
print('turn off requests driver')
s.close()
```

这个是什么意思呢？ 在 pytest 的 fixture 里，yield关键字语句之前的属于 set up，而 yield 以后的语句属于 tear down。

这样你就明白了，为什么以下语句是最后执行的了：

```python
print('turn off browser driver')
driver.quit()
print('turn off requests driver')
s.close()
```

### pytest.mark.parametrize 和 pytest.fixture 结合使用

通过上面的讲解我们了解到，在 pytest 中可以使用 pytest.mark.parametrize 装饰器进行数据驱动测试，可以使用 pytest.fixture 装饰器进行测试的 setup、tear down，以及 fixture 共享的测试。

那么 pytest.mark.parametrize 和 pytest.fixture 结合起来，能达到什么目的呢？

- 减少了重复代码，实现了代码全局共享

所有的测试前置及后置功能均可以定义在 conftest.py 文件中，供整个测试使用，而不必在每一个测试类中定义。这样做大大减少了重复代码，且 conftest.py 定义在项目根目录，就可以应用在全局，定义在某一个文件夹，就可以应用于这个文件夹下的所有测试文件。

- 可以使测试仅关注测试自身

测试仅围绕自身业务进行编码即可，配合使用 conftest.py 及 pytest.fixture 可实现，在一个测试类中，仅仅包括测试自身的代码，而不必考虑测试前的准备以及测试后的清理工作。

- 框架迁移更容易

如果是 UI 自动化测试，可在 conftest.py 文件中包括 Web Driver 的所有操作，如果是 API 测试，可在 conftest.py 文件中编写所有接口请求操作。这样当新项目需要应用自动化框架时，仅需更改 tests 文件夹下的测试用例即可。

下面写一个简单的例子，来介绍下 pytest.mark.parametrize 和 pytest.fixture 如何结合：

```python
# test_sample.py
import pytest

@pytest.fixture()
def is_odd(request):
    print('Now the parameter are:--{}\n'.format(request.param))
    if int(request.param) % 2 == 0:
        return False
    else:
        return True

@pytest.mark.parametrize("is_odd", [1, 0], indirect=True)
def test_is_odd(is_odd):
    if is_odd:
        print("is odd number")
    else:
        print("not odd number")

if __name__ == "__main__":
    pytest.main([])
```

这段代码把我定义了一个 fixture 方法 is_odd 和一个数据驱动的方法 test_is_odd。其中，fixture 方法 is_odd 判断一个数是否是奇数；而数据驱动的方法 test_is_odd 会提供一组数据，并且调用 is_odd 这个 fixture 进行判断。

## Pandas：拒绝低效，数据驱动新手段

### 使用 pytest 进行数据驱动的基本思路

我们知道 pytest 可以通过 pytest.mark.parametrize 来实现数据驱动，而 pytest.mark.parametrize 接受的数据格式要求为：

- 如果只有一组数据，以列表的形式存在；
- 如果有多组数据，以列表嵌套元组的形式存在（例如 `[0,1] 或者 [(0,1), (1,2)]`）。

既然如此，我们只需要创建一个方法，在这个方法里解析我们提供的各种数据格式，然后解析后返回 pytest.mark.parametrize 支持的格式就好。

### 常规的数据驱动方法

#### 1.pytest 操作 JSON/YAML 文件实现数据驱动

我们先按照刚刚所说的使用 pytest 进行数据驱动的基本思路创建一个读取 JSON 文件和 YAML 文件的方法：

```python
def read_data_from_json_yaml(data_file):
    return_value = []
    data_file_path = os.path.abspath(data_file)
    print(data_file_path)
    _is_yaml_file = data_file_path.endswith((".yml", ".yaml"))
    with codecs.open(data_file_path, 'r', 'utf-8') as f:
        # Load the data from YAML or JSON
        if _is_yaml_file:
            data = yaml.safe_load(f)
        else:
            data = json.load(f)
    for i, elem in enumerate(data):
        if isinstance(data, dict):
            key, value = elem, data[elem]
            if isinstance(value, dict):
                case_data = []
                for v in value.values():
                    case_data.append(v)
                return_value.append(tuple(case_data))
            else:
                return_value.append((value,))
    return return_value
```

read_data_from_json_yaml 这个方法，实现了自动读取 JSON 文件和 YAML 文件，并且把 JSON 文件和 YAML 文件中的数据提取出来，并按照 pytest.mark.parametrize 可接收的方式返回。代码比较简单，我就不再一一讲解其含义

> 注意：如果你的测试文件与本文中的 YAML 和 JSON 文件的层次不同，此方法也需要做相应的修正。

有了这个方法，JSON 或者 YAML 文件的数据通过此方法就可以转换成 pytest.mark.parametrize 认可的格式直接传入了。

下面实践一下，在 lagouAPITest 项目根目录下创建如下文件目录：

```bash
|--lagouAPITest
    |--tests_pytest_ddt
        |--test_baidu_ddt.py
        |--test_baidu_ddt.json
        |--test_baidu_ddt.yaml
        |--test_baidu_ddt.xlsx
        |--__init__.py
        |--conftest.py
```

其中，test_baidu_ddt.json 文件的内容如下：

```json
{ 
  "case1": {
  "search_string": "itesting",
  "expect_string": "iTesting"
  },
  "case2": {
  "search_string": "helloqa.com",
  "expect_string": "iTesting"
  }
}
```

test_baidu_ddt.yaml 文件的内容如下：

```yaml
"case1":
  "search_string": "itesting"
  "expect_string": "iTesting"
 
"case2": 
  "search_string": "helloqa.com"
  "expect_string": "iTesting"
```

test_baidu_ddt.py 文件的代码如下：

```python
# -*- coding: utf-8 -*-
import codecs
import json
import os
import time
import pytest
import yaml

def read_data_from_json_yaml(data_file):
    return_value = []
    data_file_path = os.path.abspath(data_file)
    print(data_file_path)
    _is_yaml_file = data_file_path.endswith((".yml", ".yaml"))
    with codecs.open(data_file_path, 'r', 'utf-8') as f:
        # Load the data from YAML or JSON
        if _is_yaml_file:
            data = yaml.safe_load(f)
        else:
            data = json.load(f)
    for i, elem in enumerate(data):
        if isinstance(data, dict):
            key, value = elem, data[elem]
            if isinstance(value, dict):
                case_data = []
                for v in value.values():
                    case_data.append(v)
                return_value.append(tuple(case_data))
            else:
                return_value.append((value,))
    return return_value

@pytest.mark.baidu
class TestBaidu:
    @pytest.mark.parametrize('search_string, expect_string',  read_data_from_json_yaml('tests_pytest_ddt/test_baidu_ddt.yaml'))
    def test_baidu_search(self, login, search_string, expect_string):
        driver, s, base_url = login
        driver.get(base_url + "/")
        driver.find_element_by_id("kw").send_keys(search_string)
        driver.find_element_by_id("su").click()
        time.sleep(2)
        search_results = driver.find_element_by_xpath('//*[@id="1"]/h3/a').get_attribute('innerHTML')
        print(search_results)
        assert (expect_string in search_results) is True

if __name__ == "__main__":
    pytest.main(['-s', '-v'])
```

此段代码跟我们在**DDT：博采众长，数据驱动的秘诀（二）**中讲解的代码几乎相同，唯一的改变在于增加了一个新方法 read_data_from_json_yaml，另外 @pytest.mark.parametrize 的参数，从直接提供参数变成了**从文件提供参数**。

```python
（read_data_from_json_yaml('tests_pytest_ddt/test_baidu_ddt.yaml')）
```

在命令行中通过如下方式运行：

```bash
D:\_Automation\lagouAPITest>pytest tests_pytest_ddt -s -v
```

可以看到，两个测试用例都执行了，并且 YAML 文件中的数据被正确读取。

那么如果我们现在要执行 JSON 文件中的数据该如何操作呢？把上述第 40 行代码中的 yaml 文件后缀换成 json 文件后缀，再次执行即可。

#### 2.pytest 操作 Excel 文件实现数据驱动

在实际应用中，也有很多公司使用 Excel 来做数据驱动。 在 python 中，读写 Excel 的 library 很多，常见的有 xlrd、xlwt，以及openpyxl。由于 xlrd 和 xlwt 只能分别用作读和写，实现同样的读写操作，它的代码行数较多，故逐渐变得不再流行。所以下面我将重点介绍 openpyxl 的使用。

**（1）openpyxl 安装**

```bash
pip install openpyxl
```

**（2）openpyxl 使用**

```python
   from openpyxl import load_workbook, Workbook
if __name__ == "__main__":
    # 创建一个workbook
    file_name = r'c:\test.xlsx'
    wb = Workbook()
    # 创建一个sheet，名为iTesting，把它插入到最前的位置
    wb.create_sheet('iTesting',0)
    # 创建一个sheet，名为VIPTEST，把它插入index为1的位置
    wb.create_sheet('VIPTEST',1)
    # 保存表格
    wb.save(file_name)
    # 读和写
    # 初始化表格
    wb2 = load_workbook(file_name)
    # 读，获取所有的sheet名称
    print(wb2.sheetnames)

    # 获取sheet名为iTesting的表格
    s = wb2['iTesting']
    # 将A1行的值设置为iTesting
    s['A1'] = 'iTesting'
    # 将第2行，第一列的值设置为1
    s.cell(row=2, column=1).value = 1
    # 打印第2行第一列单元格的值 --方法1
    print(s.cell(row=2,column=1).value)
    # 打印第2行第一列单元格的值 --方法2
    print(s['A2'].value)
    # 保存表格
    wb.save(file_name)
```

上面的一段代码里，我简单介绍了 openpyxl 的用法，涉及创建表格、创建 sheet 名、读取单元格的值、设置单元格的值等部分。你可以看出使用 openpyxl 操作 excel 是相对比较简单的。

**（3）openpyxl 结合 pytest 实现数据驱动**

文件 test_baidu_ddt.xlsx 的内容如下（sheet 名 iTesting）：

| search_string | expect_string |
| ------------- | ------------- |
| iTesting      | iTesting      |
| hello@qq.com  | iTesting      |

我们来写个读 Excel 的方法，代码如下：

```python
def read_data_from_excel(excel_file, sheet_name):
    return_value = []
    # 判断文件是否存在
    if not os.path.exists(excel_file):
        raise ValueError("File not exists")
    # 打开指定的sheet
    wb = load_workbook(excel_file)
    # 按照pytest接受的格式输出数据
    for s in wb.sheetnames:
        if s == sheet_name:
            sheet = wb[sheet_name]
            for row in sheet.rows:
                return_value.append([col.value for col in row])
    # 第一行数据是标题，故skip掉
    return return_value[1:]
```

更新 test_baidu_ddt.py 文件，把 read_data_from_excel 的方法加进去，更新后的代码如下：

```python
# -*- coding: utf-8 -*-
import codecs
import json
import os
import time
import pytest
import yaml
from openpyxl import load_workbook

def read_data_from_json_yaml(data_file):
    return_value = []
    data_file_path = os.path.abspath(data_file)
    print(data_file_path)
    _is_yaml_file = data_file_path.endswith((".yml", ".yaml"))
    with codecs.open(data_file_path, 'r', 'utf-8') as f:
        # Load the data from YAML or JSON
        if _is_yaml_file:
            data = yaml.safe_load(f)
        else:
            data = json.load(f)
    for i, elem in enumerate(data):
        if isinstance(data, dict):
            key, value = elem, data[elem]
            if isinstance(value, dict):
                case_data = []
                for v in value.values():
                    case_data.append(v)
                return_value.append(tuple(case_data))
            else:
                return_value.append((value,))
    return return_value

def read_data_from_excel(excel_file, sheet_name):
    return_value = []
    if not os.path.exists(excel_file):
        raise ValueError("File not exists")
    wb = load_workbook(excel_file)
    for s in wb.sheetnames:
        if s == sheet_name:
            sheet = wb[sheet_name]
            for row in sheet.rows:
                return_value.append([col.value for col in row])
    print(return_value)
    return return_value[1:]

@pytest.mark.baidu
class TestBaidu:
    # 注意，此处调用我换成了读Excel的方法
    @pytest.mark.parametrize('search_string, expect_string',  read_data_from_excel(r'D:\_Automation\lagouAPITest\tests_pytest_ddt\test_baidu_ddt.xlsx', 'iTesting'))
    def test_baidu_search(self, login, search_string, expect_string):
        driver, s, base_url = login
        driver.get(base_url + "/")
        driver.find_element_by_id("kw").send_keys(search_string)
        driver.find_element_by_id("su").click()
        time.sleep(2)
        search_results = driver.find_element_by_xpath('//*[@id="1"]/h3/a').get_attribute('innerHTML')
        print(search_results)
        assert (expect_string in search_results) is True

if __name__ == "__main__":
    pytest.main(['-s'， '-v'，'tests_pytest_ddt'])
```

在命令行中通过如下方式再次运行即可：

```bash
D:\_Automation\lagouAPITest>pytest tests_pytest_ddt -s -v
```

运行后查看结果，你会发现测试被正确执行，测试数据是从 Excel 指定的 sheet 名中获取的。

### 数据驱动新姿势

#### 1.Pandas 实现数据驱动

openpyxl 操作 Excel 非常简洁，但是相对于 Pandas 来说，还不够简洁，而且 openpyxl 运算效率不如 Pandas，特别是当表格行项目过多时，openpyxl 运算较慢。

我们知道，当测试脚本过多时，单个脚本的运行时间差异加起来也会是个不小的浪费。作为测试开发，我们有义务提升测试效率。

Pandas 是一个强大的**分析结构化数据**的工具集，它的使用基础是 Numpy（提供高性能的矩阵运算）；Pandas 用于数据挖掘和数据分析，同时也提供数据清洗功能。使用 Pandas 操作 Excel 数据，就好像数数那样简单。

**Pandas 安装**

```bash
# pandas默认依赖xlrd库，故先安装xlrd
pip install xlrd
# 安装Pandas
pip install Pandas
```

**Pandas 语法**

```python
import Pandas as pd
# 首先初始化，engine默认是xlrd
s = pd.ExcelFile(path_or_buffer, engine=None)

# 接着parse
s.parse(sheet_name=0,header=0,names=None,index_col=None,usecols=None,
squeeze=False,converters=None,true_values=None,false_values=None,
skiprows=None,nrows=None,na_values=None,parse_dates=False,
date_parser=None,thousands=None,comment=None,skipfooter=0,
convert_float=True,mangle_dupe_cols=True,**kwds,)
```

Pandas 读取 Excel 文件非常简单，首先使用 Pandas 初始化 ExcelFile。其两个参数path_or_buffer 是我们要读取的文件路径。

Excel 文件名称建议使用英文路径及英文命名方式，尽量不要使用中文。

```python
import pandas as pd
path_or_buffer = r'D:\_Automation\lagouAPITest\tests_pytest_ddt\test_baidu_ddt.xlsx'
```

engine 是供 Pandas 使用的 engine，可选项为“xlrd”“openpyxl”“odf”和“pyxlsb”，如果不提供，默认使用 xlrd。

#### parse 函数的参数

初始化后，可以使用 s.parse() 函数。parse 函数有非常多的参数，在此我列出常用的几个。

- **sheet_name: Excel 的 sheet 名**

sheet_name 可以是整型数字、列表名，或者上述两者组合。

```python
# 通过整型数字读取。读取第一个sheet。 Pandas sheet名下标以0开始
s = pd.ExcelFile(path_or_buffer, sheet_name = 0)
# 通过列表名读取
data = s.parse(sheet_name = 'iTesting')
# 通过index读取。读取第一个sheet
data = s.parse(sheet_name = 0)
#组合读取。读取第4个sheet，名为iTesting的sheet以及第7个sheet
data = s.parse(sheet_name = [3, 'iTesting', 'Sheet6'])
```

- **header：使用哪一行作为列名*8

header 默认值为 0，即第一行，也可以设置为 [0, x]。

（例如 `[0,1]` 意味着将前两行作为多重索引）

```python
data = s.parse(sheet_name = 'iTesting', header = 0)
```

需要注意： Pandas 默认使用第一行为 header，所以在 Excel 里，第一行必须是 title，如果第一行是数据，将会导致第一行数据被遗漏。如果不想要 header，可以参数传递 header=None。

- **usecols：待读取的列**

usecols 接收整型，从 0 开始，例如 [0, 1, 2]，也可以使用列名例如 “A:D, F”，表示读取 A 到 D 列，以及 F 列。

```python
data = s.parse(sheet_name = 'iTesting', usecols='A:D')
```

- **skiprows：读取时，跳过特定行**

skiprows=n，跳过前 n 行；skiprows = [a, b, c]，跳过第 a+1、b+1、c+1 行（索引从0开始）

```python
data = s.parse(sheet_name = 'iTesting', skiprows = [1,2,3])
```

- **nrows：需要读取的行数*8

仅仅列出要读取的行数

```python
data = s.parse(sheet_name = 'iTesting', nrows = 3)
```

#### Pandas 结合 pytest 实现数据驱动

了解了 Pandas 语法后，我们来看下如何使用 Pandas 读取 Excel 数据：

```python
def read_data_from_pandas(excel_file, sheet_name):
    if not os.path.exists(excel_file):
        raise ValueError("File not exists")
    # 初始化
    s = pd.ExcelFile(excel_file)
    # 解析Excel Sheet
    df = s.parse(sheet_name)
    # 以list格式返回数据
    return df.values.tolist()
```

可以看到，使用 pandas 读取 Excel 数据更加简洁方便。

最后，我们来更新下 test_baidu_ddt.py 文件，更新后的代码如下：

```python
# -*- coding: utf-8 -*-
import codecs
import json
import os
import time
import pytest
import yaml
from openpyxl import load_workbook
import pandas as pd
# 读取Yaml文件和Json文件
def read_data_from_json_yaml(data_file):
    return_value = []
    data_file_path = os.path.abspath(data_file)
    print(data_file_path)
    _is_yaml_file = data_file_path.endswith((".yml", ".yaml"))
    with codecs.open(data_file_path, 'r', 'utf-8') as f:
        # Load the data from YAML or JSON
        if _is_yaml_file:
            data = yaml.safe_load(f)
        else:
            data = json.load(f)
    for i, elem in enumerate(data):
        if isinstance(data, dict):
            key, value = elem, data[elem]
            if isinstance(value, dict):
                case_data = []
                for v in value.values():
                    case_data.append(v)
                return_value.append(tuple(case_data))
            else:
                return_value.append((value,))
    return return_value
# 读取Excel 文件 -- openpyxl
def read_data_from_excel(excel_file, sheet_name):
    return_value = []
    if not os.path.exists(excel_file):
        raise ValueError("File not exists")
    wb = load_workbook(excel_file)
    for s in wb.sheetnames:
        if s == sheet_name:
            sheet = wb[sheet_name]
            for row in sheet.rows:
                return_value.append([col.value for col in row])
    print(return_value)
    return return_value[1:]
# 读取Excel文件 -- Pandas
def read_data_from_pandas(excel_file, sheet_name):
    if not os.path.exists(excel_file):
        raise ValueError("File not exists")
    s = pd.ExcelFile(excel_file)
    df = s.parse(sheet_name)
    return df.values.tolist()
@pytest.mark.baidu
class TestBaidu:
    @pytest.mark.parametrize('search_string, expect_string',  read_data_from_pandas(r'D:\_Automation\lagouAPITest\tests_pytest_ddt\test_baidu_ddt.xlsx', 'iTesting'))
    def test_baidu_search(self, login, search_string, expect_string):
        driver, s, base_url = login
        driver.get(base_url + "/")
        driver.find_element_by_id("kw").send_keys(search_string)
        driver.find_element_by_id("su").click()
        time.sleep(2)
        search_results = driver.find_element_by_xpath('//*[@id="1"]/h3/a').get_attribute('innerHTML')
        print(search_results)
        assert (expect_string in search_results) is True

if __name__ == "__main__":
    pytest.main(['-s', '-v', 'tests_pytest_ddt'])
```

在命令行中通过如下方式再次运行即可：

```bash
D:\_Automation\lagouAPITest>pytest tests_pytest_ddt -s -v
```

运行后查看结果，你会发现测试被正确执行，测试数据是通过 Pandas 从 Excel 指定的 sheet 名中获取的。
事实在，Pandas 不仅仅能读取 Excel 文件，还可以读取 HTML 文件、TXT 文件、JSON 文件、数据库文件 (.sql) 等。在数据分析领域，Pandas 使用非常广泛，更多具体的 Pandas 使用，请自行查阅。

#### 2.自定义实现数据驱动

我在“ DDT：博采众长，数据驱动的秘诀”里，详细讲解了如何使用 ddt、pytest.mark.parametrize 和 pytest.fixture 来实现数据驱动。今天我来讲 pytest 里另外一个实现数据驱动的方式 pytest_generate_tests。

- **直接提供数据实现数据驱动**

pytest 中提供了一个钩子函数，名为 pytest_generate_tests。此函数在 pytest 收集测试函数时会被调用。通过传入 metafunc 对象，我们可以“自定义”数据驱动，即通过调用metafunc.parametrize() 来进行参数化。

我们先看一个例子：

```python
# 定义文件test_customize_ddt.py
import pytest

def pytest_generate_tests(metafunc):
    # 查看metafunc有多少种可用方法
    print(dir(metafunc))
    if "text_para" in metafunc.fixturenames:
        # 指定参数化名称，及其对应的值
        metafunc.parametrize("text_para", [["iTesting", "iTesting"], ["always", "always"], ["awesome", "good"]])

class TestClass:
    def test_func(self, text_para):
        input_str, output_str = text_para
        print(input_str)
        print(output_str)
        assert input_str == output_str

if __name__ == "__main__":
    pytest.main(['-s', '-v', 'test_pytest_ddt/test_customize_ddt.py'])
```

直接在 Pycharm 中运行此文件，或者在命令行中通过如下方式运行：

```bash
D:\_Automation\lagouAPITest>pytest -s -v tests_pytest_ddt/test_customize_ddt.py
```

可以看到，有 3 个测试用例被执行了，执行的测试用例是 test_func 这个函数，执行的结果是两个成功，一个失败（注意，一个用例失败不会影响其他用例执行）。其使用的数据正好就是我们提供的这组数据：

```python
[["iTesting", "iTesting"], ["always", "always"], ["awesome", "good"]]
```

下面我来讲解下这段代码。

首先，我定义了一个函数，名字为 pytest_generate_tests(metafunc)， 注意这个函数名称和参数名称均是固定的，不可更改。

然后，我在函数 pytest_generate_tests 中（第 7 行）打印出 metafunc 可用的方法有哪些。 事实上，通过查看源代码可以发现，metafunc 支持的属性有：

```python
#: Access to the :class:`_pytest.config.Config` object for the test session.
# 用于在测试session中访问:class:`_pytest.config.Config`对象
metafunc.config
#: The module object where the test function is defined in.
#： 代表使用参数名称进行参数化的test function所在的模块对象
metafunc.module
#: Underlying Python test function.
#： 测试用例对象
metafunc.function
#: Set of fixture names required by the test function.
#： test function参数化所需的fixtures名字
metafunc.fixturenames
#: Class object where the test function is defined in or ``None``.
# test function所属的类的类对象，如果没有，就是None
metafunc.cls
```

我使用 metafunc.fixturenames 列出所有可能的 fixture 名字，并当它的名字跟我提供的 fixture 名称一样时，我使用 metafunc.parametrize 函数为其提供参数化的数据值，以便实现数据驱动（8~11 行）。

接着，我定义了一个测试类 TestClass，然后在其中定义了一个类方法 test_func，并在其中定义了一个“参数” text_para。 而这个“参数“名称 text_para 实际上就是我提供的 fixtures。

最后，pytest.main() 函数运行， 在收集测试函数时，会找到 test_func 这个函数，然后在运行这个函数前，函数 pytest_generate_tests 会被调用，通过查看代码运行，你可以看到：

metafunc 对象被传入进来，它的 5 个属性分别是：

![2][2]

接着 pytest 会在其中经过一系列复杂的操作，最终为 text_para 这个 fixture 完成参数化，并且根据数据的组数将测试用例 test_func 分成多个测试用例，接着依次运行新生成的测试用例，并且为每一个测试用例提供一组数据，如下：

![3][3]

接着，这些测试用例依次运行完毕，输出结果。

- **从外部文件提供数据实现数据驱动**

数据驱动的最大好处就是更改数据不需要更改代码， 所以将测试数据抽离出来到外部文件是通用的做法，下面我们就来看下如何做。

在 lagouAPITest 项目根目录下创建如下文件目录：

```bash
|--lagouAPITest
    |--tests_pytest_new_ddt
        |--test_new_ddt.py
        |--data_new_ddt.py
        |--__init__.py
```

其中 data_new_ddt.py 文件的内容如下：

```python
tests = [
    ["iTesting", "iTesting"], 
    ["always", "always"], 
    ["awesome", "good"]
]
```

test_new_ddt.py 的代码如下：

```python
import importlib
import pytest

def pytest_generate_tests(metafunc):
    package_name = metafunc.module.__package__
    for fixture in metafunc.fixturenames:
        if fixture.startswith('data_'):
            # 加载测试数据
            module_name = package_name + '.' + fixture
            tests = TestClass.load_tests(module_name)
            metafunc.parametrize(fixture, tests)

class TestClass:
    @staticmethod
    def load_tests(name):
        # 加载测试数据文件
        tests_module = importlib.import_module(name)
        # 针对每一个测试文件，赋予不同的测试值
        for test in tests_module.tests:
            yield test
    def test_func(self, data_new_ddt):
        input_str, output_str = data_new_ddt
        assert input_str == output_str

if __name__ == "__main__":
    pytest.main(args=['-s', '-v', 'tests_new_ddt/test_new_ddt.py'])
```

这段代码比较复杂，我来一一解释。

首先，函数 pytest_generate_tests 仍然是实现了把给定的 fixture（data_new_ddt）加载进来，并且根据测试数据生成多组测试用例。

其次， 测试类 TestClass 中的 load_tests 静态方法实现了解析测试数据并逐个返回， 这里用了yield。 yield 在fixture 里是个特殊的存在，它用于返回 fixture 的分组测试数据。正因为此，通过 load_tests 函数返回的数据才能正确地被 metafunc.parametrize 参数化（把 load_tests 里的 yield 改成 true，测试会出错）。

最后， 分组测试数据被生成的多组新测试用例返回，并用于测试方法 test_func 中，从而实现了从外部文件提供数据实现数据启动。

## 测试框架如何做好数据持久化？（一）

在前面几节课中，我们花费了大量篇幅来讲解数据驱动，原因无它，因为测试数据是你的业务，乃至你的公司最重要的资产之一。有了数据，你就可以知道：

- 在历次版本变更中，质量的变化曲线是怎么样的？
- 在一个长的时间段内，哪个模块的问题比较多，哪个模块的性能不够好？
- 哪个开发的 bug 最少，哪个 QA 提的 bug 最多？
- 哪个项目经理从不延期，哪个项目经理经常变需求？

测试数据如此重要，但在很多公司内，并没有引起足够多的重视，所以今天我将分享下我关于测试数据的一些思考，尤其是其存在的一些问题和解决方法。

### 测试数据简述

什么是测试数据呢？提出这个问题，我想大家都觉得有点莫名其妙。测试数据不就是我们天天用来做测试的数据吗？其实不然，从我的角度看， 测试数据指的是跟测试有关的数据，它可以分为以下几类。

#### 1. 测试请求数据

测试请求数据，就是我们常常理解的测试数据。这部分数据是**测试用例执行**的必要输入（这里的测试用例是指自动化测试用例，通常以**测试脚本**的形式存在）。

它可以是直接耦合在测试用例里的，也可以是放在外部文件。放在外部文件的情况，即我们前几个章节讲的，测试数据可以存储在 JSON、YAML、TXT、Excel File(xlsx)、CSV、SQL 文件，甚至 .py 文件中。这部分测试数据的使用，通过前面的学习，我们已经非常熟练了。对于测试请求数据，也分为以下两种情况。

- 强制数据

发送请求时必须携带的数据即强制数据，例如：

在 UI 自动化测试中提交表单，那些你不填写就无法提交表单的数据；

在 API 自动化测试中，那些你在请求时**必须携带**的参数和数据，**否则发送请求就会报错**。

- 非强制数据

发送请求时非强制携带的数据即非强制数据，例如：

在 UI 自动化测试中提交表单，那些不填写也可以提交表单的数据；

在 API 自动化测试中，那些你在请求时**不携带，发送请求也不会报错**的参数和数据。

#### 2. 测试期望数据

测试期望数据，通常用作跟测试后产生的结果数据进行比较的数据。这部分数据，常常是伴随着断言函数存在。

用于判定根据测试请求数据生成的**测试结果数据，是否跟测试期望数据相同**。如果相同，则说明业务行为符合预期；不相同，则说明业务行为跟需求不一致，可能存在Bug。

#### 3. 测试结果数据

即经过测试请求数据的输入，系统产生的结果数据，这部分数据也分为两种情况：

- 单纯的结果数据

指未经分析、聚合的数据。例如某一个测试用例的结果数据。它们的作用常常是用来与用户提供的**测试期望数据进行比较**，来验证业务的正确性。

- 聚合的结果数据

聚合的结果数据，通常指**测试报告**。 通过把单纯的结果数据聚合，可以使聚合的结果数据告诉我们更多关于系统质量的信息。例如在一次测试后，测试报告可以告诉我们，有多少条测试用例成功，有多少条测试用例失败， 测试失败的用例属于哪个模块等问题。 通过多次测试报告的对比，我们可以看出哪个测试模块经常出问题，哪个模块基本稳定，哪个模块的性能又下降了等问题，通过分析聚合数据有助于完善我们的测试策略。

### 测试请求数据的准备方式

测试请求数据准备在自动化测试中常常会耗费较多的时间，如何有效地准备测试数据，甚至是一个独立的话题。这里我根据自身经验，列出常用的几种数据准备方式供你参考。

#### 1.根据业务规则手工创建

这个是目前最简单的一种方式，由测试人员**直接提供**测试请求数据，包括强制数据和非强制数据。通过直接提供给测试方法或者使用外部文件保存测试请求数据。外部文件保存的测试请求数据在测试进行时，通过数据驱动逐个读取并应用到测试用例（测试脚本）。

手工创建的测试请求数据有一个**缺点**，即测试请求数据**永远不会变化**，这个不符合正常的用户使用情况。

#### 2. 使用第三方 fake data 库自动生成

为了更好地模拟正常用户的使用情况，可以使用第三方 fake data，例如 python 中常用的 faker库。通过调用这些 fake data 的库，可以生成更接近正常用户使用的测试数据。

但这种数据一般**仅限创建数据时使用**。比如注册，填写反馈表单的情况。对于查询型数据，则不适用，因为查询型数据，通常要求数据已经存在系统数据库中。

#### 3. 通过 SQL 查询得出的数据文件

通过 SQL 查询获取测试请求数据的方式是**比较常用**的方式。一般这种方式**适用于一个请求数据的请求本身，来自不同业务的输出的情况**。比如测试商品扣款接口，那么这个接口的输入必须要有用户 id、商品 id、商品价格、用户余额等参数，而这些参数由一个或多个服务提供。所以使用 SQL 语句组合查询是比较快捷的一种方式。

通过SQL语句查询得出测试数据，如果join的表过多，存在数据生成效率问题。

#### 4. 根据测试平台自动生成数据

数据构造平台（Data platform）是最近几年比较流行的一个数据生成解决方法，它综合了以上几种数据生产的方式，通过提供统一的接口，使用户可以方便地生成测试数据，而不必关心数据是如何生成的，但数据构造平台的构建需要**测试团队有一定的架构能力**。

#### 5. 拷贝自生产环境

通过拷贝生产环境的流量，用于测试环境测试。这个方式**常见于性能测试中**，通过拷贝线上流量到测试环境的方式来构造测试数据。

常见的解决方案有 TcpCopy、goreplay 等。此方式对测试团队的架构能力、代码开发能力有比较高的要求，往往还需要开发团队的配合甚至主导，一般通过公司内部专门组建攻坚项目的方式实行。

### 测试请求数据的准备时机

关于在测试的哪个阶段去创建测试请求数据，目前业界有以下两种方式。

#### 1. 在测试运行前准备

在测试运行前准备，即测试数据是 hard code 的形式存在。可以直接 hard code 在测试方法里，也可以是写在各种格式的数据文件中。像上文中提及的**根据业务规则手工创建测试数据**，就是测试运行前准备的最好示例。

#### 2. 在测试运行时准备

在测试运行时准备，指不事先指定测试数据，即测试代码中无测试数据文件。 测试数据是通过在测试运行时， 先行通过调用数据构造平台或者通过组合查询 DB 的方式，直接生成测试用例要求的测试数据，然后再开始测试。

关于测试数据要在何时准备，目前业界没有统一的结论，你可以根据自身情况自由选择。

### 测试请求数据存在的问题及应对方法

当前，无论是以什么方式准备数据，无论采用何种时机生成测试请求数据，测试请求数据都可能会有如下的问题。

#### 1. 测试数据过期

这种情况常见于测试请求数据事先准备的情况。例如有一组数据是用于优惠券的扣除，但通常优惠券都有有效期。在优惠券过期之后，使用这组数据进行测试，必然导致测试失败。所以对于事先准备的测试请求数据，必须要**定期维护**。

#### 2. 多次运行导致测试结果不同

这种情况也常因为数据是提前准备的而发生。例如提供了一组测试数据用于用户注册，当第一次测试运行时，测试会正常通过，但是第二次测试会由于用户已存在而导致测试失败。

对于测试的过程中需要进行写 DB 操作的情况，最好**在测试结束后做 tear down 操作**，使系统恢复测试前的状态。

#### 3. 环境切换导致测试数据不可用

通常情况下，一个产品的发布，必然要经过几个测试环境的测试。例如，开发环境、集成测试环境、预生产环境、生产环境等。每个环境的测试数据可能不尽相同，切换环境必须保证测试数据可用。

对于环境切换导致测试数据不可用的问题，可通过如下两个方式解决：

- 保证每个测试环境用同一套数据

此种方式比较烦琐，适用于新项目。给每一个测试环境创建相同的测试数据，避免因测试环境切换导致测试错误。

- 测试框架具备切换测试环境，自动化查找相应环境数据的能力

这个方式比较常见，不同的测试环境可以有不同的测试数据。测试框架具备切换测试环境后，自动挂载相应测试环境的测试数据的能力。

#### 4. 测试数据在测试运行中被更改

测试数据可能在测试中被动态更改。比如用户的余额存在数据库中，而测试数据是在测试运行时候生成的。即测试运行时去查询获取用户余额才发现用户余额不足。

对于这种情况，通常需要**更改测试数据生成的条件**，即把查询语句写得更健壮，确保获取到的用户一定是有余额的。或者加条件判断，如果发现没有余额，则调用另外的服务给用户充值。

#### 5. 并发运行导致测试数据不可用

并发运行测试用例，或者多个人同时运行同一条测试用例，可能会导致多个测试用例共同操作同一组数据。这样可能导致测试失败（例如不同的人拿同一条测试数据进行注册操作）。

对于这种情况，可以编码允许测试框架支持并发运行时使用同一个数据文件，但是这样通常投入较多。 为了避免投入太多开发精力，大多数情况会**采用多个类支持并发**，一个类下面的测试用例**顺序执行**的方式来避免同一个测试类下的测试用例，同时访问同一个测试数据。

## 测试框架如何做好数据持久化？（二）

### 为什么要数据持久化

数据持久化的好处有很多，这里列出比较突出的几个。

#### 1 . 可以使回归测试的范围更准确

通过对相邻版本测试结果数据的对比（通常是指跑所有测试用例的测试），我们可以清晰地掌握在本次测试及上次测试之间，**有哪些测试用例受到影响，从而验证两个版本之间的更改， 所影响的范围是否与预期一致**。

例如，本版本的改动我们认为只会影响 A 模块，结果却发现 B 模块的一个测试用例运行失败了。则我们在以后更改 A 模块时，应该主动把 B 模块的这个失败用例纳入回归测试中，从而在更早阶段发现潜在 bug。

#### 2. 可以发现测试用例本身的问题

如果某个测试用例在多个版本中均运行失败了，或者有很大概率会失败。如果这个失败不是 bug 引起的，则说明这个测试用例是不稳定的测试用例，应该加以改进。

#### 3. 可以发现潜在的性能问题

通过对各个版本的测试结果对比，我们可以发现潜在的性能问题。 比如在某一段时间内，相同的测试用例集，整个测试的整体运行时间越来越久，则说明某些业务的性能在下降。

#### 4. 可以让整个团队都加入质量保障中

通过持久化的保存测试结果数据，并且以报表的形式发送给相关干系人。可以使得除开发、测试**之外的团队角色**对产品的质量有完整且不断更新的认识，可以促进关键干系人对产品质量的关注，从而获得更多的资源倾斜。

### 如何进行测试数据持久化

测试数据持久化不外乎就是把数据放到 DB 中，但是如果只是单纯的存储，并不能享用到数据持久化的好处。通常情况下，我们的测试请求数据，要跟测试用例进行一一对应。

而测试用例，应该要根据不同的测试目的，放到不同的测试套件里去，最后通过**测试套件的执行，形成测试用例、测试脚本、测试数据、 测试结果的对应**，从而方便后续我们对测试结果数据进行多维度分析。

那么怎么使得测试数据持久化能够实现上述目标呢？当前流行的解决方案有以下几种。

#### 1. JIRA

其实是 JIRA+ Zephyr 或者 JIRA + synapseRT。其中 JIRA 在国外，是公认的市场占有率最高的项目管理和开发管理工具，而 Zephyr 和 synapseRT 均是收费的 JIRA 插件。

- Zephyr 的用例管理虽然使用简单，但是无法记录和跟踪需求，管理人员无法直观了解测试进度，所以较难从项目整体角度来管理测试用例；

- synapseRT 可以用来记录和跟踪需求，也可以用来创建、组织、计划和执行测试用例，还可以用来批量执行测试用例、链接 Bug，以及生成各种关于需求和测试的报告等等。

#### 2. 禅道

禅道作为国内市场占有率第一的，并且是国产、开源的专业研发项目管理软件，可用作缺陷管理、需求管理和任务管理，在功能上与 JIRA 不相上下。

并且禅道有很多专有工具，例如 zendata 测试数据生成器、ztf 自动化测试框架等，可以一站式地完成项目管理，以及测试管理与执行，非常适合中小团队使用。

**（1）禅道安装、配置**

禅道支持多个平台，每个平台的安装和配置各有不同，你可以参考这个[禅道安装指南](https://www.zentao.net/book/zentaopmshelp/64.html)进行安装和配置。

下面我将以禅道为例，向你讲解禅道各个组件、模块之间的协同运作，数据持久化的实现、测试数据的更新，以及测试数据的管理。

**（2）使用禅道进行测试管理**

测试管理指对测试需求、计划、用例和实施过程进行管理。为了简单起见，我这里仅介绍测试套件的使用。

在建立测试套件前，你需要事先创建产品。

打开禅道，在“产品”模块点击右上角的“添加产品”。

- 产品创建好后，就可以创建测试套件了

测试套件是不可或缺的，在开发完成一个版本的测试后，我们通常以测试套件的方式进行一轮或多轮测试。

在“测试”这个模块，点击“套件”。

点击右上角的“+建套件”，创建一个新的套件。

填写必要信息后保存，测试套件即创建成功。

- 测试套件创建好后，要跟测试用例关联，此时要创建测试用例

测试用例的创建跟测试套件的创建步骤类似。在“测试”这个模块，点击“用例”——“功能测试”， 然后点击右上角的“+建用例”或者“+批量建用例”来进行测试用例的创建。

接着在创建测试用例页面，创建你的测试用例。

点击“保存”，创建好后点击“套件”模块， 在测试套件“软件测试开发入门与实战”中，点击“关联用例”。

选择创建的测试用例，然后点击“保存”即可完成关联。

关联好测试用例后，你的测试套件就完成了，你可以在”操作“栏点击执行， 来**执行测试用例**。

执行成功后，你可以点击最右方的“结果”来**查看运行结果**。

利用禅道创建测试套件，可以用作测试管理和测试活动的安排，让你对测试任务一目了然。

**（3）ZTF 自动化测试框架**

ZTF 是禅道开发的一款开源自动化测试管理框架，它聚焦于自动化测试的管理功能。ZTF 提供了自动化测试脚本的定义、管理、驱动、执行结果的回传、bug 的创建，以及和其他自动化测框架的集成。

ZTF 是独立安装的，其安装部署可以参考[ZTF 安装部署](https://ztf.im/book/ztf/ztf-about-26.html)，它的 ZTF 的语法如下：

```bash
set     -s        设置语言、禅道系统同步参数。用户对当前目录需要有写权限
co      checkout  导出禅道系统中的用例，已存在的将更新标题和步骤描述。可指定产品、套件、测试单编号
up      update    从禅道系统更新已存在的用例。可指定产品、模块、套件、测试单编号
run     -r        执行用例。可指定目录、套件、脚本、结果文件路径，以及套件和任务编号，多个文件间用空格隔开
junit|testng      执行JUnit、TestNG、PHPUnit、PyTest、JTest、CppUnit、GTest、QTest单元测试脚本
ci                将脚本中修改的用例信息，同步到禅道系统
cr                将用例执行结果提交到禅道系统中
cb                将执行结果中的失败用例，作为缺陷提交到禅道系统
list    ls -l     查看测试用例列表。可指定目录和文件的列表，之间用空格隔开
view    -v        查看测试用例详情。可指定目录和文件的列表，之间用空格隔开
sort    -sort     将脚本文件中的步骤重新排序
clean   -c        清除脚本执行日志
--verbose         增加此参数，用于显示详细日志，如Http请求、响应、错误等信息
```

ZTF 的常用命令如下：

```bash
$>ztf.exe run demo\lang\bat\1_string_match.bat       执行演示测试用例
$>ztf.exe set                                        根据系统提示，设置语言、禅道地址、账号等，Windows下会提示输入语言解释程序
$>ztf.exe co                                         交互式导出禅道测试用例，将提示用户输入导出类型和编号
$>ztf.exe co -product 1 -language python             导出编号为1的产品测试用例，使用python语言，缩写-p -l
$>ztf.exe run product01 -suite 1                     执行禅道系统中编号为1的套件，脚本在product01目录，缩写-s
$>ztf.exe ci product01\tc-1.py                       将脚本里修改的用例信息，同步到禅道系统
```

**（4） ZTF 框架和禅道的结合使用**

ZTF 可以和禅道结合使用，来提高测试的效率。

- 设置 ZTF

```bash
# D:\ztf为你ztf的安装路径
D:\ztf>ztf.exe set
```

ZTF 会弹出提示，根据提示输入即可完成配置。

- 导出禅道的测试用例为测试脚本

通过 ztf 可以将我们在禅道中定义的测试用例导出，具体用法如下：

![4][4]

根据系统提示，我们导出刚才创建的测试套件 1 的测试用例 1，并且导出格式为 python。导出成功后，在文件夹 D:\ztf\product1\ 下就会有自动生成的 1.py 文件，内容如下：

```python
#!/usr/bin/env python
'''
[case]
title=测试用例-01
cid=1
pid=1

[esac]
'''
# 访问'demo\python'获取更多帮助
```

注意此时，导出的测试脚本仅仅是和禅道完成绑定，里面的具体的测试代码还需要我们编写。
更改脚本文件 1.py，更改后其代码如下：

```python
#!/usr/bin/env python
'''
[case]
title=测试用例-01
cid=1
pid=1
[group]
1. 输入用户名            >> kevin.cai
2. 输入密码              >> 123456
[esac]
'''
# 访问'demo\python'获取更多帮助
print(">> kevin.cai")
print(">> 123456")
```

- 运行测试脚本

脚本更新好后，我们来运行下：

```bash
ztf.exe run product1\
```

我直接运行刚刚生成的 product1 文件夹下的所有测试用例，可以看到测试成功。

- 通过 ztf 更新测试用例到禅道

正常情况下，我们的测试脚本是根据测试用例编写的，测试脚本和禅道里的测试用例是一致的。

假设现在需求有变化，我的测试脚本失败了，我发现后先更新了测试脚本。这个时候我的测试脚本和禅道里的测试用例就不一致了，就需要同步。ztf 提供了一个方法来同步我们的测试用例，

```bash
ztf.exe ci product1\1.py
```

通过 ztf.exe ci 的方式可以使我们的测试脚本和测试用例保持同步，避免了测试用例测试没有反映真实测试需求的情况。

- ZenData 测试数据生成器的使用

在上一课时“测试请求数据的准备方式”中我讲过了测试数据生成，其中一个办法是测试数据平台。ZenData 即是禅道提供的一款测试数据通用平台，可以方便地生成测试数据。

ZenData 主要有以下两大功能：

**数据生成**通过一个配置文件，使用 ZenData 生成你想要的各种数据；**数据解析**对某一个数据文件，指定其数据类型定义的配置文件，完成到结构化数据的解析。

ZenData 生成的测试数据可用于手工测试，也可以用于自动化测试，下面来看下 Zendata 的使用。

Zendata 安装部署请直接参考[Zendata 安装部署](https://www.zendata.cn/book/zendata/why-zendata-115.html)。

- ZenData 的语法如下：

```bash
  -d  --default    默认的数据格式配置文件
  -c  --config     当前场景的数据格式配置文件，可以覆盖默认文件里面的设置
  -o  --output     生成的数据的文件名。可通过扩展名指定输出json|xml|sql格式的数据。默认输出原始格式的文本数据
  -n  --lines      要生成的记录条数，默认为10条
  -F  --field      可通过该参数指定要输出的字段列表，用逗号分隔。 默认是所有的字段
  -t  --table      输出格式为sql时，需通过该参数指定要插入数据的表名
  -T  --trim       输出的字段去除前后缀，通常用在生成SQL格式的输出
  -H  --human      输出可读格式，打印字段名，并使用tab键进行分割
  -r  --recursive  递归模式。如不指定，默认为平行模式。平行模式下各个字段独立循环
                   递归模式下每个字段的取值依赖于前一字段。可增强数据的随机性
```

- ZenData 生成数据示例

ZenData 生成测试数据非常简单，首先你使用 yaml 文件来定义你的数据格式，然后使用上述命令即可。

下面的实例, 根据配置文件 demo\test\test-email.yaml 生成了一组 email：

```bash
# zd是ZenData的安装目录
# demo\test\test-email.yaml是默认的配置文件。存在ZenData根目录下的demo文件夹
C:\zd>zd.exe -d demo\test\test-email.yaml -n 1 -o iTesting.txt
```

在上面的代码里，-d 函数后面跟默认的 yaml 文件格式，ZenData 会根据指定的格式来生成数据，你也可以自己定义 yaml 文件。-n 代表生成的数据组数，-o 代表输出的文件名。

注意，每一组生成的数据有多少字段，取决于你 yaml 文件中的定义。如果你想控制输出的个数，可以采用如下方式：

```bash
# number_with_esp是yaml文件test-email.yaml的filed名称
# 本例指定输出filed是number_with_esp生成的数据
C:\zd>zd.exe -d demo\test\test-email.yaml -n 1 -F number_with_esp -o iTesting.txt
```

执行成功后打开生成的 iTesting.txt 文件，你将看到有 email 数据生成，此文件直接可用于你的自动化测试中。当前 ZenData 支持 TXT、JSON 、CSV 以及 sql 格式的文件生成。

了解了 ZenData 的用法后，我们来看一个真实用例，生成用于注册的账户，提供两个字段，用户名和密码。

首先，我们创建一个 yaml 文件。为简单起见，我在 ZenData 安装目录下的 demo\test 文件夹下创建一个名为 test-user.yaml 的文件，内容如下：

```yaml
title: 用户账户
desc:
author: kevin Cai
version: 1.0
fields:
- field: number_with_esp
from: email.v1.yaml
use: number_with_esp
prefix: ""
postfix: "\t"
- field: field_format 
range: 1-10 
format: "passwd%02d" 
postfix: "\t"
```

然后，我在命令行执行如下命令：

```bash
# zd是ZenData的安装目录
# demo\test\test-user.yaml是刚创建的配置文件。用于生成用户名和密码
C:\zd>zd.exe -d demo\test\test-user.yaml -n 1 -o iTesting.txt
```

命令执行完后，查看生成的 iTesting 文件：

```bash
01234qq@.com   passwd01
```

可以看到数据文件被正确生成，关于更多数据文件的格式及用法，可以参考 [ZenData 官网](https://www.zendata.cn/)。

## 不只 HTTP，玩转 Web Service 接口测试

### 什么是 Web Services？

Web Service 是一种跨编程语言和跨操作系统平台的远程调用技术。

通俗一点说，Web Service 就是一个应用程序，**它通过向外界暴露一个能够通过 Web 进行调用的 API 来对外提供服务。** WebService 可以跨编程语言和跨操作系统，即你的客户端程序和提供服务的服务端程序可以采用不同的编程语言，使用不同的操作系统。

举个例子来说，通过 WebServices，你运行在 windows 平台上的、以 C++ 编写的客户端程序就可以和运行在 Linux 平台上的，以 Java 编写的服务器程序进行通信。

### Web Services 构成及调用原理

Web Service 平台的构成，依赖以下技术：

- UDDI意为统一描述、发现和集成（Universal Description, Discovery, and Integration）,它是一种目录服务，通过它企业可注册并搜索 Web services，它是基于 XML 的跨平台描述规范。

- SOAP是一种简单的基于 XML 的协议，它使应用程序通过 HTTP 来交换信息。

- WSDL是基于 XML 的，用于描述 Web Services，以及如何访问 Web Services 的语言。

Web service 的调用原理如下：

![5][5]

- Step 1. 客户端想调用一个服务，但是不知道去哪里调用，于是它向 UDDI 注册中心（UDDI Registry）询问；

- Step 2. UDDI 注册中心，发现有个名字为 Web Service A 的服务器，可以提供客户端想要的服务；

- Step 3. 客户端向 Web Service A 发送消息，询问应该如何调用它需要的服务；

- Step 4. Web Service A 收到请求，发送给客户端一个 WSDL 文件。这里记录了 Web Service A 可以提供的各类方法接口；

- Step 5. 客户端通过 WSDL 生成 SOAP 请求（将 Web Service 提供的 xml 格式的接口方法，采用 SOAP 协议封装成 HTTP 请求），发送给 Web Service A，调用它想要的服务；

- Step 6. Web Service A 按照 SOAP 请求执行相应的服务，并将结果返回给客户端。

### Web Services 接口和 API（应用程序接口）的区别

Web Services 接口和我们常用的 API（应用程序接口）有哪些区别呢？下面的表格展示了它们的区别：

![6][6]

在我们的日常工作中，接口是以 Web Service、API，还是 RESTFUL API 形式提供给我们测试，常常取决于业务的实际情况。

### Web Services 接口实战

通过前面的讲解我们了解，WSDL 是 Web Services 生成给客户端调用的接口服务描述。通过 WSDL，客户端就可以构造正确的请求发送给服务端。

在实际工作中也是如此，对于 Web Services 形式的接口，开发提供的往往就是一个 WSDL 格式的链接。比如，下面的一个链接就是一个公用的 Web Servbice 服务接口：

```bash
# IP地址服务
http://www.webxml.com.cn/WebServices/IpAddressSearchWebService.asmx?wsdl
```

#### 1.suds - SOAP 客户端

在 Python 中，客户端调用 Web Service 可以通过 suds 这个库来实现。suds Client 类提供了用于使用 Web Service 的统一 API 对象，这个对象包括以下两个命名空间。

- service：service 对象用来调用被消费的 web service 提供的方法。

- factory：提供一个工厂（factory），可用于创建 WSDL 中定义的对象和类型的实例。

下面来具体讲解下 suds 的使用。

- suds 安装

在 Python 官方停止支持 Python 2.X 版本并全面转到 Python 3.X 后，suds 原始项目的开发已经停滞了，但这不意味着 suds 不再支持 Python 3.X。suds-community fork 了原本的 suds 库，并开发了能够支持 Python 3.X的 版本，其安装也比较简单：

```bash
pip install suds-community
```

- 简单使用

```python
from suds.client import Client
if __name__ == "__main__":
    url = 'http://www.webxml.com.cn/WebServices/IpAddressSearchWebService.asmx?wsdl'
    # 初始化
    client = Client(url)
    # 打印出所有可用的方法
    print(client)
```

直接运行上述代码，你会发现执行结果如下：

```python
# 运行结果片段
Suds ( https://fedorahosted.org/suds/ )  version: 0.8.4
Service ( IpAddressSearchWebService ) tns="http://WebXml.com.cn/"
   Prefixes (1)
      ns0 = "http://WebXml.com.cn/"
   Ports (2):
      (IpAddressSearchWebServiceSoap)
         Methods (3):
            getCountryCityByIp(xs:string theIpAddress)
            getGeoIPContext()
            getVersionTime()
         Types (1):
            ArrayOfString
      (IpAddressSearchWebServiceSoap12)
         Methods (3):
            getCountryCityByIp(xs:string theIpAddress)
            getGeoIPContext()
            getVersionTime()
         Types (1):
            ArrayOfString
```

在这段代码中，我打印出来了 IpAddressSearchWebService 支持的所有方法。你可以看到， 它有三个方法（Methods(3) 显示出这个 Web Service 所提供的方法及参数）。

- 实际案例

既然看出 IpAddressSearchWebService 这个 Web Service 支持 3 种方法，那么我们来应用下这些方法：

```python
from suds.client import Client
if __name__ == "__main__":
    url = 'http://www.webxml.com.cn/WebServices/IpAddressSearchWebService.asmx?wsdl'
    # 初始化
    client = Client(url)
    # 打印出所有支持的方法
    print(client)
    # 调用支持的方法， 使用client.service
    print(client.service.getVersionTime())
    print(client.service.getCountryCityByIp('192.168.0.1'))
```

执行上述代码，你会发现有如下输出：

```python
# 输出结果片段
#此为getVersionTime这个方法的输出
IP地址数据库，及时更新
# 此为getCountryCityByIp方法的输出
(ArrayOfString){
   string[] = 
      "192.168.0.1",
      "局域网 对方和您在同一内部网",
 }
```

注意，在代码里，我使用了 client.service 的方式，那是因为 service 对象用来调用被消费的 web service 提供的方法的。

在实际工作中，你遇见的 WSDL 接口将会比这个复杂得多。故正常情况下，我们会将 WSDL 的接口封装成类使用，然后针对每个类方法，编写相应的测试用例，如下所示：

```python
import pytest
from suds.client import Client

@pytest.mark.rmb
class WebServices(object):
    WSDL_ADDRESS = 'http://www.webxml.com.cn/WebServices/IpAddressSearchWebService.asmx?wsdl'
    def __init__(self):
        self.web_service = Client(self.WSDL_ADDRESS)
    def get_version_time(self):
        return self.web_service.service.getVersionTime()
    def get_country_city_by_ip(self, ip):
        return self.web_service.service.getCountryCityByIp(ip)

class TestWebServices:
    def test_version_time(self):
        assert WebServices().get_version_time() == "IP地址数据库，及时更新"
    @pytest.mark.parametrize('ip, expected', [('10.10.10.10', '10.10.10.10')])
    def test_get_country_city_by_ip(self, ip, expected):
        assert expected in str(WebServices().get_country_city_by_ip(ip))

if __name__ == "__main__":
    pytest.main(["-m", "rmb", "-s", "-v"])
```

#### 2.Zeep - SOAP 客户端

Zeep 是 Python 中的一个现代化的 SOAP 客户端。Zeep 通过检查 WSDL 文档并生成相应的代码，来使用 WSDL 文档中的服务和类型。这种方式为 SOAP 服务器提供了易于使用的编程接口。

下面来具体讲解下 Zeep 的使用：

- Zeep 安装

```bash
pip install zeep
```

- Zeep 查询 WSDL 中可用的方法

相对于 suds 来说，想要查看一个 WSDL 描述中有哪些方法可用，Zeep 无须进行初始化动作。直接在命令行中输入如下命令即可：

```bash
python -mzeep http://www.webxml.com.cn/WebServices/IpAddressSearchWebService.asmx?wsdl
```

从结果中可以看出，IpAddressSearchWebService 提供了 3 个 method，分别是 getCountryCityByIp，getGeoIPContext 和 getVersionTime。

- 简单使用

在得出有哪些方法可用后，我们就可以像直接调用可用的方法：

```python
import zeep
if __name__ == "__main__":
    wsdl = 'http://www.webxml.com.cn/WebServices/IpAddressSearchWebService.asmx?wsdl'
    client = zeep.Client(wsdl=wsdl)
    print(client.service.getCountryCityByIp('10.10.10.10'))
```

- 实际案例

现在我们把上面用 suds 实现的测试 IpAddressSearchWebService 的代码更改为使用 Zeep 测试：

```python
import pytest
import zeep
@pytest.mark.rmb
class WebServices(object):
    WSDL_ADDRESS = 'http://www.webxml.com.cn/WebServices/IpAddressSearchWebService.asmx?wsdl'
    def __init__(self):
        self.web_service = zeep.Client(wsdl=self.WSDL_ADDRESS)
    def get_version_time(self):
        return self.web_service.service.getVersionTime()
    def get_country_city_by_ip(self, ip):
        return self.web_service.service.getCountryCityByIp(ip)

class TestWebServices:
    def test_version_time(self):
        assert WebServices().get_version_time() == "IP地址数据库，及时更新"
    @pytest.mark.parametrize('ip, expected', [('10.10.10.10', '10.10.10.10')])
    def test_get_country_city_by_ip(self, ip, expected):
        assert expected in str(WebServices().get_country_city_by_ip(ip))

if __name__ == "__main__":
    pytest.main(["-m", "rmb", "-s", "-v"])
```

可以看到，使用 Zeep 来调用 Web Service 服务同样很简单。

#### 3.Zeep 和 suds 的比较

suds 是一个老牌的 SOAP 客户端，而 Zeep 是当前特别流行的一个 SOAP 客户端。那么我们应该如何选用呢？ 这里列出来几点两者的区别，供你参考：

![7][7]

综上所述，Zeep 对最新版本的 Python 支持的更好，而且没有性能问题。如果你的项目是新设立的，在选用Web Service客户端时，不妨直接使用Zeep。

## 参考

- 《测试开发入门与实战》
- https://www.python.org

[1]: /images/py/auto-test-03/1.png
[2]: /images/py/auto-test-03/2.png
[3]: /images/py/auto-test-03/3.png
[4]: /images/py/auto-test-03/4.png
[5]: /images/py/auto-test-03/5.png
[6]: /images/py/auto-test-03/6.png
[7]: /images/py/auto-test-03/7.png
