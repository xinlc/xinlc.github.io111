
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
