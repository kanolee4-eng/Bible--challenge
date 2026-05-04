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
  "2026-04-30": ["이은미", "김동민", "임정옥", "이은혜", "정다훈"],
  "2026-05-01": ["정다훈", "권전행", "이은미", "임정옥", "김동민", "이은혜", "정수환"],
  "2026-05-02": ["임정옥", "이은혜", "정다훈", "정수환", "김동민"],
  "2026-05-03": ["김동민", "임정옥", "이은미", "정다훈"],
  "2026-05-04": ["권전행", "정민화", "정시아", "정다훈", "이은혜", "이은미"],
};

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
  const [tab, setTab] = useState("check");
  const [selDate, setSelDate] = useState(getToday());
  const [weekIdx, setWeekIdx] = useState(null);
  const [toast, setToast] = useState(false);

  const allDates = getDates();
  const weeks = getWeeks(allDates);
  const effectiveWeekIdx = weekIdx === null ? weeks.length - 1 : weekIdx;
  const curWeek = weeks[effectiveWeekIdx] || [];
  const isLatestWeek = effectiveWeekIdx === weeks.length - 1;

  useEffect(() => {
    try { localStorage.setItem("br2", JSON.stringify(records)); } catch {}
  }, [records]);

  const readers = (date) => records[date] || [];

  const toggle = (date, id) => {
    setRecords(prev => {
      const cur = prev[date] || [];
      return { ...prev, [date]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
    });
    setToast(true);
    setTimeout(() => setToast(false), 1500);
  };

  const totalFine = MEMBERS.reduce((acc, m) => {
    return acc + allDates.filter(d => !readers(d).includes(m.id)).length * FINE;
  }, 0);

  const weekMemberStats = MEMBERS.map(m => {
    const read = curWeek.filter(d => readers(d).includes(m.id)).length;
    const missed = curWeek.length - read;
    return { ...m, read, missed, fine: missed * FINE };
  });

  const weekTotalFine = weekMemberStats.reduce((a, s) => a + s.fine, 0);

  // 처음부터 현재까지 누적 기부금 (개인별)
  const allMemberFines = MEMBERS.reduce((acc, m) => {
    const missed = allDates.filter(d => !readers(d).includes(m.id)).length;
    acc[m.id] = missed * FINE;
    return acc;
  }, {});

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
                완료 {readers(selDate).length}명 &nbsp;/&nbsp; 미완료 {MEMBERS.length - readers(selDate).length}명
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
              return (
                <div key={m.id} onClick={() => toggle(selDate, m.id)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "13px 16px",
                    borderBottom: i < MEMBERS.length - 1 ? `1px solid ${C.border}` : "none",
                    cursor: "pointer", background: done ? "#f0fbf4" : C.card,
                    transition: "background 0.15s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "18px" }}>{done ? "📖" : "📕"}</span>
                    <div>
                      <span style={{ fontSize: "15px", fontWeight: "700" }}>{m.id}</span>
                      <span style={{ fontSize: "12px", color: C.sub, marginLeft: "5px" }}>{m.title}</span>
                    </div>
                  </div>
                  <div style={{
                    fontSize: "13px", fontWeight: "700",
                    color: done ? C.green : C.sub,
                    background: done ? "#e3f9eb" : "#f2f2f7",
                    padding: "5px 12px", borderRadius: "20px",
                  }}>
                    {done ? "완료" : "미완료"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 통계 현황 탭 ── */}
      {tab === "stats" && (
        <div style={{ padding: "14px" }}>

          {/* 기부금 요약 */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            {[
              { label: "이번 주 기부금", value: weekTotalFine },
              { label: "누적 기부금", value: totalFine },
            ].map(item => (
              <div key={item.label} style={{
                flex: 1, background: C.card, borderRadius: "12px", padding: "14px",
                border: `1px solid ${C.border}`, textAlign: "center",
              }}>
                <div style={{ fontSize: "11px", color: C.sub, marginBottom: "5px" }}>{item.label}</div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: item.value > 0 ? C.red : C.green }}>
                  {item.value.toLocaleString()}원
                </div>
              </div>
            ))}
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
              gridTemplateColumns: `90px repeat(${curWeek.length}, 1fr) 58px`,
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
              <div style={{ paddingRight: "14px", fontSize: "11px", color: C.sub, fontWeight: "700", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>개인누적
기부금</div>
            </div>

            {/* 각 멤버 행 */}
            {MEMBERS.map((m, mi) => {
              const stat = weekMemberStats.find(s => s.id === m.id);
              return (
                <div key={m.id} style={{
                  display: "grid",
                  gridTemplateColumns: `90px repeat(${curWeek.length}, 1fr) 58px`,
                  borderBottom: mi < MEMBERS.length - 1 ? `1px solid ${C.border}` : "none",
                  padding: "9px 0",
                  alignItems: "center",
                }}>
                  <div style={{ paddingLeft: "14px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "700" }}>{m.id}</div>
                    <div style={{ fontSize: "10px", color: C.sub }}>{m.title}</div>
                  </div>
                  {curWeek.map(d => (
                    <div key={d} style={{ textAlign: "center", fontSize: "15px" }}>
                      {readers(d).includes(m.id) ? "✅" : "❌"}
                    </div>
                  ))}
                  <div style={{
                    paddingRight: "14px", textAlign: "right",
                    fontSize: "12px", fontWeight: "700",
                    color: allMemberFines[m.id] > 0 ? C.red : C.green,
                  }}>
                    {allMemberFines[m.id] > 0 ? `${allMemberFines[m.id].toLocaleString()}원` : "없음"}
                  </div>
                </div>
              );
            })}

            {/* 하단: 미완료 인원 집계 */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `90px repeat(${curWeek.length}, 1fr) 58px`,
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
