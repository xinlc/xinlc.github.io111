---
title: Java8 新特性汇总
date: 2019-12-01 21:25:00
categories: Java
tags:
  - java
  - java8
---

`Java 8`（2014 年 3 月发布） 可谓是自 `Java 5` 以来最具革命性的版本了，它在语言、编译器、类库、开发工具以及 Java 虚拟机等方面都带来了不少新特性。

<!--more-->

## Lambda 表达式

`Lambda` 表达式可以说是 Java 8 最大的卖点，它将函数式编程引入了 Java。Lambda 允许把函数作为一个方法的参数，或者把代码看成数据。

首先以简单的字符串排序为例来展示：

```java
List<String> names = Arrays.asList("peter", "anna", "mike", "xenia");

// java 8 之前
Collections.sort(names, new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
        return b.compareTo(a);
    }
});
```

一个 Lambda 表达式可以由用逗号分隔的参数列表、–>符号与函数体三部分表示。下面用 Java 8 中提供的一种更短的 Lambda 表达式的方法来完成该工作：

```java
// 使用 Lambda 简化，-> 后是函数体，默认返回执行后的结果，如果想返回指定结果可以使用 {} 括起来写 return
Collections.sort(names, (String a, String b) -> b.compareTo(a));

// 或者这种更简短的方式
names.sort((a, b) -> b.compareTo(a));
```

## Functional Interfaces

为了使现有函数更好的支持 Lambda 表达式，Java 8 引入了函数式接口的概念。但它是一个特殊的接口：`SAM` 类型的接口（Single Abstract Method），函数式接口就是只有一个方法的普通接口。

`java.lang.Runnable` 与 `java.util.concurrent.Callable` 是函数式接口最典型的例子。为此，Java 8 增加了一种特殊的注解 `@FunctionalInterface`，这种所谓的函数式接口必须只能包含一个抽象方法，而每个该类型的 Lambda 表达式都会关联到这个抽象方法。

```java
// Converter.java
// 声明函数式接口
@FunctionalInterface
public interface Converter<F, T> {
    T convert(F from);
}

// Test.java
Converter<String, Integer> converter = (from) -> Integer.valueOf(from);
Integer converted = converter.convert("123");
System.out.println(converted);    // 123
```

### Built-in Functional Interfaces

JDK 1.8 的 API 中包含了许多的内建的函数式接口，其中部分的譬如 Comparator、Runnable 被改写成了可以由 Lambda 表达式支持的方式。除此之外，Java 8 还添加了许多来自于 Guava 中的依赖库，并将其改造为了 Lambda 接口。

### Suppliers

其简洁的声明，会让人以为不是函数。这个抽象方法的声明，同 Consumer 相反，是一个只声明了返回值，不需要参数的函数（这还叫函数？）。也就是说 Supplier 其实表达的不是从一个参数空间到结果空间的映射能力，而是表达一种生成能力。

```java
Supplier<Person> personSupplier = Person::new;
personSupplier.get();   // new Person
```

其他 Supplier 扩展接口：

- `BooleanSupplier`：boolean getAsBoolean(); 返回 boolean；
- `DoubleSupplier`：double getAsDouble(); 返回 double；
- `IntSupplier`：int getAsInt(); 返回 int；
- `LongSupplier`：long getAsLong(); 返回 long；

### Consumers

这个接口声明太重要了，应用场景太多了。因为需要返回值的我们用 Function，不需要返回值的，我们用它就可。

```java
Consumer<Person> greeter = (p) -> System.out.println("Hello, " + p.firstName);
greeter.accept(new Person("Luke", "Skywalker"));
```

看其源码，还有个默认方法 andThen：

```java
void accept(T t);
default Consumer<T> andThen(Consumer<? super T> after) {
    Objects.requireNonNull(after);
    return (T t) -> { accept(t); after.accept(t); };
}
```

andThen 可以实现消费两次。消费一次后，继续消费一次。

其他 Consumer 扩展接口：

- `BiConsumer`：void accept(T t, U u); 接受两个参数；
- `DoubleConsumer`：void accept(double value); 接受一个 double 参数；
- `IntConsumer`：void accept(int value); 接受一个 int 参数；
- `LongConsumer`：void accept(long value); 接受一个 long 参数；
- `ObjDoubleConsumer`：void accept(T t, double value); 接受一个泛型参数一个 double 参数；
- `ObjIntConsumer`：void accept(T t, int value); 接受一个泛型参数一个 int 参数；
- `ObjLongConsumer`：void accept(T t, long value); 接受一个泛型参数一个 long 参数；

### Predicates

Predicates 是包含一个参数的返回为布尔值的接口（断言接口），其默认方法也封装了 and、or 和 negate 逻辑和一个静态方法 isEqual。

```java
// and 方法接收一个 Predicate 类型，也就是将传入的条件和当前条件以并且的关系过滤数据。
default Predicate<T> and(Predicate<? super T> other) {
    Objects.requireNonNull(other);
    return (t) -> test(t) && other.test(t);
}

// or 方法同样接收一个 Predicate 类型，将传入的条件和当前的条件以或者的关系过滤数据
default Predicate<T> or(Predicate<? super T> other) {
    Objects.requireNonNull(other);
    return (t) -> test(t) || other.test(t);
}

// negate 就是将当前条件取反
default Predicate<T> negate() {
    return (t) -> !test(t);
}

static <T> Predicate<T> isEqual(Object targetRef) {
    return (null == targetRef)
            ? Objects::isNull
            : object -> targetRef.equals(object);
}
```

案例：

```java
public List<Integer> conditionFilterAnd(List<Integer> list, Predicate<Integer> predicate,Predicate<Integer> predicate2){
    return list.stream().filter(predicate.and(predicate2)).collect(Collectors.toList());
}

public List<Integer> conditionFilterOr(List<Integer> list, Predicate<Integer> predicate,Predicate<Integer> predicate2){
    return list.stream().filter(predicate.or(predicate2)).collect(Collectors.toList());
}
public List<Integer> conditionFilterNegate(List<Integer> list, Predicate<Integer> predicate){
    return list.stream().filter(predicate.negate()).collect(Collectors.toList());
}

//大于 5 并且是偶数
result = predicateTest.conditionFilterAnd(list, integer -> integer > 5, integer1 -> integer1 % 2 == 0);
result.forEach(System.out::println); // 6 8 10

// 大于 5 或者是偶数
result = predicateTest.conditionFilterOr(list, integer -> integer > 5, integer1 -> integer1 % 2 == 0);
result.forEach(System.out::println); // 2 4 6 8 9 10

// 条件取反
result = predicateTest.conditionFilterNegate(list,integer2 -> integer2 > 5);
result.forEach(System.out::println); // 1 2 3 4 5

// isEqual 方法返回类型也是 Predicate，也就是说通过 isEqual 方法得到的也是一个用来进行条件判断的函数式接口实例。而返回的这个函数式接口实例是通过传入的 targetRef 的 equals 方法进行判断的。Predicate 接口中的唯一一个静态方法。
System.out.println(Predicate.isEqual("test").test("test")); // true
System.out.println(Predicate.isEqual(null).test("test")); // false
System.out.println(Predicate.isEqual(null).test(null)); // true
System.out.println(Predicate.isEqual(1).test(new Integer(1))); // true
System.out.println(Predicate.isEqual(new Long(1)).test(new Integer(1))); // false
```

