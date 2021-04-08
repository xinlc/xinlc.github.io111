
## 类修饰符访问级别

修饰符 | 当前类 | 同包 | 子类 | 其他包
----|----|----|----|----
public | √ | √ | √ | √
protected | √ | √ | √ | ×
default | √ | √ | × | ×
private | √ | × | × | ×

## 逻辑分页

```java
// freightTemplateResList 是所有数据

if (0 == freightTemplateResList.size()) {
    supFreightTemplateRes.setNum(0);
    supFreightTemplateRes.setFreightTemplateResList(freightTemplateResList);
  } else {
    supFreightTemplateRes.setNum(freightTemplateResList.size());
    Integer pageSize = freightTemplatePageVo.getLimit();
    Integer pageNum = freightTemplatePageVo.getPage();
    // 总条数
    Integer count = freightTemplateResList.size();

    // 页数
    Integer pageCount = 0;
    if (count % pageSize == 0) {
      pageCount = count / pageSize;
    } else {
      pageCount = count / pageSize + 1;
    }

    // 开始索引
    int fromIndex = 0;

    // 结束索引
    int toIndex = 0;
    if (!pageNum.equals(pageCount)) {
      fromIndex = (pageNum - 1) * pageSize;
      toIndex = fromIndex + pageSize;
    } else {
      fromIndex = (pageNum - 1) * pageSize;
      toIndex = count;
    }
    supFreightTemplateRes.setFreightTemplateResList(freightTemplateResList.subList(fromIndex, toIndex));
  }
```

## 什么是 maven的uber-jar（FatJar）

在maven的一些文档中我们会发现 "uber-jar"这个术语，许多人看到后感到困惑。其实在很多编程语言中会把super叫做uber （因为suber可能是关键字）， 这是上世纪80年代开始流行的，比如管superman叫uberman。所以uber-jar从字面上理解就是super-jar，这样的jar不但包含自己代码中的class ，也会包含一些第三方依赖的jar，也就是把自身的代码和其依赖的jar全打包在一个jar里面了，所以就很形象的称其为super-jar ，呵呵，uber-jar来历就是这样的。


## 六大原则

- 开闭原则：对扩展开放，对修改关闭。
- 里氏代换原则：子类都可以做到代替基类的出现。
- 依赖倒转原则：针对接口编程，依赖于抽象而非具体。
- 接口隔离原则：使用多个隔离的接口，比使用单个接口要好。（降低类之间的耦合度）
- 单一职责：一个类应该只有一个引起它变化的原因,一个职责。
- 迪米特法则（最少知道原则）：一个实体应当尽量少地与其他实体之间发生相互作用。

## 23种设计模式

总体来说23种设计模式分为三大类：

- 创建型模式（5种）：工厂方法模式、抽象工厂模式、单例模式、建造者模式、原型模式。
- 结构型模式（7种）：适配器模式、装饰器模式、代理模式、外观模式、桥接模式、组合模式、享元模式。
- 行为型模式（11种）：策略模式、模板方法模式、观察者模式、迭代子模式、责任链模式、命令模式、备忘录模式、状态模式、访问者模式、中介者模式、解释器模式。

## java 泛型真的会被擦除么？

1. 泛型**不止在编译阶段生效，部分泛型可以在运行阶段获取**
2. java 语言尝试将所有**能确定的**泛型信息**记录在类文件中**
3. java 对象中不记录泛型信息（hotspot），仅存储对象头和成员变量值

### 泛型简介

泛型是一种 java 语言特性，主要用于规范用户输入（参数化类型），可以分为**常规泛型和泛型方法两种**。通配符增加了泛型灵活性，实现引用赋值的逆变和协变，由 **extends 和 super** 定义。

java 语言**不强依赖泛型**，一段代码删除所有泛型，稍作改造后依然能正常执行（兼容性），但使用泛型可以获得以下好处：

1. **实现 java 类型安全**，相当于用户提供泛型信息，编译器帮用户做类型校验，减少用户错误编码造成的类型异常（例如不能向 `List <String>` 定义的集合里添加 Integer 类型元素）
2. **隐含类型转换**，代码简洁（泛型赋值时，自动添加 checkcast 字节码做类型校验）
3. **预支公共类方法**，使用 extends 通配符修饰的泛型，能使用上边界类型的方法
4. **类型联动**，声明的泛型变量可以同时作用于成员变量、入参、返回值，形成类型联动（和宏很像）

### 被擦除的泛型

泛型被擦除的一个典型例证，是可以使用反射技术**向泛型集合添加非泛型允许类型元素**。

例如向 `ArrayList<String>` 中插入 Integer 变量。

```java
public static void main(String[] args) throws Throwable {
    ArrayList<String> strings = new ArrayList<>();
    Method method = ArrayList.class.getDeclaredMethod("add", Object.class);
    method.invoke(strings, 1);
    for (Object element : strings) {
        System.out.println(element.getClass());
    }
}
```

输出：

```java
class java.lang.Integer
```

