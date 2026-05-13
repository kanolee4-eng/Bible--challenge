import { useState, useEffect } from "react";

const MEMBERS = [
  { id: "김동민", title: "목사님" },
  { id: "임정옥", title: "목사님" },
  { id: "정수환", title: "목사님" },
  { id: "이은혜", title: "사모님" },
  { id: "권전행", title: "사무장님" },
  { id: "정민화", title: "집사님" },
  { id: "이은미", title: "집사" },
  { id: "정다훈", title: "학생" },
  { id: "정시아", title: "학생" },
];

const INITIAL_DATA = {
  "2026-04-30": { normal: ["이은미", "김동민", "임정옥", "이은혜", "정다훈"], diamond: [] },
  "2026-05-01": { normal: ["정다훈", "권전행", "이은미", "임정옥", "김동민", "이은혜", "정수환"], diamond: [] },
  "2026-05-02": { normal: ["임정옥", "이은혜", "정다훈", "정수환", "김동민"], diamond: [] },
  "2026-05-03": { normal: ["김동민", "임정옥", "이은미", "정다훈"], diamond: [] },
  "2026-05-04": { normal: ["권전행", "정민화", "정시아", "정다훈", "이은혜", "이은미"], diamond: [] },
};
const BONUS = 500; // 15장 상금

const START_DATE = "2026-04-30";
const FINE = 500;
const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function getToday() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