其他 Predicate 扩展接口：

- `BiPredicate`：boolean test(T t, U u); 接受两个参数的, 判断返回 bool；
- `DoublePredicate`：boolean test(double value); 入参为 double 的谓词函数；
- `IntPredicate`：boolean test(int value); 入参为 int 的谓词函数；
- `LongPredicate`：boolean test(long value); 入参为 long 的谓词函数；

### Functions

Functions 接口接受一个参数并且产生一个结果，是很上层的一个抽象。除了一个抽象方法 apply 外，提供了默认的 3 个 default 方法来链式组合不同的函数 compose，andThen 和 identity。

compose 和 andThen 的不同之处是函数执行的顺序不同。andThen 就是按照正常思维：先执行调用者，再执行入参的。然后 compose 是反着来的，这点需要注意。

```java
Function<Integer, Integer> times2 = i -> i * 2; // 加倍函数
Function<Integer, Integer> squared = i -> i * i; // 平方函数

System.out.println(times2.apply(4)); // 8
System.out.println(squared.apply(4)); // 16

System.out.println(times2.compose(squared).apply(4));  // 32   先4×4然后16×2, 先执行参数，再执行调用者
System.out.println(times2.andThen(squared).apply(4));  // 64   先4×2,然后8×8, 先执行调用者，再执行参数

// 看看这个例子 Function.identity() 构建出一个恒等式函数而已，方便方法的连缀 这就是它的唯一优点
System.out.println(Function.identity().compose(squared).apply(4));   // 16 先执行4*4,再执行identity 值不变
```

由 Function，可以扩展出高阶函数。如泛型中有个类型还是 Function，这种需要还是经常有的，所以 BiFunction 提供了二元函数的一个接口声明：

```java
// 二元函数没有 compose 能力，只是默认实现了 andThen。有了一元和二元函数，那么可以通过组合扩展出更多的函数可能。
BiFunction<Integer, Integer, Integer> biFunction = (x, y) -> x + y;
System.out.println(biFunction.apply(4, 5)); // 9
System.out.println(biFunction.andThen(x -> x + 10).apply(4, 5)); // 19
```

Function 相关扩展接口：

- `BiFunction`：R apply(T t, U u); 接受两个参数，返回一个值，代表一个二元函数；
- `DoubleFunction`：R apply(double value); 只处理 double 类型的一元函数；
- `ToDoubleFunction`：double applyAsDouble(T value); 返回 double 的一元函数；
- `ToDoubleBiFunction`：double applyAsDouble(T t, U u); 返回 double 的二元函数；
- `IntToLongFunction`：long applyAsLong(int value); 接受 int 返回 long 的一元函数；

### Operator

Operator 其实就是 Function，函数有时候也叫作算子。算子在 Java 8 中接口描述更像是函数的补充，和上面的很多类型映射型函数类似。它包含 UnaryOperator 和 BinaryOperator。分别对应单元算子和二元算子。

```java
UnaryOperator<Integer> unaryOperator = x -> x + 10;
BinaryOperator<Integer> binaryOperator = (x, y) -> x + y;

System.out.println(unaryOperator.apply(10)); // 20
System.out.println(binaryOperator.apply(5, 10)); // 15

// BinaryOperator 提供了两个默认的 static 快捷实现，帮助实现二元函数 min(x,y) 和 max(x,y)。
BinaryOperator<Integer> min = BinaryOperator.minBy(Integer::compare);
BinaryOperator<Integer> max = BinaryOperator.maxBy(Integer::compareTo);
System.out.println(min.apply(10, 20)); // 10
System.out.println(max.apply(10, 20)); // 20
```

## Method and Constructor References

方法引用（含构造方法引用），通常与 Lambda 表达式联合使用，可以直接引用已有 Java 类或对象的方法。一般有四种不同的方法引用：

1. 构造器引用。语法是 `Class::new`，或者更一般的 `Class<T>::new`，可无参，可有参数。方法签名保持一致；
2. 静态方法引用。语法是 `Class::static_method`，要求方法签名保持一致；
3. 特定类的任意对象方法引用。它的语法是 `Class::method`。要求方法签名保持一致；
4. 特定对象的方法引用，它的语法是 `instance::method`。要求方法签名保持一致。与 3 不同的地方在于，3 是在列表元素上分别调用方法，而 4 是在某个对象上调用方法，将列表元素作为参数传入；

上述的代码可以使用静态方法引用而更加的简化：

```java
Converter<String, Integer> converter = Integer::valueOf;
Integer converted = converter.convert("123");
System.out.println(converted);   // 123
```

类::new （构造器引用）:

```java
// Student.java
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class Student {

    private String stuName;
    private Integer stuAge;
    private Double stuGrade;

    // 单独写一个 只有一个参数的构造函数
    public Student(String stuName) {
        this.stuName = stuName;
    }

}

// Test.java
public static void main(String[] args) {
    // Supplier<Student> supp = () -> new Student(); // 原来写法
    // Function<String, Student> supp = (name) -> new Student(name); // 原来写法

    Supplier<Student> supp = Student::new; // 无参构造
    Function<String, Student>  funOneParam = Student::new; // 有参构造
    // 我们发现如果参数实在太多（超过3个），就不用使用构造函数引用了 (除非自定义一个函数式接口)
    // BiFunction<String,Integer,Function<Double,Student>> suppAllParam = Student::new; // 全参构造

    System.out.println(supp.get()); // Student(stuName=null, stuAge=null, stuGrade=null)
    System.out.println(funOneParam.apply("fsx")); // Student(stuName=fsx, stuAge=null, stuGrade=null)
}
```

类::实例方法：

```java
public static void main(String[] args) {
    Student stu = new Student("张三", 18, 85.0);
    // Supplier<String> supp = () -> stu.getStuName();  // 原来写法
    Supplier<String> supp = stu::getStuName;      // 使用方法引用
    System.out.println(supp.get()); // 张三
}
```

类::实例方法二：

