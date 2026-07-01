# Test Plan: AI Integration Features

## What Changed
- New floating AI Assistant panel (FAB button, chat interface)
- AI Insights widget on Dashboard (revenue/occupancy/guest insights)
- AI Task Suggestions on Tasks page (auto-suggest based on reservations)
- AI Reply Suggestions in ChatThread (smart reply drafts for guest messages)

## Environment
- Dev server: http://localhost:5178
- Login: test@mybutlr.com / TestPass123!
- Role: Owner (default, shows all features)

---

## Test 1: AI Assistant Panel — Visibility & Interaction

**Goal**: Verify the floating AI assistant is accessible and responds to prompts.

**Steps**:
1. On any `/app/*` page, look for a purple/primary FAB button in the bottom-right corner with a Sparkles icon.
2. Click the FAB — a chat panel should appear (380px wide, 560px tall) with:
   - Header: "Assistant IA" / "Votre concierge intelligent"
   - Welcome screen with 4 quick prompt buttons
   - Text input at the bottom
3. Click the "Tâches prioritaires" quick prompt button.
4. Wait ~1-2s for the mock response.
5. Verify the assistant responds with a message containing "tâches prioritaires" content (mentions urgent, today, this week).

**Pass/Fail Criteria**:
- PASS: FAB visible, panel opens on click, quick prompt triggers a response with task-related content, user message shown as right-aligned bubble, assistant response as left-aligned bubble.
- FAIL: FAB missing, panel doesn't open, no response appears, or response is empty/error.

---

## Test 2: AI Assistant — Keyword Chat Response

**Goal**: Verify the assistant responds contextually to typed messages.

**Steps**:
1. With the assistant panel open, type "Analyse mes revenus" and press Enter.
2. Wait for response (~1-2s).
3. Verify response contains revenue-related content: "+12%", "850€", "Villa Azure".

**Pass/Fail Criteria**:
- PASS: Response contains specific revenue figures and recommendations.
- FAIL: Generic response or no response.

---

## Test 3: AI Insights Widget on Dashboard

**Goal**: Verify the AI insights card renders on the dashboard with categorized insights.

**Steps**:
1. Navigate to `/app` (Dashboard).
2. Look for a card with a Sparkles icon and "Insights IA" header.
3. Verify at least 2 insight items are displayed, each with:
   - An icon (colored)
   - A title
   - A description
   - Optionally an action link

**Pass/Fail Criteria**:
- PASS: "Insights IA" card visible with categorized insights (revenue/occupancy/opportunity items), each with title + description.
- FAIL: Card missing, shows only loading skeleton permanently, or shows 0 insights.

---

## Test 4: AI Task Suggestions on Tasks Page

**Goal**: Verify AI suggests tasks above the Kanban board.

**Steps**:
1. Navigate to `/app/tasks`.
2. Look for a card with Sparkles icon and "Tâches suggérées" label above the Kanban columns.
3. Verify at least one suggestion card appears with:
   - A title (task name)
   - A description
   - A confidence percentage
   - An "Ajouter" button and dismiss (X) button

**Pass/Fail Criteria**:
- PASS: Suggestion card(s) visible with title, description, confidence %, and action buttons.
- FAIL: No suggestions card, or card shows permanent loading state.

---

## Test 5: AI Task Suggestion — Accept Action

**Goal**: Verify accepting a suggestion creates a real task.

**Steps**:
1. On `/app/tasks`, note the current count in the "To do" column.
2. Click "Ajouter" on a suggested task.
3. Verify:
   - The suggestion disappears from the AI card
   - A success indicator appears ("1 tâche(s) créée(s)")
   - The "To do" column count increments by 1

**Pass/Fail Criteria**:
- PASS: Task created (column count +1), suggestion removed, success message shown.
- FAIL: No task created, suggestion remains, or error shown.

---

## Test 6: AI Assistant Panel — Close & Reopen

**Goal**: Verify panel can be closed and reopened, and history persists.

**Steps**:
1. With messages in the assistant, click the Minimize icon (or the FAB again).
2. Panel should close (disappear or animate out).
3. Click the FAB again — panel should reopen with previous messages still visible.

**Pass/Fail Criteria**:
- PASS: Panel closes, reopens with chat history intact.
- FAIL: Panel doesn't close, or reopens empty.

---

## Test 7: AI Assistant — Clear History

**Goal**: Verify the trash icon clears conversation history.

**Steps**:
1. With messages in the assistant panel, click the Trash icon in the header.
2. Verify all messages disappear and the welcome screen (quick prompts) shows again.

**Pass/Fail Criteria**:
- PASS: Messages cleared, welcome screen with quick prompts visible.
- FAIL: Messages persist after clicking trash.
