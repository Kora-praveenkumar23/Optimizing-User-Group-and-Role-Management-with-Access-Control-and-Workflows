// ServiceNow Next Experience Simulator App State & Logic

// --- 1. CORE DATA STATE ---
const state = {
    currentUser: "admin", // admin, alice, bob
    users: [
        { sys_id: "usr_alice", username: "alice", first_name: "Alice", last_name: "Manager", title: "Project Manager", email: "alice@example.com", active: true },
        { sys_id: "usr_bob", username: "bob", first_name: "Bob", last_name: "Member", title: "Team Member", email: "bob@example.com", active: true }
    ],
    groups: [
        { sys_id: "grp_team", name: "Project Team Group", description: "Group for project collaboration", members: ["Alice Manager", "Bob Member"], roles: ["Team Member Role", "Task Table Role"] }
    ],
    roles: [
        { name: "Project Manager Role", description: "Full access to project and task tables", inherited: "Alice" },
        { name: "Team Member Role", description: "Restricted access to tasks and operations", inherited: "Project Team Group" },
        { name: "Project Table Role (u_project_table_role)", description: "Read/Write u_project_table", inherited: "Alice" },
        { name: "Task Table Role (u_task_table_role)", description: "Read/Write u_task_table2", inherited: "Project Team Group" }
    ],
    acls: [
        { type: "Record", operation: "read", name: "u_project_table", role: "u_project_table_role", active: true, desc: "Allows read access to Project Table." },
        { type: "Record", operation: "write", name: "u_project_table", role: "u_project_table_role", active: true, desc: "Allows edit access to Project Table." },
        { type: "Record", operation: "read", name: "u_task_table2", role: "u_task_table_role", active: true, desc: "Allows read access to Task Table." },
        { type: "Record", operation: "write", name: "u_task_table2", role: "u_task_table_role", active: true, desc: "Allows row-level edit to Task Table." },
        { type: "Field (*)", operation: "write", name: "u_task_table2.*", role: "u_project_manager_role", active: true, desc: "Restricts all task fields write-access to Project Manager." },
        { type: "Field", operation: "write", name: "u_task_table2.u_status", role: "u_team_member_role", active: true, desc: "Allows Team Member to edit task status field." },
        { type: "Field", operation: "write", name: "u_task_table2.u_comments", role: "u_team_member_role", active: true, desc: "Allows Team Member to edit task comments field." }
    ],
    projects: [
        { id: "proj_1", name: "Core Platform Migration", owner: "Alice Manager", deadline: "2026-10-01" }
    ],
    tasks: [
        { id: "task_1", name: "Initial Identity Setup", assigned_to: "bob", status: "Completed", comments: "Setup script executed successfully.", description: "Provision users Alice and Bob inside sys_user." }
    ],
    approvals: [],
    flowLogs: [
        "[System Initialize] Flow engine started. Standing by for u_task_table2 triggers..."
    ],
    walkthroughStep: 1
};

// --- 2. INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    // Populate form dropdowns
    populateOwnerDropdowns();
    
    // Render initial data
    renderUsers();
    renderGroups();
    renderRoles();
    renderACLs();
    renderProjects();
    renderTasks();
    renderApprovals();
    renderLogs();
    
    // Set initial navigator filter
    applyMenuSecurity();
});

// --- 3. IMPERSONATION AND NAVIGATION ENGINE ---
function switchUser(user) {
    state.currentUser = user;
    
    // Update avatar text
    const avatar = document.getElementById("current-user-avatar");
    if (user === "admin") {
        avatar.textContent = "SA";
        avatar.style.backgroundColor = "var(--accent-color)";
    } else if (user === "alice") {
        avatar.textContent = "AL";
        avatar.style.backgroundColor = "#5856d6";
    } else if (user === "bob") {
        avatar.textContent = "BO";
        avatar.style.backgroundColor = "#ff9500";
    }

    // Apply security limits to the navigator menu
    applyMenuSecurity();

    // Show a context banner
    showSecurityBanner(`Impersonating ${user === 'admin' ? 'System Administrator' : user === 'alice' ? 'Alice (Project Manager)' : 'Bob (Team Member)'}. ACL and module security recalculated.`, "info");

    // Close any open record forms to prevent stale ACL rendering
    hideProjectForm();
    hideTaskForm();

    // Refresh lists to show/hide edit options based on roles
    renderProjects();
    renderTasks();
    renderApprovals();

    // Sync walkthrough step cards visual state
    updateWalkthroughUI();
}