```java
...
    public static void main(String[] args) {
        RequestTemplate requestTemplate  = new RequestTemplate();

        // 设置请求头，要求接口方法签名保持一致；
        setHeader(requestTemplate::header);
    }

    public static void setHeader(TracingSetter tracingSetter) {
        tracingSetter.set("X-GroupId", "1");
        tracingSetter.set("X-TracingId", "1");
    }

    /**
    * Tracing信息设置器
    */
    public interface TracingSetter {
        /**
        * 设置tracing属性
        *
        * @param key   key
        * @param value value
        */
        void set(String key, String value);
    }
```

## Lambda Scopes

从 Lambda 表达式中访问外部作用域中变量非常类似于匿名对象，可以访问本地的 final 变量、实例域以及静态变量。

### Accessing local variables

在匿名对象中，我们可以从 Lambda 表达式的域中访问外部的 final 变量。

```java
final int num = 1;
Converter<Integer, String> stringConverter =
        (from) -> String.valueOf(from + num);

stringConverter.convert(2);     // 3
```

但是不同于匿名对象只能访问 final 变量，Lambda 表达式中可以访问 final 变量：

```java
int num = 1;
Converter<Integer, String> stringConverter =
        (from) -> String.valueOf(from + num);

stringConverter.convert(2);     // 3
```

不过需要注意的是，尽管变量不需要声明为 final，但是也是隐式的不可变：

```java
// 以下写法就会被报错。
int num = 1;
Converter<Integer, String> stringConverter =
        (from) -> String.valueOf(from + num);
num = 3;
```

> Java 8 Lambda 表达式中为什么要求外部变量为 final ？
>
> > 这是由 Java 对 Lambda 表达式的实现决定的，在 Java 中 Lambda 表达式是匿名类语法上的进一步简化，其本质还是调用对象的方法。
> > 在 Java 中方法调用是值传递的，所以在 Lambda 表达式中对变量的操作都是基于原变量的副本，不会影响到原变量的值。
> > 综上，假定没有要求 Lambda 表达式外部变量为 final 修饰，那么开发者会误以为外部变量的值能够在 Lambda 表达式中被改变，而这实际是不可能的，所以要求外部变量为 final 是在编译期以强制手段确保用户不会在 Lambda 表达式中做修改原变量值的操作。
> > 另外，对 lambda 表达式的支持是拥抱函数式编程，而函数式编程本身不应为函数引入状态，从这个角度看，外部变量为 final 也一定程度迎合了这一特点。

### Accessing fields and static variables

不同于本地变量，我们可以在 Lambda 表达式中任意的读写：

```java
public class Lambda1 {
    static int outerStaticNum;
    int outerNum;

    void testScopes() {
        Converter<Integer, String> stringConverter1 = (from) -> {
            outerNum = 23;
            return String.valueOf(from);
        };

        Converter<Integer, String> stringConverter2 = (from) -> {
            outerStaticNum = 72;
            return String.valueOf(from);
        };
    }
}
```

### Accessing Default Interface Methods

注意，Lambda 表达式中是不可以访问默认方法的，下面代码是编译通不过的：

```java
Formula formula = (a) -> sqrt( a * 100);
```

### Lambda 表达式里面给外部变量赋值的问题

在 Lambda 中修改外部变量，会发现报错 Variable used in lambda expression should be final or effectively final。

前面也说了，这是因为Java会将外部变量的值作为参数传递给 Lambda 表达式，为 Lambda 表达式建立一个副本，它的代码访问的是这个副本，而不是外部声明变量。为什么非要建立副本呢，直接访问外部的变量得多方便呢？

答案是：这是不可能滴，因为外部变量定义在栈中，当 Lambda 表达式被执行的时候，外部变量可能已经被释放掉了。

一定要在 Lambda 表达式里面修改外部变量的值也是可以的，可以将变量定义为实例变量或放入数组、Map、AtomicReference等。

![2][2]

## Default Methods for Interfaces

Java 8 允许我们利用 default 关键字来向接口中添加非抽象的方法作为默认方法。所有实现这个接口的类都会接受默认方法的实现，除非子类提供的自己的实现。例如：

```java
// Formula.java
public interface Formula {
    double calculate(int a);

    default double sqrt(int a) {
        return Math.sqrt(a);
    }
}

// Test.jva
Formula formula = new Formula() {
    @Override
    public double calculate(int a) {
        return sqrt(a * 100);
    }
};

formula.calculate(100);     // 100.0
formula.sqrt(16);           // 4.0
```

我们还可以在接口中定义静态方法，使用 static 关键字，也可以提供实现。例如：

```java
 public interface StaticFunctionInterface {
     static String staticFunction() {
         return "static function";
     }
 }
```

> 接口的默认方法和静态方法的引入，其实可以认为引入了 C ＋＋中抽象类的理念，以后我们再也不用在每个实现类中都写重复的代码了。

## Annotations

在 Java 5 中使用注解有一个限制，即相同的注解在同一位置只能声明一次。Java 8 引 入重复注解，这样相同的注解在同一地方也可以声明多次。重复注解机制本身需要用 `@Repeatable` 注解。Java 8 在编译器层做了优化，相同注解会以集合的方式保存，因此底层的原理并没有变化。

```java
public @interface Hints {
    Hint[] value();
}

@Repeatable(Hints.class)
public @interface Hint {
    String value();
}
```

```java
// 以前的写法，Using the container annotation
@Hints({@Hint("hint1"), @Hint("hint2")})
public class Person {}

// java8 写法，Using repeatable annotations
@Hint("hint1")
@Hint("hint2")
public class Person {}

// Test.java
Hint hint = Person.class.getAnnotation(Hint.class);
System.out.println(hint); // null

Hints hints1 = Person.class.getAnnotation(Hints.class);
System.out.println(hints1.value().length); // 2

Hint[] hints2 = Person.class.getAnnotationsByType(Hint.class);
System.out.println(hints2.length); // 2

```

## 扩展注解的支持（类型注解）

Java 8 扩展了注解的上下文，几乎可以为任何东西添加注解，包括局部变量、泛型类、父类与接口的实现，连方法的异常也能添加注解。

```java
private @NotNull String name;
```

## JavaScript 引擎 Nashorn

Nashorn 允许在 JVM 上开发运行 JavaScript 应用，允许 Java 与 JavaScript 相互调用。

## Base64

在 Java 8 中，Base64 编码成为了 Java 类库的标准。Base64 类同时还提供了对 URL、MIME 友好的编码器与解码器。

Base64 是一种字符串编码格式，采用了 A-Z，a-z，0-9，“+”和“/”这 64 个字符来编码原始字符（还有垫字符“=”）。一个字符本身是一个字节，也就是 8 位，而 Base64 编码后的一个字符只能表示 6 位的信息。也就是原始字符串中的 3 字节的信息编码会变成 4 字节的信息。Base64 的主要作用是满足 MIME 的传输需求。

