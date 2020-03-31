---
title: 微服务架构之分布式事务：Spring Cloud Alibaba Seata
date: 2020-03-28 14:43:00
categories: Java
tags:
  - MicroServices
  - SpringCloud
---

事务是数据库系统中非常有趣也非常重要的概念，它是数据库管理系统执行过程中的一个逻辑单元，它能够保证一个事务中的所有操作要么全部执行，要么全不执行；在 SOA 与微服务架构大行其道的今天，在分布式的多个服务中保证业务的一致性就需要我们实现分布式事务。

<!--more-->

## 为什么需要分布式事务？

微服务架构体系下，我们可以按照业务模块分层设计，单独部署，减轻了服务部署压力，也解耦了业务的耦合，避免了应用逐渐变成一个庞然怪物，从而可以轻松扩展，在某些服务出现故障时也不会影响其它服务的正常运行。总之，微服务在业务的高速发展中带给我们越来越多的优势，但是微服务并不是十全十美，因此不能盲目过度滥用，它有很多不足，而且会给系统带来一定的复杂度，其中伴随而来的分布式事务问题，是微服务架构体系下必然需要处理的一个痛点，也是业界一直关注的一个领域，因此也出现了诸如 CAP 和 BASE 等理论。

### 事务的定义

事务提供一种机制将一个活动涉及的所有操作纳入到一个不可分割的执行单元，也就是说事务提供一种 “要做就全部执行成功，要不做就一个也不做“ 的机制。

### 事务的特性

数据库的事务具有四大特性(ACID)：原子性(Actomicity)、一致性(Consistency)、隔离性(Isolation)、持久性(Durability)。

- 原子性：原子性要求，事务是一个不可分割的执行单元，事务中的所有操作要么全都执行，要么全都不执行；
- 一致性：一致性要求，事务在开始前和结束后，数据库的完整性约束没有被破坏；
- 隔离性：事务的执行是相互独立的，它们不会相互干扰，一个事务不会看到另一个正在运行过程中的事务的数据；
- 持久性：持久性要求，一个事务完成之后，事务的执行结果必须是持久化保存的。即使数据库发生崩溃，在数据库恢复后事务提交的结果仍然不会丢失；

> 注意：事务只能保证数据库的高可靠性，即数据库本身发生问题后，事务提交后的数据仍然能恢复；而如果不是数据库本身的故障，如硬盘损坏了，那么事务提交的数据可能就丢失了。这属于『高可用性』的范畴。因此，事务只能保证数据库的『高可靠性』，而『高可用性』需要整个系统共同配合实现。

### MySQL InnoDB 事务

InnoDB 是 MySQL 的一个存储引擎，它的事务是由本地事务资源管理器进行管理的：

![1][1]

事务的 ACID 通过 InnoDB 日志和锁来保证，事物的隔离性是通过数据库锁机制实现的。

- 原子性和一致性通过 Undo Log 来实现：在操作任何数据之前，首先将数据备份到一个地方（这个存储备份的地方称为 Undo Log），然后进行数据的修改，如果出现用户错误或者用户执行 ROLLBACK 语句，系统可以利用 Undo Log 中的备份将数据恢复到事务开始之前的状态。
- 持久性和通过 Redo Log 来实现：Redo Log 记录的是新数据的备份，在事务提交前，只要将 Redo Log 持久化即，不需要将数据持久化。当系统崩溃时，虽然数据没有持久化，但是 Redo Log 已经持久化，系统可以根据 Redo Log 的内容，将所欲数据恢复到最新的状态。

### 事务的隔离级别

在事务的四大特性ACID中，要求的隔离性是一种严格意义上的隔离，也就是多个事务是串行执行的，彼此之间不会受到任何干扰。这确实能够完全保证数据的安全性，但在实际业务系统中，这种方式性能不高。因此，数据库定义了四种隔离级别，隔离级别和数据库的性能是呈反比的，隔离级别越低，数据库性能越高，而隔离级别越高，数据库性能越差。

#### 事务并发执行会出现的问题

在不同的隔离级别下，数据库可能会出现的问题：

- 更新丢失：当有两个并发执行的事务，更新同一行数据，那么有可能一个事务会把另一个事务的更新覆盖掉。 当数据库没有加任何锁操作的情况下会发生；
- 脏读：一个事务读到另一个尚未提交的事务中的数据。 该数据可能会被回滚从而失效。 如果第一个事务拿着失效的数据去处理那就发生错误了；
- 不可重复读 不可重复度的含义：一个事务对同一行数据读了两次，却得到了不同的结果。它具体分为如下两种情况：
  - 虚读：在事务1两次读取同一记录的过程中，事务2对该记录进行了修改，从而事务1第二次读到了不一样的记录；
  - 幻读：事务1在两次查询的过程中，事务2对该表进行了插入、删除操作，从而事务1第二次查询的结果发生了变化；

> 不可重复读 与 脏读 的区别？ 脏读读到的是尚未提交的数据，而不可重复读读到的是已经提交的数据，只不过在两次读的过程中数据被另一个事务改过了。

#### 数据库的四种隔离级别

数据库一共有如下四种隔离级别：

- **Read uncommitted（读未提交）**：在该级别下，一个事务对一行数据修改的过程中，不允许另一个事务对该行数据进行修改，但允许另一个事务对该行数据读。 因此本级别下，不会出现更新丢失，但会出现脏读、不可重复读；
- **Read committed（读提交）**：在该级别下，未提交的写事务不允许其他事务访问该行，因此不会出现脏读；但是读取数据的事务允许其他事务的访问该行数据，因此会出现不可重复读的情况；
- **Repeatable read（重复读）**：在该级别下，读事务禁止写事务，但允许读事务，因此不会出现同一事务两次读到不同的数据的情况（不可重复读），且写事务禁止其他一切事务；
- **Serializable（序列化）**：该级别要求所有事务都必须串行执行，因此能避免一切因并发引起的问题，但效率很低；

> 隔离级别越高，越能保证数据的完整性和一致性，但是对并发性能的影响也越大。对于多数应用程序，可以优先考虑把数据库系统的隔离级别设为Read Committed。它能够避免脏读取，而且具有较好的并发性能。尽管它会导致不可重复读、幻读和第二类丢失更新这些并发问题，在可能出现这类问题的个别场合，可以由应用程序采用悲观锁或乐观锁来控制。

### 什么是分布式事务问题？

![2][2]

单体应用中，一个业务操作需要调用三个模块完成，此时数据的一致性由本地事务来保证。

![3][3]

随着业务需求的变化，单体应用被拆分成微服务应用，原来的三个模块被拆分成三个独立的应用，分别使用独立的数据源，业务操作需要调用三个服务来完成。此时每个服务内部的数据一致性由本地事务来保证，但是全局的数据一致性问题没法保证。

在微服务架构中由于全局数据一致性没法保证产生的问题就是分布式事务问题。简单来说，一次业务操作需要操作多个数据源或需要进行远程调用，就会产生分布式事务问题。

## 分布式事务

分布式事务就是指事务的参与者，支持事务的服务器，资源服务器已经事务管理器分别位于不同的分布式系统的不同节点之上。简单的说，就是一次大的操作由不通过的小操作组成，这些小操作分布在不同的服务器上，且属于不同的应用，分布式事务需要保证这些小操作要么全部成功，要么全部失败，本质上说，分布式事务就是为了保证不同数据库的数据一致性。换句话说，分布式事务 = n 个本地事务。通过事务管理器实现 n 个本地事务要么全部成功要么全部失败。

### 分布式事务基础

#### CAP 定理

![4][4]

1998年，加州大学的计算机科学家 Eric Brewer 提出，分布式系统有三个指标。一个分布式系统不可能同时满足一致性、可用性和分区容错性：

- **Consistency（一致性）**：意思是写操作之后的读操作，必须返回该值。对于数据分布在不同节点上的数据来说，一致性是指数据在多个副本直接都能保持一致的特性。如果某个节点更新了数据，那么在其他节点如果都能读取到这个最新的数据，那么就称为强一致性，如果某个节点没有被读取到，那么就是分布式不一致；
- **Availability（可用性）**：意思是只要收到用户的请求，服务器就必须给出回应。非故障节点在合理的时间内返回合理的响应。也就是说集群中一部分节点故障后，集群整体是否还能响应客户端的读写请求（数据高可用）；
- **Partition Tolerance（分区容错性）**：大多数分布式系统都分布在多个子网络。每个子网络就叫做一个区（partition）。分区容错的意思是，区间通信可能失败。比如，一台服务器放在中国，另一台服务器放在美国，这就是两个区，它们之间可能无法通信。当遇到网络分区故障的时候，仍然需要能够保证对外提供满足一致性和可用性的服务；

