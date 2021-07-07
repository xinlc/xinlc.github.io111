---
title: 测试开发入门与实战（一）
date: 2021-07-05 09:30:00
categories: Python
tags:
  - Testing
---

测试基础

<!--more-->

## 自动化测试框架知多少：概述、构成及常用框架类型

俗话说“万丈高楼平地起”，对于测试框架来说，**最致命的问题就是，投入使用后才发现框架结构不清晰，设计不合理，从而导致测试框架不可扩展、无法迁移，**可见测试框架有多么重要。

### 自动化测试框架的引入

我认为，测试框架好比工具箱，其作用是可以**便捷**、**高效**地完成测试工作。而测试框架的引入，往往不是一蹴而就的，好的测试框架都是在实践中逐渐演化而来的。

下面我讲一个不那么恰当但很形象的“猩猩吃甜点”的例子，向你讲解测试框架的引入流程，并以此说明测试框架的作用。

![1][1]

![2][2]

“吃甜点”这件小事，从毫无章法，变成一件有流程、有仪式感、让人会感到幸福的事，“木条”在其中起了很重要的作用；同样地，让测试变得更加规范化、流程化、效率化，“测试框架”在其中也起了很大的作用。

### 自动化测试框架的构成

一个成熟的测试框架主要由 4 部分组成：基础模块、管理模块、运行模块和统计模块，接下来我将逐一讲解。

#### 1. 基础模块

如果把自动化测试框架比作一辆汽车，那么自动化测试基础模块就是那四只轮胎，没有它们，这辆汽车寸步难行，它们一般包括如下部分。

- **底层核心驱动库：** 一般指用于操作被测试应用程序的第三方库，例如在 Web 端的 Selenium/WebDriver。
- **可重用的组件：** 一般用来降低开发成本，常见的有时间处理模块、登录模块等。
- **对象库：** 存储被测试对象的仓库。在实际应用中，常常将页面进行分组，把一个页面上的所有对象放到一个类里，也就是 Page Object 模式。
- **配置文件：** 包括测试环境的配置和应用程序的配置。**测试环境配置**，指的是一个功能从开发代码完成到上线，往往要经过几个测试环境的测试，测试环境的配置能够减少环境切换成本；**应用程序配置**，主要包括被测试程序的一些配置，利用配置文件，可以做到在不更改代码的情况下覆盖相同程序的不同程序配置。

#### 2. 管理模块

自动化测试管理模块就好比汽车的内饰和外观，它对测试框架的使用操作体验有着直接影响，一般可分为测试数据管理和测试文件管理两部分。

- **测试数据管理**

测试数据存放的文件是否跟测试用例强绑定，以及测试数据是否容易替换、是否和测试框架耦合等，这些都决定着测试框架的“内饰”好坏。

**测试数据**，一般指测试用例用到的各种测试数据，它们是为了验证业务正确性而构造的，每一条测试用例一般对应着一组或多组测试数据，测试数据创建一般分为实时创建和事先创建。

**实时创建**，是在测试代码运行时才生成的测试数据。其好处有：测试数据是和测试代码耦合的，测试人员不需要关心其创建过程和业务调用链，通常用在测试的公用功能上。例如，给用户绑定银行卡以方便后续支付等。而坏处则是如果调用链太长，耗时会比较久。

**事先创建**，是指测试代码运行前就准备好数据文件。其好处是数据拿来即用，几乎不耗费时间，由于没有业务调用，所以这在一定程度上减少了调用失败的风险；坏处则是数据文件本身需要维护，以保持可用性和正确性。

测试数据在测试中非常重要，它关系到你的测试是否有效，测试框架要做到对测试数据有效管理。

- **测试文件管理**

测试文件管理就好比汽车的颜色和外观，决定着第一印象，所以测试框架的文件结构应该清晰有序、一目了然。

比如，一个测试用例应该对应建立三个文件，分别是：Page 类文件（xxxPage，根据 PO 模型）、测试类文件（testxxxPage）和对象库文件（xxxPageYml）。

这三个文件共同描述了一个完整的测试用例，当你看到一个 Page 类时，就应该做到它还有一个对应的测试类。

测试文件的结构清晰有助于他人理解测试框架的设计思想，更有利于测试框架的维护和推广。

#### 3. 运行模块

自动化测试运行模块是测试框架的发动机，它主要用于测试用例的组织和运行，一般包括如下部分。

- **测试用例调度，驱动机制**。 测试框架应能按需组织，调度测试用例生成、执行。举例来说，测试框架可以在运行时根据使用者给定的 Tag 动态挑选要运行的测试用例，并把它们调度执行（可以顺序执行，也可以并发执行，还可以远程执行）。

- **错误恢复机制**。 由于测试环境、测试程序、测试代码存在各种不确定因素，测试框架应该具备一定的错误恢复机制。在测试用例执行中，引起错误的类型一般可分为**代码/运行导致的错误和环境/依赖导致的错误**，测试框架应该能够识别这两种错误并给予相应的处理。

- **持续集成支持**。 测试框架应该能够和 CI 系统低成本集成，包括通过用户输入参数指定运行环境、测试结束后自动生成测试报告等。

#### 4. 统计模块

自动化测试统计模块，就相当于汽车的品质和口碑。好的统计模块，不仅能告诉你当前的测试有没有 Bug，还能分析软件质量随着时间的演变情况，这是测试框架的质量体现。

自动化测试统计模块一般包括如下两部分：

- **测试报告**。 测试报告应该全面，包括测试用例条数统计、测试用例成功/失败百分比、测试用例总执行时间等总体信息。其中，对于单条测试用例，还应该包括测试用例 ID、测试用例运行结果、测试用例运行时间、测试用例所属模块、测试失败时刻系统截图、测试的日志等信息。

- **日志模块**。 测试框架应该包括完善的日志文件，方便出错时进行排查和定位。

### 常用的测试框架类型

测试框架有很多类型，比较常见的有以下四类。

#### 1. 模块化测试框架

模块化测试框架是利用 OOP 思想和 PO 模式改造而来的框架。

模块化测试框架把整个测试分为多个模块，模块化有以下几个特征：

- 我们将一个业务或者一个页面成为一个 Page 对象；
- 这个 Page 对象，我们以一个 Page 类来表示它；
- 这个 Page 类里存放有所有这个 Page所属的页面对象、元素操作；
- 页面对象和元素操作组成一个个的测试类方法，供测试用例层调用。

简单来说，**使用了 PO 模式的框架就可以叫作模块化测试框架**。

- 模块化测试框架的**好处**在于方便维护，你的测试用例可以由不同模块的不同对象组成；
- **坏处**在于你需要非常了解你的系统及这些模块是如何划分的，才能在测试脚本里自如地使用，否则你就会陷入重复定义模块对象的循环里。

#### 2. 数据驱动框架

数据驱动框架主要解决了**测试数据**的问题。

在测试中，我们常常需要为同一个测试逻辑，构造不同的测试数据以满足业务需求，这些测试数据可以保存在测试代码里，也可以保存在外部文件里（包括 Excel、File、DB）。

数据驱动框架的**精髓**在于，输入 M 组数据，框架会自动构造出 M 个测试用例，并在测试结果中把每一个测试用例的运行结果独立展示出来。

在 Python 架构里，最出名的数据驱动框架就是 DDT。

#### 3. 关键字驱动框架

关键字驱动其实就是把一系列代码操作封装成一个关键字（这个关键字其实是函数名），在测试里，可以通过使用组合关键字的方式来生成测试用例，而不去关心这个关键字是如何运作的。

关键字的一个典型应用是将登录操作封装为关键字 Login，之后在后续代码里，有关 Login的操作，就仅需调用这个关键字 Login，而不必又重新进行一次登录操作。

关键字在领域里的最佳应用典范我认为是**BDD**（行为驱动开发），它甚至被当成一种独立的敏捷软件开发技术来使用。

#### 4. 混合模型

需要注意的是，没有任何规定要求你的测试框架要属于以上某种类型，因为测试框架的存在不是为了分类型，而是为了更好地测试。

所以在工作中，我们常常需要糅合不同框架模型，我们将这种模式的测试框架称为混合模型。混合模型可以包含模块化框架，也可以使用数据驱动，或者使用 BDD 模式。

<!-- ![3][3] -->

## 经验凝练，反复践行的 13 条自动化测试框架设计原则

不知你是否遇到过以下问题：你的小组新开了个项目，要做自动化测试，老板说：“你们不是有自动化框架吗？把那个拿过来用”。接到这个任务后，你便兴致勃勃地去做了，结果发现要改的东西太多，无法直接在新项目使用原来的框架。

或者你正在调试一个测试脚本，它出错了，你却无法一眼看出来在那个地方出错了？定位问题要打断点一步一步调试。甚至公司原先写框架的那个人离职了，慢慢地，这个框架就废弃了，没人用了。

如果你被这些问题困扰过，你就知道，这些都是因为没有遵循测试设计原则导致的。

测试设计原则很重要，但还是经常会有同学问我，为什么要制定这么多原则？为什么不直接动手搭建框架？这时，我通常会举下面的例子来说明“按照原则进行框架设计”的必要性，它能帮助你少走很多弯路。

![4][4]

这个过程你会发现，如果你总是碰见一个问题解决一个问题，那么当需求积累至一定高度时，比如十万人都要过河时，你才发现已经无法单一性地解决问题了，你亟须建造一座桥梁，来系统解决问题。

所以测试框架的设计原则，在我看来就是造桥经验的教训总结，让你能够跳过建造木筏、小船这些步骤，而直接去建造桥梁，直达最优的根本方法，并保障在面对大规模、复杂场景应用时，仍然能发挥稳健。

