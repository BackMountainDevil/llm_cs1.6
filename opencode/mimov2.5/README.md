# CS 1.6 Web - Browser Edition

基于 Three.js 的网页版 CS1.6 风格射击游戏，无需安装，打开浏览器即可游玩。

## 运行方式

由于使用了 ES Modules，需要本地服务器。在项目目录运行以下命令之一：

```bash
# Python
python -m http.server 8000

# Node.js (npx，无需安装)
npx serve .

# Node.js (全局安装 http-server)
http-server -p 8000

# PHP
php -S localhost:8000
```

然后打开浏览器访问 `http://localhost:8000`

> 注意：直接双击打开 `index.html` 无法运行，因为浏览器安全策略会阻止 ES Modules 加载。

## 游戏功能

### 核心玩法
- **5v5 对战**：恐怖分子 (T) vs 反恐精英 (CT)，每队5人（1名玩家 + 4名AI）
- **回合制**：共10回合，先赢6回合的一方获胜
- **买枪阶段**：每回合开始有15秒准备时间，可购买武器和护甲
- **炸弹机制**：T 方可在 A/B 点安装炸弹，CT 方可拆除

### 地图系统
| 地图 | 特点 |
|------|------|
| **Dust Slope** | 经典沙漠风格，中央高台 + 四条斜坡，开阔交战 |
| **Bridge City** | 城市工业风格，多层桥梁 + 阶梯，立体战术 |

### 武器系统
| 武器 | 阵营 | 价格 | 伤害 | 射速 |
|------|------|------|------|------|
| Glock | T | $200 | 22 | 慢 |
| USP | CT | $200 | 28 | 慢 |
| AK-47 | T | $2700 | 36 | 快 |
| M4A1 | CT | $3100 | 32 | 快 |

### AI 系统
- 简单巡逻行为
- 发现敌人后追击
- 自动瞄准射击
- 战斗中左右移动闪避

### 音效系统
- Web Audio API 合成音效
- 射击、命中、死亡、换弹、购买、爆炸音效

## 操作说明

| 按键 | 功能 |
|------|------|
| `W` `A` `S` `D` | 移动 |
| 鼠标 | 瞄准（需先点击画布锁定指针） |
| 左键 | 射击 |
| 右键 | 安装/拆除炸弹 |
| `B` | 打开/关闭买枪菜单 |
| `R` | 换弹 |
| `空格` | 跳跃 |
| `Ctrl` | 蹲下（移动速度减半） |

## 项目结构

```
cs16-web/
├── index.html          # 入口页面
├── css/style.css       # 游戏UI样式
├── js/
│   ├── main.js         # 入口初始化，地图/阵营选择
│   ├── config.js       # 游戏配置常量
│   ├── renderer.js     # Three.js 渲染器
│   ├── map.js          # Dust Slope 地图
│   ├── map-bridge.js   # Bridge City 地图
│   ├── player.js       # 玩家类（移动/射击/生命）
│   ├── ai.js           # AI 敌人行为
│   ├── weapon.js       # 武器系统
│   ├── bomb.js         # 炸弹安装/拆除机制
│   ├── ui.js           # HUD / 买枪菜单
│   ├── input.js        # 键盘鼠标输入
│   └── audio.js        # Web Audio 合成音效
└── README.md
```

## 技术栈

- **Three.js r160** - 3D 渲染（CDN 引入）
- **ES Modules** - 模块化代码组织
- **Web Audio API** - 合成音效
- **原生 JavaScript** - 无框架依赖

## 浏览器要求

- Chrome 61+ / Firefox 60+ / Safari 11+ / Edge 79+
- WebGL 支持
- Pointer Lock API 支持
