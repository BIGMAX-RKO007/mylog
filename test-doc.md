---
title: "分布式系统一致性协议与存储引擎思考"
tags: ["distributed-systems", "storage", "raft"]
---

# 分布式系统一致性协议与存储引擎思考

在构建去中心化与高可用分布式存储系统时，我们通常需要在 **强一致性 (Linearizability)** 与 **写入可用性 (Availability)** 之间进行权衡。

## 1. Raft 协议核心机制

Raft 通过强领导者模型（Strong Leader）简化了一致性状态机的实现：

* **Leader 选举**：心跳驱动与随机超时机制（Election Timeout: 150ms ~ 300ms）。
* **日志复制**：Leader 接收客户端提案，广播 `AppendEntries` RPC，半数（Quorum）确认后提交（Commit）。
* **安全性保证**：只有拥有所有已提交日志的节点才有资格赢得选举（Election Restriction）。

```rust
// Raft 节点状态枚举示例
pub enum NodeRole {
    Follower,
    Candidate,
    Leader,
}
```

## 2. LSM-Tree 存储引擎与写入优化

为了在高并发写场景下保持纳秒级吞吐量，LSM-Tree (Log-Structured Merge-tree) 采用：

> 顺序写 WAL (Write-Ahead Log) + 内存 MemTable (跳表 SkipList) 架构，彻底消除随机写磁头开销。

### 核心收益对比
| 维度 | B-Tree | LSM-Tree |
|---|---|---|
| 随机写入性能 | 频繁页分裂，IOPS 受限 | 纯顺序写，极高写入吞吐 |
| 读取放大 | 较小 (固定树高) | 需检查 MemTable + 多层 SSTable (需布隆过滤器加速) |
