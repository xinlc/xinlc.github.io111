---
title: MapStruct 使用详解
date: 2021-03-07 15:10:00
categories: Java
tags:
  - java
  - Spring
---

MapStruct 是一个可以生成类型安全的，高性能的且无依赖的 JavaBean 映射代码的注解处理器，可以在编译期生成对应的 Mapping，既没有BeanUtils 等工具使用反射的性能问题，又免去了自己写映射代码的繁琐。

<!--more-->

## 简介

按照日常开发习惯，对于不同领域层使用不同JavaBean对象传输数据，避免相互影响，因此基于数据库实体对象User衍生出比如UserDto、UserVo等对象，于是在不同层之间进行数据传输时，不可避免地需要将这些对象进行互相转换操作。

常见的转换方式有：

- 调用getter/setter方法进行属性赋值
- 调用BeanUtil.copyPropertie进行反射属性赋值

第一种方式不必说，属性多了就需要写一大坨getter/setter代码。第二种方式比第一种方式要简便很多，但是坑巨多，比如sources与target写反，难以定位某个字段在哪里进行的赋值，同时因为用到反射，导致性能也不佳。

鉴于此，今天写一写第三种对象转换方式，本文使用的是 MapStruct 工具进行转换，MapStruct 原理也很简单，就是在代码编译阶段生成对应的赋值代码，底层原理还是调用getter/setter方法，但是这是由工具替我们完成，MapStruct在不影响性能的情况下，解决了前面两种方式弊端，很赞~

## Maven 依赖

支持 lombok 一起使用

```xml
...
<properties>
    <mapstruct.version>1.4.2.Final</mapstruct.version>
    <lombok-mapstruct-binding.version>0.2.0</lombok-mapstruct-binding.version>
    <projectlombok.version>1.18.16</projectlombok.version>
</properties>
...
<dependencies>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <version>${projectlombok.version}</version>
        <scope>provided</scope>
    </dependency>
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct</artifactId>
        <version>${mapstruct.version}</version>
    </dependency>
</dependencies>
...
<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.8.1</version>
            <configuration>
                <source>1.8</source> <!-- depending on your project -->
                <target>1.8</target> <!-- depending on your project -->
                <encoding>UTF-8</encoding>
                <compilerArgs>
                    <arg>-parameters</arg>
                </compilerArgs>
                <!-- MapStruct 处理器 -->
                <annotationProcessorPaths>
                    <path>
                        <groupId>org.mapstruct</groupId>
                        <artifactId>mapstruct-processor</artifactId>
                        <version>${mapstruct.version}</version>
                    </path>
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok</artifactId>
                        <version>${projectlombok.version}</version>
                    </path>
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok-mapstruct-binding</artifactId>
                        <version>${lombok-mapstruct-binding.version}</version>
                    </path>
                </annotationProcessorPaths>
            </configuration>
        </plugin>
    </plugins>
</build>
```

## 使用方法

- 使用@Mapper注解，声明映射器，可以是接口，或者抽象类。
- 使用@Mapping注解，实现灵活的字段映射，定制映射的规则。

### 转换器的检索

在声明好转换接口之后，MapStruct提供几种方式获取生成的Mapper映射器。

#### 使用Mappers工厂获取

可以通过提供的Mappers工厂类，获取指定的类型。

```java
@Mapper
public interface Assembler {
    // 使用工厂方法获取Mapper实例
    Assembler INSTANCE = Mappers.getMapper(Assembler.class);

    ProductDTO toDTO(Product product);
}
```

#### 通过依赖注入的方式获取

MapStuct同时支持和其他框架结合，通过依赖注入的方式获取Mapper实例。目前支持spring和cdi。

```java
@Mapper(componentModel = "spring")
public interface Assembler {
    ProductDTO toDTO(Product product);
}
```

生成代码在：`项目根目录/target/generated-sources/annotations/xxx` 如下

```java
@Component 
public class AssemblerImpl implements Assembler {
    @Override
    public ProductDTO toDTO(Product product) {
        if ( product == null ) {
            return null;
        }
        ProductDTO productDTO = new ProductDTO();
        productDTO.setProductId( product.getProductId() );
        return productDTO;
    }
}
```

### 简单映射

#### 基本映射

对于同名同属性的字段，无需特别声明指定，自动转换。

