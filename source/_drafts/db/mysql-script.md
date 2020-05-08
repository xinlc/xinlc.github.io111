
## 创建400万测试数据

```sql
/*建库*/
DROP DATABASE IF EXISTS testdb1;
CREATE DATABASE testdb1;
USE testdb1;
/*建表test1*/
DROP TABLE IF EXISTS test1;
CREATE TABLE test1 (
  id     INT NOT NULL COMMENT '编号',
  name   VARCHAR(20) NOT NULL COMMENT '姓名',
  sex TINYINT NOT NULL COMMENT '性别,1：男，2：女',
  email  VARCHAR(50)
);

/*准备数据*/
DROP PROCEDURE IF EXISTS proc1;
DELIMITER $                         -- 将语句的结束符号从分号;临时改为$(可以是自定义)
CREATE PROCEDURE proc1()
  BEGIN
    DECLARE i INT DEFAULT 1;
    START TRANSACTION;
    WHILE i <= 4000000 DO
      INSERT INTO test1 (id, name, sex, email) VALUES (i,concat('leo',i),if(mod(i,2),1,2),concat('leo',i,'@163.com'));
      SET i = i + 1;
      if i%10000=0 THEN
        COMMIT;
        START TRANSACTION;
      END IF;
    END WHILE;
    COMMIT;
  END $

DELIMITER ;    -- 将语句的结束符号恢复为分号
CALL proc1();
```

## 获取佣金

```sql
CREATE FUNCTION `getCommission`(
		fee DECIMAL(10 ,2)
) 
	RETURNS decimal(10 ,2) 
	DETERMINISTIC 
	COMMENT '获取佣金' 
BEGIN
	IF ISNULL(fee) OR fee = "" THEN
		RETURN 0;
	ELSEIF fee > 10 THEN 
		RETURN 10;
	ELSE 
		RETURN fee;
	END IF;
END 
```

## 通过传入的经纬度，获得2点之间的距离（km）

```sql
CREATE FUNCTION `getDistance`(
		`arg_lat` VARCHAR(20),
		`arg_lon` VARCHAR(20),
		`arg_userLat` VARCHAR(20),
		`arg_userLon` VARCHAR(20)
) 
	RETURNS float 
	NO SQL 
	COMMENT '通过传入的经纬度，获得2点之间的距离（km）' 
BEGIN
    DECLARE distance float(8,1);
    DECLARE lat, lon, userLat, userLon DECIMAL(14,4);

	IF (arg_lat="11" and arg_lon="22") or (arg_userLat="11" and arg_userLon="22") THEN
        RETURN 0;
	end IF; 

    SET lat = CAST(arg_lat AS DECIMAL(14,4));
    SET lon = CAST(arg_lon AS DECIMAL(14,4));
    SET userLat = CAST(arg_userLat AS DECIMAL(14,4));
    SET userLon = CAST(arg_userLon AS DECIMAL(14,4));

     IF ISNULL(lat) OR ISNULL(lon) OR lat = "" OR lon = "" THEN
        RETURN 108000;
     ELSE
        SELECT
            6371 * 2 * ASIN(SQRT(POWER(SIN((lat - userLat) * PI() / 180 / 2), 2) + COS(lat * PI() / 180) * COS(ABS(userLat) * PI() / 180) * POWER(SIN((lon - userLon) * PI() / 180 / 2), 2)))
        INTO
            distance;

        RETURN distance;
     END IF;
END 
```

## 获取首字母