function getDates() {
  const dates = [];
  let cur = new Date(START_DATE + "T00:00:00+09:00");
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayStr = kst.toISOString().split("T")[0];
  while (true) {
    const kstCur = new Date(cur.getTime() + 9 * 60 * 60 * 1000);
    const curStr = kstCur.toISOString().split("T")[0];
    if (curStr > todayStr) break;
    dates.push(curStr);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function getWeeks(dates) {
  if (!dates.length) return [];
  const weeks = [];
  let week = [];
  dates.forEach(d => {
    const day = new Date(d).getDay();
    if (day === 0 && week.length > 0) {
      weeks.push(week);
      week = [];
    }
    week.push(d);
  });
  if (week.length > 0) weeks.push(week);
  return weeks;
}

export default function App() {
  const [records, setRecords] = useState(() => {
    try {
      const s = localStorage.getItem("br2");
      return s ? JSON.parse(s) : INITIAL_DATA;
    } catch {
      return INITIAL_DATA;
    }
  });
  const [paidAmount, setPaidAmount] = useState(() => {
    try {
      const s = localStorage.getItem("br2_paidAmount");
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  });
  const [tab, setTab] = useState("check");
  const [selDate, setSelDate] = useState(getToday());
  const [weekIdx, setWeekIdx] = useState(null);
  const [toast, setToast] = useState(false);
  const [editingPay, setEditingPay] = useState(null); // 현재 입금액 입력 중인 멤버
  const [tempAmount, setTempAmount] = useState("");

  const allDates = getDates();
  const weeks = getWeeks(allDates);
  const effectiveWeekIdx = weekIdx === null ? weeks.length - 1 : weekIdx;
  const curWeek = weeks[effectiveWeekIdx] || [];
  const isLatestWeek = effectiveWeekIdx === weeks.length - 1;

  useEffect(() => {
    try { localStorage.setItem("br2", JSON.stringify(records)); } catch {}
  }, [records]);

  useEffect(() => {
    try { localStorage.setItem("br2_paidAmount", JSON.stringify(paidAmount)); } catch {}
  }, [paidAmount]);

  const updatePaidAmount = (memberId, value) => {
    const num = parseInt(value.replace(/[^0-9]/g, "")) || 0;
    setPaidAmount(prev => ({ ...prev, [memberId]: num }));
  };

  // date의 normal/diamond 읽은 사람 목록
  const getDay = (date) => records[date] || { normal: [], diamond: [] };
  const readers = (date) => {
    const d = getDay(date);
    return [...(d.normal || []), ...(d.diamond || [])];
  };
  const isDiamond = (date, id) => (getDay(date).diamond || []).includes(id);

  // type: "normal" | "diamond"
  const toggle = (date, id, type) => {
    setRecords(prev => {
      const day = prev[date] || { normal: [], diamond: [] };
      const normal = day.normal || [];
      const diamond = day.diamond || [];
      if (type === "normal") {
        // normal 토글: diamond에서도 제거
        const hasNormal = normal.includes(id);
        return { ...prev, [date]: {
          normal: hasNormal ? normal.filter(x => x !== id) : [...normal, id],
          diamond: diamond.filter(x => x !== id),
        }};
      } else {
        // diamond 토글: normal에서도 제거
        const hasDiamond = diamond.includes(id);
        return { ...prev, [date]: {
          normal: normal.filter(x => x !== id),
          diamond: hasDiamond ? diamond.filter(x => x !== id) : [...diamond, id],
        }};
      }
    });
    setToast(true);
    setTimeout(() => setToast(false), 1500);
  };

  const today = getToday();

  const totalFine = MEMBERS.reduce((acc, m) => {
    return acc + allDates.filter(d => !readers(d).includes(m.id)).length * FINE;
  }, 0);

  const weekMemberStats = MEMBERS.map(m => {
    const read = curWeek.filter(d => readers(d).includes(m.id)).length;
    const missed = curWeek.length - read;
    return { ...m, read, missed, fine: missed * FINE };
  });

  const weekTotalFine = weekMemberStats.reduce((a, s) => a + s.fine, 0);

  // 가장 최신 주의 개인누적기부금 합계 (표에 보이는 금액들의 합)
  const latestWeekIdx = weeks.length - 1;
  const latestWeek = weeks[latestWeekIdx] || [];

  const latestWeekLabel = latestWeek.length
    ? (() => {
        const f = new Date(latestWeek[0]);
        const l = new Date(latestWeek[latestWeek.length - 1]);
        return `${f.getMonth()+1}/${f.getDate()} ~ ${l.getMonth()+1}/${l.getDate()}`;
      })()
    : "";

  // 처음부터 어제까지 누적 기부금 (개인별) - 오늘은 진행중이므로 제외
  const allMemberFines = MEMBERS.reduce((acc, m) => {
    const missed = allDates.filter(d => d !== today && !readers(d).includes(m.id)).length;
    acc[m.id] = missed * FINE;
    return acc;
  }, {});

  // 15장 상금 (개인별) - 오늘 제외
  const allMemberBonus = MEMBERS.reduce((acc, m) => {
    const diamondDays = allDates.filter(d => d !== today && isDiamond(d, m.id)).length;
    acc[m.id] = diamondDays * BONUS;
    return acc;
  }, {});

  // 미납 잔액 (기부금 - 상금 - 입금액)
  const remainFine = (memberId) => {
    const fine = allMemberFines[memberId] || 0;
    const bonus = allMemberBonus[memberId] || 0;
    const paid = paidAmount[memberId] || 0;
    return Math.max(0, fine - bonus - paid);
  };

  const latestWeekTotalFine = MEMBERS.reduce((acc, m) => acc + remainFine(m.id), 0);

  const weekLabel = curWeek.length
    ? (() => {
        const f = new Date(curWeek[0]);
        const l = new Date(curWeek[curWeek.length - 1]);
        return `${f.getMonth()+1}/${f.getDate()} ~ ${l.getMonth()+1}/${l.getDate()}`;
      })()
    : "";

  const C = {
    bg: "#f2f2f7",
    card: "#ffffff",
    text: "#1c1c1e",
    sub: "#8e8e93",
    green: "#34c759",
    red: "#ff3b30",
    border: "#e5e5ea",
    tabActive: "#1c1c1e",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Noto Sans KR', sans-serif", color: C.text, maxWidth: "480px", margin: "0 auto" }}>

      {/* ── 헤더 ── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "18px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
          <span style={{ fontSize: "18px" }}>✝️</span>
          <span style={{ fontSize: "17px", fontWeight: "800" }}>성경 읽기 챌린지</span>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: "12px", color: C.sub }}>
          매일 5장 이상 · 참여인원 {MEMBERS.length}명 · 미완료 시 500원
        </p>
        <div style={{ display: "flex" }}>
          {[["check", "출석 체크"], ["stats", "통계 현황"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: "10px 0", border: "none", background: "none", cursor: "pointer",
              fontSize: "14px", fontWeight: "700", fontFamily: "'Noto Sans KR', sans-serif",
              color: tab === key ? C.tabActive : C.sub,
              borderBottom: `2px solid ${tab === key ? C.tabActive : "transparent"}`,
              transition: "all 0.15s",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── 출석 체크 탭 ── */}
      {tab === "check" && (
        <div style={{ padding: "14px 14px" }}>

          {/* 날짜 카드 */}
          <div style={{
            background: C.card, borderRadius: "14px", padding: "14px 16px",
            marginBottom: "12px", border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: "20px", fontWeight: "800" }}>
                {(() => { const dt = new Date(selDate); return `${dt.getMonth()+1}/${dt.getDate()} (${DAY_KO[dt.getDay()]})`; })()}
              </div>
              <div style={{ fontSize: "12px", color: C.sub, marginTop: "3px" }}>
                ✅ {(getDay(selDate).normal||[]).length}명 &nbsp;·&nbsp;
                💎 {(getDay(selDate).diamond||[]).length}명 &nbsp;/&nbsp;
                미완료 {MEMBERS.length - readers(selDate).length}명
              </div>
            </div>
            <input type="date" value={selDate} min={START_DATE} max={getToday()}
              onChange={e => setSelDate(e.target.value)}
              style={{
                border: `1px solid ${C.border}`, borderRadius: "8px", padding: "6px 10px",
                fontSize: "13px", color: C.text, background: C.bg,
                fontFamily: "'Noto Sans KR', sans-serif", outline: "none",
              }}
            />
          </div>

          {/* 멤버 목록 */}
          <div style={{ background: C.card, borderRadius: "14px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {MEMBERS.map((m, i) => {
              const done = readers(selDate).includes(m.id);
              const diamond = isDiamond(selDate, m.id);
              const normal = done && !diamond;
              return (
                <div key={m.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 16px",
                  borderBottom: i < MEMBERS.length - 1 ? `1px solid ${C.border}` : "none",
                  background: diamond ? "#fffbea" : normal ? "#f0fbf4" : C.card,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "18px" }}>{diamond ? "💎" : normal ? "📖" : "📕"}</span>
                    <div>
                      <span style={{ fontSize: "15px", fontWeight: "700" }}>{m.id}</span>
                      <span style={{ fontSize: "12px", color: C.sub, marginLeft: "5px" }}>{m.title}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => toggle(selDate, m.id, "normal")} style={{
                      fontSize: "12px", fontWeight: "700", padding: "5px 10px",
                      borderRadius: "16px", border: "none", cursor: "pointer",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      background: normal ? C.green : "#f2f2f7",
                      color: normal ? "#fff" : C.sub,
                    }}>5장✅</button>
                    <button onClick={() => toggle(selDate, m.id, "diamond")} style={{
                      fontSize: "12px", fontWeight: "700", padding: "5px 10px",
                      borderRadius: "16px", border: "none", cursor: "pointer",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      background: diamond ? "#f6c90e" : "#f2f2f7",
                      color: diamond ? "#fff" : C.sub,
                    }}>15장💎</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 기부금 정산 */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: C.sub, marginBottom: "8px", paddingLeft: "2px" }}>
              💰 기부금 정산
            </div>
            <div style={{ background: C.card, borderRadius: "14px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
              {MEMBERS.filter(m => allMemberFines[m.id] > 0).map((m, i, arr) => {
                const paid = paidAmount[m.id] || 0;
                const remain = remainFine(m.id);
                const isEditing = editingPay === m.id;
                return (
                  <div key={m.id} style={{
                    padding: "12px 16px",
                    borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                    background: remain === 0 ? "#f0fbf4" : C.card,
                  }}>
                    {/* 이름 + 금액 요약 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "14px", fontWeight: "700" }}>{m.id}</span>
                        <span style={{ fontSize: "11px", color: C.sub, marginLeft: "5px" }}>{m.title}</span>
                        <div style={{ fontSize: "11px", color: C.sub, marginTop: "2px" }}>
                          미납 {allMemberFines[m.id].toLocaleString()}원
                          {paid > 0 && <span style={{ color: C.green }}> · 입금 {paid.toLocaleString()}원</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "800", color: remain === 0 ? C.green : C.red }}>
                          잔액 {remain.toLocaleString()}원
                        </div>
                        <button onClick={() => { setEditingPay(isEditing ? null : m.id); setTempAmount(paid > 0 ? String(paid) : ""); }}
                          style={{
                            fontSize: "12px", fontWeight: "700", padding: "5px 10px",
                            borderRadius: "16px", border: "none", cursor: "pointer",
                            fontFamily: "'Noto Sans KR', sans-serif",
                            background: isEditing ? "#f2f2f7" : "#e3f9eb",
                            color: isEditing ? C.sub : C.green,
                          }}>
                          {isEditing ? "닫기" : "입금"}
                        </button>
                      </div>
                    </div>
                    {/* 입금액 입력 (펼쳐짐) */}
                    {isEditing && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                        <div style={{ fontSize: "12px", color: C.sub, whiteSpace: "nowrap" }}>입금액</div>
                        <input
                          type="number"
                          value={tempAmount}
                          onChange={e => setTempAmount(e.target.value)}
                          placeholder="0"
                          autoFocus
                          style={{
                            flex: 1, padding: "7px 10px", borderRadius: "8px",
                            border: `1px solid ${C.green}`, fontSize: "14px",
                            fontWeight: "700", color: C.text, background: "#fff",
                            fontFamily: "'Noto Sans KR', sans-serif", outline: "none",
                            textAlign: "right",
                          }}
                        />
                        <div style={{ fontSize: "12px", color: C.sub }}>원</div>
                        <button onClick={() => { updatePaidAmount(m.id, tempAmount); setEditingPay(null); setTempAmount(""); }}
                          style={{
                            fontSize: "13px", fontWeight: "700", padding: "7px 14px",
                            borderRadius: "16px", border: "none", cursor: "pointer",
                            fontFamily: "'Noto Sans KR', sans-serif",
                            background: C.green, color: "#fff",
                          }}>확인</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {MEMBERS.filter(m => allMemberFines[m.id] > 0).length === 0 && (
                <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: C.sub }}>
                  정산할 기부금이 없어요 🎉
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 통계 현황 탭 ── */}
      {tab === "stats" && (
        <div style={{ padding: "14px" }}>

          {/* 기부금 요약 - 최신 주 개인누적기부금 합계 */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{
              background: C.card, borderRadius: "12px", padding: "16px",
              border: `1px solid ${C.border}`, textAlign: "center",
            }}>
              <div style={{ fontSize: "12px", color: C.sub, marginBottom: "6px" }}>기부금 총 합계</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: latestWeekTotalFine > 0 ? C.red : C.green }}>
                {latestWeekTotalFine.toLocaleString()}원
              </div>

            </div>
          </div>

          {/* 주차 네비 */}
          <div style={{
            background: C.card, borderRadius: "14px", padding: "12px 16px",
            border: `1px solid ${C.border}`, marginBottom: "12px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <button
              onClick={() => setWeekIdx(Math.max(0, effectiveWeekIdx - 1))}
              disabled={effectiveWeekIdx <= 0}
              style={{
                background: "none", border: "none", fontSize: "24px", cursor: "pointer",
                color: effectiveWeekIdx <= 0 ? "#d1d1d6" : C.text, padding: "0 4px", lineHeight: 1,
              }}>‹</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: "800" }}>
                {isLatestWeek ? "이번 주" : `${effectiveWeekIdx + 1}주차`}
              </div>
              <div style={{ fontSize: "12px", color: C.sub, marginTop: "2px" }}>
                {weekLabel} · {curWeek.length}일
              </div>
            </div>
            <button
              onClick={() => setWeekIdx(Math.min(weeks.length - 1, effectiveWeekIdx + 1))}
              disabled={isLatestWeek}
              style={{
                background: "none", border: "none", fontSize: "24px", cursor: "pointer",
                color: isLatestWeek ? "#d1d1d6" : C.text, padding: "0 4px", lineHeight: 1,
              }}>›</button>
          </div>

          {/* 주간 표 */}
          <div style={{
            background: C.card, borderRadius: "14px", border: `1px solid ${C.border}`,
            overflow: "hidden", marginBottom: "12px",
          }}>
            {/* 헤더 */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `90px repeat(${curWeek.length}, 1fr) 80px`,
              background: "#f9f9f9", borderBottom: `1px solid ${C.border}`,
              padding: "8px 0",
            }}>
              <div style={{ paddingLeft: "14px", fontSize: "11px", color: C.sub, fontWeight: "700", display: "flex", alignItems: "center" }}>이름</div>
              {curWeek.map(d => {
                const dt = new Date(d);
                return (
                  <div key={d} style={{ textAlign: "center", lineHeight: "1.3" }}>
                    <div style={{ fontSize: "11px", color: C.sub, fontWeight: "700" }}>{dt.getMonth()+1}/{dt.getDate()}</div>
                    <div style={{ fontSize: "10px", color: C.sub }}>({DAY_KO[dt.getDay()]})</div>
                  </div>
                );
              })}
              <div style={{ paddingRight: "14px", fontSize: "10px", color: C.sub, fontWeight: "700", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "flex-end", lineHeight: "1.3" }}>개인누적<br/>기부금</div>
            </div>

            {/* 각 멤버 행 */}
            {MEMBERS.map((m, mi) => {
              const stat = weekMemberStats.find(s => s.id === m.id);
              return (
                <div key={m.id} style={{
                  display: "grid",
                  gridTemplateColumns: `90px repeat(${curWeek.length}, 1fr) 80px`,
                  borderBottom: mi < MEMBERS.length - 1 ? `1px solid ${C.border}` : "none",
                  padding: "9px 0",
                  alignItems: "center",
                }}>
                  <div style={{ paddingLeft: "14px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "700" }}>{m.id}</div>
                    <div style={{ fontSize: "10px", color: C.sub }}>{m.title}</div>
                  </div>
                  {curWeek.map(d => {
                    const isToday = d === getToday();
                    const done = readers(d).includes(m.id);
                    const diam = isDiamond(d, m.id);
                    return (
                      <div key={d} style={{ textAlign: "center", fontSize: isToday && !done ? "10px" : "15px", fontWeight: "700", color: isToday && !done ? "#8e8e93" : "inherit" }}>
                        {isToday && !done ? "진행중" : diam ? "💎" : done ? "✅" : "❌"}
                      </div>
                    );
                  })}
                  <div style={{ paddingRight: "8px", textAlign: "right" }}>
                    {allMemberBonus[m.id] > 0 && (
                      <div style={{ fontSize: "10px", color: C.sub, lineHeight: "1.3" }}>
                        <span style={{ color: C.red }}>{allMemberFines[m.id].toLocaleString()}</span>
                        <span> - </span>
                        <span style={{ color: "#f6c90e" }}>💎{allMemberBonus[m.id].toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ fontSize: "12px", fontWeight: "800", color: remainFine(m.id) === 0 ? C.green : C.red }}>
                      {remainFine(m.id) === 0 ? "없음" : `${remainFine(m.id).toLocaleString()}원`}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 하단: 미완료 인원 집계 */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `90px repeat(${curWeek.length}, 1fr) 80px`,
              background: "#f9f9f9", borderTop: `1px solid ${C.border}`,
              padding: "8px 0", alignItems: "center",
            }}>
              <div style={{ paddingLeft: "14px", fontSize: "11px", color: C.sub, fontWeight: "700" }}>미완료</div>
              {curWeek.map(d => {
                const cnt = MEMBERS.filter(m => !readers(d).includes(m.id)).length;
                return (
                  <div key={d} style={{ textAlign: "center", fontSize: "12px", fontWeight: "700", color: cnt > 0 ? C.red : "#d1d1d6" }}>
                    {cnt > 0 ? `${cnt}명` : "-"}
                  </div>
                );
              })}
              <div />
            </div>
          </div>

        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "28px", left: "50%", transform: "translateX(-50%)",
          background: "#1c1c1e", color: "#fff", padding: "10px 22px",
          borderRadius: "99px", fontSize: "13px", fontWeight: "600",
          fontFamily: "'Noto Sans KR', sans-serif", zIndex: 999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          whiteSpace: "nowrap",
        }}>저장됐어요 ✅</div>
      )}
    </div>
  );
}