对于不同名相同属性的字段，可以使用Mapping注解指定。

实体：

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {
    private String productId;
    private String name;
}
```

DTO：

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO implements Serializable {
    private static final long serialVersionUID = -6780322740093464581L;
    private String productId;
    private String productName;
}
```

定义映射器：

```java
@Mapper(componentModel = "spring")
public interface Assembler {

    @Mapping(source = "name", target = "productName")
    ProductDTO toDTO(Product product);
}
```

生成的映射器试实现：

```java
@Component
public class AssemblerImpl implements Assembler {
    @Override
    public ProductDTO toDTO(Product product) {
        if ( product == null ) {
            return null;
        }
        ProductDTO productDTO = new ProductDTO();
        productDTO.setProductName( product.getName() );  // 不同字段名映射
        productDTO.setProductId( product.getProductId() ); // 相同映射名自动转换
        return productDTO;
    }
}
```

#### 多源参数映射

支持把多个参数映射成一个类型，使用@Mapping指定即可。

```java
@Mapper(componentModel = "spring")
public interface Demo6Assembler {

    @Mapping(target = "productId", source = "product.productId")
    @Mapping(target = "desc", source = "detail.desc")
    ProductDTO toDetailDTO(Product product, ProductDetail detail);
}
```

#### 更新对象

映射时除了生成新的新对象外，还支持现存对象的更新：

```java
@Mapper(componentModel = "spring")
public interface Demo6Assembler {

    @Mapping(target = "desc", source = "desc")
    void updateDTO(@MappingTarget ProductDTO productDTO, ProductDetail detail);
}
```

### 数据类型转换

#### 对于基础数据类型会进行自动隐式的转换

如int、long、String，Integer、Long等。

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {
    private String productId;
    private Long price;
}
```

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO implements Serializable {
    private static final long serialVersionUID = -6780322740093464581L;
    private int productId;
    private String price;
}
```

定义映射器：

```java
@Mapper(componentModel = "spring")
public interface Assembler {
    ProductDTO toDTO(Product product);
}
```

生成的映射代码：

```java
@Component
public class AssemblerImpl implements Assembler {
    @Override
    public ProductDTO toDTO(Product product) {
        if ( product == null ) {
            return null;
        }
        ProductDTO productDTO = new ProductDTO();
        if ( product.getProductId() != null ) {
            //String自动转int
            productDTO.setProductId( Integer.parseInt( product.getProductId() ) );
        }
        if ( product.getPrice() != null ) {
            //Long转String
            productDTO.setPrice( String.valueOf( product.getPrice() ) );
        }
        return productDTO;
    }
}
```

#### 指定转换格式

某些类型的转换，我们可以指定具体转换的格式。

对于基本数据类型与String之间的转换，可以使用 numberFormat 指定转换格式，使用的是java.text.DecimalFormat 实现。

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {
    private String productId;
    private BigDecimal price;
    private String stock;
}
```

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO implements Serializable {
    private static final long serialVersionUID = -6780322740093464581L;
    private String productId;
    private String price;
    private Integer stock;
}
```

映射器定义：

```java
@Mapper(componentModel = "spring")
public interface Demo3Assembler {
    @Mapping(target = "price", numberFormat = "#.00元")   //BigDecimal转换成字符串
    @Mapping(target = "stock", numberFormat = "#个")      //字符串转换成int
    ProductDTO toDTO(Product product);
}
```

实现代码：

```java
@Component
public class Demo3AssemblerImpl implements Demo3Assembler {
    @Override
    public ProductDTO toDTO(Product product) {
        if ( product == null ) {
            return null;
        }
        ProductDTO productDTO = new ProductDTO();
        productDTO.setProductId( product.getProductId() );
        if ( product.getPrice() != null ) {
            //BigDecimal格式化成字符串
            productDTO.setPrice( createDecimalFormat( "#.00元" ).format( product.getPrice() ) );
        }
        try {
            if ( product.getStock() != null ) {
                 //字符串格式化为int
                productDTO.setStock( new DecimalFormat( "#个" ).parse( product.getStock() ).intValue() );
            }
        }
        catch ( ParseException e ) {
            throw new RuntimeException( e );
        }
        return productDTO;
    }
    private DecimalFormat createDecimalFormat( String numberFormat ) {
        DecimalFormat df = new DecimalFormat( numberFormat );
        df.setParseBigDecimal( true );
        return df;
    }
}
```

