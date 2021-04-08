MapStruct学习笔记
===

## 实战演练(dto2Vo)

### pom 依赖

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>top.simba1949</groupId>
    <artifactId>map-struct-1.3.1.Final</artifactId>
    <version>1.0-SNAPSHOT</version>

    <dependencies>
        <!-- https://mvnrepository.com/artifact/org.mapstruct/mapstruct -->
        <dependency>
            <groupId>org.mapstruct</groupId>
            <artifactId>mapstruct</artifactId>
            <version>1.3.1.Final</version>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <version>1.18.12</version>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!--https://mvnrepository.com/artifact/org.apache.maven.plugins/maven-compiler-plugin -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.8.1</version>
                <configuration>
                    <source>1.8</source>
                    <target>1.8</target>
                    <encoding>UTF-8</encoding>
                    <annotationProcessorPaths>
                        <!--lombok 和 MapStruct 一起使用需要配置-->
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                            <version>1.18.12</version>
                        </path>
                        <path>
                            <groupId>org.mapstruct</groupId>
                            <artifactId>mapstruct-processor</artifactId>
                            <version>1.3.1.Final</version>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

### 属性相同属性名相同

Dto

```java
@Data
public class PropertySameAndNameSameDto {
    private Integer id;
    private Boolean enable;
    private BigDecimal price;
    private String desc;
    private Date produce;
    private LocalDateTime birthday;
}
```

Vo

```java
@Data
public class PropertySameAndNameSameVo {
    private Integer id;
    private Boolean enable;
    private BigDecimal price;
    private String desc;
    private Date produce;
    private LocalDateTime birthday;
}
```

自定义映射器

```java
/**
 * @Mapper ：自定义映射器
 * 属性相同，属性名相同
 */
@Mapper
public interface PropertySameAndNameSameMapper {

    PropertySameAndNameSameMapper INSTANCE = Mappers.getMapper(PropertySameAndNameSameMapper.class);

    /**
     * 对象转换
     * 当属性与目标实体对应项具有相同的名称时，它将隐式映射。
     * @param propertySameAndNameSameDto
     * @return
     */
    PropertySameAndNameSameVo dto2Vo(PropertySameAndNameSameDto propertySameAndNameSameDto);
}
```

单元测试

```java
public class PropertySameAndNameSameApplication {
    public static void main(String[] args) {
        PropertySameAndNameSameDto dto = new PropertySameAndNameSameDto();
        dto.setId(1);
        dto.setEnable(true);
        dto.setDesc("desc");
        dto.setPrice(BigDecimal.ONE);
        dto.setProduce(new Date());
        dto.setBirthday(LocalDateTime.now());

        PropertySameAndNameSameVo vo = PropertySameAndNameSameMapper.INSTANCE.dto2Vo(dto);
        System.out.println(vo);
    }
}
```

### 属性相同属性名不同

Dto

```java
@Data
public class PropertySameAndNameDiffDto {
    private Integer idDto;
    private Boolean enableDto;
    private BigDecimal priceDto;
    private String descDto;
    private Date produceDto;
    private LocalDateTime birthdayDto;
}
```

Vo

```java
@Data
public class PropertySameAndNameDiffVo {
    private Integer idVo;
    private Boolean enableVo;
    private BigDecimal priceVo;
    private String descVo;
    private Date produceVo;
    private LocalDateTime birthdayVo;
}
```

自定义映射器

```java
/**
 * @Mapper ：自定义映射器
 * 属性相同，属性名不相同
 */
@Mapper
public interface PropertySameAndNameDiffMapper {

    PropertySameAndNameDiffMapper INSTANCE = Mappers.getMapper(PropertySameAndNameDiffMapper.class);

    /**
     * 对象转换
     * 当属性与目标实体对应项具有相同的名称时，它将隐式映射。
     * 当属性与目标实体对应项名称不相同时，需要使用 @Mapping 显示映射
     * @param propertySameAndNameDiffDto
     * @return
     */
    @Mapping(source = "idDto", target = "idVo")
    @Mapping(source = "enableDto", target = "enableVo")
    @Mapping(source = "priceDto", target = "priceVo")
    @Mapping(source = "descDto", target = "descVo")
    @Mapping(source = "produceDto", target = "produceVo")
    @Mapping(source = "birthdayDto", target = "birthdayVo")
    PropertySameAndNameDiffVo dto2Vo(PropertySameAndNameDiffDto propertySameAndNameDiffDto);
}
```