function applyMenuSecurity() {
    const user = state.currentUser;
    const sysSecurity = document.getElementById("section-system-security");
    const projTable = document.getElementById("menu-project-table");
    const flowLogs = document.getElementById("section-automation");

    // Default: Reset all to block/hide
    sysSecurity.style.display = "block";
    projTable.style.display = "flex";
    flowLogs.style.display = "block";

    if (user === "alice") {
        // Alice (Project Manager): No Admin Settings (sys_security) but has Projects, Tasks and Flow info
        sysSecurity.style.display = "none";
        projTable.style.display = "flex";
        
        // Show current view to projects/tasks if they were in security view
        const currentActive = document.querySelector(".nav-item.active");
        if (currentActive && (currentActive.dataset.nav === 'users' || currentActive.dataset.nav === 'groups' || currentActive.dataset.nav === 'roles' || currentActive.dataset.nav === 'acls')) {
            showView('projects');
        }
    } else if (user === "bob") {
        // Bob (Team Member): Restricted. Hides Project Module completely, Hides System Security
        sysSecurity.style.display = "none";
        projTable.style.display = "none";

        // If currently viewing projects or admin links, force view to Tasks
        const currentActive = document.querySelector(".nav-item.active");
        if (currentActive && (currentActive.dataset.nav === 'projects' || currentActive.dataset.nav === 'users' || currentActive.dataset.nav === 'groups' || currentActive.dataset.nav === 'roles' || currentActive.dataset.nav === 'acls')) {
            showView('tasks');
        }
    }
}

function showView(viewId) {
    // Hide all views
    const views = document.querySelectorAll(".content-view");
    views.forEach(v => v.classList.remove("active"));

    // Show target view
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add("active");

    // Update active nav-item in sidebar
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.classList.remove("active");
        if (item.getAttribute("onclick") === `showView('${viewId}')` || item.dataset.nav === viewId) {
            item.classList.add("active");
        }
    });

    hideSecurityBanner();
}

function filterNav() {
    const input = document.getElementById("filter-navigator");
    const filter = input.value.toLowerCase();
    const navSections = document.querySelectorAll(".nav-section");

    navSections.forEach(section => {
        let hasVisibleLink = false;
        const links = section.querySelectorAll(".nav-item");
        
        links.forEach(link => {
            const text = link.querySelector("span").textContent.toLowerCase();
            if (text.includes(filter)) {
                link.style.display = "flex";
                hasVisibleLink = true;
            } else {
                link.style.display = "none";
            }
        });

        // Hide whole section if no links match
        if (hasVisibleLink) {
            section.style.display = "block";
        } else {
            section.style.display = "none";
        }
    });
}

// --- 4. RENDER PROCEDURES ---
function populateOwnerDropdowns() {
    const projOwner = document.getElementById("project-owner");
    const taskAssigned = document.getElementById("task-assigned-to");
    
    projOwner.innerHTML = "";
    taskAssigned.innerHTML = "";

    state.users.forEach(u => {
        const nameStr = `${u.first_name} ${u.last_name}`;
        
        const optProj = document.createElement("option");
        optProj.value = nameStr;
        optProj.textContent = `${nameStr} (${u.title})`;
        projOwner.appendChild(optProj);

        const optTask = document.createElement("option");
        optTask.value = u.username;
        optTask.textContent = `${u.first_name} ${u.last_name} (${u.title})`;
        taskAssigned.appendChild(optTask);
    });
}