### 被擦除到上边界的泛型

**声明泛型的类**在编译后被擦除到上边界，这也支撑了 extends 通配符预支公共方法。

例如以下代码：

```java
public class MainTest2<T extends Number> {

    private T field;

    public T function(T value) {
        return value;
    }
}
```

使用 jad 反编译后变成：

```java
public class MainTest2 {
    
    private Number field;

    public Number function(Number value) {
        return value;
    }
}
```

使用 javap -v 反编译：

```java
public T function(T);
    descriptor: (Ljava/lang/Number;)Ljava/lang/Number;
    flags: ACC_PUBLIC
    Code:
      ...
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0       2     0  this   Lcom/learn/test/MainTest2;
            0       2     1 value   Ljava/lang/Number;
      LocalVariableTypeTable:
        Start  Length  Slot  Name   Signature
            0       2     0  this   Lcom/learn/test/MainTest2<TT;>;
            0       2     1 value   TT;
    Signature: #20                          // (TT;)TT;
```

> ps. 没有被 extends 通配符修饰的泛型被擦除到 Object。

这种对声明类的擦除机制**没有丢失信息且合情合理**，因为声明类并不限制实际对象具体使用何种类型。

```java
声明泛型的类：public class ArrayList<E> {} 被擦除到上边界
对象1：list1 = new ArrayList<String>();
对象2：list2 = new ArrayList<Integer>();
```

### 未被擦除的泛型

**父类泛型、成员变量、方法入参和返回值**使用到的泛型信息**都会保留**，并能在运行阶段获取。

如下结构的类：

```java
public class Clazz extends ArrayList<String> {
    public Map<String, Integer> field;

    public Set<String> function(List<Number> list) {
        return null;
    }
}
```

获取泛型的逻辑：

```java
public static void main(String[] args) throws Exception {
    // 获取父类泛型
    System.out.println("GenericSuperclass:" + ((ParameterizedType) (Clazz.class.getGenericSuperclass())).getActualTypeArguments()[0]);
    // 获取成员变量泛型
    Field field = Clazz.class.getDeclaredField("field");
    for (Type fieldType : ((ParameterizedType) (field.getGenericType())).getActualTypeArguments()) {
        System.out.println("field:" + fieldType.getTypeName());
    }
    // 获取方法入参和返回值泛型
    Method method = Clazz.class.getDeclaredMethod("function", List.class);
    for (Type type : method.getGenericParameterTypes()) {
        System.out.println("method param:" + ((ParameterizedType) type).getActualTypeArguments()[0]);
    }
    System.out.println("method return:" + ((ParameterizedType) method.getGenericReturnType()).getActualTypeArguments()[0]);
}
```

输出结果：

```java
GenericSuperclass:class java.lang.String
field:java.lang.String
field:java.lang.Integer
method param:class java.lang.Number
method return:class java.lang.String
```

由此可见，java 类定义中使用的泛型，都被做为类信息的一部分记录在类文件中，并提供反射方法在运行时获取。fastjson 反序列化借助了父类泛型：

```java
List<String> list = JSON.parseObject(json, new TypeReference<List<String>>(){});
```

这里构造了 TypeReference 的匿名内部类，父类是 `TypeReference<List<String>>`。

会将此匿名内部类单独生成一个class文件，命名规则如下：主类＋$＋(1,2,3....)，可以看编译后的会有多个 class 文件

创建的匿名内部类 `new TypeReference<Map<String,StudentEntity>>(){}`，在生成的的class文件中，编译器默认为`TypeReference`中的泛型`Map<String,StudentEntity>`原始类型，并不会进行擦除！类似于 我们实际创建一个类 `Class TypeReference<Map<String,StudentEntity>>{}`、 `Class Test<T>{}` 一样，在编译后 `Map`、`T` 依旧会存在！

由此，对于java泛型的“擦除”并不能一概而论，在运行期间，如果方法中出现带泛型的匿名内部类，那么泛型依旧会被保留下来，我们可以通过对应的方法获取到实际的泛型类型！

### 局部变量泛型

局部变量泛型是否能被获取呢？

```java
public void function() {
    List<String> list = new ArrayList<>();
}
```

就目前所知，上述代码中局部变量 list 的泛型**无法获取**，是否能说明局部变量泛型被擦除了？

使用 javap 反编译：

```java
public void function();
    descriptor: ()V
    flags: ACC_PUBLIC
    ...
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0       9     0  this   Lcom/learn/test/MainTest2;
            8       1     1  list   Ljava/util/List;
      LocalVariableTypeTable:
        Start  Length  Slot  Name   Signature
            0       9     0  this   Lcom/learn/test/MainTest2<TT;>;
            8       1     1  list   Ljava/util/List<Ljava/lang/String;>;
```

在 javap 反编译结果中，**本地变量类型表里记录了局部变量使用的泛型**。但如果 javac 编译时未开启 vars，则编译结果中不包含本地变量表，此时局部变量表才确实被擦除了（javac 缺省不开启 vars）。

