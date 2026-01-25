/**
 * 项目入口页面 - JavaScript主文件
 * 功能：项目按钮生成、API音乐播放器控制、交互处理
 * API: 酷我音乐多选点歌 - 已内置cookie无需传入
 */

// ========== 配置区域 ==========

/**
 * 项目配置数组
 * 格式：{ name: "项目名称", url: "项目链接", icon: "字体图标类名" }
 * 注意：如果url为空字符串""，则该按钮会被隐藏
 */
const PROJECTS = [
    // 实际项目（有URL的）
    { name: "home", url: "https://uegov.world", icon: "fas fa-rocket" },
    { name: "我的三体", url: "/3d", icon: "fas fa-gamepad" },
    { name: "三体2", url: "/2d", icon: "fas fa-palette" },
    { name: "永远的单摆", url: "/bai/dev", icon: "fas fa-cube" },
    { name: "单摆", url: "/bai", icon: "fas fa-chart-line" },
    
    // 预留项目（无URL的，将被隐藏）
    { name: "Github主页", url: "http://bgithub.xyz/yingo-server", icon: "fas fa-music" },
    { name: "网站后台", url: "https://yingo2.netlify.app", icon: "fas fa-video" },
    { name: "openlist", url: "/cloud", icon: "fas fa-robot" },
    { name: "聊天室", url: "/chat", icon: "fas fa-globe" },
    { name: "music1", url: "/music", icon: "fas fa-database" },
    { name: "music2", url: "http://yingo6.netlify.app", icon: "fas fa-mobile-alt" },
    { name: "洛伦兹吸引子", url: "/luo", icon: "fas fa-cloud" },
    { name: "追捕", url: "/zhui", icon: "fas fa-code" },
    { name: "字醒", url: "/word", icon: "fas fa-lock" },
    { name: "壁纸", url: "/wall", icon: "fas fa-lock" },
    { name: "博客", url: "http://yingos.netlify.app/", icon: "fas fa-lock" },
    { name: "流萤 Firebee", url: "/firefly", icon: "fas fa-lock" },
    { name: "十日备案", url: "https://icp-yingo.netlify.app/", icon: "fas fas fa-robot" },
    { name: "项目 15", url: "", icon: "fas fa-star" }
];

/**
 * 完整歌单配置数组（共150首歌曲）
 * 格式：{ name: "歌曲名", artist: "歌手", fallbackUrl: "备用链接" }
 * 注意：歌曲名用于API搜索，备用链接用于API调用失败时的降级方案
 */