```sql
CREATE FUNCTION `getFirstPinyin`(
		P_NAME VARCHAR(255)
) 
	RETURNS varchar(255) CHARSET utf8 
	COMMENT '获取首字母' 
BEGIN
    DECLARE V_RETURN VARCHAR(255);
    DECLARE V_first VARCHAR(255);
	SET V_RETURN = ELT(INTERVAL(CONV(HEX(left(CONVERT(P_NAME USING gbk),1)),16,10),
            0xB0A1,0xB0C5,0xB2C1,0xB4EE,0xB6EA,0xB7A2,0xB8C1,0xB9FE,0xBBF7,
            0xBFA6,0xC0AC,0xC2E8,0xC4C3,0xC5B6,0xC5BE,0xC6DA,0xC8BB,
            0xC8F6,0xCBFA,0xCDDA,0xCEF4,0xD1B9,0xD4D1),   
        'A','B','C','D','E','F','G','H','J','K','L','M','N','O','P','Q','R','S','T','W','X','Y','Z');
	if V_RETURN is null then
	    if locate(V_first,'ABCDEFGHIJKLMNOPQRSTUVWXYXabcdefghijklmnopqrstuvwxyz') then    
          SET V_RETURN=upper(V_first);
		else
		  SET V_RETURN='ZZ';
		end if;
	end if;	
    RETURN V_RETURN;
END 
```

## 计算佣金

```sql
CREATE FUNCTION `getPayTotal`(
		workDayFrom TIMESTAMP ,
		workDayTo TIMESTAMP ,
		workFrom VARCHAR(10),
		workTo VARCHAR(10),
		number INT(10),
		salary DECIMAL(10 ,2),
		fee DECIMAL(10 ,2)
) 
	RETURNS decimal(10 ,2) 
	DETERMINISTIC 
	COMMENT '计算佣金' 
BEGIN

    DECLARE payTotal DECIMAL (10,2);
    DECLARE totalAmount DECIMAL (10,2);
    DECLARE commission DECIMAL (10,2);
    DECLARE days DECIMAL (10,2);
    DECLARE hours DECIMAL (10,2);

    SET days = ABS(datediff(workDayFrom, workDayTo)) + 1;
	SET hours = ABS(TIMESTAMPDIFF(minute, concat('9999-09-09 ', workFrom), concat('9999-09-09 ' , workTo))) / 60;

	IF ISNULL(number) OR ISNULL(salary) OR ISNULL(fee)  THEN
        SET payTotal = 0;
	ELSE
        SET totalAmount = days * hours * number * salary;          -- 应付工资
        SET commission = hours * salary * fee;                          -- 一个人应收的佣金
   
        IF commission > 10 THEN    -- 10元封顶
			SET payTotal = 10 * number * days +totalAmount;
	    ELSE
            SET payTotal = commission * number * days +totalAmount;
        END IF;
	END IF;

	RETURN payTotal;
END 
```

## 获取应付服务费

```sql
CREATE FUNCTION `getServiceCharge`(
		workDayFrom TIMESTAMP ,
		workDayTo TIMESTAMP ,
		workFrom VARCHAR(10),
		workTo VARCHAR(10),
		number INT(10),
		salary DECIMAL(10 ,2),
		fee DECIMAL(10 ,2)
) 
	RETURNS decimal(10 ,2) 
	DETERMINISTIC 
	COMMENT '获取应付服务费' 
BEGIN

    DECLARE payTotal DECIMAL (10,2);
    DECLARE totalAmount DECIMAL (10,2);
    DECLARE commission DECIMAL (10,2);
    DECLARE days DECIMAL (10,2);
    DECLARE hours DECIMAL (10,2);

    
	SET hours = ABS(TIMESTAMPDIFF(minute, concat('9999-09-09 ', workFrom), concat('9999-09-09 ' , workTo))) / 60;

	IF ISNULL(workDayFrom) OR ISNULL(workDayTo)  THEN
        SET days = 1;
	ELSE
        SET days = ABS(datediff(workDayFrom, workDayTo)) + 1;
	END IF;

    SET commission = hours * salary * fee;                          -- 一个人应收的佣金
   
    IF commission > 10 THEN    -- 10元封顶
    	SET payTotal = 10 * number * days;
    ELSE
    	SET payTotal = commission * number * days;
    END IF;

	RETURN payTotal;
END 
```
