const API_BASE_URL = "https://kodziva-backend.onrender.com";
const pageTitles = {
    home: "Welcome to KODZIVA",
    generate: "Prompt to Code",
    debug: "Smart Debugger",
    dissect: "Code Dissector",
    trace: "Execution Trace",
    viva: "AI Viva Trainer",
    history: "Code History"
};

const pageDescriptions = {
    generate: "Describe a programming problem and generate code.",
    debug: "Paste your code to identify and understand errors.",
    dissect: "Understand your code line by line.",
    trace: "Explore how your program executes step by step.",
    viva: "Practice viva questions based on your code.",
    history: "View, restore and manage your previous AI results."
};

const inputLabels = {
    generate: "Describe your programming problem",
    debug: "Paste the code you want to debug",
    dissect: "Paste the code you want explained",
    trace: "Paste the code you want to trace",
    viva: "Paste the code for viva practice",
    history: "Saved results"
};

const placeholders = {
    generate: "Example: Write a C program to calculate simple interest...",
    debug: "Paste your C program here...",
    dissect: "Paste your C program here...",
    trace: "Paste your C program here...",
    viva: "Paste your C program here...",
    history: "Your saved AI results appear here."
};

let currentPage = "home";

// Interactive Viva state
let vivaQuestions = [];
let vivaAnswers = [];
let vivaCode = "";
let vivaLanguage = "";
let vivaIndex = 0;


// ------------------------------------
// PAGE NAVIGATION
// ------------------------------------

function openPage(page) {
    if (!pageTitles[page]) return;

    currentPage = page;

    document.querySelectorAll(".page").forEach(element => {
        element.classList.remove("active-page");
    });

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.remove("active");
    });

    if (page === "home") {
        document.getElementById("home-page").classList.add("active-page");

        updateDashboard();
        updateLearningTracker();

    } else if (page === "history") {
        document.getElementById("history-page").classList.add("active-page");

        renderHistory();

    } else {
        document.getElementById("workspace-page").classList.add("active-page");

        document.getElementById("workspace-title").textContent =
            pageTitles[page];

        document.getElementById("workspace-description").textContent =
            pageDescriptions[page];

        document.getElementById("input-label").textContent =
            inputLabels[page];

        document.getElementById("code-input").placeholder =
            placeholders[page];
    }

    document.getElementById("page-title").textContent =
        pageTitles[page];

    const activeButton = document.querySelector(
        `.nav-btn[data-page="${page}"]`
    );

    if (activeButton) {
        activeButton.classList.add("active");
    }

    if (page !== "history") {
        document.getElementById("code-input").value = "";

        const result = document.getElementById("result");
        result.replaceChildren();

        const heading = document.createElement("h3");
        heading.textContent = "AI Results";

        const message = document.createElement("p");
        message.textContent =
            "Your results will appear here when you analyze your request.";

        result.append(heading, message);
    }

    vivaQuestions = [];
    vivaAnswers = [];
    vivaIndex = 0;
}


// ------------------------------------
// MAIN AI ANALYZE FUNCTION
// ------------------------------------


