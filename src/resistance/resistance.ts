/* ============================================================
 * 抗戰到底・一九三七
 *
 * 省界來源：Wikimedia Commons《空白中華民國全圖.svg》（CC BY-SA 4.0），
 * 逐省提取向量路徑後處理：東北九省合併回 1930 年代三省、院轄市與海南併回所屬省份、
 * 修正原檔察哈爾誤標問題，簡化座標後嵌入 MAP_DATA。
 * 本作品同樣以 CC BY-SA 4.0 釋出。
 * ============================================================ */

// ---------- 型別 ----------

type NationId = "roc" | "jap";

export type ProvinceId =
  "jiangsu" | "zhejiang" | "anhui" | "jiangxi" | "hubei" |
  "hunan" | "sichuan" | "xikang" | "fujian" | "taiwan" |
  "guangdong" | "guangxi" | "yunnan" | "guizhou" | "hebei" |
  "shandong" | "henan" | "shanxi" | "shaanxi" | "gansu" |
  "ningxia" | "qinghai" | "suiyuan" | "chahar" | "rehe" |
  "liaoning" | "jilin" | "heilongjiang" | "xinjiang" | "xizang" |
  "menggu" |
  "nanjing" | "shanghai" | "beiping" | "tianjin" | "qingdao" |
  "shenyang" | "haerbin" | "guangzhou" | "hankou" | "chongqing";

// 院轄市
export type MunicipalityId =
  "nanjing" | "shanghai" | "beiping" | "tianjin" | "qingdao" |
  "shenyang" | "haerbin" | "guangzhou" | "hankou" | "chongqing";

type EventKind = "move" | "battle" | "capture";

interface GameEvent {
  text: string;
  kind: EventKind;
}

interface ProvinceData {
  id: ProvinceId;
  d: string;  // SVG path
  cx: number;
}

// 首都：locId 決定星標位置，hostId 淪陷即觸發遷都
interface CapitalSeat {
  locId: ProvinceId;
  hostId: ProvinceId;
  event: string;
}


// ---------- 資料層 ----------

const PROVINCE_NAME: Record<ProvinceId, string> = {
  jiangsu: "江蘇", zhejiang: "浙江", anhui: "安徽", jiangxi: "江西", hubei: "湖北",
  hunan: "湖南", sichuan: "四川", xikang: "西康", fujian: "福建", taiwan: "臺灣",
  guangdong: "廣東", guangxi: "廣西", yunnan: "雲南", guizhou: "貴州", hebei: "河北",
  shandong: "山東", henan: "河南", shanxi: "山西", shaanxi: "陝西", gansu: "甘肅",
  ningxia: "寧夏", qinghai: "青海", suiyuan: "綏遠", chahar: "察哈爾", rehe: "熱河",
  liaoning: "遼寧", jilin: "吉林", heilongjiang: "黑龍江", xinjiang: "新疆", xizang: "西藏",
  menggu: "蒙古",
  nanjing: "南京", shanghai: "上海", beiping: "北平", tianjin: "天津", qingdao: "青島",
  shenyang: "瀋陽", haerbin: "哈爾濱", guangzhou: "廣州", hankou: "漢口", chongqing: "重慶"
}

const NATION_NAME: Record<NationId, string> = {
  roc: "中華民國", jap: "大日本帝國"
}

// 開局設定
const JAPAN_START: ReadonlySet<ProvinceId> = new Set<ProvinceId>([
  "taiwan", "heilongjiang", "jilin", "liaoning", "rehe", "shenyang", "haerbin",
]);

const INITIAL_ARMIES: Partial<Record<ProvinceId, number>> = {
  hebei: 30, chahar: 12, menggu: 3, beiping: 10, tianjin: 8,  // roc
  liaoning: 40, rehe: 15, heilongjiang: 10, jilin: 20, taiwan: 5  // jap
}

// 尚未啟用的院轄市：區塊融入所屬省份
const DORMANT_MUNICIPALITY: Partial<Record<MunicipalityId, ProvinceId>> = {
  shenyang: "liaoning",
  haerbin: "jilin",
  guangzhou: "guangdong",
  hankou: "hubei",
}


const SVG_NS = "http://www.w3.org/2000/svg";

// 首都圖標：五角星 path
function starPath(cx: number, cy: number, rOut: number, rIn: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return "M" + pts.join("L") + "Z";
}


// ---------- 模型層 ----------

class Province {
  army: number;
  acted: boolean = false;
  owner: NationId;

  constructor(
    readonly id: ProvinceId,
    readonly cx: number,
    readonly cy: number,
    owner: NationId,
    army: number,
  ) {
    this.owner = owner;
    this.army = army;
  }

  get name(): string {
    return PROVINCE_NAME[this.id];
  }
}

class Nation {
  private captialIndex = 0;

  constructor(
    readonly id: NationId,
    private readonly capitalChain: CapitalSeat[],
    readonly overseaCapital?: string  // 圖外首都，不可互動
  ) {}

  get name(): string {
    return NATION_NAME[this.id];
  }

  get capital(): CapitalSeat | null {
    return this.captialIndex < this.capitalChain.length
      ? this.capitalChain[this.captialIndex]
      : null;
  }

}


// ---------- 視圖層 ----------