高可用和数据一致性是很多系统的设计目标，但是分区又是不可避免的事情，CAP三个特性只能满足其中两个，那么取舍的策略就共有三种：

- **CA without P**：如果不要求P（不允许分区），则C（强一致性）和A（可用性）是可以保证的。但放弃P的同时也就意味着放弃了系统的扩展性，也就是分布式节点受限，没办法部署子节点，这是违背分布式系统设计的初衷的。传统的关系型数据库RDBMS：Oracle、MySQL就是CA。
- **CP without A**：如果不要求A（可用），相当于每个请求都需要在服务器之间保持强一致，而P（分区）会导致同步时间无限延长(也就是等待数据同步完才能正常访问服务)，一旦发生网络故障或者消息丢失等情况，就要牺牲用户的体验，等待所有数据全部一致了之后再让用户访问系统。设计成CP的系统其实不少，最典型的就是分布式数据库，如Redis、HBase等。对于这些分布式数据库来说，数据的一致性是最基本的要求，因为如果连这个标准都达不到，那么直接采用关系型数据库就好，没必要再浪费资源来部署分布式数据库。
- **AP wihtout C**：要高可用并允许分区，则需放弃一致性。一旦分区发生，节点之间可能会失去联系，为了高可用，每个节点只能用本地数据提供服务，而这样会导致全局数据的不一致性。典型的应用就如某米的抢购手机场景，可能前几秒你浏览商品的时候页面提示是有库存的，当你选择完商品准备下单的时候，系统提示你下单失败，商品已售完。这其实就是先在 A（可用性）方面保证系统可以正常的服务，然后在数据的一致性方面做了些牺牲，虽然多少会影响一些用户体验，但也不至于造成用户购物流程的严重阻塞。

#### BASE 理论

BASE 是基于 CAP 定理演化而来，是对 CAP 中一致性和可用性权衡的结果。核心思想：即使无法做到强一致性，但每个业务根据自身的特点，采用适当的方式来使系统达到最终一致性。

BASE 理论是 Basically Available（基本可用），Soft-state（软状态/柔性事务）和 Eventually Consisten（最终一致性）三个短语的缩写，是对 CAP 中 AP 的一个扩展：

- BA 基本可用：分布式系统出现故障时，允许损失部分可用功能，保证核心功能可用。但不等价于不可用，比如：搜索引擎0.5秒返回查询结果，但由于故障，2秒响应查询结果；网页访问过大时，部分用户提供降级服务等；
- S 软状态：允许系统中存在中间状态，这个状态不影响系统整体可用性，这里指的是 CAP 中的不一致。即允许系统在不同节点间副本同步的时候存在延时；
- E 最终状态：最终一致是指经过一段时间后，所有节点数据都将会达到一致。不需要实时保证系统数据的强一致性，最终一致性是弱一致性的一种特殊情况；

BASE 解决了 CAP 中理论没有网络延迟，在 BASE 中用软引用和最终一致保证了延迟后的一致性。BASE 和 ACID 是相反的，它完全不同于 ACID 的强一致模型，而是通过牺牲强一致性来获得可用性，并允许数据在一段时间内是不一致的，但最终达到一直状态。

#### 酸碱平衡

ACID 能保证事务的强一致，即数据是实时一致的。这在本地事务中是没问题的，在分布式事务中，强一致性会极大影响分布式系统的性能，因此分布式系统中遵循 BASE 理论即可。但分布式系统的不同业务场景对一致性的要求也不同，比如交易场景，就要求强一致，因此遵循 ACID 理论，而在注册成功发送短信验证码等场景下，并不需要实时一致，因此遵循 BASE 理论即可，所以需要根据具体的业务场景，在 ACID 和 BASE 之间寻求平衡。

### 分布式事务协议

#### 两阶段提交协议：2PC

分布式系统的一个难点是如何保证架构下多个节点在进行事务性操作的时候保持一致，两阶段提交是一种使分布式系统中所有节点在进行事务提交时保持一致性而设计的一种协议；在一个分布式系统中，所有的节点虽然都可以知道自己执行操作后的状态，但是无法知道其他节点执行操作的状态，在一个事务跨越多个系统时，就需要引入一个作为协调者的组件来统一掌控全部的节点并指示这些节点是否把操作结果进行真正的提交，想要在分布式系统中实现一致性的其他协议都是在两阶段提交的基础上做的改进。

二阶段提交算法的成立基于以下假设：

- 该分布式系统中，存在一个节点作为协调者(Coordinator)，其他节点作为参与者(Cohorts)。且节点之间可以进行网络通信；
- 所有节点都采用预写式日志，且日志被写入后即被保持在可靠的存储设备上，即使节点损坏不会导致日志数据的消失；
- 所有节点不会永久性损坏，即使损坏后仍然可以恢复；

![5][5]

##### 第一阶段（投票阶段）：

1. 协调者节点向所有参与者节点询问是否可以执行提交操作(vote)，并开始等待各参与者节点的响应。
2. 参与者节点执行询问发起为止的所有事务操作，并将Undo信息和Redo信息写入日志。（注意：若成功这里其实每个参与者已经执行了事务操作。
3. 各参与者节点响应协调者节点发起的询问。如果参与者节点的事务操作实际执行成功，则它返回一个"同意"消息；如果参与者节点的事务操作实际执行失败，则它返回一个"中止"消息。

##### 第二阶段（提交执行阶段）：

当协调者节点从所有参与者节点获得的相应消息都为"同意"时：

1. 协调者节点向所有参与者节点发出"正式提交(commit)"的请求。
2. 参与者节点正式完成操作，并释放在整个事务期间内占用的资源。
3. 参与者节点向协调者节点发送"完成"消息。
4. 协调者节点受到所有参与者节点反馈的"完成"消息后，完成事务。

如果任一参与者节点在第一阶段返回的响应消息为"中止"，或者 协调者节点在第一阶段的询问超时之前无法获取所有参与者节点的响应消息时：

1. 协调者节点向所有参与者节点发出"回滚操作(rollback)"的请求。
2. 参与者节点利用之前写入的Undo信息执行回滚，并释放在整个事务期间内占用的资源。
3. 参与者节点向协调者节点发送"回滚完成"消息。
4. 协调者节点受到所有参与者节点反馈的"回滚完成"消息后，取消事务。

不管最后结果如何，第二阶段都会结束当前事务。

二阶段提交看起来确实能够提供原子性的操作，但是不幸的事，二阶段提交还是有几个缺点的：

1. 执行过程中，所有参与节点都是事务阻塞型的。当参与者占有公共资源时，其他第三方节点访问公共资源不得不处于阻塞状态。
2. 参与者发生故障。协调者需要给每个参与者额外指定超时机制，超时后整个事务失败。（没有多少容错机制）
3. 协调者发生故障。参与者会一直阻塞下去。需要额外的备机进行容错。（这个可以依赖后面要讲的Paxos协议实现HA）
4. 二阶段无法解决的问题：协调者再发出commit消息之后宕机，而唯一接收到这条消息的参与者同时也宕机了。那么即使协调者通过选举协议产生了新的协调者，这条事务的状态也是不确定的，没人知道事务是否被已经提交。

为此，Dale Skeen和Michael Stonebraker在“A Formal Model of Crash Recovery in a Distributed System”中提出了三阶段提交协议（3PC）。

#### 三阶段提交协议：3PC

为了解决两阶段提交在协议的一些问题，三阶段提交引入了超时机制和准备阶段，如果协调者或者参与者在规定的之间内没有接受到来自其他节点的响应，就会根据当前的状态选择提交或者终止整个事务，准备阶段的引入其实让事务的参与者有了除回滚之外的其他选择。

与两阶段提交不同的是，三阶段提交有两个改动点：

- 引入超时机制。同时在协调者和参与者中都引入超时机制；
- 在第一阶段和第二阶段中插入一个准备阶段。保证了在最后提交阶段之前各参与节点的状态是一致的；

也就是说，除了引入超时机制之外，3PC把2PC的准备阶段再次一分为二，这样三阶段提交就有CanCommit、PreCommit、DoCommit三个阶段。

![6][6]

##### CanCommit 阶段：

3PC的CanCommit阶段其实和2PC的准备阶段很像。协调者向参与者发送commit请求，参与者如果可以提交就返回Yes响应，否则返回No响应。