```java
public static void main(String[] args) {
    String orig = "hello world!";

    //编码加密
    String desc = Base64.getEncoder().encodeToString(orig.getBytes(StandardCharsets.UTF_8));
    System.out.println("加密后的字符串为:" + desc); 加密后的字符串为:aGVsbG8gd29ybGQh

    //解码解密
    String unDecodeStr=new String(Base64.getDecoder().decode(desc), StandardCharsets.UTF_8);
    System.out.println("解密后的字符串为" + unDecodeStr); // 解密后的字符串为hello world!
}
```

将文件 File 转换为 Base64：

```java
public static String fileToBase64(String path) {
    File file = new File(path);
    FileInputStream inputFile;
    try {
        inputFile = new FileInputStream(file);
        byte[] buffer = new byte[(int) file.length()];
        inputFile.read(buffer);
        inputFile.close();
        return Base64.getEncoder().encodeToString(buffer);
    } catch (Exception e) {
        throw new RuntimeException("文件路径无效\n" + e.getMessage());
    }
}
```

将 Base64 转换为 file 文件：

```java
public static boolean base64ToFile(String base64, String path) {
    byte[] buffer;
    try {
        buffer = Base64.getDecoder().decode(base64);
        FileOutputStream out = new FileOutputStream(path);
        out.write(buffer);
        out.close();
        return true;
    } catch (Exception e) {
        throw new RuntimeException("base64字符串异常或地址异常\n" + e.getMessage());
    }
}
```

Base64 的原理：

> 为什么会有 Base64 编码呢？因为有些网络传送渠道并不支持所有的字节，例如传统的邮件只支持可见字符的传送，像 ASCII 码的控制字符就 不能通过邮件传送。这样用途就受到了很大的限制，比如图片二进制流的每个字节不可能全部是可见字符，所以就传送不了。最好的方法就是在不改变传统协议的情 况下，做一种扩展方案来支持二进制文件的传送。把不可打印的字符也能用可打印字符来表示，问题就解决了。Base64 编码应运而生，Base64 就是一种 基于 64 个可打印字符来表示二进制数据的表示方法。

有一个数组，里面有“A-Z, a-z, 0-9 , + , /”一共 64 个字符。然后对需要处理的的二进制数据做处理：每 3 个字节（24bit）一组，因此按照 6bit 一组为 Base64 的规则可以划为 4 组，每组 6bit，刚好 64 位（对应数组的 64 个值）

> Base64 的码表只有 64 个字符，如果要表达 64 个字符的话，使用 6 的 bit 即可完全表示(2 的 6 次方为 64)。
> 如果是字符串转换为 Base64 码，会先把对应的字符串转换为 ascll 码表对应的数字，然后再把数字转换为 2 进制，比如 a 的 ascll 码味 97，97 的二进制是：01100001，把 8 个二进制提取成 6 个，剩下的 2 个二进制和后面的二进制继续拼接，最后再把 6 个二进制码转换为 Base64 对于的编码。

所以，Base64 编码会把 3 字节的二进制数据编码为 4 字节的文本数据，长度增加 33%，好处是编码后的文本数据可以在邮件正文、网页等直接显示。

如果要编码的二进制数据不是 3 的倍数，最后会剩下 1 个或 2 个字节怎么办？Base64 用 `\x00` 字节在末尾补足后，再在编码的末尾加上 1 个或 2 个`=`号，表示补了多少字节，解码的时候，会自动去掉。

java8 的 Api 提供了 Basic 编码、URL 编码、MIME 编码、对流的支持。

## Date/Time API (JSR 310)

Java 8 新的 Date-Time API (JSR 310) 受 Joda-Time 的影响，提供了新的 `java.time` 包，可以用来替代 `java.util.Date` 和 `java.util.Calendar`。一般会用到 Clock、LocaleDate、LocalTime、LocaleDateTime、ZonedDateTime、Duration 这些类，对于时间日期的改进还是非常不错的。

### Clock

`Clock` 方便我们去读取当前的日期与时间。Clocks 可以根据不同的时区来进行创建，并且可以作为`System.currentTimeMillis()` 的替代。这种指向时间轴的对象即是 Instant 类。Instants 可以被用于创建`java.util.Date` 对象。

```java
Clock clock = Clock.systemDefaultZone();
long millis = clock.millis();

Instant instant = clock.instant();
Date legacyDate = Date.from(instant);   // legacy java.util.Date
```

### Timezones

Timezones 以 ZoneId 来区分。可以通过静态构造方法很容易的创建，Timezones 定义了 Instants 与 `Local Dates` 之间的转化关系：

```java
System.out.println(ZoneId.getAvailableZoneIds());
// prints all available timezone ids

ZoneId zone1 = ZoneId.of("Europe/Berlin");
ZoneId zone2 = ZoneId.of("Brazil/East");
System.out.println(zone1.getRules());
System.out.println(zone2.getRules());

// ZoneRules[currentStandardOffset=+01:00]
// ZoneRules[currentStandardOffset=-03:00]
```

### LocalTime

`LocalTime` 代表了一个与时间无关的本地时间，譬如 `10pm` 或者 `17:30:15`。下述的代码展示了根据不同的时间轴创建的不同的本地时间：

```java
LocalTime now1 = LocalTime.now(zone1);
LocalTime now2 = LocalTime.now(zone2);

System.out.println(now1.isBefore(now2));  // false

long hoursBetween = ChronoUnit.HOURS.between(now1, now2);
long minutesBetween = ChronoUnit.MINUTES.between(now1, now2);

System.out.println(hoursBetween);       // -3
System.out.println(minutesBetween);     // -239
```

LocalTime 提供了很多的工厂方法来简化创建实例的步骤，以及对于时间字符串的解析：

```java
LocalTime late = LocalTime.of(23, 59, 59);
System.out.println(late);       // 23:59:59

DateTimeFormatter germanFormatter =
    DateTimeFormatter
        .ofLocalizedTime(FormatStyle.SHORT)
        .withLocale(Locale.GERMAN);

LocalTime leetTime = LocalTime.parse("13:37", germanFormatter);
System.out.println(leetTime);   // 13:37
```

### LocalDate

LocalDate 代表了一个独立的时间类型，譬如 `2014-03-11`。它是一个不可变的对象并且很类似于 LocalTime。下列代码展示了如何通过增减时间年月来计算日期：

```java
LocalDate today = LocalDate.now();
LocalDate tomorrow = today.plus(1, ChronoUnit.DAYS);
LocalDate yesterday = tomorrow.minusDays(2);

LocalDate independenceDay = LocalDate.of(2014, Month.JULY, 4);
DayOfWeek dayOfWeek = independenceDay.getDayOfWeek();
System.out.println(dayOfWeek);    // FRIDAY
```