const COMPLETE_PLAYLIST = [
    // 第1-10首
    { name: "苍穹之间", artist: "王天戈", fallbackUrl: "https://yingo3.netlify.app/0/1/1.mp3" },
    { name: "Cymatics", artist: "Nigel Stanford", fallbackUrl: "https://yingo3.netlify.app/0/2/1.mp3" },
    { name: "Liyue 璃月", artist: "HOYO-MiX、陈致逸", fallbackUrl: "https://yingo3.netlify.app/0/2/3.mp3" },
    { name: "黑塔", artist: "白翎", fallbackUrl: "https://yingo3.netlify.app/0/3/1.mp3" },
    { name: "将我葬于梦魇", artist: "三无Marblue", fallbackUrl: "https://yingo3.netlify.app/0/4/4.1/1.mp3" },
    { name: "WUWAHAHAHA(English Version)", artist: "PeachyFranny", fallbackUrl: "https://yingo3.netlify.app/0/4/4.2/1.mp3" },
    { name: "不鼓自鸣", artist: "尚雯婕", fallbackUrl: "https://yingo3.netlify.app/0/4/4.3/1.mp3" },
    { name: "四季-冬", artist: "Antonio Vivaldi、原声带", fallbackUrl: "https://yingo3.netlify.app/0/5/5.1/1.mp3" },
    { name: "我用什么把你留住(Live)", artist: "福禄寿FloruitShow", fallbackUrl: "https://yingo3.netlify.app/0/5/5.2/1.mp3" },
    { name: "轻", artist: "刘雪茗、三体宇宙", fallbackUrl: "https://yingo3.netlify.app/0/5/5.3/1.mp3" },
    
    // 第11-20首
    { name: "歌者", artist: "谭维维", fallbackUrl: "https://yingo3.netlify.app/0/5/5.4/1.mp3" },
    { name: "Bustling Afternoon of Mondstadt 蒙德城繁忙的午后", artist: "陈致逸、HOYO-MiX", fallbackUrl: "https://yingo3.netlify.app/0/5/5.5/1.mp3" },
    { name: "罪人舞步旋 Masquerade of the Guilty", artist: "HOYO-MiX", fallbackUrl: "https://yingo3.netlify.app/0/5/5.6/1.mp3" },
    { name: "尘世乐园 This Side of Paradise", artist: "HOYO-MiX", fallbackUrl: "https://yingo3.netlify.app/0/5/5.7/1.mp3" },
    { name: "戏剧性反讽 A Dramatic Irony", artist: "HOYO-MiX", fallbackUrl: "https://yingo3.netlify.app/0/5/5.8/1.mp3" },
    { name: "天地为枰 Heaven and Earth as a Chessboard", artist: "HOYO-MiX", fallbackUrl: "https://yingo3.netlify.app/0/6/6.1/1.mp3" },
    { name: "神女劈观·唤情 Devastation and Redemption", artist: "HOYO-MiX", fallbackUrl: "https://yingo3.netlify.app/0/6/6.2/1.mp3" },
    { name: "摆渡", artist: "金渔", fallbackUrl: "https://yingo3.netlify.app/0/6/6.3/1.mp3" },
    { name: "Fire Flower", artist: "PeachyFranny", fallbackUrl: "https://yingo3.netlify.app/0/7/7.1/1.mp3" },
    { name: "The Arena", artist: "Lindsey Stirling", fallbackUrl: "https://yingo3.netlify.app/0/7/7.2/1.mp3" },
    
    // 第21-30首
    { name: "Falling Stars", artist: "DVRST、polnalyubvi", fallbackUrl: "https://yingo3.netlify.app/0/7/7.3/1.mp3" },
    { name: "空游无依(On Still Waters)", artist: "The 1999", fallbackUrl: "https://yingo3.netlify.app/0/7/7.4/1.mp3" },
    { name: "独角戏 Monodrama", artist: "HOYO-MiX", fallbackUrl: "https://yingo3.netlify.app/0/7/7.5/1.mp3" },
    { name: "挪德卡莱 Nod-Krai", artist: "HOYO-MiX、AURORA", fallbackUrl: "https://yingo3.netlify.app/0/7/7.6/1.mp3" },
    { name: "傩戏", artist: "一只白羊", fallbackUrl: "https://yingo3.netlify.app/0/7/7.7/1.mp3" },
    { name: "大道不光明", artist: "一只白羊", fallbackUrl: "https://yingo3.netlify.app/0/7/7.8/1.mp3" },
    { name: "DAMIDAMI(中英双语版)", artist: "玹辞、Birdiee", fallbackUrl: "https://yingo3.netlify.app/0/7/7.9/1.mp3" },
    { name: "DAMIDAMI", artist: "Sihan、三Z-STUDIO、HOYO-MiX", fallbackUrl: "https://yingo3.netlify.app/0/7/7.10/1.mp3" },
    { name: "长生咒(梵语)", artist: "乐佩", fallbackUrl: "https://yingo3.netlify.app/0/7/7.11/1.mp3" },
    { name: "轻涟 La vaguelette", artist: "HOYO-MiX", fallbackUrl: "https://yingo3.netlify.app/0/7/7.12/1.mp3" },
    
    // 第31-40首
    { name: "猎罪者", artist: "金渔", fallbackUrl: "https://yingo3.netlify.app/0/5/5.1/1.mp3" },
    { name: "Wellerman(Sea Shanty)", artist: "Nathan Evans", fallbackUrl: "https://yingo3.netlify.app/0/5/5.2/1.mp3" },
    { name: "Walk Thru Fire", artist: "Vicetone、Meron Ryan", fallbackUrl: "https://yingo3.netlify.app/0/5/5.3/1.mp3" },
    { name: "混沌世界", artist: "蓝心羽", fallbackUrl: "https://yingo3.netlify.app/0/5/5.4/1.mp3" },
    { name: "Counting Stars", artist: "OneRepublic", fallbackUrl: "https://yingo3.netlify.app/0/5/5.5/1.mp3" },
    { name: "浑水", artist: "格雷西西西", fallbackUrl: "https://yingo3.netlify.app/0/5/5.6/1.mp3" },
    { name: "Slow Down", artist: "Madnap、Pauline Herr", fallbackUrl: "https://yingo3.netlify.app/0/5/5.7/1.mp3" },
    { name: "虫洞诗", artist: "原子邦妮", fallbackUrl: "https://yingo3.netlify.app/0/5/5.8/1.mp3" },
    { name: "Empires", artist: "Ruelle", fallbackUrl: "https://yingo3.netlify.app/0/6/6.1/1.mp3" },
    { name: "GRRRLS", artist: "AViVA", fallbackUrl: "https://yingo3.netlify.app/0/6/6.2/1.mp3" },
    
    // 第41-50首
    { name: "这世界非乐土", artist: "金渔", fallbackUrl: "https://yingo3.netlify.app/0/6/6.3/1.mp3" },
    { name: "world.execute(me);", artist: "Mili", fallbackUrl: "https://yingo3.netlify.app/0/7/7.1/1.mp3" },
    { name: "骁", artist: "井胧、井迪儿", fallbackUrl: "https://yingo3.netlify.app/0/7/7.2/1.mp3" },
    { name: "不被认可的花", artist: "糯米Nomi", fallbackUrl: "https://yingo3.netlify.app/0/7/7.3/1.mp3" },
    { name: "虞兮叹", artist: "闻人听書_", fallbackUrl: "https://yingo3.netlify.app/0/7/7.4/1.mp3" },
    { name: "道不破", artist: "指尖笑", fallbackUrl: "https://yingo3.netlify.app/0/7/7.5/1.mp3" },
    { name: "Different World", artist: "Alan Walker、K-391、Sofia Carson、CORSAK胡梦周", fallbackUrl: "https://yingo3.netlify.app/0/7/7.6/1.mp3" },
    { name: "Standing When It All Falls Down(Official NiP Team Song)(feat. Roshi)", artist: "John De Sohn、Roshi", fallbackUrl: "https://yingo3.netlify.app/0/7/7.7/1.mp3" },
    { name: "Unstoppable", artist: "Sia", fallbackUrl: "https://yingo3.netlify.app/0/7/7.8/1.mp3" },
    { name: "Escaping Gravity", artist: "TheFatRat、Cecilia Gault", fallbackUrl: "https://yingo3.netlify.app/0/7/7.9/1.mp3" },
    
    // 第51-60首
    { name: "摆渡", artist: "王天戈", fallbackUrl: "https://yingo3.netlify.app/0/7/7.10/1.mp3" },
    { name: "The Calling", artist: "TheFatRat、Laura Brehm", fallbackUrl: "https://yingo3.netlify.app/0/7/7.11/1.mp3" },
    { name: "Victory", artist: "Two Steps From Hell、Thomas Bergersen", fallbackUrl: "https://yingo3.netlify.app/0/7/7.12/1.mp3" },
    { name: "Between Worlds(世界之间)", artist: "Roger Subirana", fallbackUrl: "https://yingo3.netlify.app/0/1/1.mp3" },
    { name: "Rosabel【The red Coronation Rearrange】", artist: "Cre-sc3NT", fallbackUrl: "https://yingo3.netlify.app/0/2/1.mp3" },
    { name: "Call Of Silence(Attack On Titan)", artist: "Lo-Fi Luke、Sushi", fallbackUrl: "https://yingo3.netlify.app/0/2/3.mp3" },
    { name: "疯狂的挣扎", artist: "金渔", fallbackUrl: "https://yingo3.netlify.app/0/3/1.mp3" },
    { name: "不脱长衫", artist: "承桓、一只白羊", fallbackUrl: "https://yingo3.netlify.app/0/4/4.1/1.mp3" },
    { name: "海底(女版)", artist: "苏贝贝", fallbackUrl: "https://yingo3.netlify.app/0/4/4.2/1.mp3" },
    { name: "歌者", artist: "咻咻满", fallbackUrl: "https://yingo3.netlify.app/0/4/4.3/1.mp3" },
    
    // 第61-70首
    { name: "岁月成碑(Single Edition)", artist: "蔡明希-不才", fallbackUrl: "https://yingo3.netlify.app/0/5/5.1/1.mp3" },
    { name: "夜航星(Night Voyager)", artist: "蔡明希.不才、三体宇宙", fallbackUrl: "https://yingo3.netlify.app/0/5/5.2/1.mp3" },
    { name: "乱世一仗", artist: "一只白羊", fallbackUrl: "https://yingo3.netlify.app/0/5/5.3/1.mp3" },
    { name: "说书", artist: "一只白羊", fallbackUrl: "https://yingo3.netlify.app/0/5/5.4/1.mp3" },
    { name: "室内系的TrackMaker", artist: "hanser", fallbackUrl: "https://yingo3.netlify.app/0/5/5.5/1.mp3" },
    { name: "海底(英文版)", artist: "肖恩Shaun Gibson、Jasmine是茉莉花", fallbackUrl: "https://yingo3.netlify.app/0/5/5.6/1.mp3" },
    { name: "终焉——《十日终焉》同人曲", artist: "今燃、乐攸LIU", fallbackUrl: "https://yingo3.netlify.app/0/5/5.7/1.mp3" },
    { name: "史诗中国", artist: "路南、mAjorHon", fallbackUrl: "https://yingo3.netlify.app/0/5/5.8/1.mp3" },
    { name: "求神呐", artist: "柏鹿", fallbackUrl: "https://yingo3.netlify.app/0/6/6.1/1.mp3" },
    { name: "魑魅", artist: "周林枫", fallbackUrl: "https://yingo3.netlify.app/0/6/6.2/1.mp3" },
    
    // 第71-80首
    { name: "Even Ride", artist: "格温", fallbackUrl: "https://yingo3.netlify.app/0/6/6.3/1.mp3" },
    { name: "Rapture", artist: "dwayne ford", fallbackUrl: "https://yingo3.netlify.app/0/7/7.1/1.mp3" },
    { name: "SCP特殊收容基金会(战歌)", artist: "一只discord球", fallbackUrl: "https://yingo3.netlify.app/0/7/7.2/1.mp3" },
    { name: "In the End", artist: "Marcus Warner", fallbackUrl: "https://yingo3.netlify.app/0/7/7.3/1.mp3" },
    { name: "Never Back Down(Orchestral)", artist: "Two Steps From Hell", fallbackUrl: "https://yingo3.netlify.app/0/7/7.4/1.mp3" },
    { name: "Bad Apple", artist: "Lizz Robinett", fallbackUrl: "https://yingo3.netlify.app/0/7/7.5/1.mp3" },
    { name: "Villanelle", artist: "Jo Blankenburg", fallbackUrl: "https://yingo3.netlify.app/0/7/7.6/1.mp3" },
    { name: "Rush E(Playable)", artist: "Sheet Music Boss", fallbackUrl: "https://yingo3.netlify.app/0/7/7.7/1.mp3" },
    { name: "十面埋伏", artist: "曲中剑", fallbackUrl: "https://yingo3.netlify.app/0/7/7.8/1.mp3" },
    { name: "狂徒", artist: "大宇", fallbackUrl: "https://yingo3.netlify.app/0/7/7.9/1.mp3" },
    
    // 第81-90首
    { name: "Wild", artist: "Monogem", fallbackUrl: "https://yingo3.netlify.app/0/7/7.10/1.mp3" },
    { name: "Believer", artist: "Imagine Dragons", fallbackUrl: "https://yingo3.netlify.app/0/7/7.11/1.mp3" },
    { name: "暮霞", artist: "鹭起Herons", fallbackUrl: "https://yingo3.netlify.app/0/7/7.12/1.mp3" },
    { name: "变戏法", artist: "玥夏", fallbackUrl: "https://yingo3.netlify.app/0/1/1.mp3" },
    { name: "封神劫", artist: "江隐尘", fallbackUrl: "https://yingo3.netlify.app/0/2/1.mp3" },
    { name: "扶光", artist: "鹭起Herons", fallbackUrl: "https://yingo3.netlify.app/0/2/3.mp3" },
    { name: "耍把戏", artist: "阿禹ayy", fallbackUrl: "https://yingo3.netlify.app/0/3/1.mp3" },
    { name: "戏神道(我不是戏神)", artist: "kk柯文", fallbackUrl: "https://yingo3.netlify.app/0/4/4.1/1.mp3" },
    { name: "Apex", artist: "Far Out", fallbackUrl: "https://yingo3.netlify.app/0/4/4.2/1.mp3" },
    { name: "神说", artist: "心俞", fallbackUrl: "https://yingo3.netlify.app/0/4/4.3/1.mp3" },
    
    // 第91-100首
    { name: "繁星，黯夜", artist: "Akie秋绘", fallbackUrl: "https://yingo3.netlify.app/0/5/5.1/1.mp3" },
    { name: "七宗", artist: "金渔", fallbackUrl: "https://yingo3.netlify.app/0/5/5.2/1.mp3" },
    { name: "夜间巡航(Remix)", artist: "TypeD", fallbackUrl: "https://yingo3.netlify.app/0/5/5.3/1.mp3" },
    { name: "GOT YOU(归零)", artist: "三角洲行动、Lana Mel.、汪晨蕊", fallbackUrl: "https://yingo3.netlify.app/0/5/5.4/1.mp3" },
    { name: "无人判我", artist: "玥夏", fallbackUrl: "https://yingo3.netlify.app/0/5/5.5/1.mp3" },
    { name: "纷扰", artist: "RS纾律", fallbackUrl: "https://yingo3.netlify.app/0/5/5.6/1.mp3" },
    { name: "Legends Never Die(传奇永不熄)", artist: "英雄联盟、Against The Current", fallbackUrl: "https://yingo3.netlify.app/0/5/5.7/1.mp3" },
    { name: "Minecraft(我的世界)", artist: "C418", fallbackUrl: "https://yingo3.netlify.app/0/5/5.8/1.mp3" },
    { name: "调查中", artist: "糯米Nomi", fallbackUrl: "https://yingo3.netlify.app/0/6/6.1/1.mp3" },
    { name: "反乌托邦", artist: "啃书、琉盈君", fallbackUrl: "https://yingo3.netlify.app/0/6/6.2/1.mp3" },
    
    // 第101-110首
    { name: "诸神黄昏(Ragnarök)", artist: "镜予歌、陈小满、塔塔Anita", fallbackUrl: "https://yingo3.netlify.app/0/6/6.3/1.mp3" },
    { name: "大雪", artist: "音阙诗听、王梓钰", fallbackUrl: "https://yingo3.netlify.app/0/7/7.1/1.mp3" },
    { name: "紧急出口", artist: "金渔", fallbackUrl: "https://yingo3.netlify.app/0/7/7.2/1.mp3" },
    { name: "Late Autumn", artist: "鹭起Herons", fallbackUrl: "https://yingo3.netlify.app/0/7/7.3/1.mp3" },
    { name: "贪婪无罪", artist: "陶九", fallbackUrl: "https://yingo3.netlify.app/0/7/7.4/1.mp3" },
    { name: "十只兔子", artist: "黄晨晨", fallbackUrl: "https://yingo3.netlify.app/0/7/7.5/1.mp3" },
    { name: "吉时已到", artist: "糯米Nomi", fallbackUrl: "https://yingo3.netlify.app/0/7/7.6/1.mp3" },
    { name: "心理罪", artist: "糯米Nomi", fallbackUrl: "https://yingo3.netlify.app/0/7/7.7/1.mp3" },
    { name: "凄美地", artist: "郭顶", fallbackUrl: "https://yingo3.netlify.app/0/7/7.8/1.mp3" },
    { name: "天使有罪论", artist: "周林枫", fallbackUrl: "https://yingo3.netlify.app/0/7/7.9/1.mp3" },
    
    // 第111-120首
    { name: "下潜", artist: "川青、Morerare", fallbackUrl: "https://yingo3.netlify.app/0/7/7.10/1.mp3" },
    { name: "斗兽场", artist: "尹昔眠", fallbackUrl: "https://yingo3.netlify.app/0/7/7.11/1.mp3" },
    { name: "墙倒众人推", artist: "玥夏", fallbackUrl: "https://yingo3.netlify.app/0/7/7.12/1.mp3" },
    { name: "万物起舞", artist: "梁倩雨", fallbackUrl: "https://yingo3.netlify.app/0/1/1.mp3" },
    { name: "女孩你为何踮脚尖", artist: "黄晨晨", fallbackUrl: "https://yingo3.netlify.app/0/2/1.mp3" },
    { name: "木偶戏", artist: "玥夏", fallbackUrl: "https://yingo3.netlify.app/0/2/3.mp3" },
    { name: "伪善者", artist: "金渔", fallbackUrl: "https://yingo3.netlify.app/0/3/1.mp3" },
    { name: "Cornfield Chase(原野追逐)", artist: "Hans Zimmer", fallbackUrl: "https://yingo3.netlify.app/0/4/4.1/1.mp3" },
    { name: "月下花轻舞", artist: "傅许", fallbackUrl: "https://yingo3.netlify.app/0/4/4.2/1.mp3" },
    { name: "平凡之路", artist: "朴树", fallbackUrl: "https://yingo3.netlify.app/0/4/4.3/1.mp3" },
    
    // 第121-130首
    { name: "黄昏社", artist: "kk柯文", fallbackUrl: "https://yingo3.netlify.app/0/5/5.1/1.mp3" },
    { name: "稳稳的幸福(钢琴版)", artist: "赵海洋", fallbackUrl: "https://yingo3.netlify.app/0/5/5.2/1.mp3" },
    { name: "圣诞快乐劳伦斯先生", artist: "陈子鹏", fallbackUrl: "https://yingo3.netlify.app/0/5/5.3/1.mp3" },
    { name: "天堂岛之歌(最阴间版本)", artist: "海卫十一HeavenEleven、林小暗、嘟比Dubi、匀子、小五沉沉沉、Aster阿斯特、次瓜锦鲤", fallbackUrl: "https://yingo3.netlify.app/0/5/5.4/1.mp3" },
    { name: "百鬼夜行", artist: "玥夏", fallbackUrl: "https://yingo3.netlify.app/0/5/5.5/1.mp3" },
    { name: "Petrichor(初雨之息)", artist: "鹭起Herons", fallbackUrl: "https://yingo3.netlify.app/0/5/5.6/1.mp3" },
    { name: "Fake Love(Remix)", artist: "七元素", fallbackUrl: "https://yingo3.netlify.app/0/5/5.7/1.mp3" },
    { name: "Ash(灰烬)", artist: "Kirara Magic", fallbackUrl: "https://yingo3.netlify.app/0/5/5.8/1.mp3" },
    { name: "安魂谣", artist: "水禹", fallbackUrl: "https://yingo3.netlify.app/0/6/6.1/1.mp3" },
    { name: "嘲(小说(我不是戏神)有声书官方推广曲)", artist: "小曲儿、oneone晚晚", fallbackUrl: "https://yingo3.netlify.app/0/6/6.2/1.mp3" },
    
    // 第131-140首
    { name: "X-GALACTICO(超燃人类进化小曲)", artist: "Martins Garix", fallbackUrl: "https://yingo3.netlify.app/0/6/6.3/1.mp3" },
    { name: "Sustain(宿命感)", artist: "欧美群星 & Ola", fallbackUrl: "https://yingo3.netlify.app/0/7/7.1/1.mp3" },
    { name: "Unity", artist: "TheFatRat", fallbackUrl: "https://yingo3.netlify.app/0/7/7.2/1.mp3" },
    { name: "土坡上的狗尾草", artist: "卢润泽", fallbackUrl: "https://yingo3.netlify.app/0/7/7.3/1.mp3" },
    { name: "My Way(风可以越过荆棘)", artist: "TypeD、Veysigz", fallbackUrl: "https://yingo3.netlify.app/0/7/7.4/1.mp3" },
    { name: "Children of the Dark(2021)", artist: "Mono Inc.、Martin Engler", fallbackUrl: "https://yingo3.netlify.app/0/7/7.5/1.mp3" },
    { name: "SuNian(手碟空灵版)", artist: "Nebula", fallbackUrl: "https://yingo3.netlify.app/0/7/7.6/1.mp3" },
    { name: "Sea of Tranquility", artist: "Bemax", fallbackUrl: "https://yingo3.netlify.app/0/7/7.7/1.mp3" },
    { name: "Salt", artist: "Ava Max", fallbackUrl: "https://yingo3.netlify.app/0/7/7.8/1.mp3" },
    { name: "East of Eden", artist: "Zella Day", fallbackUrl: "https://yingo3.netlify.app/0/7/7.9/1.mp3" },
    
    // 第141-150首
    { name: "Space Drive", artist: "NAWZAT、HMHK、Bagrax", fallbackUrl: "https://yingo3.netlify.app/0/7/7.10/1.mp3" },
    { name: "With You(Ngẫu Hứng)", artist: "Nick Strand、Hoaprox、Mio", fallbackUrl: "https://yingo3.netlify.app/0/7/7.11/1.mp3" },
    { name: "Ignite", artist: "K-391、Alan Walker、Julie Bergan、胜利", fallbackUrl: "https://yingo3.netlify.app/0/7/7.12/1.mp3" },
    { name: "The History(Flute)", artist: "Yue Li Mei、The Soul of Wind", fallbackUrl: "https://yingo3.netlify.app/0/1/1.mp3" },
    { name: "風の記憶(风的记忆)(Reproduced)", artist: "鹭起Herons", fallbackUrl: "https://yingo3.netlify.app/0/2/1.mp3" },
    { name: "月光奏鸣曲 第一乐章(升C小调第十四号奏鸣曲)", artist: "顾书心", fallbackUrl: "https://yingo3.netlify.app/0/2/3.mp3" },
    { name: "You", artist: "Approaching Nirvana", fallbackUrl: "https://yingo3.netlify.app/0/3/1.mp3" },
    { name: "Luv Letter(情书)", artist: "DJ OKAWARI", fallbackUrl: "https://yingo3.netlify.app/0/4/4.1/1.mp3" },
    { name: "Catch My Breath", artist: "Kelly Clarkson", fallbackUrl: "https://yingo3.netlify.app/0/4/4.2/1.mp3" },
    { name: "出山", artist: "花粥、王胜娚", fallbackUrl: "https://yingo3.netlify.app/0/4/4.3/1.mp3" },
    
    // 第151-150首
    { name: "My Songs Know What You Did In The Dark Light Em Up", artist: "Fall Out Boy", fallbackUrl: "https://yingo3.netlify.app/0/5/5.1/1.mp3" },
    { name: "十日终焉(《十日终焉》同名纪念曲)", artist: "喵酱油", fallbackUrl: "https://yingo3.netlify.app/0/5/5.2/1.mp3" },
    { name: "寂灭终日(《十日终焉》原创群像曲)", artist: "芳冽、不是黑籽儿、正版Devil、车厘子小七、青山怀竹", fallbackUrl: "https://yingo3.netlify.app/0/5/5.3/1.mp3" },
    { name: "虚拟", artist: "陈粒", fallbackUrl: "https://yingo3.netlify.app/0/5/5.4/1.mp3" },
    { name: "Take Me Hand", artist: "DAISHI DANCE、Cécile Corbel", fallbackUrl: "https://yingo3.netlify.app/0/5/5.5/1.mp3" },
    { name: "S.T.A.Y.(Delta Heavy Tribute)", artist: "Delta Heavy", fallbackUrl: "https://yingo3.netlify.app/0/5/5.6/1.mp3" },
    { name: "windows redzone", artist: "Jordan Lee", fallbackUrl: "https://yingo3.netlify.app/0/5/5.7/1.mp3" },
    { name: "The Best Of Me", artist: "Dion Timmer、The Arcturians", fallbackUrl: "https://yingo3.netlify.app/0/5/5.8/1.mp3" },
    { name: "For The Win", artist: "Two Steps From Hell", fallbackUrl: "https://yingo3.netlify.app/0/6/6.1/1.mp3" },
    { name: "Time to Pretend", artist: "Lazer Boomerang", fallbackUrl: "https://yingo3.netlify.app/0/6/6.2/1.mp3" },
    { name: "终焉之地", artist: "DJ铁柱", fallbackUrl: "https://yingo3.netlify.app/0/6/6.3/1.mp3" },
    { name: "Star Sky", artist: "Two Steps From Hell、Thomas Bergersen", fallbackUrl: "https://yingo3.netlify.app/0/7/7.1/1.mp3" },
    { name: "Victory", artist: "Thomas Bergersen", fallbackUrl: "https://yingo3.netlify.app/0/7/7.2/1.mp3" },
    { name: "Windy Hill(风之谷)", artist: "羽肿", fallbackUrl: "https://yingo3.netlify.app/0/7/7.3/1.mp3" },
    { name: "破旧世界(19秒高燃钢琴版片段)", artist: "Yulyna", fallbackUrl: "https://yingo3.netlify.app/0/7/7.4/1.mp3" },
    { name: "天气之子·幻", artist: "TypeD", fallbackUrl: "https://yingo3.netlify.app/0/7/7.5/1.mp3" }
];

