---
title: 测试开发入门与实战（二）
date: 2021-07-06 09:30:00
categories: Python
tags:
  - Testing
---

搭建自动化测试框架

<!--more-->

## 你的第一个 Web 测试框架（一）

根据被测试对象的不同，当前流行的测试框架可以分为 Web 端测试框架、接口测试框架和移动端测试框架。在我看来，这些框架看似跨越了不同终端，属于不同类型的测试框架，但底层核心却可以是同一个，那就是以 unittest，pytest 为代表的一类基础框架。

就以 Python 应用中使用最广泛的**pytest/unittest** 框架为例，在它的基础上集成 Selenium/WebDriver 就是一个 Web 端测试框架、集成 Requests 就是一个接口测试框架、集成 Appium 就变成了移动端测试框架。事实上市面上大多数开源框架，大部分底层核心部分用的正是**pytest 框架**。

从我的角度看，学习框架最好遵循如下步骤：

- 照猫画虎，根据官方文档搭建初始版框架；
- 知其所以然，在使用中深入了解框架的经典实现；
- 推陈出新，结合公司业务持续创新，最终形成通用的框架。

今天我就按照以上步骤带领你搭建你的第一个 Web 测试框架。 考虑到学习的难度，在本节 Web 端框架的讲解中，我将使用 Python 标准库自带的 **unittest** 来作为 Web 端框架的核心；而在之后的 API 测试框架中，我将会使用 **pytest** 作为 API 测试框架的核心。

### 什么是 unittest？

**unittest 是 Python 自带的类 Junit 单元测试框架。**

像 Junit 之于 Java 一样，unittest 可用于单元测试，也可用于 Web 自动化测试甚至接口测试。unittest 支持测试用例/测试用例集的查找、组装，还可以在测试用例/测试用例集内共享数据，也支持根据条件筛选测试用例执行，以及自动化生成测试报告。

使用 unittest 可以快速搭建自动化测试框架进行测试。

### unittest 核心组成

unittest 由以下核心组成部分。

#### 1.Test Fixture

Test Fixture 通常用来做测试用例的准备或者清理工作。比如测试开始前的数据准备或者测试结束后的数据清理等。Python 通过 setUp()、tearDown()、setUpClass()、tearDownClass() 这 4 个钩子函数（Hook）来实现测试的准备和清理工作。

#### 2.Test Case

Test Case 是 unittest 的最小单元，一个 Test Case 就是一个测试用例，通常 Test Case 会继承 TestCase 这个基类。

#### 3.Test Suite

Test Suite 是测试套件，就是我们常说的测试用例集，它可以包含一个或多个测试用例。

#### 4.Test Loader

Test Loader 用来从提供的类（classes）和模块（modules）中生成测试用例集，默认情况下unittest 会提供一个 default test loader。

#### 5.Test Runner

Test Runner 是测试执行器，用来进行测试用例的执行和测试结果的输出。

unittest 运行原理

知道了 unittest 的 5 大核心类，我们看下 unittest 的运行原理，如图所示：

![1][1]

**Test Cases** 包括一个或者多个 TestCase 类，其中保存了具体的测试过程，你可以在测试类里使用 Test Fixture，例如setUp()、tearDown() 进行测试开始前的准备和结束后的清理工作。

**TestSuite** 包括一个或者多个 TestSuite 类，其中 TestSuite 包括了一个或多个 TestCase，也可以包括其他 TestSuite。TestSuite 通过 addTest() 或者 addTests() 方法把一个个的测试用例或者测试用例集（TestSuite）组装起来成为一个新的测试用例集。

**TestLoader** 类加载本地或从外部文件中定义好的 TestCase 或者 TestSuites。

**TestRunner** 包括TextTestRunner类， 它提供了运行测试的标准平台。测试运行可以通过 `unittest.main()` 或者 `python -m unittest xxx.py` 来运行。

**Test Results Collector** 包括 TestResults 类，它为测试结果提供了一个标准容器，它存储运行的测试用例状态，例如 errors、failures、skipped，测试的结果可以直接在 Console 输出，也可以为通过其他形式输出，例如 Text、result、output。

### 融会贯通 unittest 使用

#### 1.unittest 极简用法

好，原理我们也了解了，下面看下如何使用 unittest 来进行测试，以及 unittest 常用的语法语句。

```python
# coding=utf-8
import unittest
#测试类必须要继承TestCase类
class TestSample(unittest.TestCase):

    #测试用例默认以test开头
    def test_equal(self):
        self.assertEqual(1, 1)
    def test_not_equal(self):
        self.assertNotEqual(1, 0)

if __name__ == '__main__':
    unittest.main()
```

上面是 unittest 的最简单使用方法。可以看到我定义了一个测试类 TestSample，它继承自 unittest.TestCse 类，如果使用 unittest 框架，你的测试类必须要继承unittest.TestCse 类，且你的测试用例默认以 test 开头（实际上这个可以更改）。

这里我的测试用例有 2 个，分别为 test_equal 和 test_not_equal。注意测试用例在 unittest 里的表现形式是一个类方法。

我们在 Pycharm 里或者命令行里运行上述文件，得到如下结果：

```bash
Ran 2 tests in 0.002s
OK
```

#### 2.TestFixture 的使用

如果你想在测试用例或者测试用例集开始前，执行某些操作， 在测试用例或者测试用例集结束后再执行另外一些操作，那么你应该使用 Test Fixture。

```python
# coding=utf-8
import unittest

# 测试类必须要继承TestCase类
class TestSample(unittest.TestCase):
    #类共享的fixture，在整个测试类执行过程中仅仅执行一次，需加装饰器@classmethod
    @classmethod
    def setUpClass(cls):
        print('整个测试类只执行一次 -- Start')

    #测试用例fixture
    def setUp(self):
        print('每个测试开始前执行一次')
    # 测试用例默认以test开头
    def test_equal(self):
        self.assertEqual(1, 1)
    def test_not_equal(self):
        self.assertNotEqual(1, 0)

    #测试用例fixture
    def tearDown(self):
        print('每个测试结束后执行一次')

    #类共享的fixture，在整个测试类执行过程中仅仅执行一次，需加装饰器@classmethod
    @classmethod
    def tearDownClass(cls):
        print('整个测试类只执行一次 -- End')

if __name__ == '__main__':
    unittest.main()
```

需要注意的是，TestFixture 包括如下 4 个方法：

- setUp()

setUp()方法在每一个测试用例执行测试前**都会**执行。

- setUpClass()

setUpClass()方法**仅在**整个测试类开始执行前执行.setUpClass()方法必须使用 @classmethod 来装饰。

setUp() 和 setUpClass() 通常用来进行**测试前的准备工作**。例如，访问数据库获得测试用例需要的数据等。

- tearDown()

tearDown()方法在每一个测试用例执行后**都会**执行。

- tearDownClass()

tearDownClass()方法仅在整个测试类结束执行后执行.tearDownClass()方法必须使用 @classmethod 来装饰。

tearDown() 和 tearDownClass() 通常用来进行**测试后的清理**工作。例如，测试结束后删除测试产生的数据，将被测试系统恢复至之前的状态等。

我们在 Pycharm 里或者命令行里运行上述文件，得到结果如下：

```bash
整个测试类只执行一次 -- Start
每个测试开始前执行一次
每个测试结束后执行一次
每个测试开始前执行一次
每个测试结束后执行一次
整个测试类只执行一次 -- End
```

由此可见，test fixture 被正确执行了。

#### 3.运行指定文件夹下的测试用例

在真实工作中，我们常常需要仅运行某一个测试类，或者某一个文件夹下的测试用例。此时，可以利用 unittest 的 main 函数来指定 module 运行。

> 模块（module）是为了编写可维护的代码，而把函数分组放到不同文件里的行为。在 Python 中，一个 .py文件 就是一个模块，一个模块可以包括一个或多个功能，模块有可以被一个或多个其他模块引用。

先来看下 unittest.main 的语法。

```python
unittest.main(module='__main__', defaultTest=None, argv=None, testRunner=None, testLoader=unittest.defaultTestLoader, exit=True, verbosity=1, failfast=None, catchbreak=None, buffer=None, warnings=None
```

其各个参数的含义如下：

- module：指定待运行的 module，默认是“main”；

- defaultTest：单个测试的名字或者多个测试名字的组合（必须要 iterable）；

- argv：传递给程序的一组变量，如果没有指定，那么系统默认使用 sys.argv；

- testRunner：指定 unittest 的 test runner，可以是 test runner 类本身或者 test runner 类实例。默认情况下，main 函数会调用 sys.exit()，并且会在屏幕上显示测试运行错误或者成功的提示；