从字符串解析得到 LocalDate 对象也像 LocalTime 一样简单：

```java
DateTimeFormatter germanFormatter =
    DateTimeFormatter
        .ofLocalizedDate(FormatStyle.MEDIUM)
        .withLocale(Locale.GERMAN);

LocalDate xmas = LocalDate.parse("24.12.2014", germanFormatter);
System.out.println(xmas);   // 2014-12-24
```

### LocalDateTime

LocalDateTime 代表了时间日期类型，它组合了上文提到的 Date 类型以及 Time 类型。LocalDateTime 同样也是一种不可变类型，很类似于 LocalTime 以及 LocalDate。

```java
LocalDateTime sylvester = LocalDateTime.of(2014, Month.DECEMBER, 31, 23, 59, 59);

DayOfWeek dayOfWeek = sylvester.getDayOfWeek();
System.out.println(dayOfWeek);      // WEDNESDAY

Month month = sylvester.getMonth();
System.out.println(month);          // DECEMBER

long minuteOfDay = sylvester.getLong(ChronoField.MINUTE_OF_DAY);
System.out.println(minuteOfDay);    // 1439

// 获取秒数
Long second = LocalDateTime.now().toEpochSecond(ZoneOffset.of("+8"));

// 获取毫秒数
Long timestamp = LocalDateTime.now().toInstant(ZoneOffset.of("+8")).toEpochMilli();

// 时间戳转换成 LocalDateTime
LocalDateTime time = LocalDateTime.ofEpochSecond(timestamp/1000, 0, ZoneOffset.ofHours(8));

// 时间转字符串格式化
DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");
String dateTime = LocalDateTime.now(ZoneOffset.of("+8")).format(formatter);

// 字符串转时间
String dateTimeStr = "2020-05-01 17:10:10";
DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
LocalDateTime dateTime = LocalDateTime.parse(dateTimeStr, df)

// 将java.util.Date 转换为 java.time.LocalDateTime, 默认时区为东8区
// dateConvertToLocalDateTime
date.toInstant().atOffset(ZoneOffset.of("+8")).toLocalDateTime();

// 将 java.time.LocalDateTime 转换为 java.util.Date, 默认时区为东8区
// localDateTimeConvertToDate
Date.from(localDateTime.toInstant(ZoneOffset.of("+8")))
```

上文中提及的 Instant 也可以用来将时间根据时区转化：

```java
Instant instant = sylvester
        .atZone(ZoneId.systemDefault())
        .toInstant();

Date legacyDate = Date.from(instant);
System.out.println(legacyDate);     // Wed Dec 31 23:59:59 CET 2014
```

从格式化字符串中解析获取到数据对象，也是非常简单：

```java
DateTimeFormatter formatter =
    DateTimeFormatter
        .ofPattern("MMM dd, yyyy - HH:mm");

LocalDateTime parsed = LocalDateTime.parse("Nov 03, 2014 - 07:13", formatter);
String string = formatter.format(parsed);
System.out.println(string);     // Nov 03, 2014 - 07:13
```

## Optional

Java 8 引入 Optional 类来防止空指针异常，Optional 类最先是由 Google 的 Guava 项目引入的。Optional 类实际上是个容器：它可以保存类型 T 的值，或者保存 null。使用 Optional 类我们就不用显式进行空指针检查了。

### 创建一个 Optional

Optional 本质是一个容器，需要我们将对象实例传入该容器中。Optional 的构造方法为 private，无法直接使用 new 构建对象，只能使用 Optional 提供的静态方法创建。

Optional 三个创建方法如下：

- `Optional.of(obj)`,如果对象为 null，将会抛出 NPE。
- `Optional.ofNullable(obj)`, 如果对象为 null, 将会创建不包含值的 empty Optional 对象实例。
- `Optional.empty()` 等同于 `Optional.ofNullable(null)`

只有在确定对象不会为 null 的情况使用 `Optional.of`，否则建议使用 `Optional.ofNullable`方法。

### get 与 isPresent

对象实例存入 Optional 容器中之后，最后我们需要从中取出。`Optional.get` 方法用于取出内部对象实例，不过需要注意的是，如果是 empty Optional 实例，由于容器内没有任何对象实例，使用 get 方法将会抛出 `NoSuchElementException` 异常。

为了防止异常抛出，可以使用 `Optional.isPresent`。这个方法将会判断内部是否存在对象实例，若存在则返回 true。

示例代码如下:

```java
Optional<Company> optCompany = Optional.ofNullable(company);

// 与直接使用空指针判断没有任何区别
if (optCompany.isPresent()) {
    System.out.println(optCompany.get().getName());
}
```

仔细对比，可以发现上面用法与空指针检查并无差别。刚接触到 Optional ，看到很多文章介绍这个用法，那时候一直很疑惑，这个解决方案不是更加麻烦？其实这个是不建议使用的，应使用 Java8 Stream API。

### ifPresent

通常情况下，空指针检查之后，如果对象不为空，将会进行下一步处理，比如打印该对象。

```java
Company company = ...;
if(company != null){
    System.out.println(company);
}
```

上面代码我们可以使用 `Optional.ifPresent` 代替，如下所示：

```java
Optional<Company> optCompany = ...;
optCompany.ifPresent(System.out::println);
```

使用 ifPresent 方法，我们不用再显示的进行检查，如果 Optional 为空，上面例子将不再输出。

### filter

有时候我们需要某些属性满足一定条件，才进行下一步动作。这里假设我们当 Company name 属性为 Apple，打印输出 ok。

```java
if (company != null && "Apple".equals(company.getName())) {
    System.out.println("ok");
}
```

下面使用 `Optional.filter` 结合 `Optional.ifPresent` 重写上面的代码，如下所示：

```java
Optional<Company> companyOpt=...;
companyOpt
        .filter(company -> "Apple".equals(company.getName()))
        .ifPresent(company -> System.out.println("ok"));
```

filter 方法将会判断对象是否符合条件。如果不符合条件，将会返回一个空的 Optional 。

### orElse 与 orElseThrow

当一个对象为 null 时，业务上通常可以设置一个默认值，从而使流程继续下去。

```java
String name = company != null ? company.getName() : "Unknown";
```

或者抛出一个内部异常，记录失败原因，快速失败。

```java
if (company.getName() == null) {
    throw new RuntimeException();
}
```

Optional 类提供两个方法 orElse 与 orElseThrow ，可以方便完成上面转化。

```java
// 设置默认值
String name = companyOpt.orElse(new Company("Unknown")).getName();

// 抛出异常
String name = companyOpt.orElseThrow(RuntimeException::new).getName();
```