/**
 * API配置常量
 */
const API_CONFIG = {
    BASE_URL: 'https://api.yaohud.cn/api/music/kuwo',
    API_KEY: 'jJskjZNis3gwgsi0ntO',
    QUALITY: 'standard', // 标准音质，避免API密钥过期问题
    CACHE_DURATION: 60 * 60 * 1000, // 缓存1小时（毫秒）
    PRELOAD_RANGE: 5, // 预加载前后5首
    INITIAL_LOAD_COUNT: 10, // 初始加载前10首
    RATE_LIMIT_DELAY: 1000 // API调用延迟（毫秒），避免频繁调用
};

// ========== 全局变量 ==========

/**
 * 音乐播放器状态管理
 */
const MusicPlayerState = {
    audioPlayer: null,          // 音频元素引用
    currentTrackIndex: 0,       // 当前播放的曲目索引
    isPlaying: false,           // 播放状态标志
    volume: 0.7,                // 音量值（0-1范围）
    isLoading: false,           // API加载状态
    lastApiCallTime: 0,         // 上次API调用时间
    activePlaylist: [],         // 当前活动播放列表（前10首）
    
    // DOM元素引用
    elements: {
        buttonsContainer: null,
        playPauseBtn: null,
        prevBtn: null,
        nextBtn: null,
        progressBar: null,
        progress: null,
        currentTimeEl: null,
        durationEl: null,
        volumeSlider: null,
        volumeProgress: null,
        fileCountEl: null,
        trackTitleEl: null,
        trackArtistEl: null,
        albumArtEl: null,
        albumArtContainer: null,
        apiStatusEl: null
    },
    
    // 缓存管理器
    cache: {
        // 从localStorage加载缓存
        load: function() {
            try {
                const cached = localStorage.getItem('musicPlayerCache');
                return cached ? JSON.parse(cached) : {};
            } catch (e) {
                console.warn('缓存加载失败:', e);
                return {};
            }
        },
        
        // 保存到localStorage
        save: function(cache) {
            try {
                localStorage.setItem('musicPlayerCache', JSON.stringify(cache));
            } catch (e) {
                console.warn('缓存保存失败:', e);
            }
        },
        
        // 获取缓存项
        get: function(key) {
            const cache = this.load();
            const item = cache[key];
            
            if (item && item.timestamp) {
                // 检查缓存是否过期
                const now = Date.now();
                if (now - item.timestamp < API_CONFIG.CACHE_DURATION) {
                    delete cache[key];
                    this.save(cache);
                } else {
                    // 删除过期缓存
                    delete cache[key];
                    this.save(cache);
                }
            }
            return null;
        },
        
        // 设置缓存项
        set: function(key, data) {
            const cache = this.load();
            cache[key] = {
                ...data,
                timestamp: Date.now()
            };
            this.save(cache);
        },
        
        // 清除所有缓存
        clear: function() {
            try {
                localStorage.removeItem('musicPlayerCache');
            } catch (e) {
                console.warn('缓存清除失败:', e);
            }
        }
    }
};

