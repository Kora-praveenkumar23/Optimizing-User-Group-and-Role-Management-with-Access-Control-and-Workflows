/**
 * ServiceNow Schema & Table Configuration Guide / Script
 * 
 * Description: Outlines the creation of Project Table and Task Table 2.
 * tables can be created via System Definition > Tables in the ServiceNow UI, 
 * or programmatically defined here.
 */

// Schema Details for Custom Tables:

var schemaDefinition = {
    "u_project_table": {
        "label": "Project Table",
        "name": "u_project_table",
        "super_class": "", // Extends nothing (base table)
        "columns": [
            { "name": "u_project_name", "label": "Project Name", "type": "string", "max_length": 100 },
            { "name": "u_owner", "label": "Owner", "type": "reference", "reference_table": "sys_user" },
            { "name": "u_deadline", "label": "Deadline", "type": "glide_date" }
        ],
        "roles": {
            "read": "u_project_table_role",
            "write": "u_project_table_role",
            "create": "u_project_table_role",
            "delete": "u_project_table_role"
        }
    },
    "u_task_table2": {
        "label": "Task Table 2",
        "name": "u_task_table2",
        "super_class": "", // Extends nothing (base table)
        "columns": [
            { "name": "u_task_name", "label": "Task Name", "type": "string", "max_length": 100 },
            { "name": "u_description", "label": "Description", "type": "string", "max_length": 1000 },
            { "name": "u_status", "label": "Status", "type": "choice", "choices": ["New", "In Progress", "Completed", "Pending Approval", "Approved"] },
            { "name": "u_comments", "label": "Comments", "type": "string", "max_length": 4000 },
            { "name": "u_assigned_to", "label": "Assigned To", "type": "reference", "reference_table": "sys_user" }
        ],
        "roles": {
            "read": "u_task_table_role",
            "write": "u_task_table_role",
            "create": "u_task_table_role",
            "delete": "u_task_table_role"
        }
    }
};

/**
 * Note on ServiceNow table creation:
 * 
 * 1. Navigate to: System Definition > Tables.
 * 2. Click New and fill out:
 *    - Label: Project Table
 *    - Name: u_project_table
 *    - Check "Create Module" and "Create Mobile Module".
 *    - Add columns:
 *      - Project Name (String, 100)
 *      - Owner (Reference -> sys_user)
 *      - Deadline (Date)
 * 3. Submit.
 * 
 * 4. Click New again:
 *    - Label: Task Table 2
 *    - Name: u_task_table2
 *    - Add columns:
 *      - Task Name (String, 100)
 *      - Description (String, 1000)
 *      - Status (Choice: New, In Progress, Completed, Pending Approval, Approved)
 *      - Comments (String, 4000)
 *      - Assigned To (Reference -> sys_user)
 * 5. Submit.
 */

gs.info("Tables schema definition ready for deployment.");