测试代码：

```java
@Test
public void test2() {
    com.gotten.study.mapstruct.demo3.Product  product = new com.gotten.study.mapstruct.demo3.Product ();
    product.setProductId("P001");
    product.setPrice(new BigDecimal("100"));
    product.setStock("1个");
    com.gotten.study.mapstruct.demo3.ProductDTO productDTO = demo3Assembler.toDTO(product);
    System.out.println("productDTO:" + JSON.toJSONString(productDTO));
}

productDTO:{"price":"100.00元","productId":"P001","stock":1}
```

Date和String之间的转换，可以通过dateFormat指定转换格式，使用的是SimpleDateFormat的实现。

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {
    private String productId;
    private Date saleTime;
    private String validTime;
}
```

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO implements Serializable {
    private static final long serialVersionUID = -6780322740093464581L;
    private String productId;
    private String saleTime;
    private Date validTime;
}
```

定义映射器：

```java
@Mapper(componentModel = "spring")
public interface Demo4Assembler {
    @Mapping(target = "saleTime", dateFormat = "yyyy-MM-dd HH:mm:ss")  //Date转换成String
    @Mapping(target = "validTime", dateFormat = "yyyy-MM-dd HH:mm")    //String转换成Date
    ProductDTO toDTO(Product product);
}
```

实现代码：

```java
@Component
public class Demo4AssemblerImpl implements Demo4Assembler {
    @Override
    public ProductDTO toDTO(Product product) {
        if ( product == null ) {
            return null;
        }
        ProductDTO productDTO = new ProductDTO();
        productDTO.setProductId( product.getProductId() );
        if ( product.getSaleTime() != null ) {
            productDTO.setSaleTime( new SimpleDateFormat( "yyyy-MM-dd HH:mm:ss" ).format( product.getSaleTime() ) ); //转换成String
        }
        try {
            if ( product.getValidTime() != null ) {
                productDTO.setValidTime( new SimpleDateFormat( "yyyy-MM-dd HH:mm" ).parse( product.getValidTime() ) ); //转换成Date
            }
        }
        catch ( ParseException e ) {
            throw new RuntimeException( e );
        }
        return productDTO;
    }
}
```

### 属性为复杂对象的映射

- 如果是相同类型的对象引用，不会创建新的对象，直接把对象的引用从源对象赋值给目标对象。
- 如果类型相同，但是是集合类的引用，会创建一个新的集合，集合里面的所有引用进行拷贝。

```java
@Override
public ProductDTO toDTO(Product product) {
    if ( product == null ) {
        return null;
    }
    ProductDTO productDTO = new ProductDTO();
    productDTO.setProductId( product.getProductId() );
    List<Sku> list = product.getSkuList();
    if ( list != null ) {
        productDTO.setSkuList( new ArrayList<Sku>( list ) ); //创建新的集合，并对所有元素进行拷贝
    }

    return productDTO;
}
```

对象的类型不同，会检查映射器中是否存在对应的映射方法，如果存在，直接使用，否则会尝试自动创建子映射方法。

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Product {
    private String productId;
    private ProductDetail productDetail;
}
```

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductDetail {
    private String id;
}
```

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductDTO implements Serializable {
    private static final long serialVersionUID = 2184784038009791692L;
    private String productId;
    private ProductDetailDTO productDetail;
}
```

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductDetailDTO {
    private String detailId;
}
```

定义映射器：

```java
@Mapper(componentModel = "spring")
public interface Demo6Assembler {
    ProductDTO toDTO(Product product);

    @Mapping(target = "detailId", source = "id")
    ProductDetailDTO toDetailDTO(ProductDetail detail);
}
```

生成代码：

```java
@Component
public class Demo6AssemblerImpl implements Demo6Assembler {

    @Override
    public ProductDTO toDTO(Product product) {
        if ( product == null ) {
            return null;
        }
        ProductDTO productDTO = new ProductDTO();
        productDTO.setProductId( product.getProductId() );
        productDTO.setProductDetail( toDetailDTO( product.getProductDetail() ) ); //查找使用存在的转换方法
        return productDTO;
    }
    @Override
    public ProductDetailDTO toDetailDTO(ProductDetail detail) {
        if ( detail == null ) {
            return null;
        }
        ProductDetailDTO productDetailDTO = new ProductDetailDTO();
        productDetailDTO.setDetailId( detail.getId() );
        return productDetailDTO;
    }
}
```

