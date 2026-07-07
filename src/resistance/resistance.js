/* ============================================================
 * 抗戰到底・一九三七
 *
 * 謹以此作紀念七七事變八十九周年（1937.7.7 – 2026.7.7）。
 *
 * 省界來源：Wikimedia Commons《空白中華民國全圖.svg》（CC BY-SA 4.0），
 * 逐省提取向量路徑後處理：東北九省合併回 1930 年代三省、院轄市與海南併回所屬省份、
 * 修正原檔察哈爾誤標問題，簡化座標後嵌入 MAP_DATA。
 * 本作品同樣以 CC BY-SA 4.0 釋出。
 * ============================================================ */
console.log("「我們始終相信，暴力是不能打垮我們的。終有一天，會由敵人製造的廢墟中出現嶄新的國家，只要地球存在，這個國家就將繼續存在。敵如進攻南京，我們就保衛南京。敵如進攻四川，我們就保衛四川。只要敵人繼續侵略，我們就繼續抵抗。敵人不懂得中國領土是不可征服的，中國是毀滅不了的。在敵人侵略下，中國只要有一處自由場所，國民政府將依然作為最高權力機關存在。」── 蔣介石");
// ---------- 型別 ----------
import { MAP_DATA, CAPITALS, ADJACENCY, MUNICIPALITY_LABEL_OFFSET } from "./mapdata.js";
// ---------- 資料層 ----------
const PROVINCE_NAME = {
    jiangsu: "江蘇", zhejiang: "浙江", anhui: "安徽", jiangxi: "江西", hubei: "湖北",
    hunan: "湖南", sichuan: "四川", xikang: "西康", fujian: "福建", taiwan: "臺灣",
    guangdong: "廣東", guangxi: "廣西", yunnan: "雲南", guizhou: "貴州", hebei: "河北",
    shandong: "山東", henan: "河南", shanxi: "山西", shaanxi: "陝西", gansu: "甘肅",
    ningxia: "寧夏", qinghai: "青海", suiyuan: "綏遠", chahar: "察哈爾", rehe: "熱河",
    liaoning: "遼寧", jilin: "吉林", heilongjiang: "黑龍江", xinjiang: "新疆", xizang: "西藏",
    menggu: "蒙古",
    nanjing: "南京", shanghai: "上海", beiping: "北平", tianjin: "天津", qingdao: "青島",
    shenyang: "瀋陽", haerbin: "哈爾濱", guangzhou: "廣州", hankou: "漢口", chongqing: "重慶"
};
const NATION_NAME = {
    roc: "中華民國", jap: "大日本帝國"
};
// 開局設定
const NATION_START = {
    jap: new Set([
        "taiwan", "heilongjiang", "jilin", "liaoning", "rehe", "shenyang", "haerbin",
    ]),
    roc: new Set([
        "jiangsu", "zhejiang", "anhui", "jiangxi", "hubei", "hunan", "sichuan", "xikang",
        "fujian", "guangdong", "guangxi", "yunnan", "guizhou", "hebei", "shandong", "henan",
        "shanxi", "shaanxi", "gansu", "ningxia", "qinghai", "suiyuan", "chahar", "xinjiang",
        "xizang", "menggu",
        "nanjing", "shanghai", "beiping", "tianjin", "qingdao", "guangzhou", "hankou", "chongqing",
    ]),
};
function decideProvinceOwner(id) {
    for (const nation of Object.keys(NATION_START)) {
        if (NATION_START[nation].has(id))
            return nation;
    }
    throw new Error(`Province "${id}" is not in any nation's NATION_START set`);
}
const INITIAL_ARMIES = {
    hebei: 30, chahar: 12, menggu: 3, beiping: 10, tianjin: 8, // roc
    liaoning: 40, rehe: 15, heilongjiang: 10, jilin: 20, taiwan: 5 // jap
};
const MUNICIPALITY = new Set(Object.keys(MUNICIPALITY_LABEL_OFFSET));
// 尚未啟用的院轄市：區塊融入所屬省份
const DORMANT_MUNICIPALITY = {
    shenyang: "liaoning",
    haerbin: "jilin",
    guangzhou: "guangdong",
    hankou: "hubei",
};
const SVG_NS = "http://www.w3.org/2000/svg";
// 首都圖標：五角星 path
function starPath(cx, cy, rOut, rIn) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? rOut : rIn;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
    }
    return "M" + pts.join("L") + "Z";
}
// ---------- 模型層 ----------
class Province {
    id;
    cx;
    cy;
    owner;
    isMunicipality;
    army;
    acted = false;
    constructor(id, cx, cy, owner, army) {
        this.id = id;
        this.cx = cx;
        this.cy = cy;
        this.owner = owner;
        this.army = army;
        // @ts-expect-error
        this.isMunicipality = MUNICIPALITY.has(this.id);
    }
    get name() {
        return PROVINCE_NAME[this.id];
    }
}
class Nation {
    id;
    capitalChain;
    nationNarrative;
    overseaCapital;
    captialIndex = 0;
    constructor(id, capitalChain, nationNarrative, overseaCapital // 圖外首都，不可互動
    ) {
        this.id = id;
        this.capitalChain = capitalChain;
        this.nationNarrative = nationNarrative;
        this.overseaCapital = overseaCapital;
    }
    get name() {
        return NATION_NAME[this.id];
    }
    get capital() {
        return this.captialIndex < this.capitalChain.length
            ? this.capitalChain[this.captialIndex]
            : null;
    }
    // 處理首都淪陷遷都：沿遷都鏈尋找仍屬於己方的候選首都
    handleCapital(game, hostId) {
        const fallen = this.capital;
        if (!fallen || fallen.hostId !== hostId)
            return null;
        this.captialIndex++;
        while (this.capital && game.get(this.capital.hostId).owner !== this.id) {
            this.captialIndex++;
        }
        const next = this.capital;
        return next
            ? `【遷都】${PROVINCE_NAME[fallen.locId]}淪陷！${next.text}`
            : `【河山破碎】${PROVINCE_NAME[fallen.locId]}淪陷，政府被迫流亡……`;
    }
    narrative(kind, ctx) {
        return { kind, text: this.nationNarrative[kind](ctx) };
    }
}
const NATIONS = {
    roc: new Nation("roc", [
        { locId: "nanjing", hostId: "nanjing", text: "" },
        { locId: "chongqing", hostId: "chongqing", text: "國民政府西遷重慶，定為陪都，抗戰到底！" },
    ], {
        move: ({ fromName, toName, attackers }) => `我軍 ${attackers} 萬自${fromName}移駐${toName}。`,
        battleWin: ({ toName, attackers, defenders, remaining }) => `我軍 ${attackers} 萬進攻${toName}，攻克${toName}！殲敵 ${defenders} 萬，我軍餘 ${remaining} 萬。`,
        battleLose: ({ toName, attackers, remaining }) => `我軍 ${attackers} 萬強攻${toName}未克，全軍壯烈犧牲；敵守軍餘 ${remaining} 萬。`,
    }),
    jap: new Nation("jap", [], {
        move: ({ fromName, toName, attackers }) => `日軍 ${attackers} 萬自${fromName}移動至${toName}。`,
        battleWin: ({ toName, attackers, defenders, remaining }) => `日軍 ${attackers} 萬攻陷${toName}！我守軍 ${defenders} 萬悉數犧牲，敵軍餘 ${remaining} 萬。`,
        battleLose: ({ toName, attackers, remaining }) => `日軍 ${attackers} 萬進犯${toName}未克，我守軍力戰卻敵，敵方全軍覆沒；守軍餘 ${remaining} 萬。`,
    }, "東京"),
};
class Game {
    nations;
    provinces = new Map();
    currNation = "roc";
    turnNum = 1;
    selectedId = null;
    ended = false;
    constructor(nations) {
        this.nations = nations;
        for (const s of MAP_DATA.shapes) {
            if (s.id in DORMANT_MUNICIPALITY)
                continue; // 未啟用的院轄市不作為遊戲物件
            this.provinces.set(s.id, new Province(s.id, s.cx, s.cy, decideProvinceOwner(s.id), INITIAL_ARMIES[s.id] ?? 0));
        }
    }
    get(id) {
        const p = this.provinces.get(id);
        if (!p)
            throw new Error(`Province not found: "${id}"`);
        return p;
    }
    neighborsOf(id) {
        return (ADJACENCY[id]).filter((nid) => this.provinces.has(nid));
    }
    isSelectable(p) {
        return p.owner === this.currNation && p.army > 0 && !p.acted;
    }
    execAction(fromId, toId, troop) {
        const from = this.get(fromId);
        const to = this.get(toId);
        const attackers = Math.min(Math.max(1, Math.floor(troop)), from.army);
        if (attackers <= 0 || this.ended)
            return [];
        from.army -= attackers;
        const events = [];
        // 己方省份：兵力合流
        if (to.owner === from.owner) {
            to.army += attackers;
            to.acted = true;
            events.push(this.nations[from.owner].narrative("move", {
                fromName: from.name, toName: to.name, attackers, defenders: 0, remaining: 0
            }));
            return events;
        }
        // 敵方省份：發生戰鬥
        const defenders = to.army;
        if (attackers > defenders) {
            const remaining = attackers - defenders;
            const prevOwner = to.owner;
            to.owner = from.owner;
            to.army = remaining;
            to.acted = true;
            events.push(this.nations[from.owner].narrative("battleWin", {
                fromName: from.name, toName: to.name, attackers, defenders, remaining
            }));
            const capitalEvent = this.nations[prevOwner].handleCapital(this, toId);
            if (capitalEvent)
                events.push({ kind: "capitalFell", text: capitalEvent });
            const victoryEvent = this.checkVictory();
            if (victoryEvent)
                events.push(victoryEvent);
        }
        else {
            const remaining = defenders - attackers;
            to.army = remaining;
            events.push(this.nations[from.owner].narrative("battleLose", {
                fromName: from.name, toName: to.name, attackers, defenders, remaining
            }));
        }
        return events;
    }
    endTurn() {
        this.selectedId = null;
        this.currNation = this.currNation === "roc" ? "jap" : "roc";
        if (this.currNation === "roc")
            this.turnNum++;
        for (const p of this.provinces.values())
            p.acted = false;
        return {
            kind: "turnChange",
            text: this.currNation === "roc" ? "—— 我方行動 ——" : "—— 日軍行動 ——",
        };
    }
    checkVictory() {
        const owned = { roc: 0, jap: 0 };
        for (const p of this.provinces.values())
            owned[p.owner]++;
        let text = "";
        if (owned.jap === 0)
            text = "【抗戰勝利】我軍光復全境，日軍勢力盡逐！";
        else if (owned.roc === 0)
            text = "【全境淪陷】抗戰失敗……";
        if (!text)
            return null;
        this.ended = true;
        return { kind: "gameOver", text };
    }
}
// SVG 地圖
class MapView {
    game;
    onProvinceClick;
    els = new Map();
    dormantEls = [];
    capitalStar = new Map();
    shapeIndex = new Map();
    hintLayer;
    selectOutline;
    constructor(game, onProvinceClick) {
        this.game = game;
        this.onProvinceClick = onProvinceClick;
    }
    build(container) {
        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", `0 0 ${MAP_DATA.W} ${MAP_DATA.H}`);
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", "中華民國一九三零年代省份地圖");
        const provinceLayer = document.createElementNS(SVG_NS, "g");
        const labelLayer = document.createElementNS(SVG_NS, "g");
        this.hintLayer = document.createElementNS(SVG_NS, "g");
        const nodeLayer = document.createElementNS(SVG_NS, "g");
        svg.append(provinceLayer, labelLayer, this.hintLayer, nodeLayer);
        for (const s of MAP_DATA.shapes) {
            this.shapeIndex.set(s.id, s);
            // 未啟用的院轄市：只畫區塊融入所屬省
            if (s.id in DORMANT_MUNICIPALITY) {
                const path = document.createElementNS(SVG_NS, "path");
                path.setAttribute("d", s.d);
                path.classList.add("province", "dormant");
                provinceLayer.appendChild(path);
                this.dormantEls.push({ host: DORMANT_MUNICIPALITY[s.id], el: path });
                continue;
            }
            const p = this.game.get(s.id);
            const path = document.createElementNS(SVG_NS, "path");
            path.setAttribute("d", s.d);
            path.classList.add("province");
            if (p.isMunicipality)
                path.classList.add("municipality");
            path.addEventListener("click", () => this.onProvinceClick(p.id));
            provinceLayer.appendChild(path);
            if (p.isMunicipality) {
                this.buildCityNode(p, nodeLayer, path);
            }
            else {
                // 省名
                const label = document.createElementNS(SVG_NS, "text");
                label.classList.add("province-label");
                label.setAttribute("x", String(p.cx));
                label.setAttribute("y", String(p.cy - (p.army > 0 ? 16 : 0)));
                label.setAttribute("font-size", "14");
                label.textContent = p.name;
                labelLayer.appendChild(label);
                // 兵力徽章
                const badge = document.createElementNS(SVG_NS, "g");
                badge.classList.add("army-badge");
                const circle = document.createElementNS(SVG_NS, "circle");
                circle.setAttribute("cx", String(p.cx));
                circle.setAttribute("cy", String(p.cy + 8));
                circle.setAttribute("r", "14");
                const num = document.createElementNS(SVG_NS, "text");
                num.setAttribute("x", String(p.cx));
                num.setAttribute("y", String(p.cy + 9));
                badge.append(circle, num);
                nodeLayer.appendChild(badge);
                this.els.set(p.id, { path, label, badge, badgeText: num });
            }
        }
        // 選取金框覆蓋層
        this.selectOutline = document.createElementNS(SVG_NS, "path");
        this.selectOutline.classList.add("selection-outline");
        this.selectOutline.style.display = "none";
        provinceLayer.appendChild(this.selectOutline);
        // 各國首都星標
        for (const nation of Object.values(this.game.nations)) {
            if (!nation.capital)
                continue;
            const star = document.createElementNS(SVG_NS, "path");
            star.classList.add("capital-star");
            nodeLayer.appendChild(star);
            this.capitalStar.set(nation.id, star);
        }
        container.appendChild(svg);
    }
    // 院轄市的城市節點：放大點擊區＋選取光環＋拉線＋圓點＋外置名稱＋徽章
    buildCityNode(p, layer, path) {
        const [dx, dy] = MUNICIPALITY_LABEL_OFFSET[p.id] ?? [22, -12];
        const g = document.createElementNS(SVG_NS, "g");
        g.classList.add("city-node");
        g.addEventListener("click", () => this.onProvinceClick(p.id));
        const hit = document.createElementNS(SVG_NS, "circle");
        hit.classList.add("city-hit");
        hit.setAttribute("cx", String(p.cx + dx / 2));
        hit.setAttribute("cy", String(p.cy + dy / 2));
        hit.setAttribute("r", "24");
        const ring = document.createElementNS(SVG_NS, "circle");
        ring.classList.add("sel-ring");
        ring.setAttribute("cx", String(p.cx));
        ring.setAttribute("cy", String(p.cy));
        ring.setAttribute("r", "15");
        const leader = document.createElementNS(SVG_NS, "line");
        leader.classList.add("city-leader");
        leader.setAttribute("x1", String(p.cx));
        leader.setAttribute("y1", String(p.cy));
        leader.setAttribute("x2", String(p.cx + dx * 0.82));
        leader.setAttribute("y2", String(p.cy + dy * 0.82));
        const dot = document.createElementNS(SVG_NS, "circle");
        dot.classList.add("city-dot");
        dot.setAttribute("cx", String(p.cx));
        dot.setAttribute("cy", String(p.cy));
        dot.setAttribute("r", "4");
        const label = document.createElementNS(SVG_NS, "text");
        label.classList.add("city-label");
        label.setAttribute("x", String(p.cx + dx));
        label.setAttribute("y", String(p.cy + dy + 3.5));
        label.setAttribute("text-anchor", dx > 5 ? "start" : dx < -5 ? "end" : "middle");
        label.textContent = p.name;
        const badge = document.createElementNS(SVG_NS, "g");
        badge.classList.add("army-badge", "city-badge");
        const circle = document.createElementNS(SVG_NS, "circle");
        circle.setAttribute("cx", String(p.cx));
        circle.setAttribute("cy", String(p.cy));
        circle.setAttribute("r", "11");
        const num = document.createElementNS(SVG_NS, "text");
        num.setAttribute("x", String(p.cx));
        num.setAttribute("y", String(p.cy + 1));
        num.setAttribute("font-size", "11");
        badge.append(circle, num);
        g.append(hit, ring, leader, dot, label, badge);
        layer.appendChild(g);
        this.els.set(p.id, { path, marker: g, badge, badgeText: num });
    }
    // 同步全部 DOM 狀態
    update() {
        const game = this.game;
        const targets = new Set(game.selectedId ? game.neighborsOf(game.selectedId) : []);
        // 選取時隱藏本省與鄰省的省名，改由行動提示顯示省會
        const hideLabel = new Set(game.selectedId ? [game.selectedId, ...targets] : []);
        for (const p of game.provinces.values()) {
            const el = this.els.get(p.id);
            el.path.classList.toggle("roc", p.owner === "roc");
            el.path.classList.toggle("japan", p.owner === "jap");
            el.path.classList.toggle("selected", p.id === game.selectedId);
            el.path.classList.toggle("acted", p.acted && p.owner === game.currNation && p.army > 0);
            if (el.label)
                el.label.style.display = hideLabel.has(p.id) ? "none" : "";
            // 兵力徽章
            if (p.army > 0) {
                el.badge.style.display = "";
                el.badge.classList.toggle("roc", p.owner === "roc");
                el.badge.classList.toggle("japan", p.owner === "jap");
                el.badgeText.textContent = String(p.army);
            }
            else {
                el.badge.style.display = "none";
            }
            // 城市節點狀態
            if (el.marker) {
                el.marker.classList.toggle("roc", p.owner === "roc");
                el.marker.classList.toggle("japan", p.owner === "jap");
                el.marker.classList.toggle("selected", p.id === game.selectedId);
                el.marker.classList.toggle("targetable", targets.has(p.id));
                el.marker.classList.toggle("has-army", p.army > 0);
                el.marker.classList.remove("capital"); // 由下方首都同步重新掛上
            }
        }
        // 未啟用院轄市顏色跟隨所屬省
        for (const { el, host } of this.dormantEls) {
            const owner = game.get(host).owner;
            el.classList.toggle("roc", owner === "roc");
            el.classList.toggle("japan", owner === "jap");
        }
        // 選取金框
        if (game.selectedId) {
            this.selectOutline.setAttribute("d", this.shapeIndex.get(game.selectedId).d);
            this.selectOutline.style.display = "";
        }
        else {
            this.selectOutline.style.display = "none";
        }
        this.drawHints(targets);
        // 首都星標：標示各國現任國都，遷都時跟著移動
        for (const [nid, star] of this.capitalStar) {
            const seat = this.game.nations[nid].capital;
            if (!seat) {
                star.style.display = "none"; // 國都盡失
                continue;
            }
            const loc = this.shapeIndex.get(seat.locId);
            star.setAttribute("d", starPath(loc.cx, loc.cy, 7, 2.9));
            const entity = game.provinces.get(seat.locId);
            star.style.display = entity && entity.army > 0 ? "none" : ""; // 駐軍時徽章優先
            const marker = entity && this.els.get(entity.id)?.marker;
            if (marker)
                marker.classList.add("capital"); // 名牌轉為國都樣式
        }
        // 頂欄回合資訊
        const factionEl = document.getElementById("turn-faction");
        factionEl.textContent = game.nations[game.currNation].name;
        factionEl.className = `turn-faction ${game.currNation}`;
        document.getElementById("turn-number").textContent = String(game.turnNum);
    }
    /** 取得省會座標（院轄市以本身位置為準） */
    capitalPoint(id) {
        const c = CAPITALS[id];
        if (c)
            return { x: c.x, y: c.y, name: c.name };
        const p = this.game.get(id);
        return { x: p.cx, y: p.cy };
    }
    /** 選取部隊時，畫虛線指向各可行動省份的省會 */
    drawHints(targets) {
        this.hintLayer.innerHTML = "";
        const selectedId = this.game.selectedId;
        if (!selectedId)
            return;
        const o = this.capitalPoint(selectedId);
        // 選取省本身的省會（金色標示）
        if (o.name) {
            this.hintDot(o.x, o.y, ["capital-target", "capital-origin"]);
            this.hintText(o.x, o.y, o.name, ["capital-name", "capital-origin-name"]);
        }
        for (const nid of targets) {
            const t = this.capitalPoint(nid);
            const line = document.createElementNS(SVG_NS, "line");
            line.classList.add("move-hint");
            line.setAttribute("x1", String(o.x));
            line.setAttribute("y1", String(o.y));
            line.setAttribute("x2", String(t.x));
            line.setAttribute("y2", String(t.y));
            this.hintLayer.appendChild(line);
            this.hintDot(t.x, t.y, ["capital-target"]);
            if (t.name)
                this.hintText(t.x, t.y, t.name, ["capital-name"]);
        }
    }
    hintDot(x, y, classes) {
        const dot = document.createElementNS(SVG_NS, "circle");
        dot.classList.add(...classes);
        dot.setAttribute("cx", String(x));
        dot.setAttribute("cy", String(y));
        dot.setAttribute("r", "4.5");
        this.hintLayer.appendChild(dot);
    }
    hintText(x, y, text, classes) {
        const label = document.createElementNS(SVG_NS, "text");
        label.classList.add(...classes);
        label.setAttribute("x", String(x));
        label.setAttribute("y", String(y - 9));
        label.setAttribute("text-anchor", "middle");
        label.textContent = text;
        this.hintLayer.appendChild(label);
    }
}
/** 側邊面板：省份情報與戰報 */
class SidePanel {
    game;
    constructor(game) {
        this.game = game;
    }
    showInfo(id) {
        const p = this.game.get(id);
        const info = document.getElementById("province-info");
        const neighborNames = this.game
            .neighborsOf(id)
            .map((nid) => this.game.get(nid).name)
            .join("、");
        const status = p.army > 0 ? (p.acted ? "（本回合已行動）" : "（可行動）") : "";
        info.innerHTML = `
      <div class="info-name">${p.name}</div>
      <div>控制方：<span class="info-owner ${p.owner}">${this.game.nations[p.owner].name}</span></div>
      <div>駐軍：${p.army > 0 ? `${p.army} 萬人 ${status}` : "無"}</div>
      <div class="muted">相鄰省份：${neighborNames}</div>
    `;
    }
    log(event) {
        const list = document.getElementById("battle-log");
        const li = document.createElement("li");
        if (event.kind !== "move")
            li.classList.add(`log-${event.kind}`);
        li.innerHTML = `<span class="log-turn">第${this.game.turnNum}回合</span>${event.text}`;
        list.prepend(li);
    }
}
/** 調兵對話框（分兵） */
class MoveDialog {
    onCancel;
    onConfirm = null;
    root = document.getElementById("move-dialog");
    title = document.getElementById("move-title");
    slider = document.getElementById("move-slider");
    count = document.getElementById("move-count");
    confirmBtn = document.getElementById("move-confirm");
    constructor(onCancel) {
        this.onCancel = onCancel;
        const setVal = (v) => {
            this.slider.value = v;
            this.count.textContent = this.slider.value;
        };
        this.slider.addEventListener("input", () => setVal(this.slider.value));
        document.getElementById("move-one").addEventListener("click", () => setVal("1"));
        document.getElementById("move-half").addEventListener("click", () => setVal(String(Math.max(1, Math.floor(Number(this.slider.max) / 2)))));
        document.getElementById("move-all").addEventListener("click", () => setVal(this.slider.max));
        document.getElementById("move-cancel").addEventListener("click", () => {
            this.close();
            this.onCancel();
        });
        this.confirmBtn.addEventListener("click", () => {
            const cb = this.onConfirm;
            const n = Number(this.slider.value);
            this.close();
            if (cb)
                cb(n);
        });
    }
    open(from, to, onConfirm) {
        this.onConfirm = onConfirm;
        const isAttack = to.owner !== from.owner;
        this.title.textContent =
            `${from.name} → ${to.name}${isAttack ? `（進攻，守軍 ${to.army} 萬）` : "（調動）"}`;
        this.slider.min = "1";
        this.slider.max = String(from.army);
        this.slider.value = String(from.army);
        this.count.textContent = this.slider.value;
        this.confirmBtn.textContent = isAttack ? "進攻" : "出發";
        this.root.classList.remove("hidden");
    }
    close() {
        this.onConfirm = null;
        this.root.classList.add("hidden");
    }
}
// ---------- 控制層 ----------
class App {
    game = new Game(NATIONS);
    view = new MapView(this.game, (id) => this.handleClick(id));
    panel = new SidePanel(this.game);
    dialog = new MoveDialog(() => this.view.update());
    constructor() {
        this.view.build(document.getElementById("map-container"));
        document.getElementById("end-turn").addEventListener("click", () => {
            this.panel.log(this.game.endTurn());
            this.view.update();
        });
        this.panel.log({
            kind: "move",
            text: "民國二十六年七月，盧溝橋事變爆發，全面抗戰開始。我方先行動。",
        });
        this.view.update();
    }
    handleClick(id) {
        const game = this.game;
        if (game.ended)
            return;
        // 已有選取，且點擊目標為相鄰省份 → 分兵或直接行動
        if (game.selectedId &&
            game.selectedId !== id &&
            game.neighborsOf(game.selectedId).includes(id)) {
            const from = game.get(game.selectedId);
            const to = game.get(id);
            if (from.army === 1)
                this.performAction(from.id, to.id, 1);
            else
                this.dialog.open(from, to, (n) => this.performAction(from.id, to.id, n));
            return;
        }
        // 選取／取消選取
        const clicked = game.get(id);
        game.selectedId =
            game.isSelectable(clicked) && game.selectedId !== id ? id : null;
        this.view.update();
        this.panel.showInfo(id);
    }
    performAction(fromId, toId, count) {
        for (const e of this.game.execAction(fromId, toId, count))
            this.panel.log(e);
        if (this.game.ended) {
            document.getElementById("end-turn").disabled = true;
        }
        this.game.selectedId = null;
        this.view.update();
        this.panel.showInfo(toId);
    }
}
new App();