单元测试

```java
public class PropertySameAndNameDiffApplication {
    public static void main(String[] args) {
        PropertySameAndNameDiffDto dto = new PropertySameAndNameDiffDto();
        dto.setIdDto(1);
        dto.setEnableDto(true);
        dto.setDescDto("desc");
        dto.setPriceDto(BigDecimal.TEN);
        dto.setProduceDto(new Date());
        dto.setBirthdayDto(LocalDateTime.now());

        PropertySameAndNameDiffVo vo = PropertySameAndNameDiffMapper.INSTANCE.dto2Vo(dto);
        System.out.println(vo);
    }
}
```

### 属性不同

Dto

```java
@Data
public class PropertyDiffDto {
    private String idDto;
    private String enableDto;
    private String priceDto;
    private Integer descDto;
    private String produceDto;
    private String birthdayDto;
}
```

Vo

```java
@Data
public class PropertyDiffVo {
    private Integer idVo;
    private Boolean enableVo;
    private BigDecimal priceVo;
    private String descVo;
    private Date produceVo;
    private LocalDateTime birthdayVo;
}
```

自定义映射器

```java
/**
 * @Mapper ：自定义映射器
 * 属性不相同
 */
@Mapper
public interface PropertyDiffMapper {

    PropertyDiffMapper INSTANCE = Mappers.getMapper(PropertyDiffMapper.class);

    /**
     * 对象转换
     * 属性相同：当属性与目标实体对应项具有相同的名称时，它将隐式映射。
     * 属性相同：当属性与目标实体对应项名称不相同时，需要使用 @Mapping 显示映射
     *
     * 属性不同：
     *  有特殊要求的，比如日期，@Mapping 添加属性 dateFormat，不满足要求的可以自定义解析
     *  (假设 enable 1=true,0=false)：按照自定义解析方式解析
     *  无特殊要求的，按照以下规则解析
     *
     *  Boolean.parseBoolean(..)
     *  Integer.parseInt(..)
     *
     *  String.valueOf(..)
     *
     *  (new SimpleDateFormat("yyyy-MM-dd")).parse(..) ： dateFormat = "yyyy-MM-dd"
     *  LocalDateTime.parse(.., DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) ：dateFormat = "yyyy-MM-dd HH:mm:ss"
     *
     *  new BigDecimal(..)
     *
     * @param propertyDiffDto
     * @return
     */
    @Mapping(source = "idDto", target = "idVo")
    // 将 source 定义成 表达式
    @Mapping(expression = "java(enableDto2Vo(propertyDiffDto.getEnableDto()))", target = "enableVo")
    @Mapping(source = "priceDto", target = "priceVo")
    @Mapping(source = "descDto", target = "descVo")
    // 需要添加日期格式化
    @Mapping(source = "produceDto", target = "produceVo", dateFormat = "yyyy-MM-dd")
    @Mapping(source = "birthdayDto", target = "birthdayVo", dateFormat = "yyyy-MM-dd HH:mm:ss")
    PropertyDiffVo dto2Vo(PropertyDiffDto propertyDiffDto);

    /**
     * 自定义 enableDto2Vo 解析
     * @param enableStr
     * @return
     */
    default boolean enableDto2Vo(String enableStr){
        if ("0".equals(enableStr)){
            return false;
        }else if ("1".equals(enableStr)){
            return true;
        }else {
            throw new RuntimeException("无法解析:" + enableStr);
        }
    }
}
```

单元测试

```java
public class PropertyDiffApplication {
    public static void main(String[] args) {
        PropertyDiffDto dto = new PropertyDiffDto();
        dto.setIdDto("1");
        // 除了 true 其他都是 false：假设1=true,0=false
        dto.setEnableDto("0");
        dto.setPriceDto("6.66");
        dto.setDescDto(1);
        dto.setProduceDto("2020-09-11");
        dto.setBirthdayDto("2020-09-11 14:00:00");

        PropertyDiffVo vo = PropertyDiffMapper.INSTANCE.dto2Vo(dto);
        System.out.println(vo);
    }
}
```

### 多个对象转为一个对象数据

DtoFirst

