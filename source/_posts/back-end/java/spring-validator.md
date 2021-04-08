---
title: SpringBoot 之 Validator
date: 2019-12-21 11:27:00
categories: Java
tags:
  - java
  - validator
  - springBoot
---

## 什么是 Validator

`Bean Validation` 是 Java 定义的一套基于注解的数据校验规范，目前已经从`JSR 303`的1.0版本升级到`JSR 349`的1.1版本，再到`JSR 380`的2.0版本（2.0完成于2017.08），已经经历了三个版本 。在 `SpringBoot` 中已经集成在 `starter-web` 中，所以无需在添加其他依赖。

<!--more-->

## 注解介绍

### validator内置注解

|注解 | 详细信息 |
| :-------------- | :----------- |
|@Null | 被注释的元素必须为 null |
|@NotNull | 被注释的元素必须不为 null |
|@AssertTrue | 被注释的元素必须为 true|
|@AssertFalse | 被注释的元素必须为 false|
|@Min(value) | 被注释的元素必须是一个数字，其值必须大于等于指定的最小值|
|@Max(value) | 被注释的元素必须是一个数字，其值必须小于等于指定的最大值|
|@DecimalMin(value) | 被注释的元素必须是一个数字，其值必须大于等于指定的最小值|
|@DecimalMax(value) | 被注释的元素必须是一个数字，其值必须小于等于指定的最大值|
|@Size(max, min) | 被注释的元素的大小必须在指定的范围内|
|@Digits (integer, fraction) | 被注释的元素必须是一个数字，其值必须在可接受的范围内|
|@Past | 被注释的元素必须是一个过去的日期|
|@Future | 被注释的元素必须是一个将来的日期|
|@Pattern(value) | 被注释的元素必须符合指定的正则表达式|

### Hibernate Validator 附加的 constraint

|注解 | 详细信息 |
| :-------------- | :----------- |
|@Email | 被注释的元素必须是电子邮箱地址|
|@Length |被注释的字符串的大小必须在指定的范围内|
|@NotEmpty | 被注释的字符串的必须非空|
|@Range | 被注释的元素必须在合适的范围内|
|@NotBlank | 验证字符串非null，且长度必须大于0|

### 注意

* @NotNull 适用于任何类型被注解的元素必须不能与NULL
* @NotEmpty 适用于String Map或者数组不能为Null且长度必须大于0
* @NotBlank 只能用于String上面 不能为null, 调用trim()后，长度必须大于0

## @Valid和@Validated 区别

Spring Validation验证框架对参数的验证机制提供了@Validated（Spring's JSR-303规范，是标准JSR-303的一个变种），javax提供了@Valid（标准JSR-303规范），配合BindingResult可以直接提供参数验证结果。其中对于字段的特定验证注解比如@NotNull等。

在检验Controller的入参是否符合规范时，使用@Validated或者@Valid在基本验证功能上没有太多区别。但是在分组、注解地方、嵌套验证等功能上两个有所不同：

- @Validated：提供了一个分组功能，可以在入参验证时，根据不同的分组采用不同的验证机制。@Valid：作为标准JSR-303规范，还没有吸收分组的功能。

- @Valid：没有分组的功能。

- @Valid：可以用在方法、构造函数、方法参数和成员属性（字段）上

- @Validated：提供了一个分组功能，可以在入参验证时，根据不同的分组采用不同的验证机制

- @Validated：可以用在类型、方法和方法参数上。但是不能用在成员属性（字段）上

两者是否能用于成员属性（字段）上直接影响能否提供嵌套验证的功能

### 嵌套验证

在比较两者嵌套验证时，先说明下什么叫做嵌套验证。比如我们现在有个实体叫做Item：

```java
public class Item {

    @NotNull(message = "id不能为空")
    @Min(value = 1, message = "id必须为正整数")
    private Long id;

    @NotNull(message = "props不能为空")
    @Size(min = 1, message = "至少要有一个属性")
    private List<Prop> props;
}
```

Item带有很多属性，属性里面有属性id，属性值id，属性名和属性值，如下所示：

```java
public class Prop {

    @NotNull(message = "pid不能为空")
    @Min(value = 1, message = "pid必须为正整数")
    private Long pid;

    @NotNull(message = "vid不能为空")
    @Min(value = 1, message = "vid必须为正整数")
    private Long vid;

    @NotBlank(message = "pidName不能为空")
    private String pidName;

    @NotBlank(message = "vidName不能为空")
    private String vidName;
}
```

属性这个实体也有自己的验证机制，比如属性和属性值id不能为空，属性名和属性值不能为空等。

现在我们有个ItemController接受一个Item的入参，想要对Item进行验证，如下所示：

```java
@RestController
public class ItemController {

    @RequestMapping("/item/add")
    public void addItem(@Validated Item item, BindingResult bindingResult) {
        doSomething();
    }
}
```