多层bean之间的转换

@Mapping注解支持跨层级的属性转换，属性可以在不同层级之间切换。

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Product {
    private String productId;
    private ProductDetail productDetail;
}
```

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductDetail {
    private String id;
}
```

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductDTO implements Serializable {
    private static final long serialVersionUID = 2184784038009791692L;
    private String productId;
    private ProductDetailDTO productDetail;
}
```

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductDetailDTO {
    private String productId;
    private String detailId;
}
```

定义映射器：

```java
@Mapper(componentModel = "spring")
public interface Demo7Assembler {
    @Mapping(target = "productDetail.detailId", source = "productDetail.id") //声明productDetail下的属性转换规则
    @Mapping(target = "productDetail.productId", source = "productId") //跨层级的属性转换,把product层级的productId放到productDetail层级
    ProductDTO toDTO(Product product);
}
```

生成代码：

```java
@Component
public class Demo7AssemblerImpl implements Demo7Assembler {

    @Override
    public ProductDTO toDTO(Product product) {
        if ( product == null ) {
            return null;
        }
        ProductDTO productDTO = new ProductDTO();
        if ( product.getProductDetail() != null ) {
            if ( productDTO.getProductDetail() == null ) {
                productDTO.setProductDetail( new ProductDetailDTO() );
            }
            productDetailToProductDetailDTO( product.getProductDetail(), productDTO.getProductDetail() );
        }
        if ( productDTO.getProductDetail() == null ) {
            productDTO.setProductDetail( new ProductDetailDTO() );
        }
        productToProductDetailDTO( product, productDTO.getProductDetail() );
        productDTO.setProductId( product.getProductId() );
        return productDTO;
    }

　　//detail的转换方法
    protected void productDetailToProductDetailDTO(ProductDetail productDetail, ProductDetailDTO mappingTarget) {
        if ( productDetail == null ) {
            return;
        }
        mappingTarget.setDetailId( productDetail.getId() );
    }

　　//product转成detail（更新处理）
    protected void productToProductDetailDTO(Product product, ProductDetailDTO mappingTarget) {
        if ( product == null ) {
            return;
        }
        mappingTarget.setProductId( product.getProductId() );
    }
}
```

### 自定义转换器

MapStruct支持自定义转换器，实现类型之间的转换自定义的规则。

一个自定义映射器可以定义多个映射方法，匹配时，是以方法的入参和出参进行匹配的。如果绑定的映射中，存在多个相同的入参和出参方法，将会报错。

如果多个入参或者出参方法存在继承关系，将会匹配最具体的那一个方法。

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Product {
    private String productId;
    private List<String> images;
}

```

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductDTO implements Serializable {
    private static final long serialVersionUID = 2184784038009791692L;
    private String productId;
    private String images;
}
```

定义映射器：

```java
@Component
public class ImageFormater {
    public String format(List<String> images) {
        return String.join(",", images);
    }
}
```

绑定转换器：

```java
@Mapper(componentModel = "spring", uses = ImageFormater.class)
public interface Demo8Assembler {
    ProductDTO toDTO(Product product);
}
```

映射器实现：

```java
@Component
public class Demo8AssemblerImpl implements Demo8Assembler {

    @Autowired
    private ImageFormater imageFormater;

    @Override
    public ProductDTO toDTO(Product product) {
        if ( product == null ) {
            return null;
        }

        ProductDTO productDTO = new ProductDTO();
        productDTO.setProductId( product.getProductId() );
　　　　 //调用自定义的映射器进行映射，把list转成string
        productDTO.setImages( imageFormater.format( product.getImages() ) );
        return productDTO;
    }
}
```

### 使用限定符限定使用转换方法

自定义转换器时，存在多个相同入参和出参的方法，MapStruct无法匹配使用哪个映射方法。这时可以使用限定符绑定每个属性转换时使用的转换方法。

限定符使用自定义注解实现。

声明限定符：