```java
@Data
public class MultiObject2OneDtoFirst {
    private String idDto;
    private Integer ageDto;
    private BigDecimal priceDto;
}
```

DtoSecond

```java
@Data
public class MultiObject2OneDtoSecond {
    private Date birthdayDto;
    private LocalDateTime localDateTimeDto;
    private MultiObject2OneDtoDepth depthDto;
}
```

DtoSecond.depthDto

```java
@Data
public class MultiObject2OneDtoDepth {
    private Boolean enableDto;
}
```

Vo

```java
@Data
public class MultiObject2OneVo {
    private String idVo;
    private Integer ageVo;
    private BigDecimal priceVo;

    private Date birthdayVo;
    private LocalDateTime localDateTimeVo;

    private Boolean enableVo;
}
```

自定义映射器

```java
@Mapper
public interface MultiObject2OneMapper {

    MultiObject2OneMapper INSTANCE = Mappers.getMapper(MultiObject2OneMapper.class);

    @Mapping(source = "first.idDto", target = "idVo")
    @Mapping(source = "first.ageDto", target = "ageVo")
    @Mapping(source = "first.priceDto", target = "priceVo")
    @Mapping(source = "second.birthdayDto", target = "birthdayVo")
    @Mapping(source = "second.localDateTimeDto", target = "localDateTimeVo")
    @Mapping(source = "second.depthDto.enableDto", target = "enableVo")
    MultiObject2OneVo dto2Vo(MultiObject2OneDtoFirst first, MultiObject2OneDtoSecond second);
}
```

单元测试

```java
public class MultiObject2OneApplication {
    public static void main(String[] args) {
        MultiObject2OneDtoFirst first = new MultiObject2OneDtoFirst();
        first.setIdDto("id");
        first.setAgeDto(18);
        first.setPriceDto(BigDecimal.TEN);

        MultiObject2OneDtoDepth depth = new MultiObject2OneDtoDepth();
        depth.setEnableDto(true);
        MultiObject2OneDtoSecond second = new MultiObject2OneDtoSecond();
        second.setBirthdayDto(new Date());
        second.setLocalDateTimeDto(LocalDateTime.now());
        second.setDepthDto(depth);

        MultiObject2OneVo vo = MultiObject2OneMapper.INSTANCE.dto2Vo(first, second);
        System.out.println(vo);
    }
}
```

### 自定义转换器

Dto

```java
@Data
public class DiyTransformDto {
    private String intDto;
    private String booleanDto;
    private String dateDto;
    private String localDateTimeDto;
    private String userIntDto;
    private String userStringDto;

    private String enumDto;

    private Date date2LocalDateTimeDto;
    private LocalDateTime localDateTime2DateDto;
}
```

Vo

DiyTransformUserVo

```java
@Data
public class DiyTransformUserVo {
    private Integer userIntVo;
    private String userStringVo;
}
```

DiyTransformVo

```java
@Data
public class DiyTransformVo {
    private Integer intVo;
    private Boolean booleanVo;
    private Date dateVo;
    private LocalDateTime localDateTimeVo;
    private DiyTransformUserVo userVo;

    private DiyTransformDeleteEnum enumVo;

    private LocalDateTime date2LocalDateTimeVo;
    private Date localDateTime2DateVo;
}
```

自定义转换器

```java
public class DateTransformHandler {

    public static Date localDateTime2Date(LocalDateTime localDateTime){
        if (null == localDateTime){
            throw new RuntimeException("");
        }
        return Date.from(localDateTime.atZone(ZoneId.systemDefault()).toInstant());
    }

    public static LocalDateTime date2LocalDateTime(Date date){
        if (null == date){
            throw new RuntimeException("");
        }
        return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
    }
}
```

### 枚举类

```java
public enum DiyTransformDeleteEnum {
    DELETE_NO(0, "未删除"),
    DELETE_YES(1, "已删除")
    ;

    private Integer code;
    private String desc;

    public static DiyTransformDeleteEnum getDeleteEnumByCode(int code){
        for (DiyTransformDeleteEnum anEnum : DiyTransformDeleteEnum.values()) {
            if (code == anEnum.code){
                return anEnum;
            }
        }
        throw new RuntimeException("获取不到对应的枚举类型");
    }

    DiyTransformDeleteEnum(Integer code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public Integer getCode() {
        return code;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public String getDesc() {
        return desc;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }

    @Override
    public String toString() {
        return "DiyTransformDeleteEnum{" +
                "code=" + code +
                ", desc='" + desc + '\'' +
                '}';
    }
}
```

