---
title: LoRA
tags: 
    - 深度学习
    - 微调
    - LoRA
    - 八股
    - 手撕
category: Deep Learning
---
记录常见pytorch版的LoRA实现

```python
import torch
import torch.nn as nn

class LoRALinear(nn.Module):
    def __init__(self, in_features, out_features, r):
        super(LoRALinear, self).__init__()
        self.in_features = in_features  # 对应 d
        self.out_features = out_features  # 对应 k
        self.r = r  # 低秩值

        # 原始权重矩阵，冻结
        self.weight = nn.Parameter(torch.randn(in_features, out_features)) #(d,k)
        self.weight.requires_grad = False  # 冻结
        # 偏置项，可选
        self.bias = nn.Parameter(torch.zeros(out_features))
        self.bias.requires_grad = False  # 冻结

        # LoRA 部分的参数，初始化 A 从均值为 0 的正态分布中采样，B 为全零
        self.B = nn.Parameter(torch.empty(out_features, r))  # 形状为 (d, r)
        self.A = nn.Parameter(torch.zeros(r, in_features))  # 形状为 (r, k)
        nn.init.normal_(self.A, mean=0.0, std=0.02)  # 初始化 A


    def forward(self, x):
        # 原始部分
        original_output = torch.nn.functional.linear(x, self.weight, self.bias)
        # LoRA 增量部分
        delta_W = torch.matmul(self.B, self.A)  # 形状为 (d,k)
        lora_output = torch.nn.functional.linear(x, delta_W)
        # 总输出
        return original_output + lora_output

class LoRAAttention(nn.Module):
    def __init__(self, dim, rank):
        super(LoRAAttention, self).__init__()
        self.dim = dim  # 对应 d_model
        self.rank = rank # 低秩值

        # 原始的 QKV 权重，冻结
        self.original_q_W = nn.Linear(dim, dim)
        self.original_k_W = nn.Linear(dim, dim)
        self.original_v_W = nn.Linear(dim, dim)
        self.original_o_W = nn.Linear(dim, dim)

        for p in self.original_q_W.parameters():
            p.requires_grad = False
        for p in self.original_k_W.parameters():
            p.requires_grad = False
        for p in self.original_v_W.parameters():
            p.requires_grad = False

        self.q_B = nn.Parameter(torch.zeros(dim, rank))
        self.q_A = nn.Parameter(torch.empty(rank, dim))
        nn.init.normal_(self.q_A, mean=0.0, std=0.02)

        self.k_B = nn.Parameter(torch.zeros(dim, rank))
        self.k_A = nn.Parameter(torch.empty(rank, dim))
        nn.init.normal_(self.k_A, mean=0.0, std=0.02)

        self.v_B = nn.Parameter(torch.zeros(dim, rank))
        self.v_A = nn.Parameter(torch.empty(rank, dim))
        nn.init.normal_(self.v_A, mean=0.0, std=0.02)

    def forward(self, q, k, v):
        #(b,l,d)
        #计算原始值
        Q = self.original_q_W(q)
        K = self.original_k_W(k)
        V = self.original_v_W(v)

        #计算增量部分
        delta_q = torch.matmul(q, self.q_B) #(b,l,r)
        delta_q = torch.matmul(delta_q, self.q_A) #(b,l,d)

        delta_k = torch.matmul(k, self.k_B) #(b,l,r)
        delta_k = torch.matmul(delta_k, self.k_A) #(b,l,d)

        delta_v = torch.matmul(v, self.v_B) #(b,l,r)
        delta_v = torch.matmul(delta_v, self.v_A) #(b,l,d)

        Q = Q + delta_q #(b,l,d)
        K = K + delta_k
        V = V + delta_v

        attn = torch.matmul(Q, K.transpose(-2, -1)) / (self.embed_dim ** 0.5) #(b,l,l)
        attn = torch.nn.functional.softmax(attn, dim=-1)
        out = torch.matmul(attn, V) #(b,l,d)
        out = self.o_W(out)
        return out

def count_params(module: torch.nn.Module):
    trainable = 0
    total = 0
    for p in module.parameters():
        total += p.numel()
        if p.requires_grad:
            trainable += p.numel()
    return trainable, total

if __name__ == "__main__":
    b, l, d = 1, 512, 768
    r = 8
    lora = LoRALinear(in_features=d, out_features=d, r = r).to(device='cuda')
    trainable, total = count_params(lora)
    print(f'trainable : {trainable:,}')
    # d*r + r*k = 768*8+8*768=6144+6144=12288
    print(f'total     : {total:,}')
    #(d*k + k) + d*r + r*k = (768*768+768)+768*8+8*768=590592+6144+6144=602880

    lora = LoRAAttention(d, r).to(device='cuda')
    trainable, total = count_params(lora)
    print(f'trainable : {trainable:,}')
    #3*2*r*d + d*d+d = 6rd + d^2+d = 36864+590592=6227456
    print(f'total     : {total:,}')
    #4*(d*d+d) + 3*2*r*d = 4(d^2+d) + 6rd = 2362368+36864=2399232
```