// ========== 工具函数 ==========

/**
 * 格式化时间显示（秒转换为MM:SS格式）
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * 计算点击位置在元素上的百分比
 * @param {Event} event - 点击事件
 * @param {HTMLElement} element - 目标元素
 * @returns {number} 点击位置的百分比（0-1）
 */
function getClickPercentage(event, element) {
    const rect = element.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    return Math.max(0, Math.min(1, clickX / width));
}

/**
 * 防抖函数，避免频繁调用API
 * @param {Function} func - 需要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * 生成缓存键
 * @param {string} songName - 歌曲名
 * @returns {string} 缓存键
 */
function generateCacheKey(songName) {
    return `song_${songName.replace(/\s+/g, '_')}`;
}

// ========== API调用模块 ==========

/**
 * 调用酷我音乐API获取歌曲信息
 * @param {string} songName - 歌曲名
 * @returns {Promise<Object>} 包含歌曲URL和专辑图片的对象
 */
async function fetchSongFromAPI(songName) {
    // 检查API调用频率限制
    const now = Date.now();
    const timeSinceLastCall = now - MusicPlayerState.lastApiCallTime;
    
    if (timeSinceLastCall < API_CONFIG.RATE_LIMIT_DELAY) {
        // 等待达到最低调用间隔
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.RATE_LIMIT_DELAY - timeSinceLastCall));
    }
    
    try {
        // 构建API请求URL
        const encodedSongName = encodeURIComponent(songName);
        const apiUrl = `${API_CONFIG.BASE_URL}?key=${API_CONFIG.API_KEY}&msg=${encodedSongName}&n=1&size=${API_CONFIG.QUALITY}`;
        
        console.log(`正在调用API: ${songName}`);
        
        // 设置请求头
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 12; ZTE 1021L Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36'
        };
        
        // 发送API请求
        const response = await fetch(apiUrl, { 
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 更新最后调用时间
        MusicPlayerState.lastApiCallTime = Date.now();
        
        // 检查API响应状态
        if (result.code !== 200) {
            throw new Error(`API返回错误: ${result.msg}`);
        }
        
        // 提取歌曲信息
        const data = result.data;
        const songInfo = {
            url: data.vipmusic.url || '',
            picture: data.picture || '',
            apiName: data.name || songName,
            artist: data.songname || '',
            album: data.album || ''
        };
        
        console.log(`API调用成功: ${songName}`, songInfo);
        return songInfo;
        
    } catch (error) {
        console.error(`API调用失败 (${songName}):`, error);
    }
}