1. 事务询问 协调者向参与者发送CanCommit请求。询问是否可以执行事务提交操作。然后开始等待参与者的响应。
2. 响应反馈 参与者接到CanCommit请求之后，正常情况下，如果其自身认为可以顺利执行事务，则返回Yes响应，并进入预备状态。否则反馈No。

##### PreCommit 阶段：

协调者根据参与者的反应情况来决定是否可以记性事务的PreCommit操作。根据响应情况，有以下两种可能。 假如协调者从所有的参与者获得的反馈都是Yes响应，那么就会执行事务的预执行。

1. 发送预提交请求：协调者向参与者发送PreCommit请求，并进入Prepared阶段。
2. 事务预提交：参与者接收到PreCommit请求后，会执行事务操作，并将undo和redo信息记录到事务日志中。
3. 响应反馈：如果参与者成功的执行了事务操作，则返回ACK响应，同时开始等待最终指令。

假如有任何一个参与者向协调者发送了No响应，或者等待超时之后，协调者都没有接到参与者的响应，那么就执行事务的中断。

1. 发送中断请求：协调者向所有参与者发送abort请求。
2. 中断事务：参与者收到来自协调者的abort请求之后（或超时之后，仍未收到协调者的请求），执行事务的中断。

##### doCommit 阶段：

该阶段进行真正的事务提交，也可以分为以下两种情况：

###### 执行提交

1. 发送提交请求：协调接收到参与者发送的ACK响应，那么他将从预提交状态进入到提交状态。并向所有参与者发送doCommit请求。
2. 事务提交：参与者接收到doCommit请求之后，执行正式的事务提交。并在完成事务提交之后释放所有事务资源。
3. 响应反馈：事务提交完之后，向协调者发送Ack响应。
4. 完成事务：协调者接收到所有参与者的ack响应之后，完成事务。

###### 中断事务

协调者没有接收到参与者发送的ACK响应（可能是接受者发送的不是ACK响应，也可能响应超时），那么就会执行中断事务。

1. 发送中断请求：协调者向所有参与者发送abort请求。
2. 事务回滚：参与者接收到abort请求之后，利用其在阶段二记录的undo信息来执行事务的回滚操作，并在完成回滚之后释放所有的事务资源。
3. 反馈结果：参与者完成事务回滚之后，向协调者发送ACK消息。
4. 中断事务：协调者接收到参与者反馈的ACK消息之后，执行事务的中断。

##### 三阶段提交协议优缺点

- **优点：**：降低了参与者的阻塞范围，并且能够在出现单点故障后继续达成一致；
- **缺点：**：参与者接收到 preCommit 消息后，如果网络出现分区，此时协调者所在的节点和参与者无法进行正常的网络通信，这种情况下，该参与者依然会进行事务的提交，这必然出现数据的不一致性；

## 分布式事务解决方案

分布式事务的解决方案有如下几种：

- 全局消息
- 基于可靠消息服务的分布式事务
- 最大努力通知
- TCC
- Saga

### 全局事务（DTP模型）

全局事务基于DTP模型实现。DTP是由X/Open组织提出的一种分布式事务模型——X/Open Distributed Transaction Processing Reference Model。它规定了要实现分布式事务，需要三种角色：

- AP：Application 应用系统 它就是我们开发的业务系统，在我们开发的过程中，可以使用资源管理器提供的事务接口来实现分布式事务。
- TM：Transaction Manager 事务管理器
  - 分布式事务的实现由事务管理器来完成，它会提供分布式事务的操作接口供我们的业务系统调用。这些接口称为TX接口。
  - 事务管理器还管理着所有的资源管理器，通过它们提供的XA接口来同一调度这些资源管理器，以实现分布式事务。
  - DTP只是一套实现分布式事务的规范，并没有定义具体如何实现分布式事务，TM可以采用2PC、3PC、Paxos等协议实现分布式事务。
- RM：Resource Manager 资源管理器
  - 能够提供数据服务的对象都可以是资源管理器，比如：数据库、消息中间件、缓存等。大部分场景下，数据库即为分布式事务中的资源管理器。
  - 资源管理器能够提供单数据库的事务能力，它们通过XA接口，将本数据库的提交、回滚等能力提供给事务管理器调用，以帮助事务管理器实现分布式的事务管理。 
  - XA是DTP模型定义的接口，用于向事务管理器提供该资源管理器(该数据库)的提交、回滚等能力。
  - DTP只是一套实现分布式事务的规范，RM具体的实现是由数据库厂商来完成的。

#### XA 事务

XA 是 DTP 模型，它定义了 TM（事务管理器）和 RM（本地资源管理器）之间进行通信的接口，在 XA 规范中，数据库充当本地资源管理器角色，应用充当事务管理器角色，即生成全局 txId，调用 XAResource 接口，把多个本地事务协调为全局统一的分布式事务。

MySQL 的 InnoDB 引擎其实能够支持分布式事务，也就是我们经常说的 XA 事务；XA 事务就是用了两阶段提交协议实现分布式事务，其中事务管理器为协调者，而资源管理器就是分布式事务的参与者。

MySQL 中的 XA 事务实现：

- 资源管理器提供了访问事务资源的能力，数据库就是一种常见的资源管理器，它能够提交或者回滚其管理的事务；
- 事务管理器协调整个分布式事务的各个部分，它与多个资源管理器通信，分别处理他们管理的事务，这些事务都是整体事务的一个分支。

XA 确实能够保证较强的一致性，但是在 MySQL XA 的执行过程中会对相应的资源加锁，阻塞其他事务对该资源的访问，如果事务长时间没有 COMMIT 或者 ROLLBACK，其实会对数据库造成比较严重的影响。

XA 优缺点：

- 优点：尽量保证了数据的强一致，实现成本低，在各大主流数据库都有实现；
- 缺点：
  - 单点问题：事务管理器在整个流程中扮演的角色很关键，如果宕机，比如在第一阶段已经完成，在第二阶段正准备提交的时候事务管理器宕机，则资源管理器就会一直阻塞，导致数据库无法使用；
  - 同步阻塞：在准备就绪之后，资源管理器中的资源一直处于阻塞，直到提交完成，释放资源；
  - 数据不一致：两阶段提交协议虽然为分布式数据强一致性所设计，但仍然存在数据不一致性的可能，比如在第二阶段中，假设协调者发出了事务commit 的通知，但是因为网络问题该通知仅被一部分参与者所收到并执行了 commit 操作，其余的参与者则因为没有收到通知一直处于阻塞状态，这时候就产生了数据的不一致性；

### 基于可靠消息服务的分布式事务

这种实现分布式事务的方式需要通过消息中间件来实现。假设有A和B两个系统，分别可以处理任务A和任务B。此时系统A中存在一个业务流程，需要将任务A和任务B在同一个事务中处理。其基于消息中间件实现的这种分布式事务如下：

![7][7]

首先看下事务的正常处理流程：

1. 在系统A处理任务A前，首先向消息中间件发送一条消息。
2. 消息中间件收到后将该条消息持久化，但并不投递。此时下游系统B仍然不知道该条消息的存在。
3. 消息中间件持久化成功后，便向系统A返回一个确认应答。
4. 系统A收到确认应答后，则可以开始处理任务A。
5. 任务A处理完成后，向消息中间件发送Commit请求。该请求发送完成后，对系统A而言，该事务的处理过程就结束了，此时它可以处理别的任务了。
6. 但commit消息可能会在传输途中丢失，从而消息中间件并不会向系统B投递这条消息，从而系统就会出现不一致性。这个问题由消息中间件的事务回查机制完成。
7. 消息中间件收到Commit指令后，便向系统B投递该消息，从而触发任务B的执行。
8. 当任务B执行完成后，系统B向消息中间件返回一个确认应答，告诉消息中间件该消息已经成功消费，此时，这个分布式事务完成。

上述过程可以得出如下几个结论：

1. 消息中间件扮演者分布式事务协调者的角色。
2. 系统 A 完成任务 A 后，到任务 B 执行完成之间，会存在一定的时间差，在这个时间差内，整个系统处于数据不一致的状态，但这断在的不一致是可以接受的，因为经过短暂的时间之后，系统又可以保持数据一致性，满足 BASE 理论。

#### 事务回滚

在上面的流程中，第 4 步如果事务 A 处理失败，就会进入回滚流程：

![8][8]

