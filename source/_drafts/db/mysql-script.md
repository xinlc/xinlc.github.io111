
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
DELIMITER $
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

DELIMITER ;
CALL proc1();
```
