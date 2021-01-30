
## 递归的思想

以此类推是递归的基本思想。

> 具体来讲就是把规模大的问题转化为规模小的相似的子问题来解决。在函数实现时，因为解决大问题的方法和解决小问题的方法往往是同一个方法，所以就产生了函数调用它自身的情况。另外这个解决问题的函数必须有明显的结束条件，这样就不会产生无限递归的情况了。

### 递归的两个条件

1. 可以通过递归调用来缩小问题规模，且新问题与原问题有着相同的形式。（自身调用）
2. 存在一种简单情境，可以使递归在简单情境下退出。（递归出口）

### 递归三要素：

1. 一定有一种可以退出程序的情况；
2. 总是在尝试将一个问题化简到更小的规模;
3. 父问题与子问题不能有重叠的部分;

### 递归：自已（方法）调用自已

例子：用递归把目录下所有的目录及文件全部显示出来

```java
public class B {
    public static void main(String[] args) {
        File file = new File("f:\\123");
        listAllFile(file);
    }

    public static void listAllFile(File file) {
        File[] strs = file.listFiles();
        for (int i = 0; i < strs.length; i++) {
            // 判断strs[i]是不是目录
            if (strs[i].isDirectory()) {
                listAllFile(strs[i]);//递归调用自己
                System.out.println("目录="+strs[i].getName());
            } else {
                System.out.println("文件名="+strs[i].getName());
            }
        }    
    }
}
```

### 递归算法的一般形式：

```java
func( mode){
    if(endCondition){      //递归出口
          end;
    }else{
         func(mode_small)  //调用本身，递归
    }
}
```

例子: 求一个数的阶乘是练习简单而典型的例子，阶乘的递推公式为：factorial(n)=n*factorial(n-1)，其中n为非负整数,且0!=1,1!=1

我们根据递推公式可以轻松的写出其递归函数：

```java
public static long factorial(int n) throws Exception {
    if (n < 0)
        throw new Exception("参数不能为负！");
    else if (n == 1 || n == 0)
        return 1;
    else
        return n * factorial(n - 1);
}
```

## 递归的过程

在求解6的阶乘时，递归过程如下所示。

![1][1]

我们会惊奇的发现这个过程和栈的工作原理一致对，递归调用就是通过栈这种数据结构完成的。整个过程实际上就是一个栈的入栈和出栈问题。然而我们并不需要关心这个栈的实现，这个过程是由系统来完成的。

> 那么递归中的“递”就是入栈，递进；“归”就是出栈，回归。

我们可以通过一个更简单的程序来模拟递进和回归的过程：

```java
/*
 关于 递归中 递进和回归的理解*/
public static void recursion_display(int n) {
    int temp=n;//保证前后打印的值一样
     System.out.println("递进:" + temp);
    if (n > 0) {
        recursion_display(--n);
    }
    System.out.println("回归:" + temp);
}
```

### 递归的例子

斐波那契数列

斐波那契数列的递推公式:Fib(n)=Fib(n-1)+Fib(n-2)，指的是如下所示的数列：

1、1、2、3、5、8、13、21.....

按照其递推公式写出的递归函数如下：

```java
public static int fib(int n) throws Exception {
    if (n < 0)
        throw new Exception("参数不能为负！");
    else if (n == 0 || n == 1)
        return n;
    else
        return fib(n - 1) + fib(n - 2);
}
```

递归调用的过程像树一样，通过观察会发现有很多重复的调用。

![2][2]

## 归并排序

归并排序也是递归的典型应用，其思想：将序列分为若干有序序列（开始为单个记录），两个相邻有序的序列合并成一个有序的序列，以此类推，直到整个序列有序。

```java
//递归过程是：在递进的过程中拆分数组，在回归的过程合并数组
public static void mergeSort(int[] source, int[] temp, int first, int last) {
    if (first < last) {
        int mid = (first + last) / 2;
        mergeSort(source, temp, first, mid);    //归并排序前半个子序列
        mergeSort(source, temp, mid + 1, last); //归并排序后半个子序列
        merge(source, temp, first, mid, last);    //在回归过程中合并
    } else if (first == last) {                    //待排序列只有一个，递归结束
        temp[first] = source[first];
    }
}
```

同样调用过程向树一样，但是它并没有重复调用的问题。在递进的过程中拆分数组，在回归的过程合并数组 。通过递归来实现归并排序，程序结构和条理非常清晰。

![3][3]

## java 递归得到部门树

