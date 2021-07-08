---
title: 测试开发入门与实战（四）
date: 2021-07-08 10:00:00
categories: Python
tags:
  - Testing
---

深入自动化测试框架原理。

<!--more-->

## 命令行参数，助力测试框架高度定制化

### pytest 添加命令行参数

假设我们的文件结构如下：

```bash
|--lagouAPITest
    |--tests_command_lines
        |--conftest.py
        |--test_sample.py
        |--__init__.py
```

其中 conftest.py 的代码如下：

```python
import pytest

def pytest_addoption(parser):
    parser.addoption(
        "--auth", action="store", default=None, help="Your own auth key pair"
    )

@pytest.fixture(scope='session')
def auth(request):
    return request.config.getoption('--auth')
```

我在前面的章节讲过，在 conftest.py 定义的 fixtures 可作用于整个 Package 下的多个测试文件。在此 conftest.py 里，我定义了一个函数 pytest_addoption，这里注意：

- pytest_addoption 是一个 hook 方法，其名称不可改变；
- pytest_addoption 允许用户注册一个自定义的命令行参数，方便用户使用命令行传递数据；
- pytest_addoption 仅能在 conftest.py 文件或者 pytest plugins 里实现；
- pytest_addoption 在测试用例执行前被调用。

然后我们结合前面章节讲过的 fixture 函数，定义一个名字为 auth 的 fixture 接收自定义的命令行参数，并提供给整个 package 下的测试用例使用，这里需要注意的是：

- auth 函数是正常的 fixture 函数，需要加装饰器 pytest.fixture 装饰；
- auth 函数的 scope 可以自由定义，这里我定义为 session；
- auth 函数的命名可以更改，但是参数 request 不可更改；
- request.config.getoption 用于接收命令行命令参数。

通过函数 pytest_addoption 以及定义 fixture 方法，我们就可以自由定义命令行参数。

我们再来看下 test_sample.py 文件的代码：

```python
import pytest

class TestDemo:
    def test_secret_auth(self, auth):
        print("\nmy auth are {}".format(auth))
        assert True
```

这段代码非常简单，定义了一个测试函数 test_secret_auth，其参数是之前定义的 fixture 函数auth。

在命令行中通过如下方式运行：

```bash
pytest tests_command_lines -k "secret_auth" -s -v --auth iTesting
```

运行结束后，可以发现我们传递的自定义命令行参数 auth 的值被正确接收并显示：

```bash
# 部分运行输出
collected 1 item                                                                                             tests_command_lines/test_sample.py::TestDemo::test_secret_auth
my auth are iTesting
PASSED
```

通过自定义命令行参数，可以扩展测试框架功能。例如可以通过命令行参数实现，当我从命令行传递某个具体的指令时，skip 掉一些测试用例。

如果你仔细观察上文中**pytest_addoption**这个函数，你会发现它定义命令行参数使用了 parser.addoption。那么这个parser.addoption是什么呢？

下图是 parser.addoption 的源代码：

![1][1]

通过代码可以发现，addoption 接收如下参数。

- *optnames：它是一个可变字符串，用来表示 option 的名称，例如上面例子中的"--auth"；

- attrs：attrs 是关键字参数，通常以 key:value 的形式存在，它能接收的参数与标准库 argparse**的 add_argument() 这个函数可接收的参数一致。

### 自主定义命令行参数（argparse 库）

如果你进一步查看 pytest 的源码，你将发现其实 pytest 中用于解析命令行参数的 parser 正是**argparse 这个标准库。**

argparse 是内置于标准库中的，用于 python 命令行解析的模块，使用 argparse 可以直接在命令行中向程序传入参数。argparse 用法，一般遵循如下步骤。

#### 1. 导入 argparse 模块

argparse 无须安装，使用时直接 import 即可：

```python
import argparse
```

#### 2. 创建 ArgumentParser 对象

```python
parser = argparse.ArgumentParser()
```

下面列出 ArgumentParser 可接收的常用参数如下：

```bash
prog - 程序的名称（默认：sys.argv[0]）
usage - 描述程序用途的字符串（默认值：从添加到解析器的参数生成）
description - 在参数帮助文档之前显示的文本（默认值：无）
epilog - 在参数帮助文档之后显示的文本（默认值：无）
parents - 一个 ArgumentParser 对象的列表，它们的参数也应包含在内
formatter_class - 用于自定义帮助文档输出格式的类
prefix_chars - 可选参数的前缀字符集合（默认值：'-'）
fromfile_prefix_chars - 当需要从文件中读取其他参数时，用于标识文件名的前缀字符集合（默认值：None）
argument_default - 参数的全局默认值（默认值： None）
conflict_handler - 解决冲突选项的策略（通常是不必要的）
add_help - 为解析器添加一个 -h/--help 选项（默认值： True）
allow_abbrev - 如果缩写是无歧义的，则允许缩写长选项 （默认值：True）
exit_on_error - 决定当错误发生时是否让 ArgumentParser 附带错误信息退出。 (默认值: True)
```

一般情况下，prog、usage、description 这三个参数使用得比较多。

#### 3. 添加参数

```python
# 可以通过add_argument添加一个或多个参数
parser.add_argument()
```

add_argument() 方法用于指定程序能够接受哪些命令行参数，add_argument() 接收两种类型的参数，分别是位置参数 (Positional arguments) 和可选参数 (Optional arguments)。下面详细介绍下两种参数。

- **位置参数(Positional arguments)**

位置参数是指必须传递的参数，如果不传递就会报错。例如，在 tests_command_lines 文件夹下创建一个文件：

```python
# test_argparse.py
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("name", help="This is a demo",action="store")
    args = parser.parse_args()
    if args.name:
        print(args.name)
```

首先，在命令行中查看支持的参数：

```bash
# 定位到test_argparse.py所在的文件夹，然后直接执行
D:\_Automation\lagouAPITest\tests_command_lines>python test_argparse.py -h
```

你会看到如下输出：

```bash
D:\_Automation\lagouAPITest\tests\tests_command_lines>python test_argparse.py -h
usage: test_argparse.py [-h] name
positional arguments:
  name        This is a demo

optional arguments:
  -h, --help  show this help message and exit
```

通过 -h 命令，可以查看定义的所有位置参数（本例中是 name）。

下面不给定位置参数直接运行：

```bash
D:\_Automation\lagouAPITest\tests\tests_command_lines>python test_argparse.py
```

运行结果如下：

```bash
usage: test_argparse.py [-h] name
test_argparse.py: error: the following arguments are required: name
```

由此可见，如果定义了位置参数，则位置参数必须传递。

如果给定参数的值运行：

```bash
D:\_Automation\lagouAPITest\tests\tests_command_lines>python test_argparse.py iTesting
```

则会运行成功。

- **可选参数(Optional arguments)**

相对于位置参数，可选参数的定义如下：

```python
# test_argparse.py
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", default='iTesting', help="This is a demo",action="store")
    args = parser.parse_args()
    if args.name:
        print(args.name)
```

不给定可选参数直接运行：

```bash
D:\_Automation\lagouAPITest\tests\tests_command_lines>python test_argparse.py
```

运行结果如下：

```bash
D:\_Automation\lagouAPITest\tests\tests_command_lines>python test_argparse.py
iTesting
```

当可选参数不填写时，运行也不会报错。如果可选参数有默认值，argparse 将会把此可选参数默认传入。

#### 4.解析参数

解析参数即“步骤3 添加参数”中的对参数的解析：

```python
args = parser.parse_args()
```

ArgumentParser 通过 parse_args() 方法，把每个参数转换为适当的类型然后调用相应的操作。例如“**步骤3 添加参数”**中的打印语句:

```python
if args.name:
        print(args.name)
```

了解了 argparse 的基本使用后，我们就可以通过命令行参数来更好的执行测试。更多关于 argparse 的高级用法，请直接参考 Python 标准库。

### 测试框架雏形 —— 创建自己的命令行程序

现在我们知道，有了 argparse 就可以通过命令行参数来进行测试，那么假设你有一个测试框架，如何让你的测试框架也支持通过命令行测试呢？或者说，你有没有好奇过，为什么我们在命令行中直接输入“pytest”， 测试脚本就会运行？

下面，我们就通过创建一个支持命令行参数的"测试框架"来解开这个疑惑。

#### 1. 创建项目

首先，创建一个项目，名称为 iTestingDemoFramework。

```bash
|--iTestingDemoFramework
    |--iTesting
        |--main.py
        |--__init__.py
    |--setup.py
```

其次，更新各个文件的代码。其中 main.py 的内容如下：

```python
# main.py
import argparse

def main():
    parser = argparse.ArgumentParser(prog='iTesting', usage='This is a demo, please follow iTesting on wechat')
    parser.add_argument("name", default='iTesting', help="This is a demo framework", action="store")
    args = parser.parse_args()
    if args.name:
        print("Hello, My name is Kevin Cai, Please search and follow below account from wechat:\n")
        print(args.name)

if __name__ == "__main__":
    main()
```

setup.py 的代码如下：

```python
from setuptools import setup, find_packages
setup(
    name='iTesting',
    version='0.1',
    description='This is a demo framework',
    author='kevin.cai',
    author_email='testertalk@outlook.com',
    zip_safe=False,
    include_package_data=True,
    packages=find_packages(),
    license='MIT',
    url='https://www.helloqa.com',
    entry_points={
        'console_scripts': [
            'iTesting = iTesting.main:main'
        ]
    }
)
```