如果Item实体的props属性不额外加注释，只有@NotNull和@Size，无论入参采用@Validated还是@Valid验证，Spring Validation框架只会对Item的id和props做非空和数量验证，不会对props字段里的Prop实体进行字段验证，也就是@Validated和@Valid加在方法参数前，都不会自动对参数进行嵌套验证。也就是说如果传的`List<Prop>`中有Prop的pid为空或者是负数，入参验证不会检测出来。

为了能够进行嵌套验证，必须手动在Item实体的props字段上明确指出这个字段里面的实体也要进行验证。由于@Validated不能用在成员属性（字段）上，但是@Valid能加在成员属性（字段）上，而且@Valid类注解上也说明了它支持嵌套验证功能，那么我们能够推断出：@Valid加在方法参数时并不能够自动进行嵌套验证，而是用在需要嵌套验证类的相应字段上，来配合方法参数上@Validated或@Valid来进行嵌套验证。

我们修改Item类如下所示：

```java
public class Item {

    @NotNull(message = "id不能为空")
    @Min(value = 1, message = "id必须为正整数")
    private Long id;

    @Valid // 嵌套验证必须用@Valid
    @NotNull(message = "props不能为空")
    @Size(min = 1, message = "props至少要有一个自定义属性")
    private List<Prop> props;
}
```

然后我们在ItemController的addItem函数上再使用@Validated或者@Valid，就能对Item的入参进行嵌套验证。此时Item里面的props如果含有Prop的相应字段为空的情况，Spring Validation框架就会检测出来，bindingResult就会记录相应的错误。

总结一下@Validated和@Valid在嵌套验证功能上的区别：

- @Validated：用在方法入参上无法单独提供嵌套验证功能。不能用在成员属性（字段）上，也无法提示框架进行嵌套验证。能配合嵌套验证注解@Valid进行嵌套验证。

- @Valid：用在方法入参上无法单独提供嵌套验证功能。能够用在成员属性（字段）上，提示验证框架进行嵌套验证。能配合嵌套验证注解@Valid进行嵌套验证。

## 自定义校验注解

定义校验手机号注解：

```java
/**
 * 手机号校验
 */
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = MobileValidator.class)
public @interface IsMobile {

    String message();

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
```

定义校验处理器：

```java
/**
 * 校验是否为合法的手机号码
 */
public class MobileValidator implements ConstraintValidator<IsMobile, String> {

    @Override
    public void initialize(IsMobile isMobile) {
    }

    @Override
    public boolean isValid(String s, ConstraintValidatorContext constraintValidatorContext) {
        try {
            if (Func.isBlank(s)) {
                return true;
            } else {
                return RegexUtil.match(RegexUtil.PHONE, s);
            }
        } catch (Exception e) {
            return false;
        }
    }
}
```

## 通用手动分组校验

校验分组类：

```java
/**
 * 验证器分组
 */
public interface ValidatorGroup {

    /**
     * 查询
     */
    interface Query {
    }

    /**
     * 添加
     */
    interface Add {
    }

    /**
     * 修改
     */
    interface Edit {
    }

    /**
     * 删除
     */
    interface Remove {
    }

    /**
     * 第一种场景分组
     */
    interface First {
    }

    /**
     * 第二种场景分组
     */
    interface Second {
    }

    /**
     * 第三种场景分组
     */
    interface Third {
    }
}
```

手动校验工具：

```java
/**
 * Hibernate Validator 校验工具类
 * <p>
 * 文档：https://docs.jboss.org/hibernate/stable/validator/reference/en-US/html_single/
 */
public class ValidatorUtil {

    public static final Validator VALIDATOR;

    static {
        VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();
    }

    /**
     * 校验 - 指定抛出异常
     *
     * @param object 被校验的bean
     * @param re     RuntimeException.class
     * @param groups 分组
     * @param <T>    被校验bean 类型
     * @param <X>    异常类型
     */
    public static <T, X extends RuntimeException> void validate(T object, Class<? extends X> re, Class<?>... groups) {
        VALIDATOR.validate(object, groups).stream().findFirst().ifPresent(v -> {
            throw ReflectUtil.newInstance(re, v.getMessage());
        });
    }

    /**
     * 校验
     *
     * @param object 被校验的bean
     * @param groups 分组
     * @return 错误消息
     */
    public static <T> Map<String, StringBuilder> validate(T object, Class<?>... groups) {
        Map<String, StringBuilder> errorMap = new HashMap<>(16);
        if (groups == null) {
            groups = new Class[]{Default.class};
        }
        Set<ConstraintViolation<T>> set = VALIDATOR.validate(object, groups);
        if (CollectionUtils.isEmpty(set)) {
            return null;
        }
        String property;
        for (ConstraintViolation<T> c : set) {
            // 这里循环获取错误信息，可以自定义格式
            property = c.getPropertyPath().toString();
            if (errorMap.get(property) != null) {
                errorMap.get(property).append(",").append(c.getMessage());
            } else {
                StringBuilder sb = new StringBuilder();
                sb.append(c.getMessage());
                errorMap.put(property, sb);
            }
        }
        return errorMap;
    }
}

```
