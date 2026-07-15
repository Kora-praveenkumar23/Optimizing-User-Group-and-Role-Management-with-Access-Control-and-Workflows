/**
 * ServiceNow Background Script - Access Control Lists (ACLs) Configuration
 * 
 * Description: Programmatically configures application security and field-level permissions.
 * Alice (Project Manager Role) gets full access.
 * Bob (Team Member Role) is restricted to writing only to 'status' and 'comments' fields in Task Table 2.
 * 
 * Run this in: System Definition > Scripts - Background (Elevated Privilege 'security_admin' required).
 */

(function() {
    gs.info("=== START: Access Control List (ACL) Configuration ===");

    // Role Names
    var managerRole = "u_project_manager_role";
    var teamRole = "u_team_member_role";
    var taskTableRole = "u_task_table_role";
    var projectTableRole = "u_project_table_role";

    // 1. PROJECT TABLE ACCESS (u_project_table)
    // Only Project Manager has read and write
    createACL("u_project_table", "read", projectTableRole);
    createACL("u_project_table", "write", projectTableRole);
    createACL("u_project_table", "create", projectTableRole);
    
    // 2. TASK TABLE 2 ACCESS (u_task_table2)
    // Both Project Manager and Team Member (via taskTableRole) can read records
    createACL("u_task_table2", "read", taskTableRole);
    createACL("u_task_table2.*", "read", taskTableRole); // Field-level read for all fields

    // Both roles can write at the table level (needed so Bob can save his edits)
    createACL("u_task_table2", "write", taskTableRole);

    // Write ACLs for individual fields:
    // 2.a. Default fields: Only Project Manager role can edit
    createACL("u_task_table2.*", "write", managerRole);

    // 2.b. status field: both Manager and Team Member roles can write
    var statusACL = createACL("u_task_table2.u_status", "write", managerRole);
    addRoleToACL(statusACL, teamRole);

    // 2.c. comments field: both Manager and Team Member roles can write
    var commentsACL = createACL("u_task_table2.u_comments", "write", managerRole);
    addRoleToACL(commentsACL, teamRole);

    gs.info("=== END: ACL Configuration completed ===");

    // --- Helper Functions ---

    function createACL(name, operation, requiredRoleName) {
        var aclGR = new GlideRecord("sys_security_acl");
        aclGR.addQuery("name", name);
        aclGR.addQuery("operation", operation);
        aclGR.query();

        var aclSysId = "";
        if (aclGR.next()) {
            gs.info("ACL already exists: " + operation + " on " + name);
            aclSysId = aclGR.getUniqueValue();
        } else {
            aclGR.initialize();
            aclGR.name = name;
            aclGR.operation = operation;
            aclGR.type = "record";
            aclGR.active = true;
            aclSysId = aclGR.insert();
            gs.info("Created ACL: " + operation + " on " + name + " (SysID: " + aclSysId + ")");
        }

        if (aclSysId && requiredRoleName) {
            addRoleToACL(aclSysId, requiredRoleName);
        }
        return aclSysId;
    }

    function addRoleToACL(aclSysId, roleName) {
        // Find Role SysID
        var roleGR = new GlideRecord("sys_user_role");
        roleGR.addQuery("name", roleName);
        roleGR.query();
        if (!roleGR.next()) {
            gs.error("Role not found for ACL assignment: " + roleName);
            return;
        }
        var roleSysId = roleGR.getUniqueValue();

        // Assign Role to ACL
        var aclRoleGR = new GlideRecord("sys_security_acl_role");
        aclRoleGR.addQuery("sys_security_acl", aclSysId);
        aclRoleGR.addQuery("sys_user_role", roleSysId);
        aclRoleGR.query();
        if (aclRoleGR.next()) {
            gs.info("Role " + roleName + " already assigned to ACL.");
        } else {
            aclRoleGR.initialize();
            aclRoleGR.sys_security_acl = aclSysId;
            aclRoleGR.sys_user_role = roleSysId;
            aclRoleGR.insert();
            gs.info("Assigned role " + roleName + " to ACL (SysID: " + aclSysId + ")");
        }
    }
})();