```java
import org.mapstruct.Qualifier;
//映射器上的限定符
@Qualifier //标记为限定符
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.CLASS)
public @interface Formators {
}
//映射方法上的限定符
@Qualifier //标记为限定符
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.CLASS)
public @interface FormatImages {
}

//映射方法上的限定符
@Qualifier //标记为限定符
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.CLASS)
public @interface FormatDetails {
}
```

绑定限定符到映射器的方法上面：

```java
@Component
@Formators //绑定限定符
public class CusFormater {
    @FormatImages //绑定限定符
    public String formatImages(List<String> images) {
        return String.join(",", images);
    }
    @FormatDetails //绑定限定符
    public String formatDetails(List<String> images) {
        return String.join(",", images);
    }
}
```

映射时，绑定限定符，定位映射方法：

```java
@Mapper(componentModel = "spring", uses = CusFormater.class)
public interface Demo9Assembler {
    @Mapping(target = "images", qualifiedBy = FormatImages.class) //转换指定限定符，定位具体的映射方法
    @Mapping(target = "details", qualifiedBy = FormatDetails.class)//转换指定限定符，定位具体的映射方法
    ProductDTO toDTO(Product product);
}
```

生成代码：

```java
@Component
public class Demo9AssemblerImpl implements Demo9Assembler {
    @Autowired
    private CusFormater cusFormater;

    @Override
    public ProductDTO toDTO(Product product) {
        if ( product == null ) {
            return null;
        }
        ProductDTO productDTO = new ProductDTO();
        productDTO.setProductId( product.getProductId() );
        productDTO.setImages( cusFormater.formatImages( product.getImages() ) ); //定位方法
        productDTO.setDetails( cusFormater.formatDetails( product.getDetails() ) );
        return productDTO;
    }
}
```

基于named注解实现（推荐）

除了使用自定义注解的方法，还可以使用@Named注解实现限定符的绑定。

```java
@Component
@Named("CusFormater")
public class CusFormater {
    //绑定限定符
    @Named("formatImages")
    public String formatImages(List<String> images) {
        return String.join(",", images);
    }
    //绑定限定符
    @Named("formatDetails")
    public String formatDetails(List<String> images) {
        return String.join(",", images);
    }
}
```

使用时绑定：

```java
@Mapper(componentModel = "spring", uses = CusFormater.class)
public interface Demo10Assembler {
    @Mapping(target = "images", qualifiedByName = "formatImages") //转换指定限定符，定位具体的映射方法
    @Mapping(target = "details", qualifiedByName = "formatDetails")//转换指定限定符，定位具体的映射方法
    ProductDTO toDTO(Product product);
}
```

### Map的映射

可以使用@MapMapping实现对key和value的分别映射：

```java
@Mapper(componentModel = "spring")
public interface Demo11Assembler {
    @MapMapping(valueDateFormat = "yyyy-MM-dd HH:mm:ss")
    Map<String, String> toDTO(Map<Long, Date> map);
}
```

### 枚举值之间的转换

MapStruct可以在多个枚举值之间转换，使用@ValueMapping注解。

```java
public enum E1 {
    E1_1,
    E1_2,
    E1_3,
    ;
}

public enum E2 {
    E2_1,
    E2_2,
    E2_3,
    ;
}
```

```java
@Mapper(componentModel = "spring")
public interface Demo11Assembler {
    @ValueMapping(target = "E1_1", source = "E2_1")
    @ValueMapping(target = "E1_2", source = "E2_2")
    @ValueMapping(target = MappingConstants.NULL, source = "E2_3") //转换成null
    E1 toDTO(E2 e2);
}
```

生成代码：

```java
@Component
public class Demo11AssemblerImpl implements Demo11Assembler {

    @Override
    public E1 toDTO(E2 e2) {
        if ( e2 == null ) {
            return null;
        }
        E1 e1;
        switch ( e2 ) {
            case E2_1: e1 = E1.E1_1;
            break;
            case E2_2: e1 = E1.E1_2;
            break;
            case E2_3: e1 = null;
            break;
            default: throw new IllegalArgumentException( "Unexpected enum constant: " + e2 );
        }
        return e1;
    }
}
```

### 定制Bean生成

使用MapStruct可以使用对象工厂来创建bean，同时也可以更新bean。

定义对象工厂：