1. 若系统A在处理任务A时失败，那么就会向消息中间件发送Rollback请求。和发送Commit请求一样，系统A发完之后便可以认为回滚已经完成，它便可以去做其他的事情。
2. 消息中间件收到回滚请求后，直接将该消息丢弃，而不投递给系统B，从而不会触发系统B的任务B。

> 此时系统又处于一致性状态，因为任务A和任务B都没有执行。

#### 超时轮询

在实际系统中，Commit 和 Rollback 指令都可能在传输途中丢失，这时候就需要超时轮询机制来保证数据一致性：

![9][9]

系统A除了实现正常的业务流程外，还需提供一个事务询问的接口，供消息中间件调用。当消息中间件收到一条事务型消息后便开始计时，如果到了超时时间也没收到系统A发来的Commit或Rollback指令的话，就会主动调用系统A提供的事务询问接口询问该系统目前的状态。该接口会返回三种结果：

- 提交：若获得的状态是“提交”，则将该消息投递给系统B；
- 回滚：若获得的状态是“回滚”，则直接将条消息丢弃；
- 处理中：若获得的状态是“处理中”，则继续等待；

消息中间件的超时询问机制能够防止上游系统因在传输过程中丢失Commit/Rollback指令而导致的系统不一致情况，而且能降低上游系统的阻塞时间，上游系统只要发出Commit/Rollback指令后便可以处理其他任务，无需等待确认应答。而Commit/Rollback指令丢失的情况通过超时询问机制来弥补，这样大大降低上游系统的阻塞时间，提升系统的并发度。

#### 消息投递的可靠性保证

上游系统执行完任务并向消息中间件提交了 Commit 指令后，便可以处理其他任务了，此时它可以认为事务已经完成，接下来消息中间件一定会保证消息被下游系统成功消费掉，实现了消息投递的可靠性保证。

![10][10]

消息中间件向下游系统投递完消息后便进入阻塞等待状态，下游系统便立即进行任务处理，任务处理完成后便向消息中间件返回应答，消息中间件收到确认应答后便任务该事务处理完毕。如果消息在投递过程中丢失，或消息的确认应答在返回途中丢失，那么消息中间件在等待应该超时之后就会重新投递，直到下游消费者返回消费成功响应为止。

**消息投递失败后，为什么不回滚消息，而是不断尝试重新投递**

我们知道，当系统A将向消息中间件发送 Commit 指令后，它便去做别的事情了。如果此时消息投递失败，需要回滚的话，就需要让系统A事先提供回滚接口，这无疑增加了额外的开发成本，业务系统的复杂度也将提高。

由于不断尝试，B 系统一定要保证自己的幂等性：

1. 在 Redis 中记录一个标识，表明自己已经处理过这个消息了。
2. 在 Zookeeper 中创建一个 node，也就是代表某个消息自己已经处理过了，如果重复消息过来，创建 zookeeper node 就会报错。

**上游系统 A 向消息中间件提交消息时采用的是异步方式**

上游系统和消息中间件之间采用异步通信是为了提高系统并发度。业务系统直接和用户打交道，这种异步通信方式能够极大程度降低用户等待时间，此外异步通信相对于同步通信，没有长时间的阻塞等待，因此系统并发性也大大提高。但是异步通信可能会引起 Commit/Rollback 指令丢失的问题，这就由消息中间件的超时询问机制来弥补

**消息中间件和下游系统之间采用同步通信**

异步通信提升性能，但随之增加系统复杂度；而同步系统虽热降低系统并发度，但是实现成本较低。因此，在对并发度要求不是很高的情况下，或者服务器资源较为充裕的情况下，我们可以选择同步来降低系统的复杂度。 我们知道，消息中间件是一个独立于业务系统的第三方中间件，它不和任何业务系统产生直接的耦合，它也不和用户产生直接的关联，它一般部署在独立的服务器集群上，具有良好的可扩展性，所以不必太过于担心它的性能，如果处理速度无法满足我们的要求，可以增加机器来解决。而且，即使消息中间件处理速度有一定的延迟那也是可以接受的，因为前面所介绍的BASE理论就告诉我们了，我们追求的是最终一致性，而非实时一致性，因此消息中间件产生的时延导致事务短暂的不一致是可以接受的。

### 最大努力通知

**最大努力送达型**

最大努力送达性是针对弱 XA 的一种补偿策略，它采用事务表记录所有的事务操作 SQL

![11][11]

1. 子事务提交成功，将会删除日志。
2. 如果执行失败，则会按照配置的重试次数，尝试再次提交，即最大努力的进行提交，尽量保证数据一致性，这里可以根据业务采用同步重试和异步重试。

**优缺点：**

- **优点：**无锁资源，性能损耗小；
- **缺点：**多次尝试提交失败后，事务无法回滚，它仅适用于事务最终一定能够成功的业务场景；

**定期校对型**

可靠消息最终一致性方案就是定期校对型的一个实现

![12][12]

1. 上游系统在完成任务后，向消息中间件同步地发送一条消息，确保消息中间件持久化这条消息，然后上游系统继续执行其他任务。
2. 消息中间件收到消息后负责将该消息同步投递给相应的下游系统，并触发下游系统的任务执行。
3. 当下游系统处理成功后，向消息中间件反馈确认应答，消息中间件便可以将该条消息删除，从而该事务完成。

**消息中间件向下游系统投递消息失败**，可以利用消息中间件的重试机制，在消息中间件中设置消息的重试次数和重试时间间隔，对于网络不稳定导致的消息投递失败的情况，往往重试几次后消息便可以成功投递，如果超过了重试的上限仍然投递失败，那么消息中间件不再投递该消息，而是记录在失败消息表中，消息中间件需要提供失败消息的查询接口，下游系统会定期查询失败消息，并将其消费，这就是所谓的“定期校对”。

**上游系统向消息中间件发送消息失败**，可以在上游系统建立消息重发机制，在上游系统建立一张本地消息表，并将任务处理过程和向本地消息表中插入消息这两个步骤放在同一个本地事务中完成。如果向本地插入消息失败，就会触发回滚，之前的任务处理结果就会被取消。如果这两步都执行成功，那么该本地事务也都完成了，接下来有一个专门的消息发送者不断地发送本地消息表中的消息，如果发送失败它会返回重试。

### 两阶段、补偿型：TCC

![14][14]

TCC即为 Try Confirm Cancel，它属于补偿型分布式事务。顾名思义，TCC实现分布式事务一共有三个步骤：

- Try：这个过程并未执行业务，只是完成所有业务的一致性检查，并预留好执行所需的全部资源
  - 尝试执行业务
  - 完成所有业务检查（一致性）
  - 预留必须业务资源（准隔离性）
- Confirm：这个过程真正开始执行业务，由于Try阶段已经完成了一致性检查，因此本过程直接执行，而不做任何检查。并且在执行的过程中，会使用到Try阶段预留的业务资源。
  - 确认执行业务
  - 真正执行业务，不作任何业务检查
  - 只使用 Try 阶段预留的业务资源
  - Confirm 操作满足幂等性
- Cancel：若业务执行失败，则进入Cancel阶段，它会释放所有占用的业务资源，并回滚Confirm阶段执行的操作。
  - 取消执行业务
  - 释放 Try 阶段预留的业务资源
  - Cancel 操作满足幂等性

**优缺点：**

**优点：**TCC 实现的是强一致性；

**缺点：**

- TCC 模型对业务的侵入性比较强，改造难度大
- TCC 全局事务必须基于 RM 本地事务来实现

  假设服务 B 没有基于 RM 本地事务，一旦事务 B 的 Try 操作失败， TCC 决定回滚全局事务，B 的 Cancel 操作需要判断哪些操作已经写到 DB、哪些操作还没有写到 DB：假设 B 的 Try 业务有5个写库操作，B 的 Cancel 业务则需要逐个判断这5个操作是否生效，并将生效的操作执行反向操作；但是由于 B 的 Cancel 业务也有 5 个反向的写库操作，因此一旦 B 的 Cancel 操作也中途出错，则后续 B 的 Cancel 执行任务更加麻烦。

  基于 RM 本地事务的 TCC 事务，这种情况就很容易处理：B 的 Try 操作中途失败，TCC 事务框架将其参与 RM 本地事务直接 RollBack 即可。后续 TCC 事务框架决定回滚全局事务时，在知道 B 的 Try 操作涉及的 RM 本地事务已经 RollBack 的情况下，无需执行 B Cancel 操作。

