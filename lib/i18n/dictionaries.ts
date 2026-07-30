import { BRAND, Locale } from "@/lib/constants";

type Dictionary = {
  nav: Record<"menu" | "membership" | "about" | "contact" | "faq" | "login" | "register", string>;
  common: Record<"legalReview" | "viewMenu" | "joinMembership" | "learnMore" | "logout", string>;
  home: Record<"headline" | "tagline" | "line" | "intro" | "featured" | "benefits" | "location" | "social", string>;
  membership: {
    title: string;
    fee: string;
    duration: string;
    activation: string;
    benefits: string[];
  };
  register: Record<
    | "title"
    | "fullName"
    | "mobile"
    | "email"
    | "password"
    | "dob"
    | "referral"
    | "terms"
    | "privacy"
    | "marketing"
    | "submit",
    string
  >;
  login: Record<"title" | "submit", string>;
  dashboard: Record<
    | "title"
    | "status"
    | "start"
    | "expiry"
    | "days"
    | "points"
    | "memberNo"
    | "referral"
    | "transactions"
    | "activity"
    | "expired",
    string
  >;
  admin: Record<
    | "title"
    | "search"
    | "activate"
    | "suspend"
    | "renew"
    | "addPoints"
    | "deductPoints"
    | "exportMembers"
    | "exportPoints",
    string
  >;
};

const en: Dictionary = {
  nav: {
    menu: "Menu",
    membership: "Membership",
    about: "About",
    contact: "Contact",
    faq: "FAQ",
    login: "Member Login",
    register: "Join"
  },
  common: {
    legalReview: "For legal review",
    viewMenu: "View Menu",
    joinMembership: "Join Membership",
    learnMore: "Learn More",
    logout: "Logout"
  },
  home: {
    headline: BRAND.nameEn,
    tagline: BRAND.tagline,
    line: BRAND.line,
    intro: "A Singapore-based modern Oriental tea brand crafting a calmer, brighter sparkling tea experience.",
    featured: "Featured Drinks",
    benefits: "Membership Benefits",
    location: "Store Location",
    social: "Social links coming soon"
  },
  membership: {
    title: "Qing Yun Jian Membership",
    fee: "Membership fee",
    duration: "60 days from activation",
    activation:
      "Soft launch registration creates a pending membership. Store administrators activate membership after payment confirmation.",
    benefits: ["Member pricing", "Points rewards", "Referral code", "QR member identity"]
  },
  register: {
    title: "Create Member Account",
    fullName: "Full name",
    mobile: "Mobile number",
    email: "Email address",
    password: "Password",
    dob: "Date of birth",
    referral: "Referral code",
    terms: "I agree to the membership terms.",
    privacy: "I agree to the privacy policy.",
    marketing: "I agree to receive marketing updates.",
    submit: "Register"
  },
  login: {
    title: "Member Login",
    submit: "Log In"
  },
  dashboard: {
    title: "Member Dashboard",
    status: "Membership Status",
    start: "Start Date",
    expiry: "Expiry Date",
    days: "Days Remaining",
    points: "Points Balance",
    memberNo: "Member Number",
    referral: "Referral Link",
    transactions: "Recent Points Transactions",
    activity: "Recent Membership Activity",
    expired: "Your membership has expired. Please contact the store to renew."
  },
  admin: {
    title: "Admin Portal",
    search: "Search members",
    activate: "Activate Membership",
    suspend: "Suspend",
    renew: "Renew or Extend",
    addPoints: "Add Points",
    deductPoints: "Deduct Points",
    exportMembers: "Export Members CSV",
    exportPoints: "Export Points CSV"
  }
};

const zh: Dictionary = {
  nav: {
    menu: "菜单",
    membership: "会员",
    about: "关于青云间",
    contact: "联系",
    faq: "常见问题",
    login: "会员登录",
    register: "加入会员"
  },
  common: {
    legalReview: "待法律审核",
    viewMenu: "查看菜单",
    joinMembership: "加入会员",
    learnMore: "了解更多",
    logout: "退出"
  },
  home: {
    headline: BRAND.nameZh,
    tagline: "Born to Ascend",
    line: "Sparkling Tea Reimagined",
    intro: "源自新加坡的现代东方茶饮品牌，重新想象清爽、雅致、有层次的气泡茶体验。",
    featured: "精选饮品",
    benefits: "会员权益",
    location: "门店位置",
    social: "社交媒体即将上线"
  },
  membership: {
    title: "青云间会员",
    fee: "会员费",
    duration: "自激活日起 60 天",
    activation: "试营业期间，注册后会员状态为待处理。管理员确认付款后手动激活会员。",
    benefits: ["会员价格", "积分奖励", "推荐码", "会员二维码"]
  },
  register: {
    title: "创建会员账户",
    fullName: "姓名",
    mobile: "手机号码",
    email: "电子邮箱",
    password: "密码",
    dob: "出生日期",
    referral: "推荐码",
    terms: "我同意会员条款。",
    privacy: "我同意隐私政策。",
    marketing: "我同意接收营销资讯。",
    submit: "注册"
  },
  login: {
    title: "会员登录",
    submit: "登录"
  },
  dashboard: {
    title: "会员中心",
    status: "会员状态",
    start: "开始日期",
    expiry: "到期日期",
    days: "剩余天数",
    points: "积分余额",
    memberNo: "会员编号",
    referral: "推荐链接",
    transactions: "近期积分记录",
    activity: "近期会员记录",
    expired: "您的会员已到期。请联系门店续会。"
  },
  admin: {
    title: "管理后台",
    search: "搜索会员",
    activate: "激活会员",
    suspend: "暂停",
    renew: "续会或延长",
    addPoints: "增加积分",
    deductPoints: "扣除积分",
    exportMembers: "导出会员 CSV",
    exportPoints: "导出积分 CSV"
  }
};

const dictionaries: Record<Locale, Dictionary> = { en, zh };

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.en;
}