```java
public class DTOFactory {
    public ProductDTO createDTO() {
        ProductDTO productDTO = new ProductDTO();
        productDTO.setStock(0);
        return productDTO;
    }
}
```

使用对象工厂：

```java
@Mapper(componentModel = "spring", uses = DTOFactory.class) //指定使用的对象工厂
public interface Demo13Assembler {
    ProductDTO toDTO(Product product);
}
```

生成代码：

```java
@Component
public class Demo13AssemblerImpl implements Demo13Assembler {

    @Autowired
    private DTOFactory dTOFactory;
    @Override
    public ProductDTO toDTO(Product product) {
        if ( product == null ) {
            return null;
        }
        ProductDTO productDTO = dTOFactory.createDTO(); //使用对象工厂创建对象
        productDTO.setProductId( product.getProductId() );
        return productDTO;
    }
}
```

### 缺省值和常量

MapStruct允许设置缺省值和常量，同时缺省值允许使用表达式。

注意：使用缺省值，源字段必须存在，否则缺省值不生效，否则应该使用常量。

```java
@Mapper(componentModel = "spring", imports = UUID.class)
public interface Demo15Assembler {
    @Mapping(target = "productId", source = "productId", defaultValue = "0") //当product的productId为null，设置为0
    @Mapping(target = "random", source = "random", defaultExpression = "java(UUID.randomUUID().toString())") //缺省设置随机数
    @Mapping(target = "stock", constant = "0") //固定设置为0
    @Mapping(target = "createTime", dateFormat = "yyyy-MM-dd", constant = "2020-05-30") //固定格式化设置为2020-05-30，
    ProductDTO toDTO(Product product);
}
```

### 存在继承关系的结果处理

当返回的结果类型存在继承关系时，可以使用 @BeanMapping注解指定真实返回的结果类型。

```java
@Mapper(componentModel = "spring")
public interface Demo17Assembler {
    @BeanMapping(resultType = DogDTO.class) //指定返回的结果类型
    Animal toDTO(Dog dog);
}
```

生成代码：

```java
@Component
public class Demo17AssemblerImpl implements Demo17Assembler {
    @Override
    public Animal toDTO(Dog dog) {
        if ( dog == null ) {
            return null;
        }
        DogDTO animal = new DogDTO();
        animal.setId( dog.getId() );
        return animal;
    }
}
```

### 映射关系继承

MapStruct允许对映射关系进行继承，使用@InheritConfiguration标记当前方法继承其他映射方法的映射关系。会自动查找相同类型映射源、映射目标的方法进行继承，如果存在多个相同类型的方法，则需要手工指定。

```java
@Mapper(componentModel = "spring")
public interface Demo18Assembler {
    @Mapping(target = "productId", source = "id")
    @Mapping(target = "detail", source = "detail1")
    ProductDTO toDTO(Product product);

    @Mapping(target = "productId", source = "id2")
    @Mapping(target = "detail", source = "detail2")
    ProductDTO toDTO2(Product product);

    @InheritConfiguration(name = "toDTO") //对toDTO的映射关系进行继承
    @Mapping(target = "detail", source = "detail2") //对继承的关系进行重写
    void update(@MappingTarget ProductDTO productDTO, Product product);

}
```

除了正向继承规则外，还可以进行规则逆向继承，从被继承方法的目标对象映射到源对象。

```java
@Mapper(componentModel = "spring")
public interface Demo18Assembler {
    @Mapping(target = "productId", source = "id")
    @Mapping(target = "detail", source = "detail1")
    ProductDTO toDTO(Product product);

    @Mapping(target = "productId", source = "id2")
    @Mapping(target = "detail", source = "detail2")
    ProductDTO toDTO2(Product product);

    @InheritInverseConfiguration(name = "toDTO") //对toDTO的映射关系进行逆继承
    @Mapping(target = "detail2", source = "detail") //对逆向继承的关系进行重写
    Product toEntity(ProductDTO dto);
}
```

### 复杂映射的实现

有时候我们除了普通映射外，还需要进行一些复杂的映射，如把多个字段计算映射成一个字段，或者借用一些工具进行映射的计算等。MapStruct提供了集中方式实现。

#### 使用java表达式进行映射

对于复杂的映射，允许使用java表达式实现字段的映射。

注意要导入使用到的类。

