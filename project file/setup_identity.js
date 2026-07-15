/**
 * ServiceNow Background Script - Core Platform Setup (Users, Groups, Roles)
 * 
 * Description: Programmatically establishes the base identity framework.
 * Run this in: System Definition > Scripts - Background.
 */

(function() {
    gs.info("=== START: core platform setup (Identity Framework) ===");

    // 1. Create Roles
    var managerRoleSysId = getOrCreateRole("u_project_manager_role", "Project Manager Role");
    var teamRoleSysId = getOrCreateRole("u_team_member_role", "Team Member Role");

    // Table-specific access roles
    var projectTableRoleSysId = getOrCreateRole("u_project_table_role", "Project Table Role");
    var taskTableRoleSysId = getOrCreateRole("u_task_table_role", "Task Table Role");

    // 2. Create Group
    var groupSysId = getOrCreateGroup("Project Team Group", "Group for project collaboration");

    // Assign Roles to Group (Best practice: Assign roles to groups, not directly to users)
    if (groupSysId) {
        assignRoleToGroup(groupSysId, teamRoleSysId);
        assignRoleToGroup(groupSysId, taskTableRoleSysId);
    }

    // 3. Create Users
    var aliceSysId = getOrCreateUser("alice", "Alice", "Project Manager");
    var bobSysId = getOrCreateUser("bob", "Bob", "Team Member");

    // 4. Assign Users to Groups (Alice and Bob to Project Team Group)
    if (groupSysId) {
        if (aliceSysId) {
            addUserToGroup(aliceSysId, groupSysId);
        }
        if (bobSysId) {
            addUserToGroup(bobSysId, groupSysId);
        }
    }

    // 5. Assign Roles directly to Alice (Project Manager needs additional admin-like project manager and project table roles)
    if (aliceSysId) {
        assignRoleToUser(aliceSysId, managerRoleSysId);
        assignRoleToUser(aliceSysId, projectTableRoleSysId);
    }
    
    // Note: Bob gets u_team_member_role and u_task_table_role via Group Membership.

    gs.info("=== END: core platform setup completed successfully ===");

    // --- Helper Functions ---

    function getOrCreateRole(roleName, description) {
        var roleGR = new GlideRecord("sys_user_role");
        roleGR.addQuery("name", roleName);
        roleGR.query();
        if (roleGR.next()) {
            gs.info("Role already exists: " + roleName);
            return roleGR.getUniqueValue();
        } else {
            roleGR.initialize();
            roleGR.name = roleName;
            roleGR.description = description;
            var sysId = roleGR.insert();
            gs.info("Created Role: " + roleName + " (SysID: " + sysId + ")");
            return sysId;
        }
    }

    function getOrCreateGroup(groupName, description) {
        var groupGR = new GlideRecord("sys_user_group");
        groupGR.addQuery("name", groupName);
        groupGR.query();
        if (groupGR.next()) {
            gs.info("Group already exists: " + groupName);
            return groupGR.getUniqueValue();
        } else {
            groupGR.initialize();
            groupGR.name = groupName;
            groupGR.description = description;
            var sysId = groupGR.insert();
            gs.info("Created Group: " + groupName + " (SysID: " + sysId + ")");
            return sysId;
        }
    }

    function getOrCreateUser(username, nameParts, title) {
        var userGR = new GlideRecord("sys_user");
        userGR.addQuery("user_name", username);
        userGR.query();
        if (userGR.next()) {
            gs.info("User already exists: " + username);
            return userGR.getUniqueValue();
        } else {
            userGR.initialize();
            userGR.user_name = username;
            
            var names = nameParts.split(" ");
            userGR.first_name = names[0];
            userGR.last_name = names.length > 1 ? names.slice(1).join(" ") : "User";
            userGR.title = title;
            userGR.email = username + "@example.com";
            userGR.active = true;
            
            var sysId = userGR.insert();
            gs.info("Created User: " + username + " (SysID: " + sysId + ")");
            return sysId;
        }
    }

    function addUserToGroup(userSysId, groupSysId) {
        var memberGR = new GlideRecord("sys_user_gmember");
        memberGR.addQuery("user", userSysId);
        memberGR.addQuery("group", groupSysId);
        memberGR.query();
        if (memberGR.next()) {
            gs.info("User already member of group.");
        } else {
            memberGR.initialize();
            memberGR.user = userSysId;
            memberGR.group = groupSysId;
            memberGR.insert();
            gs.info("Added user " + userSysId + " to group " + groupSysId);
        }
    }

    function assignRoleToGroup(groupSysId, roleSysId) {
        var groupRoleGR = new GlideRecord("sys_group_has_role");
        groupRoleGR.addQuery("group", groupSysId);
        groupRoleGR.addQuery("inherits", true);
        groupRoleGR.addQuery("role", roleSysId);
        groupRoleGR.query();
        if (groupRoleGR.next()) {
            gs.info("Role already assigned to group.");
        } else {
            groupRoleGR.initialize();
            groupRoleGR.group = groupSysId;
            groupRoleGR.role = roleSysId;
            groupRoleGR.inherits = true;
            groupRoleGR.insert();
            gs.info("Assigned role " + roleSysId + " to group " + groupSysId);
        }
    }

    function assignRoleToUser(userSysId, roleSysId) {
        var userRoleGR = new GlideRecord("sys_user_has_role");
        userRoleGR.addQuery("user", userSysId);
        userRoleGR.addQuery("role", roleSysId);
        userRoleGR.query();
        if (userRoleGR.next()) {
            gs.info("Role already assigned directly to user.");
        } else {
            userRoleGR.initialize();
            userRoleGR.user = userSysId;
            userRoleGR.role = roleSysId;
            userRoleGR.insert();
            gs.info("Assigned role " + roleSysId + " to user " + userSysId);
        }
    }
})();