- TCC 事务框架应该提供 Comfirm 和 Cancel 服务的幂等性保证

  在 TCC 事务模型中，Confrim 和 Cancel 业务可能会被重复调用，比如：全局事务在提交/回滚时会调用各 TCC 服务的 Confirm/Cancel 业务逻辑。执行这些 Confirm/Cancel 业务时，可能会出现如网络中断的故障而使得全局事务不能完成。因此，故障恢复机制后续仍然会重新提交/回滚 这些未完成的事务，这样就会再次调用参与该全局事务的各 TCC 服务的 Confirm/Cancel 业务逻辑。

### Saga

两阶段提交其实可以保证事务的强一致性，但是在很多业务场景下，我们其实只需要保证业务的最终一致性，在一定的时间窗口内，多个系统中的数据不一致是可以接受的，在过了时间窗口之后，所有系统都会返回一致的结果。

Saga 其实就一种简化的分布式事务解决方案，它将一系列的分布式操作转化成了一系列的本地事务，在每一个本地事务中我们都会更新数据库并且向集群中的其他服务发送一条的新的消息来触发下一个本地的事务；一旦本地的事务因为违反了业务逻辑而失败，那么就会立刻触发一系列的回滚操作来撤回之前本地事务造成的副作用。

**LLT：**

相比于本地的数据库事务来说，长事务（Long Lived Transaction）会对一些数据库资源持有相对较长的一段时间，这会严重地影响其他正常数据库事务的执行，为了解决这一问题，Hector Garcia-Molina 和 Kenneth Salem 在 1987 发布了论文 Sagas 用于解决这一问题。

如果一个 LLT 能够被改写成一系列的相互交错重叠的多个数据库事务，那么这个 LLT 就是一个 Saga；数据库系统能够保证 Saga 中一系列的事务要么全部成功执行、要么它们的补偿事务能够回滚全部的副作用，保证整个分布式事务的最终一致性。Saga 的概念和它的实现都是非常简单的，但是它却能够有很大的潜力增加整个系统的处理能力。

事务越长并且越复杂，那么这个事务由于异常而被回滚以及死锁的可能性就会逐渐增加，Saga 会将一个 LLT 分解成多个短事务，能够非常明显地降低事务被回滚的风险。

**协同与编排：**

当我们使用 Saga 模式开发分布式事务时，有两种协调不同服务的方式，一种是协同（Choreography），另一种是编排（Orchestration）。

如果对于一个分布式事务，我们采用协同的方式进行开发，每一个本地的事务都会触发一个其他服务中的本地事务的执行，也就是说事务的执行过程是一个流的形式进行的。

当我们选择使用协同的方式处理事务时，服务之间的通信其实就是通过事件进行的，每一个本的事务最终都会向服务的下游发送一个新的事件，既可以是消息队列中的消息，也可以是 RPC 的请求，只是下游提供的接口需要保证幂等和重入。

除此之外，通过协同方式创建的分布式事务其实并没有明显的中心化节点，多个服务参与者之间的交互协议要从全局来定义，每个服务能够处理以及发送的事件和接口都需要进行比较严谨的设计，尽可能提供抽象程度高的事件或者接口，这样各个服务才能实现自治并重用已有的代码和逻辑。

如果我们不想使用协同的方式对分布式事务进行处理，那么也可以选择编排的方式实现分布式事务，编排的方式引入了中心化的协调器节点，我们通过一个 Saga 对象来追踪所有的子任务的调用情况，根据任务的调用情况决定是否需要调用对应的补偿方案，并在网络请求出现超时时进行重试。

在这里我们就引入了一个中心化的『协调器』，它会保存当前分布式事务进行到底的状态，并根据情况对事务进行回滚或者提交操作，在服务编排的过程中，我们是从协调者本身触发考虑整个事务的执行过程的，相对于协同的方式，编排实现的过程相对来说更为简单。

协同与编排其实是两种思路截然相反的模式，前者强调各个服务的自治与去中心化，后者需要一个中心化的组件对事务执行的过程进行统一的管理，两者的优缺点其实就是中心化与去中心化的优缺点，中心化的方案往往都会造就一个『上帝服务』，其中包含了非常多组织与集成其他节点的工作，也会有单点故障的问题，而去中心化的方案就会带来管理以及调试上的不便，当我们需要追踪一个业务的执行过程时就需要跨越多个服务进行，增加了维护的成本。

**下游约束：**

当我们选择使用 Saga 对分布式事务进行开发时，会对分布式事务的参与者有一定的约束，每一个事务的参与者都需要保证：

1. 提供接口和补偿副作用的接口；
2. 接口支持重入并通过全局唯一的 ID 保证幂等；

这样我们就能够保证一个长事务能够在网络通信发生超时时进行重试，同时在需要对事务进行回滚时调用回滚接口达到我们的目的。

Saga 这种模式其实完全放弃了同时满足事务四大基本特性 ACID 的想法，而是选择降低实现分布式事务的难度并减少资源同步以及锁定带来的问题，选择实现 BASE(Basic Availability, Soft, Eventual consistency) 事务，达到业务上的基本可用以及最终一致性，在绝大多数的业务场景中，实现最终一致性就能够基本满足业务的全部需求，极端场景下还是应该选择两阶段提交或者干脆放弃分布式事务这种易错的实现方式，转而使用单机中的数据库事务来解决。

## Seata 简介

Seata（Simple Extensible Autonomous Transaction Architecture，简单可扩展自治事务框架）是 2019 年 1 月份蚂蚁金服和阿里巴巴共同开源的分布式事务解决方案。致力于提供高性能和简单易用的分布式事务服务。Seata 将为用户提供了 AT、TCC、SAGA 和 XA 事务模式，为用户打造一站式的分布式解决方案。

> Seata 原名 Fescar（Fast & Easy Commit And Rollback）全局事务服务（Global Transaction Service ，简称GTS）开源版。

## Seata 原理和设计

**定义一个分布式事务：**

![15][15]

我们可以把一个分布式事务理解成一个包含了若干分支事务的全局事务，全局事务的职责是协调其下管辖的分支事务达成一致，要么一起成功提交，要么一起失败回滚。此外，通常分支事务本身就是一个满足ACID的本地事务。这是我们对分布式事务结构的基本认识，与 XA 是一致的。

**协议分布式事务处理过程的三个组件：**

![16][16]

- Transaction Coordinator (TC)： 事务协调器，维护全局事务的运行状态，负责协调并驱动全局事务的提交或回滚；
- Transaction Manager (TM)： 控制全局事务的边界，负责开启一个全局事务，并最终发起全局提交或全局回滚的决议；
- Resource Manager (RM)： 控制分支事务，负责分支注册、状态汇报，并接收事务协调器的指令，驱动分支（本地）事务的提交和回滚；

**一个典型的分布式事务过程：**

![17][17]

- TM 向 TC 申请开启一个全局事务，全局事务创建成功并生成一个全局唯一的 XID；
- XID 在微服务调用链路的上下文中传播；
- RM 向 TC 注册分支事务，将其纳入 XID 对应全局事务的管辖；
- TM 向 TC 发起针对 XID 的全局提交或回滚决议；
- TC 调度 XID 下管辖的全部分支事务完成提交或回滚请求；

## Seata 模式

Seata 会有 4 种分布式事务解决方案，分别是 AT 模式、TCC 模式、Saga 模式和 XA 模式。

### Seata AT 模式

AT 模式(Automatic Transaction Mode)是一种无侵入的分布式事务解决方案。在 AT 模式下，用户只需关注自己的“业务 SQL”，用户的 “业务 SQL” 作为一阶段，Seata 框架会自动生成事务的二阶段提交和回滚操作。

**与 XA 方案有什么不同？**

Seata 的事务提交方式跟 XA 协议的两段式提交在总体上来说基本是一致的，那它们之间有什么不同呢？

我们都知道 XA 协议它依赖的是数据库层面来保障事务的一致性，也即是说 XA 的各个分支事务是在数据库层面上驱动的，由于 XA 的各个分支事务需要有 XA 的驱动程序，一方面会导致数据库与 XA 驱动耦合，另一方面它会导致各个分支的事务资源锁定周期长，这也是它没有在互联网公司流行的重要因素。

基于 XA 协议以上的问题，Seata 另辟蹊径，既然在依赖数据库层会导致这么多问题，那我就从应用层做手脚，这还得从 Seata 的 RM 模块说起，前面也说过 RM 的主要作用了，其实 RM 在内部做了对数据库操作的代理层，如下：

![30][30]