自定义映射器

```java
/**
 * 第一种方式：
 * @Mapper(uses = {DateTransformHandler.class}) ：使用自定义的转换器
 */
@Mapper(uses = {DateTransformHandler.class})
public interface DiyTransformMapper {

    DiyTransformMapper INSTANCE = Mappers.getMapper(DiyTransformMapper.class);

    @Mapping(source = "intDto", target = "intVo")
    @Mapping(source = "booleanDto", target = "booleanVo")
    @Mapping(source = "dateDto", target = "dateVo", dateFormat = "yyyy-MM-dd HH:mm:ss")
    @Mapping(source = "localDateTimeDto", target = "localDateTimeVo", dateFormat = "yyyy-MM-dd HH:mm:ss")
    // 第二种方式：使用自定义的转换器
    @Mapping(expression = "java(string2Enum(diyTransformDto.getEnumDto()))",target = "enumVo")
    @Mapping(source = "userIntDto", target = "userVo.userIntVo")
    @Mapping(source = "userStringDto", target = "userVo.userStringVo")
    @Mapping(source = "date2LocalDateTimeDto", target = "date2LocalDateTimeVo")
    @Mapping(source = "localDateTime2DateDto", target = "localDateTime2DateVo")
    DiyTransformVo dto2Vo(DiyTransformDto diyTransformDto);

    /**
     * 转义枚举
     * @param code
     * @return
     */
    default DiyTransformDeleteEnum string2Enum(String code){
        if (null == code || code.length() == 0){
            throw new RuntimeException("解析枚举失败");
        }
        Integer codeInt = Integer.valueOf(code);
        return DiyTransformDeleteEnum.getDeleteEnumByCode(codeInt);
    }
}
```

单元测试

```java
public class DiyTransformApplication {
    public static void main(String[] args) {
        DiyTransformDto dto = new DiyTransformDto();
        dto.setIntDto("9");
        dto.setBooleanDto("true");
        dto.setDateDto("2020-01-01 14:00:00");
        dto.setLocalDateTimeDto("2020-02-02 14:00:00");
        dto.setUserIntDto("7");
        dto.setUserStringDto("username");

        dto.setEnumDto("1");

        dto.setLocalDateTime2DateDto(LocalDateTime.now());
        dto.setDate2LocalDateTimeDto(new Date());

        DiyTransformVo vo = DiyTransformMapper.INSTANCE.dto2Vo(dto);
        System.out.println(vo);
    }
}
```

## 反向映射

### 属性相同

Dto

```java
@Data
public class MappingReversePropertySameDto {
    private Integer idSame;
    private String nameDto;
    private Date dateDto;
}
```

Vo

```java
@Data
public class MappingReversePropertySameVo {
    private Integer idSame;
    private String nameVo;
    private Date dateVo;
}
```

自定义映射器

```java
@Mapper
public interface MappingReversePropertySameMapper {

    MappingReversePropertySameMapper INSTANCE = Mappers.getMapper(MappingReversePropertySameMapper.class);

    @Mapping(source = "nameDto", target = "nameVo")
    @Mapping(source = "dateDto", target = "dateVo")
    MappingReversePropertySameVo dto2Vo(MappingReversePropertySameDto mappingReversePropertySameDto);

    /**
     * 反向映射：添加注解 @InheritInverseConfiguration(name = "dto2Vo")
     * 如果多个方法符合条件，需要在 name 指定对应的方法名
     * @param mappingReversePropertySameVo
     * @return
     */
    @InheritInverseConfiguration(name = "dto2Vo")
    MappingReversePropertySameDto vo2Dto(MappingReversePropertySameVo mappingReversePropertySameVo);
}
```

单元测试

```java
public class MappingReversePropertySameApplication {
    public static void main(String[] args) {
        MappingReversePropertySameDto dto = new MappingReversePropertySameDto();
        dto.setDateDto(new Date());
        dto.setIdSame(1);
        dto.setNameDto("name");

        MappingReversePropertySameVo vo = MappingReversePropertySameMapper.INSTANCE.dto2Vo(dto);
        System.out.println(vo);

        MappingReversePropertySameDto vo2Dto = MappingReversePropertySameMapper.INSTANCE.vo2Dto(vo);
        System.out.println(vo2Dto);
    }
}
```