function renderUsers() {
    const tbody = document.getElementById("users-table-body");
    tbody.innerHTML = "";
    state.users.forEach(u => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${u.username}</b></td>
            <td>${u.first_name}</td>
            <td>${u.last_name}</td>
            <td>${u.title}</td>
            <td>${u.email}</td>
            <td><span class="status-indicator status-completed">Active</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderGroups() {
    const tbody = document.getElementById("groups-table-body");
    tbody.innerHTML = "";
    state.groups.forEach(g => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${g.name}</b></td>
            <td>${g.description}</td>
            <td>${g.members.map(m => `<span class="status-indicator status-new">${m}</span>`).join(" ")}</td>
            <td>${g.roles.map(r => `<span class="status-indicator status-approved">${r}</span>`).join(" ")}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderRoles() {
    const tbody = document.getElementById("roles-table-body");
    tbody.innerHTML = "";
    state.roles.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${r.name}</b></td>
            <td>${r.description}</td>
            <td><span class="status-indicator status-pending">${r.inherited}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderACLs() {
    const tbody = document.getElementById("acls-table-body");
    tbody.innerHTML = "";
    state.acls.forEach(a => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="status-indicator status-new">${a.type}</span></td>
            <td><b>${a.operation}</b></td>
            <td><code>${a.name}</code></td>
            <td><span class="status-indicator status-inprogress">${a.role}</span></td>
            <td><span class="status-indicator status-completed">Active</span></td>
            <td>${a.desc}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderProjects() {
    const tbody = document.getElementById("projects-table-body");
    tbody.innerHTML = "";
    
    state.projects.forEach(p => {
        const tr = document.createElement("tr");
        tr.onclick = () => showProjectForm(p.id);
        tr.innerHTML = `
            <td><b>${p.name}</b></td>
            <td>${p.owner}</td>
            <td>${p.deadline}</td>
        `;
        tbody.appendChild(tr);
    });

    // Disable Project creation button if User is Bob (due to ACL security)
    const newBtn = document.getElementById("new-project-btn");
    if (state.currentUser === "bob") {
        newBtn.disabled = true;
        newBtn.title = "Access Restricted: Requires u_project_table_role role.";
    } else {
        newBtn.disabled = false;
        newBtn.title = "";
    }
}

function renderTasks() {
    const tbody = document.getElementById("tasks-table-body");
    tbody.innerHTML = "";
    
    state.tasks.forEach(t => {
        const assignedUser = state.users.find(u => u.username === t.assigned_to);
        const assignedName = assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : t.assigned_to;
        
        const tr = document.createElement("tr");
        tr.onclick = () => showTaskForm(t.id);
        
        let statusClass = "status-new";
        if (t.status === "In Progress") statusClass = "status-inprogress";
        else if (t.status === "Completed") statusClass = "status-completed";
        else if (t.status === "Pending Approval") statusClass = "status-pending";
        else if (t.status === "Approved") statusClass = "status-approved";

        tr.innerHTML = `
            <td><b>${t.name}</b></td>
            <td>${assignedName}</td>
            <td><span class="status-indicator ${statusClass}">${t.status}</span></td>
            <td><i>${t.comments || ""}</i></td>
            <td>${t.description || ""}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderApprovals() {
    const tbody = document.getElementById("approvals-table-body");
    const badge = document.getElementById("approval-badge");
    tbody.innerHTML = "";

    let pendingCount = 0;
    
    state.approvals.forEach(a => {
        if (a.state === "Requested") pendingCount++;

        const tr = document.createElement("tr");
        
        let stateClass = "status-pending";
        if (a.state === "Approved") stateClass = "status-approved";
        else if (a.state === "Rejected") stateClass = "status-new";

        let actionCell = "";
        if (a.state === "Requested") {
            // Check if current user is the approver (Alice) or Admin
            if (state.currentUser === "alice" || state.currentUser === "admin") {
                actionCell = `
                    <div style="display:flex; gap: 6px;">
                        <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); resolveApproval('${a.id}', 'Approved')">Approve</button>
                        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); resolveApproval('${a.id}', 'Rejected')">Reject</button>
                    </div>
                `;
            } else {
                actionCell = `<small style="color:var(--text-muted);">Waiting for Alice</small>`;
            }
        } else {
            actionCell = `Resolved`;
        }

        tr.innerHTML = `
            <td><span class="status-indicator ${stateClass}">${a.state}</span></td>
            <td><b>${a.approver}</b></td>
            <td>${a.target}</td>
            <td>${a.requested_date}</td>
            <td>${actionCell}</td>
        `;
        tbody.appendChild(tr);
    });

    // Update notification badge next to My Approvals in navigator
    if (pendingCount > 0 && (state.currentUser === "alice" || state.currentUser === "admin")) {
        badge.textContent = pendingCount;
        badge.style.display = "inline-block";
    } else {
        badge.style.display = "none";
    }
}

function renderLogs() {
    const consoleLogs = document.getElementById("flow-execution-logs");
    consoleLogs.innerHTML = "";
    
    state.flowLogs.forEach(log => {
        const line = document.createElement("div");
        line.className = "log-line";
        
        if (log.includes("[TRIGGER]")) {
            line.classList.add("trigger-log");
        } else if (log.includes("[ACTION]")) {
            line.classList.add("action-log");
        } else if (log.includes("[APPROVAL]")) {
            line.classList.add("approval-log");
        } else if (log.includes("[SUCCESS]")) {
            line.classList.add("success-log");
        } else {
            line.classList.add("system");
        }
        
        line.textContent = log;
        consoleLogs.appendChild(line);
    });
    
    // Scroll to bottom
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

function addLog(text) {
    const timestamp = new Date().toLocaleTimeString();
    state.flowLogs.push(`[${timestamp}] ${text}`);
    renderLogs();
}

function clearLogs() {
    state.flowLogs = ["[System Initialize] Flow engine standing by..."];
    renderLogs();
}

// --- 5. FORM MANAGEMENT & ACL FIELD ENFORCEMENT ---

function showProjectForm(id = null) {
    const user = state.currentUser;
    
    // ACL Check: Bob does not have u_project_table_role
    if (user === "bob") {
        showSecurityBanner("Security constraints prevent creating/editing Project Table (u_project_table) records.", "danger");
        return;
    }

    document.getElementById("project-list-container").style.display = "none";
    const formCard = document.getElementById("project-form-card");
    formCard.style.display = "flex";

    const nameInput = document.getElementById("project-name");
    const ownerSelect = document.getElementById("project-owner");
    const deadlineInput = document.getElementById("project-deadline");

    if (id) {
        // Edit record
        const proj = state.projects.find(p => p.id === id);
        document.getElementById("project-form-title").textContent = `Project Record: ${proj.name}`;
        document.getElementById("project-id").value = proj.id;
        
        nameInput.value = proj.name;
        ownerSelect.value = proj.owner;
        deadlineInput.value = proj.deadline;
        
        // Alice has write privilege
        nameInput.disabled = false;
        ownerSelect.disabled = false;
        deadlineInput.disabled = false;
        document.getElementById("save-project-btn").style.display = "inline-flex";
    } else {
        // New record
        document.getElementById("project-form-title").textContent = "New Project Record";
        document.getElementById("project-id").value = "";
        document.getElementById("project-form").reset();
        
        nameInput.disabled = false;
        ownerSelect.disabled = false;
        deadlineInput.disabled = false;
        document.getElementById("save-project-btn").style.display = "inline-flex";
    }
}

function hideProjectForm() {
    document.getElementById("project-list-container").style.display = "block";
    document.getElementById("project-form-card").style.display = "none";
    hideSecurityBanner();
}

function saveProject() {
    const id = document.getElementById("project-id").value;
    const name = document.getElementById("project-name").value;
    const owner = document.getElementById("project-owner").value;
    const deadline = document.getElementById("project-deadline").value;

    if (!name || !owner || !deadline) {
        alert("Please fill in all required fields.");
        return;
    }

    if (id) {
        // Update
        const proj = state.projects.find(p => p.id === id);
        proj.name = name;
        proj.owner = owner;
        proj.deadline = deadline;
        showSecurityBanner(`Record ${id} updated successfully.`, "success");
    } else {
        // Insert
        const newProj = {
            id: `proj_${state.projects.length + 1}`,
            name,
            owner,
            deadline
        };
        state.projects.push(newProj);
        showSecurityBanner("New Project record inserted successfully.", "success");
        
        // Walkthrough hook
        if (state.walkthroughStep === 1) {
            state.walkthroughStep = 2;
            document.getElementById("btn-guide-step-2").removeAttribute("disabled");
            updateWalkthroughUI();
        }
    }

    renderProjects();
    hideProjectForm();
}

function showTaskForm(id = null) {
    document.getElementById("task-list-container").style.display = "none";
    const formCard = document.getElementById("task-form-card");
    formCard.style.display = "flex";

    const nameInput = document.getElementById("task-name");
    const assignedSelect = document.getElementById("task-assigned-to");
    const statusSelect = document.getElementById("task-status");
    const descText = document.getElementById("task-description");
    const commentsText = document.getElementById("task-comments");

    const user = state.currentUser;

    if (id) {
        // Edit record
        const task = state.tasks.find(t => t.id === id);
        document.getElementById("task-form-title").textContent = `Task Record: ${task.name}`;
        document.getElementById("task-id").value = task.id;
        
        nameInput.value = task.name;
        assignedSelect.value = task.assigned_to;
        statusSelect.value = task.status;
        descText.value = task.description || "";
        commentsText.value = task.comments || "";
        
        // Enforce Field-Level ACLs
        if (user === "bob") {
            // Bob (Team Member) can write ONLY to Status and Comments
            nameInput.disabled = true;
            assignedSelect.disabled = true;
            descText.disabled = true;
            
            statusSelect.disabled = false;
            commentsText.disabled = false;
            
            // UI badges update
            document.getElementById("task-name-acl").textContent = "Read-Only (Locked by ACL)";
            document.getElementById("task-assigned-to-acl").textContent = "Read-Only (Locked by ACL)";
            document.getElementById("task-description-acl").textContent = "Read-Only (Locked by ACL)";
            
            document.getElementById("task-status-acl").textContent = "Write allowed for u_team_member_role";
            document.getElementById("task-comments-acl").textContent = "Write allowed for u_team_member_role";
            
            showSecurityBanner("ACL Security Active: Fields 'Task Name', 'Assigned To', and 'Description' are locked.", "info");
        } else {
            // Alice/Admin: Full write
            nameInput.disabled = false;
            assignedSelect.disabled = false;
            statusSelect.disabled = false;
            descText.disabled = false;
            commentsText.disabled = false;

            document.getElementById("task-name-acl").textContent = "ACL: write allowed for u_project_manager_role";
            document.getElementById("task-assigned-to-acl").textContent = "ACL: write allowed for u_project_manager_role";
            document.getElementById("task-description-acl").textContent = "ACL: write allowed for u_project_manager_role";
            document.getElementById("task-status-acl").textContent = "ACL: write allowed for u_project_manager_role";
            document.getElementById("task-comments-acl").textContent = "ACL: write allowed for u_project_manager_role";
        }
    } else {
        // New record
        if (user === "bob") {
            // Bob cannot create new tasks directly
            showSecurityBanner("Security constraint: Team Members are not authorized to create tasks.", "danger");
            hideTaskForm();
            return;
        }

        document.getElementById("task-form-title").textContent = "New Task Record";
        document.getElementById("task-id").value = "";
        document.getElementById("task-form").reset();
        
        nameInput.disabled = false;
        assignedSelect.disabled = false;
        statusSelect.disabled = false;
        descText.disabled = false;
        commentsText.disabled = false;
    }
}

function hideTaskForm() {
    document.getElementById("task-list-container").style.display = "block";
    document.getElementById("task-form-card").style.display = "none";
    hideSecurityBanner();
}

function saveTask() {
    const id = document.getElementById("task-id").value;
    const name = document.getElementById("task-name").value;
    const assigned_to = document.getElementById("task-assigned-to").value;
    const status = document.getElementById("task-status").value;
    const description = document.getElementById("task-description").value;
    const comments = document.getElementById("task-comments").value;

    if (!name || !assigned_to || !status) {
        alert("Please fill in all required fields.");
        return;
    }

    let savedTask = null;

    if (id) {
        // Update
        savedTask = state.tasks.find(t => t.id === id);
        // Only update fields that the user is authorized to edit
        if (state.currentUser === "bob") {
            savedTask.status = status;
            savedTask.comments = comments;
        } else {
            savedTask.name = name;
            savedTask.assigned_to = assigned_to;
            savedTask.status = status;
            savedTask.description = description;
            savedTask.comments = comments;
        }
        showSecurityBanner(`Record ${id} updated successfully.`, "success");
    } else {
        // Insert (Only Alice/Admin can reach here)
        savedTask = {
            id: `task_${state.tasks.length + 1}`,
            name,
            assigned_to,
            status,
            description,
            comments
        };
        state.tasks.push(savedTask);
        showSecurityBanner("New Task record inserted successfully.", "success");
        
        // Walkthrough hook
        if (state.walkthroughStep === 2) {
            state.walkthroughStep = 3;
            document.getElementById("btn-guide-step-3").removeAttribute("disabled");
            updateWalkthroughUI();
        }
    }

    renderTasks();
    hideTaskForm();

    // TRIGGER FLOW DESIGNER AUTOMATION TRIGGER CHECK
    checkAndRunFlow(savedTask);
}

// --- 6. FLOW DESIGNER SIMULATION ---
function checkAndRunFlow(task) {
    // Conditions: status = "In Progress", comments contains "Feedback", assigned to = "bob"
    const hasStatus = task.status === "In Progress";
    const hasComment = task.comments && task.comments.toLowerCase().includes("feedback");
    const hasAssigned = task.assigned_to === "bob";

    if (hasStatus && hasComment && hasAssigned) {
        // Trigger visual logs highlight
        addLog(`[TRIGGER] Flow 'Task Table Automation Flow' triggered by record: ${task.id} (${task.name})`);
        addLog(`[TRIGGER] Conditions met: status=In Progress, comments contains 'Feedback', assigned_to=bob`);
        
        // Step 1: Update status to Completed
        setTimeout(() => {
            task.status = "Completed";
            renderTasks();
            addLog(`[ACTION] Step 1: Updating Status to 'Completed' (Auto-completed)`);
            
            // Step 2: Request Approval from Alice
            setTimeout(() => {
                const approvalId = `appr_${state.approvals.length + 1}`;
                const newApproval = {
                    id: approvalId,
                    state: "Requested",
                    approver: "Alice Manager",
                    target: `Task Table 2: ${task.name}`,
                    target_task_id: task.id,
                    requested_date: new Date().toLocaleDateString()
                };
                
                state.approvals.push(newApproval);
                renderApprovals();
                
                addLog(`[ACTION] Step 2: Requested approval from Alice Manager. Approval ID: ${approvalId}`);
                addLog(`[SUCCESS] Flow execution paused. Waiting for Alice's approval decision.`);
                
                showSecurityBanner(`Flow Automation Triggered: Task set to Completed. Approval sent to Alice.`, "success");
                
                // Active Flow logs view automatically
                setTimeout(() => {
                    showView("flow-designer");
                }, 1500);

                // Walkthrough hook
                if (state.walkthroughStep === 4) {
                    state.walkthroughStep = 5;
                    document.getElementById("btn-guide-step-5").removeAttribute("disabled");
                    updateWalkthroughUI();
                }

            }, 800);
        }, 800);
    }
}

function resolveApproval(approvalId, decision) {
    const approval = state.approvals.find(a => a.id === approvalId);
    if (!approval) return;

    approval.state = decision;
    
    // Update target task
    const task = state.tasks.find(t => t.id === approval.target_task_id);
    if (task) {
        if (decision === "Approved") {
            task.status = "Approved";
            addLog(`[APPROVAL] Alice Manager APPROVED Task completion for '${task.name}'`);
            addLog(`[SUCCESS] Flow execution completed successfully. Task resolved.`);
        } else {
            task.status = "New"; // Send back
            addLog(`[APPROVAL] Alice Manager REJECTED Task completion for '${task.name}'`);
            addLog(`[SUCCESS] Task status reset to New.`);
        }
    }

    renderTasks();
    renderApprovals();
    
    showSecurityBanner(`Approval ${approvalId} set to ${decision}. Task state updated.`, "success");

    // Walkthrough final hook
    if (state.walkthroughStep === 5 && decision === "Approved") {
        state.walkthroughStep = 6;
        updateWalkthroughUI();
    }
}

// --- 7. SECURITY BANNER UTILS ---
function showSecurityBanner(text, type = "danger") {
    const banner = document.getElementById("security-alert-banner");
    const bannerText = document.getElementById("security-alert-text");
    
    bannerText.textContent = text;
    banner.style.display = "flex";
    
    // Style adjustments
    if (type === "danger") {
        banner.style.backgroundColor = "rgba(220, 53, 69, 0.9)";
    } else if (type === "success") {
        banner.style.backgroundColor = "rgba(25, 135, 84, 0.9)";
    } else if (type === "info") {
        banner.style.backgroundColor = "rgba(13, 110, 253, 0.9)";
    }
}

function hideSecurityBanner() {
    document.getElementById("security-alert-banner").style.display = "none";
}

// --- 8. GUIDED WALKTHROUGH ENGINE ---
function updateWalkthroughUI() {
    const step = state.walkthroughStep;
    
    // Reset all step cards
    for (let i = 1; i <= 5; i++) {
        const card = document.getElementById(`wt-step-${i}`);
        card.className = "step-card";
        if (i < step) {
            card.classList.add("completed");
        } else if (i === step) {
            card.classList.add("active");
        }
    }

    // Special completed card when done
    if (step === 6) {
        // Complete workflow
        const wtPanel = document.querySelector(".walkthrough-steps");
        wtPanel.innerHTML = `
            <div class="step-card completed" style="width:100%; display:flex; flex-direction:column; gap:10px; align-items:center; text-align:center; padding: 24px;">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--color-completed)" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <h3 style="color:var(--color-completed); font-size:16px;">Walkthrough Complete!</h3>
                <p style="font-size:12px; line-height:1.5;">You have successfully demonstrated:<br>
                1. <b>Identity Provisioning</b> (Alice & Bob Setup)<br>
                2. <b>Module Security</b> (Bob cannot access Project Table)<br>
                3. <b>ACL Field-level Enforcement</b> (Bob's edit rights limited)<br>
                4. <b>Flow Designer Automation</b> (Trigger checks and automated execution logs)<br>
                5. <b>Manager Approvals</b> (Flow routing to Alice)</p>
                <button class="btn btn-primary btn-sm" onclick="resetWalkthrough()">Reset Walkthrough</button>
            </div>
        `;
    }
}

function guideStep1() {
    // Switch to Alice
    document.getElementById("impersonate-select").value = "alice";
    switchUser("alice");
    showView("projects");
    showProjectForm();
    
    // Auto-fill Project details
    document.getElementById("project-name").value = "ServiceNow Integration Project";
    document.getElementById("project-deadline").value = "2026-08-30";
    
    showSecurityBanner("Alice Impersonated. Creating project 'ServiceNow Integration Project' for step 1. Click Save.", "info");
}

function guideStep2() {
    // Create new Task
    showView("tasks");
    showTaskForm();
    
    // Auto-fill Task
    document.getElementById("task-name").value = "Configure Integration Flow";
    document.getElementById("task-assigned-to").value = "bob";
    document.getElementById("task-status").value = "New";
    document.getElementById("task-description").value = "Bob needs to test Flow Designer triggers by writing comments containing 'Feedback' and setting status to 'In Progress'.";
    
    showSecurityBanner("Task form pre-filled. Assigned to Bob. Click Save.", "info");
}

function guideStep3() {
    // Switch to Bob
    document.getElementById("impersonate-select").value = "bob";
    switchUser("bob");
    
    // Navigate to tasks
    showView("tasks");
    
    // Search the list and open the newly created task
    const task = state.tasks.find(t => t.name === "Configure Integration Flow");
    if (task) {
        showTaskForm(task.id);
        
        // Show walkthrough progress
        state.walkthroughStep = 4;
        document.getElementById("btn-guide-step-4").removeAttribute("disabled");
        updateWalkthroughUI();
        
        showSecurityBanner("Bob Impersonated. Notice fields locked by ACLs! Only Status and Comments can be written.", "info");
    } else {
        alert("Task not found. Please complete Step 2.");
    }
}

function guideStep4() {
    // Trigger Flow
    const taskId = document.getElementById("task-id").value;
    if (!taskId) {
        alert("Please open the Task first by completing Step 3.");
        return;
    }
    
    // Auto populate comments and status to trigger flow
    document.getElementById("task-status").value = "In Progress";
    document.getElementById("task-comments").value = "Ready for feedback review.";
    
    showSecurityBanner("Inputs pre-filled: Status=In Progress, Comments contains 'feedback'. Click Save to trigger Flow Designer automation.", "info");
}

function guideStep5() {
    // Switch to Alice
    document.getElementById("impersonate-select").value = "alice";
    switchUser("alice");
    
    // Go to approvals view
    showView("approvals");
    showSecurityBanner("Alice Impersonated. View My Approvals. Click 'Approve' to complete task integration.", "info");
}

function resetWalkthrough() {
    // Reset state to initial
    state.currentUser = "admin";
    state.projects = [{ id: "proj_1", name: "Core Platform Migration", owner: "Alice Manager", deadline: "2026-10-01" }];
    state.tasks = [{ id: "task_1", name: "Initial Identity Setup", assigned_to: "bob", status: "Completed", comments: "Setup script executed successfully.", description: "Provision users Alice and Bob inside sys_user." }];
    state.approvals = [];
    state.flowLogs = ["[System Initialize] Flow engine standing by..."];
    state.walkthroughStep = 1;
    
    // Restore Walkthrough Sidebar HTML structure
    const wtPanel = document.querySelector(".walkthrough-panel");
    wtPanel.innerHTML = `
        <div class="walkthrough-header">
            <h3>Scenario Walkthrough</h3>
            <p>Follow these steps to validate ACLs & Flow Designer.</p>
        </div>
        <div class="walkthrough-steps">
            <div class="step-card active" id="wt-step-1">
                <div class="step-num">1</div>
                <div class="step-card-content">
                    <h4>Initialize as Alice</h4>
                    <p>Switch user in the top header to <b>Alice (Project Manager)</b>.</p>
                    <p>Navigate to <b>Project Table</b>, click <b>New</b>, and create a Project. (Alice has full access).</p>
                    <button class="btn btn-secondary btn-sm wt-btn" onclick="guideStep1()">Start Step 1</button>
                </div>
            </div>
            <div class="step-card" id="wt-step-2">
                <div class="step-num">2</div>
                <div class="step-card-content">
                    <h4>Create & Assign Task</h4>
                    <p>Still as Alice, go to <b>Task Table 2</b>, click <b>New</b>.</p>
                    <p>Create a task, set <b>Assigned To = Bob</b>, Status = <b>New</b>, and click <b>Save</b>.</p>
                    <button class="btn btn-secondary btn-sm wt-btn" id="btn-guide-step-2" onclick="guideStep2()" disabled>Proceed</button>
                </div>
            </div>
            <div class="step-card" id="wt-step-3">
                <div class="step-num">3</div>
                <div class="step-card-content">
                    <h4>Impersonate Bob & Test ACLs</h4>
                    <p>Switch user to <b>Bob (Team Member)</b>.</p>
                    <p>Verify that <b>Project Table</b> navigator is hidden. Go to <b>Task Table 2</b> and open Bob's task.</p>
                    <p>Observe that <i>Task Name</i> and <i>Description</i> are locked (Read-only ACLs in action!).</p>
                    <button class="btn btn-secondary btn-sm wt-btn" id="btn-guide-step-3" onclick="guideStep3()" disabled>Proceed</button>
                </div>
            </div>
            <div class="step-card" id="wt-step-4">
                <div class="step-num">4</div>
                <div class="step-card-content">
                    <h4>Trigger Flow Automation</h4>
                    <p>As Bob, set Status = <b>In Progress</b> and write <code>Feedback</code> in the Comments field, then click <b>Save</b>.</p>
                    <p>This triggers the Flow Designer flow! Task status will auto-complete and send approval to Alice.</p>
                    <button class="btn btn-secondary btn-sm wt-btn" id="btn-guide-step-4" onclick="guideStep4()" disabled>Proceed</button>
                </div>
            </div>
            <div class="step-card" id="wt-step-5">
                <div class="step-num">5</div>
                <div class="step-card-content">
                    <h4>Alice Approves Task</h4>
                    <p>Impersonate <b>Alice</b> again. Navigate to <b>My Approvals</b> (badge shows pending approval).</p>
                    <p>Click <b>Approve</b>. The task will be fully resolved! Check the Task list and Flow logs.</p>
                    <button class="btn btn-success btn-sm wt-btn" id="btn-guide-step-5" onclick="guideStep5()" disabled>Complete Workflow</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById("impersonate-select").value = "admin";
    switchUser("admin");
    showView("users");
    
    // Reload form lists
    populateOwnerDropdowns();
    renderUsers();
    renderGroups();
    renderRoles();
    renderACLs();
    renderProjects();
    renderTasks();
    renderApprovals();
    renderLogs();
}