/**
 * 获取歌曲URL（优先使用缓存，其次API，最后备用链接）
 * @param {number} index - 歌曲索引
 * @returns {Promise<Object>} 包含歌曲URL和专辑图片的对象
 */
async function getSongUrl(index) {
    if (index < 0 || index >= COMPLETE_PLAYLIST.length) {
        throw new Error(`无效的歌曲索引: ${index}`);
    }
    
    const song = COMPLETE_PLAYLIST[index];
    const cacheKey = generateCacheKey(song.name);
    
    // 1. 检查缓存
    const cached = MusicPlayerState.cache.get(cacheKey);
    if (cached && cached.url) {
        console.log(`从缓存获取: ${song.name}`);
        return cached;
    }
    
    // 2. 调用API获取
    console.log(`缓存未命中，调用API: ${song.name}`);
    setLoadingState(true);
    
    try {
        const apiResult = await fetchSongFromAPI(song.name);
        
        if (apiResult.url) {
            // API调用成功，保存到缓存
            const cacheData = {
                url: apiResult.url,
                picture: apiResult.picture,
                apiName: apiResult.apiName,
                artist: apiResult.artist || song.artist,
                timestamp: Date.now()
            };
            
            MusicPlayerState.cache.set(cacheKey, cacheData);
            setLoadingState(false);
            return cacheData;
        } else {
            // API调用失败，使用备用链接
            console.warn(`API未返回URL，使用备用链接: ${song.name}`);
            const fallbackData = {
                url: song.fallbackUrl,
                picture: '', // 备用链接无专辑图片
                apiName: song.name,
                artist: song.artist,
                isFallback: true
            };
            
            // 即使备用链接也缓存，避免重复尝试API
            MusicPlayerState.cache.set(cacheKey, fallbackData);
            setLoadingState(false);
            return fallbackData;
        }
    } catch (error) {
        // API调用异常，使用备用链接
        console.error(`API异常，使用备用链接: ${song.name}`, error);
        const fallbackData = {
            url: song.fallbackUrl,
            picture: '',
            apiName: song.name,
            artist: song.artist,
            isFallback: true,
            error: error.message
        };
        
        MusicPlayerState.cache.set(cacheKey, fallbackData);
        setLoadingState(false);
        return fallbackData;
    }
}