```java
public DepartmentUserTreeNode getTree(String location,String  name) {  
        List<DepartmentUserTreeNode> depts = deparDao.qryDepts();  
        DepartmentUserTreeNode rootDept = deparDao.qryRootDept();  
          
          
        recursion(depts, rootDept,0,location,name);  
          
        return rootDept;  
          
    }  
      
      
    private int recursion(List<DepartmentUserTreeNode> list, DepartmentUserTreeNode node,int count,String location,String  name) {  
        List<DepartmentUserTreeNode> childList = getChildList(list, node);// 得到子节点列表  
        List<Employee> emps = empDao.qryByDept(node.getDeptId(),location,name);  
        count = CollectionUtils.isEmpty(emps)?0:emps.size();  
          
          
        node.setEmps(emps);  
        
        if (!CollectionUtils.isEmpty(childList)) {  
            
           node.setDepts(childList);  
           
            Iterator<DepartmentUserTreeNode> it = childList.iterator();  
            while (it.hasNext()) {  
                DepartmentUserTreeNode n = (DepartmentUserTreeNode) it.next();  
                count = count+recursion(list, n,count,location,name);  
            }  
              
        } else {  
            node.setDepts(null);  
        }  
          
        node.setEmpCount(count);  
        return count;  
    }  
      
    private List<DepartmentUserTreeNode> getChildList(List<DepartmentUserTreeNode> list, DepartmentUserTreeNode node) {  
        List<DepartmentUserTreeNode> nodeList = new ArrayList<DepartmentUserTreeNode>();  
        Iterator<DepartmentUserTreeNode> it = list.iterator();  
        while (it.hasNext()) {  
            DepartmentUserTreeNode n = (DepartmentUserTreeNode) it.next();  
            if (n.getParentId().equals(node.getDeptId()) ) {  
                nodeList.add(n);  
            }  
        }  
        return nodeList;  
    } 
```
> 输入 LIST数据, JAVA递归 ，得到部门树，部门人员，以及，当前部门下所有的人员数（一直到底）

## JAVA 递归实现构造无限层级树形菜单

1. 构造一个实体类，用来存储节点，所以我们构造的需要四个对象（id，pid，name，和chirenList）
2. 构造菜单结构
3. 构造子菜单，如此循环，通过pid判断上级菜单

```java 
/**
 * 类名称：Tree
 * 类描述：树形结构
 */
public class Tree {
 
  private String id;
  private String pId;
  private String name;
  public String getId() {
    return id;
  }
 
  public void setId(String id) {
    this.id = id;
  }
 
  public String getpId() {
    return pId;
  }
 
  public void setpId(String pId) {
    this.pId = pId;
  }
 
  public String getName() {
    return name;
  }
 
  public void setName(String name) {
    this.name = name;
  }
 
  @Override
  public String toString() {
    return "Tree [id=" + id + ", pId=" + pId + ", name=" + name + "]";
  }
 
}
```

```java 
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
 
/**
 * 类名称：MenuTreeUtil
 * 类描述：递归构造树型结构
 */
public class MenuTreeUtil {
   
  public static Map<String,Object> mapArray = new LinkedHashMap<String, Object>(); 
  public List<Tree> menuCommon; 
  public List<Object> list = new ArrayList<Object>(); 
    
  public List<Object> menuList(List<Tree> menu){   
    this.menuCommon = menu; 
    for (Tree x : menu) {   
      Map<String,Object> mapArr = new LinkedHashMap<String, Object>(); 
      if(x.getpId()=="0"){ 
        mapArr.put("id", x.getId()); 
        mapArr.put("name", x.getName());  
        mapArr.put("pid", x.getpId());  
        mapArr.put("childList", menuChild(x.getId()));  
        list.add(mapArr); 
      } 
    }   
    return list; 
  } 
   
  public List<?> menuChild(String id){ 
    List<Object> lists = new ArrayList<Object>(); 
    for(Tree a:menuCommon){ 
      Map<String,Object> childArray = new LinkedHashMap<String, Object>(); 
      if(a.getpId() == id){ 
        childArray.put("id", a.getId()); 
        childArray.put("name", a.getName()); 
        childArray.put("pid", a.getpId()); 
        childArray.put("childList", menuChild(a.getId()));
        lists.add(childArray); 
      } 
    } 
    return lists; 
  } 
 
}
```

```java
/**
   * 显示APP树形结构
   */
  @RequestMapping(value = { "getAPPTree" }, produces = "text/html;charset=UTF-8")
  @ResponseBody
  public String getAPPTree(HttpServletRequest request, HttpServletResponse response) throws Exception {
    Map<String, Object> returnmap = new HashMap<>();
    MenuTreeUtil menuTree = new MenuTreeUtil();
    PageData pd = this.getPageData();
    try {
      //这里的方法是根据前台的机构类型代码来查找数据库数据的，这里不多加解释，因人而异
      List<Tree> list = dataDicService.buildTree(pd.getString("instType"));
      List<Object> menuList = menuTree.menuList(list);
      //区别于web端，这边APP端list不能转为json格式，直接将list传给前台，转成json对象的话vuejs前台无法识别渲染
      returnmap.put("list", menuList);
    } catch (Exception e) {
      logger.error(e.getMessage());
    }
    return JsonMapper.toJsonString(returnmap);
```


[1]: /images/java/java-recursion/1.png
[2]: /images/java/java-recursion/2.png
[3]: /images/java/java-recursion/3.png