如果 Optional 为空，提供默认值或抛出异常。

### map 与 flatMap 函数隆重登场

map 应该是最常用的了，先上示例：

```java
// map
String result = Optional.ofNullable(user)
    .map(User::getName)
    .orElseThrow(() -> new BusinessException("xxx"));

// flatMap
String result = Optional.ofNullable(user)
    .flatMap(User::getAddress)
    .flatMap(Address::getCountry)
    .map(Country::getIsocode)
    .orElse("default");
```

map(Function)：对 Optional 中保存的值进行函数运算，并返回新的 Optional(可以是任何类型)。

flatMap()：功能与 map() 相似具体区别请参考 Stream API，其实就是把多维数组扁平化为一维。

### 代替三目运算

Optional 还有一个作用，三目运算符，可以代替三目运算符从而支持方法连缀。

```java
public static void main(String[] args) {
    System.out.println(Optional.ofNullable("demo").orElse("a")); //demo
    System.out.println(Optional.ofNullable(null).orElse("a")); //a

    //或者 使用supplier生产
    System.out.println(Optional.ofNullable(null).orElseGet(() -> "abc")); //abc

    //此处会直接抛出空指针异常
    //Optional<String> s = Optional.<String>of(null); //java.lang.NullPointerException

    //s可以直接使用，是empty，但是不能get，请配合isPresent()使用
    //Optional<String> s = Optional.<String>ofNullable(null);
    //System.out.println(s); //Optional.empty
    //System.out.println(s.get()); //java.util.NoSuchElementException: No value present

    //对它进行map操作，我们发现即使为null，我们map方法的x.toString()并没有报错  可谓非常友好
    //Optional<String> s = Optional.<String>ofNullable(null).map(x -> x.toString());
    //System.out.println(s); //Optional.empty
    //System.out.println(s.get()); //java.util.NoSuchElementException: No value present


    ////////////综上，我们可以经常这么来使用，可以很好的达到方法连缀的效果////////////
    //1、非常简单的三目运算符  如果是null，就返回1  否则返回里面的值
    Integer v = Optional.<Integer>ofNullable(null).orElse(1);
    System.out.println(v); //1

    //2、三目运算符  结合map  可以实现类型的转换 非常安全且强大
    Integer vvv = Optional.<String>ofNullable(null).map(x -> Integer.valueOf(x)).orElse(100);
    System.out.println(vvv); //100
}
```

## Stream

Stream API 是把真正的函数式编程风格引入到 Java 中。其实简单来说可以把 Stream 理解为 MapReduce，当然 Google 的 MapReduce 的灵感也是来自函数式编程。它其实是一连串支持连续、并行聚集操作的元素。从语法上看，也很像 Linux 的管道、或者链式编程，代码写起来简洁明了，非常酷帅！

一个流式处理可以分为三个部分：转换成流、中间操作、终端操作。以集合为例，一个流式处理的操作我们首先需要调用 stream()函数将其转换成流，然后再调用相应的中间操作达到我们需要对集合进行的操作，比如筛选、转换等，最后通过终端操作对前面的结果进行封装，返回我们需要的形式。

### 对流的操作概述

流的操作类型分为两种中间操作和终端操作。区分是不是中间操作基本看返回值是 `Stream<T>` 就是中间操作了。

#### Intermediate（中间操作）

一个流可以后面跟随零个或多个 intermediate 操作。其目的主要是打开流，做出某种程度的数据映射/过滤，然后返回一个新的流，交给下一个操作使用。这类操作都是惰性化的（lazy），就是说，仅仅调用到这类方法，并没有真正开始流的遍历。

> map (mapToInt, flatMap 等)、 filter、 distinct、 sorted、 peek、 limit、 skip、 parallel、 sequential、 unordered

#### Terminal（终端操作）

一个流只能有一个 terminal 操作，当这个操作执行后，流就被使用“光”了，无法再被操作。所以这必定是流的最后一个操作。Terminal 操作的执行，才会真正开始流的遍历，并且会生成一个结果，或者一个 side effect。

> forEach、 forEachOrdered、 toArray、 reduce、 collect、 min、 max、 count、 anyMatch、 allMatch、 noneMatch、 findFirst、 findAny、 iterator

#### short-circuiting（短路操作）

- 对于一个 intermediate 操作，如果它接受的是一个无限流，它可以返回一个有限的新 Stream；
- 对于一个 terminal 操作，如果它接受的是一个无限流，但能在有限的时间计算出结果；

> anyMatch、 allMatch、 noneMatch、 findFirst、 findAny、 limit

### 实例数据源

```java
public class Data {
    private static List<PersonModel> list = null;

    static {
        PersonModel wu = new PersonModel("wu qi", 18, "男");
        PersonModel zhang = new PersonModel("zhang san", 19, "男");
        PersonModel wang = new PersonModel("wang si", 20, "女");
        PersonModel zhao = new PersonModel("zhao wu", 20, "男");
        PersonModel chen = new PersonModel("chen liu", 21, "男");
        list = Arrays.asList(wu, zhang, wang, zhao, chen);
    }

    public static List<PersonModel> getData() {
        return list;
    }
}
```

### Filter

Filter 会接受一个 Predicate 对象来过滤流中的元素，这个操作属于媒介操作，譬如可以在该操作之后调用另一个流操作(forEach)。ForEach 操作属于终止操作，接受一个 Consumer 对象来对于过滤之后的流中的每一个元素进行操作。

```java
/**
 * 过滤所有的男性
 */
public static void fiterSex(){
    List<PersonModel> data = Data.getData();

    // old
    List<PersonModel> temp=new ArrayList<>();
    for (PersonModel person:data) {
        if ("男".equals(person.getSex())){
            temp.add(person);
        }
    }
    System.out.println(temp);

    // new
    List<PersonModel> collect = data
            .stream()
            .filter(person -> "男".equals(person.getSex()))
            .collect(toList());
    System.out.println(collect);
}

/**
 * 过滤所有的男性 并且小于20岁
 */
public static void fiterSexAndAge(){
    List<PersonModel> data = Data.getData();

    // old
    List<PersonModel> temp=new ArrayList<>();
    for (PersonModel person:data) {
        if ("男".equals(person.getSex())&&person.getAge()<20){
            temp.add(person);
        }
    }

    // new 1
    List<PersonModel> collect = data
            .stream()
            .filter(person -> {
                if ("男".equals(person.getSex())&&person.getAge()<20){
                    return true;
                }
                return false;
            })
            .collect(toList());
    // new 2
    List<PersonModel> collect1 = data
            .stream()
            .filter(person -> ("男".equals(person.getSex())&&person.getAge()<20))
            .collect(toList());

}

/**
 * stream 根据对象字段去重
 */
private <T> Predicate<T> distinctByKey(Function<? super T, ?> keyExtractor) {
    Set<Object> seen = ConcurrentHashMap.newKeySet();
    return t -> seen.add(keyExtractor.apply(t));
}

/**
 * stream 根据对象字段去重 Demo
 */
List<PersonModel> data = Data.getData();
data.filter(distinctByKey(PersonModel::getId))
    .forEach(person -> {
        log.info("{}", person);
    });
```

