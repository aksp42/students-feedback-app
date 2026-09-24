# StudentVoice - Course Feedback Portal

> Your feedback helps us improve learning.

StudentVoice is a web-based course feedback portal. A student enters their details, picks a course, rates it, writes feedback, and sees the submission appear under **Recent Feedback**. It is built with plain HTML, CSS, and JavaScript, and ships with a GitHub Actions CI/CD pipeline.

## Features

- Student information: name, student ID, college email
- Course and semester dropdowns (9 courses including Data Science, Semester 1-8)
- 1-5 star ratings for overall rating, teaching quality, and course content
- Difficulty scale (Too Easy to Too Difficult)
- Written feedback with a live character counter (max 500)
- Optional recommendation (Yes / Maybe / No)
- Anonymous submission: name and student ID are hidden in the public list (UI feature only)
- Client-side validation with clear inline messages
- Success confirmation with a reference number
- Recent Feedback list (newest first), course filter, review count and average rating
- Responsive layout for desktop, tablet, and mobile

## Technologies

- HTML5, CSS3 (custom properties, Grid, Flexbox)
- Vanilla JavaScript (no frameworks, no backend, no database)
- GitHub Actions for CI/CD, GitHub Pages for hosting
- Node.js is used **only** in CI to run the validation script

## Data and privacy

There is no backend. Feedback is kept in the browser's `localStorage`, so it stays on the visitor's device. The email and student ID are validated but never stored or displayed. Three sample reviews are shown on first load.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Run the project checks (requires Node.js 18+):

```bash
npm test
```

## Project structure

```
studentvoice/
├── index.html
├── css/style.css
├── js/app.js
├── scripts/validate.js          # CI validation checks
├── package.json                 # defines "npm test"
├── .github/workflows/ci-cd.yml  # GitHub Actions pipeline
├── README.md
└── .gitignore
```

## CI/CD pipeline (GitHub Actions)

The workflow in `.github/workflows/ci-cd.yml` runs on every push and pull request to `main`:

1. **Validate** - checks out the code, sets up Node.js, and runs `npm test` (required files, JavaScript syntax, HTML/JS id consistency, no inline handlers).
2. **Build** - assembles `index.html`, `css/`, and `js/` into a `dist/` folder, verifies the files exist, and uploads it as a Pages artifact.
3. **Deploy** - on pushes to `main` only, publishes `dist/` to GitHub Pages.

### Enable deployment

1. Push the project to a GitHub repository (branch `main`).
2. Go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. Push a commit. The **Actions** tab shows the pipeline, and the live URL appears in the Deploy step.
