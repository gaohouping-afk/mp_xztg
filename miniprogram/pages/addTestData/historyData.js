/**
 * 刘氏历史成员测试数据 (部分基于《汉书》、《史记》)
 * 包含西汉、东汉部分皇室成员
 */
const historyData = [
  // 第一代 (西汉开国)
  {
    tempId: 'bang',
    name: '刘邦',
    gender: '男',
    generation: 1,
    rankTitle: '汉高祖',
    birthYear: '公元前256',
    deathYear: '公元前195',
    bio: '汉朝开国皇帝，史称汉高祖。',
    spouses: ['zhi', 'ji', 'bo_ji']
  },
  {
    tempId: 'zhi',
    name: '吕雉',
    gender: '女',
    generation: 1,
    rankTitle: '高后',
    birthYear: '公元前241',
    deathYear: '公元前180',
    spouses: ['bang']
  },
  {
    tempId: 'ji',
    name: '戚夫人',
    gender: '女',
    generation: 1,
    rankTitle: '戚姬',
    birthYear: '公元前224',
    deathYear: '公元前194',
    spouses: ['bang']
  },
  {
    tempId: 'bo_ji',
    name: '薄姬',
    gender: '女',
    generation: 1,
    rankTitle: '薄太后',
    birthYear: '公元前220',
    deathYear: '公元前155',
    spouses: ['bang']
  },

  // 第二代 (刘邦之子)
  {
    tempId: 'ying',
    name: '刘盈',
    gender: '男',
    generation: 2,
    rankTitle: '汉惠帝',
    fatherId: 'bang',
    motherId: 'zhi',
    birthYear: '公元前211',
    deathYear: '公元前188'
  },
  {
    tempId: 'ru_yi',
    name: '刘如意',
    gender: '男',
    generation: 2,
    rankTitle: '赵隐王',
    fatherId: 'bang',
    motherId: 'ji',
    birthYear: '公元前208',
    deathYear: '公元前194'
  },
  {
    tempId: 'heng',
    name: '刘恒',
    gender: '男',
    generation: 2,
    rankTitle: '汉文帝',
    fatherId: 'bang',
    motherId: 'bo_ji',
    birthYear: '公元前203',
    deathYear: '公元前157',
    spouses: ['dou']
  },
  {
    tempId: 'fei',
    name: '刘肥',
    gender: '男',
    generation: 2,
    rankTitle: '齐悼惠王',
    fatherId: 'bang',
    birthYear: '公元前221',
    deathYear: '公元前189'
  },
  {
    tempId: 'hui',
    name: '刘恢',
    gender: '男',
    generation: 2,
    rankTitle: '梁王',
    fatherId: 'bang',
    deathYear: '公元前181'
  },
  {
    tempId: 'you',
    name: '刘友',
    gender: '男',
    generation: 2,
    rankTitle: '赵幽王',
    fatherId: 'bang',
    deathYear: '公元前181'
  },
  {
    tempId: 'chang',
    name: '刘长',
    gender: '男',
    generation: 2,
    rankTitle: '淮南厉王',
    fatherId: 'bang',
    birthYear: '公元前198',
    deathYear: '公元前174'
  },
  {
    tempId: 'jian',
    name: '刘建',
    gender: '男',
    generation: 2,
    rankTitle: '燕灵王',
    fatherId: 'bang',
    deathYear: '公元前181'
  },

  // 第三代 (汉文帝刘恒之子 & 齐王刘肥之子)
  {
    tempId: 'qi',
    name: '刘启',
    gender: '男',
    generation: 3,
    rankTitle: '汉景帝',
    fatherId: 'heng',
    birthYear: '公元前188',
    deathYear: '公元前141'
  },
  {
    tempId: 'wu',
    name: '刘武',
    gender: '男',
    generation: 3,
    rankTitle: '梁孝王',
    fatherId: 'heng',
    birthYear: '公元前184',
    deathYear: '公元前144'
  },
  {
    tempId: 'dou',
    name: '窦漪房',
    gender: '女',
    generation: 2,
    rankTitle: '窦皇后',
    spouses: ['heng'],
    birthYear: '公元前205',
    deathYear: '公元前135'
  },
  {
    tempId: 'xiang',
    name: '刘襄',
    gender: '男',
    generation: 3,
    rankTitle: '齐哀王',
    fatherId: 'fei',
    deathYear: '公元前179'
  },
  {
    tempId: 'zhang',
    name: '刘章',
    gender: '男',
    generation: 3,
    rankTitle: '城阳景王',
    fatherId: 'fei',
    deathYear: '公元前177'
  },
  {
    tempId: 'xing_ju',
    name: '刘兴居',
    gender: '男',
    generation: 3,
    rankTitle: '济北王',
    fatherId: 'fei',
    deathYear: '公元前177'
  },

  // 第四代 (汉景帝刘启之子)
  {
    tempId: 'che',
    name: '刘彻',
    gender: '男',
    generation: 4,
    rankTitle: '汉武帝',
    fatherId: 'qi',
    birthYear: '公元前156',
    deathYear: '公元前87',
    spouses: ['wang_zhi']
  },
  {
    tempId: 'wang_zhi',
    name: '王娡',
    gender: '女',
    generation: 3,
    rankTitle: '王皇后',
    spouses: ['qi'],
    birthYear: '公元前173',
    deathYear: '公元前126'
  },
  {
    tempId: 'rong',
    name: '刘荣',
    gender: '男',
    generation: 4,
    rankTitle: '临江闵王',
    fatherId: 'qi',
    deathYear: '公元前148'
  },
  {
    tempId: 'de',
    name: '刘德',
    gender: '男',
    generation: 4,
    rankTitle: '河间献王',
    fatherId: 'qi',
    deathYear: '公元前130'
  },
  {
    tempId: 'e_yu',
    name: '刘阏于',
    gender: '男',
    generation: 4,
    rankTitle: '临江哀王',
    fatherId: 'qi',
    deathYear: '公元前153'
  },
  {
    tempId: 'fei_4',
    name: '刘非',
    gender: '男',
    generation: 4,
    rankTitle: '江都易王',
    fatherId: 'qi',
    birthYear: '公元前168',
    deathYear: '公元前127'
  },
  {
    tempId: 'peng_zu',
    name: '刘彭祖',
    gender: '男',
    generation: 4,
    rankTitle: '赵敬肃王',
    fatherId: 'qi',
    deathYear: '公元前92'
  },
  {
    tempId: 'fa',
    name: '刘发',
    gender: '男',
    generation: 4,
    rankTitle: '长沙定王',
    fatherId: 'qi',
    deathYear: '公元前129'
  },
  {
    tempId: 'duan',
    name: '刘端',
    gender: '男',
    generation: 4,
    rankTitle: '胶西于王',
    fatherId: 'qi',
    deathYear: '公元前108'
  },
  {
    tempId: 'sheng',
    name: '刘胜',
    gender: '男',
    generation: 4,
    rankTitle: '中山靖王',
    fatherId: 'qi',
    birthYear: '公元前165',
    deathYear: '公元前113',
    bio: '刘备自称其后裔。'
  },
  {
    tempId: 'yue',
    name: '刘越',
    gender: '男',
    generation: 4,
    rankTitle: '广川惠王',
    fatherId: 'qi',
    deathYear: '公元前136'
  },
  {
    tempId: 'ji_4',
    name: '刘寄',
    gender: '男',
    generation: 4,
    rankTitle: '胶东康王',
    fatherId: 'qi',
    deathYear: '公元前120'
  },
  {
    tempId: 'qing',
    name: '刘庆',
    gender: '男',
    generation: 4,
    rankTitle: '六安共王',
    fatherId: 'qi',
    deathYear: '公元前84'
  },

  // 第五代 (汉武帝刘彻之子 & 长沙定王刘发之后)
  {
    tempId: 'ju',
    name: '刘据',
    gender: '男',
    generation: 5,
    rankTitle: '戾太子',
    fatherId: 'che',
    birthYear: '公元前128',
    deathYear: '公元前91'
  },
  {
    tempId: 'zi_fu',
    name: '卫子夫',
    gender: '女',
    generation: 4,
    rankTitle: '卫皇后',
    spouses: ['che'],
    deathYear: '公元前91'
  },
  {
    tempId: 'hong',
    name: '刘闳',
    gender: '男',
    generation: 5,
    rankTitle: '齐怀王',
    fatherId: 'che',
    deathYear: '公元前110'
  },
  {
    tempId: 'dan',
    name: '刘旦',
    gender: '男',
    generation: 5,
    rankTitle: '燕刺王',
    fatherId: 'che',
    deathYear: '公元前80'
  },
  {
    tempId: 'xu',
    name: '刘胥',
    gender: '男',
    generation: 5,
    rankTitle: '广陵厉王',
    fatherId: 'che',
    deathYear: '公元前54'
  },
  {
    tempId: 'bo_5',
    name: '刘髆',
    gender: '男',
    generation: 5,
    rankTitle: '昌邑哀王',
    fatherId: 'che',
    deathYear: '公元前88'
  },
  {
    tempId: 'fu_ling',
    name: '刘弗陵',
    gender: '男',
    generation: 5,
    rankTitle: '汉昭帝',
    fatherId: 'che',
    birthYear: '公元前94',
    deathYear: '公元前74'
  },
  {
    tempId: 'mai',
    name: '刘买',
    gender: '男',
    generation: 5,
    rankTitle: '长沙戴王',
    fatherId: 'fa',
    deathYear: '公元前104'
  },

  // 第六代 (戾太子刘据之子 & 昌邑哀王刘髆之子 & 长沙戴王刘买之子)
  {
    tempId: 'jin',
    name: '刘进',
    gender: '男',
    generation: 6,
    rankTitle: '史皇孙',
    fatherId: 'ju',
    birthYear: '公元前113',
    deathYear: '公元前91'
  },
  {
    tempId: 'he',
    name: '刘贺',
    gender: '男',
    generation: 6,
    rankTitle: '海昏侯',
    fatherId: 'bo_5',
    birthYear: '公元前92',
    deathYear: '公元前59',
    bio: '曾任汉废帝。'
  },
  {
    tempId: 'xiong_qu',
    name: '刘熊渠',
    gender: '男',
    generation: 6,
    rankTitle: '长沙顷王',
    fatherId: 'mai',
    deathYear: '公元前80'
  },

  // 第七代 (汉宣帝刘询 - 史皇孙刘进之子)
  {
    tempId: 'xun',
    name: '刘询',
    gender: '男',
    generation: 7,
    rankTitle: '汉宣帝',
    fatherId: 'jin',
    birthYear: '公元前91',
    deathYear: '公元前48',
    spouses: ['xu_guang_han', 'wang']
  },
  {
    tempId: 'xu_guang_han',
    name: '许平君',
    gender: '女',
    generation: 6,
    rankTitle: '恭哀皇后',
    spouses: ['xun'],
    birthYear: '公元前89',
    deathYear: '公元前71'
  },
  {
    tempId: 'ren',
    name: '刘仁',
    gender: '男',
    generation: 7,
    rankTitle: '长沙刺王',
    fatherId: 'xiong_qu',
    deathYear: '公元前48'
  },

  // 第八代 (汉宣帝刘询之子)
  {
    tempId: 'shi',
    name: '刘奭',
    gender: '男',
    generation: 8,
    rankTitle: '汉元帝',
    fatherId: 'xun',
    birthYear: '公元前75',
    deathYear: '公元前33'
  },
  {
    tempId: 'qin',
    name: '刘钦',
    gender: '男',
    generation: 8,
    rankTitle: '淮阳宪王',
    fatherId: 'xun',
    deathYear: '公元前28'
  },
  {
    tempId: 'xiao',
    name: '刘嚣',
    gender: '男',
    generation: 8,
    rankTitle: '楚孝王',
    fatherId: 'xun',
    deathYear: '公元前25'
  },
  {
    tempId: 'yu_8',
    name: '刘宇',
    gender: '男',
    generation: 8,
    rankTitle: '东平思王',
    fatherId: 'xun',
    deathYear: '公元前20'
  },
  {
    tempId: 'jing_8',
    name: '刘竟',
    gender: '男',
    generation: 8,
    rankTitle: '中山哀王',
    fatherId: 'xun',
    deathYear: '公元前35'
  },
  {
    tempId: 'sheng_8',
    name: '刘圣',
    gender: '男',
    generation: 8,
    rankTitle: '长沙炀王',
    fatherId: 'ren',
    deathYear: '公元前45'
  },

  // 第九代 (汉元帝刘奭之子 & 长沙炀王刘圣之弟)
  {
    tempId: 'ao',
    name: '刘骜',
    gender: '男',
    generation: 9,
    rankTitle: '汉成帝',
    fatherId: 'shi',
    birthYear: '公元前51',
    deathYear: '公元前7'
  },
  {
    tempId: 'kang',
    name: '刘康',
    gender: '男',
    generation: 9,
    rankTitle: '定陶恭王',
    fatherId: 'shi',
    deathYear: '公元前23'
  },
  {
    tempId: 'xing_9',
    name: '刘兴',
    gender: '男',
    generation: 9,
    rankTitle: '中山孝王',
    fatherId: 'shi',
    deathYear: '公元前8'
  },
  {
    tempId: 'dang',
    name: '刘党',
    gender: '男',
    generation: 9,
    rankTitle: '长沙孝王',
    fatherId: 'ren',
    deathYear: '公元前3'
  },

  // 第十代 (汉哀帝 & 汉平帝)
  {
    tempId: 'xin',
    name: '刘欣',
    gender: '男',
    generation: 10,
    rankTitle: '汉哀帝',
    fatherId: 'kang',
    birthYear: '公元前25',
    deathYear: '公元前1'
  },
  {
    tempId: 'kan',
    name: '刘衎',
    gender: '男',
    generation: 10,
    rankTitle: '汉平帝',
    fatherId: 'xing_9',
    birthYear: '公元前9',
    deathYear: '公元6'
  },
  {
    tempId: 'hui_10',
    name: '刘辉',
    gender: '男',
    generation: 10,
    rankTitle: '长沙缪王',
    fatherId: 'dang',
    deathYear: '公元1'
  },

  // 第十一代 (长沙缪王刘辉之子)
  {
    tempId: 'jian_11',
    name: '刘建德',
    gender: '男',
    generation: 11,
    rankTitle: '长沙王',
    fatherId: 'hui_10',
    deathYear: '公元10'
  },

  // 汉朝中兴 - 东汉世系 (从刘发分支追溯)
  // 刘发 -> 刘买 -> 刘外 -> 刘回 -> 刘钦 -> 刘秀
  {
    tempId: 'wai',
    name: '刘外',
    gender: '男',
    generation: 6,
    rankTitle: '郁林太守',
    fatherId: 'mai'
  },
  {
    tempId: 'hui_gen',
    name: '刘回',
    gender: '男',
    generation: 7,
    rankTitle: '巨鹿都尉',
    fatherId: 'wai'
  },
  {
    tempId: 'qin_gen',
    name: '刘钦',
    gender: '男',
    generation: 8,
    rankTitle: '南顿令',
    fatherId: 'hui_gen',
    deathYear: '公元3'
  },
  {
    tempId: 'yan',
    name: '刘縯',
    gender: '男',
    generation: 9,
    rankTitle: '齐武王',
    fatherId: 'qin_gen',
    deathYear: '公元23'
  },
  {
    tempId: 'zhong',
    name: '刘仲',
    gender: '男',
    generation: 9,
    rankTitle: '鲁哀王',
    fatherId: 'qin_gen',
    deathYear: '公元22'
  },
  {
    tempId: 'xiu',
    name: '刘秀',
    gender: '男',
    generation: 9,
    rankTitle: '光武帝',
    fatherId: 'qin_gen',
    birthYear: '公元前5',
    deathYear: '公元57',
    bio: '东汉开国皇帝。',
    spouses: ['li_hua', 'guo_sheng_tong']
  },
  {
    tempId: 'li_hua',
    name: '阴丽华',
    gender: '女',
    generation: 8,
    rankTitle: '光烈皇后',
    spouses: ['xiu'],
    birthYear: '公元5',
    deathYear: '公元64'
  },
  {
    tempId: 'guo_sheng_tong',
    name: '郭圣通',
    gender: '女',
    generation: 8,
    rankTitle: '郭皇后',
    spouses: ['xiu'],
    deathYear: '公元52'
  },

  // 第十代 (刘秀之子)
  {
    tempId: 'zhuang',
    name: '刘庄',
    gender: '男',
    generation: 10,
    rankTitle: '汉明帝',
    fatherId: 'xiu',
    motherId: 'li_hua',
    birthYear: '公元28',
    deathYear: '公元75'
  },
  {
    tempId: 'jiang',
    name: '刘疆',
    gender: '男',
    generation: 10,
    rankTitle: '东海恭王',
    fatherId: 'xiu',
    motherId: 'guo_sheng_tong',
    birthYear: '公元25',
    deathYear: '公元58'
  },
  {
    tempId: 'fu_10',
    name: '刘辅',
    gender: '男',
    generation: 10,
    rankTitle: '沛献王',
    fatherId: 'xiu',
    deathYear: '公元84'
  },
  {
    tempId: 'kang_10',
    name: '刘康',
    gender: '男',
    generation: 10,
    rankTitle: '济南安王',
    fatherId: 'xiu',
    deathYear: '公元97'
  },
  {
    tempId: 'yan_10',
    name: '刘延',
    gender: '男',
    generation: 10,
    rankTitle: '阜陵质王',
    fatherId: 'xiu',
    deathYear: '公元89'
  },
  {
    tempId: '焉',
    name: '刘焉',
    gender: '男',
    generation: 10,
    rankTitle: '中山简王',
    fatherId: 'xiu',
    deathYear: '公元90'
  },
  {
    tempId: 'ying_10',
    name: '刘英',
    gender: '男',
    generation: 10,
    rankTitle: '楚王',
    fatherId: 'xiu',
    deathYear: '公元71'
  },
  {
    tempId: 'cang',
    name: '刘苍',
    gender: '男',
    generation: 10,
    rankTitle: '东平宪王',
    fatherId: 'xiu',
    deathYear: '公元83'
  },
  {
    tempId: 'jing_10',
    name: '刘荆',
    gender: '男',
    generation: 10,
    rankTitle: '广陵思王',
    fatherId: 'xiu',
    deathYear: '公元67'
  },
  {
    tempId: 'heng_10',
    name: '刘衡',
    gender: '男',
    generation: 10,
    rankTitle: '临怀怀王',
    fatherId: 'xiu',
    deathYear: '公元41'
  },
  {
    tempId: 'jing_d_10',
    name: '刘京',
    gender: '男',
    generation: 10,
    rankTitle: '琅邪孝王',
    fatherId: 'xiu',
    deathYear: '公元81'
  },

  // 第十一代 (汉明帝刘庄之子)
  {
    tempId: 'da',
    name: '刘炟',
    gender: '男',
    generation: 11,
    rankTitle: '汉章帝',
    fatherId: 'zhuang',
    birthYear: '公元57',
    deathYear: '公元88'
  },
  {
    tempId: 'jian_11_m',
    name: '刘建',
    gender: '男',
    generation: 11,
    rankTitle: '千乘哀王',
    fatherId: 'zhuang',
    deathYear: '公元61'
  },
  {
    tempId: 'xian_11',
    name: '刘羡',
    gender: '男',
    generation: 11,
    rankTitle: '陈敬王',
    fatherId: 'zhuang',
    deathYear: '公元97'
  },
  {
    tempId: 'gong_11',
    name: '刘恭',
    gender: '男',
    generation: 11,
    rankTitle: '彭城靖王',
    fatherId: 'zhuang',
    deathYear: '公元117'
  },
  {
    tempId: 'dang_11',
    name: '刘党',
    gender: '男',
    generation: 11,
    rankTitle: '乐成靖王',
    fatherId: 'zhuang',
    deathYear: '公元96'
  },
  {
    tempId: 'yan_11',
    name: '刘衍',
    gender: '男',
    generation: 11,
    rankTitle: '下邳惠王',
    fatherId: 'zhuang',
    deathYear: '公元125'
  },
  {
    tempId: 'chang_11',
    name: '刘畅',
    gender: '男',
    generation: 11,
    rankTitle: '梁节王',
    fatherId: 'zhuang',
    deathYear: '公元98'
  },
  {
    tempId: 'bing',
    name: '刘昞',
    gender: '男',
    generation: 11,
    rankTitle: '淮阳顷王',
    fatherId: 'zhuang',
    deathYear: '公元87'
  },
  {
    tempId: 'chang_2_11',
    name: '刘长',
    gender: '男',
    generation: 11,
    rankTitle: '济阴悼王',
    fatherId: 'zhuang',
    deathYear: '公元84'
  },

  // 第十二代 (汉章帝刘炟之子)
  {
    tempId: 'zhao',
    name: '刘肇',
    gender: '男',
    generation: 12,
    rankTitle: '汉和帝',
    fatherId: 'da',
    birthYear: '公元79',
    deathYear: '公元105'
  },
  {
    tempId: 'kang_12',
    name: '刘亢',
    gender: '男',
    generation: 12,
    rankTitle: '千乘贞王',
    fatherId: 'da',
    deathYear: '公元93'
  },
  {
    tempId: 'quan',
    name: '刘全',
    gender: '男',
    generation: 12,
    rankTitle: '平春悼王',
    fatherId: 'da',
    deathYear: '公元79'
  },
  {
    tempId: 'qing_12',
    name: '刘庆',
    gender: '男',
    generation: 12,
    rankTitle: '清河孝王',
    fatherId: 'da',
    birthYear: '公元78',
    deathYear: '公元106'
  },
  {
    tempId: 'shou',
    name: '刘寿',
    gender: '男',
    generation: 12,
    rankTitle: '济北惠王',
    fatherId: 'da',
    deathYear: '公元120'
  },
  {
    tempId: 'kai',
    name: '刘开',
    gender: '男',
    generation: 12,
    rankTitle: '河间孝王',
    fatherId: 'da',
    deathYear: '公元131'
  },
  {
    tempId: 'shu',
    name: '刘淑',
    gender: '男',
    generation: 12,
    rankTitle: '城阳怀王',
    fatherId: 'da',
    deathYear: '公元94'
  },
  {
    tempId: 'wan',
    name: '刘万岁',
    gender: '男',
    generation: 12,
    rankTitle: '广宗殇王',
    fatherId: 'da',
    deathYear: '公元90'
  },

  // 第十三代 (汉和帝刘肇之子 & 清河孝王刘庆之子 & 河间孝王刘开之子)
  {
    tempId: 'sheng_13',
    name: '刘胜',
    gender: '男',
    generation: 13,
    rankTitle: '平原怀王',
    fatherId: 'zhao',
    deathYear: '公元114'
  },
  {
    tempId: 'long',
    name: '刘隆',
    gender: '男',
    generation: 13,
    rankTitle: '汉殇帝',
    fatherId: 'zhao',
    birthYear: '公元105',
    deathYear: '公元106'
  },
  {
    tempId: 'hu',
    name: '刘祜',
    gender: '男',
    generation: 13,
    rankTitle: '汉安帝',
    fatherId: 'qing_12',
    birthYear: '公元94',
    deathYear: '公元125'
  },
  {
    tempId: 'yi_13',
    name: '刘翼',
    gender: '男',
    generation: 13,
    rankTitle: '蠡吾侯',
    fatherId: 'kai',
    bio: '汉桓帝之父。'
  },
  {
    tempId: 'de_13',
    name: '刘德',
    gender: '男',
    generation: 13,
    rankTitle: '河间惠王',
    fatherId: 'kai',
  },

  // 第十四代 (汉安帝刘祜之子 & 蠡吾侯刘翼之子)
  {
    tempId: 'bao',
    name: '刘保',
    gender: '男',
    generation: 14,
    rankTitle: '汉顺帝',
    fatherId: 'hu',
    birthYear: '公元115',
    deathYear: '公元144'
  },
  {
    tempId: 'zhi_14',
    name: '刘志',
    gender: '男',
    generation: 14,
    rankTitle: '汉桓帝',
    fatherId: 'yi_13',
    birthYear: '公元132',
    deathYear: '公元168'
  },

  // 第十五代 (汉顺帝刘保之子)
  {
    tempId: 'bing_15',
    name: '刘炳',
    gender: '男',
    generation: 15,
    rankTitle: '汉冲帝',
    fatherId: 'bao',
    birthYear: '公元143',
    deathYear: '公元145'
  },

  // 东汉末年部分 - 刘备一支 (追溯到中山靖王刘胜)
  // 刘胜 -> ... -> 刘雄 -> 刘弘 -> 刘备
  {
    tempId: 'xiong',
    name: '刘雄',
    gender: '男',
    generation: 18,
    rankTitle: '东郡范令',
    bio: '刘备祖父。'
  },
  {
    tempId: 'hong_bei',
    name: '刘弘',
    gender: '男',
    generation: 19,
    rankTitle: '州郡小吏',
    fatherId: 'xiong',
    bio: '刘备父亲。'
  },
  {
    tempId: 'bei',
    name: '刘备',
    gender: '男',
    generation: 20,
    rankTitle: '汉昭烈帝',
    fatherId: 'hong_bei',
    birthYear: '公元161',
    deathYear: '公元223',
    bio: '蜀汉开国皇帝。',
    spouses: ['mi_f', 'gan_f', 'sun_f']
  },
  {
    tempId: 'mi_f',
    name: '糜夫人',
    gender: '女',
    generation: 19,
    rankTitle: '糜妃',
    spouses: ['bei']
  },
  {
    tempId: 'gan_f',
    name: '甘夫人',
    gender: '女',
    generation: 19,
    rankTitle: '昭烈皇后',
    spouses: ['bei'],
    deathYear: '公元210'
  },
  {
    tempId: 'sun_f',
    name: '孙夫人',
    gender: '女',
    generation: 19,
    rankTitle: '孙尚香',
    spouses: ['bei']
  },

  // 第21代 (刘备之子)
  {
    tempId: 'chan',
    name: '刘禅',
    gender: '男',
    generation: 21,
    rankTitle: '蜀汉后主',
    fatherId: 'bei',
    motherId: 'gan_f',
    birthYear: '公元207',
    deathYear: '公元271'
  },
  {
    tempId: 'yong',
    name: '刘永',
    gender: '男',
    generation: 21,
    rankTitle: '甘陵王',
    fatherId: 'bei'
  },
  {
    tempId: 'li_21',
    name: '刘理',
    gender: '男',
    generation: 21,
    rankTitle: '安平王',
    fatherId: 'bei'
  },

  // 第22代 (刘禅之子)
  {
    tempId: 'xuan',
    name: '刘璿',
    gender: '男',
    generation: 22,
    rankTitle: '蜀汉太子',
    fatherId: 'chan',
    birthYear: '公元224',
    deathYear: '公元264'
  },
  {
    tempId: 'yao',
    name: '刘瑶',
    gender: '男',
    generation: 22,
    rankTitle: '安定王',
    fatherId: 'chan'
  },
  {
    tempId: 'zong',
    name: '刘琮',
    gender: '男',
    generation: 22,
    rankTitle: '西河王',
    fatherId: 'chan',
    deathYear: '公元262'
  },
  {
    tempId: 'zan',
    name: '刘瓒',
    gender: '男',
    generation: 22,
    rankTitle: '新平王',
    fatherId: 'chan'
  },
  {
    tempId: 'chen',
    name: '刘谌',
    gender: '男',
    generation: 22,
    rankTitle: '北地王',
    fatherId: 'chan',
    deathYear: '公元263',
    bio: '蜀汉灭亡时自杀殉国。'
  },
  {
    tempId: 'xun_22',
    name: '刘恂',
    gender: '男',
    generation: 22,
    rankTitle: '新兴王',
    fatherId: 'chan'
  },
  {
    tempId: 'qu',
    name: '刘璩',
    gender: '男',
    generation: 22,
    rankTitle: '上党王',
    fatherId: 'chan'
  }
];

module.exports = {
  historyData
};