### Map

map 操作也是媒介操作的一种，可以通过给定的函数将每个元素映射到其他对象。下面的代码示例就是将所有的字符串转化为大写字符串。不过 map 操作是可以将任意对象转化为任意类型，流返回的泛型类型取决于传递给 map 的函数的返回值。

```java
/**
 * 取出所有的用户名字
 */
public static void getUserNameList(){
    List<PersonModel> data = Data.getData();

    // old
    List<String> list=new ArrayList<>();
    for (PersonModel persion:data) {
        list.add(persion.getName());
    }
    System.out.println(list);

    // new 1
    List<String> collect = data.stream().map(person -> person.getName()).collect(toList());
    System.out.println(collect);

    // new 2
    List<String> collect1 = data.stream().map(PersonModel::getName).collect(toList());
    System.out.println(collect1);

    // new 3
    List<String> collect2 = data.stream().map(person -> {
        System.out.println(person.getName());
        return person.getName();
    }).collect(toList());
}
```

### FlatMap

顾名思义，跟 map 差不多,更深层次的操作, Map 每个输入元素，都按照规则转换成为另外一个元素。还有一些场景，是一对多映射关系的，这时需要 flatMap。

map 和 flatMap 的区别：我个人认为，flatMap 的可以处理更深层次的数据，入参为多个 list，结果可以返回为一个 list，而 map 是一对一的，入参是多个 list，结果返回必须是多个 list。通俗的说，如果入参都是对象，那么 flatMap 可以操作对象里面的对象，而 map 只能操作第一层。

```java
public static void flatMapString() {
    List<PersonModel> data = Data.getData();

    //返回类型不一样
    List<String> collect = data.stream()
            .flatMap(person -> Arrays.stream(person.getName().split(" "))).collect(toList());

    List<Stream<String>> collect1 = data.stream()
            .map(person -> Arrays.stream(person.getName().split(" "))).collect(toList());

    //用map实现
    List<String> collect2 = data.stream()
            .map(person -> person.getName().split(" "))
            .flatMap(Arrays::stream).collect(toList());
    //另一种方式
    List<String> collect3 = data.stream()
            .map(person -> person.getName().split(" "))
            .flatMap(str -> Arrays.asList(str).stream()).collect(toList());
}
```

### Reduce

该操作根据指定的方程对于流中的元素进行了指定的减少的操作。结果是 Optional 类型。类似递归，说不明白看图吧。

![reduce][1]

```java
 public static void reduceTest(){
    // 累加，初始化值是 10
    Integer reduce = Stream.of(1, 2, 3, 4)
            .reduce(10, (count, item) ->{
        System.out.println("count:"+count);
        System.out.println("item:"+item);
        return count + item;
    });
    System.out.println(reduce);

    Integer reduce1 = Stream.of(1, 2, 3, 4)
            .reduce(0, (x, y) -> x + y);
    System.out.println(reduce1);

    String reduce2 = Stream.of("1", "2", "3")
            .reduce("0", (x, y) -> (x + "," + y));
    System.out.println(reduce2);
}
```

### Collect

collect 在流中生成列表，map，等常用的数据结构

```java
/**
 * toList
 */
public static void toListTest(){
    List<PersonModel> data = Data.getData();
    List<String> collect = data.stream()
            .map(PersonModel::getName)
            .collect(Collectors.toList());
}

/**
 * toSet
 */
public static void toSetTest(){
    List<PersonModel> data = Data.getData();
    Set<String> collect = data.stream()
            .map(PersonModel::getName)
            .collect(Collectors.toSet());
}

/**
 * toMap
 */
public static void toMapTest(){
    List<PersonModel> data = Data.getData();
    Map<String, Integer> collect = data.stream()
            .collect(
                    Collectors.toMap(PersonModel::getName, PersonModel::getAge)
            );

    data.stream()
            .collect(Collectors.toMap(per->per.getName(), value->{
        return value+"1";
    }));
}

/**
 * 指定类型
 */
public static void toTreeSetTest(){
    List<PersonModel> data = Data.getData();
    TreeSet<PersonModel> collect = data.stream()
            .collect(Collectors.toCollection(TreeSet::new));
    System.out.println(collect);
}

/**
 * 分组
 */
public static void toGroupTest(){
    List<PersonModel> data = Data.getData();
    Map<Boolean, List<PersonModel>> collect = data.stream()
            .collect(Collectors.groupingBy(per -> "男".equals(per.getSex())));
    System.out.println(collect);
}

/**
 * 分隔
 */
public static void toJoiningTest(){
    List<PersonModel> data = Data.getData();
    String collect = data.stream()
            .map(personModel -> personModel.getName())
            .collect(Collectors.joining(",", "{", "}"));
    System.out.println(collect);
}

/**
 * 自定义
 */
public static void reduce(){
    List<String> collect = Stream.of("1", "2", "3").collect(
            Collectors.reducing(new ArrayList<String>(), x -> Arrays.asList(x), (y, z) -> {
                y.addAll(z);
                return y;
            }));
    System.out.println(collect);
}
// 转换成新对象
List<NewObj> = oldObj.stream().collect(ArrayList::new, (l, o) -> {
    NewObj obj = new NewObj()
    obj.setName(o.getName());
    // ...
    l.add(obj);
}, List::addAll);
```

### Match

Java 8 提供了一些列的匹配的终止操作符来帮助开发者判断流当中的元素是否符合某些判断规则。所有的匹配类型的操作都会返回布尔类型。

- `anyMatch` 表示，判断的条件里，任意一个元素成功，返回 true；
- `allMatch` 表示，判断条件里的元素，所有的都是，返回 true；
- `noneMatch` 跟 `allMatch` 相反，判断条件里的元素，所有的都不是，返回 true；

```java
List<String> stringCollection = Arrays.asList("a", "a", "a", "a", "b");

boolean anyStartsWithA =
    stringCollection
        .stream()
        .anyMatch((s) -> s.startsWith("a"));

System.out.println(anyStartsWithA);      // true

boolean allStartsWithA =
    stringCollection
        .stream()
        .allMatch((s) -> s.startsWith("a"));

System.out.println(allStartsWithA);      // false

boolean noneStartsWithZ =
    stringCollection
        .stream()
        .noneMatch((s) -> s.startsWith("z"));

System.out.println(noneStartsWithZ);      // true
```