## 属性不同

枚举

```java
public enum MappingReversePropertyDiffEnum {
    YES(1, "YES"),
    NO(0, "NO"),
    ;

    public static MappingReversePropertyDiffEnum getEnumByCode(Integer code){
        for (MappingReversePropertyDiffEnum anEnum : MappingReversePropertyDiffEnum.values()) {
            if (code == anEnum.code){
                return anEnum;
            }
        }
        throw new RuntimeException("");
    }


    private Integer code;
    private String desc;

    MappingReversePropertyDiffEnum(Integer code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public Integer getCode() {
        return code;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public String getDesc() {
        return desc;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }
}
```

Dto

```java
@Data
public class MappingReversePropertyDiffDto {
    private String idDto;
    private String toDateDto;
    private String toLocalDateTimeDto;

    private String toEnum;
}
```

Vo

```java
@Data
public class MappingReversePropertyDiffVo {
    private Integer idVo;
    private Date toDateVo;
    private LocalDateTime toLocalDateTimeVo;

    private MappingReversePropertyDiffEnum anEnum;
}
```

自定义映射器

```java
@Mapper
public interface MappingReversePropertyDiffMapper {
    MappingReversePropertyDiffMapper INSTANCE = Mappers.getMapper(MappingReversePropertyDiffMapper.class);

    @Mapping(source = "idDto", target = "idVo")
    @Mapping(source = "toDateDto", target = "toDateVo", dateFormat = "yyyy-MM-dd HH:mm:ss")
    @Mapping(source = "toLocalDateTimeDto", target = "toLocalDateTimeVo", dateFormat = "yyyy-MM-dd HH:mm:ss")
    @Mapping(expression = "java(toEnum(mappingReversePropertyDiffDto.getToEnum()))", target = "anEnum")
    MappingReversePropertyDiffVo dto2Vo(MappingReversePropertyDiffDto mappingReversePropertyDiffDto);

    /**
     * 反向映射：添加注解 @InheritInverseConfiguration(name = "dto2Vo")
     * 如果多个方法符合条件，需要在 name 指定对应的方法名
     * 如果不满足反向映射需要自定义方法反向映射
     * @param mappingReversePropertySameVo
     * @return
     */
    @InheritInverseConfiguration(name = "dto2Vo")
    @Mapping(expression = "java(enum2String(mappingReversePropertySameVo.getAnEnum()))", target = "toEnum")
    MappingReversePropertyDiffDto vo2Dto(MappingReversePropertyDiffVo mappingReversePropertySameVo);

    default MappingReversePropertyDiffEnum toEnum(String code){
        if (null == code || code.length() <= 0){
            throw new RuntimeException("");
        }
        return MappingReversePropertyDiffEnum.getEnumByCode(Integer.valueOf(code));
    }

    /**
     * 自定义方法反向映射
     * @param anEnum
     * @return
     */
    default String enum2String(MappingReversePropertyDiffEnum anEnum){
        return String.valueOf(anEnum.getCode());
    }
}
```

单元测试

```java
public class MappingReversePropertyDiffApplication {
    public static void main(String[] args) {
        MappingReversePropertyDiffDto dto = new MappingReversePropertyDiffDto();
        dto.setIdDto("1");
        dto.setToDateDto("2020-01-01 14:00:00");
        dto.setToLocalDateTimeDto("2020-12-31 14:00:00");
        dto.setToEnum("0");

        MappingReversePropertyDiffVo vo = MappingReversePropertyDiffMapper.INSTANCE.dto2Vo(dto);
        System.out.println(vo);

        MappingReversePropertyDiffDto vo2Dto = MappingReversePropertyDiffMapper.INSTANCE.vo2Dto(vo);
        System.out.println(vo2Dto);
    }
}
```

## 相关链接

- MapStruct 官网：https://mapstruct.org/
- MapStruct 官方文档：https://mapstruct.org/documentation/reference-guide/
- MapStruct maven 地址：https://mvnrepository.com/artifact/org.mapstruct/mapstruct
- MapStruct github 地址：https://github.com/mapstruct/mapstruct/