- testLoader：必须是 TestLoader 类实例，默认是 [defaultTestLoader](https://docs.python.org/3.4/library/unittest.html#unittest.defaultTestLoader)；

- exit：默认是 True，即测试运行完调用 sys.exit()，在交互模式下使用时可指定为 False；

- verbosity：用于控制显示在 console 里的 log 等级，有 0、1、 2 三种，一般默认为等级 1，其中等级 2 显示的 log 最详细。

下面来看一个 discover 的例子, 假设我们的项目结构如下：

```bash
|--lagouTest
    |--tests
        |--test_to_run.py
        |--itesting_test.py
        |--__init__.py
    |--main.py
    |--__init__.py
```

其中，test_to_run.py 文件里的内容如下：

```python
# test_to_run.py
# coding=utf-8

import unittest

class TestToRun(unittest.TestCase):
    def setUp(self):
        pass
        # 这里写setUp的方法，通常是打开浏览器


    def testAssertNotEqual(self):
        self.assertEqual(1, 2)
        # 这里写具体的search方法


    def testAssertEqual(self):
        print(1)
        self.assertEqual(1, 1)
        # 这里写具体的search方法


    def tearDown(self):
        pass
        # tearDown方法，测试后的清理工具，比如对测试产生的数据进
```

itesting_test.py 文件里的内容如下：

```python
#itesting_test.py
# coding=utf-8


import unittest


# 测试类必须要继承TestCase类
class ITestingTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        print('整个测试类只执行一次 -- Start')


    def setUp(self):
        print('每个测试开始前执行一次')


    # 测试用例默认以test开头
    def equal_test(self):
        self.assertEqual(1, 1)


    def test_not_equal(self):
        self.assertNotEqual(1, 0)


    def tearDown(self):
        print('每个测试结束后执行一次')


    @classmethod
    def tearDownClass(cls):
        print('整个测试类只执行一次 --')
```

main.py 的内容如下：

```python
# coding=utf-8

import importlib.util
import os
import unittest


# 解析tests文件夹，并且返回module的字符串列表
def get_module_name_string(file_dir):
    return_list = []
    for root, dirs, file in os.walk(file_dir):
        for i in file:
            if not (i.endswith('__init__.py') or i.endswith('.pyc')) and i.startswith('test'):
                f = os.path.join(root, i)
                // 以下为Windows用法，如Mac系统，需要改成：
                //mod = 'tests.' + f.split('tests')[1].replace('.py', // '').replace('/', '')
                mod = 'tests.' + f.split('\\tests\\')[1].replace('.py', '').replace('\\', '.')
                return_list.append(mod)
    return return_list


if __name__ == "__main__":
    # 定义suites

    suites = unittest.TestSuite()

    # 获取所有的module的string，类似`
package.mod的方式
    mod_string_list = (get_module_name_string(os.path.join(os.path.dirname(__file__), 'tests')))
    # 遍历每个mod string，import并且把它加入test case中来
    for mod_string in mod_string_list:
        m = importlib.import_module(mod_string)
        test_case = unittest.TestLoader().loadTestsFromModule(m)
        suites.addTests(test_case)
    # 指定runner为TextTestRunner
    runner = unittest.TextTestRunner(verbosity=2)
    # 运行suites
    runner.run(suites)
```

在 Pycharm 或者命令行里运行 main.py，看下运行结果：

```bash
java
testAssertEqual (tests.tests_to_run.TestToRun) ... ok
testAssertNotEqual (tests.tests_to_run.TestToRun) ... ok
----------------------------------------------------------------------
Ran 2 tests in 0.000s
OK
```

可以看到，os.path.join(os.path.dirname(-file-), 'tests') 这个命令获取了 tests 这个文件夹的路径，然后我通过 get_module_name_string 这个方法，把 tests 文件夹下的所有 module 的string 获取出来（放到 mod_string_list 中去），接着我遍历每一个获取的 module string，把它导入并加入到 unittest 的 suites 中去，最后我指定了 runner 并且运行。

如果你仔细观察测试结果，你会发现仅仅 test_to_run 这个文件夹下面的测试用例被执行了，而 itesting_tests.py下面的测试用例都没有被运行。

这是为什么呢？注意函数 get_module_name_string（）中，我定义了仅会查找所有以“test”开头的 .py 文件。因为 itesting_tests.py 是以“itesting”开头的并不是以“test”开头的，所以它被排除在外了。

#### 4.动态查找测试用例运行

除去直接使用 unittest.main 方式加载 module 运行外，unittest 还支持通过 TestLoader 下的 discover 方法去查找测试用例。

语法如下：

```python
unittest.TestLoader.discover(start_dir, pattern='test*.py', top_level_dir=None)
unittest 允许你从某个文件夹开始，递归查找所有符合筛选条件的测试用例，并且返回一个包含这些测试用例的 TestSuite 对象，unittest.TestLoader.discover 支持的参数如下：
```

- **start_dir**：起始文件夹的路径；

- **pattern（匹配模式）**：默认搜索所有以“test”开头的测试文件，并把这些文件里的以“test”开头的测试用例挑选出来；

- **top_level_dir（根目录）**：测试模块必须从根目录导入，如果 start_dir 的位置不是根目录，那么必须显式指定 top_level_dir。

仍然以上面的测试项目为例：

```bash
|--lagouTest
    |--tests
        |--test_to_run.py
        |--itesting_test.py
        |--__init__.py
    |--main.py
    |--__init__.py
```

其他文件内容不变，把 main.py 文件用 discover 的方式改写如下：

```python
# coding=utf-8
import os
import unittest
if __name__ == "__main__":
    loader = unittest.defaultTestLoader
    #生成测试用suite
    suite = loader.discover(os.path.join(os.path.dirname(__file__), 'tests'), top_level_dir=os.path.dirname(__file__))
    #指定runner为TextTestRunner
    runner = unittest.TextTestRunner(verbosity=2)
    #运行suite
    runner.run(suite)
```

运行后发现结果跟用 unittest.main 的方式一致。

#### 5.按需组装测试用例

从以上的例子里，你发现没有？ 如果测试运行，那么一个测试类下面的所有以 test 开头的测试方法都会被执行，那有没有让我只执行指定的测试用例的方法呢？

在 unittest 中，testSuite 的组装，可以用上述的方式直接 discover，也可以用 unittest.TestSuite.addTest() 方式来添加测试用例到 TestSuite。

仍然以上述的项目为例：

```bash
|--lagouTest
    |--tests
        |--test_to_run.py
        |--itesting_test.py
        |--__init__.py
    |--main.py
    |--__init__.py
```

其他文件不变，我们把 main.py 更改成如下:

```python
# coding=utf-8
import unittest
# 这里导入TestToRun这个测试类
from tests.tests_to_run import TestToRun
from tests.itesting_test import ITestingTest
if __name__ == "__main__":
    #定义一个测试用例集
    suite = unittest.TestSuite(v)
    #把导入进来的TestToRun这个测试类下面的测试方法加入测试用例
    suite.addTest(TestToRun('testAssertNotEqual'))
    suite.addTest(ITestingTest('test_not_equal'))

    # 指定runner为TextTestRunner
    runner = unittest.TextTestRunner(verbosity=2)
    # 运行测试
    runner.run(suite)
```

在 Pycharm 或者命令行里运行 main.py，结果如下：

```bash
整个测试类只执行一次 -- Start
每个测试开始前执行一次
每个测试结束后执行一次
整个测试类只执行一次 -- End
testAssertNotEqual (tests.tests_to_run.TestToRun) ... ok
test_not_equal (tests.itesting_test.ITestingTest) ... ok
----------------------------------------------------------------------
Ran 2 tests in 0.000s
OK
```

你可以看到，在本次的测试中，我们分别挑选了 TestToRun 这个测试类下的“testAssertNotEqua”方法，和 ITestingTest 下面的“test_not_equal”方法，并且把它们组装到一个 TestSuite 里运行。

通过 suit.addTest() 的方式，就可以按照需要实现把不同文件下的测试用例组装到同一个 suite 执行的操作。

#### 6.破除默认 pattern，随心所欲命名测试文件

在以上的举例中，除去按需组装测试用例，其他例子中，itesting_test.py 文件下的测试用例都没有被执行，其原因就是 unittest 有默认的查找 pattern 如下：

- 查找测试文件，默认查找“test*.py”；
- 查找测试用例，默认查找“test*”。

我们可以通过更改查找 pattern 的方式来执行所有的测试用例，仍以上述项目为例：

```bash
|--lagouTest
    |--tests
        |--test_to_run.py
        |--itesting_test.py
        |--__init__.py
    |--main.py
    |--__init__.py
```

其他文件不变，更改 main.py 为：

```python
# coding=utf-8
import os
import unittest
if __name__ == "__main__":
    suite = unittest.defaultTestLoader.discover(os.path.join(os.path.dirname(__file__), "tests"), \
                                                pattern='*.py', top_level_dir=os.path.dirname(__file__))
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(suite)
```

运行后查看结果，如下：

```python
test_not_equal (tests.itesting_test.ITestingTest) ... ok
testAssertEqual (tests.tests_to_run.TestToRun) ... ok
testAssertNotEqual (tests.tests_to_run.TestToRun) ... ok
----------------------------------------------------------------------
Ran 3 tests in 0.000s
OK
整个测试类只执行一次 -- Start
每个测试开始前执行一次
每个测试结束后执行一次
整个测试类只执行一次 -- End
1
Process finished with exit code 0
```

我们把默认的 pattern 更改为”*.py“，这样任何在 tests 文件夹下的 py 文件都可以被查找到。可以看到 itesting_test.py 下的测试用例运行了一个方法，即“test_not_equal”，但是“equal_test”这个方法没有运行，那是因为方法“testMethodPrefix”在起作用。

我们来更改下测试方法的默认查找方式， 更改 main.py 为如下：

```python
# coding=utf-8
import os
import unittest
if __name__ == "__main__":
    loader = unittest.defaultTestLoader
    # 设置仅运行以equal开头的测试用例
    loader.testMethodPrefix = 'equal'
    suite = loader.discover(start_dir=os.path.join(os.path.dirname(__file__), "tests"), pattern='*.py', top_level_dir=os.path.dirname(__file__))
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(suite)
```

运行结果如下：

```bash
整个测试类只执行一次 -- Start
每个测试开始前执行一次
每个测试结束后执行一次
整个测试类只执行一次 -- End
equal_test (tests.itesting_test.ITestingTest) ... ok
----------------------------------------------------------------------
Ran 1 test in 0.000s
OK
```

可以发现，“testMethodPrefix”改变了 python 查找测试用例的默认方式。

在这里给你留一个课后作业：Python 3.7 及以后的版本，TestLoader 多了一个属性 testNamePatterns，可以用于设置测试用例的 pattern，你可以课后尝试一下，看看结果有什么不同？

#### 7.忽略测试用例执行

unittest 还支持忽略执行某些测试用例，只要在要忽略的测试用例上加上如下装饰器即可：

- `@unittest.skip()` 执行时直接忽略掉被装饰的测试用例；
- `@unittest.skipIf()` 如果 skipIf 里的条件成立，执行时直接忽略掉被装饰的测试用例；
- `@unittest.skipUnless()` 永久在执行时忽略被装饰的测试用例，除非 skipUnless 里的条件成立；
- `@unittest.expectedFailure` 期望被装饰的测试用例是失败的，如果是失败的，则此条测试用例将被标记为测试通过。

下面来通过一组测试来显示如何忽略测试用例执行：

```python
# coding=utf-8

import unittest
flag = False

# 测试类必须要继承TestCase类
class ITestingTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        print('整个测试类只执行一次 -- Start')
    def setUp(self):
        print('每个测试开始前执行一次')
    @unittest.skip('没有任何原因，忽略运行')
    def equal_test(self):
        self.assertEqual(1, 1)
    @unittest.skipIf(flag == True, "flag为True则skip")
    def test_not_equal(self):
        self.assertNotEqual(1, 0)
    @unittest.skipUnless(flag == True, "flag为False则skip")
    def test_not_equal1(self):
        self.assertNotEqual(1, 0)
    @unittest.expectedFailure
    def test_not_equal2(self):
        self.assertNotEqual(1, 0)
    def tearDown(self):
        print('每个测试结束后执行一次')
    @classmethod
    def tearDownClass(cls):
        print('整个测试类只执行一次 -- End')

if __name__ == '__main__':
    flag = False
    unittest.main(verbosity=2)
```

运行后结果如下：

```python
test_not_equal (__main__.ITestingTest) ... ok
test_not_equal1 (__main__.ITestingTest) ... skipped 'flag为False则skip'
test_not_equal2 (__main__.ITestingTest) ... unexpected success
----------------------------------------------------------------------
Ran 3 tests in 0.000s
FAILED (skipped=1, unexpected successes=1)
整个测试类只执行一次 -- Start
每个测试开始前执行一次
每个测试结束后执行一次
每个测试开始前执行一次
每个测试结束后执行一次
整个测试类只执行一次 -- End
Process finished with exit code 1
```

### 使用 unittest 框架创建测试的步骤

使用 unittest 框架创建测试的步骤如下：

- 编写一个测试类，这个测试类必须继承 TestCase 这个基类， 测试类所对应的 .py 文件默认要以 test 开头；

- 在这个测试类下面写你的测试方法，每个测试方法应该包括一个测试的完整步骤，测试方法要默认以 test 开头；

- 通过 unittest.main()、runner.run() 或者 python -m 的方式来调用这些测试用例。

熟悉了 unittest 框架后，下一课时我将带你正式搭建 Web 测试框架。

## 你的第一个 Web 测试框架（二）

### 实践出真知——创建 Web 测试框架雏形

Web 自动化测试，由于其对应于测试金字塔的 UI 层，所以也常被称为 UI 自动化测试，指的是使用代码模拟真实用户视角，以自动化的方式去执行业务操作，以及进行操作后的检查这样一个过程。

既然是 Web 自动化测试，必然要依托浏览器执行。当前在 Web 自动化测试领域，Selenium/WebDriver 仍然是市场占有率最高的的一款 UI 自动化工具，所以本节课我们就采用 Selenium/WebDriver 来作为我们 Web 自动化测试框架中与浏览器打交道的工具。

而 unittest 框架是一个相对完整的框架，可以应对测试用例/测试用例集的生成、测试用例的执行、测试执行后的清理及测试报告，所以如下图所示，两者结合我们就有了 Web 自动化测试框架的雏形：

![2][2]

下面我们按照前面提及的“使用 unittest 框架创建测试用例的步骤”把这个框架创建起来。

1.首先，我们先给定项目的文件结构：

```bash
|--lagouTest
    |--tests
        |--test_baidu.py
        |--__init__.py
    |--main.py
    |--__init__.py
```

2.测试类 test_baidu.py 的内容如下：

```python
# coding=utf-8
from selenium import webdriver
import unittest
import time

class Baidu(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(30)
        self.base_url = "http://www.baidu.com/"
    def test_baidu_search(self):
        driver = self.driver
        driver.get(self.base_url + "/")
        driver.find_element_by_id("kw").send_keys("iTesting")
        driver.find_element_by_id("su").click()
        time.sleep(2)
        search_results = driver.find_element_by_xpath('//*[@id="1"]/h3/a').get_attribute('innerHTML')
        self.assertEqual('iTesting' in search_results, True)
    @unittest.skip('i want to skip')
    def test_baidu_set(self):
        driver = self.driver
        driver.get(self.base_url + "/gaoji/preferences.html")
        m = driver.find_element_by_xpath(".//*[@id='nr']")
        m.find_element_by_xpath("//option[@value='10']").click()
    def tearDown(self):
        self.driver.quit()

if __name__ == "__main__":
    unittest.main(verbosity=2)
```

需要注意的是，要想正确运行 Selenium，需要安装相应的依赖，包括 Selenium 和对应的 WebDriver，我以 Win10 下运行 Chrome 为例：

```bash
# 1.安装Selenium，假设lagouTest项目在D盘的_Automation文件夹下
# D:\_Automation\lagouTest>pip install selenium
# 2. 安装Chrome Driver
# 从如下地址选择跟你浏览器版本一致的chrome Driver下载：
# http://npm.taobao.org/mirrors/chromedriver
# 并将解压后的chromedriver.exe放到python安装目录下的scripts文件夹下。
# Win10下默认路径为用户目录下的AppData：
# C:\Users\Admin\AppData\Local\Programs\Python\Python38-32\Scripts
# 3.进入环境配置，编辑系统变量里path变量，在最后面加上Chrome的安装路径：
# C:\Program Files\Google\Chrome\Application
```

“Baidu”这个测试类我写得非常不优雅，项目配置、元素定位、测试数据全部耦合在一块儿，现在先不去管它，我会在后面的课时慢慢优化它，带你认识框架设计的全过程。

3.main.py 的内容如下：

```python
# coding=utf-8

import os
import unittest

if __name__ == "__main__":
    suite = unittest.defaultTestLoader.discover(os.path.join(os.path.dirname(__file__), "tests"),pattern='*.py',top_level_dir=os.path.dirname(__file__))
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(suite)
```

4.运行 main.py，我们将看到如下结果：

```bash
test_baidu_search (tests.test_baidu.Baidu) ... ok
test_baidu_set (tests.test_baidu.Baidu) ... skipped 'i want to skip'

----------------------------------------------------------------------
Ran 2 tests in 8.564s

OK (skipped=1)
```

可以看到这个测试运行成功了。 假设我们需要运行更多的测试用例怎么办？仅仅需要在 tests 文件夹下添加相应的测试类就好了。这样，一个基于 unittest 的 Web 端测试框架的雏形就搭建成功了，是不是非常简单？

### 实践出真知——优化 Web 测试框架

现在我们的框架虽然可以测试了，但有一个问题：测试报告直接打印在 Console 里，不利于我们查看测试运行的历史。那么能不能把测试报告给持久化呢？我们来看一下解决方案。

#### 1. 直接存储测试运行结果报告
  
新添加一个测试报告处理文件 txtReport.py

```bash
|--lagouTest
    |--tests
        |--test_baidu.py
        |--__init__.py
    |--main.py
    |--__init__.py
    |--txtReport.py
```

其中，txtReport.py 的内容如下：

```python
__author__ = 'iTesting'
# -*-coding=utf-8 -*-
import os
import re
import time

class Test(object):
    def __init__(self):
        self.test_base = os.path.dirname(__file__)
        # 获取tests文件夹所在路径
        self.test_dir = os.path.join(self.test_base, 'tests')
        # 列出所有待测试文件
        self.test_list = os.listdir(self.test_dir)
        # 定义正则匹配规则，过滤__init__.py和 *.pyc文件
        self.pattern = re.compile(r'(__init__.py|.*.pyc)')
         # 测试结果写文件
        if not os.path.exists(os.path.join(self.test_base,"log.txt")):
            f = open(os.path.join(self.test_base,"log.txt"),'a')
        else:
            f = open(os.path.join(self.test_base,"log.txt"),'w')
            f.flush()
        f.close()
    # 运行符合要求的测试文件并写入log.txt
    def run_test(self):
        for py_file in self.test_list:
            match = self.pattern.match(py_file)
            if not match:
                os.system('python %s 1>>%s 2>&1' %(os.path.join(self.test_dir,py_file),os.path.join(self.test_base,"log.txt")))

if __name__ == "__main__":
    test = Test()
    test.run_test()
```

在 Pycharm 或者命令行里执行这个文件，你会发现测试被运行且运行报告 log.txt 生成在根目录下。
但是你会发现，这个报告还不够好，仅仅是把 Console 里的内容重定向到文件里罢了。正常情况下，我们的测试报告都是比较美观的，比如说 HTML 格式。

#### 2. 使用测试报告模块生成测试报告

常用的测试报告模块有 HTMLTestRunner 和 allure。下面我以 HTMLTestRunner 为例，来演示下如何生成测试报告。而如何使用 allure 生成测试报告，我们放在下节 “09 | 你的第一个 API 测试框架” 讲。

首先，我们更改下项目结构，创建一个生成测试报告的文件 html_reporter.py。更新后的项目结构如下：

```bash
|--lagouTest
    |--tests
        |--test_baidu.py
        |--__init__.py
    |--common
        |--html_reporter.py
        |--__init__.py
    |--HTMLTestRunner.py
    |--main.py
    |--__init__.py
    |--txtReport.py
```

html_reporter.py 中的内容如下：

```python
__author__ = 'iTesting'
import os
import time
import HTMLTestRunner

class GenerateReport():
    def __init__(self):
        now = time.strftime('%Y-%m-%d-%H_%M', time.localtime(time.time()))
        self.report_name = "test_report_" + now + ".html"
        self.test_base = os.path.dirname(os.path.dirname(__file__))
        if os.path.exists(os.path.join(self.test_base, self.report_name)):
            os.remove(os.path.join(self.test_base, self.report_name))
        fp = open(os.path.join(self.test_base, self.report_name), "a")
        fp.close()
    def generate_report(self, test_suites):
        fp = open(os.path.join(self.test_base, self.report_name), "a")
        runner = HTMLTestRunner.HTMLTestRunner(stream=fp, title="Test_Report_iTesting",
                                               description="Below report show the results of auto run")
        runner.run(test_suites)
```

GenerateReport 类有一个构造函数类 init.py，里面实现了 test 文件的建立。另外定义了一个 generate_report 的类方法，来运行并生成测试报告。

可以看到，在 html_reporter.py 中，我导入了 HTMLTestRunner，那么 HTMLTestRunner 模块是如何导入呢？一般情况下通过[tungwaiyip.info](http://tungwaiyip.info/software/HTMLTestRunner.html)下载即可。

最后，我们需要改动下 main.py 的内容，使之应用 HTMLTestRunner 这个测试报告。更改后 main.py 的内容如下：

```python
__author__ = 'iTesting'
import unittest,os
from common.html_reporter import GenerateReport

if __name__ == "__main__":
    suite = unittest.defaultTestLoader.discover(os.path.join(os.path.dirname(__file__),"tests"),\
                                                pattern='*.py',top_level_dir=os.path.dirname(__file__))
    html_report = GenerateReport()
    html_report.generate_report(suite)
```

运行 main.py 文件，你将看到一个 html 格式的测试报告文件被生成了。

至此，我们的第一个 Web 自动化测试框架就优化得差不多了，但是请再次查看 test_baidu.py 这个文件，我们以这个文件里 test_baidu_search 这个类方法为例：

```python
def test_baidu_search(self):
    driver = self.driver
    driver.get(self.base_url + "/")
    driver.find_element_by_id("kw").send_keys("iTesting")
    driver.find_element_by_id("su").click()
    time.sleep(2)
    search_results = driver.find_element_by_xpath('//*[@id="1"]/h3/a').get_attribute('innerHTML')
    self.assertEqual('iTesting' in search_results, True)
```

看看这个方法有哪些弊端：

- 如果我元素定位改变了（对应例子里是“kw”改变），那么我是不是只能在这个代码文件里改啊？ 如果我有多个地方引用，我是不是就要改多遍呢？

- 看这个方法，元素定位、元素操作都是耦合在一起的，我是不是无法一眼就知道你在做什么操作啊？

- 如果我有别的测试要重用你这个方法怎么办？

> 这个就必须用到 Page Object 了，后面会讲。

## 你的第一个 API 测试框架（一）

首先我们看下 API 测试框架和 Web 测试框架的区别。

两者唯一的区别在于测试请求的方式不同，Web 自动化测试框架是通过操作浏览器对目标对象进行操作的，而 API 测试框架通常是通过直接请求 HTTP 接口来完成的，特别是随着近几年微服务技术的普及，RESTFUL 风格的 HTTP 接口调用越来越多。

那么 HTTP 形式的 API， 有哪几种请求方式呢？

```bash
GET
GET 方法请求一个指定资源的表示形式，使用 GET 的请求应该只被用于获取数据。
HEAD
HEAD 方法请求一个与 GET 请求的响应相同的响应，但没有响应体。
POST
POST 方法用于将实体提交到指定的资源，通常导致在服务器上的状态变化或副作用。
PUT
PUT 方法用请求有效载荷替换目标资源的所有当前表示。
DELETE
DELETE 方法删除指定的资源。
CONNECT
CONNECT 方法建立一个到由目标资源标识的服务器的隧道。
OPTIONS
OPTIONS 方法用于描述目标资源的通信选项。
TRACE
TRACE 方法沿着到目标资源的路径执行一个消息环回测试。
PATCH
PATCH 方法用于对资源应用部分修改。
```

一般情况下，在测试中使用最多的请求方式是 GET、POST、PUT、DELETE 这四种。并且如果是通过代码方式发送请求，在 Python 里我们最经常用的就是 Requests 库。

如果我们要使用 Requests 库作为发送接口请求的命令，我们就必须了解下 Requests 是什么，以及具体怎么用。

### Requests

那什么是 Request 呢？Requests 官方说它是一个简单而优雅的 HTTP 库。

#### 1.Requests 安装

Requests 的安装非常简单，只要在命令行里输入如下命令即可：

```python
$ python -m pip install requests
```

#### 2.Requests 使用

Requests 的使用也非常简单，下面我们就来看下。

- **发送 get 请求**

```python
import requests
if __name__ == '__main__':
    # 发送get请求
    requests.get('https://httpbin.org/ip')
```

是不是非常简单？但在实际应用中，GET 接口请求常常要带参数 query string，而且有时候需要加 Header，鉴权（OAuth）甚至代理（Proxy），那么这部分接口请求如何发送呢？

```python
import requests

if __name__ == '__main__':
    # 发送get请求 --带参数
    # 等同于直接访问https://httpbin.org/get?kevin=hello
    requests.get('https://httpbin.org/get', params={'kevin': 'hello'})

    # 当访问接口发生301跳转时，可以设置允许或者禁止跳转
    requests.get('http://github.com/', allow_redirects=False)

    # 发送get请求， 加proxy
    proxies = {'http': 'http://10.10.1.10:3128',
               'https': 'http://10.10.1.10:1080'}
    requests.get('https://httpbin.org/get', proxies=proxies)

    # 发送get请求，加鉴权 -- Basic Auth
    # 首先导入HTTPBasicAuth，一般导入语句写在py文件的最前面。
    from requests.auth import HTTPBasicAuth
    requests.get('https://api.github.com/user', auth=HTTPBasicAuth('user', 'password'))

    # 发送get请求，加鉴权 -- Digest Auth
    # 首先导入HTTPDigestAuth，一般导入语句写在py文件的最前面。
    from requests.auth import HTTPDigestAuth
    requests.get('https://api.github.com/user', auth=HTTPDigestAuth('user', 'password'))

    # OAuth 1 Authentication
    # 首先安装requests_oauthlib （可通过pip install）
    from requests_oauthlib import OAuth1
    url = 'https://api.twitter.com/1.1/account/verify_credentials.json'
    auth = OAuth1('YOUR_APP_KEY', 'YOUR_APP_SECRET', 'USER_OAUTH_TOKEN', 'USER_OAUTH_TOKEN_SECRET')
    requests.get(url, auth=auth)
```

以上是不同情况下的 get 请求，在测试中可以根据实际需求选择具体使用哪种方式。

- **发送 post 请求**

post 请求通常都会带数据 Payloads，当然也会需要 Header、OAuth，发送方式如下：

```python
import requests

if __name__ == '__main__':
    url = 'https://httpbin.org/anything'
    headers = {'user-agent': 'my-app/  0.0.1'}
    payloads = {'iTesting': 'better to follow'}
    auth = {"username":"iTesting", "password": "Kevin"}

    # 直接post
    r = requests.post(url, data=payloads)
    # post带header
    r = requests.post(url, headers=headers, data=payloads)

    # post带鉴权, auth类型跟get请求支持的auth类型相同。
    r = requests.post(url, headers=headers, data=payloads， auth=HTTPBasicAuth('user', 'password'))
```

- **发送 put 请求**

```python
import requests

if __name__ == '__main__':
    # 直接发送put请求 
    # 如需要加header，auth，即参考post请求
    r = requests.put('https://httpbin.org/put', data={'hello': 'iTesting'})
    print(r.text)
```

- **发送 delete 请求**

```python
import requests

if __name__ == '__main__':
    # 直接发送delete请求
    r = requests.delete('https://httpbin.org/anything', data={'hello': 'iTesting'})
    print(r.text)
```

#### 3.获取接口返回值

接口的请求通常会有返回值，在接口测试中，特别是在顺序访问多个接口，并且前一个接口的返回是后一个接口的入参时，常常需要把接口返回的结果保持下来解析，那么如何保持接口请求呢？

Requests 中提供了以下方式来保存接口返回值：

```python
# -*- coding: utf-8 -*-
import requests
if __name__ == "__main__":
    s = requests.session()
    r = s.post('https://httpbin.org/anything', data={'hello': 'kevin'})
    # 返回文本型response
    print(r.text)
    # #返回文本型response，并用utf-8格式编码
    # # 当你用r.text得出的结果是不可读的内容例如包括类似xu'\xe1'或者有错误提示“'ascii' codec can't encode characters in position”时，可以用encode
    print(r.text.encode('utf-8'))
    # # 获取二进制返回值
    print(r.content)
    # # 获取请求返回码
    print(r.status_code)
    # 获取response的headers
    print(r.headers)
    # 获取请求返回的cookies
    s.get('http://google.com')
    print(request.cookies.get_dict())
```

获取接口返回值后，如果你的前一个接口的返回是下一个接口的入参，那么就可以根据需要采用以上方式的任意一个解析出你需要的返回值，然后传递给下一个接口即可。

#### 4.Requests 保存 Session

以上 4 种 Requests 使用方式是直接发送接口请求，我们知道 HTTP 协议是无状态的协议，这也就导致每次接口请求都是独立的，也就意味着你的多个接口请求之间不能共用数据，比如登录态、cookie 等都是不能共用，这显然不符合我们的需求。

基于此，Requests 库提供了 Session 会话对象， 用来帮我们跨请求保持参数，使用 requests.Session() , 可以在一个 Session 实例的所有请求中保留 cookie，下面我们来看下 requests.Session() 的基本用法：

```python
import requests
if __name__ == '__main__':
    # 初始化一个session对象
    s = requests.Session()

    # 第一个get，先设置一个session
    # httpbin这个网站允许我们通过如下方式设置，在set后写你需要的值即可
 s.get('https://httpbin.org/cookies/set/sessioncookie/iTestingIsGood')
 
    # 设置好后获取所有的cookies
    r = s.get('https://httpbin.org/cookies')

    # 打印，确定我们的cookies被保存了 
    print(r.text)
    # 结果如下
    # '{"cookies": {"sessioncookie": "iTestingIsGood"}}'
```

requests.Session() 的使用非常简单，首先你初始化一个 session 对象，接着你使用这个初始化后对象实例直接发起请求，在整个 session 内的所有请求之间是可以共享状态的。上个例子中我们就先初始化了 Session() 对象，假设是 s，然后通过 s.get() 方法去设置了一个 cookie，它的名字是 sessioncookie，它的值是 itestingIsGood。最后，我们去访问 cookies 接口，就拿到了我们刚设置的 cookie。通过 requests.Session() 的方式，我们就实现了 cookie 的保持。

现在，我们更改一下运行方式，注释掉 9 行语句设置 sessioncookie 的那条语句， 再次运行结果如下：

```json
{
  "cookies": {}
}
```

你会发现，本次运行并没有拿到任何 cookie，由此可见，正是由于 requests.Session() ，cookie 才在两次请求中保持了。

一般在测试中，你可以通过直接请求登录接口便能拿到登录态，例如如下的形态：

```python
# 本代码仅供演示用法
import requests

if __name__ == '__main__':
    s = requests.Session()
    # 登录获取登录态
    s.post(login_url, data=data, headers=headers, verify = False)
    # 登录态获取后，请求登录后才能访问的接口，也能请求成功。
    s.post（'your-api'）
```

为了更好地理解 requests.Session() 是如何保持登录态的，我们来看一个实际例子：

```python
import requests
if __name__ == '__main__':
    api = 'https://gate.lagou.com/v1/entry/message/newMessageList'
    s = requests.Session()
    r = s.get(api)
    print(r.text)
    # 结果如下：
    # {"state": 1003, "message": "非法的访问"}
```

在这个例子中，我直接访问拉勾教育的一个接口，这个接口是用来获取当前账户有没有新的 Message 的，但由于我没有登录，所以我访问的结果是返回“非法的访问”。那么我的登录态怎么获取呢？

因为我们无法得知 lagou教育生产环境上的登录接口，故我们采用另外一个办法绕过，我首先采用人工登录的方式，然后打开浏览器 console，去 Applicaton → Cookies下查看 cookies：

![3][3]

经过尝试，我们得出 lagou 网站用于保持登录态的两个 cookie 的 key 是 _gid 和 gate_login_token。由此，更改我们的代码如下：

```python
# -*- coding: utf-8 -*-
import requests
if __name__ == "__main__":
    url = 'https://gate.lagou.com/v1/entry/message/newMessageList'
    cookie = {'cookie': '_gid=GA1.2.438589688.1601450871; gate_login_token=475844a837230240e1e73e4ecfa34102e65fa8e5384801cca67bbe983a142abb;'}
    headers = {'x-l-req-header': '{deviceType: 9}'}
    s = requests.Session()
    # 直接带登录态发送请求
    r = s.get(url, cookies=cookie, headers=headers)
    # 不经过登录，也能访问登录后才能访问的接口
    print(r.text.encode('utf-8'))
    # {"state":1,"message":"成功","content":{"newMessageList":[],"newMessageCount":0}}
```

由此看出，通过在不同接口请求中传递维持登录态的 cookies，就可以实现登录态在多个接口中的传递。

### unittest 框架集成 Requests

至此，我们已经对如何使用 Requests 发送接口请求了然于胸了。现在我把它嵌入到我们上一节讲到的 unittest 框架中去：

![4][4]

我们文件结构不变，仅仅只把原来调用 Selenium/WebDriver 的地方换成 Requests 即可。

先来看下我们之前的框架文件结构：

```bash
|--lagouTest
    |--tests
        |--test_baidu.py
        |--__init__.py
    |--common
        |--html_reporter.py
        |--__init__.py
    |--HTMLTestRunner.py
    |--main.py
    |--__init__.py
    |--txtReport.py
```

其他文件不用更改，我们仅需要在 tests 文件夹下面新建一个测试接口的文件，例如 test_lagou.py，如此我们的文件结构就变成了如下：

```bash
|--lagouTest
    |--tests
        |--test_baidu.py
        |--test_lagou.py
        |--__init__.py
    |--common
        |--html_reporter.py
        |--__init__.py
    |--HTMLTestRunner.py
    |--main.py
    |--__init__.py
    |--txtReport.py
```

test_lagou.py 下的代码如下：

```python
# coding=utf-8
import json
import unittest
import requests

class TestLaGou(unittest.TestCase):
    def setUp(self):
        self.s = requests.Session()
        self.url = 'https://www.lagou.com'
    def test_visit_lagou(self):
        result = self.s.get(self.url)
        assert result.status_code == 200
        unittest.TestCase.assertIn(self, '拉勾', result.text)
    def test_get_new_message(self):
        # 此处需要一个方法登录获取登录的cookie，但因我们无法知道拉勾登录真实的API，故采用此方式登录
        message_url = 'https://gate.lagou.com/v1/entry/message/newMessageList'
        cookie = {
            'cookie': '_gid=GA1.2.438589688.1601450871; gate_login_token=475844a837230240e1e73e4ecfa34102e65fa8e5384801cca67bbe983a142abb;'}
        headers = {'x-l-req-header': '{deviceType: 9}'}
        # 直接带登录态发送请求
        result = self.s.get(message_url, cookies=cookie, headers=headers)
        assert result.status_code == 200
        assert json.loads(result.content)['message'] == '成功'
    def tearDown(self):
        self.s.close()

if __name__ == "__main__":
    unittest.main(verbosity=2)
```

在本文件里，我们定义了一个测试类 TestLaGou，然后在 setUp 方法里初始化了 requests.Session() 对象，接着定义了两个测试用例 test_visit_lagou 和 test_get_new_message，在这两个测试用例中，分别发送不同的接口请求并且断言，最后在测试结束后关闭了这个 Session 对象。

直接运行 main.py, 运行成功后，浏览器打开在项目根目录下生成的 test_report 文件。

可以看到 test_visit_lagou 和 test_get_new_message 这两条测试用例均运行成功了。

这个时候，我们再来看下，我们的测试框架变成了什么样子？

![5][5]

通过前面章节的学习，我们依托测试框架核心模块 unittest，快速搭建了我们的 Web 自动化测试框架、API 自动化测试框架，但我们在 unittest 的使用中，发现了如下缺点：

- 重复代码太多，比如 seUp(), tearDown() 每个测试类都需要。
- unittest 数据驱动支持不好，并且不明显， case 一多就容易乱。
- 有一定的学习成本，例如 unittest 里的 assertIn* 语法，便是 unittest 特有的。

学过测试框架设计原则的我们都知道， 一个好的框架必须做到避免重复代码。 那么测试框架核心模块，是不是只有 unittest 一个呢？有没有更好的测试框架核心模块来解决上述问题呢？

### pytest

pytest 是一个成熟、全套的 python 自动化测试工具，旨在帮助你写出更好的程序。它可以用来做单元测试，也可以用来做功能测试、接口自动化测试；相比 unittest，它能支持更多、更全面的功能，有着以下特色和优势。

直接使用纯粹的 python 语言， 不需要你过多学习框架特定的语法，例如 self.assert* 等，以此减少你的学习成本；

- pytest 框架不需要写诸如 setUp()、tearDown() 这样的方法，它可以直接开始测试；
- pytest 可以自动识别测试用例，无须像 unittest 一样将测试用例放进 TestSuite 里组装；
- test fixtures 包括数据参数化测试非常好用；
- pytest 支持错误重试；
- pytest 支持并发测试。

下面我们就一起看下，如何使用 pytest 来搭建我们的第一个接口测试框架？

俗话说“不积跬步，无以至千里”。在创建我们的第一个接口测试框架之前，我们先来看下 pytest的基础用法。

#### 1. pytest 安装

pytest 不是 python 标准库，故使用时需要安装：

```bash
pip install -U pytest
```

安装好后，你可以再 terminal 里查看它的版本：

```bash
pytest --version
# pytest 6.1.0
```

#### 2. pytest 简单使用

下面来看下，你的第一个 pytest 脚本怎么写：

```python
# iTesting.py
# coding=utf-8
import pytest

class TestSample(object):
    # 测试用例默认以test开头
    def test_equal(self):
        assert 1 == 1
    def test_not_equal(self):
        assert 1 != 0
```

在这个测试文件（iTesting.py）里，我定义了一个测试类 TestSample，然后在这个测试类下面定义了两个测试用例，分别是 test_equal 和 test_not_equal，下面来运行下这个测试类：

```bash
# 以在Windows下执行为例
# 假设我们的测试目录在D:\_Automation\lagouAPITest
D:\_Automation\lagouAPITest>python -m pytest iTesting.py
```

运行后，你会看到如下结果：

```bash
=== test session starts ====
platform win32 -- Python 3.8.5, pytest-6.1.0, py-1.9.0, pluggy-0.13.1
rootdir: D:\_Automation\lagouAPITest
collected 2 items

iTesting.py ..                                                                                                                               [100%]
=== 2 passed in 0.01s ====
```

是不是非常简单？而且在整个测试中，你只需要有 python 的原生语法基础知识就好了，不需要再额外地学习。

#### 3. pytest 直接运行 unittest 测试用例

不仅如此，pytest 还可以兼容 unittest，原来使用 unittest 框架写的代码，可以被 pytest 直接调用。

我们来看下如下 unittest 测试用例：

```python
# 文件名tests/test_sample.py
# coding=utf-8
import unittest

#测试类必须要继承TestCase类
class TestSample(unittest.TestCase):
    #测试用例默认以test开头
    def test_equal(self):
        self.assertEqual(1, 1)
    def test_not_equal(self):
        self.assertNotEqual(1, 0)

if __name__ == '__main__':
    unittest.main()
```

在运行时，我们可以直接用如下方式调用：

```bash
D:\_Automation\lagouTest>python -m pytest tests/test_sample.py
```

如果你想运行整个测试用例集，或者你想把之前用 unittest 的测试用例全部换成用 pytest 执行，该如何操作呢？

我们把 main.py 文件里，所有关于执行测试用例的部分，从 unittest 执行更改为 pytest 执行，更改后的 main.py 函数如下：

```python
# coding=utf-8
import pytest
import os
import glob
# 查找所有待执行的测试用例module
def find_modules_from_folder(folder):
    absolute_f = os.path.abspath(folder)
    md = glob.glob(os.path.join(absolute_f, "*.py"))
    return [f for f in md if os.path.isfile(f) and not f.endswith('__init__.py')]

if __name__ == "__main__":
    # 得出测试文件夹地址
    test_folder = os.path.join(os.path.dirname(__file__), 'tests')
    # 得出测试文件夹下的所有测试用例
    target_file = find_modules_from_folder(test_folder)
    # 直接运行所有的测试用例
    pytest.main([*target_file, '-v'])
```

然后在命令行下执行：

```bash
D:\_Automation\lagouTest>python main.py
```

你会发现，整个测试用例集用 pytest 开始执行了。

正因为 pytest 完全兼容 unittest，以及具备刚刚介绍的那些诸多优点，才使得 pytest 风靡于整个 python 社区。

#### 4. pytest 查找测试用例的原则

在我们介绍 pytest 的诸多使用方法之前，我先介绍下使用 pytest 查找测试用例的原则：

**指定命令行参数时的查找原则**

如果指定了命令行参数，则根据命令行参数执行。

这句话很好理解，像我们之前的测试里，均指定了测试要执行的 module（例如 “python -m pytest tests/test_sample.py”），故 pytest 只会查找 test_sample.py 文件。

**未指定命令行参数时的查找原则**

如果未指定命令行参数（即直接在命令行输入 pytest），则从 testpath（已配置）或从当前目录开始查找可用的测试用例， 其步骤如下：

- 搜索由任何符合以下规则的文件 test_*.py 或 *_test.py 文件。
- 找到后，从这些文件中，收集如下测试项：test 为前缀的函数；Test 为前缀的类里面的以 test 为前缀的函数。

我们举个例子来理解下这个原则， 假设我的项目结构如下：

![6][6]

注意：我有一个测试文件为 sample.py，里面包括两个测试用例，然后我 tests 文件夹下有两个 .py 文件共计 4 个测试用例，如果我在命令行里输入以下命令：

```bash
 D:\_Automation\lagouTest>pytest
```

你会发现运行结果如下：

![7][7]

仅仅有 4 个测试用例运行了，但不包括 sample.py 里的两个测试用例，这就是 pytest 默认查找在起作用，因为运行 pytest 时，我没有指定运行某个文件，所以 pytest 自动在当前目录下查找以“test_”开头或者以“_test” 结尾的 py 文件，显然sample.py 不符合这个规则，故被忽略了。

而我如果直接在命令行运行：

```bash
D:\_Automation\lagouTest>pytest sample.py
```

你将看到 sample.py 里的两个测试方法都被执行了（因为指定了运行文件）。

下面我们再一次更改，更改 sample.py 为 test_sample.py，然后把这个文件里的方法“test_equal”改成“equal_test”，于是项目文件结构如下：

![8][8]

在命令行运行：

```bash
D:\_Automation\lagouTest>pytest
```

你可以看到运行结果如下：

![9][9]

共有 5 个测试被执行，其中不包括 equal_test 方法，因为它不是以 test 开头。

### pytest 集成 Requests

知道了 pytest 如何使用，我们来看下，如何创建第一个 API 接口测试框架？

首先创建我们的项目文件结构：

```bash
|--lagouAPITest
    |--tests
        |--test_baidu.py
        |--test_lagou.py
        |--__init__.py
    |--common
        |--__init__.py
    |--__init__.py
```

其中：

各个__init__.py 文件都是空文件。

tests 文件夹下的 test_baidu.py 是我们在**“你的第一个 Web 测试框架”**里创建的，里面的内容我们保持不变，仍然以 unittest 作为测试框架的核心模块。

tests 文件夹下的另外一个文件 test_lagou.py 是我刚刚在**unittest 框架集成 Requests**这一小节建立的，当时我们是以 unittest 作为测试框架的核心驱动模块，现在我们把它更改为由 pytest 驱动。

更改后的 test_lagou.py 文件内容如下：

```python
# coding=utf-8
import json
import requests

class TestLaGou:
    # 在pytest里，针对一个类方法的setup为setup_method,
    # setup_method作用同unittest里的setUp()
    def setup_method(self, method):
        self.s = requests.Session()
        self.url = 'https://www.lagou.com'
    def test_visit_lagou(self):
        result = self.s.get(self.url)
        assert result.status_code == 200
        assert '拉勾' in result.text
    def test_get_new_message(self):
        # 此处需要一个方法登录获取登录的cookie
        message_url = 'https://gate.lagou.com/v1/entry/message/newMessageList'
        cookie = {
            'cookie': '_gid=GA1.2.438589688.1601450871; gate_login_token=475844a837230240e1e73e4ecfa34102e65fa8e5384801cca67bbe983a142abb;'}
        headers = {'x-l-req-header': '{deviceType: 9}'}
        # 直接带登录态发送请求
        result = self.s.get(message_url, cookies=cookie, headers=headers)
        assert result.status_code == 200
        assert json.loads(result.content)['message'] == '成功'
    # 在pytest里，针对一个类方法的teardown为teardown_method,
    # teardown_method作用同unittest里的dearDown()
    def teardown_method(self, method):
        self.s.close()
```

在命令行中运行整个测试用例集：

```bash
D:\_Automation\lagouAPITest>pytest -v
```

运行结果如下所示：

![10][10]

整个测试用例集的 4 条测试用例全部被 pytest 识别到并执行了（有一条 case 被人为 skip了）。由此可见，使用 pytest 集成 Requests 非常简单，我们甚至不需要定义 main.py 文件也可以运行所有的测试用例。

## 你的第一个 API 测试框架（二）

### 融会贯通 pytest 使用

#### 1. pytest 运行方式详解及其参数

pytest 有两个测试运行方式，命令行运行和 pytest.main() 运行。

- **命令行运行**

pytest 支持在命令行中以如下方式运行：

```bash
 python -m pytest [...]
```

- **pytest.main() 运行**

除了命令行运行方式外，pytest 还支持在程序中运行，在程序中运行的命令如下：

```python
pytest.main([...])
```

不管是使用命令行运行或者使用 pytest.main() 的方式运行，它们支持的参数都是一样的。**需要注意的是：pytest 的参数必须放在一个 list 或者 tuple 里。**

**pytest 参数**

pytest 支持特别多的参数，具体有哪些参数可以通过如下命令查看：

```bash
pytest --help
```

在这里，我列出我们在工作中常用的几个。

**-m: 用表达式指定多个标记名。**

pytest 提供了一个装饰器 @pytest.mark.xxx，用于标记测试并分组（xxx是你定义的分组名），以便你快速选中并运行，各个分组直接用 and、or 来分割。

**-v: 运行时输出更详细的用例执行信息**

不使用 -v 参数，运行时不会显示运行的具体测试用例名称；使用 -v 参数，会在 console 里打印出具体哪条测试用例被运行。

**-q: 类似 unittest 里的 verbosity，用来简化运行输出信息。**

使用 -q 运行测试用例，仅仅显示很简单的运行信息， 例如：

```bash
.s..   [100%]
3 passed, 1 skipped in 9.60s
```

**-k: 可以通过表达式运行指定的测试用例**

它是一种模糊匹配，用 and 或 or 区分各个关键字，匹配范围有文件名、类名、函数名。

**-x: 出现一条测试用例失败就退出测试。**

在调试时，这个功能非常有用。当出现测试失败时，停止运行后续的测试。

以上这些命令，我将把它们融合进日常工作场景，逐个向大家介绍。

#### 2.运行指定文件夹下的测试用例

pytest 支持更简单的方法实现指定文件夹运行：

```bash
# 执行所有当前文件夹及子文件夹下的所有测试用例
pytest .
# 执行跟当前文件夹同级的tests文件夹及子文件夹下的所有测试用例
pytest ../tests
```

除此之外，pytest 还允许你通过更复杂的方式来**挑选测试用例执行**。例如，我们可以通过 -m 或者 -k 的参数，把我们的测试用例限制在某一个文件夹下，这样就实现了仅允许指定文件夹下的测试用例。

> 关于 -m 和 -k 的使用，请看接下来我要讲的 “动态挑选测试用例运行 — 按 Tag” 及 “动态挑选测试用例运行 — 按名称” 这两个部分。

#### 3.选择测试用例执行

pytest 里选择测试用例执行有很多方法，可以按照测试文件夹、测试文件、测试类和测试方法四种。

- **按照测试文件夹执行**

在刚刚**“运行指定文件夹下的测试用例”**中已经详细说明，我不再赘述。

- **按照测试文件执行**

```bash
# 运行test_lagou.py下的所有的测试用例
pytest test_lagou.py
```

- **按照测试类执行**

按照测试类执行，必须以如下格式：

pytest 文件名 `.py::` 测试类，其中“::”是分隔符，用于分割测试 module 和测试类。

```bash
# 运行test_lagou.py文件下的，类名是TestLaGou下的所有测试用例
pytest test_lagou.py::TestLaGou
```

- **按照测试方法执行**

同样的测试方法执行，必须以如下格式：

pytest 文件名 .py:: 测试类 :: 测试方法，其中 “::” 是分隔符，用于分割测试 module、测试类，以及测试方法。

```bash
# 运行test_lagou.py文件下的，类名是TestLaGou下的，名字为test_get_new_message的测试用例 
pytest test_lagou.py::TestLaGou::test_get_new_message
```

- **不在命令行执行，在程序中执行**

以上选择测试用例执行的方法，可以不在命令行，而直接在测试程序里执行，其语法为
`pytest.main([模块.py::类::方法])`

#### 4.动态挑选测试用例运行 — 按 Tag

动态挑选测试用例一直是测试框架的刚需，在 pytest 里动态挑选测试用例需要借助两个步骤。

- **首先给测试用例打标签（mark），在 Class、method 上加上如下装饰器：**

```python
@pytest.mark.xxx
```

在运行时，命令行动态指定标签运行：

```bash
# 同时选中带有这两个标签的所有测试用例运行
pytest -m "mark1 and mark2"
# 选中带有mark1的测试用例，不运行mark2的测试用例
pytest -m "mark1 and not mark2" 
# 选中带有mark1或 mark2标签的所有测试用例
pytest -m "mark1 or mark2"
```

下面来实际演示下，仍然以我们的项目 lagouTest 为例，我们更改 tests 文件夹下的两个文件，
其中对 test_baidu.py 文件的修改如下：

```python
# test_baidu.py下更改
import pytest
# 在Baidu这个类上加标签baidu
@pytest.mark.baidu
class Baidu(unittest.TestCase):
# 以下代码皆不变
```

对 test_lagou.py 文件的修改如下：

```python
# test_lagou.py下更改
import pytest
# 在TestLaGou这个类上加标签lagou
@pytest.mark.lagou
class TestLaGou:
# 以下代码皆不变
```

我给这两个测试类分别加上了标签 baidu 和标签 lagou，现在我们按需运行下：

```bash
pytest -v -m "lagou and not baidu"
```

![11][11]

可以看到标记为 lagou 下面的 2 条测试用例都被执行了，但是 baidu 标签下的 2 条都没有被执行，在 Console 中显示 “2 deselected”。

同样地，我们还可以用以下命令，运行所有包含 lagou 和 baidu 标签的测试用例。

```bash
pytest -v -m "lagou and baidu"
```

请注意，不同标签之间的分割要使用and或者or关键字。

#### 5.动态挑选测试用例运行 — 按名称

pytest 中，动态挑选测试用例，除了打标签（mark）外，还有另外一种方式：

```bash
# -k 参数是按照文件名、类名、方法名来模糊匹配的
pytest -k xxxPattern
```

下面来详细演示下，我们的项目文件结构如下：

```bash
|--lagouAPITest
    |--tests
        |--test_baidu.py
        |--test_lagou.py
        |--__init__.py
    |--common
        |--__init__.py
    |--__init__.py
```

其中：

- test_baidu.py 里定义了一个测试类 Baidu， 这个测试类下有两个测试方法 test_baidu_search 和 test_baidu_set；

- test_lagou.py 中定义了一个测试类 TestLaGou，这个测试类下面有两个测试方法 test_visit_lagou 和 test_get_new_message。

在命令行中以如下方式运行。

- **按照文件名称全匹配：**

```bash
# 运行test_lagou.py下的所有的测试
pytest -k "test_lagou.py"
```

- **按照文件名字部分匹配：**

```bash
# 因为lagou能匹配上test_lagou.py,故运行test_lagou.py下所有的测试
pytest -k "lagou"
```

- **按照类名匹配：**

```bash
# 因为Baidu能匹配上test_baidu.py里定义的测试类Baidu,故运行Baidu测试类下所有的测试。 你也可以写成Bai
pytest -k "Baidu"
```

- **按照方法名匹配：**

```bash
# message只能匹配test_lagou.py中定义的测试类TestLaGou下的测试方法test_get_new_message， 故仅有test_get_new_message这个方法会执行
pytest -k "message"
```

#### 6.忽略测试用例执行

有挑选测试用例执行，那么就一定会有忽略测试用例执行，忽略测试用例执行有如下 3 种方式：

- **直接忽略测试执行**

直接忽略可以使用 `@pytest.mark.skip` 装饰器来实现。

```python
# test_lagou.py
@pytest.mark.skip(reason='skip此测试用例')
def test_get_new_message:
  # 实现方法
```

比如，在 test_lagou.py 里，我定义了一个测试方法 test_get_new_message，然后我给他加上装饰器 pytest.mark.skip，那么当我在命令行中执行如下语句时，test_get_new_message 将会被忽略执行：

```bash
pytest test_lagou.py
```

- **按条件忽略测试执行 — 使用 skipif 忽略**

按 skipif 条件，当条件符合时便会忽略某条测试用例执行。

```python
# test_lagou.py 
# 定义一个flag，用来指示是否要skip一个测试用例
flag = 1
 
# 此处判断flag的值，为1则忽略，0则不忽略 
@pytest.mark.skipif(flag == 1, reason='by condition')
def test_get_new_message:
  # 实现方法
```

当我在命令行中执行如下语句时，test_get_new_message 将会被忽略执行：

```bash
pytest test_lagou.py
```

更改 flag 的值为 0 ，再次运行这条语句，你将发现此方法将会被执行。

- **按条件忽略测试执行 — 使用 -m 或者 -k 忽略**

除了 skip 和 skipif 外，我们也可以通过 -m 或者 -k 的方式，把我们不需要运行的测试用例给过滤掉，从而实现测试用例的忽略执行。在刚刚的内容中便详细讲解了 -m 和 -k 的具体用法，你可详细回顾一下。

#### 7.setUp 和 tearDown 详解

在 unittest 中使用 setUp 和 tearDown 方法实现测试执行前的准备工作和测试执行后的清理工作。

其实在 pytest 里也有类似的方法，而且在粒度上更加精细。

**（1）按 module 进行 setup 和 tear down**

按 module 进行 setup 和 tear down，即在某一个 module 内 setup 或者 tear down 的方法只会执行一次，pytest 里用于 module 的 set up 和 tear down 方法为：

```python
import pytest
def setup_module(module):
    """
    module级别的setup，直接定义为一个module里的函数
    在本module里所有test执行之前，被调用一次
    """
    ## 你的set up代码，例如：
    print("------ set up for module ------")

def teardown_module(module):
  """
    module级别的setup，直接定义为一个module里的函数
    在本module里所有test执行之后，被调用一次
    """
    ## 你的tear down代码，例如：
    print("------ tead down for module ------")
```

需注意以下几个事情：

- setup_module(module) 和 teardown_module(module) 的写法最好不要改动；

- 当 setup_module 出错，teardown_module 不会被执行；

- 一个 module（.py 文件）可以包括多个 Class，多个classs 下可能有多个 case，但是 setup_module 和 teardown_module 只会执行一次。

**（2）按 class 进行 setup 和 tear down**

在某一个测试类内，同样可以进行 set up 和 tear down。

```python
class Baidu(object):
    @classmethod
    def setup_class(cls):
        """ 
        仅在当前测试类下的所有test执行之前，被调用一次
        注意它必须以@classmethod装饰
        """
        ## 你的set up代码，例如：
        print("------ set up for class------")
    @classmethod
    def teardown_class(cls):
        """ 
        仅在当前测试类下的所有test执行之后，被调用一次
        注意它必须以@classmethod装饰
        """
        ## 你的tear down代码，例如：
        print("------tear down for class------")
```

需注意以下几个事情：

- setup_class(cls) 和 teardown_class(cls) 的写法最好不要改动。

- setup_class(cls) 和 teardown_class(cls) 必须以 @classmethod 装饰。

- 当 setup_class(cls) 出错，teardown_class(cls) 不会被执行。

**（3）按 method 进行 setup 和 tear down**

针对每一个测试用例，同样可以进行 set up 和 tear down。

```python
def setup_method(self, method):
        """ 
        在当前测试类里，每一个test执行之前，被调用一次
        """
        ## 你的set up代码，例如：
        print("------set up for method------）

    def teardown_method(self, method):
        """ 
        在当前测试类里，每一个test执行之前，被调用一次
        """
        ## 你的tear down代码，例如：
        print("------tear down for method------）
```

需注意以下两个事情：

- setup_method(self, method) 和 teardown_method(self, method) 的写法最好不要改动。

- 当 setup_method(self, method)用例执行失败时，teardown_method(self, method) 不会被执行。

setup 和 teardown 在我们测试开始和结束后准备/清理测试数据，系统状态时非常有用。

#### 8.使用 pytest.ini 文件破除默认 pattern，灵活命名测试文件

我在前面的“pytest 查找测试用例的原则”部分说过，pytest 查找测试用例，会根据测试用例名，仅默认查找前缀以 _tes开头或者后缀以 _test 结尾的测试文件；而查找测试方法，仅查找测试类以 Test 开头，测试方法以 test 开头。

那有没有办法破除这一依赖呢？当然有，那就是使用 pytest.ini 文件。

pytest.ini 是 pytest 的主配置文件，可以改变 pytest 的默认行为。在项目根目录 lagoutAPITest 下新创建一个文件 pytest.ini，我们的项目结构就变成这样：

```bash
|--lagouAPITest
    |--tests
        |--test_baidu.py
        |--test_lagou.py
        |--__init__.py
    |--common
        |--__init__.py
    |--__init__.py
    |--__pytest.ini
```

pytest.ini 的内容如下：

```ini
[pytest]
python_classes = *
python_files= *
python_functions = test*
```

其中：

- python_classes，表示要匹配的测试类的 pattern，*匹配所有。
- python_files，表示要匹配的测试文件。
- python_functions，表示要匹配的测试方法。

在这里我把 python_files 和 python_classes 均设置为*，表示任何 *.py 都将被认为是测试文件。任何名字的测试类都将被认为是测试类。

下面我再次在根目录 lagouAPITest 下建立一个测试文件 sample.py，里面的内容如下：

```python
class Sample(object):
    def test_equal(self):
        assert 1 == 1
    def not_equal(self):
        assert 1 != 0
```

我定义了一个 Sample 类，其中包括两个测试方法 test_equal 和 not_equal。然后我切换到项目根目录下，在命令行运行如下命令：

```bash
D:\_Automation\lagouAPITest>pytest
```

结果如下：

```bash
tests/sample.py::Sample::test_equal PASSED
```

可以看到，sample.py 这个文件被当作了测试文件，并且 Sample 这个类也被 pytest 视为测试类，因为他们符合 pytest.ini 里的配置。

而 Sample 类的两个测试方法中，test_equal 被执行，而 not_equal 没有被执行，因为我在 pytest.ini 里关于 python_functions 的配置是必须以 test 开头。

使用 pytest.ini 可以针对 pytest 做更多配置，做法如下所示。

- **注册标签：**

```ini
[pytest]
markers = 
    smoke: run smoke test
    sanity: run sanity test
```

你可以在 pytest.ini 里注册标签，并统一管理。

在 pytest.ini 文件里注册标签并不意味着你不需要在测试类/测试方法里忽略 @pytest.mark.xxx 装饰器，你仍需要在你的测试用例上加上标签。

```python
# 例如在sample.py文件里的Sample类上加标签
@pytest.mark.smoke
Class Sample:
  # 测试方法
```

- **指定测试目录**

```ini
[pytest]
testpaths=tests
```

此方法把 testpaths 指定为 tests，当你在命令行中直接执行 pytest 时，会自动查询 testpaths 文件夹，如果没有设置 testpaths，则会自动从当前文件夹找起。

除了以上这些，pytest.ini 还有其他很多用处，例如更改默认命令行参数、指定 pytest 最低版本号、指定忽略某些目录、禁用 XPASS 等功能，大家有兴趣可以自行查询。

> 另外，pytest 里查找测试用例的 pattern 是采用的 Glob 这个库，你可以进入 [Python 官网](https://docs.python.org/3/library/glob.html)查看更多关于如何匹配 pattern 的内容。

#### 9.数据驱动

pytest 支持数据驱动，关于数据驱动，我将在后续的章节讲“DDT：博采众长，数据驱动的秘诀”中为你详细讲解。

#### 10.失败重跑测试用例

在测试执行中，偶尔会出现由于环境不稳定，或者网络不稳定造成的测试运行失败的情况，如果第一次运行就报错，那么势必会增加我们排查的工作量。

所以 pytest 支持错误失败重跑，使用失败重跑机制的步骤如下：

- 安装

```bash
pip install -U pytest-rerunfailures
```

命令行执行失败重跑次数

```bash
# 语法：
--reruns Num。 其中Num是重跑的次数
```

下面我们来实际看一个 re-run 的例子，我更改 sample.py 文件如下：

```python
import pytest

@pytest.mark.smoke
class Sample(object):
    def test_equal(self):
        # 在这里，我让这个case失败，来演示re-run
        assert 1 == 0
    def not_equal(self):
        assert 1 != 0
```

然后我们在命令行执行如下命令：

```bash
# sample.py目录为 D:\_Automation\lagouAPITest\tests
# 需切换至此目录执行
pytest sample.py --reruns 2
```

执行后观察测试输出，会发现如下信息“1 failed，2 rerun”：

#### 11.并发运行测试用例集

当你的测试用例比较多时，最好可以通过并发测试来减少测试整体的运行时间。pytest 支持并发测试，并且有不同的并发测试库，其中如下两个比较著名：

- **pytest-parallel**

安装：

```bash
pip install pytest-parallel
```

运行：使用 pytest-parallel 运行，需要指定参数。

> –workers (optional)  X

多进程运行， X 是进程数，默认值 1。

> –tests-per-worker (optional)   X

多线程运行， X 是每个 worker 运行的最大并发线程数， 默认值1。

> 注意：这个插件仅仅支持 python 3.6 版本及以上，而且如果你想多进程并发，必须跑在 Unix 或者 Mac 机器上，windows 环境仅仅支持多线程运行。

运行命令如下：

```bash
pytest --workers 2 #指定2个进程并发
#指定2个进程并发，每个进程最多运行3个线程
pytest --workers 2 --test-per-worker 3
```

- **pytest-xdist**

安装：

```bash
pip install pytest-xdist
```

运行：

```bash
# 语法：
pytest -n NUMCPUS
# 以下为2个进程并行运行
pytest -n 2
#使用与CPU内核一样多的进程来并发
pytest -n auto
```

**从理论上来说，pytest-parallel 要更好一些，因为 pytest-xdist 有以下缺点：**

- 非线程安全
- 多线程时性能不佳
- 需要状态隔离

但是实际应用中，pytest-parallel 有时会出现如下运行错误：

```bash
BrokenPipeError: [WinError 109] 管道已结束
```

而且这个错误发生的原因不确定，官方暂时没有修复， 如果你在测试中发现这个错误，那么可以使用 pytest-xdist 来进行并发测试。

### pytest 集成测试报告

在 pytest 中集成测试报告也有两个方式：

#### 1.pytest-html

安装：

```bash
pip install pytest-html
```

使用：

```bash
pytest --html=report.html
```

以我们的项目 lagouAPITest 为例，在项目根目录下执行

```bash
pytest --html=report.html
```

然后在项目根目录下会生成一个 report.html 文件。

pytest-html 也可以支持 pytest-xdist，也就是说，如果你使用了pytest-xdist来进行并发测试， pytest-html也可以收集并发测试结果了。两者结合使用的命令如下：

```bash
pytest -n 3 --html=report.html --self-contained-html
```

pytest-html 还支持错误重试，使用如下命令运行

```bash
pytest -n 3 --html=report.html --self-contained-html --reruns 2
```

运行结束你会发现，错误的测试用例被运行了 2 次。

#### 2.allure

使用 allure 生成测试报告的步骤如下。

- 安装 allure

在不同操作系统上安装 allure 的步骤是不同的。

MacOS：

```bash
brew install allure
```

Linux：

```bash
sudo apt-add-repository ppa:qameta/allure
sudo apt-get update 
sudo apt-get install allure
```

Windows：

在 Windows 上安装 allure，首先要安装 Scoop，Scoop 的安装步骤如下：

```bash
# 以Win10为例：
1. 使用快捷键 Win + R 调起运行提示框
2. 输入“cmd”进入到命令行
3. 输入“powershell”进入到powershell模式（此时你的命令提示应该以PS开始）
4. 确保你的PowerShell版本大于5.0，命令如下：
$psversiontable.psversion.major # 这个运行后出现的值应该>=5.0
5. 允许PowerShell 执行本地脚本：
set-executionpolicy remotesigned -scope currentuser
6. 安装Scoop
Invoke-Expression (New-Object System.Net.WebClient).DownloadString('https://get.scoop.sh')
```

安装好 Scoop 后，不要关闭 powershell，直接输入如下命令安装 allure：

```bash
PS C:\Users\Admin>scoop install allure
```

如果你之前安装过 allure，也可以通过如下方式更新：

```bash
PS C:\Users\Admin>scoop update allure
```

你还可以查看当前使用的 allure 版本：

```bash
PS C:\Users\Admin>allure --version
```

- **执行 pytest 命令，并指定 allure 报告目录**

可以直接在命令行里执行：

```bash
# 直接执行lagouAPITest项目下的所有测试用例，并将测试报告文件夹allure_reports放在项目根目录下
D:\_Automation\lagouAPITest>pytest --alluredir=./allure_reports
```

还可以在程序里执行：

```python
# 执行所有的标记为smoke的测试用例，并且报告文件夹设置为allure_reports
pytest.main(["-m", "smoke", 
             "--alluredir=./allure_reports"])
```

- **打开 allure 报告**

测试执行完成后，通过以下方式打开生成的 allure 报告：

```bash
# 以Win10为例：
1. 使用快捷键 Win + R 调起运行提示框
2. 输入“cmd”进入到命令行
3. 切换目录到项目根目录，本例中在D:\_Automation\lagouAPITest>：
4. 输入命令生成allure报告：
allure serve allure_reports
```

需要注意的是，allure_reports 文件夹就是我们在第 2 步中定义的 allure 报告文件夹所在的位置，命令执行后，会自动打开 allure 测试报告：

至此，我们的第一个 API 接口自动化测试框架已经全部完成。

## 参考

- 《测试开发入门与实战》
- https://www.python.org

[1]: /images/py/auto-test-02/1.png
[2]: /images/py/auto-test-02/2.png
[3]: /images/py/auto-test-02/3.png
[4]: /images/py/auto-test-02/4.png
[5]: /images/py/auto-test-02/5.png
[6]: /images/py/auto-test-02/6.png
[7]: /images/py/auto-test-02/7.png
[8]: /images/py/auto-test-02/8.png
[9]: /images/py/auto-test-02/9.png
[10]: /images/py/auto-test-02/10.png
[11]: /images/py/auto-test-02/11.png