### 并发

stream 替换成 parallelStream 或 parallel

```java
// 根据数字的大小，有不同的结果
private static int size = 10000000;
public static void main(String[] args) {
    System.out.println("-----------List-----------");
    testList();
    System.out.println("-----------Set-----------");
    testSet();
}

/**
 * 测试list
 */
public static void testList(){
    List<Integer> list = new ArrayList<>(size);
    for (Integer i = 0; i < size; i++) {
        list.add(new Integer(i));
    }

    List<Integer> temp1 = new ArrayList<>(size);
    // old
    long start=System.currentTimeMillis();
    for (Integer i: list) {
        temp1.add(i);
    }
    System.out.println(+System.currentTimeMillis()-start);

    // 同步
    long start1=System.currentTimeMillis();
    list.stream().collect(Collectors.toList());
    System.out.println(System.currentTimeMillis()-start1);

    // 并发
    long start2=System.currentTimeMillis();
    list.parallelStream().collect(Collectors.toList());
    System.out.println(System.currentTimeMillis()-start2);
}

/**
 * 测试set
 */
public static void testSet(){
    List<Integer> list = new ArrayList<>(size);
    for (Integer i = 0; i < size; i++) {
        list.add(new Integer(i));
    }

    Set<Integer> temp1 = new HashSet<>(size);
    // old
    long start=System.currentTimeMillis();
    for (Integer i: list) {
        temp1.add(i);
    }
    System.out.println(+System.currentTimeMillis()-start);

    // 同步
    long start1=System.currentTimeMillis();
    list.stream().collect(Collectors.toSet());
    System.out.println(System.currentTimeMillis()-start1);

    // 并发
    long start2=System.currentTimeMillis();
    list.parallelStream().collect(Collectors.toSet());
    System.out.println(System.currentTimeMillis()-start2);
}

public static void main(String[] args) {
    List<Integer> list = new ArrayList<>();
    for (int i = 0; i < 5000; i++) {
        list.add(i);
    }
    Integer a = 1000;
    //无顺序的打印
    list.parallelStream().filter(mm -> mm < 1000).forEach(System.out::println);
    //按list原有的顺序输出。collect(Collectors.toList())后得到的集合是按原来的顺序输出的
    list.parallelStream().filter(mm -> !a.equals(mm)).collect(Collectors.toList()).forEach(System.out::println);
    //stream().parallel()与parallelStream()效果一样，都会无顺序的打印
    list.stream().parallel().forEach(System.out::println);
}



/**
* 批量操作，分割集合
*
* @param oriList    要分割的集合
* @param size       每批处理大小
* @param isParallel 是否启用并行流
* @param <T>        数据类型
* @return 分割后的集合
*/
public static <T> List<List<T>> splitList(List<T> oriList, int size, boolean isParallel) {
    // 未达到批量上限，不做分割处理
    if (oriList.size() <= size) {
        List<List<T>> splitList = new ArrayList<>();
        splitList.add(oriList);
        return splitList;
    }

    // 计算分割数量
    int limit = (oriList.size() + size - 1) / size;

    // 并行流处理分割
    if (isParallel) {
        return Stream.iterate(0, n -> n + 1)
            .limit(limit)
            .parallel()
            .map(a -> oriList.stream()
                .skip(a * size)
                .limit(size)
                .parallel()
                .collect(Collectors.toList()))
            .collect(Collectors.toList());
    } else {
        final List<List<T>> splitList = new ArrayList<>();
        Stream.iterate(0, n -> n + 1).limit(limit).forEach(i -> {
            splitList.add(oriList.stream().skip(i * size).limit(size).collect(Collectors.toList()));
        });
        return splitList;
    }
}
```

### peek（调试）

通过 peek 可以查看每个值，同时能继续操作流

```java
private static void peekTest() {
    List<PersonModel> data = Data.getData();

    //peek打印出遍历的每个per
    data.stream().map(per->per.getName()).peek(p->{
        System.out.println(p);
    }).collect(toList());
}
```

### forEach

```java
    /**
     * forEach 增强
     *
     * @param <T>
     * @param startIndex 开始遍历的索引
     * @param elements   集合
     * @param action
     */
    public static <T> void forEach(int startIndex, Iterable<? extends T> elements, BiConsumer<Integer, ? super T> action) {
        Objects.requireNonNull(elements);
        Objects.requireNonNull(action);
        if (startIndex < 0) {
            startIndex = 0;
        }
        int index = 0;
        for (T element : elements) {
            index++;
            if (index <= startIndex) {
                continue;
            }

            action.accept(index - 1, element);
        }
    }


    /**
    * 统计集合中每个元素出现的所有位置
    */
    public static Map<String, List<Integer>> getElementPositions(List<String> list) {
        Map<String, List<Integer>> positionsMap = new HashMap<>();

        for (int i = 0; i < list.size(); i++) {
            positionsMap.computeIfAbsent(list.get(i), k -> new ArrayList<>(1)).add(i);
        }

        return positionsMap;
    }
```

```java
import java.util.Objects;
import java.util.function.BiConsumer;

/**
 * Iterable 的工具类
 */
public class Iterables {

    public static <E> void forEach(
            Iterable<? extends E> elements, BiConsumer<Integer, ? super E> action) {
        Objects.requireNonNull(elements);
        Objects.requireNonNull(action);

        int index = 0;
        for (E element : elements) {
            action.accept(index++, element);
        }
    }
}
```

用 Iterables.forEach 改写 getElementPositions方法：

```java
public static Map<String, List<Integer>> getElementPositions(List<String> list) {
    Map<String, List<Integer>> positionsMap = new HashMap<>();

    Iterables.forEach(list, (index, str) -> {
        positionsMap.computeIfAbsent(str, k -> new ArrayList<>(1)).add(index);
    });

    return positionsMap;
}

public static void main(String[] args) throws Exception {
    List<String> list = Arrays.asList("a", "b", "b", "c", "c", "c", "d", "d", "d", "f", "f", "g");

    System.out.println("使用 computeIfAbsent 和 Iterable.forEach：");
    Map<String, List<Integer>> elementPositions = getElementPositions(list);
    System.out.println(elementPositions);
}
```

## 参考

- [java8 tutorial](https://github.com/winterbe/java8-tutorial)
- [java8 stream](https://docs.oracle.com/javase/8/docs/api/java/util/stream/package-summary.html)
- [java8-Stream 集合操作快速上手](https://www.jianshu.com/p/9fe8632d0bc2)

[1]: /images/java/java8/reduce.png
[2]: /images/java/java8/2.jpg