/**
 * 预加载指定范围内的歌曲
 * @param {number} centerIndex - 中心索引
 */
async function preloadSongs(centerIndex) {
    const start = Math.max(0, centerIndex - API_CONFIG.PRELOAD_RANGE);
    const end = Math.min(COMPLETE_PLAYLIST.length - 1, centerIndex + API_CONFIG.PRELOAD_RANGE);
    
    console.log(`预加载范围: ${start} 到 ${end} (中心: ${centerIndex})`);
    
    for (let i = start; i <= end; i++) {
        // 跳过当前歌曲（已经加载）
        if (i === centerIndex) continue;
        
        // 检查缓存是否已有
        const song = COMPLETE_PLAYLIST[i];
        const cacheKey = generateCacheKey(song.name);
        const cached = MusicPlayerState.cache.get(cacheKey);
        
        if (!cached || !cached.url) {
            // 延迟加载，避免同时发起太多请求
            setTimeout(async () => {
                try {
                    await getSongUrl(i);
                    console.log(`预加载完成: ${song.name}`);
                } catch (error) {
                    console.warn(`预加载失败: ${song.name}`, error);
                }
            }, (i - start) * 500); // 每首间隔500ms
        }
    }
}

// ========== 项目按钮模块 ==========

/**
 * 初始化项目按钮
 */
function initializeProjectButtons() {
    const container = document.getElementById('buttons-container');
    
    // 清空容器（防止重复初始化）
    container.innerHTML = '';
    
    // 遍历项目配置，创建按钮
    PROJECTS.forEach(project => {
        const btn = document.createElement('a');
        
        if (project.url && project.url.trim() !== '') {
            // 有URL的项目：创建可点击按钮
            btn.href = project.url;
            btn.target = "_blank";
            btn.className = "project-btn";
            btn.innerHTML = `
                <i class="${project.icon}"></i>
                <span>${project.name}</span>
            `;
        } else {
            // 无URL的项目：创建隐藏按钮
            btn.className = "project-btn hidden";
        }
        
        container.appendChild(btn);
    });
}

// ========== 音乐播放器模块 ==========

/**
 * 初始化音乐播放器
 */
