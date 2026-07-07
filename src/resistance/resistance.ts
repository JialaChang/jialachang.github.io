/* ============================================================
 * 抗戰到底・一九三七
 *
 * 省界來源：Wikimedia Commons《空白中華民國全圖.svg》（CC BY-SA 4.0），
 * 逐省提取向量路徑後處理：東北九省合併回 1930 年代三省、院轄市與海南併回所屬省份、
 * 修正原檔察哈爾誤標問題，簡化座標後嵌入 MAP_DATA。
 * 本作品同樣以 CC BY-SA 4.0 釋出。
 * ============================================================ */

console.log("「我們始終相信，暴力是不能打垮我們的。終有一天，會由敵人製造的廢墟中出現嶄新的國家，只要地球存在，這個國家就將繼續存在。敵如進攻南京，我們就保衛南京。敵如進攻四川，我們就保衛四川。只要敵人繼續侵略，我們就繼續抵抗。敵人不懂得中國領土是不可征服的，中國是毀滅不了的。在敵人侵略下，中國只要有一處自由場所，國民政府將依然作為最高權力機關存在。」── 蔣介石")

// ---------- 型別 ----------

import { MAP_DATA, CAPITALS, ADJACENCY, MUNICIPALITY_LABEL_OFFSET} from "./mapdata.js"

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

interface ProvinceShape {
  id: ProvinceId;
  cx: number;  // 標籤定位點
  cy: number
  d: string;   // SVG path
}

interface MapData {
  W: number;
  H: number;
  shapes: ProvinceShape[]
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
const NATION_START: Record<NationId, ReadonlySet<ProvinceId>> = {
  jap: new Set<ProvinceId>([
    "taiwan", "heilongjiang", "jilin", "liaoning", "rehe", "shenyang", "haerbin",
  ]),
  roc: new Set<ProvinceId>([
    "jiangsu", "zhejiang", "anhui", "jiangxi", "hubei", "hunan", "sichuan", "xikang",
    "fujian", "guangdong", "guangxi", "yunnan", "guizhou", "hebei", "shandong", "henan",
    "shanxi", "shaanxi", "gansu", "ningxia", "qinghai", "suiyuan", "chahar", "xinjiang",
    "xizang", "menggu",
    "nanjing", "shanghai", "beiping", "tianjin", "qingdao", "guangzhou", "hankou", "chongqing",
  ]),
};

function decideProvinceOwner(id: ProvinceId): NationId {
  for (const nation of Object.keys(NATION_START) as NationId[]) {
    if (NATION_START[nation].has(id)) return nation;
  }
  throw new Error(` ${id} don't has a owner`);
}

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

  // 處理首都淪陷遷都：沿遷都鏈尋找仍屬於己方的候選首都
  handleLoss(game: Game, hostId: ProvinceId): string | null {
    const fallen = this.capital;
    if (!fallen || fallen.hostId !== hostId) return null;
    this.captialIndex++;
    while (this.capital && game.get(this.capital.hostId).owner !== this.id) {
      this.captialIndex++;
    }
    const next = this.capital;
    return next
    ? `【遷都】${PROVINCE_NAME[fallen.locId]}淪陷！${next.event}`
    : `【國都盡失】${PROVINCE_NAME[fallen.locId]}淪陷，政府被迫流亡……`;
  }
}

const NATIONS: Record<NationId, Nation> = {
  roc: new Nation("roc", [
    { locId: "nanjing", hostId: "nanjing", event: "" },
    { locId: "chongqing", hostId: "chongqing", event: "國民政府西遷重慶，定為陪都，抗戰到底！" },
  ]),
  jap: new Nation("jap", [], "東京"),
};

class Game {
  readonly provinces = new Map<ProvinceId, Province>();
  currNation: NationId = "roc";
  turnNum = 1;
  selectedId: ProvinceId | null = null;
  ended = false

  constructor(readonly nations: Record<NationId, Nation>) {
    for (const s of MAP_DATA.shapes) {
      if (s.id in DORMANT_MUNICIPALITY) continue;
      this.provinces.set(
        s.id,
        new Province(
          s.id, s.cx, s.cy,
          JAPAN_START.has(s.id) ? "jap" : "roc",
          INITIAL_ARMIES[s.id] ?? 0
        )
      );
    }
  }
}



// ---------- 視圖層 ----------

interface ProvinceEls {
  path: SVGPathElement;
  label?: SVGTextElement;  // 一般省份的置中省名
  marker?: SVGGElement;    // 院轄市的城市節點
  badge: SVGGElement;
  badgeText: SVGTextElement;
}

// SVG 地圖
class MapView {
  private els = new Map<ProvinceId, ProvinceEls>();
  private dormantEls: Array<{ host: ProvinceId; el: SVGPathElement }> = [];
  private capitalStar = new Map<NationId, SVGPathElement>();
  private shapeIndex = new Map<ProvinceId, ProvinceShape>();
  private hintLayer!: SVGGElement;
  private selectOutline!: SVGPathElement;

  constructor(
    // private readonly game: Game,
    private readonly onProvinceClick: (id: ProvinceId) => void,
  ) {}

  build(container: HTMLElement): void {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${MAP_DATA.W} ${MAP_DATA.H}`)
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "中華民國一九三零年代省份地圖");

    const provinceLayer = document.createElementNS(SVG_NS, "g");
    const labelLayer = document.createElementNS(SVG_NS, "g");
    this.hintLayer = document.createElementNS(SVG_NS, "g");
    const nodeLayer = document.createElementNS(SVG_NS, "g");
    svg.append(provinceLayer, labelLayer, this.hintLayer, nodeLayer);

    for (const s of MAP_DATA.shapes) {
      this.shapeIndex.set(s.id, s);

      if (s.id in DORMANT_MUNICIPALITY) {
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", s.d);
        path.classList.add("province", "dormant");
        provinceLayer.appendChild(path);
        this.dormantEls.push({ host: DORMANT_MUNICIPALITY[s.id as MunicipalityId]!, el: path});
        continue;
      }
    }
  }
}