async function analyzeCode() {
    const input = document.getElementById("code-input").value.trim();

    if (!input) {
        alert("Please enter a question or paste your code first.");
        return;
    }

    if (currentPage === "viva") {
        await startViva(input);
        return;
    }

    const language = document.getElementById("language").value;
    const resultContent = document.getElementById("result-content");
    const loadingIndicator = document.getElementById("loading-indicator");
    const analyzeButton = document.getElementById("analyze-btn");

    console.log("KODZIVA element check:", {
    resultContent,
    loadingIndicator,
    analyzeButton
});

if (!resultContent || !loadingIndicator || !analyzeButton) {
    console.error("KODZIVA: A required HTML element is missing.");
    alert("KODZIVA layout error. Please refresh the page.");
    return;
}

    // Show loading animation
    
    console.log("RESULT CONTENT:", resultContent);
    console.log("RESULT ELEMENTS:", document.querySelectorAll("#result-content").length);
    console.log("CURRENT PAGE:", currentPage);

    resultContent.style.display = "none";
    loadingIndicator.style.display = "block";

    analyzeButton.disabled = true;
    analyzeButton.textContent = "Processing...";

    try {
        const response = await fetch(`${API_BASE_URL}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: input,
                language: language,
                feature: currentPage
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Request failed.");
        }

        if (typeof data.result !== "string") {
            throw new Error("The AI returned an invalid result.");
        }

        // Save successful result to history
        const historyItem = {
            id: Date.now(),
            prompt: input,
            language: language,
            feature: currentPage,
            result: data.result,
            date: new Date().toLocaleString()
        };

        const history = getKodzivaHistory();

        history.unshift(historyItem);

        localStorage.setItem(
            "kodzivaHistory",
            JSON.stringify(history.slice(0, 30))
        );

        updateDashboard();
        updateLearningTracker();

        // Display AI result
        resultContent.replaceChildren();

        const title = document.createElement("h3");
        title.textContent = "KODZIVA AI Results";

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "10px";
        actions.style.flexWrap = "wrap";
        actions.style.marginBottom = "15px";

        const copyButton = document.createElement("button");
        copyButton.textContent = "📋 Copy Result";

        copyButton.onclick = async () => {
            try {
                await navigator.clipboard.writeText(output.textContent);
                copyButton.textContent = "✓ Copied!";
            } catch (error) {
                alert("Unable to copy. Please copy manually.");
            }
        };

        const downloadButton = document.createElement("button");
        downloadButton.textContent = "⬇ Download Result";

        downloadButton.onclick = () => {
            const blob = new Blob(
                [output.textContent],
                { type: "text/plain;charset=utf-8" }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = "KODZIVA-" + currentPage + "-result.txt";

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);
        };

        const output = document.createElement("pre");
        output.textContent = data.result;
        output.style.whiteSpace = "pre-wrap";
        output.style.overflowWrap = "anywhere";

        actions.append(copyButton, downloadButton);
        resultContent.append(title, actions, output);

    } catch (error) {
        resultContent.replaceChildren();

        const errorMessage = document.createElement("p");
        errorMessage.textContent = "Something went wrong: " + error.message;

        resultContent.append(errorMessage);

        console.error("KODZIVA Error:", error);

    } finally {
        loadingIndicator.style.display = "none";
        resultContent.style.display = "block";

        analyzeButton.disabled = false;
        analyzeButton.textContent = "Generate with AI →";
    }
}



// ------------------------------------
// INTERACTIVE VIVA
// ------------------------------------

async function startViva(code) {
    const result = document.getElementById("result");

    vivaCode = code;
    vivaLanguage = document.getElementById("language").value;
    vivaAnswers = [];
    vivaIndex = 0;

    result.replaceChildren();

    const message = document.createElement("h3");
    message.textContent = "Generating your viva questions...";

    result.append(message);

    try {
        const response = await fetch(`${API_BASE_URL}/api/viva/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                code: vivaCode,
                language: vivaLanguage
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not start viva.");
        }

        if (!Array.isArray(data.questions) || data.questions.length !== 10) {
            throw new Error("The AI did not generate 10 valid questions.");
        }

        vivaQuestions = data.questions;

        renderVivaQuestion();

    } catch (error) {
        showError(error.message);
        console.error("Viva start error:", error);
    }
}


// Display one question at a time
function renderVivaQuestion() {
    const result = document.getElementById("result");
    result.replaceChildren();

    if (vivaIndex >= vivaQuestions.length) {
        showVivaResults();
        return;
    }

    const question = vivaQuestions[vivaIndex];

    const heading = document.createElement("h3");
    heading.textContent = "Interactive Viva Practice";

    const progressText = document.createElement("p");
    progressText.textContent =
        `Question ${vivaIndex + 1} of ${vivaQuestions.length}`;

    // Progress bar
    const progressBar = document.createElement("div");
    progressBar.className = "viva-progress";

    const progressFill = document.createElement("div");
    progressFill.className = "viva-progress-fill";

    const progressPercentage =
        ((vivaIndex + 1) / vivaQuestions.length) * 100;

    progressFill.style.width = progressPercentage + "%";

    progressBar.appendChild(progressFill);

    result.append(heading, progressText, progressBar);

    // Question
    const questionText = document.createElement("h4");
    questionText.textContent = question.question;

    result.appendChild(questionText);

    // Difficulty
    const difficulty = document.createElement("p");
    difficulty.textContent = "Difficulty: " + question.difficulty;

    result.appendChild(difficulty);

    // Answer input
    const answerInput = document.createElement("textarea");
    answerInput.className = "viva-answer";
    answerInput.placeholder = "Type your answer here...";

    result.appendChild(answerInput);

    // Submit button
    const submitButton = document.createElement("button");
    submitButton.textContent = "Submit Answer";

    submitButton.onclick = () => {
        evaluateVivaAnswer(answerInput.value.trim(), submitButton);
    };

    result.appendChild(submitButton);
}