Seata 在数据源做了一层代理层，所以我们使用 Seata 时，我们使用的数据源实际上用的是 Seata 自带的数据源代理 DataSourceProxy，Seata 在这层代理中加入了很多逻辑，主要是解析 SQL，把业务数据在更新前后的数据镜像组织成回滚日志，并将 undo log 日志插入 undo_log 表中，保证每条更新数据的业务 sql 都有对应的回滚日志存在。

这样做的好处就是，本地事务执行完可以立即释放本地事务锁定的资源，然后向 TC 上报分支状态。当 TM 决议全局提交时，就不需要同步协调处理了，TC 会异步调度各个 RM 分支事务删除对应的 undo log 日志即可，这个步骤非常快速地可以完成；当 TM 决议全局回滚时，RM 收到 TC 发送的回滚请求，RM 通过 XID 找到对应的 undo log 回滚日志，然后执行回滚日志完成回滚操作。

![31][31]

如上图所示，XA 方案的 RM 是放在数据库层的，它依赖了数据库的 XA 驱动程序。

![32][32]

如上图所示，Seata 的 RM 实际上是已中间件的形式放在应用层，不用依赖数据库对协议的支持，完全剥离了分布式事务方案对数据库在协议支持上的要求。

**分支事务如何提交和回滚？**

**第一阶段：**

![33][33]

分支事务利用 RM 模块中对 JDBC 数据源代理，加入了若干流程，对业务 SQL 进行解释，把业务数据在更新前后的数据镜像组织成回滚日志，并生成 undo log 日志，对全局事务锁的检查以及分支事务的注册等，利用本地事务 ACID 特性，将业务 SQL 和 undo log 写入同一个事物中一同提交到数据库中，保证业务 SQL 必定存在相应的回滚日志，最后对分支事务状态向 TC 进行上报。

**第二阶段：**

TM决议全局提交：

![34][34]

当 TM 决议提交时，就不需要同步协调处理了，TC 会异步调度各个 RM 分支事务删除对应的 undo log 日志即可，这个步骤非常快速地可以完成。这个机制对于性能提升非常关键，我们知道正常的业务运行过程中，事务执行的成功率是非常高的，因此可以直接在本地事务中提交，这步对于提升性能非常显著。

TM决议全局回滚：

![35][35]

当 TM 决议回滚时，RM 收到 TC 发送的回滚请求，RM 通过 XID 找到对应的 undo log 回滚日志，然后利用本地事务 ACID 特性，执行回滚日志完成回滚操作并删除 undo log 日志，最后向 TC 进行回滚结果上报。

业务对以上所有的流程都无感知，业务完全不关心全局事务的具体提交和回滚，而且最重要的一点是 Seata 将两段式提交的同步协调分解到各个分支事务中了，分支事务与普通的本地事务无任何差异，这意味着我们使用 Seata 后，分布式事务就像使用本地事务一样，完全将数据库层的事务协调机制交给了中间件层 Seata 去做了，这样虽然事务协调搬到应用层了，但是依然可以做到对业务的零侵入，从而剥离了分布式事务方案对数据库在协议支持上的要求，且 Seata 在分支事务完成之后直接释放资源，极大减少了分支事务对资源的锁定时间，完美避免了 XA 协议需要同步协调导致资源锁定时间过长的问题。

