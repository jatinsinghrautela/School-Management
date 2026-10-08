import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Orbit,
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck,
  GraduationCap,
  BookOpen,
  Megaphone,
  ChevronRight,
  ArrowUpRight,
  LogOut,
  Search,
  Plus,
  X,
  ShieldCheck,
  Sparkles,
  Menu,
  Check,
  FileText,
  Activity,
} from "lucide-react";
import "./styles.css";
const icons = {
  Overview: LayoutDashboard,
  Schools: Building2,
  People: Users,
  Attendance: CalendarCheck,
  Results: GraduationCap,
  Learning: BookOpen,
  Notices: Megaphone,
};
const today = () => new Date().toLocaleDateString("en-CA");
function App() {
  const [token, setToken] = useState(
      sessionStorage.getItem("orbit-token") || "",
    ),
    [user, setUser] = useState(null),
    [mode, setMode] = useState(""),
    [schools, setSchools] = useState([]),
    [sid, setSid] = useState(""),
    [data, setData] = useState(null),
    [platform, setPlatform] = useState(null),
    [page, setPage] = useState("Overview"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [modal, setModal] = useState(null),
    [query, setQuery] = useState(""),
    [mobile, setMobile] = useState(false),
    [message, setMessage] = useState("");
  const refreshVersion = useRef(0);
  const [narrow, setNarrow] = useState(window.innerWidth <= 800);
  useEffect(() => {
    const resize = () => setNarrow(window.innerWidth <= 800);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  async function api(path, body) {
    const multipart = body instanceof FormData;
    const response = await fetch("/api" + path, {
      method: body ? "POST" : "GET",
      headers: {
        ...(!multipart ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401 && token) {
        sessionStorage.removeItem("orbit-token");
        setToken("");
        setUser(null);
      }
      throw new Error(result.error || "Request failed");
    }
    return result;
  }
  async function download(resource) {
    try {
      const response = await fetch(
        `/api/schools/${sid}/files/${resource.fileId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error("Unable to download this resource");
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = resource.fileName || "resource";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    }
  }
  async function refresh() {
    setError("");
    setLoading(true);
    const version = ++refreshVersion.current;
    try {
      if (user?.role === "owner") {
        const result = await api("/platform");
        if (version === refreshVersion.current) setPlatform(result);
      } else if (sid) {
        const result = await api(`/schools/${sid}/workspace`);
        if (version === refreshVersion.current) setData(result);
      }
    } catch (e) {
      if (version === refreshVersion.current) setError(e.message);
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!token) return;
    let active = true;
    api("/me")
      .then((r) => {
        if (active) {
          setUser(r.user);
          setSchools(r.schools);
          setMode(r.mode);
          setSid(r.schools[0]?.id || "");
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [token]);
  useEffect(() => {
    setData(null);
    if (user) refresh();
  }, [user, sid]);
  const owner = user?.role === "owner",
    manager = ["director", "admin", "principal"].includes(user?.role),
    teacher = user?.role === "teacher",
    editor = manager || teacher;
  const nav = owner
    ? ["Overview", "Schools", "People"]
    : ["Overview", "People", "Attendance", "Results", "Learning", "Notices"];
  const school = schools.find((s) => s.id === sid),
    students = data?.users.filter((u) => u.role === "student") || [],
    classes = data?.classes || [];
  async function save(path, body) {
    try {
      setLoading(true);
      setError("");
      await api(path, body);
      setModal(null);
      setMessage("Saved successfully");
      await refresh();
      if (owner) {
        const me = await api("/me");
        setSchools(me.schools);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  function open(type) {
    setError("");
    setModal(type);
  }
  function filtered(rows) {
    return (rows || []).filter((r) =>
      JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
    );
  }
  async function logout() {
    try {
      await api("/auth/logout", {});
    } catch (e) {
      setError(e.message);
    } finally {
      refreshVersion.current++;
      sessionStorage.removeItem("orbit-token");
      setToken("");
      setUser(null);
      setSchools([]);
      setSid("");
      setPage("Overview");
      setData(null);
      setPlatform(null);
    }
  }
  if (!user)
    return (
      <Login
        api={api}
        onLogin={(r) => {
          sessionStorage.setItem("orbit-token", r.token);
          setToken(r.token);
          setUser(r.user);
          setMode(r.mode);
        }}
        error={error}
      />
    );
  const notices = data?.notices || [],
    resources = data?.resources || [],
    marks = data?.marks || [],
    attendance = data?.attendance || [];
  const percent = attendance.length
    ? Math.round(
        (100 *
          attendance.filter((a) => ["present", "late"].includes(a.status))
            .length) /
          attendance.length,
      )
    : null;
  return (
    <div className="shell">
      {mobile && narrow && (
        <button
          className="drawer-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        inert={narrow && !mobile}
        className={mobile ? "sidebar expanded" : "sidebar"}
      >
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("Overview");
          }}
        >
          <span className="brand-icon">
            <Orbit size={25} />
          </span>
          orbit<span className="brand-dot">.</span>
        </a>
        <div className="workspace-tag">
          {owner ? "PLATFORM CONSOLE" : "SCHOOL WORKSPACE"}
        </div>
        <div className="school-badge">
          <span className="school-icon">
            {owner ? <ShieldCheck size={20} /> : <Building2 size={20} />}
          </span>
          <div>
            <strong>
              {owner ? "Mission control" : school?.name || "Your school"}
            </strong>
            <small>
              {owner
                ? "Platform administration"
                : school?.city || "No assigned schools"}
            </small>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {nav.map((n) => {
            const Icon = icons[n];
            return (
              <button
                key={n}
                className={page === n ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setPage(n);
                  setQuery("");
                  setMobile(false);
                }}
              >
                <Icon size={19} />
                {n}
                {page === n && <span className="active-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="connected">
            <span />
            All systems connected
            <small>One campus. Endless possibilities.</small>
          </div>
          <div className="profile">
            <span className="avatar">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Toggle menu"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={14} /> <b>{page}</b>
            </span>
          </div>
          <div className="top-actions">
            {mode === "demo" && (
              <span className="demo-pill">DEMO · ephemeral data</span>
            )}
            {!owner && (
              <select
                aria-label="Choose school"
                value={sid}
                onChange={(e) => setSid(e.target.value)}
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <span className="date-label">
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {owner
                  ? "YOUR EDUCATION NETWORK"
                  : school?.name?.toUpperCase() || "YOUR CAMPUS"}
              </div>
              <h1>
                {page === "Overview"
                  ? `Good ${new Date().getHours() < 12 ? "morning" : "day"}, ${user.name.split(" ")[0]}`
                  : page}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {page === "Overview"
                  ? "A little clarity. A lot of possibility. Here’s your campus at a glance."
                  : {
                      Schools:
                        "Every school in your network, connected in one place.",
                      People: "The people who make your campus extraordinary.",
                      Attendance:
                        "Every student counts. Keep track of every day.",
                      Results: "Turn progress into possibilities.",
                      Learning:
                        "A home for homework, resources, and new ideas.",
                      Notices: "Keep your community in the loop.",
                    }[page]}
              </p>
            </div>
            {page === "Schools" && (
              <button className="primary" onClick={() => open("school")}>
                <Plus size={17} />
                Add school
              </button>
            )}
            {page === "People" && (owner || manager) && (
              <button className="primary" onClick={() => open("user")}>
                <Plus size={17} />
                Add person
              </button>
            )}
            {page === "Attendance" && editor && (
              <button className="primary" onClick={() => open("attendance")}>
                <Plus size={17} />
                Record attendance
              </button>
            )}
            {page === "Results" && editor && (
              <button className="primary" onClick={() => open("marks")}>
                <Plus size={17} />
                Enter marks
              </button>
            )}
            {page === "Learning" && editor && (
              <button className="primary" onClick={() => open("resource")}>
                <Plus size={17} />
                Add resource
              </button>
            )}
            {page === "Notices" && manager && (
              <button className="primary" onClick={() => open("notice")}>
                <Plus size={17} />
                Publish notice
              </button>
            )}
          </div>
          {error && (
            <div role="alert" className="alert">
              {error}
            </div>
          )}
          {message && (
            <div
              role="status"
              className="success"
              onClick={() => setMessage("")}
            >
              <Check size={16} />
              {message}
              <X size={14} />
            </div>
          )}
          {loading && (
            <div className="loading" role="status">
              Syncing your workspace…
            </div>
          )}
          {page === "Overview" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-pill">
                    <Sparkles size={13} /> A MORE CONNECTED CAMPUS
                  </span>
                  <h2>
                    {owner ? (
                      <>
                        Big ideas.
                        <br />
                        One connected network.
                      </>
                    ) : (
                      <>
                        Great days start
                        <br />
                        with a clear view.
                      </>
                    )}
                  </h2>
                  <p>
                    {owner
                      ? "Give every school the space to thrive. Your entire education network starts here."
                      : "Your people, progress, and plans. Together in a workspace built for what comes next."}
                  </p>
                  <button
                    onClick={() => setPage(owner ? "Schools" : "Learning")}
                  >
                    {owner ? "Explore your schools" : "Explore learning hub"}
                    <ArrowUpRight size={17} />
                  </button>
                </div>
                <div className="orbital-art" aria-hidden="true">
                  <div className="ring ring-one" />
                  <div className="ring ring-two" />
                  <div className="ring ring-three" />
                  <div className="planet">
                    <Orbit size={68} />
                  </div>
                  <span className="star star-one">✦</span>
                  <span className="star star-two">✦</span>
                  <div className="floating-chip chip-one">
                    <GraduationCap size={20} />
                    <span>Built for bright futures</span>
                  </div>
                  <div className="floating-chip chip-two">
                    <span className="green-dot" />
                    Your world, connected
                  </div>
                </div>
                <div className="hero-number">01 / WORKSPACE</div>
              </section>
              <div className="stats">
                {(owner
                  ? [
                      [
                        Building2,
                        "Schools onboarded",
                        platform?.schools.length || 0,
                        "Across your network",
                      ],
                      [
                        Users,
                        "People connected",
                        platform?.users.length || 0,
                        "All platform accounts",
                      ],
                      [
                        Orbit,
                        "Organizations",
                        platform?.organizations.length || 0,
                        "Growing together",
                      ],
                      [
                        Activity,
                        "Recorded actions",
                        platform?.audit.length || 0,
                        "Latest audit window",
                      ],
                    ]
                  : [
                      [
                        Users,
                        user.role === "student" ? "My classes" : "Students",
                        user.role === "student"
                          ? classes.length
                          : students.length,
                        "In your accessible workspace",
                      ],
                      [
                        CalendarCheck,
                        "Attendance",
                        percent === null ? "—" : percent + "%",
                        "Present + late / recorded entries",
                      ],
                      [
                        BookOpen,
                        "Learning resources",
                        resources.length,
                        "Ready to explore",
                      ],
                      [
                        Megaphone,
                        "Campus notices",
                        notices.length,
                        "Stay in the loop",
                      ],
                    ]
                ).map(([Icon, label, value, note], i) => (
                  <div className="stat-card" key={label}>
                    <div className={"stat-icon tint-" + i}>
                      <Icon size={19} />
                    </div>
                    <ArrowUpRight className="stat-arrow" size={15} />
                    <p>{label}</p>
                    <strong>{value}</strong>
                    <small>{note}</small>
                  </div>
                ))}
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>
                        {owner ? "Your school network" : "Learning in motion"}
                      </h3>
                      <p>
                        {owner
                          ? "A shared vision. Individual identities."
                          : "Small steps toward something great."}
                      </p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setPage(owner ? "Schools" : "Learning")}
                    >
                      View all <ChevronRight size={15} />
                    </button>
                  </div>
                  {owner
                    ? filtered(platform?.schools)
                        .slice(0, 4)
                        .map((s) => (
                          <div className="list-row" key={s.id}>
                            <span className="row-icon">
                              <Building2 size={20} />
                            </span>
                            <div>
                              <strong>{s.name}</strong>
                              <small>
                                {s.city} · {s.code}
                              </small>
                            </div>
                            <span className="badge">Connected</span>
                          </div>
                        ))
                    : resources.slice(0, 4).map((r) => (
                        <div className="list-row" key={r.id}>
                          <span className="row-icon">
                            <BookOpen size={20} />
                          </span>
                          <div>
                            <strong>{r.title}</strong>
                            <small>
                              {classes.find((c) => c.id === r.classId)?.name} ·{" "}
                              {r.type}
                            </small>
                          </div>
                          <span className="badge">
                            {r.dueDate || "Available"}
                          </span>
                        </div>
                      ))}
                  {!(owner ? platform?.schools.length : resources.length) && (
                    <Empty
                      text={
                        owner
                          ? "Add your first school to begin."
                          : "New resources will appear here."
                      }
                    />
                  )}
                </section>
                <section className="panel notice-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>{owner ? "Recent activity" : "Campus bulletin"}</h3>
                      <p>
                        {owner
                          ? "The latest across your platform."
                          : "News that brings us together."}
                      </p>
                    </div>
                    <span className="tiny-dot" />
                  </div>
                  {owner
                    ? (platform?.audit || []).slice(0, 4).map((a) => (
                        <div key={a.id} className="activity-row">
                          <span />
                          <div>
                            <strong>{a.action.replaceAll(".", " ")}</strong>
                            <small>
                              {new Date(a.createdAt).toLocaleString("en-IN")}
                            </small>
                          </div>
                        </div>
                      ))
                    : notices.slice(0, 3).map((n) => (
                        <article className="mini-notice" key={n.id}>
                          <span className="label">
                            {n.audience === "all"
                              ? "CAMPUS UPDATE"
                              : n.audience.toUpperCase()}
                          </span>
                          <h4>{n.title}</h4>
                          <p>{n.body}</p>
                          <small>
                            {new Date(n.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </small>
                        </article>
                      ))}
                  {!(owner ? platform?.audit.length : notices.length) && (
                    <Empty text="You’re all caught up. New updates will appear here." />
                  )}
                </section>
              </div>
              <div className="bottom-note">
                <Sparkles size={15} /> A brighter campus, one connection at a
                time.<span>POWERED BY ORBIT</span>
              </div>
            </>
          )}
          {page !== "Overview" && (
            <>
              <div className="toolbar">
                <label className="search">
                  <Search size={17} />
                  <input
                    placeholder={`Search ${page.toLowerCase()}…`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                {(owner || manager) && page === "People" && (
                  <button
                    className="secondary"
                    onClick={() => open("recovery")}
                  >
                    Recover account
                  </button>
                )}
                {manager && page === "People" && (
                  <button className="secondary" onClick={() => open("class")}>
                    <Plus size={16} />
                    Add class
                  </button>
                )}
                {owner && page === "Schools" && (
                  <button
                    className="secondary"
                    onClick={() => open("organization")}
                  >
                    <Plus size={16} />
                    Add organization
                  </button>
                )}
              </div>
              {page === "Schools" && (
                <div className="school-grid">
                  {filtered(platform?.schools).map((s) => (
                    <article className="school-card panel" key={s.id}>
                      <div className="school-card-top">
                        <span className="school-icon">
                          <Building2 />
                        </span>
                        <span className="badge">Connected</span>
                      </div>
                      <h3>{s.name}</h3>
                      <p>{s.city}</p>
                      <div className="school-card-footer">
                        <span>
                          {
                            platform.organizations.find((o) => o.id === s.orgId)
                              ?.name
                          }
                        </span>
                        <b>{s.code}</b>
                      </div>
                    </article>
                  ))}
                  {!platform?.schools.length && (
                    <Empty text="Create an organization, then onboard its first school." />
                  )}
                </div>
              )}
              {page === "People" && (
                <Table
                  columns={["Name", "Email", "Role", "Access"]}
                  rows={filtered(owner ? platform?.users : data?.users).map(
                    (u) => [
                      u.name,
                      u.email,
                      <span className="badge">{u.role}</span>,
                      owner
                        ? `${u.schoolIds.length} schools`
                        : u.classIds
                            .map(
                              (cid) => classes.find((c) => c.id === cid)?.name,
                            )
                            .filter(Boolean)
                            .join(", ") || "School-wide",
                    ],
                  )}
                />
              )}
              {page === "Attendance" && editor && data && (
                <RecordGrid
                  key={"attendance-" + sid}
                  kind="attendance"
                  classes={classes}
                  students={students}
                  records={attendance}
                  api={api}
                  schoolId={sid}
                  refresh={refresh}
                />
              )}
              {page === "Attendance" && (
                <Table
                  columns={["Student", "Class", "Date", "Status"]}
                  rows={filtered(attendance).map((a) => [
                    data.users.find((u) => u.id === a.studentId)?.name ||
                      "Student",
                    classes.find((c) => c.id === a.classId)?.name,
                    a.date,
                    <span
                      className={
                        "badge " + (a.status === "absent" ? "warning" : "")
                      }
                    >
                      {a.status}
                    </span>,
                  ])}
                />
              )}
              {page === "Results" && editor && data && (
                <RecordGrid
                  key={"marks-" + sid}
                  kind="marks"
                  classes={classes}
                  students={students}
                  records={marks}
                  api={api}
                  schoolId={sid}
                  refresh={refresh}
                />
              )}
              {page === "Results" && (
                <>
                  <ResultSummary
                    marks={filtered(marks)}
                    users={data?.users || []}
                  />
                  <div className="info-strip">
                    <GraduationCap size={20} />
                    <span>
                      Results are calculated from recorded marks. Use your
                      browser’s print dialog to save this report as a PDF.
                    </span>
                    <button
                      className="secondary"
                      onClick={() => window.print()}
                    >
                      Print report
                    </button>
                  </div>
                  <Table
                    columns={[
                      "Student",
                      "Exam",
                      "Subject",
                      "Marks",
                      "Percentage",
                    ]}
                    rows={filtered(marks).map((m) => [
                      data.users.find((u) => u.id === m.studentId)?.name ||
                        "Student",
                      m.exam,
                      m.subject,
                      `${m.score} / ${m.maxScore}`,
                      `${Math.round((m.score / m.maxScore) * 100)}%`,
                    ])}
                  />
                </>
              )}
              {page === "Learning" && (
                <div className="resource-grid">
                  {filtered(resources).map((r) => (
                    <article className="panel resource-card" key={r.id}>
                      <span className="row-icon">
                        <FileText size={23} />
                      </span>
                      <span className="label">{r.type.toUpperCase()}</span>
                      <h3>{r.title}</h3>
                      <p>{r.description}</p>
                      <small>
                        {classes.find((c) => c.id === r.classId)?.name}
                        {r.dueDate && ` · Due ${r.dueDate}`}
                      </small>
                      {r.fileId && (
                        <button
                          className="secondary"
                          onClick={() => download(r)}
                        >
                          Download file <ArrowUpRight size={16} />
                        </button>
                      )}
                      {r.url && (
                        <a
                          className="resource-link"
                          target="_blank"
                          rel="noreferrer"
                          href={r.url}
                        >
                          Open resource <ArrowUpRight size={16} />
                        </a>
                      )}
                    </article>
                  ))}
                  {!resources.length && (
                    <Empty text="Your class resources will appear here." />
                  )}
                </div>
              )}
              {page === "Notices" && (
                <div className="resource-grid">
                  {filtered(notices).map((n) => (
                    <article className="panel resource-card" key={n.id}>
                      <span className="label">
                        {n.audience === "all"
                          ? "EVERYONE"
                          : n.audience.toUpperCase()}
                      </span>
                      <h3>{n.title}</h3>
                      <p>{n.body}</p>
                      <small>
                        {new Date(n.createdAt).toLocaleString("en-IN")}
                      </small>
                    </article>
                  ))}
                  {!notices.length && (
                    <Empty text="No notices yet. Check back for campus updates." />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      {modal === "recovery" ? (
        <Recovery
          api={api}
          users={owner ? platform?.users : data?.users || []}
          close={() => setModal(null)}
        />
      ) : (
        modal && (
          <Editor
            type={modal}
            close={() => {
              setModal(null);
              setError("");
            }}
            save={save}
            error={error}
            loading={loading}
            owner={owner}
            school={school}
            platform={platform}
            classes={classes}
            students={students}
          />
        )
      )}
    </div>
  );
}
function Empty({ text }) {
  return (
    <div className="empty">
      <Orbit size={30} />
      <p>{text}</p>
    </div>
  );
}
function RecordGrid({
  kind,
  classes,
  students,
  records,
  api,
  schoolId,
  refresh,
}) {
  const [classId, setClassId] = useState(classes[0]?.id || ""),
    [date, setDate] = useState(today()),
    [exam, setExam] = useState(""),
    [subject, setSubject] = useState(""),
    [maxScore, setMaxScore] = useState("100"),
    [values, setValues] = useState({}),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState("");
  const roster = students.filter((s) => s.classIds.includes(classId));
  const existing = (s) =>
    records.find(
      (r) =>
        r.classId === classId &&
        r.studentId === s.id &&
        (kind === "attendance"
          ? r.date === date
          : r.exam === exam && r.subject === subject),
    );
  const value = (s) =>
    values[s.id] ??
    (kind === "attendance" ? existing(s)?.status : existing(s)?.score) ??
    "";
  useEffect(() => {
    setValues({});
    setFeedback("");
  }, [classId, date, exam, subject]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setFeedback("");
    let saved = 0;
    try {
      const selected = roster.filter((s) => value(s) !== "");
      if (!selected.length)
        throw new Error("Enter at least one record before saving.");
      for (const s of selected) {
        await api(`/schools/${schoolId}/${kind}`, {
          classId,
          studentId: s.id,
          ...(kind === "attendance"
            ? { date, status: value(s) }
            : {
                exam,
                subject,
                score: Number(value(s)),
                maxScore: Number(maxScore),
              }),
        });
        saved++;
      }
      setFeedback(`${saved} ${saved === 1 ? "record" : "records"} saved.`);
      setValues({});
      await refresh();
    } catch (err) {
      setFeedback(
        `${saved ? `${saved} records saved before the error. ` : ""}${err.message}`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel record-grid">
      <div className="panel-heading">
        <div>
          <h3>
            {kind === "attendance"
              ? "Class attendance register"
              : "Class marks register"}
          </h3>
          <p>
            Enter records directly in the table. Blank entries are left
            unchanged.
          </p>
        </div>
      </div>
      <form onSubmit={submit}>
        <div className="register-controls">
          <label>
            Class
            <select
              aria-label="Register class"
              required
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">Choose class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {kind === "attendance" ? (
            <label>
              Date
              <input
                aria-label="Register date"
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          ) : (
            <>
              <label>
                Exam
                <input
                  aria-label="Register exam"
                  required
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                />
              </label>
              <label>
                Subject
                <input
                  aria-label="Register subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
              <label>
                Maximum
                <input
                  aria-label="Register maximum marks"
                  type="number"
                  min="1"
                  required
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>{kind === "attendance" ? "Attendance status" : "Score"}</th>
                <th>Previously recorded</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    {kind === "attendance" ? (
                      <select
                        aria-label={`Attendance for ${s.name}`}
                        value={value(s)}
                        onChange={(e) =>
                          setValues({ ...values, [s.id]: e.target.value })
                        }
                      >
                        <option value="">Not entered</option>
                        {["present", "absent", "late", "excused"].map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        aria-label={`Marks for ${s.name}`}
                        type="number"
                        min="0"
                        max={maxScore}
                        step="0.01"
                        value={value(s)}
                        onChange={(e) =>
                          setValues({ ...values, [s.id]: e.target.value })
                        }
                      />
                    )}
                  </td>
                  <td>
                    {kind === "attendance"
                      ? existing(s)?.status || "—"
                      : existing(s)
                        ? `${existing(s).score} / ${existing(s).maxScore}`
                        : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!roster.length && (
            <Empty text="Choose a class with enrolled students to begin." />
          )}
        </div>
        <div className="register-footer">
          {feedback && <span role="status">{feedback}</span>}
          {kind === "attendance" && (
            <button
              type="button"
              className="secondary"
              disabled={busy || !roster.length}
              onClick={() =>
                setValues(
                  Object.fromEntries(roster.map((s) => [s.id, "present"])),
                )
              }
            >
              Mark all present
            </button>
          )}
          <button className="primary" disabled={busy || !roster.length}>
            {busy ? "Saving…" : "Save register"}
            <Check size={15} />
          </button>
        </div>
      </form>
    </section>
  );
}
function Table({ columns, rows }) {
  return (
    <div className="panel table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <Empty text="No records to display yet." />}
    </div>
  );
}
function ResultSummary({ marks, users }) {
  const reports = Object.values(
    marks.reduce((all, m) => {
      const key = m.studentId + "|" + m.exam;
      const r = all[key] || {
        studentId: m.studentId,
        exam: m.exam,
        score: 0,
        max: 0,
        subjects: 0,
      };
      r.score += m.score;
      r.max += m.maxScore;
      r.subjects++;
      all[key] = r;
      return all;
    }, {}),
  );
  return (
    reports.length > 0 && (
      <div className="resource-grid result-summary">
        {reports.map((r) => (
          <article className="panel resource-card" key={r.studentId + r.exam}>
            <span className="label">PROVISIONAL RESULT</span>
            <h3>
              {users.find((u) => u.id === r.studentId)?.name || "Student"}
            </h3>
            <p>
              {r.exam} · {r.subjects} recorded subjects
            </p>
            <strong>
              {r.score} / {r.max} · {((r.score / r.max) * 100).toFixed(1)}%
            </strong>
            <small>
              Based on recorded marks. Final grading and publication are
              pending.
            </small>
          </article>
        ))}
      </div>
    )
  );
}
function Login({ api, onLogin, error }) {
  const [view, setView] = useState("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [resetToken, setResetToken] = useState(""),
    [localError, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (view === "login")
        onLogin(await api("/auth/login", { email, password }));
      else if (view === "forgot") {
        const r = await api("/auth/forgot-password", { email });
        setMessage(r.message);
        if (r.demoToken) {
          setResetToken(r.demoToken);
          setView("reset");
        }
      } else {
        const r = await api("/auth/reset-password", {
          token: resetToken,
          password,
        });
        setMessage(r.message);
        setView("login");
        setPassword("");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <a className="brand" href="#">
          <span className="brand-icon">
            <Orbit size={25} />
          </span>
          orbit<span className="brand-dot">.</span>
        </a>
        <div>
          <span className="hero-pill">
            <Sparkles size={14} />
            THE NEXT CHAPTER OF EDUCATION
          </span>
          <h1>
            A connected campus.
            <br />A brighter future.
          </h1>
          <p>
            A thoughtful workspace for the people shaping tomorrow. Every
            school, every classroom, every possibility.
          </p>
          <div className="login-orbit" aria-hidden="true">
            <Orbit size={150} />
          </div>
        </div>
        <small>ONE PLATFORM. YOUR ENTIRE SCHOOL COMMUNITY.</small>
      </section>
      <section className="login-side">
        <div className="login-form">
          <span className="eyebrow">YOUR WORKSPACE AWAITS</span>
          <h2>
            {view === "login"
              ? "Welcome back."
              : view === "forgot"
                ? "Let’s get you back in."
                : "Set a new password."}
          </h2>
          <p>
            {view === "login"
              ? "Sign in to your school’s world of possibilities."
              : "Secure access starts with you."}
          </p>
          <form onSubmit={submit}>
            {view !== "reset" && (
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                />
              </label>
            )}
            {view !== "forgot" && (
              <label>
                {view === "reset" ? "New password" : "Password"}
                <input
                  type="password"
                  autoComplete={
                    view === "reset" ? "new-password" : "current-password"
                  }
                  required
                  minLength={view === "reset" ? 12 : 1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </label>
            )}
            {view === "reset" && (
              <label>
                Reset token
                <input
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                />
              </label>
            )}
            {(localError || error) && (
              <div className="alert" role="alert">
                {localError || error}
              </div>
            )}
            {message && (
              <div className="success" role="status">
                {message}
              </div>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "Please wait…"
                : view === "login"
                  ? "Sign in to Orbit"
                  : view === "forgot"
                    ? "Request password reset"
                    : "Update password"}
              <ArrowUpRight size={17} />
            </button>
          </form>
          <button
            className="text-button reset-link"
            onClick={() => {
              setView(view === "login" ? "forgot" : "login");
              setError("");
              setMessage("");
            }}
          >
            {view === "login" ? "Forgot your password?" : "Back to sign in"}
          </button>
          {view === "forgot" && (
            <button
              className="text-button reset-link"
              onClick={() => {
                setView("reset");
                setMessage(
                  "Enter the recovery token provided privately by your administrator.",
                );
              }}
            >
              I have a recovery token
            </button>
          )}
          <div className="login-help">
            <ShieldCheck size={18} />
            <p>
              Your account is provided by your administrator.
              <br />
              Need access? Contact your school.
            </p>
          </div>
          <details className="demo-details">
            <summary>Local demo accounts</summary>
            <p>
              Available only when the backend runs in demo mode. Password:{" "}
              <b>OrbitDemo123!</b>
            </p>
            <div>
              {["owner", "director", "principal", "teacher", "student"].map(
                (role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setEmail(`${role}@orbit.local`);
                      setPassword("OrbitDemo123!");
                      setView("login");
                    }}
                  >
                    {role}
                  </button>
                ),
              )}
            </div>
          </details>
        </div>
        <small className="login-footer">
          Designed for learning. Built for connection.
        </small>
      </section>
    </div>
  );
}
function Recovery({ api, users = [], close }) {
  const [userId, setUserId] = useState(""),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setResult(await api(`/users/${userId}/recovery`, {}));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-title"
      >
        <div className="panel-heading">
          <h2 id="recovery-title">Recover an account</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          <p className="recovery-help">
            Verify the account holder’s identity before issuing a token. Share
            it privately; they choose their own new password on the login page.
          </p>
          <label>
            Account
            <select
              aria-label="Recovery account"
              required
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setResult(null);
              }}
            >
              <option value="">Choose account</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.email}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          {result && (
            <>
              <div className="success">{result.message}</div>
              <label>
                Recovery token
                <input
                  aria-label="Issued recovery token"
                  value={result.token}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
              </label>
            </>
          )}
          <div className="modal-actions">
            <button className="secondary" type="button" onClick={close}>
              Close
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Issuing…" : "Issue recovery token"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
function Editor({
  type,
  close,
  save,
  error,
  loading,
  owner,
  school,
  platform,
  classes,
  students,
}) {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: owner ? "director" : "teacher",
    orgId: owner ? platform?.organizations[0]?.id || "" : school?.orgId,
    schoolIds: owner ? [] : [school?.id],
    classIds: [],
    classId: type === "notice" ? "" : classes[0]?.id || "",
    studentId: "",
    date: today(),
    status: "present",
    exam: "",
    subject: "",
    score: "",
    maxScore: "100",
    title: "",
    body: "",
    audience: "all",
    type: "homework",
    description: "",
    url: "",
    dueDate: "",
    city: "",
    code: "",
  });
  const field = (
    name,
    label,
    options = null,
    kind = "text",
    required = true,
  ) => (
    <label>
      {label}
      {options ? (
        <select
          aria-label={label}
          required={required}
          value={form[name]}
          onChange={(e) =>
            setForm({
              ...form,
              [name]: e.target.value,
              ...(name === "classId" ? { studentId: "" } : {}),
            })
          }
        >
          <option value="">Choose {label.toLowerCase()}</option>
          {options.map((o) => (
            <option key={o.id || o} value={o.id || o}>
              {o.name || o}
            </option>
          ))}
        </select>
      ) : kind === "textarea" ? (
        <textarea
          aria-label={label}
          required={required}
          maxLength={5000}
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        />
      ) : (
        <input
          aria-label={label}
          required={required}
          type={kind}
          min={kind === "number" ? 0 : undefined}
          minLength={name === "password" ? 12 : undefined}
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        />
      )}
    </label>
  );
  function submit(e) {
    e.preventDefault();
    const prefix = `/schools/${school?.id}`;
    if (type === "organization")
      save("/platform/organizations", { name: form.name });
    if (type === "school")
      save("/platform/schools", {
        name: form.name,
        city: form.city,
        code: form.code,
        orgId: form.orgId,
      });
    if (type === "class") save(prefix + "/classes", { name: form.name });
    if (type === "user") save("/users", form);
    if (type === "attendance") save(prefix + "/attendance", form);
    if (type === "marks")
      save(prefix + "/marks", {
        ...form,
        score: Number(form.score),
        maxScore: Number(form.maxScore),
      });
    if (type === "resource") {
      if (file) {
        const body = new FormData();
        for (const name of [
          "classId",
          "title",
          "type",
          "description",
          "dueDate",
        ])
          body.append(name, form[name]);
        body.append("file", file);
        save(prefix + "/uploads", body);
      } else save(prefix + "/resources", form);
    }
    if (type === "notice")
      save(prefix + "/notices", { ...form, classId: form.classId || null });
  }
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="panel-heading">
          <h2 id="modal-title">
            {
              {
                school: "Onboard a school",
                organization: "Create an organization",
                user: "Add a person",
                class: "Create a class",
                attendance: "Record attendance",
                marks: "Enter exam marks",
                resource: "Add learning resource",
                notice: "Publish a notice",
              }[type]
            }
          </h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          {["school", "organization", "class", "user"].includes(type) &&
            field("name", "Name")}
          {["school"].includes(type) && (
            <>
              {field("city", "City")}
              {field("code", "School code")}
              {field("orgId", "Organization", platform?.organizations || [])}
            </>
          )}
          {type === "user" && (
            <>
              {field("email", "Email", "", "email")}
              {field(
                "password",
                "Initial password (12+ characters)",
                null,
                "password",
              )}
              {field(
                "role",
                "Role",
                owner
                  ? ["director", "admin", "principal"]
                  : ["teacher", "student", "staff"],
              )}
              {owner &&
                field("orgId", "Organization", platform?.organizations || [])}
              {owner && (
                <fieldset>
                  <legend>School access</legend>
                  {platform?.schools
                    .filter((s) => s.orgId === form.orgId)
                    .map((s) => (
                      <label className="checkbox" key={s.id}>
                        <input
                          type="checkbox"
                          checked={form.schoolIds.includes(s.id)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              schoolIds: e.target.checked
                                ? [...form.schoolIds, s.id]
                                : form.schoolIds.filter((id) => id !== s.id),
                            })
                          }
                        />
                        {s.name}
                      </label>
                    ))}
                </fieldset>
              )}
              {!owner && (
                <fieldset>
                  <legend>
                    Class access (required for teachers and students)
                  </legend>
                  {classes.map((c) => (
                    <label className="checkbox" key={c.id}>
                      <input
                        type="checkbox"
                        checked={form.classIds.includes(c.id)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            classIds: e.target.checked
                              ? [...form.classIds, c.id]
                              : form.classIds.filter((id) => id !== c.id),
                          })
                        }
                      />
                      {c.name}
                    </label>
                  ))}
                </fieldset>
              )}
              {owner && ["teacher", "student"].includes(form.role) && (
                <p className="alert">
                  Create teaching and student accounts from the school workspace
                  after creating classes. Platform onboarding is designed for
                  leadership accounts.
                </p>
              )}
            </>
          )}
          {["attendance", "marks", "resource"].includes(type) &&
            field("classId", "Class", classes)}
          {["attendance", "marks"].includes(type) &&
            field(
              "studentId",
              "Student",
              students.filter((s) => s.classIds.includes(form.classId)),
            )}
          {type === "attendance" && (
            <>
              {field("date", "Date", null, "date")}
              {field("status", "Status", [
                "present",
                "absent",
                "late",
                "excused",
              ])}
            </>
          )}
          {type === "marks" && (
            <>
              {field("exam", "Exam")}
              {field("subject", "Subject")}
              {field("score", "Score", null, "number")}
              {field("maxScore", "Maximum score", null, "number")}
            </>
          )}
          {type === "resource" && (
            <>
              {field("type", "Resource type", [
                "homework",
                "syllabus",
                "timetable",
                "material",
              ])}
              {field("title", "Title")}
              {field("description", "Instructions", null, "textarea", false)}
              {field("url", "HTTPS resource link", null, "url", false)}
              {field("dueDate", "Due date", null, "date", false)}
              <label>
                Upload PDF or image (optional, 5 MB max)
                <input
                  aria-label="Resource file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
              </label>
            </>
          )}
          {type === "notice" && (
            <>
              {field("title", "Title")}
              {field("body", "Message", null, "textarea")}
              {field("audience", "Audience", [
                "all",
                "teacher",
                "student",
                "staff",
                "director",
                "admin",
                "principal",
              ])}
              {field("classId", "Class (optional)", classes, "text", false)}
            </>
          )}
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={close}>
              Cancel
            </button>
            <button className="primary" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
              <Check size={16} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