// Evaluate one answer using Gemini
async function evaluateVivaAnswer(answer, submitButton) {
    if (!answer) {
        alert("Please write your answer before submitting.");
        return;
    }

    const result = document.getElementById("result");
    const question = vivaQuestions[vivaIndex];

    submitButton.disabled = true;
    submitButton.textContent = "Evaluating...";

    const answerInput = result.querySelector(".viva-answer");

    if (answerInput) {
        answerInput.disabled = true;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/viva/evaluate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                code: vivaCode,
                language: vivaLanguage,
                question: question.question,
                userAnswer: answer
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Answer evaluation failed.");
        }

        vivaAnswers.push({
            question: question.question,
            answer: answer,
            score: data.score,
            feedback: data.feedback,
            idealAnswer: data.idealAnswer
        });

        const feedback = document.createElement("div");
        feedback.className = "viva-feedback";

        const score = document.createElement("h3");
        score.textContent = `Your score: ${data.score}/10`;

        const feedbackText = document.createElement("p");
        feedbackText.textContent = data.feedback;

        const idealHeading = document.createElement("h4");
        idealHeading.textContent = "Ideal answer";

        const idealText = document.createElement("p");
        idealText.textContent = data.idealAnswer;

        feedback.append(score, feedbackText, idealHeading, idealText);

        const nextButton = document.createElement("button");
        nextButton.className = "primary-btn";
        nextButton.textContent =
            vivaIndex === vivaQuestions.length - 1
                ? "View Final Results"
                : "Next Question →";

        nextButton.addEventListener("click", () => {
            vivaIndex++;
            renderVivaQuestion();
        });

        submitButton.remove();

        result.append(feedback, nextButton);

    } catch (error) {
        console.error("Viva evaluation error:", error);

        const errorText = document.createElement("p");
        errorText.textContent =
            "Evaluation failed: " + error.message +
            " You can retry your answer.";

        const retryButton = document.createElement("button");
        retryButton.className = "primary-btn";
        retryButton.textContent = "Retry Evaluation";

        retryButton.addEventListener("click", async () => {
            errorText.remove();
            retryButton.remove();

            await evaluateVivaAnswer(answer, submitButton);
        });

        submitButton.disabled = false;
        submitButton.textContent = "Submit Answer";

        if (answerInput) {
            answerInput.disabled = false;
        }

        result.append(errorText, retryButton);
    }
}


// Show final Viva report
function showVivaResults() {
    const result = document.getElementById("result");
    result.replaceChildren();

    const totalScore = vivaAnswers.reduce(
        (total, item) => total + item.score,
        0
    );

    const percentage = totalScore;

    let performance;

    if (percentage >= 85) {
        performance = "Excellent! Outstanding performance!";
    } else if (percentage >= 70) {
        performance = "Very good! Keep improving.";
    } else if (percentage >= 50) {
        performance = "Good effort! Revise the concepts.";
    } else {
        performance = "Keep practising. You can improve!";
    }

    const heading = document.createElement("h2");
    heading.textContent = "Your Viva Results";

    const score = document.createElement("h1");
    score.textContent = `${totalScore}/100`;

    const feedback = document.createElement("p");
    feedback.textContent = performance;

    const reviewHeading = document.createElement("h3");
    reviewHeading.textContent = "Question-wise Performance";

    result.append(heading, score, feedback, reviewHeading);

    vivaAnswers.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "viva-feedback";

        const question = document.createElement("h4");
        question.textContent = `Q${index + 1}. ${item.question}`;

        const marks = document.createElement("p");
        marks.textContent = `Score: ${item.score}/10`;

        const explanation = document.createElement("p");
        explanation.textContent = item.feedback;

        card.append(question, marks, explanation);
        result.append(card);
    });

    const restartButton = document.createElement("button");
    restartButton.className = "primary-btn";
    restartButton.textContent = "Start Another Viva";

    restartButton.addEventListener("click", () => {
        startViva(vivaCode);
    });

    result.append(restartButton);
}


// ------------------------------------
// ERROR DISPLAY
// ------------------------------------

function showError(message) {
    const result = document.getElementById("result");
    result.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "Something went wrong";

    const text = document.createElement("p");
    text.textContent = message;

    result.append(heading, text);
}


// ------------------------------------
// HISTORY STORAGE
// ------------------------------------