function initializeMusicPlayer() {
    // 获取DOM元素引用
    MusicPlayerState.elements = {
        buttonsContainer: document.getElementById('buttons-container'),
        playPauseBtn: document.getElementById('play-pause-btn'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        progressBar: document.getElementById('progress-bar'),
        progress: document.getElementById('progress'),
        currentTimeEl: document.getElementById('current-time'),
        durationEl: document.getElementById('duration'),
        volumeSlider: document.getElementById('volume-slider'),
        volumeProgress: document.getElementById('volume-progress'),
        fileCountEl: document.getElementById('file-count'),
        trackTitleEl: document.getElementById('track-title'),
        trackArtistEl: document.getElementById('track-artist'),
        albumArtEl: document.querySelector('.album-art'),
        albumArtContainer: document.querySelector('.album-art-container'),
        apiStatusEl: document.getElementById('api-status')
    };
    
    // 获取音频元素
    MusicPlayerState.audioPlayer = document.getElementById('audio-player');
    
    // 设置初始音量
    MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
    
    // 更新文件计数显示
    updateFileCount();
    
    // 更新音量显示
    updateVolumeDisplay();
    
    // 初始化活动播放列表（前10首）
    MusicPlayerState.activePlaylist = COMPLETE_PLAYLIST.slice(0, API_CONFIG.INITIAL_LOAD_COUNT);
    
    // 显示第一首歌曲信息（但不加载URL）
    displayTrackInfo(0);
    
    // 预加载前10首歌曲（后台静默加载）
    preloadInitialSongs();
    
    // 设置事件监听器
    setupMusicEventListeners();
    
    // 更新API状态显示
    updateApiStatus('准备就绪');
}

/**
 * 预加载初始歌曲（前10首）
 */
async function preloadInitialSongs() {
    console.log('开始预加载初始10首歌曲...');
    updateApiStatus('预加载初始歌曲...');
    
    for (let i = 0; i < Math.min(API_CONFIG.INITIAL_LOAD_COUNT, COMPLETE_PLAYLIST.length); i++) {
        setTimeout(async () => {
            try {
                await getSongUrl(i);
                console.log(`初始预加载完成: ${COMPLETE_PLAYLIST[i].name}`);
                
                if (i === Math.min(API_CONFIG.INITIAL_LOAD_COUNT, COMPLETE_PLAYLIST.length) - 1) {
                    updateApiStatus('预加载完成');
                }
            } catch (error) {
                console.warn(`初始预加载失败: ${COMPLETE_PLAYLIST[i].name}`, error);
            }
        }, i * 1000); // 每首间隔1秒，避免API限制
    }
}

/**
 * 更新文件计数显示
 */
function updateFileCount() {
    const count = COMPLETE_PLAYLIST.length;
    MusicPlayerState.elements.fileCountEl.textContent = `${count} 首歌曲`;
}

/**
 * 更新音量显示
 */
function updateVolumeDisplay() {
    const volumePercent = MusicPlayerState.volume * 100;
    MusicPlayerState.elements.volumeProgress.style.width = `${volumePercent}%`;
}

/**
 * 更新API状态显示
 * @param {string} message - 状态消息
 */
function updateApiStatus(message) {
    if (MusicPlayerState.elements.apiStatusEl) {
        MusicPlayerState.elements.apiStatusEl.textContent = `API状态: ${message}`;
    }
}

/**
 * 设置加载状态
 * @param {boolean} loading - 是否正在加载
 */
function setLoadingState(loading) {
    MusicPlayerState.isLoading = loading;
    const container = MusicPlayerState.elements.albumArtContainer;
    
    if (loading) {
        container.classList.add('loading');
        updateApiStatus('正在加载歌曲...');
    } else {
        container.classList.remove('loading');
        updateApiStatus('就绪');
    }
}

/**
 * 显示歌曲信息（但不加载音频）
 * @param {number} index - 歌曲索引
 */
function displayTrackInfo(index) {
    if (index < 0 || index >= COMPLETE_PLAYLIST.length) return;
    
    const track = COMPLETE_PLAYLIST[index];
    
    // 更新UI显示
    MusicPlayerState.elements.trackTitleEl.textContent = track.name;
    MusicPlayerState.elements.trackArtistEl.textContent = track.artist;
    
    // 重置专辑图片
    const albumArtEl = MusicPlayerState.elements.albumArtEl;
    albumArtEl.style.display = 'none';
    albumArtEl.src = '';
}

/**
 * 加载并播放指定索引的歌曲
 * @param {number} index - 歌曲索引
 */
async function loadAndPlayTrack(index) {
    // 验证索引范围
    if (index < 0 || index >= COMPLETE_PLAYLIST.length) {
        console.warn(`无效的歌曲索引: ${index}`);
        return;
    }
    
    // 如果正在播放，先暂停
    if (MusicPlayerState.isPlaying) {
        pauseTrack();
    }
    
    // 更新当前曲目索引
    MusicPlayerState.currentTrackIndex = index;
    const track = COMPLETE_PLAYLIST[index];
    
    // 显示歌曲基本信息
    displayTrackInfo(index);
    
    // 重置进度条
    resetProgress();
    
    // 获取歌曲URL和专辑图片
    try {
        setLoadingState(true);
        const songData = await getSongUrl(index);
        
        // 设置音频源
        MusicPlayerState.audioPlayer.src = songData.url;
        
        // 更新歌曲信息（使用API返回的艺术家信息，如果没有则使用本地的）
        if (songData.artist && songData.artist.trim() !== '') {
            MusicPlayerState.elements.trackArtistEl.textContent = songData.artist;
        }
        
        // 显示专辑图片
        const albumArtEl = MusicPlayerState.elements.albumArtEl;
        if (songData.picture && songData.picture.trim() !== '') {
            albumArtEl.src = songData.picture;
            albumArtEl.style.display = 'block';
            albumArtEl.onload = () => {
                console.log('专辑图片加载成功');
            };
            albumArtEl.onerror = () => {
                console.warn('专辑图片加载失败，显示默认图标');
                albumArtEl.style.display = 'none';
            };
        } else {
            albumArtEl.style.display = 'none';
        }
        
        // 更新API状态
        if (songData.isFallback) {
            updateApiStatus('使用备用链接');
        } else {
            updateApiStatus('API调用成功');
        }
        
        // 预加载前后5首歌曲
        preloadSongs(index);
        
        // 开始播放
        playTrack();
        
    } catch (error) {
        console.error(`加载歌曲失败: ${track.name}`, error);
        
        // 使用备用链接
        MusicPlayerState.audioPlayer.src = track.fallbackUrl;
        updateApiStatus('使用备用链接');
        
        // 开始播放
        playTrack();
    } finally {
        setLoadingState(false);
    }
}

/**
 * 重置进度条
 */
function resetProgress() {
    MusicPlayerState.elements.progress.style.width = '0%';
    MusicPlayerState.elements.currentTimeEl.textContent = '0:00';
    MusicPlayerState.elements.durationEl.textContent = '0:00';
}

/**
 * 播放歌曲
 */
function playTrack() {
    if (COMPLETE_PLAYLIST.length === 0) {
        console.warn('没有可播放的歌曲');
        return;
    }
    
    MusicPlayerState.audioPlayer.play()
        .then(() => {
            MusicPlayerState.isPlaying = true;
            MusicPlayerState.elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            updateApiStatus('播放中');
        })
        .catch(error => {
            console.error('播放失败:', error);
            updateApiStatus('播放失败');
        });
}

/**
 * 暂停歌曲
 */
function pauseTrack() {
    MusicPlayerState.isPlaying = false;
    MusicPlayerState.audioPlayer.pause();
    MusicPlayerState.elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    updateApiStatus('已暂停');
}

/**
 * 切换播放/暂停状态
 */
async function togglePlayPause() {
    if (COMPLETE_PLAYLIST.length === 0) return;
    
    // 如果当前没有加载歌曲，加载并播放当前索引的歌曲
    if (!MusicPlayerState.audioPlayer.src || MusicPlayerState.audioPlayer.src === '') {
        await loadAndPlayTrack(MusicPlayerState.currentTrackIndex);
        return;
    }
    
    if (MusicPlayerState.isPlaying) {
        pauseTrack();
    } else {
        playTrack();
    }
}

/**
 * 播放下一首歌曲
 */
async function playNextTrack() {
    if (COMPLETE_PLAYLIST.length === 0) return;
    
    const nextIndex = (MusicPlayerState.currentTrackIndex + 1) % COMPLETE_PLAYLIST.length;
    await loadAndPlayTrack(nextIndex);
}

/**
 * 播放上一首歌曲
 */
async function playPreviousTrack() {
    if (COMPLETE_PLAYLIST.length === 0) return;
    
    const prevIndex = (MusicPlayerState.currentTrackIndex - 1 + COMPLETE_PLAYLIST.length) % COMPLETE_PLAYLIST.length;
    await loadAndPlayTrack(prevIndex);
}

/**
 * 更新播放进度显示
 */
function updateProgressDisplay() {
    const { currentTime, duration } = MusicPlayerState.audioPlayer;
    
    if (duration > 0) {
        // 计算进度百分比
        const progressPercent = (currentTime / duration) * 100;
        MusicPlayerState.elements.progress.style.width = `${progressPercent}%`;
        
        // 更新时间显示
        MusicPlayerState.elements.currentTimeEl.textContent = formatTime(currentTime);
        MusicPlayerState.elements.durationEl.textContent = formatTime(duration);
    }
}

/**
 * 设置播放进度
 * @param {Event} event - 点击事件
 */
function setPlaybackProgress(event) {
    const percentage = getClickPercentage(event, MusicPlayerState.elements.progressBar);
    const duration = MusicPlayerState.audioPlayer.duration;
    
    if (duration) {
        MusicPlayerState.audioPlayer.currentTime = percentage * duration;
    }
}

/**
 * 设置音量
 * @param {Event} event - 点击事件
 */
function setVolume(event) {
    const percentage = getClickPercentage(event, MusicPlayerState.elements.volumeSlider);
    
    // 更新音量值
    MusicPlayerState.volume = percentage;
    MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
    
    // 更新音量显示
    updateVolumeDisplay();
}

/**
 * 设置音乐播放器事件监听器
 */
function setupMusicEventListeners() {
    const { 
        playPauseBtn, prevBtn, nextBtn, 
        progressBar, volumeSlider 
    } = MusicPlayerState.elements;
    
    // 播放控制按钮事件
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', playPreviousTrack);
    nextBtn.addEventListener('click', playNextTrack);
    
    // 音频元素事件
    MusicPlayerState.audioPlayer.addEventListener('timeupdate', updateProgressDisplay);
    MusicPlayerState.audioPlayer.addEventListener('ended', playNextTrack);
    MusicPlayerState.audioPlayer.addEventListener('loadedmetadata', () => {
        const duration = formatTime(MusicPlayerState.audioPlayer.duration);
        MusicPlayerState.elements.durationEl.textContent = duration;
    });
    
    // 进度条事件
    progressBar.addEventListener('click', setPlaybackProgress);
    
    // 音量控制事件
    volumeSlider.addEventListener('click', setVolume);
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // 页面可见性变化事件（标签页切换时暂停播放）
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && MusicPlayerState.isPlaying) {
            pauseTrack();
        }
    });
}

