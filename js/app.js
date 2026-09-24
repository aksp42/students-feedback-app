(function () {
  "use strict";

  const STORAGE_KEY = "studentvoice.feedback.v1";
  const MAX_STORED = 50;
  const COURSES = ["Data Structures & Algorithms", "Database Management Systems", "Operating Systems", "Computer Networks", "Software Engineering", "DevOps & Cloud Computing", "Artificial Intelligence", "Machine Learning", "Data Science"];
  const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return "Semester " + n; });
  const RATING_WORDS = ["Poor", "Fair", "Good", "Very good", "Excellent"];
  const RECOMMEND_TEXT = { Yes: "Would recommend", Maybe: "Might recommend", No: "Would not recommend" };
  const SEEDS = [
    { ref: "SV-2026-10413", name: "Akanksha Singh", anonymous: false, course: "Data Science", semester: "Semester 5", overall: 5, teaching: 4, content: 5, difficulty: "Moderate", recommend: "Yes", comments: "Data Science modules are engaging and the hands-on labs really helped. Good balance of theory and practice in the 5th semester.", submittedAt: "2026-09-23T12:00:00" },
    { ref: "SV-2026-10482", name: "Rohan Mehta", anonymous: false, course: "Operating Systems", semester: "Semester 5", overall: 5, teaching: 5, content: 4, difficulty: "Difficult", recommend: "Yes", comments: "The scheduling and memory management labs made the theory click. Weekly quizzes kept me consistent, though the deadlock unit moved a little fast.", submittedAt: "2026-09-22T10:30:00" },
    { ref: "SV-2026-10377", name: "", anonymous: true, course: "Database Management Systems", semester: "Semester 4", overall: 4, teaching: 4, content: 5, difficulty: "Moderate", recommend: "Yes", comments: "Good balance of SQL practice and normalization theory. More time on transaction isolation with worked examples would help.", submittedAt: "2026-09-20T15:05:00" },
    { ref: "SV-2026-10291", name: "Sara Thomas", anonymous: false, course: "Software Engineering", semester: "Semester 6", overall: 3, teaching: 4, content: 3, difficulty: "Easy", recommend: "Maybe", comments: "The team project was valuable, but the syllabus repeats topics from earlier semesters. I would like more on testing and code review practice.", submittedAt: "2026-09-18T09:15:00" }
  ];

  const form = document.getElementById("feedback-form");
  const charCount = document.getElementById("char-count");
  const anonNote = document.getElementById("anonymous-note");
  const confirmation = document.getElementById("confirmation");
  const listEl = document.getElementById("feedback-list");
  const emptyEl = document.getElementById("empty-state");
  const filterEl = document.getElementById("course-filter");
  const countEl = document.getElementById("summary-count");
  const avgEl = document.getElementById("summary-average");

  let entries = [];
  let confirmTimer = null;

  // ---------- Helpers ----------
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined) { n.textContent = text; }
    return n;
  }
  function val(name) { return form.elements[name].value.trim(); }
  function stars(n) { return "\u2605".repeat(n) + "\u2606".repeat(5 - n); }
  function initials(name) {
    const p = name.trim().split(/\s+/);
    return ((p[0] || "").charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : "")).toUpperCase();
  }
  function formatDate(iso) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function makeRef() { return "SV-" + new Date().getFullYear() + "-" + String(Math.floor(10000 + Math.random() * 90000)); }

  // ---------- Storage ----------
  function load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) { return SEEDS.slice(); }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return SEEDS.slice();
    }
  }
  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch (err) { /* keep working in memory */ }
  }

  // ---------- Build form controls ----------
  function fillSelect(select, options, placeholder) {
    select.appendChild(new Option(placeholder, ""));
    options.forEach(function (o) { select.appendChild(new Option(o, o)); });
  }
  function buildStars() {
    document.querySelectorAll(".stars").forEach(function (box) {
      const name = box.dataset.name;
      for (let i = 5; i >= 1; i--) {
        const input = el("input");
        input.type = "radio"; input.name = name; input.value = String(i); input.id = name + "-" + i;
        input.setAttribute("aria-label", i + " out of 5");
        const label = el("label", null, "\u2605");
        label.htmlFor = input.id; label.title = RATING_WORDS[i - 1];
        box.append(input, label);
      }
    });
  }
  function buildChips() {
    document.querySelectorAll(".chips").forEach(function (box) {
      box.dataset.options.split(",").forEach(function (opt, i) {
        const input = el("input");
        input.type = "radio"; input.name = box.dataset.name; input.value = opt; input.id = box.dataset.name + "-" + i;
        const label = el("label", null, opt);
        label.htmlFor = input.id;
        box.append(input, label);
      });
    });
  }
  function updateWord(fieldset) {
    const checked = fieldset.querySelector("input:checked");
    fieldset.querySelector(".rating-word").textContent = checked ? RATING_WORDS[Number(checked.value) - 1] : "";
  }
  function updateCount() { charCount.textContent = form.elements.comments.value.length + " / 500 characters"; }

  // ---------- Validation ----------
  const need = function (msg) { return function (v) { return v ? "" : msg; }; };
  const RULES = {
    studentName: function (v) {
      if (!v) { return "Enter your full name."; }
      return /^[\p{L} .'-]{2,60}$/u.test(v) ? "" : "Use 2 to 60 letters. Spaces, . ' and - are allowed.";
    },
    studentId: function (v) {
      if (!v) { return "Enter your student ID."; }
      return /^[A-Za-z0-9][A-Za-z0-9\/-]{3,14}$/.test(v) ? "" : "Use 4 to 15 letters or numbers (- and / allowed).";
    },
    email: function (v) {
      if (!v) { return "Enter your college email address."; }
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Enter a valid email address, such as 0241csds181@niet.co.in.";
    },
    course: need("Select the course you are reviewing."),
    semester: need("Select your semester."),
    overall: need("Rate the course from 1 to 5 stars."),
    teaching: need("Rate the teaching quality from 1 to 5 stars."),
    content: need("Rate the course content from 1 to 5 stars."),
    difficulty: need("Select how difficult the course was."),
    comments: function (v) {
      if (!v) { return "Write a few lines about your experience."; }
      return v.length >= 20 ? "" : "Please write at least 20 characters (" + (20 - v.length) + " more).";
    }
  };

  function setError(name, msg) {
    const field = form.querySelector('[data-field="' + name + '"]');
    field.classList.toggle("invalid", Boolean(msg));
    field.querySelector(".error").textContent = msg;
  }
  function validateField(name) {
    const msg = RULES[name](val(name));
    setError(name, msg);
    return msg === "";
  }

  // ---------- Rendering ----------
  function createCard(e) {
    const card = el("article", "feedback-card");
    const head = el("div", "card-head");
    const who = el("div", "who");
    who.append(el("strong", null, e.anonymous ? "Anonymous student" : e.name), el("span", null, formatDate(e.submittedAt)));
    const rating = el("span", "stars-out", stars(e.overall));
    rating.setAttribute("aria-label", "Overall rating " + e.overall + " out of 5");
    head.append(el("span", "avatar", e.anonymous ? "?" : initials(e.name)), who, rating);

    const tags = el("div", "tags");
    ["Teaching " + e.teaching + "/5", "Content " + e.content + "/5", "Difficulty: " + e.difficulty].forEach(function (t) { tags.appendChild(el("span", "tag", t)); });
    if (e.recommend) { tags.appendChild(el("span", "tag", RECOMMEND_TEXT[e.recommend])); }

    card.append(head, el("p", "card-course", e.course + ", " + e.semester), el("p", "card-text", e.comments), tags);
    return card;
  }
  function render() {
    const shown = entries.filter(function (e) { return !filterEl.value || e.course === filterEl.value; });
    listEl.replaceChildren.apply(listEl, shown.map(createCard));
    emptyEl.hidden = shown.length > 0;
    countEl.textContent = shown.length + (shown.length === 1 ? " review" : " reviews");
    if (shown.length) {
      const avg = shown.reduce(function (s, e) { return s + e.overall; }, 0) / shown.length;
      avgEl.textContent = "with an average rating of " + avg.toFixed(1) + " out of 5";
      avgEl.className = "avg";
    } else {
      avgEl.textContent = "";
    }
  }

  // ---------- Actions ----------
  function showConfirmation(entry) {
    confirmation.replaceChildren(el("strong", null, "Feedback submitted. "), el("span", null, "Thank you for helping improve " + entry.course + ". Your reference number is " + entry.ref + "."));
    confirmation.hidden = false;
    confirmation.scrollIntoView({ behavior: "smooth", block: "center" });
    window.clearTimeout(confirmTimer);
    confirmTimer = window.setTimeout(function () { confirmation.hidden = true; }, 12000);
  }
  function resetForm() {
    form.reset();
    Object.keys(RULES).forEach(function (n) { setError(n, ""); });
    document.querySelectorAll(".rating").forEach(updateWord);
    anonNote.hidden = true;
    updateCount();
  }
  function onSubmit(event) {
    event.preventDefault();
    const invalid = Object.keys(RULES).filter(function (n) { return !validateField(n); });
    if (invalid.length) {
      confirmation.hidden = true;
      form.querySelector('[data-field="' + invalid[0] + '"]').querySelector("input,select,textarea").focus();
      return;
    }
    const anonymous = form.elements.anonymous.checked;
    // Email and student ID are validated but intentionally never stored or displayed.
    const entry = {
      ref: makeRef(),
      name: anonymous ? "" : val("studentName"),
      anonymous: anonymous,
      course: val("course"),
      semester: val("semester"),
      overall: Number(val("overall")),
      teaching: Number(val("teaching")),
      content: Number(val("content")),
      difficulty: val("difficulty"),
      recommend: val("recommend"),
      comments: val("comments"),
      submittedAt: new Date().toISOString()
    };
    entries.unshift(entry);
    entries = entries.slice(0, MAX_STORED);
    save();
    filterEl.value = "";
    render();
    resetForm();
    showConfirmation(entry);
  }
  function onFieldEvent(e) {
    const t = e.target;
    if (t.name === "comments") { updateCount(); }
    if (t.name === "anonymous") { anonNote.hidden = !t.checked; }
    if (t.closest(".rating")) { updateWord(t.closest(".rating")); }
    const field = t.closest("[data-field]");
    if (RULES[t.name] && field && field.classList.contains("invalid")) { validateField(t.name); }
  }

  function init() {
    fillSelect(document.getElementById("course"), COURSES, "Select a course");
    fillSelect(document.getElementById("semester"), SEMESTERS, "Select semester");
    fillSelect(filterEl, COURSES, "All courses");
    buildStars();
    buildChips();
    entries = load();
    render();
    updateCount();

    form.addEventListener("submit", onSubmit);
    form.addEventListener("input", onFieldEvent);
    form.addEventListener("change", onFieldEvent);
    form.addEventListener("focusout", function (e) {
      if (e.target.matches("input[type=text],input[type=email],select,textarea") && RULES[e.target.name]) { validateField(e.target.name); }
    });
    filterEl.addEventListener("change", render);
  }

  init();
})();