```java
@Mapper(componentModel = "spring", imports = DecimalUtils.class) //导入java表达式使用的类
public interface Demo16Assembler {
    @Mapping(target = "price", expression = "java(product.getPrice1() + product.getPrice2())") //直接相加
    @Mapping(target = "price2", expression = "java(DecimalUtils.add(product.getPrice1(), product.getPrice2()))") //使用工具类处理
    ProductDTO toDTO(Product product);
}
```

生成的映射代码：

```java
@Component
public class Demo16AssemblerImpl implements Demo16Assembler {

    @Override
    public ProductDTO toDTO(Product product) {
        if ( product == null ) {
            return null;
        }
        ProductDTO productDTO = new ProductDTO();
        productDTO.setProductId( product.getProductId() );
        productDTO.setPrice( product.getPrice1() + product.getPrice2() );
        productDTO.setPrice2( DecimalUtils.add(product.getPrice1(), product.getPrice2()) );
        return productDTO;
    }
}
```

#### 使用装饰器进行映射

MapStruct允许使用装饰器进行一些复杂映射，同时可以支持和Spring结合。

定义一个映射器，同时声明绑定装饰器：

```java
@Mapper(componentModel = "spring")
@DecoratedWith(Demo18AssemblerDecorator.class) //声明绑定装饰器
public interface Demo18Assembler {
    ProductDTO toDTO(Product product);
}
```

定义装饰器：

```java
public abstract class Demo18AssemblerDecorator implements Demo18Assembler {
    @Autowired
    @Qualifier("delegate") //注入mapStruct生成的转换器，原始的转换器注入spring时，会使用delegate装饰符
    private Demo18Assembler assembler;

    //可以获取spring的bean进行操作
    @Autowired
    private StringUtils stringUtils;

    @Override
    public ProductDTO toDTO(Product product) {
        //调用MapStruct进行转换
        ProductDTO productDTO = assembler.toDTO(product);
        //自定义操作
        stringUtils.join(product.getName(), "-", product.getTitle());
        return productDTO;
    }
}
```

生成装饰器代码：

```java
@Component
@Primary //Primary修饰，方便使用时直接使用autowired注入
public class Demo18AssemblerImpl extends Demo18AssemblerDecorator implements Demo18Assembler {
}
```

#### 使用前后置处理实现复杂映射

使用@BeforeMapping和@AfterMapping注解可以指定映射过程的的回调方法，进行一些前置或者后置的操作。

前置回调方法的执行时机是在映射方法开始时，后置方法是在映射完成return之前。

回调方法可以直接定义在映射器内：

```java
@Mapper(componentModel = "spring")
public interface Demo19Assembler {

    ProductDTO toDTO(Product product);

    @BeforeMapping //前置执行
    default ProductDTO toDTOBefore(Product product) {
        ProductDTO productDTO = new ProductDTO();
        productDTO.setSales(9999);
        return productDTO;
    }

    @AfterMapping //后置执行
    default void toDTOAfter(Product product, @MappingTarget ProductDTO productDTO) {
        productDTO.setViewName(product.getName() + "-" + product.getTitle());
    }
}
```

生成的实现代码如下：

```java
@Component
public class Demo19AssemblerImpl implements Demo19Assembler {

    @Override
    public ProductDTO toDTO(Product product) {
        ProductDTO target = toDTOBefore( product ); //前置
        if ( target != null ) {
            return target;
        }

        if ( product == null ) {
            return null;
        }

        ProductDTO productDTO = new ProductDTO();

        productDTO.setProductId( product.getProductId() );

        toDTOAfter( product, productDTO ); //后置

        return productDTO;
    }
}
```

回调方法与映射的方法的匹配规则：

- 映射方法和回调方法没有强绑定的关系，是依靠参数类型来匹配映射方法与回调方法的。映射方法的所有入参和出参类型，能覆盖回调方法的入参，就会调用对应的回调方法，当要注意，如果回调方法的入参是映射方法的出参类型，回调方法中需要用@MappingTarget 指定，否则不会调用。

- 回调方法是void或者返回映射方法的出参类型才能匹配，但要注意，如果返回的是映射方法的出参类型，如果执行时返回不为null，则映射方法直接返回回调方法执行结果，不会往后执行。

> 建议多读读官方文档，有很多高级用法，如继承组成，配置策略等。 https://mapstruct.org/documentation/stable/reference/html/#mapping-composition