setup.py 文件是 python 模块安装所需要的文件，它描述了你的模块的各项信息。你可以按照上面的代码，创建自己的 setup.py 文件。更多关于 setup.py 的知识，请查看 [setuptools](https://pypi.org/project/setuptools/)。

#### 2. 检验 setup.py

在命令行中切换到项目所在的根目录，执行如下命令：

```bash
# 切换到项目根目录， 此处是iTestingDemoFramework
python setup.py check
```

这个命令会验证 setup.py 里所填写内容的正确性及安装相应的依赖包（如果有的话）。如果 setup.py 的内容及格式不正确，则命令行中会提示。

#### 3. 本地验证

当执行检验 setup.py，没有错误提示后，我们就可以在本地验证包的内容：

```bash
# 1.项目根目录下，此处为iTestingDemoFramework。执行
python setup.py install
# 2.执行成功后，在命令行执行如下命令：
iTesting -h
```

执行后，可以看到 Console 的输出如下：

```bash
(venv) D:\_Automation\iTestingDemoFramework>iTesting -h
usage: This is a demo, please follow iTesting on wechat
positional arguments:
  name        This is a demo framework
optional arguments:
  -h, --help  show this help message and exit
```

注意：此刻执行命令时不必在项目根目录下，你可以打开命令行直接输入 iTesting 也是可以执行的，因为 iTesting 这个程序已经被我们注册到系统了。

继续测试，打开命令行，直接输入我们定义的命令行参数 name 的值：

```bash
iTesting iTesting
```

执行完毕后输出如下：

```bash
Hello, My name is Kevin Cai, Please search and follow below account from wechat:
iTesting
```

由此可以看到，命令行程序创建成功。如果 iTesting 是你的测试框架，是不是就意味着你的测试框架可以直接通过命令行运行了。

其实这也是为什么你在命令行中直接执行 pytest，pytest 会运行的原因。

> 当然 pytest 里还有查找测试用例的逻辑，但是我们的程序 iTesting 里没有实现。

### 测试框架雏形 ——上传自己的命令行程序

当你的测试框架开发完成，并且支持命令行执行后，你就可以上传至 Pypi，分享给更多人使用。

> PyPI(Python Package Index) 是 python 官方的第三方库的仓库，可以帮助我们查找和安装 Python 社区开发和共享的软件。

下面演示下如何将你的应用程序打包（以 Win 10 系统为例）。

#### 1. 注册 PyPI 账户

要上传你自己打包好的程序到 PyPI，必须先注册一个账户，登录[PyPI 官网](https://pypi.org/)直接注册即可。

#### 2. 打包程序

你的程序要上传到 PyPI，必须打包。在命令行中执行如下命令，将程序打包：

```bash
# 切换到项目根目录， 此处是iTestingDemoFramework
python setup.py sdist build
```

打包成功后，你会看到项目根目录下多了三个文件夹，分别是 build、dist 以及 iTesting.egg-info，如下图所示：

![2][2]

打包的方式有很多种，除了上述所讲外，还可以用 wheel 打包。

首先安装 wheel：

```bash
pip install wheel
```

安装好后，就可以把应用程序打包：

```bash
python setup.py bdist_wheel
```

> wheel 翻译过来就是“轮子”的意思，所以创建自己的程序并打包成 wheel，就是一个造轮子的过程。后来造轮子，专指编写与已有应用程序拥有相同功能的程序。

### 3. 发布程序

首先，应该确保 twine 这个库安装。

> Twine 是一个在 PyPI 上发布 Python 包的实用程序。

```bash
pip install twine
```

其次，通过命令行工具，在你的项目根目录下，通过如下命令上传：

```bash
# 在项目根目录下执行，本例为 iTestingDemoFramework
D:\_Automation\iTestingDemoFramework>twine upload dist/*
```

执行后，系统会交互式询问，让你提供 PyPI 上注册的用户名和密码，填写正确即可上传成功：

最后访问上传后的地址，你可以看到，我们创建的程序已经被正确上传。

#### 4. 通过 pip 安装使用

应用程序上传至 PyPI 后，每个人都可以通过 pip install 直接下载使用，在命令行中输入：

```bash
pip install iTesting
```

> 注意，此命令可在任意目录下执行，不必限制在我们项目根目录下，因为我们的程序已经上传至 PyPI。

## 环境变化，测试框架如何动态秒切换？

### 多套测试环境带来的问题

大到一个软件产品的上线，小到一个页面功能改进，没有一个功能是开发改完就能直接上线的。正常情况下都需要经历至少 3～4 个环境的测试，包括开发环境、集成测试环境、预生产环境、生产环境等环节。

那么自动化测试也是一样，同样一个功能，它在所有的测试环境都运行正确，才能放心上线。这也带来如下显而易见的问题：

- 自动化测试脚本只有一套，如何让一套脚本应用在不同的测试环境？
- 每套测试环境，其测试数据可以不一样，如何确保测试数据正确绑定不同测试环境？
- 在持续发布平台/DevOps 流水线里，如何指定测试环境运行测试脚本？

这些问题，都需要我们进一步研究命令行参数。

### pytest 实现环境变量切换

首先，我们来看下如何使用 pytest 实现测试环境的切换。

假设我的项目目录结构如下：

```bash
|--lagouAPITest
    |--tests 
        |--test_demo.py
        |--__init__.py
    |--conftest.py
```

其中 conftest.py 的内容如下：

```python
# conftest.py
import pytest

def pytest_addoption(parser):
    parser.addoption(
        "--env", action="store", default='dev', help="set env"
    )

@pytest.fixture(scope='session')
def get_env(request):
```

在上面这段代码里，我定义了一个命令行参数“env”，它是一个可选参数，它的默认值是“dev”；然后我定义了一个用于整个 session 的 fixture，名为 “get_env”，用来获取环境变量的值。

然后 test_demo.py 的代码如下：

```python
# test_demo.py
import pytest

class TestDemo:
    def test_env_config(self, get_env):
        print("\nNow the environment are --: {}".format(get_env))
        assert True
```

这段代码接收我们在 conftest.py 里定义的 get_env 这个 fixture，然后把它应用到 test_env_config 这个函数中去，这样我们就实现了环境变量的传入。

在命令行中分别以如下命令运行：

```bash
# 不加参数，使用env的默认值-dev
python -m pytest -v -s
```

命令执行的结果如下：

```bash
collected 1 item 
tests/test_demo.py::TestDemo::test_env_config 
my auth are --: dev
PASSED
```

可以看到，环境变量 env 被设置为默认值“dev”。

> 如果定义了可选参数并配置了默认值，那么在使用命令行执行时，可以不传入这个参数而直接使用。

我们再来看下指定环境变量的情况，命令行中执行以下语句：

```bash
# 给定环境变量参数
python -m pytest -v -s --env qa
```

命令执行的结果如下所示：

```bash
collected 1 item 
tests/test_demo.py::TestDemo::test_env_config 
Now the environment are: --qa
PASSED
```

可以看到，当你指定了环境变量参数 env 后，传入的值会覆盖掉默认值。

### 真实场景下的测试环境切换

现在虽然环境变量切换的功能实现了，但是如何把环境变量切换应用到我们的测试用例上呢？

正常情况下，我们的测试数据是根据测试环境分开存放的。现在来更新下我们的文件结构，使它更能反映我们的真实工作情况：

```bash
|--lagouAPITest
    |--tests 
        |--test_demo.py
        |--__init__.py
    |--test_data
        |--test_demo
            |--test_demo.dev.yaml
            |--test_demo.qa.yaml
    |--conftest.py
```

观察下，这个项目结构与以往我讲的有什么不同？

> 在这个项目结构里，所有的数据都放在 test_data 这个目录中，test_data 这个目录下的子目录名（test_demo），和 tests 这个目录下的 module 名（.py 文件的名称，test_demo.py 的名称，即 test_demo）是一一对应的。

> 然后在 test_demo 这个子目录下，存储着不同环境的数据文件 test_demo.dev.yaml 和 test_demo.qa.yaml，其中 dev 和 qa 是两个测试环境的名称。

> 采取这种方式，我们的测试文件，以及测试文件对应的数据文件，在文件组织结构上就变得相对有序，方便我们代码处理。

下面来看一下， 在这个目录结构中，每个文件中的内容分别是什么。

其中conftest.py的内容如下：

```python
import codecs
import json
import os
import pytest
import yaml

def pytest_addoption(parser):
    parser.addoption(
        "--env", action="store", default='dev', help="set env"
    )

@pytest.fixture(scope='session')
def get_env(request):
    return request.config.getoption('--env')

@pytest.fixture(scope='session')
def load_data_from_json_yaml(request):
    # 获取解析到的test_data所在的目录，以及调用test_data的文件
    data_folder, function_file = request.param
    # 根据传入的环境变量参数，计算出应该用那个环境下的数据文件
    data_file_name = function_file.replace('.py', '.%s.yaml' % request.getfixturevalue('get_env'))
    data_file = os.path.join(data_folder, data_file_name)
    _is_yaml_file = data_file.endswith((".yml", ".yaml"))
    with codecs.open(data_file, 'r', 'utf-8') as f:
        # Load the data from YAML or JSON
        if _is_yaml_file:
            data = yaml.safe_load(f)
        else:
            data = json.load(f)
    # 这里你可能需要根据业务需要，把数据解析以下再返回
    return data
```

在 conftest.py 中，我增加了一个 fixture 方法，用来根据指定的测试文件，查找并返回不同测试环境下，该测试文件对应的测试数据。这个 fixture 的方法名为 load_data_from_json_yaml， 它将接收我从测试用例传递过来的所有参数，并对其进行解析。

这个 fixture 方法是用来处理 yaml 或者 json 文件，在实际工作中，你可能需要根据数据格式的不同，编写不同的数据处理函数。

有了数据解析的方法，我们再来看下我们的数据文件。

test_demo.dev.yaml的内容如下：

```yaml
username: "iTesting"
password: "isAwesome"
```

test_demo.qa.yaml的内容如下：

```python
username: "iTesting"
password: "isGood"
```

一般情况下，不同测试环境下的数据文件的层次结构应该保持一致，以方便代码统一解析。但是数据变量的数量可以不一致，例如 qa 环境下可以有 dev 环境下没有的变量，反之亦然。

最后，编写测试文件test_demo.py的内容如下：

```python
import os
import pytest
# 获取当前文件夹路径
# 获取当前文件的名称
current_folder, current_file = os.path.split(os.path.realpath(__file__))
#计算出当前文件对应的数据文件的目录名称
data_folder = os.path.dirname(current_folder) + os.sep + 'test_data' + os.sep + current_file.strip('.py') + os.sep

class Demo:
    @staticmethod
    def login(username, password):
        # 这里写你的业务逻辑，简单起见，我返回True
        print('\n%s' % username)
        print('\n%s' % password)
        return True

class TestDemo:
    @pytest.mark.parametrize("load_data_from_json_yaml, expected", [((data_folder, current_file), True)], indirect=['load_data_from_json_yaml'])
    def test_login(self, load_data_from_json_yaml, expected):
        assert Demo.login(load_data_from_json_yaml["username"], load_data_from_json_yaml["password"]) == expected
```

在这个测试文件中，我模拟了一个如何测试登录功能的例子：

- 首先，获取当前文件对应的文件夹路径，以及当前文件名称，用于后续传递给 fixture 函数load_data_from_json_yaml 解析。

- 接着，根据项目文件结构，计算出存储我的数据文件的文件夹路径。

- 然后我定义了我的 Page 类 Demo，以及定义了一个静态方法 login 用于处理登录。

> 正常情况下，我们应该按照 PageObject 模型，再创建一个 page 目录 pages，来存储所有的 Page类，这里为了方便，我直接放在测试文件中了。

- 接着定义测试类并且测试我在 Page 类中定义的方法 login。

我们来运行一下这个测试，看看切换环境对测试结果的影响。

在命令行中，输入以下命令执行：

```bash
# 根目录下执行
D:\_Automation\lagouAPITest>pytest tests/test_demo.py -v -s
```

因为我没有传入环境变量参数，默认使用 dev 环境，所以我们的值打印出来为“iTesting isAwesome”。

现在切换下环境运行：

```bash
# 根目录下执行
D:\_Automation\lagouAPITest>pytest tests/test_demo.py -v -s --env qa
```

现在环境被切换成 qa 环境，所以测试数据也被加载为 qa 环境的数据了。

由此，我们就实现了测试环境秒切换。

### 测试环境切换原理

上面是我们运用 pytest 实现了当测试环境变化时，测试框架秒切换测试环境。下面来看下测试环境切换的原理，其实特别简单，即：

- 测试环境变量由用户输入提供；

- 测试框架定义测试数据解析函数，并根据用户输入的测试变量，解析并返回测试环境对应的数据文件内容。

### 自研框架实现测试环境自由切换

假设我们使用自研框架而非 pytest 测试框架，我们该如何根据环境变化来切换测试环境呢？

还记得我们上一讲发布的 iTestingDemoFramework 吗？我们来更改下它，使它能够根据需要切换测试环境。

更改项目文件结构，使得它的文件结构如下：

![3][3]

其中 test_data 目录下有两个子目录，分别为 dev 和 qa，它们分别代表 dev 环境和 qa 环境。

在 dev 和 qa 目录下，有两个具备相同名称的数据文件 test_iTesting.yaml，它们是 tests 这个目录下的测试文件 test_iTesting.py 在不同测试环境下所对应的测试数据。

test_iTesting.py 是我们的测试文件，它的内容如下：

```python
# -*- coding: utf-8 -*-

class Demo:
    @staticmethod
    def login(username, password):
        # 这里写你的业务逻辑，简单起见，我返回True
        print('\n%s' % username)
        print('\n%s' % password)
        return True

class TestDemo:
    def test_login(self, username, password, expected):
        assert Demo.login(username, password) == expect
```

在这个文件中，我定义了两个类，分别是 Page 类 Demo 和它对应的测试类 TestDemo。

> 注意： 在实际工作中，请按照 PageObject 模型将 Page 类定义在 pages 目录中，这里为了演示方便，我将它们定义在测试文件中了。

其中，Page 类 Demo 里有个静态方法，它实现了登录；测试类 TestDemo 有一条测试用例 test_login，它用来测试登录是否成功。

**接着，我需要更改下 main.py 文件，使得它能够满足我们环境切换的要求：**

```python
# main.py
import argparse
import codecs
import inspect
import json
import os
import shlex
import sys
import glob
import importlib.util
import yaml
# 解析命令行参数
def parse_options(user_options=None):
    parser = argparse.ArgumentParser(prog='iTesting',
                                     usage='Demo Automation Framework, Search wechat account iTesting for more information')
    parser.add_argument("-env", default='dev', type=str, choices=['dev', 'qa', 'staging', 'prod'], help="Env parameter")
    if not user_options:
        args = sys.argv[1:]
    else:
        args = shlex.split(user_options)
    options, un_known = parser.parse_known_args(args)
    if options.env:
        print("\n想了解更多测试框架内容吗？请关注公众号iTesting")
        print('Currently the env are set to: %s' % options.env)
    return options
# 从指定文件夹下获取模块及其所在的路径
def find_modules_from_folder(folder):
    absolute_f = os.path.abspath(folder)
    md = glob.glob(os.path.join(absolute_f, "*.py"))
    return [(os.path.basename(f)[:-3], f) for f in md if os.path.isfile(f) and not f.endswith('__init__.py')]
# 动态导入模块
def import_modules_dynamically(mod, file_path):
    spec = importlib.util.spec_from_file_location(mod, file_path)
    md = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(md)
    return md
# 获取测试类所在的文件夹和测试类对应的数据类所在的文件夹
def get_tests_and_data_folder_via_env(env):
    # 注意，下面的test_root和test_data_root这两个方法。从main函数执行，和从命令行输入iTesting运行，获取到的值不同
    # 当前此代码获取方式是通过命令行运行，即使用pip install iTesting后，在命令行中使用iTesting来执行
    test_root = os.path.join(os.getcwd(), 'iTesting' + os.sep + 'tests')
    test_data_root = os.path.join(os.getcwd(), 'iTesting' + os.sep + 'test_data' + os.sep + env)
    # current_folder, current_file = os.path.split(os.path.realpath(__file__))
    # test_data_root = os.path.join(current_folder, 'test_data' + os.sep + env)
    # test_root = os.path.join(current_folder, 'tests')
    return test_root, test_data_root
# 解析数据文件的方法
def load_data_from_json_yaml(yaml_file):
    _is_yaml_file = yaml_file.endswith((".yml", ".yaml"))
    with codecs.open(yaml_file, 'r', 'utf-8') as f:
        # Load the data from YAML or JSON
        if _is_yaml_file:
            data = yaml.safe_load(f)
        else:
            data = json.load(f)
    return data
# 测试框架的执行函数
def run(test_folder, test_data_folder):
    module_pair_list = find_modules_from_folder(test_folder)
    for m in module_pair_list:
        mod = import_modules_dynamically(m[0], m[1])
        test_data_file = os.path.join(test_data_folder, mod.__name__ + '.yaml')
        for cls_name, cls in inspect.getmembers(mod, inspect.isclass):
            if cls_name.startswith('Test'):
                for item in inspect.getmembers(cls, lambda fc: inspect.isfunction(fc)):
                    func_name, func = item
                    if func_name.startswith('test'):
                        test_data = load_data_from_json_yaml(test_data_file)
                        print("\n想了解更多测试框架内容吗？请关注公众号iTesting")
                        print(test_data["username"])
                        print(test_data["password"])
                        func(cls_name, test_data["username"], test_data["password"], True)
# main函数，也是测试框架入口
def main(user_options=None):
    args = parse_options(user_options)
    test_root, test_data_root = get_tests_and_data_folder_via_env(args.env)
    run(test_root, test_data_root)

if __name__ == "__main__":
    main('-env dev')
```

这段代码功能比较多，简单来说我实现了如下功能：

- 解析用户输入的命令行参数；
- 自动查找测试目录 tests 下的所有的测试类及测试方法；
- 自动加载并解析每一个测试类对应的测试数据文件；
- 动态导入所有的测试类，测试方法；
- 针对每一个测试用例，将测试数据喂给它，并自动执行。

通过以上代码，我基本实现了最简单的测试环境切换、测试用例查找、测试模块自动导入、测试数据加载，以及测试用例执行。

> 注意，在更新包之前，要更改 setup.py 中的版本号 version 的值，不能跟之前的版本一样。

```bash
# 1. 打包程序
# 切换到项目根目录， 此处是iTestingDemoFramework
D:\_Automation\iTestingDemoFramework>python setup.py sdist build
# 2. 上传程序
# 在项目根目录下执行，本例为 iTestingDemoFramework
# 根据提示填写用户名和密码即可上传成功
D:\_Automation\iTestingDemoFramework>twine upload dist/*
```

发布成功后，通过PyPI链接访问安装或者直接命令行安装：

```bash
pip install iTesting
```

安装成功后，在命令行中分别执行以下两步：

```bash
iTesting
```

```bash
iTesting --env qa
```

你会发现， 环境切换后，测试框架会自动定位到当前环境下的测试数据。

如果你输入错误的测试环境变量，例如：

```bash
iTesting --env superEnv
```

你会发现测试框架会报错并提醒你只允许输入指定的测试环境，它们分别为 dev、qa、staging 和 prod。

采用这种方式，我们不仅可以达成测试环境秒切换，还能在测试开始前，就避免由于传入错误的测试环境变量，而导致的测试数据加载错误，从而引发测试运行错误。

## 需求多变，测试框架如何动态挑选用例？

### 动态挑选测试用例的应用场景

测试用例动态挑选的应用场景很多，常见的有如下几种：

- 开发更改了某个模块的代码，仅需要回归这个模块的测试用例时；
- 开发人员 Merge 代码到 Develop 分支时，标记了冒烟测试标签的测试用例需要被触发；
- 在生产环境执行测试时，敏感的测试用例（例如涉及金钱）需要被忽略执行；
- 当测试框架需要对有特定标签的测试用例执行额外的操作时。

### pytest 中实现测试用例动态挑选的方法

在 pytest 框架中，我们知道测试用例的挑选可以有很多方式，我们来回顾下它们的用法：

```bash
# 1. 按照测试类执行
# 运行test_lagou.py文件下的，类名是TestLaGou下的所有测试用例
pytest test_lagou.py::TestLaGou
# 2. 按照测试方法执行
# 运行test_lagou.py文件下的，类名是TestLaGou下的，名字为test_get_new_message的测试用例
pytest test_lagou.py::TestLaGou::test_get_new_message
# 3. 使用-m 标签 
# 选中同时带有mark1和mark2这个标签的测试用例运行
pytest -m "mark1 and mark2"
# 选中带有mark1的测试用例，不运行mark2的测试用例
pytest -m "mark1 and not mark2" 
# 选中带有mark1或 mark2标签的所有测试用例
pytest -m "mark1 or mark
# 4. 使用-k标签
# 按照文件名称匹配。运行test_lagou.py下的所有的测试
pytest -k "test_lagou.py"
# 按照文件名字部分匹配。只有运行测试文件名字中含有lagou字样，则它含有的所有测试用例都会执行
pytest -k "lagou"
```

使用上述用法，可以根据用户的需要，仅运行满足条件的测试用例。

如果让你来实现这些功能，你该如何做呢？

### 自研框架如何实现测试用例动态挑选

下面，我仍以上一讲中实现的 iTesting 这个框架为例，为你详细讲解如何实现这些功能。

首先，查看项目结构：

![3][3]

更改 tests 目录下 test_iTesting.py 这个文件：

```python
# -*- coding: utf-8 -*-

class Demo:
    @staticmethod
    def login(username, password):
        # 这里写你的业务逻辑，简单起见，我返回True
        print('\n%s' % username)
        print('\n%s' % password)
        return True

class TestDemo:
    def test_login(self, username, password, expected):
        assert Demo.login(username, password) == expected

    def test_demo1(self):
        assert True

    def test_demo2(self):
        assert False
```

在这个文件中，我新增加了两个测试方法 test_demo1 和 test_demo2。

#### 1.实现类似 pytest 的 -k 功能

现在，我来实现类似 pytest 的 -k 功能，步骤如下：

- 添加命令行参数 -k；

更改 main.py 中的 run 方法，在发现测试文件、测试类、测试函数时，与 -k 提供的参数值对比，如果 -k 提供的参数是测试文件名、测试类名、测试函数名的子集时，执行这个测试。

（1）第一步， 添加命令行参数 -k。更改 main.py 文件的 parse_options 方法，增加 -k 参数。

```python
def parse_options(user_options=None):
    parser = argparse.ArgumentParser(prog='iTesting',
                                     usage='Demo Automation Framework, Search wechat account iTesting for more information')
    parser.add_argument("-env", default='dev', type=str, choices=['dev', 'qa', 'staging', 'prod'], help="Env parameter")
    parser.add_argument("-k", default=None, action="store", help="only run tests which match the given substring expression")
    if not user_options:
        args = sys.argv[1:]
    else:
        args = shlex.split(user_options)
    options, un_known = parser.parse_known_args(args)
    if options.env:
        print("\n想了解更多测试框架内容吗？请关注公众号iTesting")
        print('Currently the env are set to: %s' % options.env)

    if options.k:
        print("你设置了-k参数，将会运行所有包括'%s'的测试文件，测试类，测试函数" % options.k)
    return options
```

parse_options 这个方法，是利用了 argparse 这个标准库，接收命令行参数并解析。在这里添加了 -k 参数，它没有默认值。

（2）接着我们看第二步，更改 main.py 里的 run 方法：

![4][4]

由于代码层次较多，贴出来的代码不具备可读性，为了讲解方便，我直接贴出 run 方法源码的截图。

> 为尽可能简洁地向你展示代码原理，并让你看得懂，我选择直接展示最原始、没有优化的代码。在实际工作中，我们应该遵循本课程前面章节中讲的测试框架的设计原则，尽可能抽象共用模块。

仔细观察上述代码，上述代码实现了测试用例按照名称挑选运行，请重点关注以下几行。

- 第 85 行，首先判断命令行参数 -k 存在不存在。

如参数不存在，直接执行 121 行及以后的代码逻辑，即执行所有测试用例；如果存在，代码走第 87 行。

- 第 87 行，找出测试 Module（即.py 测试文件）名中含有 -k 参数值的所有测试 module。

如果测试 Module 中包括 -k 的参数值，那么整个 Module 下的所有测试用例都会执行；如果不包括，则代码走第 98 行。

- 第 98 行，如果测试 Module 中不包括 -k 的参数值，则找出测试类名中含有 -k 的参数值的所有测试类。

如果测试类名中含有 -k 的参数值（第 103 行），则这个测试类下的所有测试用例都会被执行；如果不存在，则代码走 111 行。

- 第 111 行，找出测试函数名中含有 -k 参数值的所有测试函数。

如果测试函数名中含有 -k 参数值（第 116 行），则执行这个测试函数；反之，则不执行这个测试函数。

> 仔细观察，你会发现其实我没有写执行模块，即当前我们仅仅查找出了应该运行的测试文件、测试类和测试方法。但我并没有真正运行它，只是打印出该运行的函数名称。

（3）下面我在命令行中分别根据需要来运行下我的程序，看看结果有什么不同。

- 按照测试文件名挑选测试用例执行

```bash
iTesting -k 'iTesting'
```

可以看到，test_iTesting.py 下的所有测试用例都被执行了。

- 按照测试类名挑选测试用例执行

```bash
iTesting -env dev -k TestDem
```

可以看到，TestDem 匹配到了 TestDemo 这个测试类，所以测试类 TestDemo 下的所有测试用例都被执行了。

- 按照测试函数名挑选测试用例执行

```bash
iTesting -env dev -k login
```

可以看到，login 匹配到了如下目录 (test_iTesting/TestDemo/) 下的 test_login 函数，所以 test_login 被执行了。

通过给定 -k 参数，我们实现了根据名字模糊匹配并执行测试用例。

#### 2.实现类似 pytest 的 -m 功能

现在，我来实现类似 pytest 的 -m 功能，步骤如下：

- 添加 -m 这个命令行参数；
- 给所有测试类，测试函数打标签；
- 当通过 -m 给定的标签等于测试类/测试函数的标签时，执行这个测试类/测试函数。

**（1）第一步，添加命令行参数 -m。**

更改 main.py 文件的 parse_options 方法，增加 -m 参数：

```python
def parse_options(user_options=None):
    parser = argparse.ArgumentParser(prog='iTesting',
                                     usage='Demo Automation Framework, Search wechat account iTesting for more information')
    parser.add_argument("-env", default='dev', type=str, choices=['dev', 'qa', 'staging', 'prod'], help="Env parameter")
    parser.add_argument("-k", default=None, action="store", help="only run tests which match the given substring expression")
    parser.add_argument("-m", default=None, action="store", help="only run tests with same marks")
    if not user_options:
        args = sys.argv[1:]
    else:
        args = shlex.split(user_options)
    options, un_known = parser.parse_known_args(args)
    if options.env:
        print("\n想了解更多测试框架内容吗？请关注公众号iTesting")
        print('Currently the env are set to: %s' % options.env)
    if options.k:
        print("你设置了-k参数，将会运行所有包括'%s'的测试文件，测试类，测试函数" % options.k)
    if options.m:
        print("你设置了-m参数，将会运行所有标签为'%s'的测试类，测试函数" % options.m)

    return options
```

**（2）第二步，给所有测试类和测试方法类打标签，这就要用到装饰器。**

注意，这里我为了使得代码量尽量少，演示尽量简单，先行定义以下打标签要遵循的规则：

当前仅实现给测试方法打标签，给测试类打标签暂不实现。

在 main.py 文件中定义一个新函数：

```python
# 确保以下第二行放入main.py开头的导入语句
from functools import wraps
# 新增一个类装饰器用来装饰测试用例
class TestMark(object):
    def __init__(self, mark=None):
        self.mark = mark
    def __call__(self, func):
        @wraps(func)
        def wrapper():
            return func
        setattr(wrapper, "__test_case_mark__", self.mark)
        return wrapper
```

接着，更改 test_iTesting.py 文件，给测试类 TestDemo 下的测试方法加上装饰器 TestMark：

```python
# 此文件中，其他部分不变，只更改如下部分
class TestDemo:
    def test_login(self, username, password, expected):
        assert Demo.login(username, password) == expected
    @TestMark('myMark')
    def test_demo_true(self):
        assert True
    def test_demo_false(self):
        assert False
```

最后，把识别 -m 的逻辑添加到 run 方法。为了演示方便，我这里展示出，当没有指定 -k 参数时，判断 -m 标签的源码：

![5][5]

请观察：

- 第 142 行，判断测试函数有没有 -m 参数。没有 -m 参数，执行第 148 行及以后的代码，执行完就结束；有 -m 参数，继续第 2 步。

- 有 -m 的情况下，查看测试函数的“test_cse_mark”这个属性，并且要判断它的值等不等于用户传入的 -m 的参数值（第 143 行）。如果都相同，则将执行这个测试函数；如果不相同，则不执行这个测试函数。

注意：关于 -m 的判断，是在最后 func_name.startswith('test') 这里判断的（这个语句在上述的 141 行），这是个独立的判断，即所有存在 func_name.startswith('test') 这句话后，都应该加 -m 的判断。明白了这个之后，我们把其余存在 func_name.startswith('test') 这句话的地方进行更改，更改后的 run 方法如下所示。

现在在 -k 参数存在的情况下，将 -m 参数的代码补上：

![6][6]

在 -k 存在的情形下，添加 -m 方法很简单，找到func_name.startswith('test')，然后执行替换操作即可。

**（3）下面我们来运行下，看看效果如何。**

不指定 -k，只指定 -m。

```bash
iTesting -m myMark
```

因为只有 test_demo_true 这个函数有 myMark 的标签，所以只有它执行了。

- 指定 -k，匹配到测试 Module，不指定 -m。

```bash
iTesting -k iTesting
```

因为匹配到了 test_iTesting.py，所以 test_iTesting.py 下面所有测试用例都被执行了。

- 指定 -k，匹配到测试类TestDemo，指定 -m。

```bash
iTesting -k TestDemo -m myMark
```

虽然 TestDemo 匹配了 test_iTesting.py 文件夹下的两个函数 test_demo_true 和 test_demo_false。但是因为只有 test_demo_true 用 myMark 这个标签，故只有它被运行了。

- 指定 -k，匹配到测试函数 test_login，指定 -m。

```bash
iTesting -k login -m myMark
```

可以看到虽然 -k 和 -m 分别匹配到了 test_login 和 test_demo_true 两个函数，但是没有一个函数是同时满足 -k 和 -m 的条件的，所以没有测试用例被执行。

## 技术新趋势，微服务下的测试框架分层实践

我们知道，没有微服务之前，我们的应用都是单体应用，但是单体应用有如下明显缺点。

- 部署成本高， 部署频率低

由于单体服务只能统一部署，假设单体服务有很多个模块，即使你只改动了其中一个模块，在部署时，你都必须全量部署。而当业务复杂时，部署动辄花费数十分钟，甚至数小时之久，在这段时间内，应用就无法正常对外提供服务，部署的成本非常高。

正因为部署的成本很高，所以单体服务的部署通常会积累一定的需求后，统一部署，把部署频率降低来减少服务不可用时间，这就导致了单体应用无法适应快速变化的外部环境，以及无法及时响应客户的需求。

- 改动影响大，风险高

在单体服务架构下，无论你是改动一行代码，还是改动多个模块的代码，都要经历重新编译、打包、测试和部署。这样一来，改动的影响就非常大，无论是开发人员还是测试人员，都疲于奔命。如果测试不充分，还会导致服务不可用，发布风险非常大。

- 技术债务多，扩展困难

单体应用由于所有的模块都在一块，会导致模块的边界比较模糊，依赖关系不清晰。并且随着时间的推移，这些相互依赖的地方，逻辑关系越来越难以理顺，逐渐就会变成技术债务。

单体应用所有模块和功能都耦合在一块，但是这些模块之间，需要的软硬件资源确不尽相同， 单体应用为了保证可用性，必须使得软硬件资源满足每一个模块的需求，这样不仅造成了资源的浪费，还导致了扩展的困难（无法按模块扩展）。

正是由于这些原因，微服务架构应运而生。

### 什么是微服务？

微服务是一种开发软件的架构和组织方法，其中软件由通过明确定义的 API 进行通信的小型独立服务组成，这些服务由各个小型独立团队负责。微服务架构使应用程序更易扩展和更快地开发，从而加速创新并缩短新功能的上市时间。

微服务相对于单体应用来说，最大的不同是微服务**将单体应用拆分，变成一个个的单独功能，每个功能都被称为一项微服务，每个微服务围绕具体的业务，能够单独部署、发布**。各个微服务之间一般通过 RESTFUL 集成。

下面这个图展示了单体应用和微服务之间的区别：

![7][7]

### 微服务之 CAP 定理

微服务本质上是分布式服务。分布式服务遵循 CAP 定理，即在一个互相连接并共享数据的节点的分布式系统中，当涉及读写操作时，在一致性（Consistence）、可用性（Availability）、分区容错性（Partition Tolerance）三者中， 只能保证两者可用。

> C（Consistency）：一致性，即数据一致性。更新操作成功并返回客户端完成后，所有节点在同一时间的数据完全一致，一致性分为强一致性和最终一致性。
> A（Availability）：可用性，即服务的高可用。某个服务瘫痪不影响整个分布式系统的正常运行。
> P（Partition Tolerance）：分区容错性，也叫作分区耐受性。分布式系统在遇到某节点或网络分区故障的时候，仍能够对外提供满足一致性和可用性的服务。

为什么 CAP 同时只能满足两个呢？因为在事务执行过程中，系统其实处于一个不一致的状态，不同的节点的数据并不完全一致。

CAP 理论有什么作用呢？ 它指导了分布式服务下的系统设计。即在 P（分区容错性）发生的前提下（分区容错性无法避免），A（一致性）和 C（可用性）之间，能选择一个作为系统设计的目标。如果追求 A（一致性），则无法保证所有节点的 C（可用性）；如果追求所有节点的 C（可用性），则无法做到 A（一致性）。

### 微服务解决了什么问题？

我们把单体应用拆解成微服务，会有什么收益呢？ 举个例子来说，单体应用内部是由许多组件组成的，如果一个组件更改了，就不得不更新整个应用。 另外随着业务的发展，组件之间的依赖、复杂度不断增加。此时，一个组件出问题就可能导致整个应用不可用。

**由此可见，微服务首先解决了组件间的互相依赖问题**。 除此之外，微服务还有如下好处。

#### 1. 独立部署，系统更加健壮

把单体应用拆分为微服务，首当其冲的好处就是独立部署。独立部署，一方面使得部署上线的时间可以缩短，另一方面，一个微服务的不可用， 不会影响到其他的微服务。

独立部署使得系统的健壮性变强。

#### 2. 开发技术多元

使用微服务后，微服务之间的访问、调用，可以走统一的 RESTFUL HTTP 协议来通信。只要对外的接口不变，在微服务内部，技术团队可以采用自己最擅长的编程语言、数据库等。而这些是单体应用无法想象的。

在新技术出现时，微服务可以快速引入小部分升级；但单体应用做不到，技术更新的成本非常高。

因此微服务使得开发技术更加多元化。

#### 3. 快速扩展并减少资源浪费

单体应用的扩展，其水平扩展能力非常有限，大部分的扩展依赖垂直扩展。但由于单体应用是一个整体，势必造成资源浪费。比如，有的模块是计算密集型需要更强的 CPU，有的模块是 I/O 密集型需要更大的内存支持，但是由于单体应用无法拆开部署，导致了硬件必须同时满足这两种需求，这就造成了资源的浪费。

而微服务的水平扩展非常容易，垂直扩展也可以拆分部署，减少了浪费。

#### 4. 服务之间边界清晰

一般情况下，一个微服务负责提供一个模块功能。我们用订单信息的共享和调用来举例，在没有把这个功能变成一个微服务前，由于各个业务模块都会用到订单信息，那么就可能存在各个业务模块自己去写代码来访问订单信息数据库（通常是通过 DAO 层来拼接 SQL）的情况，这样就造成了代码的重复编写。而且，随着调用的模块增多，你很难知道到底有多少模块存在自己访问订单信息的情况。

而有了微服务后，订单信息的获取由订单微服务统一提供，这样业务边界就变得非常清晰。

### 微服务给测试带来的挑战及解决之道

我们都知道，在软件开发领域，“没有银弹”（No Silver Bullet）是一种普遍共识。 微服务解决了这么多的问题，也势必会带来新的问题。下面我们来看下，微服务带给测试的挑战有哪些。

#### 1. 测试环境部署困难——服务容器化

想一下这个问题，你的单体应用被拆分成多个微服务，而你只负责其中一个微服务的测试，那么，你如何进行你的测试？

因为微服务独立部署、独立发布的特性，搭建起一套可用的测试环境变得困难起来。加上微服务导致的技术多元化，有时候需要测试人员为不同语言、不同数据库的服务去搭建各自的环境，从而导致测试成本增加。

于是，**服务容器化**应运而生。通过**Docker 容器及镜像**，可以做到环境部署简单，可配置。不仅如此，使用 Docker 镜像部署，保证了开发和测试环境的一致性，避免了由于开发环境和测试环境不一致带来的各种问题。

#### 2. 微服务下整合测试困难——契约测试

实施微服务后， 你负责测试的微服务可能被其他微服务依赖，而你也可能需要其他微服务提供数据，才能开展你的测试工作。

但是微服务通常伴随着团队划分，即负责不同微服务的人处于不同的团队。这样， 你们互相不了解对方的业务，在两方微服务需要进行整合，以及联调测试时，测试就变得非常困难。即使你们联调测试通过，在后续业务的开发中，可能各自又更改了微服务对外的接口，那么下次联调测试时，你们互相不知道对方对外服务的接口有改变。那么，测试又是一场噩梦。

于是，契约测试（Pact）， 特别是消费者驱动的**契约测试**（Consumer-Driven Contracts）应运而生。契约测试是用来验证服务提供方（Provider）和服务消费者（Consumer）彼此之间契约是否(Pact)完备正确的测试活动。

由于有了契约测试，服务提供方改动契约而导致的测试失败能够立即被发现，这让联调测试不再是噩梦。假若有一天契约改变了，我们也可以通过更换契约文件来保证双方都得到通知，从而避免测试噩梦。

#### 3. 非功能性测试容易被忽略——全链路压测

单个微服务下的功能测试跟单体应用下的功能测试并没有区别，但微服务整体对外提供服务后，测试人员很容易对非功能性的测试认识不足。

比如，单个微服务功能、性能都满足要求，但是多个微服务集成为系统整体向外提供服务时，由于可能的网络延迟带来额外的性能开销，可能会使得性能相对于单体应用有所下降。

另外，由于一条调用链路上的不同微服务能够承受的最大压力不一样，如果微服务没有“降级”“限流”和“熔断”的能力，当某个微服务接收到的请求超出它能够处理的最大强度时，系统就有“雪崩”的可能。

那么如何保证跨服务调用的可靠性，以及整个系统集成后的性能不受影响呢？全链路压测近年来变得越来越重要，并逐渐演化成为系统性能保驾护航的重要途径。

要实施**全链路压测**，必须注意以下问题。

- 理顺全业务核心链路

既然是全链路，就需要联合业务相关方，理顺业务逻辑，最终生成从真实用户角度出发，如何使用系统业务的各个操作，并将它们组成一个个的测试链路。

在实施中，常常将核心业务和非核心业务进行拆分，从核心业务出发，逐渐扩展到非核心业务。

- 做好数据模型构建

实施全链路压测的一大难点便是测试数据模型的构造、数据流量的引入，以及数据的脱敏和隔离。

在实践中，数据流量的引入往往是从生产环境数据库中获取数据，经过数据的脱敏后进行使用。因为全链路压测一般直接使用生产环境测试，所以还需防止测试数据污染（通常会采用数据隔离，写影子库的方式来避免）。

- 做好系统容量规划

因为全链路压测常常在生产环境运行，而压测会产生大量的流量压力，所以在执行全链路压测之前，必须做好系统容量的规划工作，防止因为测试时忽然增大的流量压力，造成系统不堪重负甚至宕机。

在实施上，通常全链路压测会从单个接口、单个微服务的基准测试做起，并逐渐扩大到全部微服务。

全链路压测近年来逐渐演化成一个专门的测试领域，无论其工具选型、技术方案均与常规的测试有所不同，建议大家根据自身业务需求，找到合适自身业务的技术方案。

而除了性能问题需要关注外，微服务也要关注**幂等测试**。

以下单扣除金额为例，在复杂的生产环境里，可能发生某个微服务，或者某个接口忽然不可用，导致这一笔金额扣除的业务链没有全部执行完毕，业务的执行在中间的某个过程失败了（业务没走到最终态）。当微服务或者微服务接口恢复提供服务后，这些没走完的请求，应该能继续执行下去，并最终达到最终态。当业务达到最终态后，拿具备相同订单 id 的请求再次发送请求，系统将直接返回结果而不去执行。

#### 4. 分库分表增大了测试难度——写反向查找函数

虽然单体应用也可以分库分表，但是微服务往往伴随着分库分表，因为每个微服务通常都有自己独立的数据库，那么分库就变成自然的一个操作，而随着业务发展，数据量累积到一定程度，也必然会分库、分表。

分库分表给测试带来的最大问题是**测试数据的构造和获取变得复杂**。例如在开始测试时创建了一个用户，这个用户根据规则（通常是根据数值取模）创建后，用户的各项信息被存储到了 user_1 这个表；等到用户下单时，系统要根据 user id 去查询当前用户的状态，那么就需要我们反向根据 user id 获取到这个用户所在的表后再进行操作。

分库分表的算法往往不同，测试人员需要根据分库分表算法写个反向查找函数，或者提供一个服务供其他测试人员调用，这对代码能力有一定要求。

#### 5. 端到端测试变得困难——Mock 服务

由于微服务的复杂性，在测试阶段，测试环境可能无法拥有与线上系统一样完备的环境以供测试 。特别是当你的服务存在外部 service 依赖、第三方调用、通知的情况时，比如你的服务调用银行接口，在端到端测试时就会因为对方服务无法连通而失败，或者能够连通，但是调用需要收费。此时端到端测试变得困难甚至不可能。

微服务中往往需要大量的 Mock 来过滤掉与当前任务无关的请求。在测试环境进行端到端测试时，可以使用 Mock 服务过滤无关请求，将重点放在当前微服务本身上。

#### 6. 微服务依赖导致上线、回滚困难——分析清楚依赖关系

在微服务实施后，由于相互之间存在依赖，上线和回滚要遵照一定的顺序，否则可能会引发系统崩溃。

例如，微服务 A 和微服务 B 均是准备上线的新服务。微服务 A 依赖微服务 B，当部署时，必须先部署 B，如果部署顺序错误，比如 A 先上线，就可能会发生，由于 A 找不到 B，而出现 Error 500、404 的情况。

回滚时也是如此，假设微服务 A 依赖微服务 B，而微服务 B 更新了自己的接口，则微服务 A 必须相应更新，而上线后发现微服务 B 存在严重 Bug 需要回滚。此时，如果 B 直接回滚，A 就会由于接口请求参数不对，导致调用 B 出错。

所以对于测试人员，一定要了解自己负责的微服务与其他微服务之间的依赖关系。

### 微服务下的测试框架分层实践

我在前面 “告别三大误区，别让分层测试欺骗了你！”中讲过，测试金字塔模型虽然是软件测试中最经典的模型，但根据业务模型的不同，也有不同的变种。 例如，仅仅对于微服务本身，常见的就有如下两种分层模型：

![8][8]

那么这两种分层模型哪一种好呢？在我看来，采用什么类型的分层模型测试，与你的业务类型有着非常紧密的关系，下面我们详细分析一下。

#### 1.纺锤模型

如果你的项目与第三方依赖比较多，或者你的项目本就是基于第三方提供的服务而建立的。那么你就应该使用纺锤模型。

在纺锤模型中，最底层 Implementation Detail是第三方服务的实现细节。针对这部分，其实不在我们的掌控范围内，我们在测试中可以直接忽略。

针对第二层 **Integration Test，主要是测试我们的服务与第三方接口**之间的连通性和正确性。这部分测试，在我们测试框架中应该属于 API 测试那一层。

而最上层 **Integrated Test，这部分的测试其实是端到端测试**。这部分测试的成功与否，不仅取决于本系统所属的前端和本系统的后端接口的联通和正确性，还取决于本系统的后端和第三方接口的连通性和正确性。当这部分端到端测试出现问题时，需要排查是自己后端的问题还是第三方接口的问题。

对于这部分端到端的测试，在我们的测试框架分层中，最好与第二层的 API 测试对应起来。比如，我们建立如下的文件结构：

```bash
|--e2e
   |--test_deposit_e2e
|--API
   |--test_deposit_api
```

在这个结构中，我们针对同一个测试用例，有两个维度的测试：

- 第一个维度，是 e2e 即端到端测试。例如，当这个测试 test_deposit_e2e 成功时，表明我们的系统和第三方系统**都在正确运行**。

- 第二个维度，是我们的后端与第三方的接口的测试。这个维度的测试，是与第一种维度的测试一一对应的。比如，test_deposit_e2e 的执行，需要调用第三方接口 A，那么在 test_deposit_api 的测试里，我们就针对 A 这个接口进行测试。
当 test_deposit_api 这个测试成功而 test_deposit_e2e 这个测试失败时，我们知道问题一定出在我们的系统；反之，当 test_deposit_api 失败，我们就要分析，是 A 接口调用出错，还是我们的后端连通 A 接口后，自己内部的逻辑处理出错。

#### 2.微服务金字塔模型

当我们的系统业务主要是自研且业务模型类似下图时，就合适使用微服务金字塔模型。

![适用微服务金字图模型的业务图][9]

我们对照微服务金字塔模型一一讲解：

针对这个业务模型的每一层，都要做**Unit Test**以确保业务功能本身不存在问题；

针对这个业务模型不同层次之间或者相同层次不同模块之间的调用，既要做**集成测试**以验证模块集成后是否达成业务目标，也要做**契约测试**（对应 Component 层），以保障模块之间的调用和更改不会对业务目标产生影响；

针对前端页面层，需要从端到端以及探索测试层面来保障系统能够完成业务目标。

相应地，对应我们的测试框架分层来说，我们就需要进行如下分层：

```bash
|--e2e
   |--test_deposit_e2e
|--API
   |--test_deposit_api
       |--test_deposit_api_step1
       |--test_deposit_api_step2
```

此时，相较于纺锤模型来说，微服务测试金字塔模型对 API 层面的细节有了更仔细的检查。如果说在纺锤模型中，我们不必关心第三方服务接口内部细节；那么在微服务测试金字塔模型里， 我们**需要对 API 层进行更加深入的检查**，例如 test_deposit_api 这个接口对外提供 deposit 服务，但是它的内部，可能包括多个步骤，涉及多个微服务及其接口，因为它们都是我们自身的服务，故必须进行测试。

“纺锤模型” 和 “微服务金字塔模型”对测试框架的分层来说，主要是一个测试粒度的区别。

关于微服务模型，还有其他的分层实践，例如测试钻石型和全面测试型等。在我看来，只要是自研的服务和应用，都属于“微服务金字塔模型”这一个范畴，都应该进行全面、深入的测试，而不能只关注于集成测试。

## 告别依赖，Mock Server 必杀技

### 什么是 Mock？

Mock 是模拟的意思。在测试中，通常表述为：对测试过程中**不容易构造**或者**不容易获取**的对象，用一个**虚拟**的对象来进行模拟的一个过程。

那么哪些对象不容易构造？哪些对象不容易获取呢？

- 拿微服务举例，在一个调用链条上，微服务 A 依赖 B 服务才能提供服务，而微服务 B 依赖 C 服务， 微服务 C 依赖 D 服务.....在这样的情况下，把每个依赖的服务都构造完毕再开始测试，就变得不太现实。这种情况我们称之为不容易构造。

- 又比如，假设我们的服务依赖银行的接口提供资金的查询。在测试中， 银行不可能无条件或者随意提供接口给我们调用。那么，在我们开发完毕但是要依赖对方才能开始测试时， 我们称这种情况为不容易获取。

无论是哪种情况，使用 Mock 的一大前提条件是：我们仅关注测试对象自身内部逻辑是否正确，而**不关心其依赖对象逻辑的正确性**。

### Mock Server 是什么

了解了什么是 Mock，理解 Mock Server 就比较容易了。简而言之，能够提供 Mock 功能的服务就叫作 Mock Server。Mock Server 通过模仿真实的服务器，提供对来自客户端请求的真实响应。

### 那么 Mock Serve 如何模仿真实的服务器呢？

一般情况下，搭建 Mock Server 前，需要了解将要 Mock 的服务，都能提供哪些功能？对外提供功能时，又以哪种格式提供服务？例如，以接口方式提供服务，接口的种类、接口的定义，以及接口输出的参数等信息。

了解了这些，Mock Server 就可以根据请求的不同，直接静态地返回符合业务规范的接口，也可以在 Mock Server 内部经过简单计算，动态返回符合业务规范的接口。

在实际工作中，Mock Server 通常以 Mock API Server 的形式存在，也就是我们一般以接口的形式对外提供服务，Mock Server 搭建在本地或者远程均可以对外提供服务。

### Mock Server 的常用场景

最常见的 Mock Server 的使用场景如下：

- 前后端联调使用，通过事先约定接口规范，使前端可以不依赖后端服务**独立开展工作**，这也是开发最常用的功能。

- 使用 Mock Server**屏蔽无关的真实服务**，从而专注于要测试的服务本身。仅仅测试需要测试的服务，其他不在我负责范围的服务使用 Mock。

- 供测试工程师使用，在测试环境**避免调用第三方收费服务**。比如，企查查等服务是收费的，在测试环境就可以不调用，以节省费用。

- **破除第三方依赖**。比如，本公司业务流程的某一个步骤需要获取第三方服务的正确返回才能继续进行，那么在测试中就可以用 Mock Server，直接模拟外部 API 的响应来断言系统的正确行为。

以上四条基本可以概括 Mock Server 绝大多数的使用情况。

可以看到，前两条主要是开发之间在使用，那么这个 Mock Server 通常是开发之间协调提供；或者是前端开发根据 API 接口规范，直接写 Hard Code 的响应供自己调用；或者是后端直接提供一个返回值给前端调用，基于成本和时间考虑，这个返回值通常也是 Hard Code 的，这一块不在我们今天的讨论范畴。

**而后两条就都是跟测试密切相关了，也是我们今天需要关注的。**

### Mock Server 搭建

Mock Server 的搭建有两种方式，分别是借助第三方工具直接提供 Mock Server，以及自主编码实现 Mock Server。下面我来分别介绍下这两种方式。

#### 1.借助第三方工具直接提供 Mock Server

可以直接提供 Mock Server 功能的第三方工具很多，这里我选择使用**Postman**的 Mock 功能。 Postman 提供了三种方式创建 Mock Server，我们直接选择第一种，并以Postman官方给的例子来看下如何不写代码创建 Mock Server。

（1）打开 Postman， 点击"+New" button。

（2）在弹出来的"Create New"选项中点击 Mock Server 。

（3）Postman支持"Create a new API"或者"Use collection from this workspace"两种方式来创建 Mock Server。

简单起见，我们选择“Create a new API”。在下图中我们选择请求方法，可以是 GET、POST、UPDATE，也可以是 DELETE，也就是我们常说的增删查改。然后输入请求路径，需要返回的 HTTP 响应码，以及响应的 Body，可以模拟多个 API 接口。全部设置好后点击下一步。

（4）然后，你将看到下图 4 个需要配置的地方。

- 输入 Mock Server 的名称。
- 选择一个环境（可选），通常我们的测试环境有好几个，你可以配置使用不同的测试环境。
- 是否要将 Mock Server 设为私有。
- 是否将 Mock Server 的 URL 保存为环境变量。

等你都配置好后，单击下一步继续。

（5）当你看到如下界面，说明配置成功。此时你的简易版 Mock Server 就生成了。记录下生成的 URL，然后在你的测试中调用相应的 URL 地址即可。

在本例中，我在第（3）步设置了 echo 这个接口，它是个 GET 请求，你就可以直接在浏览器输入 http://mock-server-url/echo 这样的方式来访问，需要替换这里 mock-server-url 为图中的地址。

如果是 POST 请求，你也可以自定义参数，Request Body 等。

#### 2.自主编码实现 Mock Server（Flask）

使用第三方工具创建 Mock Server 比较简单，但是由于严重依赖于第三方工具，在实际工作中，一般用作开发完成后的第一轮手工测试。而业务上线后，在测试框架中使用时，我们还是倾向于根据业务规则自主编码实现 Mock Server。

当前，Github 上有很多成熟的 Mock Server 可供我们使用，根据编程语言的不同，最常见的有如下几个：

- [Java - Mock Server](https://github.com/mock-server)
- [Python - responses](https://github.com/getsentry/responses)
- [JavaScript - easy Mock](https://github.com/easy-mock/easy-mock)

这些 Mock Server 的搭建非常简单，按照步骤操作即可，我就不再赘述。

下面我讲下 Mock Server 的另外一个普遍搭建过程，即使用Flask来充当 Mock Server。

> Flask 是一个微 Web 框架，使用 Python 语言编写。使用它可以快速完成功能丰富的中小型网站或 Web 服务的实现。

（1）首先你要保证系统已经安装好 Flask，并确保你的机器有 Python 运行环境。

```bash
pip install flask
```

（2）创建一个 Python 文件，比如叫 easyMock.py.，代码如下：

![10][10]

这段代码实现了这一功能：访问 http://127.0.0.1:5000，直接返回“hello world”。

直接使用 GET 方式访问http://127.0.0.1:5000/mock，会出现 404 错误。

如果使用 POST 方式，假设提交的数据中包括“name=kevin”这个键值对，则返回如下结果：

```bash
{"status": 200, "message": "True", "response": {"orderID": 100}}
```

如果你提交的数据中不包括“name=kevin”， 则返回如下结果：

```bash
{"status": 400, "message": "False", "response": {}}
```

如果代码在运行过程中发生了错误，则返回如下结果：

```bash
{"status": 500, "message": "Server Error", "response": {}}
```

这其实就是一个最简单的Mock Server。

（3）启动这个 Flask 服务。

打开命令行工具，在你的 Terimal 里运行以下命令行，以启动这个 Mock Server。

```bash
python easyMock.py
```

（4）测试 Mock Server。

首先安装 curl。

> curl 是一个利用 URL 语法在命令行方式下工作的文件传输工具。由于它支持 HTTP 协议及其请求方法，故也可以用来发送 HTTP 请求。

```bash
# curl的安装和配置，根据操作系统的不同，步骤也不同。
# 如果你使用pip， 可以直接以如下方式安装。 
pip install curl
# 如果你发现在你的操作系统下，上述安装方式不起作用，你可以直接在搜索引擎中搜索相关的安装方式。
```

curl 常用的语法如下：

```bash
# 直接发送GET请求
$ curl https://www.helloqa.com
# 添加HTTP请求头访问
$ curl -H "Content-type: application/json" https://www.helloqa.com
# 指定HTTP请求
# -X 表示请求方法
# -d 表示发送 POST 请求的数据体
$ curl -X POST  -d 'iTesting=Good' https://www.helloqa.com
```

最后，我们通过 curl 发送 HTTP 请求，来验证下搭建的 Mock Server 是否功能正确：

```bash
# 通过curl直接调用，返回500
curl -H "Content-type: application/json" -X POST -d '{"name":"kevin"}' http://127.0.0.1:5000/mock
# 返回400
curl -d'name=kevin＆'-X POST http://127.0.0.1:5000/mock
# 返回200
curl -d'name=kevin' -X POST http://127.0.0.1:5000/mock
```

可以看到，根据我的输入不同，Mock Server 返回了期望的结果。

至此，你的 Mock Server 已经搭建完毕。之后在你的测试代码里，涉及调用第三方应用的情况，你就可以直接转而调用 Mock Server 来继续你的测试了。当然，你的 Mock Server 实现要考虑第三方应用的业务逻辑和输出结果的格式、参数以及数据等方面。

不知道你有没有注意到，Mock Server 无论是上述哪种方式的创建，都需要一点点工作量，而且都有如下弊端：

- 你无法向真正的服务器发送请求，你的所有请求都发送至 Mock Server。

- 在真实服务器可以提供工作，或由 Mock Server 向真实服务器之间进行切换时，可能由于人为原因导致错误。比如，有的地方你替换了真实服务器，有点地方你仍调用 Mock Server。

那么，有没有办法可以实现：我直接向真实的服务器发送请求，同时我要求真实的服务器根据我的需要，来返回 Mock 数据或者真实的服务器响应数据呢？

当然有了，利用新一代前端自动化测试框架 Cypress 可以不写代码便能完成如上请求。Cypress 是新一代端到端测试神器，被誉为 Selenium/WebDriver 杀手和 Web 端自动化测试技术的未来。

## 对外输出，让测试报告自己说话

### 测试报告应该包括哪些内容？

在我看来，测试报告至少需要包括项目总览和执行情况分析这两方面的信息。

**1. 项目总览**

- 本次测试执行了多长时间？
- 总共执行了多少测试用例？
- 有多少测试用例执行成功？
- 有多少测试用例执行失败？
- 有多少测试用例是非正常失败的？
- 不是由于断言失败，而是由于环境不稳定，运行中突发错误而导致的失败。
- 每条测试用例执行了多长时间？
- 本次测试在哪个环境运行？是开发环境、集成测试环境还是生产环境？
- 本次测试运行在哪个操作系统上？

**2. 执行情况分析**

针对每一次测试运行，测试报告应该提供最基本的测试分析，包括：

- 按照测试失败划分的测试分析图
- 按模块划分的测试分析图
- 按照测试用例重要程度、优先级划分的测试分析图
- 按照测试执行时间划分的测试分析图
- 这些不同维度的分析图，可用从各个层面来反映软件的质量情况。

所以，依托测试报告进行分析和总结，我们能够有理有据，以数字形式直观反映项目暴露出的质量问题，从而催促各个相关方后续改进。

在当前市面上所有第三方或者自研的测试报告系统中，**Allure** 是最全面，且支持的测试框架最多的一个测试报告系统。它是开源的测试报告框架，它旨在创建让团队每一个人都清楚明了的测试报告。下面我将以 Allure 报告为例，详细讲解测试报告的开发使用。

### Allure 报告生成的原理

Allure 报告是基于标准的 xUnit 结果输出，再添加补充数据而生成的，其报告的生成基于如下两个步骤。

- 在测试执行期间，一个名为 **Adapter** 的小型 library 被连接到测试框架中，并将所有测试执行的信息保存到 XML 文件中。对于大多数编程语言下的流行测试框架（例如 python 语言中的 pytest，Java 中的 jUnit 等），Allure 都默认为其提供了 Adapter。

- 获取 XML 文件后，Allure 会**将这些 XML 文件转换为 HTML 报告**。这一步骤可以通过持续集成系统的 Allure 插件，或者命令行命令实现。

### Allure 报告特点

Allure 报告之所以受到开发、测试，甚至管理人员的推崇，是因为它有如下明显的特点。

- 从开发/质量保证的角度看，Allure 报告可以**缩短常见缺陷的生命周期**。

可以将测试失败划分为 bug 和损坏的（Broken）测试，还可以配置日志、步骤、固定装置、附件、时间、历史记录，以及与 TMS 的集成和 Bug 跟踪系统，方便将 Task 与负责 Task 开发人员和测试人员绑定，从而使开发和测试人员第一时间掌握所有信息。

- 从管理者的角度看，Allure 提供了一个清晰的“全局”视野。

包括本次测试涵盖了哪些功能，Bug 在哪个 case 用例中被发现，以及整体测试用例、单条测试用例的执行时间等信息。

### Allure 测试报告一览

Allure 测试报告除了涵盖测试运行的全面信息外，还提供各种维度的分析图，包括如下几个部分。

- 项目总览（OverView）

项目总览显示了总体测试运行的一系列统计信息。

- 按缺陷种类分析（Categories）

缺陷种类分析显示了所有不同原因引起的失败，并分类展示。

- 按测试套件分析（Suites）

测试套件分析显示了按照套件和类划分的所有的测试执行情况。

- 图表模块（Graphs）

图表模块，包括按照不同维度分析的各种图表（例如测试状态表分析，测试用例等级分析表，测试执行时间分析表等等）。

- 按执行时间分析（Timeline）

按执行时间分析模块，详细列出了各个测试用例的执行时间，你可以筛选出那些运行时间最长的测试用例进行优化。

- 针对 BDD 驱动的测试用例进行分析（Behaviors）

这里主要是根据 Epic、Feature 和 Story 标签对测试结果进行分组。

- 按照 Package 进行分析（Packages）

Package 模块列出了按照 Package 维度进行分析的详细图表。

了解了 Allure 测试报告的模块划分，我们来看下，如何配置使得这些模块反映测试的执行情况。

### Allure 测试报告开发配置指南

Allure 有很多独有的功能，可用来方便自定义测试报告，下面我将详细为你讲解。

#### 1.Allure 的安装和配置

你可以直接通过如下方式安装：

```bash
pip install allure-pytest
```

> 注意，如果你安装过 Allure 2.0 之前的版本，你需要先将之前的版本卸载。

#### 2.Allure 测试报告基础使用

Allure 测试报告安装配置好后，由 pytest 运行的测试便可以直接使用。假设当前你有个项目名为 allureDemo，则你可以采用如下方式使用 Allure 报告：

- 首先运行你的测试

```bash
# 直接执行allureDemo项目下的所有测试用例，并将测试报告文件夹allure_reports放在项目根目录下
D:\_Automation\allureDemo>pytest -s  -v --alluredir=./allure_results
```

- 运行完成后，打开 allure 报告

```bash
# 以Win10为例：
# 1. 使用快捷键 Win + R 调起运行提示框
# 2. 输入“cmd”进入到命令行
# 3. 切换目录到项目根目录，本例中在D:\_Automation\allureDemo>：
# 4. 输入命令生成allure报告：
allure serve allure_reports
```

此时，Allure 会帮你生成测试报告会自动打开。

### Allure 报告实战

为了清晰地讲解 Allure 各个模块的使用，但又尽量少地引入其他代码，我将重新建立一个项目来详解 Allure 测试报告。

```bash
|--allureDemo
    |--tests
        |--test_baidu.py
        |--test_basic_report.py
        |--__init__.py
    |--conftest.py
```

其中 conftest.py 里的代码如下：

```bash
import allure
import pytest

def pytest_addoption(parser):
    parser.addoption(
        "--flag", action="store_true", default=False, help="set skip or not")
    parser.addoption(
        "--browser", action="store", default="Firefox", help="set browser")

@pytest.fixture(scope='session')
def get_flag(request):
    return request.config.getoption('--flag')

@pytest.fixture(scope='session')
def get_browser(request):
    return request.config.getoption('--browser')

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    　　本hook用于制作测试报告
    　　:param item:测试用例对象
    　　:param call:测试用例的测试步骤
    　　         执行完常规钩子函数返回的report报告有个属性叫report.when
                when=’setup’ 代表返回setup 的执行结果
                when=’call’ 代表返回call 的执行结果
    　　:return:
    """
    outcome = yield
    rep = outcome.get_result()
    if (rep.when == "call" or rep.when == 'setup') and (rep.failed or rep.skipped):
        try:
            if "initial_browser" in item.fixturenames:
                web_driver = item.funcargs['initial_browser']
            else:
                # 如果找不到driver，则直接return
                return
            allure.attach(web_driver.get_screenshot_as_png(), name="wrong picture",
                          attachment_type=allure.attachment_type.PNG)
        except Exception as e:
            print("failed to take screenshot".format(e))
```

在这个代码中，我分别定义了两个命令行参数 flag 和 browser。

- flag：只有两个值 True 和 False，当用户不传 flag 参数时，默认为 False，当用户传递 flag 时，值为 True。

- browser：代表要启用的浏览器，默认是 Firefox 浏览器。

对应地，get_flag 和 get_browser 这两个 fixture 就是分别用来取 flag 和 browser 的值。

被装饰器 @pytest.hookimpl(tryfirst=True, hookwrapper=True) 装饰的函数 pytest_runtest_makereport，是 pytest 提供的 Hook 函数，它有以下两个作用：

- 可以获取到测试用例不同执行阶段的结果（setup，call，teardown）；

- 可以获取钩子方法的调用结果（yield 返回一个 result 对象）和调用结果的测试报告（返回一个 report 对象，即 _pytest.runner.TestReport）。

而在本例中，我通过它实现了当测试失败或者被 skip 时，自动根据 WebDriver 提供的 get_screenshot_as_png() 方法来截图。

接着，我们来看下文件 test_baidu.py 的内容：

```python
# -*- coding: utf-8 -*-
import time
import allure
import pytest
from selenium import webdriver

@allure.epic('baidu')
@allure.description('测试百度的搜索功能')
@allure.severity('BLOCKER')
@allure.feature("百度搜索")
@allure.testcase("http://www.baidu.com")
@pytest.mark.baidu
class TestBaidu:
    @pytest.fixture
    def initial_browser(self, get_browser):
        if get_browser:
            if get_browser.lower() == "Chrome":
                self.driver = webdriver.Chrome()
            elif get_browser.lower() == "firefox":
                self.driver = webdriver.Firefox()
            else:
                self.driver = webdriver.Chrome()
        else:
            self.driver = webdriver.Chrome()
            self.driver.implicitly_wait(30)
        self.base_url = "http://www.baidu.com/"
        yield self.driver
        self.driver.quit()
    @allure.title("测试百度搜索正确")
    @pytest.mark.parametrize('search_string, expect_string', [('iTesting', 'iTesting'), ('helloqa.com', 'iTesting')])
    def test_baidu_search(self, initial_browser, search_string, expect_string):
        driver = initial_browser
        driver.get(self.base_url + "/")
        driver.find_element_by_id("kw").send_keys(search_string)
        driver.find_element_by_id("su").click()
        time.sleep(2)
        search_results = driver.find_element_by_xpath('//*[@id="1"]/h3/a').get_attribute('innerHTML')
        print(search_results)
        assert (expect_string in search_results) is True
    @allure.title("测试百度搜索失败")
    @pytest.mark.parametrize('search_string, expect_string', [('iTesting', 'isGood')])
    def test_baidu_search_fail(self, initial_browser, search_string, expect_string):
        driver = initial_browser
        driver.get(self.base_url + "/")
        driver.find_element_by_id("kw").send_keys(search_string)
        driver.find_element_by_id("su").click()
        time.sleep(2)
        search_results = driver.find_element_by_xpath('//*[@id="1"]/h3/a').get_attribute('innerHTML')
        assert (expect_string in search_results) is True

if __name__ == "__main__":
    pytest.main(["-m", "baidu", "-s", "-v", "-k", "test_baidu_search", "test_baidu_fixture_sample.py"])
```

在这个文件中，我创建了一个测试类 TestBaidu 和两个测试方法 test_baidu_search() 和 test_baidu_search_fail()。注意：这两个方法有很多关于 allure 的装饰器，例如 @allure.epic、 @allure.feature 等，它们分别代表什么含义我等下再讲，我们继续往下看。

最后，test_basic_report.py 的内容如下：

```python
import allure
import pytest
from flaky import flaky

@allure.epic("演示下allure支持的测试")
@allure.description('测试模块1用来对模块1进行测试')
@allure.feature("测试模块1")
@allure.story("测试模块1_story1")
@allure.testcase("http://www.baidu.com")
@pytest.mark.basic
class TestBasic:
    @allure.step("测试步骤1 -- 判断登录成功")
    @allure.severity('BLOCKER')
    def test_login(self):
        """模拟成功的测试用例"""
        assert 1 == 1
    @flaky
    @allure.step("测试步骤2 -- 查询余额")
    @allure.severity("normal")
    def test_savings(self):
        """模拟失败的测试用例"""
        assert 1 == 0
    @allure.step("测试步骤2.1 -- 查询余额")
    @allure.severity("normal")
    def test_savings1(self):
        """模拟失败的测试用例"""
        assert 1 == 0
    @allure.description("调试用，不执行")
    def test_deposit_temp(self):
        """模拟skip的测试用例"""
        pytest.skip('调试用例，skip')
    @allure.issue("http://itesting.club", "此处之前有bug，bug号如上")
    @allure.step("测试步骤3 -- 取现")
    def test_deposit(self):
        raise Exception('oops')
    @pytest.mark.xfail(ccondition=lambda: True, reason='this test is expecting failure')
    def test_xfail_expected_failure(self):
        """被期望的失败"""
        assert False
    @pytest.mark.xfail(condition=lambda: True, reason='this test is expecting failure')
    def test_xfail_unexpected_pass(self):
        """期望失败，但是却成功，会被标记为不期望的成功"""
        assert True
    @allure.step("测试步骤4 -- teardown")
    def test_skip_by_triggered_condition(self, get_flag):
        if get_flag == True:
            pytest.skip("flag 是true时， skip掉此条用例")
```

在这个文件中，为了模拟到所有的测试运行情况，我人为定义了一些 pass 和 fail，以及 skip、xfail 的情况。

#### 1.Allure 测试报告装饰器

在运行整个测试之前，我们来学习下 Allure 测试报告的各个装饰器及其作用：

![12][12]

关于每一个装饰器的具体用法，可以直接参考上文中的代码示例。

#### 2.为 Allure 测试报告添加 Environment

现在，我来生成下测试报告：

```bash
# 在项目根目录下执行
# 本例中，根目录是D:\_Automation\allureDemo>
D:\_Automation\allureDemo>pytest -m baidu -s  -v --alluredir=./allure_results
```

执行成功后，通过如下命令打开测试报告：

```bash
allure serve ./allure_results
```

可以看到结果。默认情况下，Allure 生成的报告是不带 Environment 信息的。

**那么如何让测试报告带上 Environment 信息呢？**

- 首先，执行完测试用例后，创建文件 environment.properties，其内容格式如下：

```properties
Browser=Chrome
Browser.Version=86.0.4240
Environment=QA
```

> 注意：这里为 key=value 的格式。这个文件你可以通过编写相关函数动态获取每次执行时的真实值，然后写入 environment.properties 文件。这里为了方便，我直接 Hard Coded.

- 然后，把文件 environment.properties 拷贝到你在执行测试用例时设置的 allure 报告目录下，在本例中为 allure_results 这个目录。

- 最后，执行如下命令：

```bash
allure serve ./allure_results
```

你会发现 Environment 里出现了我们刚刚配置的值。

#### 3.为 Allure 测试报告增加错误类型

在默认情况下，Allure 仅仅会列出以下两种类型的 Categories。

- **Product Defects（failed tests）**

表示真正的测试执行失败，如果 Categories 里出现这个错误，通常表明测试用例最后的输出跟期望不符合，有 Bug 出现。

- **Test Defects（broken tests）**

表示测试用例本身有问题导致的错误，如果 Categories 里出现这个错误，通常表明测试用例在执行过程中出错了，需要我们进一步调查原因。

如果你仔细观察 test_basic_report.py 里的代码，你可以看到，我们很多用例是要 skip，或者需要根据用户的传参来 skip 的，这些测试用例没有被反映到 Categories 里。

**那么如何自定义 Categories 呢？**

首先，创建名称为 categories.json 的文件，内容如下：

```json
[
  {
    "name": "Ignored tests",
    "matchedStatuses": ["skipped"]
  },
  {
    "name": "Infrastructure problems",
    "matchedStatuses": ["broken", "failed"],
    "messageRegex": ".*bye-bye.*"
  },
  {
    "name": "Outdated tests",
    "matchedStatuses": ["broken"],
    "traceRegex": ".*FileNotFoundException.*"
  },
  {
    "name": "Product defects",
    "matchedStatuses": ["failed"]
  },
  {
    "name": "Test defects",
    "matchedStatuses": ["broken"]
  }
]

```

- 然后，把文件 categories.json 拷贝到你在执行测试用例时设置的 allure 报告目录下，在本例中为 allure_results 这个目录。

- 最后，执行如下命令：

```bash
allure serve ./allure_results
```

你会发现 Categories 里出现了我们刚刚配置的值 Ignored tests。

#### 4.显示历次运行的 trends

同样地，默认生成的 Allure 报告不包括历次运行信息 Trends，如果想添加历次运行信息到Trends，步骤如下。

执行完测试后，不要执行 allure serve 命令，转而执行 allure generate。

```bash
allure generate ./allure_results
```

这个操作会生成一个新的文件夹，名为 allure-report。拷贝 allure-report 文件夹下的 history 文件夹，及其子文件夹到 allure_results 这个目录中。

- 在新的一次测试执行后执行 allure serve，即可把历史记录带到 Allure 报告中。

```bash
allure serve ./allure_results
```

执行完后，打开 Allure 测试报告，你将看到 Trend 的内容。

#### 5.为 Allure 测试报告添加执行人

同样地，默认的 Allure 测试报告也不显示 Executor，这是因为 Executor 通常是由 Builder 自动生成的，比如通过 Jenkins plugin [Allure Jenkins Plugin](http://wiki.jenkins-ci.org/display/JENKINS/Allure+Plugin) 来生成。

- 当然你也可以自己生成， 首先创建名称为executor.json 的文件，内容如下：

```json
{
  "name": "iTesting",
  "type": "jenkins",
  "url": "http://helloqa.com",
  "buildOrder": 3,
  "buildName": "allure-report_deploy#1",
  "buildUrl": "http://helloqa.com#1",
  "reportUrl": "http://helloqa.com#1/AllureReport",
  "reportName": "iTesting Allure Report"
}
```

- 然后，拷贝 executor.json 到 allure_results 这个目录中去。

最后， 执行如下命令即可：

```bash
allure serve ./allure_results
```

执行完后，打开 Allure 测试报告，你将看到 Executor 的信息

#### 6.Allure 测试报告实现错误自动截图

在测试时，特别是 UI 自动化测试错误发生时，我们会想通过系统截图的方式，来更清楚地了解系统当时的状态，于是错误截图就很必要。

使用 Allure 自动实现错误截图，可以参考下我在本讲 conftest.py 这个文件中定义的如下函数：

```python
pytest_runtest_makereport
```

现在，我们来看下错误截图的实际效果。

首先，通过如下命令运行所有测试：

```bash
pytest -s  -v --alluredir=./allure_results --flag --browser chrome
```

执行成功后，通过如下命令打开测试报告：

```bash
allure serve ./allure_results
```

点击图中的 “FEATURES BY STORIES”， 进入 Behaviors 页面，展开后你可以看到下图：

可以看到，第 3 条测试用例执行失败了，截图信息也自动保存了。

#### 7.通过 Allure 测试报告查看测试用例详情

Allures 生成后，我们可以通过点击左侧的导航栏，进入到不同的页面，观察 Allure 的不同维度的测试分析。

你点击任何一条测试用例，都能在 OverView 里看到这个测试用例的详细情况，包括测试所属的模块、测试用例的重要程度，以及这个测试用例对应 Jira 的 story 等信息，非常清晰明了。

### 自研的测试报告

除了用 Allure 来生成测试报告外，你的测试报告也可以自研，那么自研怎么操作呢？

最简单的方式是你写一个 HTML 模板，然后把涉及运行信息的要素，比如运行环境、执行人、测试成功条数、测试失败条数定义为变量，然后在你的自研框架运行完后，把这些变量替换为真实的值即可。

至于图表的操作，你可以使用 hicharts、echarts 等图表可视化工具完成。

## 参考

- 《测试开发入门与实战》
- https://www.python.org

[1]: /images/py/auto-test-04/1.png
[2]: /images/py/auto-test-04/2.png
[3]: /images/py/auto-test-04/3.png
[4]: /images/py/auto-test-04/4.png
[5]: /images/py/auto-test-04/5.png
[6]: /images/py/auto-test-04/6.png
[7]: /images/py/auto-test-04/7.png
[8]: /images/py/auto-test-04/8.png
[9]: /images/py/auto-test-04/9.png
[10]: /images/py/auto-test-04/10.png
[11]: /images/py/auto-test-04/11.png
[12]: /images/py/auto-test-04/12.png