> 查看官方最新的 [Seata AT 模式](https://seata.io/zh-cn/docs/dev/mode/at-mode.html) 文档。

### Seata TCC 模式

TCC 模式需要用户根据自己的业务场景实现 Try、Confirm 和 Cancel 三个操作；事务发起方在一阶段执行 Try 方式，在二阶段提交执行 Confirm 方法，二阶段回滚执行 Cancel 方法。

![22][22]

TCC 三个方法描述：

- Try：资源的检测和预留；
- Confirm：执行的业务操作提交；要求 Try 成功 Confirm 一定要能成功；
- Cancel：预留资源释放；

**TCC 设计 - 业务模型分 2 阶段设计：**

用户接入 TCC ，最重要的是考虑如何将自己的业务模型拆成两阶段来实现。

以“扣钱”场景为例，在接入 TCC 前，对 A 账户的扣钱，只需一条更新账户余额的 SQL 便能完成；但是在接入 TCC 之后，用户就需要考虑如何将原来一步就能完成的扣钱操作，拆成两阶段，实现成三个方法，并且保证一阶段 Try  成功的话 二阶段 Confirm 一定能成功。

![23][23]

如上图所示，

Try 方法作为一阶段准备方法，需要做资源的检查和预留。在扣钱场景下，Try 要做的事情是就是检查账户余额是否充足，预留转账资金，预留的方式就是冻结 A 账户的 转账资金。Try 方法执行之后，账号 A 余额虽然还是 100，但是其中 30 元已经被冻结了，不能被其他事务使用。

二阶段 Confirm 方法执行真正的扣钱操作。Confirm 会使用 Try 阶段冻结的资金，执行账号扣款。Confirm 方法执行之后，账号 A 在一阶段中冻结的 30 元已经被扣除，账号 A 余额变成 70 元 。

如果二阶段是回滚的话，就需要在 Cancel 方法内释放一阶段 Try 冻结的 30 元，使账号 A 的回到初始状态，100 元全部可用。

用户接入 TCC 模式，最重要的事情就是考虑如何将业务模型拆成 2 阶段，实现成 TCC 的 3 个方法，并且保证 Try 成功 Confirm 一定能成功。相对于 AT 模式，TCC 模式对业务代码有一定的侵入性，但是 TCC 模式无 AT 模式的全局行锁，TCC 性能会比 AT 模式高很多。

**TCC 设计 - 允许空回滚：**

![24][24]

Cancel 接口设计时需要允许空回滚。在 Try 接口因为丢包时没有收到，事务管理器会触发回滚，这时会触发 Cancel 接口，这时 Cancel 执行时发现没有对应的事务 xid 或主键时，需要返回回滚成功。让事务服务管理器认为已回滚，否则会不断重试，而 Cancel 又没有对应的业务数据可以进行回滚。

**TCC 设计 - 防悬挂控制：**

![25][25]

悬挂的意思是：Cancel 比 Try 接口先执行，出现的原因是 Try 由于网络拥堵而超时，事务管理器生成回滚，触发 Cancel 接口，而最终又收到了 Try 接口调用，但是 Cancel 比 Try 先到。按照前面允许空回滚的逻辑，回滚会返回成功，事务管理器认为事务已回滚成功，则此时的 Try 接口不应该执行，否则会产生数据不一致，所以我们在 Cancel 空回滚返回成功之前先记录该条事务 xid 或业务主键，标识这条记录已经回滚过，Try 接口先检查这条事务xid或业务主键如果已经标记为回滚成功过，则不执行 Try 的业务操作。

**TCC 设计 - 幂等控制：**

![26][26]

幂等性的意思是：对同一个系统，使用同样的条件，一次请求和重复的多次请求对系统资源的影响是一致的。因为网络抖动或拥堵可能会超时，事务管理器会对资源进行重试操作，所以很可能一个业务操作会被重复调用，为了不因为重复调用而多次占用资源，需要对服务设计时进行幂等控制，通常我们可以用事务 xid 或业务主键判重来控制。

**TCC 和 AT 区别：**

回顾总览中的描述：一个分布式的全局事务，整体是 两阶段提交 的模型。全局事务是由若干分支事务组成的，分支事务要满足 两阶段提交 的模型要求，即需要每个分支事务都具备自己的：

- 一阶段 prepare 行为；
- 二阶段 commit 或 rollback 行为；

![36][36]

根据两阶段行为模式的不同，我们将分支事务划分为 Automatic (Branch) Transaction Mode 和 TCC (Branch) Transaction Mode.

AT 模式基于 支持本地 **ACID** 事务 的 **关系型数据库**：

- 一阶段 prepare 行为：在本地事务中，一并提交业务数据更新和相应回滚日志记录；
- 二阶段 commit 行为：马上成功结束，**自动** 异步批量清理回滚日志；
- 二阶段 rollback 行为：通过回滚日志，**自动** 生成补偿操作，完成数据回滚；

相应的，TCC 模式，不依赖于底层数据资源的事务支持：

- 一阶段 prepare 行为：调用 **自定义** 的 prepare 逻辑；
- 二阶段 commit 行为：调用 **自定义** 的 commit 逻辑；
- 二阶段 rollback 行为：调用 **自定义** 的 rollback 逻辑；

所谓 TCC 模式，是指支持把 **自定义** 的分支事务纳入到全局事务的管理中。

> 查看官方最新的 [Seata TCC 模式](https://seata.io/zh-cn/docs/dev/mode/tcc-mode.html) 文档。

### Seata Saga 模式

在 Saga 模式下，分布式事务内有多个参与者，每一个参与者都是一个冲正补偿服务，需要用户根据业务场景实现其正向操作和逆向回滚操作。

分布式事务执行过程中，依次执行各参与者的正向操作，如果所有正向操作均执行成功，那么分布式事务提交。如果任何一个正向操作执行失败，那么分布式事务会去退回去执行前面各参与者的逆向回滚操作，回滚已提交的参与者，使分布式事务回到初始状态。

![13][13]

Saga 模式下分布式事务通常是由事件驱动的，各个参与者之间是异步执行的，Saga 模式是一种长事务解决方案。

Saga 模式适用于业务流程长且需要保证事务最终一致性的业务系统，Saga 模式一阶段就会提交本地事务，无锁、长流程情况下可以保证性能。事务参与者可能是其它公司的服务或者是遗留系统的服务，无法进行改造和提供 TCC 要求的接口，可以使用 Saga 模式。

Saga 模式的优势是：

- 一阶段提交本地数据库事务，无锁，高性能；
- 参与者可以采用事务驱动异步执行，高吞吐；
- 补偿服务即正向服务的“反向”，易于理解，易于实现；

缺点：Saga 模式由于一阶段已经提交本地数据库事务，且没有进行“预留”动作，所以不能保证隔离性。后续会讲到对于缺乏隔离性的应对措施。

**基于状态机引擎的 Saga 实现**

![27][27]

目前 Saga 的实现一般有两种，一种是通过事件驱动架构实现，一种是基于注解加拦截器拦截业务的正向服务实现。Seata 目前是采用事件驱动的机制来实现的，Seata 实现了一个状态机，可以编排服务的调用流程及正向服务的补偿服务，生成一个 json 文件定义的状态图，状态机引擎驱动到这个图的运行，当发生异常的时候状态机触发回滚，逐个执行补偿服务。当然在什么情况下触发回滚用户是可以自定义决定的。该状态机可以实现服务编排的需求，它支持单项选择、并发、异步、子状态机调用、参数转换、参数映射、服务执行状态判断、异常捕获等功能。

**状态机引擎原理**

![28][28]

该状态机引擎的基本原理是，它基于事件驱动架构，每个步骤都是异步执行的，步骤与步骤之间通过事件队列流转，
极大的提高系统吞吐量。每个步骤执行时会记录事务日志，用于出现异常时回滚时使用，事务日志会记录在与业务表所在的数据库内，提高性能。

**状态机引擎设计**

![29][29]

该状态机引擎分成了三层架构的设计，最底层是“事件驱动”层，实现了 EventBus 和消费事件的线程池，是一个 Pub-Sub 的架构。第二层是“流程控制器”层，它实现了一个极简的流程引擎框架，它驱动一个“空”的流程执行，“空”的意思是指它不关心流程节点做什么事情，它只执行每个节点的 process 方法，然后执行 route 方法流转到下一个节点。这是一个通用框架，基于这两层，开发者可以实现任何流程引擎。最上层是“状态机引擎”层，它实现了每种状态节点的“行为”及“路由”逻辑代码，提供 API 和状态图仓库，同时还有一些其它组件，比如表达式语言、逻辑计算器、流水生成器、拦截器、配置管理、事务日志记录等。

> 查看官方最新的 [Seata Saga 模式](https://seata.io/zh-cn/docs/dev/mode/saga-mode.html) 文档。

## 环境

- JDK：1.8
- Spring Boot：2.2.4.RELEASE
- Spring Cloud：Hoxton.SR1
- Spring Cloud Alibaba：2.2.0.RELEASE
- Seata：1.1.0

## 集成 Seata

Seata分TC、TM和RM三个角色，TC（Server端）为单独服务端部署，TM和RM（Client端）由业务系统集成。

- [部署脚本](https://github.com/seata/seata/tree/1.1.0/script)
- [更多示例](https://github.com/seata/seata-samples/)
- [参数配置](https://seata.io/zh-cn/docs/user/configurations.html)

### 安装 seata-server

我这里使用 Docker 部署，[参考官方部署指南](https://seata.io/zh-cn/docs/ops/deploy-guide-beginner.html)

**使用 Docker-Compose 部署：**

Server 端存储模式（store.mode）现有file、db两种（后续将引入raft），file 模式无需改动，直接启动即可，我这里使用 DB 模式。

> 注：file模式为单机模式，全局事务会话信息内存中读写并持久化本地文件root.data，性能较高;db模式为高可用模式，全局事务会话信息通过db共享，相应性能差些。

建表，全局事务会话信息由3块内容构成，全局事务-->分支事务-->全局锁，对应表global_table、branch_table、lock_table：

```sql
-- -------------------------------- The script used when storeMode is 'db' --------------------------------
-- the table to store GlobalSession data
CREATE TABLE IF NOT EXISTS `global_table`
(
    `xid`                       VARCHAR(128) NOT NULL,
    `transaction_id`            BIGINT,
    `status`                    TINYINT      NOT NULL,
    `application_id`            VARCHAR(32),
    `transaction_service_group` VARCHAR(32),
    `transaction_name`          VARCHAR(128),
    `timeout`                   INT,
    `begin_time`                BIGINT,
    `application_data`          VARCHAR(2000),
    `gmt_create`                DATETIME,
    `gmt_modified`              DATETIME,
    PRIMARY KEY (`xid`),
    KEY `idx_gmt_modified_status` (`gmt_modified`, `status`),
    KEY `idx_transaction_id` (`transaction_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8;

-- the table to store BranchSession data
CREATE TABLE IF NOT EXISTS `branch_table`
(
    `branch_id`         BIGINT       NOT NULL,
    `xid`               VARCHAR(128) NOT NULL,
    `transaction_id`    BIGINT,
    `resource_group_id` VARCHAR(32),
    `resource_id`       VARCHAR(256),
    `branch_type`       VARCHAR(8),
    `status`            TINYINT,
    `client_id`         VARCHAR(64),
    `application_data`  VARCHAR(2000),
    `gmt_create`        DATETIME(6),
    `gmt_modified`      DATETIME(6),
    PRIMARY KEY (`branch_id`),
    KEY `idx_xid` (`xid`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8;

-- the table to store lock data
CREATE TABLE IF NOT EXISTS `lock_table`
(
    `row_key`        VARCHAR(128) NOT NULL,
    `xid`            VARCHAR(96),
    `transaction_id` BIGINT,
    `branch_id`      BIGINT       NOT NULL,
    `resource_id`    VARCHAR(256),
    `table_name`     VARCHAR(32),
    `pk`             VARCHAR(36),
    `gmt_create`     DATETIME,
    `gmt_modified`   DATETIME,
    PRIMARY KEY (`row_key`),
    KEY `idx_branch_id` (`branch_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8;
```

~/seata/file.conf 配置文件，主要修改自定义事务组名称，事务日志存储模式为db及数据库连接信息：

```conf
service {
  #vgroup->rgroup
  vgroupMapping.leo_tx_group = "default" # 事务组名称为：leo_tx_group，和客户端自定义的名称对应
}

store {
  ## store mode: file...db
  mode = "db"

  ## database store property
  db {
    ## the implement of javax.sql.DataSource, such as DruidDataSource(druid)/BasicDataSource(dbcp) etc.
    datasource = "dbcp"
    ## mysql/oracle/h2/oceanbase etc.
    dbType = "mysql"
    driverClassName = "com.mysql.jdbc.Driver"
    url = "jdbc:mysql://127.0.0.1:3306/seata"
    user = "mysql"
    password = "mysql"
    minConn = 1
    maxConn = 10
    globalTable = "global_table"
    branchTable = "branch_table"
    lockTable = "lock_table"
    queryLimit = 100
  }
}
```

docker-compose.yaml：

```yaml
version: "3"
services:
  seata-server:
    image: seataio/seata-server:1.1.0
    hostname: seata-server
    ports:
      - "8091:8091"
    environment:
      - SEATA_PORT=8091
      - STORE_MODE=db
    volumes:
      - ~/seata/file.conf:/seata-server/resources/file.conf
      # 可以配置注册中心和配置中心
      # - ~/seata/registry.conf:/seata-server/resources/registry.conf
```

### 客户端集成 Spring Cloud Alibaba Seata

在 parent pom.xml 引入 Spring Cloud Alibaba 依赖：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-alibaba-dependencies</artifactId>
            <version>2.2.0.RELEASE</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

微服务项目 pom.xml 加入 Seata 依赖：

```xml
<dependency>
  <groupId>com.alibaba.cloud</groupId>
  <artifactId>spring-cloud-starter-alibaba-seata</artifactId>
  <exclusions>
    <exclusion>
      <groupId>io.seata</groupId>
      <artifactId>seata-spring-boot-starter</artifactId>
    </exclusion>
  </exclusions>
</dependency>
<dependency>
  <groupId>io.seata</groupId>
  <artifactId>seata-spring-boot-starter</artifactId>
  <version>1.1.0</version>
</dependency>
```

> 由于 Spring Cloud Alibaba 2.2.0 内嵌 seata-spring-boot-starter 1.0.0，我在集成 1.0.0 的时候遇到很多坑，就不排雷了直接升级到 1.1.0

创建日志回滚表：

```sql
-- for AT mode you must to init this sql for you business database. the seata server not need it.
CREATE TABLE IF NOT EXISTS `undo_log`
(
    `id`            BIGINT(20)   NOT NULL AUTO_INCREMENT COMMENT 'increment id',
    `branch_id`     BIGINT(20)   NOT NULL COMMENT 'branch transaction id',
    `xid`           VARCHAR(100) NOT NULL COMMENT 'global transaction id',
    `context`       VARCHAR(128) NOT NULL COMMENT 'undo_log context,such as serialization',
    `rollback_info` LONGBLOB     NOT NULL COMMENT 'rollback info',
    `log_status`    INT(11)      NOT NULL COMMENT '0:normal status,1:defense status',
    `log_created`   DATETIME     NOT NULL COMMENT 'create datetime',
    `log_modified`  DATETIME     NOT NULL COMMENT 'modify datetime',
    PRIMARY KEY (`id`),
    UNIQUE KEY `ux_undo_log` (`xid`, `branch_id`)
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8 COMMENT ='AT transaction mode undo table';
```

客户端支持 file.conf 和 registry.conf 文件配置，我这里使用 Spring yaml 配置。

修改 application.yml 文件：

```yaml
# spring:
#   cloud:
#     alibaba:
#       seata:
#         tx-service-group: leo_tx_group #自定义事务组名称需要与seata-server中的对应
seata:
  enabled: true
  application-id: applicationName
  tx-service-group: leo_tx_group
  enable-auto-data-source-proxy: true
  use-jdk-proxy: false
  client:
    undo:
      data-validation: true
      log-serialization: jackson
      log-table: undo_log
    log:
      exceptionRate: 100
  service:
    vgroup-mapping:
      leo_tx_group: default
    grouplist:
      default: 127.0.0.1:8091
    enable-degrade: false
    disable-global-transaction: false
  config:
    type: file
    nacos:
      namespace:
      serverAddr: localhost
      group: SEATA_GROUP
  registry:
    type: file
    nacos:
      cluster: default
      server-addr: localhost
      namespace:
```

0.9.0版本开始seata支持自动代理数据源，默认开启自动代理。

手动配置可参考下面的配置：

在启动类中取消数据源的自动创建：

```java
@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)
@EnableFeignClients
public class SeataOrderServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(SeataOrderServiceApplication.class, args);
    }
}
```

创建配置使用Seata对数据源进行代理：

```java
/**
 * 使用Seata对数据源进行代理
 */
@Configuration
public class DataSourceProxyConfig {

//	@Bean
//	@ConfigurationProperties(prefix = "spring.datasource")
//	public DataSource dataSource() {
//		return new DruidDataSource();
//	}

	// Seata 是通过代理数据源实现事务分支，所以需要先配置一个数据源的代理,.需要将 DataSourceProxy 设置为主数据源，否则事务无法回滚
//	@Bean
//	public DataSourceProxy dataSourceProxy(DataSource dataSource) {
//		return new DataSourceProxy(dataSource);
//	}

//	@Bean
//	@Primary
//	public DataSourceProxy dataSourceProxy(DataSource dataSource) {
//		return new DataSourceProxy(dataSource);
//	}

	@Bean
	public MybatisSqlSessionFactoryBean sqlSessionFactoryBean(DataSource dataSourceProxy) {
		// 这里用 MybatisSqlSessionFactoryBean 代替了 SqlSessionFactoryBean，否则 MyBatisPlus 不会生效
		MybatisSqlSessionFactoryBean mybatisSqlSessionFactoryBean = new MybatisSqlSessionFactoryBean();
		mybatisSqlSessionFactoryBean.setDataSource(dataSourceProxy);
		return mybatisSqlSessionFactoryBean;
	}
}
```

**AT 模式伪代码：**

可以在多个项目开启 GlobalTransactional 用 RPC 测试分布式事务。

```java
  @GlobalTransactional(rollbackFor = Exception.class) // 开启全局事务
  @Override
  public void testAT() {
    log.info("globalTransactional begin, Xid:{}", RootContext.getXID());

    // 数据库操作……

    // OpenFeign 调用……

    throw new RuntimeException("Test AT Rollback");
  }
```

> [TCC 模式 Demo](https://github.com/seata/seata-samples/tree/master/tcc)

## 其他开源框架

- https://github.com/codingapi/tx-lcn/
- https://github.com/QNJR-GROUP/EasyTransaction/
- https://github.com/liuyangming/ByteTCC/
- https://github.com/changmingxie/tcc-transaction/

## 参考

- https://github.com/seata/seata/
- https://seata.io/zh-cn/docs/overview/what-is-seata.html
- https://seata.io/zh-cn/blog/seata-at-tcc-saga.html
- https://seata.io/zh-cn/blog/seata-at-mode-design.html
- https://juejin.im/post/5aa3c7736fb9a028bb189bca/
- http://www.ruanyifeng.com/blog/2018/07/cap.html
- https://github.com/alibaba/spring-cloud-alibaba/
- https://github.com/seata/seata-samples/

[1]: /images/java/spring-cloud-alibaba-seata/1.jpg
[2]: /images/java/spring-cloud-alibaba-seata/2.jpg
[3]: /images/java/spring-cloud-alibaba-seata/3.jpg
[4]: /images/java/spring-cloud-alibaba-seata/4.jpg
[5]: /images/java/spring-cloud-alibaba-seata/5.jpg
[6]: /images/java/spring-cloud-alibaba-seata/6.jpg
[7]: /images/java/spring-cloud-alibaba-seata/7.jpg
[8]: /images/java/spring-cloud-alibaba-seata/8.jpg
[9]: /images/java/spring-cloud-alibaba-seata/9.jpg
[10]: /images/java/spring-cloud-alibaba-seata/10.jpg
[11]: /images/java/spring-cloud-alibaba-seata/11.jpg
[12]: /images/java/spring-cloud-alibaba-seata/12.jpg
[13]: /images/java/spring-cloud-alibaba-seata/13.jpg
[14]: /images/java/spring-cloud-alibaba-seata/14.jpg
[15]: /images/java/spring-cloud-alibaba-seata/15.jpg
[16]: /images/java/spring-cloud-alibaba-seata/16.jpg
[17]: /images/java/spring-cloud-alibaba-seata/17.jpg
[18]: /images/java/spring-cloud-alibaba-seata/18.jpg
[19]: /images/java/spring-cloud-alibaba-seata/19.jpg
[20]: /images/java/spring-cloud-alibaba-seata/20.jpg
[21]: /images/java/spring-cloud-alibaba-seata/21.jpg
[22]: /images/java/spring-cloud-alibaba-seata/22.jpg
[23]: /images/java/spring-cloud-alibaba-seata/23.jpg
[24]: /images/java/spring-cloud-alibaba-seata/24.jpg
[25]: /images/java/spring-cloud-alibaba-seata/25.jpg
[26]: /images/java/spring-cloud-alibaba-seata/26.jpg
[27]: /images/java/spring-cloud-alibaba-seata/27.jpg
[28]: /images/java/spring-cloud-alibaba-seata/28.jpg
[29]: /images/java/spring-cloud-alibaba-seata/29.jpg
[30]: /images/java/spring-cloud-alibaba-seata/30.jpg
[31]: /images/java/spring-cloud-alibaba-seata/31.jpg
[32]: /images/java/spring-cloud-alibaba-seata/32.jpg
[33]: /images/java/spring-cloud-alibaba-seata/33.jpg
[34]: /images/java/spring-cloud-alibaba-seata/34.jpg
[35]: /images/java/spring-cloud-alibaba-seata/35.jpg
[36]: /images/java/spring-cloud-alibaba-seata/36.jpg
