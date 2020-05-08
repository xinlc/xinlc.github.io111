
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