function getKodzivaHistory() {
    try {
        const history = JSON.parse(
            localStorage.getItem("kodzivaHistory") || "[]"
        );

        return Array.isArray(history) ? history : [];

    } catch (error) {
        return [];
    }
}


// ------------------------------------
// DASHBOARD STATISTICS
// ------------------------------------

function updateDashboard() {
    const history = getKodzivaHistory();

    const totalTasks = document.getElementById("total-tasks");
    const totalLanguages = document.getElementById("total-languages");
    const totalFeatures = document.getElementById("total-features");
    const activityList = document.getElementById("activity-list");

    if (totalTasks) {
        totalTasks.textContent = history.length;
    }

    if (totalLanguages) {
        totalLanguages.textContent = new Set(
            history.map(item => item.language).filter(Boolean)
        ).size;
    }

    if (totalFeatures) {
        totalFeatures.textContent = new Set(
            history.map(item => item.feature).filter(Boolean)
        ).size;
    }

    if (!activityList) return;

    activityList.replaceChildren();

    if (history.length === 0) {
        const message = document.createElement("p");
        message.className = "activity-empty";
        message.textContent =
            "No coding activity yet. Start using KODZIVA!";

        activityList.appendChild(message);
        return;
    }

    history.slice(0, 5).forEach(item => {
        const card = document.createElement("div");
        card.className = "activity-item";

        const title = document.createElement("h4");
        title.textContent = item.prompt || "Coding task";

        const details = document.createElement("p");
        details.textContent =
            `${item.language || "Unknown"} • ${item.feature || "Unknown"} • ${item.date || ""}`;

        card.append(title, details);
        activityList.appendChild(card);
    });
}


// ------------------------------------
// LEARNING PROGRESS TRACKER
// ------------------------------------