以下五大类，合计 13 条设计原则是我多年经验的实践总结，希望你能充分理解，并在实践中灵活运用，从而少走一些弯路。

- 清晰明了，学习成本低；
- 通用性强、可维护、可扩展；
- 对错误的处理能力强；
- 运行效率高且功能强大；
- 支持持续集成和版本控制。

### 清晰明了，学习成本低

自动化测试框架是个系统性工程，需要多成员一起运作，为了降低使用人员的学习成本，提升运行效率，自动化测试框架的代码、模块、报告应清晰明了。

#### 1.代码规范

测试框架随着业务推进，必然会涉及代码的二次开发，所以代码编写应符合通用规范，代码命名符合业界标准，并且代码层次清晰。

特别在大型项目、多人协作型项目中，如果代码没有良好的规范，那么整个框架的代码会风格混杂、晦涩难懂，后续维护会很困难，最终成为没人敢动的“祖传代码”。

比如，下面的代码你要极力避免：

```python
ll = [{"person": {"name": "kevin", "country": "cn", "traveled": "no"}, "test": 0}, 

    {"person": {"name": "Alex", "country": "us", "traveled": "yes"}, "test": 0}]

def hesuan_test(l):

    l1 = []

    for i in l:

        for j in i.keys():

            if (j =="test"):

                if(i["test"] == 0):

                        l1.append(i["person"]["name"] )

    return l1

if __name__ == "__main__":

    print(hesuan_test(ll))
```

上面的代码，定义了一个函数来判断列表的人是否需要做核酸检测。可以看到，代码有如下缺点：

- 函数名称中英文混杂；
- 函数体内变量命名随意，根本看不出业务含义；
- 函数不简洁，这么简单的函数有 2 个 for 循环，2 个 if 判断分支语句，很烦琐；

总之，就是一点也不 “pythonic”，不是简洁优美的代码，甚至很难让人看出它的功能。

我们通常说这样的代码有坏味道（Bad Smell），会毁掉代码的易用性和可维护性，编程时一定要注意避免。

下面我将这个代码优化下，示范一个好代码才会有的“代码即文档”的效果：

```python
to_test_person_list = [{"person": {"name": "kevin", "country": "cn",   "traveled": "no"}, "test": 0}, 

    {"person": {"name": "Alex", "country": "us", "traveled": "yes"}, "test": 0}]

def covid19_test(person_list):

        return [person['person']['name'] for person in person_list if person['test'] == 0 ]

if __name__ == "__main__":

    print(covid19_test(to_test_person_list))
```

好的编程规范，可以帮我们快速理清业务逻辑，避免后续业务出现“搞不清逻辑不敢改” “不知道坑在哪里，不敢重构”的情况。

