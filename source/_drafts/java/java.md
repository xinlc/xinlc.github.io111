
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