## 最佳实践

### 通用配置

因为项目中的对象转换操作基本都一样，因此抽取除了一个转换基类，不同对象如果只是简单转换可以直接继承该基类，而无需覆写基类任何方法，即只需要一个空类即可。如果子类覆写了基类的方法，则基类上的 @Mapping 会失效。

对象转换通用基类

```java
/**
 * 对象转换通用基类
 *
 * @param <D> DTO
 * @param <E> Entity
 * @author Richard
 * @since 2021-03-03
 */
public interface BaseConvertMapper<D, E> {

	/**
	 * DTO 转 Entity
	 *
	 * @param dto DTO
	 * @return Entity
	 */
///	@Mapping(target = "createTime", dateFormat = "yyyy-MM-dd HH:mm:ss", ignore = true)
	E toEntity(D dto);

	/**
	 * Entity 转 DTO
	 *
	 * @param entity Entity
	 * @return DTO
	 */
	@InheritInverseConfiguration(name = "toEntity")
	D toDto(E entity);

	/**
	 * DTO 集合转 Entity 集合
	 *
	 * @param dtoList DTO List
	 * @return Entity List
	 */
	@InheritConfiguration(name = "toEntity")
	List<E> toEntityList(List<D> dtoList);

	/**
	 * Entity 集合转 DTO 集合
	 *
	 * @param entityList Entity List
	 * @return DTO List
	 */
	@InheritConfiguration(name = "toDto")
	List<D> toDtoList(List<E> entityList);

	/**
	 * 映射同名属性，集合流形式
	 *
	 * @param dtoStream DTO Stream
	 * @return Entity Stream
	 */
	List<E> toEntityStream(Stream<D> dtoStream);

	/**
	 * 反向，映射同名属性，集合流形式
	 *
	 * @param entityStream Entity Stream
	 * @return DTO Stream
	 */
	List<D> toDtoStream(Stream<E> entityStream);

	/**
	 * 更新属性
	 *
	 * @param dto    DTO
	 * @param entity Entity
	 */
	@InheritConfiguration(name = "toEntity")
	void updateEntity(D dto, @MappingTarget E entity);

	/**
	 * 反向，更新属性
	 *
	 * @param entity Entity
	 * @param dto    dto
	 */
	@InheritConfiguration(name = "toDto")
	void updateDto(E entity, @MappingTarget D dto);
}
```

对象转换通用配置

```java
/**
 * 对象转换通用配置
 *
 * @author Richard
 * @since 2021-03-03
 */
@MapperConfig(
		componentModel = "spring",
		builder = @Builder(disableBuilder = true),
		unmappedTargetPolicy = ReportingPolicy.IGNORE,
		unmappedSourcePolicy = ReportingPolicy.IGNORE
//		nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS
//      disableSubMappingMethodsGeneration = true,
//      mappingInheritanceStrategy = MappingInheritanceStrategy.AUTO_INHERIT_FROM_CONFIG,
        // imports = {
        //     Helper.class
        // }
)
public interface BaseConvertConfig {
}
```

继承即可实现通用转换

```java
@Mapper(config = BaseConvertConfig.class)
public interface UserConvertMapper extends BaseConvertMapper<UserDTO, User> {

}
```

### 插件工具

mapstruct的插件可以自动检查到属性字段的更改，并且提供属性灵活的选择, idea通过插件市场下载 `MapStruct Support` 即可。

### 下面是对MapStruct的注解做的思维导图，方便对此框架的理解

![1][1]

重点介绍下：BeforeMapping 、 AfterMapping 、 ObjectFactory 、Context

1. BeforeMapping、AfterMapping：表示的是转换动作之前或是之后需要执行的动作
2. ObjectFactory：由于我们转换到目标对象，一般执行都是目标对象的默认构造函数。此方法帮助我们生成一个对象
3. Context：我们在转换动作之前或是之后需要执行一系列的动作，那么数据怎么传送。context负责数据之间的共享。

## 参考

- https://www.cnblogs.com/gotten/p/13052911.html
- https://www.baeldung.com/java-performance-mapping-frameworks
- https://mapstruct.org/documentation/stable/reference/html
- https://github.com/mapstruct/mapstruct/

[1]: /images/java/mapstruct/1.jpg