/**
 * 处理键盘快捷键
 * @param {KeyboardEvent} event - 键盘事件
 */
function handleKeyboardShortcuts(event) {
    // 防止在输入框中触发快捷键
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch(event.key) {
        case ' ': // 空格键：播放/暂停
            event.preventDefault();
            togglePlayPause();
            break;
            
        case 'ArrowRight': // 右箭头+Ctrl：下一首
            if (event.ctrlKey) {
                event.preventDefault();
                playNextTrack();
            }
            break;
            
        case 'ArrowLeft': // 左箭头+Ctrl：上一首
            if (event.ctrlKey) {
                event.preventDefault();
                playPreviousTrack();
            }
            break;
            
        case '+': // 增加音量
        case '=':
            if (event.ctrlKey) {
                event.preventDefault();
                MusicPlayerState.volume = Math.min(1, MusicPlayerState.volume + 0.1);
                MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
                updateVolumeDisplay();
            }
            break;
            
        case '-': // 减小音量
            if (event.ctrlKey) {
                event.preventDefault();
                MusicPlayerState.volume = Math.max(0, MusicPlayerState.volume - 0.1);
                MusicPlayerState.audioPlayer.volume = MusicPlayerState.volume;
                updateVolumeDisplay();
            }
            break;
            
        case 'r': // R键：重新加载当前歌曲
            if (event.ctrlKey) {
                event.preventDefault();
                loadAndPlayTrack(MusicPlayerState.currentTrackIndex);
            }
            break;
            
        case 'c': // C键：清除缓存
            if (event.ctrlKey && event.shiftKey) {
                event.preventDefault();
                MusicPlayerState.cache.clear();
                updateApiStatus('缓存已清除');
                setTimeout(() => updateApiStatus('就绪'), 2000);
            }
            break;
    }
}

// ========== 页面初始化 ==========

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面初始化开始...');
    console.log('使用API密钥:', API_CONFIG.API_KEY);
    console.log('歌单总数:', COMPLETE_PLAYLIST.length);
    
    // 显示缓存信息
    const cache = MusicPlayerState.cache.load();
    const cacheCount = Object.keys(cache).length;
    console.log('缓存歌曲数:', cacheCount);
    
    // 初始化项目按钮
    initializeProjectButtons();
    
    // 初始化音乐播放器
    initializeMusicPlayer();
    
    console.log('页面初始化完成');
    console.log(`加载了 ${PROJECTS.length} 个项目，其中 ${PROJECTS.filter(p => p.url).length} 个可见`);
    console.log(`加载了 ${COMPLETE_PLAYLIST.length} 首歌曲`);
    
    // 显示使用提示
    setTimeout(() => {
        console.log('使用提示:');
        console.log('1. 点击播放按钮开始播放第一首歌');
        console.log('2. 歌曲信息会通过API动态获取');
        console.log('3. 专辑图片会自动加载并显示');
        console.log('4. 歌曲URL会缓存1小时');
        console.log('5. 播放时自动预加载前后5首歌曲');
    }, 1000);
});