那么，业界标准的代码规范有哪些呢？不同语言的代码规范不尽相同。以 Python 为例，我们一般以 PEP 8 为准，具体请参考 [Python Software Foundation](https://www.python.org/dev/peps/pep-0008/)  官网。

#### 2.模块清晰明确

模块化是将测试框架从逻辑上分为几个不同的模块，如下列的模块化分层的测试框架所示，使用者可以根据实际情况自行裁剪。

![模块化分层的测试框架图][5]

模块化的好处是**可重用**，并且**便于替换修改**。

以上图为例，假设测试报告模块以前用的是 Allure，现在想替换成更加贴切自身业务的自研测试报告，我们仅需将报告模块替换掉就可以了。

但如果测试框架没有做模块化划分，测试报告是耦合在框架代码里的，那么就会导致无法切换测试报告，或者切换代价过大的问题，改动起来就会比较痛苦。

### 通用性强、可维护、可扩展

接下来我会向你讲解“通用性强、可维护、可扩展”这一设计原则，这点是从框架推广和维护角度出发来考虑的。

#### 1.通用性强

- **通用于不同的操作系统**，比如，测试框架不仅适用在 Windows 操作系统上，还要适用在 MacOS、Linux 系统上，越通用，测试框架的受众就会越多。

- **能解决同一类通用问题**，比如，测试框架有个底层方法是用来操作弹出框的，那么无论是 Alert 框、确认框，还是一个允许用户输入的交互框，测试框架应该都能识别并操作。

#### 2.可维护、可扩展

**（1）可维护性**

测试框架要做到容易维护，就一定要代码规范，模块清晰，除此之外整个测试框架代码风格还应该统一、易读、易懂。总之，要做到框架出问题时能容易定位并修改；更要做到，即使多人合作这个框架，这个框架代码要看起来是出自同一人之手。

可维护性无法用具体的指标衡量，也没有标准的实现方式。

但不可维护性是可以感知的，因为不可维护性常常以代码逻辑混乱，不遵循编码规则等特征出现。所以一般通过消除不可维护性来证明测试框架是可维护的。不可维护的典型例子便是代码逻辑，比如一部分判断逻辑嵌套了非常多层的 if....else，就像上面的反例代码一样，这样的代码不易理解，改起来容易出错，这是你必须要避免的。

**（2）可扩展性**

可扩展性指当需求变化时框架容易扩展。如果测试框架不能扩展，就无法解决业务发展带来的新问题，也就意味着测试框架的寿命会很短。

下面我举例说明下什么是可扩展性，假设测试框架运行测试的流程是：查找测试文件夹下的所有用例 → 判断该用例是否要运行 → 加入用例到待运行用例集 → 顺序运行测试用例 → 输出测试报告。

比如现在随着业务发展，我有了新需求： 需要按照一定的规则将“顺序运行”改为“并发运行”，即将带有特定标签的测试用例改为“并发运行”，而将没带有特定标签的测试用例继续保持“顺序运行”。

如果我们的测试框架可扩展，那么我仅需简单更改“顺序运行测试用例”这个模块的相关代码即可；反之，我则需要将测试流程重新设置甚至改造，所以我说可扩展性是测试框架的一个重点。

### 对错误的处理能力强

该原则是从测试运行的角度看的，当我们测试开始时，往往会运行很多测试用例，当测试出错时，测试框架如何处理才能让运行更有效率呢？

#### 1.错误处理机制，高效解决

在测试运行中，难免由于种种原因运行错误，这时测试框架就必须具备处理错误的能力。错误处理机制一般分为停止运行和错误恢复两种。

- **停止运行**是指发现错误后直接停止本次测试，在实践中一般在测试框架本身出现错误的时候才会使用。

- 针对具体的测试用例执行，**错误恢复**这种方式比较常见。其步骤通常是标记当前用例为“失败”，清理失败数据，恢复测试环境，然后再运行下一条测试。
  - 其中，根据错误恢复的时机又可以分为**事先恢复**（当前用例运行前，将环境和数据恢复为初始状态）和**事后恢复**（当前用例执行完成后，将环境和数据恢复为初始状态）两种。
  - 事先恢复现在是比较常用的，因为事后恢复可能会因为用例执行失败而永远执行不到。

#### 2.系统日志清晰，方便调试

除了错误处理机制外，系统的操作日志也能帮你快速排查问题根源，所以平时的日志一定要清晰详细，最好具备上下文，这样才能根据日志进行有效调试，快速定位错误发生的原因。

对于测试框架来说，系统日志除了要按等级 DEBUG、INFO、WARN、ERROR 划分外，最好包括以下内容：

- 记录测试用例的开始和结束时间；
- 记录测试人员的关键操作（如写文件、连接 DB、更改 DB 等）；
- 关键方法的异常信息（如 run 模块出错部分的上下文信息等）。

### 运行效率高且功能强大

在当前的互联网大环境下，每时每刻都可能有构建（Build）发生，有了构建就需要不断地测试，那么运行效率的高低直接决定了构建和发布的次数多少。

#### 1.支持测试环境切换

一个产品从开发到上线，会经历几个测试环境的测试，比如 dev 环境， 集成测试环境，预生产环境，生成环境等。所以测试框架要能做到，一套脚本多环境运行，支持环境切换，并且能根据环境进行自动化的配置（包括系统配置、测试数据配置等）。

#### 2.支持外部数据驱动

根据外部输入数据，动态**生成测试用例**，并在测试报告中单独展示。测试框架会把这些只有数据不同，步骤和操作都相同的测试用例，在运行中解析成一个个不同的独立测试用例，并在测试运行结束后，全部逐一展示到测试报告里。

根据外部输入数据，动态**切换运行用例**。测试目的不同，其需要采用的测试用例也会不同，所以自动化测试框架会给各个测试用例打上标签，再根据需要，自动选择具备特定标签的测试用例进行运行。

#### 3.支顺序、并发、远程运行

当你的测试用例有上千条，甚至上万条时，顺序测试会花费大量的时间。为了快速得到测试结果，测试框架应该支持顺序、并发、远程执行，这样能够缩短测试用例的整体执行时间。

#### 4.报告完备详尽

测试报告是 QA 工作中的重要一环，通常在一个项目结束或者一个 sprint 结束时发出。

虽然，在实际工作中，我们经常听到大家抱怨说测试报告太烦琐了，又不产生什么直接价值，但完备详尽的测试报告，不仅可以述说 QA 到底做了哪些工作，还可以看出整个项目的生命周期运行得平稳与否，软件的质量如何。

#### 5.解决当前没有解决的问题

“不要重复造轮子”是工具创造的首要原则。从功能角度看，框架得到认可，要么是**解决了当前无法解决的问题**，要么是**解决方案比当下的更好**。

例如，Selenium/WebDriver 最开始为人所知是因为它开源、可跨平台；后来 Selenium/WebDriver 的替代者 Cypress 为人所知，是因为它还具备运行在浏览器之内，且自备 Mock 的能力。

所以，你的框架能不能被认可，就在于它是否具有独特的功能特性，这是与其他框架区别开来的标签，也是弥补市场空白的撒手锏。

### 支持版本控制和持续集成

版本控制可以让使用者更好地理解框架的演变历史；框架支持持续集成可以让框架迅速融入公司的技术体系中，使框架被越来越多的团队接纳。

#### 1. 版本控制，回溯复盘

什么是版本控制？其实就是将代码纳入版本控制系统（如 Git）的管理之下。那么为什么测试框架要做版本控制呢？请思考如下问题：

- 你开发了功能 A，老板说这个功能不要，你就把 A 代码删除了。等一个月后业务发生了变化，功能 A 又变得需要了，如果没有版本控制，你怎么把 A 代码恢复回来？

- 我们知道，当前的测试开发中，一个人单打独斗的情形很少见了，常见的是团队协作开发。那么假设你和 B 在开发不同的功能，但是都改动到了同一个底层共享模块。那么如果没有版本控制，你们的代码提交后还能正常工作吗？

假设有了版本控制，那么这些问题发生后，复盘时就非常容易找到根本原因，代码回溯也很方便，所以测试框架应该支持版本控制。

此外，还有一个用处就是对测试代码进行版本控制。假设你同时需要支持同一个微服务的两个不同版本的业务测试。有了版本控制，你的不同版本的测试代码就能以不同分支的形式出现，否则，你只能一次保持一个版本的代码，非常不方便。

有了版本控制，不仅协作开发、版本切换变得非常容易，使用者也可以通过查看版本之间的变化来理解框架的发展脉络。

#### 2. 持续集成，全局出发

我要讲解的最后一条原则是“支持持续集成”，前面的原则是从测试本身角度出发的，而“持续集成”是从整个公司业务出发，需要你与整个开发团队合作完成，同时这是你晋级“资深”的体现。

**测试框架应该能方便地集成至公司的持续集成系统，并且通过持续集成系统触发测试。**

一般来讲，公司的持续集成和持续发布系统通常由 DevOps 和开发架构师打造，测试要做的就是**将测试框架融入公司的持续集成和持续发布技术栈。**

那么测试框架就应支持通过持续集成系统，触发测试用例运行。具体来说就是：当某个代码提交的 hook 被触发时，持续集成会**打包并部署最新代码到测试机上**，此时测试框架及其对应的测试用例应能被唤醒并执行。

支持持续集成的程度决定了框架在团队和公司的接纳度。支持持续集成的成本越小，框架就越容易被推广和深度使用。

<!-- ![6][6] -->

## 告别三大误区，别让分层测试欺骗了你！

今天我们来聊聊，“分层测试”的概念、发展和误区，以及其实施原则。

### “分层测试”是什么？

“分层测试”其实并不是一个专业名称，它只是国内互联网从业者约定俗成的一个叫法。它来自专业名称“Test Pyramid”，也就是我们常说的“测试金字塔”，是 Martin Fowler 在 2012 年提出的一个概念。

![测试金字塔图 1][7]

“测试金字塔”将软件测试分为不同的粒度，强调了**不同粒度的自动化测试在整个自动化测试中的占比应该不同**，旨在指导我们如何使用不同类型的自动化测试来实现软件测试价值的最大化。

它有如下原则：

- 分粒度来写自动化测试；
- 越是高层次，自动化测试的占比应该越少。

如测试金字塔图1 所示，越是底层的测试，比如单元测试（Unit Test），测试耗费的时间就越少，花费的成本就越小，越往上层，测试所需的时间就越多，成本就越高，在“测试金字塔”模型中，UI 测试是性价比最低的一个测试类型。所以，我们说“测试金字塔”模型揭露了测试速度、测试成本和自动化测试类型三者之间的关系。

它最开始只有 Unit、Service 和 UI 这三个粒度，这三个粒度像是把自动化测试分为了三个不同层次，所以行业内我们将它叫作 “分层测试”。

那么，"测试金字塔"的每一层各有什么含义呢？

- Unit 层（单元测试层）
  - 单元测试层位于“测试金字塔”的最底层。主要关注函数，类级别的测试；单元测试之间相互没有依赖，是独立的，可重复执行的；单元测试的执行时间最短，成本最低；在实践中，大约有 70% 的测试用例都是单元测试。

- Service 层（服务层）
  - 服务层位于“测试金字塔”的中间层。主要关注模块本身，模块与模块集成的接口， 子系统本身， 各个子系统之间的测试；Server 层的测试可涉及框架、数据库、第三方服务等；在实践中，大约有 20% 的测试用例是测试。

- UI 层
  - UI 层位于“测试金字塔”的最上层。 关注从用户角度看， 整个系统的表现和交互；UI 层的测试通常通过操作页面对象来执行；耗时最长，成本最高。在实践中，UI 层的测试大约占比 10% 左右。

### “分层测试”的发展

在实践中，“测试金字塔”逐渐更加细化，形成了如下的样子：

![测试金字塔图 2][8]

测试金字图1 中，原本的 Service 层进一步细分为组件测试（Component Test）、集成测试（Integration Test）和 API 接口测试（API Testing）。

而原本顶部的 UI 层，则被 E2E（End To End）测试取代，E2E 测试和 UI 测试的区别是：UI 测试的重点在于产品或系统的 UI 部分；E2E 则更关注整个产品或者系统的行为是否正确，显然 E2E 能更加准确地描述测试活动的重心。

此外，还在顶部另加了一个 Exploratory Test（探索性测试）。探索性测试不是随机测试，探索性测试一般会设定一个测试目标，然后根据测试执行者对系统的了解，从某一个点出发，围绕着测试目标，同时进行测试用例的设计和执行工作，当前探索性测试一般采用手工测试的方式来进行。

至此，测试的“分层”已经很详细了，那每一层具体测试哪些内容，由哪些人负责执行呢？

- **Unit（单元测试）层**： 由于测试的都是具体的方法和类。所以一般由开发自测。

- **Component Test（组件测试）**： 这部分是 Unit 层的组装，多个 unit 组成一个 Component。对于一个组件来说，其输入可能是独立的，那么可由测试人员测试，也可能依赖别的组件提供，这时通常需要开发来提供 Mock。

- **Integration Test（集成测试）**： 把多个 Component（组件）形成一个子系统或者系统，集成测试分自顶向下集成和自底向上集成，集成测试一般由测试人员来完成。

- **API Test（接口测试）**： API 通常是指两个子系统直接通过 API 进行通信（当然不同模块间的通信也会通过 API 来进行），接口测试一般由测试人员来完成。

- **E2E 测试**： 关注系统的交互和 UI 的展现，通常由测试人员完成。

- **探索性测试**： 由测试人员手工完成。

总而言之，“测试金字塔”模型指导我们在进行测试时， 应该投入大量精力到运行速度更快，成本更低的 Unit 测试（单元测试）中；应该投入一部分精力到 Server 测试中（即组件测试和API测试）；在测试速度更慢，成本更高的 UI 层面的测试里，我们只需投入最小精力即可。

### “分层测试”的误区

“测试金字塔模型”（以下称“分层测试”）是“银弹”吗？是不是无论什么系统，都可以采用分层测试？分层测试又有哪些误区呢？

#### 误区 1：分层测试一定是顺序的。

很多同学在分层实践中都会陷入这个误区，特别是对分层测试不了解的同学，看着分层测试的图就想当然认为分层测试是有顺序的。即测试首先从单元测试开始，等所有的单元测试都做完后，才会开始 Service 层的测试（组件测试、集成测试和 API 测试），而 E2E 测试一定是在最后执行。

**实际上，分层测试并没有规定每一层测试的先后顺序，在实践中，每一层的测试是没有执行先后顺序的，是可以同时运行的。**

#### 误区 2：不能跨层执行测试。

有的同学认为，既然分层分得这么清晰，是不是意味着不能在这一层执行其他层的测试呢？

> 比如不能在 Service 层进行 E2E 测试，同样也不能在 E2E 层调用 API。

这是不对的。

分层测试并没有这样的限制。实际上跨层测试是很经常的事情，比如我们在 E2E 测试时调用接口来迅速构造数据，或者使用 Mock 绕过某些非目标测试场景。

还有，特别针对前端的验证来说，比如针对 UI 的验证，可以下沉到 Component 层（组件层）来尽早验证。举例来说，假设你的前端项目采用了 React、Vue、Spa 等 Web 技术，那么，利用这些框架提供的工具在 Component 层（组件层）针对 UI 进行测试是非常普遍的。

#### 误区 3：分层后，单元测试越多越好，UI 测试越少越好。

答案也对也不对。对，是因为理论上越底层的测试发现问题的成本越低，我们应该多做单元测试；不对，是因为现实往往比理论更复杂。

举例来说，假设你的应用是一个跟第三方系统集成的项目（比如对接第三方支付接口）。那么因为第三方接口已经完成，在这个项目中，单元测试已经不用做，且不在你的掌握范围内。这时测试应该把关注点放在 E2E 层，以穷举业务场景的方式，来尽可能多地进行测试，以满足需求。

所以你需要根据项目，合理选择需要实施哪种层次的测试，这才是正确做法。

### “分层测试”的最佳实施原则

“分层测试”讲了这么多，有没有好的实践供参考呢？当然有啦，以下就是我总结的分层测试实施原则。

#### 1. 不要重复测试

重复测试是指，同样一个检查点，在 Unit 层有测试用例，在 Service 层也有测试用例，在 E2E 测试里也有覆盖。

在实践中，太多人尝试在每一层里尽可能穷尽所有功能的测试验证。这是不对的，理想的情况是，每一个层次的测试用例集合起来，正好是最小的，能覆盖所有需求的测试集。

重复测试坏处在于，如果有改动，那么就要改动 3 次，并且还增加了脚本维护时间，测试成本非常高。

#### 2. 测试尽量下沉

测试尽量下沉，是指能在单元测试层覆盖的，尽量在单元测试层覆盖。测试下沉的好处是如果你的测试“失败”了，你清楚地知道哪行代码有问题；而如果 E2E 测试失败了，你要花费更多精力才能找到出错的代码行。

测试下沉并不意味着测试脚本写完就算了，它是一个动态的过程。举例来说，假设你发现某一条 E2E 测试发现了一个功能性 Bug，这意味着你的单元测试某处缺失。这时，你需要把针对这个 Bug 的检查下沉到单元测试层，并且删除掉 E2E 层的测试。

总之，你需要多写单元测试。

#### 3. 根据业务特性，测试合理分层

测试合理分层有两个含义。

**第一个就是合理选择分层模型。**

比如如果是前端占比比较多的测试，你可能选择“奖杯模型”；如果是针对微服务的测试，你可能选择“纺锤模型”。

**第二个是合理选择在哪一层编写你的测试用例。**

假设你需要做一个用户交易历史分页展示的功能，你在单元测试时发现了一个边界值的问题——数据量大到分页超过 1000 页时，程序会出错。

从用户的操作习惯看，数据量根本达不到 1000 页，那么你永远走不到 E2E 层这一步，此时你的测试应该放在单元测试层。

相反，假设如果你的业务流程限定死了，这个分页不可能达到 1000 页，那么这个单元测试就存在“过量测试”的问题，应该从单元测试层移除，转而在 E2E 层根据业务逻辑编写测试用例。

### 课外小知识

除文中介绍的“测试金字塔”模型之外，“测试金字塔”模型针对不同的系统还有不同的演化。

针对只有前端的项目，“测试金字塔”可能只包含 Unit 单元测试和 UI 测试 / E2E 测试，也可以加入对静态资源（Static files）的检查和集成测试（Integration Test），从而演变成奖杯模型（Testing Trophy）。

![奖杯模型（Testing Trophy）][9]

针对微服务项目，还可以演变成一个仅仅关注集成测试的“纺锤模型”。

![纺锤模型][10]

## 必知必会，打好 Python 基本功

Python 语言是一门动态的、面向对象编程的语言，它凭借入门简单、功能强大等优势，受到越来越多开发人员的追捧，已成为一门长期霸榜前三位的热门编程语言。

它的语法非常简洁，同样的功能，相比 Java 等老牌编程语言，Python 花费更少的代码行数便可将其实现；对初学者也非常友好，它的代码可读性和可调试性很强，在复杂情况下，初学者也可以将重心放在编程对象和解决问题的思维方法上，而不必去过多关心语言的语法和类型。

### Python 安装

Python 的最新版本是 3.8.3. 你可以点击进入 [Pyhton 官网下载](https://wiki.python.org/moin/BeginnersGuide/Download)安装包直接安装。

如果你当前系统用的是 Python 2，那么你需要安装最新版本 Python 3，安装完毕后，你可以通过输入以下命令行，来查看你系统的默认版本号。

```bash
python --version
```

如果发现显示的是 Python 2.x, 你可以通过如下方式更改默认值。

**1.如果你的电脑是 Windows 系统**

- 通过“Windows + R”快捷键组合打开运行；
- 输入“sysdm.cpl”；
- 点击“环境变量（N）”，在弹出的对话框中，找到“系统变量”；
- 选中“Path”，并将 Python 的路径更改为 Python3 这一安装路径；
- 再次在命令行输入“python”查看输出的版本号。

**2.如果你的电脑是 MacOS 系统**

- 打开 Terminal， 在命令行中输入“which python 3”，你将看到如下类似输出 /usr/local/bin/python 3；
- 在 Terminal 继续输入“open ~/.bash_profile ” ，并修改文件如下 alias python="/usr/local/bin/python3"；
- 保存并关闭文件，然后运行如下命令 `source ~/.bash_profile；`
- 在 Terminal 里继续输入命令行入“python”，查看输出的版本号。

为了更有效率地开发，Python 安装好后，你还需要点击进入 [Pycharm](https://www.jetbrains.com/pycharm/) 官网，下载并配置集成开发环境。

### Python 标准数据类型

不像其他语言，Python 中的定义变量无须进行类型声明。Python 的标准数据类型有：Numbers（数字）、String（字符串）、List（列表）、Tuple（元组）和 Dictionary（字典）。

下面举个小例子来看下这几种类型的用法：

```python
#定义数字变量
total_num = 100

#定义字符串变量
welcome_words = "欢迎来到蔡超的测试开发课"

#定义列表。列表元素可修改，也可以添加删除
student_list = ["Kevin", "Emily", "Ray"]

#定义元组（元组与列表类似,区别在于元组的元素不能修改）
unique_student = ("Kevin", "Emily", "Ray")

#定义字典,字典一般是key-value结构
course_rank = {"math": "Kevin", "logic": "Emily", "English": "Ray"}
```

在 Python 中，List 和 Dictionary 分别有很多种内置用法，在此介绍其中最常用的部分。

#### 1.List 常用操作

```python
#定义列表 list1 = ['Kevin', 'Emily']
#计算列表元素个数
语法：len（list）
举例：len(list1)

#获取列表的第N个元素
语法：list[N]
举例：list1[0] #返回Kevin

#往List的末尾添加一个元素
语法：list.append（x）
举例：list1.append（'Ray'）#执行完后，list1变成['Kevin', 'Emily'，'Ray']

#扩展List，常常用来把一个可迭代数据的每一个元素append到List里, 它相当于a[len(a):] = iterable
语法：list.extend(x)
举例：list1.extend([2,3,4])

     print(list1) #返回['Kevin', 'Emily'，'Ray'，2， 3， 4]

#插入列表
语法：list.insert(i, x) #在第i个位置插入x元素
举例：list1.insert(0, 'Ray') #在第0个位置插入元素Ray,列表变成['Ray', 'Kevin', 'Emily']

#删除元素
语法：list.remove(x)#删除列表里第一个元素，它的值等于x
举例：list1.remove('Kevin')

#删除指定位置的元素,如果没有指定i，就删除最后一个元素并返回剩余的list
语法：list1.pop(i)
举例：list1.pop(0) #删除"Kevin这个元素"

#清空列表
语法：list.clear()
举例：list1.clear()

#返回list中x出现的次数
语法：list.count(x)
举例：list1.count("Kevin")

#给列表排序, 把list安装key的值来排序， 当reverse等于true时为倒序。
语法：list.sort(key=None, reverse=False)
举例：list1.sort(reverse=true) #返回['Emily'，'Kevin']

#翻转列表
语法：list.reverse()
举例：list1.reverse() #返回['Emily'，'Kevin']

```

#### 2.Dictionary 常用操作

```python
#先定义字典
dict1 = {"math": "Kevin", "logic": "Emily"}

#返回指定键的值,如果字典里没这个可以则返回default的值
#获取math的值
dict1.get("math")

#获取不存在的值English, 则返回Ray
my_dict.get("English", "Ray")

#获取字典里的所有key
dict1.keys()

#获取字典所有的values
dict1.values()

#获取字典的key和value
for k, v in dict1.items():

    print('{key} -- {value}'.format(key=k, value=v))

#改变字典的值
dict1["math"] = "Ray" # 执行后，字典变成{"math": "Ray", "logic": "Emily"}

#删除字典的某个值
del dict1["math"] #执行后，字典变成{"logic": "Emily"}

#删除字典
del dict1
```

### Python 控制流

控制流非常重要，你的代码要如实表现业务逻辑，就必须掌握控制流，控制流中最常见的是分支语句和循环。

在 Python 里，常用的控制流关键字如下。

#### 1.while 循环

while 循环的作用在于，当某个条件成立时，一直执行循环语句， 直至循环条件不成立为止。

```python
#while循环

while 判断条件(condition)：

    执行语句(statements)

    ……

```

![while 循环图][11]

#### 2.for 循环

当我们需要对列表、字典等进行遍历操作时，我们通常会用到 for 循环。

```python
#for循环

for iterating_var in sequence:

   执行语句(statements)

   ……

```

![for 循环图][12]

当对列表、字典进行遍历时，或者当你能确定循环的次数时，通常使用 for 循环。

#### 3.if 语句

if...else...语句用处非常广泛，当业务逻辑需要判断某个条件是否成立时，就可以用 if...else...语句。

```python
#分支语句

if 条件：

  执行条件语句A(statements)

else：

  执行条件语句B(statements)

```

![if 语句图][13]

#### 4.控制流应用案例


了解了 Python 的控制流后，下面直接看个例子加深下印象，我建立了一个名为 test.py 的文件，内容如下：

```python
#test.py
my_students = ["Kevin", "Emily"]
course_rank = {"math": "Kevin", "logic": "Emily", "English": "Ray"}
if __name__ == "__main__":
    my_students_rank = {}
    for k, v in course_rank.items():
        if( v in my_students):
            my_students_rank[v] = k
    p_len = len(my_students_rank)
    while(p_len >0):
        for p in my_students_rank.keys():
            print('{person} are good at {course}'.format(person=p, course=my_students_rank[p]))
            p_len -= 1

```

那么这段代码是什么含义呢？我来逐句解释一下：

```python
#test.py
#1. 我定义了一个list类型的数据变量my_students,存放我所有的学生。
my_students = ["Kevin", "Emily"]
#2. 我定义了个dict类型的变量course_rank，存放整个学校所有课程分数最高的学生。
course_rank = {"math": "Kevin", "logic": "Emily", "English": "Ray"}
#如果该模块被直接调用时，则执行第9行以后的语句，否则不执行。
if __name__ == "__main__":
    #定义了一个字典my_students_rank。存放课程分数最高，且是我教的学生。
    my_students_rank = {}
      #循环获取course_rank里的所有key和value，如果value在我的学生列表 my_students里，则把学生名字作为key，课程作为value保存在新建立的字典my_students_rank里。
      for k, v in course_rank.items():
        if( v in my_students):
            my_students_rank[v] = k
    #获取课程分数最高，且是我的学生的人数
    p_len = len(my_students_rank)
    #循环字典里的每个key和value， 把每个学生擅长的科目打印出来。
    while(p_len >0):
        for p in my_students_rank.keys():
            print('{person} is good at {course}'.format(person=p, course=my_students_rank[p]))
            p_len -= 1
```

我们来执行下这段语句：

```python
#在terminal里，定位到test.py所在的目录下，然后执行
python test.py
```

可以看到如下结果：

```python
Kevin is good at math
Emily is good at logic
```

了解了 While 语句、for 语句、if...else...语句，你就可以使用代码来表述真实业务场景了。

但你会发现这些代码完全是流水账似的，没有函数也没有模块，这显然不符合代码规范。那么，我们就必须学习下模块和函数。

### 函数、模块、包

上面我们讲了 Python 里的基本语法语句的使用，下面我们看下这些基本语法语句是如何被使用的。通常我们的代码为了方便调用，都会以函数、模块、包等形式存在。

#### 1.函数

函数就是能实现一定功能的代码语句的集合。在 Python 中定义函数很简单：

```python
def 函数名(参数)：
  函数体
```

跟其他语言一样， Python 函数定义同样支持无形参、有形参、可变参数等；而函数可以有返回值，也可以没有返回值。下面我们来一一学习：

- **无形参—不需要参数输入**

```python
# 无形参，无返回值
def print_log():
    print(''' Welcome to Kevin's class ! ''')

if __name__ == "__main__":
    print_log()
```

- **有形参—函数接受用户参数**

```python
#有一个形参，有返回值
def is_true(x):
    return x >0
# 有两个形参，有返回值
def min_number(x, y):
    if x>=y:
       x,y = y, x
    return x 
#有可变个形参， 有返回值
def sum_number(*args):
    total = 0
    for k in args:
        total +=k
    return total
#可变个形参，接受key-value的形式, 无返回值
def count_student(**kwargs):
    for k, v in kwargs.items():
        print('{0} - {1}'.format(k, v))

#请你运行下面的函数，来理解Python的函数
if __name__ == "__main__":
    total = sum_number(1, 2)
    print(total)
    min = min_number(1, 2)
    print(min)
    count_student(math='kevin', logic='emily')
```

#### 2.模块

模块是为了编写可维护的代码，而把函数分组放到不同文件里的行为。在 Python 中，一个 .py文件 就是一个模块，一个模块可以包括一个或多个功能，模块又可以被一个或多个其他模块引用。

使用模块的好处很多， 我讲典型的两个：

- **既提高了编程的效率，也增强了代码的可维护性。**

把模块导入当前模块，当前模块即可拥有模块已经实现的功能。如果模块的功能本身需要更改，我们只需要更改模块定义的地方即可，其他地方都无须更改。

- **不同模块的函数名和变量名可以重名。**

有了模块，避免了函数名和变量名之间的冲突，例如如下的文件结构：

```bash
myproject
  |--module1.py
  |--module2.py
```

假设我在 module1.py 里和 module2.py 里，同时定义一个名字为 take_picture() 的函数。这两个不同模块的函数虽然都叫 take_picutre，但其行为可以不相同，也不会相互影响。

看到这里你可能会问，那如果模块名也相同怎么办呢？

#### 3.包

为了解决这个问题，Python 又定义了包（Package）。包就是一个目录文件，它必须包含一个名为 `__init__.py` 的文件。

如下就是一个包结构，在一个包里，不同层级目录下可以包含名字相同的模块。

```bash
myproject
  |-- web
    |-- module.py
    |-- __init__.py
  |-- API
    |-- module.py
    |-- __init__.py
  |-- __init__.py
```

你可以看出，在 web 层级和 API 层级它们都包含着名字相同的模块 module.py，以下列出不同包下的模块引用方式：

```python
# 引入web目录下的包, 假设此目录下module.py里有类变量Module
from web.module import Module
# 引入API目录下的包，假设此目录下module.py里有类变量Module
from API.module import Module
```

可以看出来，函数、模块、包的作用是把代码模块化，方便我们调用和写出更高效的编写代码。

### 模块的导入

有了函数、模块和包， 客观上我们就可以写出符合规范的代码。

那么，一个模块是如何被其他模块调用的呢？有如下三种方式：

#### 1. 直接导入模块

```python
#假设module1.py文件里有个take_picture方法
import module1
```

采用这种方式导入后，就可以直接使用

```python
module1.take_picture()
```

这一方式来调用 take_picture 函数，如果 module1 里含有其他函数，在 module1 被导入后，均可以通过 module1.xxx() 的方式来使用。

#### 2. 采用 from...import 方式导入

有时候我们并不想把一个模块的所有功能都导入进来，假设我只想使用 take_picture 这一个方法，那么我可以使用 from...import 的方式：

```python
from module1 import take_picture
```

采用这种方式导入后，如果我要使用 take_picture 函数，我可以直接在代码里以如下方式使用：

```python
take_picture()
```

可以注意到，这种情况我就不必要写模块名字了。

但假设这个模块里还有个 xxx 函数，我在没有导入的情况下，是无法直接通过 module1.xxx() 或者 xxx() 这样的方式使用的。

#### 3. 采用 from...import* 方式导入

如果你想一次性地导入一个模块下的所有函数， 你可以使用如下方式：

```python
from module1 import *
```

采用这种方式导入后，你可以直接使用这个模块下的所有函数。

#### 4. 动态导入

上面介绍的三种导入方式都属于静态导入，这个很好理解。

但在实际应用中，也会有在程序运行时才知道要具体导入哪个模块的情况（例如，测试框架自动查找测试用例并导入测试用例所属的模块），这时就需要动态导入。

动态导入常常用 importlib 来完成，常用的动态导入有以下两种方式。

- **从模块直接导入**

```python
import importlib 
#导入a.b模块
mod = importlib.import_module（ "a.b"）
```

- **根据模块名，文件名导入**

```python
import importlib.util
spec = importlib.util.spec_from_file_location("a.b", "/path/to/file.py")
md = importlib.util.module_from_spec(spec)
spec.loader.exec_module(md)
```

这个方式比较常用。下面我来举个具体的例子， 假设现在我们的项目目录情况如下:

```bash
myproject
  |-- tests
    |-- a.py
    |-- __init__.py
  |-- b.py
```

在模块 a.py 里，我定义了一个函数：

```python
def hello():
    print('i am module a!')
```

现在，我想在模块 b 中使用 hello() 这个函数， 要怎么操作呢？

```python
#b.py
import os
import glob
import importlib.util

def find_modules_from_folder(folder):
    absolute_f = os.path.abspath(folder)
    md = glob.glob(os.path.join(absolute_f, "**/*.py"))
    return [(os.path.basename(f)[:-3], f) for f in md if os.path.isfile(f) and not f.endswith('__init__.py')]
def import_modules_dynamically(mod, file_path):
    spec = importlib.util.spec_from_file_location(mod, file_path)
    md = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(md)
    return md

if __name__ == "__main__":
    module = find_modules_from_folder('.')
    for m in module:
        mod = import_modules_dynamically(m[0], m[1])
        mod.hello()
```

这个代码有点复杂，我先给定一个文件夹，然后通过函数 find_modules_from_folder 来得到这个文件夹下的模块，及其对应的文件路径，然后我再通过 spec_from_file_location 来动态加载。

## 告别 CURD，拥抱 Python 高阶编程

我想，你在自主开发测试框架的过程中，经常会碰见这样的困惑：

- 我仅仅想运行带着某些特定标签的测试用例，但是我不知道具体哪些用例带着这些标签，我该怎么做？
- 我想给我的每一个函数都增加个打印功能，但是我又不想改动函数本身，该怎么做？
- 我想让测试框架根据用户输入，做出不同的处理反应，但是我的输入不是一成不变的，我输入的参数多一些或者少一些，框架就报错了，该怎么办？

这些问题看起来是一个个不同的业务需求，但它们的背后，其实对应着 Python 语言中的一个个高阶编程技巧。

这些技巧，就好比是绝世武功中的内功心法和武功秘籍， 所谓“万丈高楼平地起”，掌握这些高阶技巧，有助你开发出更优秀的测试框架。下面我们就一起来看一看，Python 中的这些内功心法有哪些？

### 列表表达式（List Comprehension）

俗话说“人生苦短，我用 Python”，Python 为了简化程序的代码行数做了很多努力，其中最经典的就是列表表达式。

比如我有如下函数，用来输出一个单词中的所有字符：

```python
def output_letter(letter):
    l = []
    for item in letter:
        l.append(item)
    return l
if __name__ == "__main__":
    print(output_letter('kevin'))
#此方法的输出为：
['k', 'e', 'v', 'i', 'n]
```

Python 觉得这样写代码行数太多了，不优雅，于是有了如下的写法：

```python
[expression for item in list]
```

对应于我们的函数就变成了：

```python
def output_letter(letter):
   return [l for l in letter]

if __name__ == "__main__":
    print(output_letter('kevin'))

#此方法的输出为：
['k', 'e', 'v', 'i', 'n']
```

是不是瞬间少了很多代码，逻辑也更清晰？不仅如此，Python 还允许我们在列表表达式中进行判断。

```python
[expression for item in list if xxx else yyy]
```

例如我有一个列表，里面包括多个字符，我希望返回那些包含字母 k 的字符。

```python
def output_letter(letter):
   return [l for l in letter if 'k' in l]
if __name__ == "__main__":
    print(output_letter(['kevin', 'did', 'automation', 'well']))
```

列表表达式可以使我们的函数非常简洁易懂，并且减少代码量。

### 匿名函数（lambda）

除了列表表达式可以减少代码量以外，Python 中还提供了匿名函数，当你的函数逻辑非常少时，你无须再定义一个函数，可采用匿名函数来减少代码量。匿名函数的语法如下：

```python
lambda arguments : expression
```

举例来说，我们有一个函数，用来得出列表中的每一个元素的平方，正常的写法是这样的：

```python
def square(l):
    square_list = []
    for ele in l:
        square_list.append(ele * ele)
    return square_list

if __name__ == "__main__":
    print(square([1, 2, 3, 4]))
```

用了 lambda 后，是这样的：

```python
a = lambda l: [item * item for item in l]

if __name__ == "__main__":
    print(a([1, 2, 3, 4]))
```

匿名函数大大地减少了代码工作量，但是也会让代码的可读性降低，所以通常逻辑不复杂的函数，可以考虑使用匿名函数。

### 自省/反射（Reflection）

在编程中，自省是一种在运行时查找有关对象的信息的能力；而反射则更进一步，它使对象能够在运行时进行修改。

自省和反射是 Python 中非常重要的概念，我们可以通过自省和反射来实现很多高级功能，例如动态查找待运行测试用例。

自省最经典的用法就是查看对象类型。

#### 1.type

```python
#返回对象类型
type（obj）
```

比如：

```python
>>> type(7)
<class 'int'>
>>> type(2.0)
<class 'float'>
>>> type(int)
<class 'type'>
```

type() 函数的返回值，我们称为类型对象，类型对象告诉我们参数属于哪种类对象实例。如上文所示，解释器便在告诉我们整数 7 属于 int 类，2.0 属于 float 类，而 int 属于类类型。

```python
type() 常常跟函数isinstance() 配合使用，用来检测一个变量是否是我们需要的类型：
#下述例子判断给定的数字是否整型(int类)
x = 6
if isinstance(x, int):
    print('I am int')
    #你的逻辑
```

自省还有以下其他几种用法。

#### 2.dir

dir() 可以用来获取当前模块的属性列表，也可以获取指定一个属性。

```python
if __name__ == "__main__":
    my_list = [1, 2, 3]
    print(dir(my_list))
    print(dir(my_list).__class__)
```

比如我们运行上述代码，则会有如下结果。

```python
#第一个print返回
['__add__', '__class__', '__contains__', '__delattr__', '__delitem__', '__dir__', '__doc__', '__eq__', '__format__', '__ge__', '__getattribute__', '__getitem__', '__gt__', '__hash__', '__iadd__', '__imul__', '__init__', '__init_subclass__', '__iter__', '__le__', '__len__', '__lt__', '__mul__', '__ne__', '__new__', '__reduce__', '__reduce_ex__', '__repr__', '__reversed__', '__rmul__', '__setattr__', '__setitem__', '__sizeof__', '__str__', '__subclasshook__', 'append', 'clear', 'copy', 'count', 'extend', 'index', 'insert', 'pop', 'remove', 'reverse', 'sort']
#第二个print返回
<class 'list'>
```

#### 3. id

id() 函数返回对象的唯一标识符。

```python
if __name__ == "__main__":
    name = "kevin"
    print(id(name))
#输出
140245720259120
```

#### 4.inspect

inspect 模块提供了一些有用的函数帮助获取对象的信息，例如模块、类、方法、函数、回溯、帧对象，以及代码对象。

例如它可以帮助你检查类的内容，获取某个方法的源代码，取得并格式化某个函数的参数列表，或者获取你需要显示的回溯的详细信息。

inspect 有很多函数，我以一个实际例子为依托，介绍常用的几种。假设现在我们有个项目，它的文件结构是这样的：

```bash
testProject
  --|tests
      --|__init__.py
      --|test1.py
      --|test2.py
```

其中，test1.py 的内容如下：

```python
import inspect
from tests.test2 import hello
class KevinTest():
    def __init__(self):
        print('i am kevin cai')
    def say_hello(self, name):
        hello()
        return 'Hello {name}'.format(name=name)
```

test2.py 内容如下：

```python
def hello():
    print('hello from test2')
```

- **inspect.getmodulename**

inspect.getmodulename(path) 用来获取指定路径下的 module 名。

```python
# 在test1.py中新增如下代码。
if __name__ == "__main__":
    #此打印语句输出test1。 即当前模块名是test1
    print(inspect.getmodulename(__file__))
```

- **inspect.getmodule**

inspect.getmodule(object) 用来返回 object 定义在哪个 module 中。

```python
# 在test1.py中新增如下代码。
if __name__ == "__main__":
    #此语句输出<module 'tests.test2' from '/Users/kevin/automation/testProjectPython/tests/test2.py'>
    print(inspect.getmodule(hello))
```

- **inspect.getfile**

inspect.getfile(object) 用来返回 object 定义在哪个 file 中。

```python
# 在test1.py中新增如下代码。
if __name__ == "__main__"
    test = KevinTest()
    #此语句输出/Users/kevin/automation/testProjectPython/tests/test1.py
    print(inspect.getfile(test.say_hello))
```

- **inspect.getmembers**

inspect.getmembers(object) 用来返回 object 的所有成员列表（为 (name, value) 的形式）。

```python
# 在test1.py中新增如下代码。
if __name__ == "__main__":
    test = KevinTest()
    #此语句输出test里的所有是方法的成员变量。输出是一个列表
    #[('__init__', <bound method KevinTest.__init__ of <__main__.KevinTest object at 0x10911ef28>>), ('say_hello', <bound method KevinTest.say_hello of <__main__.KevinTest object at 0x10911ef28>>)]
    print(inspect.getmembers(test, inspect.ismethod))
```

### 闭包（closure）

闭包是一个概念，是指在能够读取其他函数内部变量的函数。这个定义比较抽象，我们来看一段代码：

```python
def outer():
    cheer = 'hello '
    def inner(name):
        return cheer + name
    return inner

if __name__ == "__main__":
    #输出hello kevin
    print(outer()('kevin'))
```

以上代码的意思如下：我定义了一个外部函数 outer 和一个内部函数 inner；在外部函数 outer 内部，我又定义了一个局部变量 cheer（并给定初始值为hello）；然后我在内部函数 inner 里引用了这个局部变量 cheer。最后 outer 函数的返回值是 inner 函数本身。

在本例的调用里，outer 函数接受了两个参数，第一个参数为空，第二个参数为 kevin。那么outer() 的返回值就是 inner。所以 outer()('kevin') 的返回值就是 inner('kevin')。

为了方便你理解，我贴出这个函数的运行过程：

- 当代码运行时，首先执行的是入口函数，即第 8 行代码，接着是第 10 行代码。

![14][14]

- 继续向后执行，就会进入到第 1 行代码，即 outer() 函数内部；接着第 2 行代码开始执行，变量cheer被定义，并且赋值为“hello”；接着第 3 行代码开始运行，需要注意的是，第 3 行代码执行完，并不会执行第 4 行代码，而是执行第 5 行代码。

![15][15]

第 5 行代码执行完毕后，outer() 函数的整个生命周期就已经结束了，继续往后执行：

![16][16]

可以看到，代码进入了 inner 函数内部，而且 inner 函数内部可以访问生命周期已经结束的 outer 函数的成员变量 cheer，这个就是闭包的魔力。

最后，inner 函数继续执行，outer 函数里定义的 cheer 被取出，并且连同 name 一起返回。我们就获得到了函数的最终结果“hello kevin”。

![17][17]

了解了闭包如何起作用的，我来总结下闭包的特点。

闭包的特点：

- 在一个外部函数里定义一个内部函数，且内部函数里包含对外部函数的访问（即使外部函数生命周期结束后，内部函数仍然可以访问外部函数变量）；
- 外部函数的返回值是内部函数本身。

“闭包”这个概念非常重要，除了在 Python 中，闭包在 JavaScript、Go、PHP 等许多语言中都有广泛的应用。

而闭包在 Python 中的经典应用就是装饰器，而装饰器使 Python 代码能够夹带很多“私货”，下面我们就来看下装饰器的应用。

### 装饰器（decorator）

装饰器是闭包的一个经典应用。装饰器（decorator）在 python 中用来扩展原函数的功能，目的是在不改变原来函数代码的情况下，给函数增加新的功能。

#### 1.实现装饰器

在我们的测试框架开发中，装饰器非常重要，它可以给函数添加 log 且不影响函数本身。

假设我们有一个函数 sum，作用是用来计算 N 个数字的和：

```python
def sum(*kwargs):
    total = 0
    for ele in kwargs:
        total = total + ele
    return total
```

现在，我们加了需求，需要记录这个函数开始的时间和结束的时间。
正常情况下，我们的代码是这样的：

```python
import time
def sum(*kwargs):
    print('function start at {}'.format(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()) ))
    total = 0
    for ele in kwargs:
        total = total + ele
    print('function end at {}'.format(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()) ))
    return total

if __name__ == "__main__":
    print(sum(1,2,3,4))
```

后来，我们发现这个记录函数开始和结束时间的功能很好用，我们要求把这个功能加到每一个运行函数中去。
那么怎么办呢？难道要每一个函数都去加这样的代码吗？ 这样一点也不符合我们在前几节说的代码规范原则。

所以我们来稍做改变，把计算的函数sum的函数单独抽取出来不变，把时间处理的语句另行定义函数处理。于是上面的函数，就变成了以下的样子：

```python
import time

def sum(*kwargs):
    total = 0
    for ele in kwargs:
        total = total + ele
    return total

def record_time(*kwargs):
    print('function start at {}'.format(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()) ))
    total = sum(*kwargs)
    print('function end at {}'.format(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()) ))
    return total

if __name__ == "__main__":
    sum(1,2,3,4)
```

以后我们再给函数加有关时间处理的功能，加到 record_time 里好了，而 sum 函数根本不用变。那这个函数还能更加简化吗？

结合我们刚刚讲过的闭包概念，我们用外函数和内函数来替换下：

record_time就相当于我刚刚讲的outer函数，wrapper函数就是inner函数，只不过我们的inner函数的入参是个函数，这样我们就实现了对函数本身功能的装饰。

```python
import time

# 这个是外函数
def record_time(func):
    def wrapper(*kwargs):
        print('function start at {}'.format(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()) ))
        total = func(*kwargs)
        print('function end at {}'.format(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()) ))
        return total
    return wrapper

# 这个是我们真正的功能函数
def sum(*kwargs):
    total = 0
    for ele in kwargs:
        total = total + ele
    time.sleep(2)
    return total


if __name__ == "__main__":
    # 外函数，内函数，和功能函数一起，实现了不改变功能函数的前提下，给功能函数加功能的操作。
    print(record_time(sum)(1,2,3,4))
```

运行一下，测试结果为：

```python
function start at 2020-08-14 01:06:49
function end at 2020-08-14 01:06:49
10
```

假设我们的需求又变化啦，我们现在不统计函数的运行开始和结束时间了，改成统计函数的运行时长了，那么我们只需要改 record_time 这个函数就好了，而我们的功能函数 sum 就无须再改了，这样是不是方便了很多？

有了装饰器，我们可以在不改变原有函数代码的前提下，增加、改变原有函数的功能。这种方式也被称作“切面编程”，实际上，装饰器正是切面编程的最佳释例。

#### 2.语法糖

不过你发现没，我们的调用仍然很麻烦，record_time(sum)(1,2,3,4)的调用方式，不容易让使用者理解我们这个函数是在做什么，于是 Python 中为了让大家写起来方便，给了装饰器一个语法糖，其用法如下：

```python
@decorator
#对应我们的例子就是
@record_time
```

使用语法糖后，在调用函数时，我们就无须再写这个装饰器函数了，**转而直接写我们的功能函数就可以了**，于是我们的例子就变成了：

```python
import time

def record_time(func):
    def wrapper(*kwargs):
        print('function start at {}'.format(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()) ))
        total = func(*kwargs)
        print('function end at {}'.format(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()) ))
        return total
    return wrapper

#注意这一行，我们把record_time这个函数装饰到sum函数上。
@record_time
def sum(*kwargs):
    total = 0
    for ele in kwargs:
        total = total + ele
    time.sleep(2)
    return total


if __name__ == "__main__":
    #注意此次无须再写record_time了，这样有利于大家把关注点放在功能函数本身。
    print(sum(1,2,3,4))`
```

有了装饰器，我们就可以做很多额外的工作，例如插入日志、做事务处理等，在后续的章节中我也会介绍如何利用装饰器给测试用例打标签。

## 玩转 Git 命令，搞定团队协作

### Git 简述

如果说功能测试工程师的日常工作被测试用例文档和执行用例包围，那么测试开发工程师的日常工作就要从代码提交上说起了。

在高度协作化的今天，由于效率的因素，即使是测试平台，一个人完成一个系统的全部开发这种模式逐渐变得不再适用；如今大部分情况，测试开发任务会被分解成一个个模块，分别由不同的人负责，这就带来了以下问题：

- 假设你和别人负责同一个页面的不同模块，你们的代码应该如何提交整合？
- 假设你要修改一段公用代码，而别人正好也在修改了这个代码，这个代码如何提交？以及如何保存？
- 假设一个功能经过多次代码演变后再被你接手，你想看下这块代码的演变历史，该怎么办？

说到这里，我相信你肯定明白了，我们需要版本控制系统来追踪代码的历史演变过程，从而更好地解决上述可能的冲突。

作为市面上最好的开源分布式版本控制系统，Git 就闪亮登场了。那么 Git 为什么这么受追捧呢? 这与它的原理有很大关系。

#### 1. 高效的数据存储方式

与其他版本控制软件不同，Git 并不以文件变更列表的方式存储信息（该类版本控制方式也叫基于差异（delta-based）的版本控制），而是采用**快照流**的方式对信息进行存储。

在 Git 中，当你提交、更新时， Git 会对项目的全部文件**创建一个快照并保存这个快照的索引；当你再次提交、更新时，如果存在没有修改的文件，则 Git 只保留一个链接指向之前存储的文件，而不再重新存储该文件**，这样就提高了存储效率。

#### 2. 几乎所有操作都是本地执行


在 Git 中， 绝大多数操作都只需要访问本地文件和资源而无须联网。因为 Git 是分布式的，所以你的本地磁盘上就有项目的完整历史。

这种独特的方式可以使你在离线时也能进行 Git 操作并且提交数据，而用 Subversion 和 CVS 的话， 你能修改文件，但不能向数据库提交修改（因为你的本地数据库离线了）。

#### 3. 具备数据完整性保障

在 Git 中，你的任何操作在被存储前都会使用SHA-1散列（Hash，哈希）计算校验和（checksummed）来保障数据的完整性。（例如，你的每个 commit ID 的信息就是一个 SHA-1 Hash 值）。

在实际工作中，我们通过 GitHub、Bitbucket 或者 GitLab 这样的云服务平台来管理项目，大型的公司也会通过在内部搭建**私有 Git 仓库**的方式来管理，无论是哪种方式，背后都离不开 Git。

### Git 工作流程

#### 1.Git 中的三种文件状态

在 Git 里，你的项目文件可能处于以下三种状态之一：

- 已修改（modified），表示修改了文件，但还没保存到数据库中；
- 已暂存（staged），表示对一个已修改文件的当前版本做了标记，使之包含在下次提交的快照中；
- 已提交（committed），表示数据已经安全地保存在本地数据库中。

#### 2.Git 项目的三个阶段

相应地，我们的 Git 项目就分别对应着三个阶段： 工作区、暂存区和 Git 目录。

- 工作区

工作区是从 Git 仓库提取出来的数据，也就是我们本地看到的代码目录，这里改动的代码都在已修改状态。

- 暂存区

暂存区是一个文件，保存了下次将要提交的文件列表信息，一般在 Git 仓库目录中。当处于已修改状态的文件被放入暂存区（Git Add）时，这些文件则会变为已暂存状态。

- Git 目录

Git 仓库目录是 Git 用来保存项目的元数据和对象数据库的地方。从其他计算机克隆仓库时，复制的就是这里的数据。当暂存区的文件被提交（Git Commit），则这些文件属于已提交状态。

![Git 项目的阶段图][18]

#### 3. Git 基本工作流程

了解了这些，我们来看下 Git 的基本工作流程：

- 工作区进行代码新建、修改、删除；
- 将你下次要提交的改动全部或者选择性的暂存到暂存区（Git Add）；
- 提交你的改动（Git Commit）。

### Git 实践

当你了解了 Git 的基本知识后，就可以开始实践了。

#### 1.Git 安装

使用不同操作系统的安装方式各有不同。

- **Mac 系统安装**

在 Mac 系统下可以直接使用 homebrew 安装：

```bash
brew install git
```

如果 homebrew 没有安装，则可以采用如下方式安装 homebrew 后再执行上述命令：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
```

- **Window 系统安装**

在 Window 系统下安装，可直接点击访问 [Git 网站](https://git-scm.com/download/win)下载安装包进行安装：

- **Linux 系统安装**

在 Linux 系统下，可以直接通过输入如下命令行进行安装：

```bash
$ sudo dnf install git-all
```

- **Ubuntu 系统安装**

在 Ubuntu 系统下，你可以通过输入如下命令行进行安装：

```bash
$ sudo apt install git-all
```

#### 2.Git 设置

在安装 Git 后，一般要进行用户设置，因为你的每一次 Git 提交都需要用户信息，你可以采用如下步骤配置你的信息。

- **打开命令行工具：**

若你使用的是 Windows 系统，通过“win+ R”快捷键组合，然后输入“cmd”进入；

若你使用的是 Mac 系统，则通过“Command + 空格”，然后输入“Terminal”的

- **输入如下命令：**

```bash
#设置你的Git提交的用户名
$ git config --global user.name "Kevin Cai"
#设置你的邮箱地址
$ git config --global user.email TesterTalk@outlook.com
```

- **通过如下命令查看是否设置成功：**

```bash
$ git config --list
```

当你设置好用户信息后，以后通过 Git 提交代码，Git 会自动使用你配置的用户信息进行提交。

#### 3.Git 基本操作

好了，现在我们已经了解了 Git 的原理并已经安装好 Git，下面就来看看 Git 的基本操作吧。

正常情况下，公司的代码都是通过 GitHub 企业版或者 GitLab 来进行托管。我以 GitHub 为例，来讲解下 Git 的使用和协作交互（GitLab 大体相同）。

![19][19]

可以看到，涉及代码提交的步骤有：

- Task 开发，开发人员在本地 feature 分支进行功能开发；
- 提交测试，新功能开发完成后，开发人员在本地分支自测，然后通过 pull request 的方式提交代码；
- 测试验证，GitHub 根据条件自动触发测试验证流程；
- 代码 Merge，测试通过后，代码被 Merge 到 master 分支。

如上流程几乎是各个互联网公司通用的开发协作流程，下面我就来详细讲解 Task 开发中的 Git 操作及其作用。

要进行 Task 开发，就必须有相应的 Git 项目，那么 Git 项目如何生成呢？

一般情况下，都是直接拉取已经存在的项目，而在拉取项目之前，你最好配置下 SSH，SSH 协议用来连接远程服务器和服务并向它们认证，使用 SSH 连接 GitHub 无须每次访问都提供用户名和密码。

配置 SSH 的方法直接参考 [GitHub](https://docs.github.com/cn/github/authenticating-to-github/connecting-to-github-with-ssh) 官网链接即可，配置好 SSH 后，你可以直接通过如下命令拉取你的项目。

- **git init**

如果是创建全新的项目，你可以通过如下方式：

```bash
#首先，通过命令行进入到你想创建 Git 仓库的目录，然后再目录下执行
$ git init
```

例如你在文件夹 lagouTest 下执行 git init，则 git 将在 lagouTest 下创建一个 .git 子目录，这意味着 lagouTest 这个目录已经转变成了一个 Git 仓库，我们可以对它进行版本管理了。

- **git add .**

如果是通过 git init 立的项目，此时你的 Git 仓库是空的，你可以通过新建文件的方式来编写你的代码，比如新建一个 newcase.py 并且编写。等你编写好后，可以通过 git add 的方式将它提交到暂存区。

```bash
#把本地文件newcase.py的改变提交到暂存区
$ git add newcase.py
#如果更改的文件过多，可以直接把本地所有的改变提交到暂存区
$ git add .
```

- **git rm**

当你想删除某个文件时，可以使用 git rm

```bash
# 删除文件
$ git rm <file>
#删除README file
$ git rm README
```

- **git status**

如果你想查看当前版本库的状态，可以使用 git status

```bash
$ git status
```

git status 将列出文件/文件夹在工作区和暂存区的状态。

- **git commit -m**

接着把暂存区的改动提交到本地版本库。

```bash
# 通过-m参数输入本次提交的改动信息，方便我们了解本次的代码变更
$ git commit -m “我的第一次提交”
```

- **git remote add**

项目要多人协作就必须把本地仓库提交到远程。

```bash
#如下语法用来添加一个远程仓库
$ git remote add [shortname] [url]
#将本地仓库lagouTest和远程仓库建立连接
$ git remote add origin https://github.com/yourCompany/lagouTest.git
```

如果是新建立的项目，需要用这个方式建立远程仓库。待远程仓库建好后，还需要将本地的改动通过 git push 到远程去。

- **git push - u**

既然是团队协作就必须把本地版本库上传到远程库，这样别的开发人员才能拉取你的改动。

```bash
# 如果是本地新仓库第一次push到远程，你需要执行如下操作
$ git push -u origin master
```

通过上述方式，你的代码已经存在远程仓库的 master 分支了，别的开发人员就可以拉取你的代码进行修改了。

- **git clone**

要通过 git 协作，首先要 clone 远程仓库到本地。

```bash
#在命令行中执行如下操作
$ git clone 你的项目地址
# 譬如，如下命令将Copy lagouTest到本地。
$ git clone https://github.com/yourCompany/lagouTest.git
```

- **git checkout-b**

项目被拉取到本地后，开发人员就可以进行分支开发，通常情况下不会在 master 分支进行开发，而是采取新 feature 分支开发的方式。

```bash
#创建并切换feature分支
$ git checkout -b newFeature
```

假如分支 newFeature 已经存在，你想要切换到这个分支工作，则使用如下命令：

```bash
$ git checkout newFeature
```

当 feature 分支创建好后，开发人员就可以新建代码文件并进行代码的编写；代码编写好后，开发人员就会提交，此时仍然采用 “git add” 和 “git commit”提交即可；当你 commit 后，也要提交到远程仓库。

- **git push-set-upstream**

因为我们是本地创建的 feature 分支，远程并没有对应的分支，故需要远程分支关联。

```bash
# 把本地分支newFeature关联到远程分支origin
$ git push --set-upstream origin newFeature
```

此时远程分支除去 master 分支外，还有我们新建立的 newFeature 分支。当关联远程分支后，我们在 newFeature 分支上再做任何改动，需要 push 到远程分支，就可以直接使用 “git push” 而无须再次进行关联。

```bash
# newFeature的再次改动提交到远程库，仅需执行git push即可。
$ git push
```

- **pull request**

pull request（通常被简称为 PR）是 GitHub 的一个通知机制，通过它开发人员可以进行更好的协作。pull request 通常要指定 reviewer（评审者），它告诉项目成员我的 feature 功能开发已经完毕，希望合并到代码主分支（master）。

创建 PR 通常是使用 GitHub 界面完成的。仍然拿项目 lagouTest 为例，我们需要把 feature 分支 newFeature 上的改动 merge 到 master，就需要提交 pull request。

在 GitHub 项目目录选择 “compare & pull request” 来建立一个 pull request。

在创建 pull request 页面，可以看到我们是要把 newFeature 的改动 merge 到 master 里去。正文的输入框中，输入本次提交都修改了哪些内容，然后在右侧的 Reviewers 里添加需要协作的同事，然后点击 “Create pull request” 即可。

提交后你的同事会收到邀请，当他们 Approve 你的改动后，你的代码就进入了 master 仓库（关于如何 review 一个 pull request，请参考 [Review Pull Request](https://docs.github.com/en/enterprise/2.13/user/articles/reviewing-proposed-changes-in-a-pull-request)）。

- **git branch -d**

当你的分支被 merge 后，你的 feature 分支和远程分支就不需要了，最好把它们删除以保持 git 分支的清爽。

```bash
#删除本地分支
$ git branch -d [branchname]
#譬如删除本地分支newFeature
$ git branch -d newFeature
#删除远程分支
$ git push origin --delete [branchname]
# 删除远程分支newFeature
$ git push origin --delete newFeature
```

### Git 常见问题

除了上述 Git 常用的操作外，在日常工作和面试中，我们经常会遇见如下问题。

1. 如何查看提交历史

当你需要查看某个文件的提交历史时，使用如下命令：

```bash
$ git log filename
#查看 newcases.py的提交历史
$ git log newcases.py
```

2. 本地正在开发，远程 master 有了更新，如何应用更新到本地分支？

当远程有更新且需要应用到本地时，可以采用如下操作：

```bash
# 假设本地feature分支为newFeature
# 首先需要提交本地分支newFeature的改动至代码仓库
$ git add .
$ git commit -m "本地分支修改comments"
# 然后，执行git merge
$ git merge master
# 最后，再次提交
$ git add .
$ git commit -m "merge master 分支"
```

3. 提交时文件有冲突怎么办？

当多人同时改动一个文件并且当你提交时，这个文件已经被先行 merge 到 master 时，就会出现冲突。

当出现冲突后， git 会列出来冲突的内容，你可以通过手动选择保留哪个版本的方式来解决冲突，解决冲突后，通过“git add” 和“git commit”再次提交即可。

4. 当你正在进行分支开发时，接到一个紧急任务，如何将当前的改动保留和后续恢复？
 
当你的 feature 分支开发了一半，然后接到了紧急任务需要支持，但是你又不想把功能不完善的代码提交到代码仓库，此时可以使用 git stash 命令。

```bash
# 如果你要切换新分支但是有未保存的更改使用git checkout -b会报错。此# 时可以通过git stash将所有未提交的修改（工作区和暂存区）保存至堆栈# # 中，可用于后续恢复.
$ git stash
# 等你想恢复你保存的改动时，执行git stash pop。 它将缓存堆栈中的第一个stash删除，并将对应修改应用到当前的工作目录下。
$ git stash pop
```

5. 本地提交已提交到暂存区，但是不想要了怎么办？

假设你的某次改动已经提交到暂存区，还没有 push，但是你想丢弃这个改动，可以采用如下办法：

```bash
$ git reset --hard HEAD
```

git reset 有 hard 和 soft 两个模式，感兴趣的同学可以自行了解下其中的区别。

6. 提交后发现把本次修改的内容写错了，怎么办？

当你只想 git commit 后发现遗漏或者写错了本次修改的内容， 可以采用如下方式：

```bash
$ git commit --amend
# git会出现一个编辑框，你可以更改你的提交信息。
```

7. 上线后有问题，代码需要回退怎么办？

如果发现发布上线的功能有问题，需要回退的情况，执行如下操作：

```bash
$ git revert HEAD
$ git push origin master
```

![20][20]

## 参考

- 《测试开发入门与实战》
- https://www.python.org
- https://www.python.org/dev/peps/pep-0008/

[1]: /images/py/auto-test-01/1.png
[2]: /images/py/auto-test-01/2.png
[3]: /images/py/auto-test-01/3.png
[4]: /images/py/auto-test-01/4.png
[5]: /images/py/auto-test-01/5.png
[6]: /images/py/auto-test-01/6.png
[7]: /images/py/auto-test-01/7.png
[8]: /images/py/auto-test-01/8.png
[9]: /images/py/auto-test-01/9.png
[10]: /images/py/auto-test-01/10.png
[11]: /images/py/auto-test-01/11.png
[12]: /images/py/auto-test-01/12.png
[13]: /images/py/auto-test-01/13.png
[14]: /images/py/auto-test-01/14.png
[15]: /images/py/auto-test-01/15.png
[16]: /images/py/auto-test-01/16.png
[17]: /images/py/auto-test-01/17.png
[18]: /images/py/auto-test-01/18.png
[19]: /images/py/auto-test-01/19.png
[20]: /images/py/auto-test-01/20.png