function updateLearningTracker() {
    const history = getKodzivaHistory();

    // Convert saved tasks into dates
    const getTaskDate = item => {
        const timestamp = Number(item.id);

        if (Number.isFinite(timestamp) && timestamp > 0) {
            return new Date(timestamp);
        }

        const parsedDate = new Date(item.date);

        return Number.isNaN(parsedDate.getTime())
            ? null
            : parsedDate;
    };

    const validTasks = history
        .map(item => ({
            ...item,
            taskDate: getTaskDate(item)
        }))
        .filter(item => item.taskDate !== null);

    // 1. Most-used programming language
    const languageCounts = {};

    validTasks.forEach(item => {
        const language = item.language || "Unknown";

        languageCounts[language] =
            (languageCounts[language] || 0) + 1;
    });

    const topLanguage = Object.entries(languageCounts)
        .sort((a, b) => b[1] - a[1])[0];

    const languageElement = document.getElementById("top-language");

    if (languageElement) {
        languageElement.textContent = topLanguage
            ? `${topLanguage[0]} (${topLanguage[1]} tasks)`
            : "Not available yet";
    }

    // 2. Weekly coding activity
    const weeklyChart = document.getElementById("weekly-chart");

    if (weeklyChart) {
        weeklyChart.replaceChildren();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        const weekCounts = [];

        for (let i = 6; i >= 0; i--) {
            const day = new Date(today);
            day.setDate(today.getDate() - i);

            const count = validTasks.filter(item => {
                const taskDay = new Date(item.taskDate);
                taskDay.setHours(0, 0, 0, 0);

                return taskDay.getTime() === day.getTime();
            }).length;

            weekCounts.push({
                label: days[day.getDay()],
                count: count
            });
        }

        const maxCount = Math.max(
            1,
            ...weekCounts.map(day => day.count)
        );

        weekCounts.forEach(day => {
            const dayContainer = document.createElement("div");
            dayContainer.className = "week-day";

            const barContainer = document.createElement("div");
            barContainer.className = "week-bar-container";

            const bar = document.createElement("div");
            bar.className = "week-bar";
            bar.style.height =
                `${Math.max(day.count > 0 ? 8 : 0, (day.count / maxCount) * 100)}%`;
            bar.title = `${day.count} coding tasks`;

            const countLabel = document.createElement("span");
            countLabel.textContent = day.count;

            const label = document.createElement("span");
            label.textContent = day.label;

            barContainer.appendChild(bar);

            dayContainer.append(
                countLabel,
                barContainer,
                label
            );

            weeklyChart.appendChild(dayContainer);
        });
    }

    // 3. Consecutive active days
    const activeDates = new Set(
        validTasks.map(item => {
            const date = new Date(item.taskDate);
            date.setHours(0, 0, 0, 0);

            return date.getTime();
        })
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let streak = 0;
    let currentDay = new Date(today);

    if (!activeDates.has(currentDay.getTime())) {
        currentDay = yesterday;
    }

    while (activeDates.has(currentDay.getTime())) {
        streak++;
        currentDay.setDate(currentDay.getDate() - 1);
    }

    const streakElement = document.getElementById("learning-streak");

    if (streakElement) {
        streakElement.textContent =
            `${streak} ${streak === 1 ? "day" : "days"}`;
    }

    // 4. Achievements
    const achievements = [];

    if (validTasks.length >= 1) {
        achievements.push("🌱 First Coding Task");
    }

    if (validTasks.length >= 5) {
        achievements.push("⚡ 5 Tasks Completed");
    }

    if (validTasks.length >= 10) {
        achievements.push("🚀 10 Tasks Completed");
    }

    if (
        new Set(validTasks.map(item => item.language).filter(Boolean)).size >= 3
    ) {
        achievements.push("💻 Multi-Language Explorer");
    }

    if (
        new Set(validTasks.map(item => item.feature).filter(Boolean)).size >= 3
    ) {
        achievements.push("🧠 AI Feature Explorer");
    }

    const achievementList = document.getElementById("achievement-list");

    if (achievementList) {
        achievementList.replaceChildren();

        if (achievements.length === 0) {
            const message = document.createElement("p");
            message.className = "activity-empty";
            message.textContent =
                "Complete your first coding task to earn a badge!";

            achievementList.appendChild(message);

        } else {
            achievements.forEach(name => {
                const badge = document.createElement("div");
                badge.className = "achievement-badge";
                badge.textContent = name;

                achievementList.appendChild(badge);
            });
        }
    }
}


// ------------------------------------
// CODE HISTORY PAGE
// ------------------------------------

function renderHistory() {
    const historyList = document.getElementById("history-list");

    if (!historyList) return;

    historyList.replaceChildren();

    const history = getKodzivaHistory();

    if (history.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent =
            "No saved results yet. Generate some code to see your history here.";

        historyList.appendChild(emptyMessage);
        return;
    }

    history.forEach(item => {
        const card = document.createElement("div");
        card.className = "history-card";

        const title = document.createElement("h3");
        title.textContent = item.prompt || "Untitled result";

        const details = document.createElement("p");
        details.textContent =
            `${item.language || "Unknown"} | ${item.feature || "AI"} | ${item.date || ""}`;

        const actions = document.createElement("div");
        actions.className = "history-actions";

        // View button
        const viewButton = document.createElement("button");
        viewButton.textContent = "View";

        viewButton.onclick = () => {
            const oldOutput = card.querySelector(".history-output");

            if (oldOutput) {
                oldOutput.remove();
                viewButton.textContent = "View";
                return;
            }

            const output = document.createElement("pre");
            output.className = "history-output";
            output.textContent = item.result || "";
            output.style.whiteSpace = "pre-wrap";
            output.style.overflowWrap = "anywhere";

            card.appendChild(output);
            viewButton.textContent = "Hide";
        };

        // Restore button
        const restoreButton = document.createElement("button");
        restoreButton.textContent = "Restore";

        restoreButton.onclick = () => {
            const input = document.getElementById("code-input");
            const language = document.getElementById("language");

            if (!input || !language) return;

            const targetPage = pageTitles[item.feature]
                ? item.feature
                : "generate";

            openPage(targetPage);

            input.value = item.prompt || "";
            language.value = item.language || "C";

            alert("Your previous prompt has been restored!");
        };

        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";

        deleteButton.onclick = () => {
            if (!confirm("Delete this history item?")) return;

            const updatedHistory = getKodzivaHistory().filter(
                entry => entry.id !== item.id
            );

            localStorage.setItem(
                "kodzivaHistory",
                JSON.stringify(updatedHistory)
            );

            renderHistory();
            updateDashboard();
            updateLearningTracker();
        };

        actions.append(viewButton, restoreButton, deleteButton);
        card.append(title, details, actions);

        historyList.appendChild(card);
    });
}


// ------------------------------------
// NAVIGATION BUTTONS
// ------------------------------------

document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.page);
    });
});


// ------------------------------------
// INITIAL DASHBOARD LOAD
// ------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    updateDashboard();
    updateLearningTracker();
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js")
            .then(() => {
                console.log("KODZIVA service worker registered.");
            })
            .catch((error) => {
                console.error("Service worker registration failed:", error);
            });
    });
}